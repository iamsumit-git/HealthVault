import uuid
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


class MedicalDocumentBase(BaseModel):
    document_type: str = "other"  # prescription, lab_report, scan, discharge_summary, other
    title: str
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    document_date: Optional[date] = None


class MedicalDocumentCreate(MedicalDocumentBase):
    user_id: uuid.UUID
    file_url: str
    file_format: str
    source_type: str = "upload"


class MedicalDocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    document_date: Optional[date] = None


class ExtractedHealthDataOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    extracted_text: str
    key_values_json: dict
    abnormal_flags_json: dict
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: lambda u: str(u),
            datetime: lambda dt: dt.isoformat(),
        }


class MedicalDocumentOut(MedicalDocumentBase):
    id: uuid.UUID
    user_id: uuid.UUID
    file_url: str
    thumbnail_url: Optional[str] = None
    file_format: str
    source_type: str
    uploaded_at: datetime
    created_at: datetime
    updated_at: datetime
    # Temporary pre-signed URL returned for frontend access
    pre_signed_url: Optional[str] = None
    extracted_data: Optional[ExtractedHealthDataOut] = None

    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: lambda u: str(u),
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat(),
        }

