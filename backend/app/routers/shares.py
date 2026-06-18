import secrets
from datetime import datetime, timedelta, timezone
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.share import ShareCreate, ShareOut
from app.schemas.document import MedicalDocumentOut
from app.repositories.share_repository import share_repository
from app.repositories.document_repository import document_repository
from app.services.storage_service import storage_service

router = APIRouter(prefix="/shares", tags=["Sharing"])


@router.post("/create", response_model=ShareOut, status_code=status.HTTP_201_CREATED)
async def create_share_link(
    payload: ShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a secure, time-limited share token for selected documents.
    """
    # 1. Validate that all document IDs exist and belong to the user
    validated_doc_ids = []
    for doc_id in payload.document_ids:
        doc = await document_repository.get_by_id(db, id=doc_id)
        if not doc or doc.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {doc_id} not found or access denied."
            )
        validated_doc_ids.append(doc.id)

    # 2. Generate cryptographically secure URL-safe token
    share_token = secrets.token_urlsafe(32)

    # 3. Calculate expiration timestamp
    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours)

    # 4. Save share records
    db_share = await share_repository.create(
        db,
        user_id=current_user.id,
        share_token=share_token,
        expires_at=expires_at,
        document_ids=validated_doc_ids
    )

    # 5. Formulate public share URL targeting backend viewing page
    # In production, this can point to a web portal or a React Native deep link.
    share_url = f"http://localhost:8000/api/v1/shares/view/{share_token}"

    # Construct response
    return ShareOut(
        id=db_share.id,
        share_token=db_share.share_token,
        expires_at=db_share.expires_at,
        is_active=db_share.is_active,
        share_url=share_url,
        document_ids=[item.document_id for item in db_share.share_items],
        created_at=db_share.created_at
    )


@router.get("/view/{token}", response_model=List[MedicalDocumentOut], status_code=status.HTTP_200_OK)
async def view_shared_documents(token: str, db: AsyncSession = Depends(get_db)):
    """
    Public endpoint for doctors/family members to view shared documents.
    Validates token validity and expiration, returning presigned download links.
    """
    # 1. Retrieve the share token record
    db_share = await share_repository.get_by_token(db, token=token)
    if not db_share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared folder not found."
        )

    # 2. Check active state
    if not db_share.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share link has been revoked."
        )

    # 3. Verify expiration
    # Ensure expires_at is timezone-aware if comparing to timezone-aware utcnow
    expires_at = db_share.expires_at.replace(tzinfo=timezone.utc) if db_share.expires_at.tzinfo is None else db_share.expires_at
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share link has expired."
        )

    # 4. Generate presigned download links for all documents
    shared_docs = []
    for item in db_share.share_items:
        doc = item.document
        schema_out = MedicalDocumentOut.model_validate(doc)
        schema_out.pre_signed_url = storage_service.get_presigned_url(doc.file_url)
        shared_docs.append(schema_out)

    return shared_docs


@router.post("/revoke/{token}", status_code=status.HTTP_200_OK)
async def revoke_share_link(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke access to a generated share link immediately.
    """
    db_share = await share_repository.get_by_token(db, token=token)
    if not db_share or db_share.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found."
        )

    await share_repository.revoke(db, db_obj=db_share)
    return {"message": "Share link revoked successfully."}
