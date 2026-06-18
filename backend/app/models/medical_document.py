import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Date, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    document_type: Mapped[str] = mapped_column(String(50), default="other")  # prescription, lab_report, etc.
    title: Mapped[str] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(String(1000))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    file_format: Mapped[str] = mapped_column(String(10))  # pdf, png, jpg
    document_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # List of tags as JSON array
    source_type: Mapped[str] = mapped_column(String(50), default="upload")  # camera, gallery, upload

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="documents")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    extracted_data = relationship(
        "ExtractedHealthData", back_populates="document", uselist=False, cascade="all, delete-orphan"
    )
    share_items = relationship("DocumentShareItem", back_populates="document", cascade="all, delete-orphan")
