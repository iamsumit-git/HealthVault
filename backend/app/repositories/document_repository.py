import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.medical_document import MedicalDocument
from app.schemas.document import MedicalDocumentCreate


class DocumentRepository:
    async def create(
        self, db: AsyncSession, *, obj_in: MedicalDocumentCreate
    ) -> MedicalDocument:
        db_obj = MedicalDocument(
            user_id=obj_in.user_id,
            document_type=obj_in.document_type,
            title=obj_in.title,
            file_url=obj_in.file_url,
            file_format=obj_in.file_format,
            document_date=obj_in.document_date,
            notes=obj_in.notes,
            tags=obj_in.tags,
            source_type=obj_in.source_type,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        db_obj.extracted_data = None
        return db_obj

    async def get_by_id(
        self, db: AsyncSession, id: uuid.UUID
    ) -> Optional[MedicalDocument]:
        result = await db.execute(
            select(MedicalDocument)
            .where(MedicalDocument.id == id)
            .options(selectinload(MedicalDocument.extracted_data))
        )
        return result.scalars().first()

    async def get_user_documents(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        document_type: Optional[str] = None,
    ) -> List[MedicalDocument]:
        query = (
            select(MedicalDocument)
            .where(MedicalDocument.user_id == user_id)
            .options(selectinload(MedicalDocument.extracted_data))
        )
        if document_type:
            query = query.where(MedicalDocument.document_type == document_type)

        # Order by uploaded_at descending to show latest records first
        query = query.order_by(MedicalDocument.uploaded_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

    async def delete(self, db: AsyncSession, *, db_obj: MedicalDocument) -> None:
        await db.delete(db_obj)
        await db.commit()


document_repository = DocumentRepository()
