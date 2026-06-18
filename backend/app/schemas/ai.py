import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ChatCreate(BaseModel):
    message: str
    conversation_id: Optional[uuid.UUID] = None


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str  # user, assistant
    content: str
    referenced_document_ids: Optional[List[uuid.UUID]] = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: lambda u: str(u),
            datetime: lambda dt: dt.isoformat(),
        }


class ChatConversationOut(BaseModel):
    id: uuid.UUID
    session_title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: lambda u: str(u),
            datetime: lambda dt: dt.isoformat(),
        }


class SummarizeRequest(BaseModel):
    document_id: uuid.UUID


class SummarizeResponse(BaseModel):
    summary: str
    key_metrics: Dict[str, Any]
    abnormal_flags: Dict[str, Any]
