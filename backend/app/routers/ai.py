import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.ai_conversation import AIConversation
from app.schemas.ai import ChatCreate, ChatMessageOut, ChatConversationOut
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=ChatMessageOut, status_code=status.HTTP_200_OK)
async def chat_with_assistant(
    payload: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Post a new question to the RAG AI Assistant.
    Retrieves contexts from user records, feeds Gemini Flash, and returns the response.
    """
    msg = await ai_service.ask_assistant(
        db,
        user_id=current_user.id,
        question=payload.message,
        conversation_id=payload.conversation_id,
    )

    # Convert referenced_document_ids if present from database JSON
    referenced = None
    if msg.referenced_document_ids:
        # Convert list of string representations to UUID list
        referenced = [uuid.UUID(uid) for uid in msg.referenced_document_ids]

    return ChatMessageOut(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        referenced_document_ids=referenced,
        created_at=msg.created_at,
    )


@router.get("/conversations", response_model=List[ChatConversationOut], status_code=status.HTTP_200_OK)
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a list of all active chat sessions for the authenticated user.
    """
    # Fetch conversations sorted by updated_at descending
    query = (
        select(AIConversation)
        .where(AIConversation.user_id == current_user.id)
        .options(selectinload(AIConversation.messages))
        .order_by(AIConversation.updated_at.desc())
    )
    result = await db.execute(query)
    conversations = result.scalars().all()

    out_list = []
    for conv in conversations:
        # Map messages
        msg_out_list = [
            ChatMessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                referenced_document_ids=[uuid.UUID(uid) for uid in m.referenced_document_ids] if m.referenced_document_ids else None,
                created_at=m.created_at
            ) for m in conv.messages
        ]
        out_list.append(
            ChatConversationOut(
                id=conv.id,
                session_title=conv.session_title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                messages=msg_out_list
            )
        )

    return out_list


@router.get("/conversations/{id}", response_model=ChatConversationOut, status_code=status.HTTP_200_OK)
async def get_conversation(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve message history for a single chat session.
    """
    query = (
        select(AIConversation)
        .where(AIConversation.id == id, AIConversation.user_id == current_user.id)
        .options(selectinload(AIConversation.messages))
    )
    result = await db.execute(query)
    conv = result.scalars().first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found."
        )

    # Sort messages chronologically
    sorted_messages = sorted(conv.messages, key=lambda m: m.created_at)

    msg_out_list = [
        ChatMessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            referenced_document_ids=[uuid.UUID(uid) for uid in m.referenced_document_ids] if m.referenced_document_ids else None,
            created_at=m.created_at
        ) for m in sorted_messages
    ]

    return ChatConversationOut(
        id=conv.id,
        session_title=conv.session_title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=msg_out_list
    )
