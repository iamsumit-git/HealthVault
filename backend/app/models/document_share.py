import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DocumentShare(Base):
    __tablename__ = "document_shares"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    share_token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    share_items = relationship(
        "DocumentShareItem", back_populates="share", cascade="all, delete-orphan"
    )


class DocumentShareItem(Base):
    __tablename__ = "document_share_items"

    share_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("document_shares.id", ondelete="CASCADE"), primary_key=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("medical_documents.id", ondelete="CASCADE"), primary_key=True
    )

    # Relationships
    share = relationship("DocumentShare", back_populates="share_items")
    document = relationship("MedicalDocument", back_populates="share_items")
