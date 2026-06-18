import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ExtractedHealthData(Base):
    __tablename__ = "extracted_health_data"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    extracted_text: Mapped[str] = mapped_column(Text)
    key_values_json: Mapped[dict] = mapped_column(JSON)  # Structured keys: e.g. medicines, dosage, tests
    abnormal_flags_json: Mapped[dict] = mapped_column(JSON)  # High sugar, low Hb, abnormal flags
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("MedicalDocument", back_populates="extracted_data")
