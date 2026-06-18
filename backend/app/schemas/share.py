import uuid
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class ShareCreate(BaseModel):
    document_ids: List[uuid.UUID] = Field(..., min_items=1, description="List of document UUIDs to share")
    expires_in_hours: int = Field(24, ge=1, le=720, description="Expiry duration in hours (default: 24, max: 720/30 days)")


class ShareOut(BaseModel):
    id: uuid.UUID
    share_token: str
    expires_at: datetime
    is_active: bool
    share_url: str
    document_ids: List[uuid.UUID]
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: lambda u: str(u),
            datetime: lambda dt: dt.isoformat(),
        }
