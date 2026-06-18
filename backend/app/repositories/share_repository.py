import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document_share import DocumentShare, DocumentShareItem


class ShareRepository:
    async def create(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        share_token: str,
        expires_at: datetime,
        document_ids: List[uuid.UUID],
    ) -> DocumentShare:
        db_share = DocumentShare(
            user_id=user_id,
            share_token=share_token,
            expires_at=expires_at,
            is_active=True,
        )
        db.add(db_share)
        await db.flush()  # Populates db_share.id

        # Insert join items
        for doc_id in document_ids:
            db_item = DocumentShareItem(share_id=db_share.id, document_id=doc_id)
            db.add(db_item)

        await db.commit()
        # Reload with relationship
        result = await db.execute(
            select(DocumentShare)
            .where(DocumentShare.id == db_share.id)
            .options(
                selectinload(DocumentShare.share_items).selectinload(
                    DocumentShareItem.document
                )
            )
        )
        return result.scalars().first()

    async def get_by_token(
        self, db: AsyncSession, token: str
    ) -> Optional[DocumentShare]:
        result = await db.execute(
            select(DocumentShare)
            .where(DocumentShare.share_token == token)
            .options(
                selectinload(DocumentShare.share_items).selectinload(
                    DocumentShareItem.document
                )
            )
        )
        return result.scalars().first()

    async def revoke(
        self, db: AsyncSession, *, db_obj: DocumentShare
    ) -> DocumentShare:
        db_obj.is_active = False
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


share_repository = ShareRepository()

