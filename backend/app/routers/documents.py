import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.document import MedicalDocumentOut, MedicalDocumentCreate
from app.models.document_page import DocumentPage
from app.models.document_chunk import DocumentChunk
from app.models.extracted_health_data import ExtractedHealthData
from app.services.ocr_service import ocr_service
from app.services.embedding_service import embedding_service
from app.services.ai_service import ai_service
from app.repositories.document_repository import document_repository
from app.services.storage_service import storage_service

router = APIRouter(prefix="/documents", tags=["Documents"])


# Background parsing service pipeline implementation
async def process_document_pipeline(document_id: uuid.UUID, user_id: uuid.UUID):
    """
    Background worker task to run OCR, parsing, chunking, and embedding creation.
    Downloads the file, extracts raw text, generates vector embeddings, and extracts structured data.
    """
    print(f"[Worker] Starting background parsing pipeline for document {document_id} of user {user_id}...")
    try:
        async with AsyncSessionLocal() as db:
            # 1. Fetch document
            doc = await document_repository.get_by_id(db, id=document_id)
            if not doc:
                print(f"[Worker] Document {document_id} not found in database.")
                return

            # 2. Download file bytes
            file_bytes = storage_service.get_file(doc.file_url)
            if not file_bytes:
                print(f"[Worker] Failed to download file bytes for key {doc.file_url}")
                return

            # 3. Perform OCR
            pages_text = await ocr_service.extract_document_text(file_bytes, doc.file_format)
            if not pages_text:
                print(f"[Worker] No text extracted from document {document_id}")
                return

            # 4. Save pages and chunks
            all_text_parts = []
            for i, page_text in enumerate(pages_text):
                page_num = i + 1
                db_page = DocumentPage(
                    document_id=doc.id,
                    page_number=page_num,
                    raw_text=page_text
                )
                db.add(db_page)
                await db.flush()  # Populates db_page.id

                all_text_parts.append(page_text)

                # Chunk page text
                chunks = embedding_service.chunk_text(page_text)
                for idx, chunk_text in enumerate(chunks):
                    # Get vector embedding
                    vector = await embedding_service.get_embedding(chunk_text)
                    db_chunk = DocumentChunk(
                        document_id=doc.id,
                        page_id=db_page.id,
                        chunk_index=idx,
                        chunk_text=chunk_text,
                        embedding_vector=vector,
                        token_count=len(chunk_text.split())
                    )
                    db.add(db_chunk)

            # 5. Extract structured health data
            full_text = "\n\n".join(all_text_parts)
            structured_data = await ai_service.extract_structured_health_data(full_text)

            # Create Extracted Health Data record
            db_extracted = ExtractedHealthData(
                document_id=doc.id,
                user_id=user_id,
                extracted_text=full_text,
                key_values_json=structured_data.get("key_metrics", {}),
                abnormal_flags_json=structured_data.get("abnormal_flags", {})
            )
            db.add(db_extracted)

            # Update document description and tags
            summary_text = structured_data.get("summary", "")
            if summary_text and not doc.notes:
                doc.notes = summary_text
                db.add(doc)

            alerts = structured_data.get("abnormal_flags", {}).get("alerts", [])
            tags = [doc.document_type]
            if alerts:
                tags.append("abnormal")
            doc.tags = tags
            db.add(doc)

            await db.commit()
            print(f"[Worker] Successfully processed and indexed document {document_id}!")

    except Exception as e:
        print(f"[Worker] Error in background parsing pipeline: {e}")



@router.post("/upload", response_model=MedicalDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    document_type: str = Form("other"),
    notes: Optional[str] = Form(None),
    document_date: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a medical record file (PDF, PNG, JPG).
    Saves file to MinIO bucket, stores metadata in PostgreSQL, and enqueues OCR processing.
    """
    # Validate file format
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in ["pdf", "png", "jpg", "jpeg"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF, PNG, JPG, and JPEG are allowed."
        )

    # Standardize content format
    file_format = "pdf" if file_ext == "pdf" else "png"

    # Generate secure random filename key
    unique_key = f"{current_user.id}/{uuid.uuid4()}.{file_ext}"

    # Read bytes
    file_content = await file.read()

    # Upload to storage
    stored_key = storage_service.upload_file(
        file_data=file_content,
        file_name=unique_key,
        content_type=file.content_type
    )

    if not stored_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file to object storage."
        )

    # Parse date if passed
    doc_date = None
    if document_date:
        try:
            doc_date = date.fromisoformat(document_date)
        except ValueError:
            pass

    # Create record
    doc_in = MedicalDocumentCreate(
        user_id=current_user.id,
        title=title,
        document_type=document_type,
        notes=notes,
        file_url=unique_key,
        file_format=file_format,
        document_date=doc_date,
        source_type="upload"
    )

    db_doc = await document_repository.create(db, obj_in=doc_in)

    # Generate pre-signed url for instant loading in mobile app
    pre_signed_url = storage_service.get_presigned_url(db_doc.file_url, client_host=request.headers.get("host"))

    # Convert to schema outcome with pre-signed url hook
    result = MedicalDocumentOut.model_validate(db_doc)
    result.pre_signed_url = pre_signed_url

    # Trigger async OCR extraction and chunking pipeline
    background_tasks.add_task(process_document_pipeline, db_doc.id, current_user.id)

    return result


@router.get("/", response_model=List[MedicalDocumentOut], status_code=status.HTTP_200_OK)
async def list_documents(
    request: Request,
    document_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all medical documents owned by the authenticated user.
    """
    docs = await document_repository.get_user_documents(
        db, user_id=current_user.id, document_type=document_type
    )

    # Map database models and inject temporary URLs
    result_list = []
    for doc in docs:
        schema_out = MedicalDocumentOut.model_validate(doc)
        schema_out.pre_signed_url = storage_service.get_presigned_url(doc.file_url, client_host=request.headers.get("host"))
        result_list.append(schema_out)

    return result_list


@router.get("/{id}", response_model=MedicalDocumentOut, status_code=status.HTTP_200_OK)
async def get_document(
    id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get metadata and temporary presigned URL for a single document.
    """
    doc = await document_repository.get_by_id(db, id=id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    schema_out = MedicalDocumentOut.model_validate(doc)
    schema_out.pre_signed_url = storage_service.get_presigned_url(doc.file_url, client_host=request.headers.get("host"))
    return schema_out


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a document from database metadata and MinIO storage.
    """
    doc = await document_repository.get_by_id(db, id=id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    # Delete from object storage
    storage_service.delete_file(doc.file_url)

    # Delete from database
    await document_repository.delete(db, db_obj=doc)

    return
