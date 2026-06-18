import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
import google.generativeai as genai

from app.core.config import settings
from app.models.medical_document import MedicalDocument
from app.models.document_chunk import DocumentChunk
from app.models.ai_conversation import AIConversation
from app.models.ai_message import AIMessage
from app.schemas.ai import ChatMessageOut
from app.services.embedding_service import embedding_service

logger = logging.getLogger("app.ai")


class AIService:
    def __init__(self):
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_key":
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.client_enabled = True
        else:
            self.client_enabled = False

    async def query_ollama(self, system_instruction: str, prompt: str) -> Optional[str]:
        """
        Query local Ollama instance running Qwen3-coder or another configured model.
        """
        import httpx
        try:
            url = f"{settings.OLLAMA_ENDPOINT}/api/generate"
            payload = {
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "system": system_instruction,
                "stream": False
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "").strip()
                else:
                    logger.error(f"Ollama returned status code {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to query Ollama: {e}")
        return None

    async def get_or_create_conversation(
        self, db: AsyncSession, user_id: uuid.UUID, conversation_id: Optional[uuid.UUID] = None, title: str = "New Chat"
    ) -> AIConversation:
        """
        Fetch an existing conversation or create a new session.
        """
        if conversation_id:
            result = await db.execute(
                select(AIConversation)
                .where(AIConversation.id == conversation_id, AIConversation.user_id == user_id)
                .options(selectinload(AIConversation.messages))
            )
            conv = result.scalars().first()
            if conv:
                return conv

        # Create new
        conv = AIConversation(user_id=user_id, session_title=title)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    async def retrieve_relevant_contexts(
        self, db: AsyncSession, user_id: uuid.UUID, query_vector: List[float], limit: int = 5
    ) -> List[Tuple[DocumentChunk, MedicalDocument]]:
        """
        Perform cosine similarity search on pgvector embeddings of chunks owned by the user.
        """
        # Cosine distance operator in pgvector sqlalchemy
        query = (
            select(DocumentChunk, MedicalDocument)
            .join(MedicalDocument, DocumentChunk.document_id == MedicalDocument.id)
            .where(MedicalDocument.user_id == user_id)
            .order_by(DocumentChunk.embedding_vector.cosine_distance(query_vector))
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.all())

    async def ask_assistant(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        question: str,
        conversation_id: Optional[uuid.UUID] = None,
    ) -> AIMessage:
        """
        Retrieve relevant contexts, prompt Gemini Flash with strict medical guardrails,
        transcribe conversation flow, and return the answer.
        """
        # 1. Resolve conversation session
        conversation = await self.get_or_create_conversation(
            db, user_id=user_id, conversation_id=conversation_id, title=question[:40]
        )

        # 2. Save user message to database
        user_msg = AIMessage(
            conversation_id=conversation.id,
            role="user",
            content=question,
        )
        db.add(user_msg)
        await db.flush()

        # 3. Create question embedding
        query_vector = await embedding_service.get_embedding(question)

        # 4. Search nearest vectors
        matches = await self.retrieve_relevant_contexts(db, user_id=user_id, query_vector=query_vector)

        # 5. Build prompt
        context_parts = []
        referenced_doc_ids = []

        for chunk, doc in matches:
            context_parts.append(
                f"--- DOCUMENT: {doc.title} (Type: {doc.document_type}, Date: {doc.document_date}) ---\n"
                f"{chunk.chunk_text}\n"
            )
            if doc.id not in referenced_doc_ids:
                referenced_doc_ids.append(doc.id)

        context_str = "\n".join(context_parts) if context_parts else "No relevant medical documents found."

        # Construct medical safety instructions
        system_instruction = (
            "You are PostCare Assistant, an empathetic medical AI helper for Indian families.\n"
            "Your goal is to explain medical documents, prescriptions, and lab reports in plain, simple, friendly language.\n\n"
            "CRITICAL MEDICAL RULES:\n"
            "1. Ground your responses ONLY in the provided Document Context. If the answer is not mentioned, say: "
            "'I cannot find this information in your uploaded health records.'\n"
            "2. Never recommend starting, stopping, or changing medication dosages. Always advise asking their doctor first.\n"
            "3. If the user mentions symptoms indicative of an emergency (e.g., severe chest pain, extreme breathlessness, sudden numbness, high fever in infants), "
            "recommend immediate hospital emergency care.\n"
            "4. Always append this short disclaimer at the very end of your response: "
            "'_Disclaimer: PostCare Assistant is an AI informational tool and does not provide clinical diagnosis or replace professional medical advice._'\n"
        )

        full_prompt = (
            f"DOCUMENT CONTEXT:\n{context_str}\n\n"
            f"USER QUESTION: {question}\n\n"
            "Provide your grounded, helpful response following the safety rules."
        )

        # 6. Query Gemini / Fallback Ollama
        assistant_text = ""
        if self.client_enabled:
            try:
                model = genai.GenerativeModel(
                    model_name=settings.LLM_MODEL,
                    system_instruction=system_instruction
                )
                response = await model.generate_content_async(full_prompt)
                assistant_text = response.text
            except Exception as e:
                logger.error(f"Gemini generation error: {e}. Trying Ollama fallback...")
                ollama_response = await self.query_ollama(system_instruction, full_prompt)
                if ollama_response:
                    assistant_text = ollama_response
                else:
                    assistant_text = (
                        "I encountered an error communicating with the AI service. "
                        "Please try again in a moment.\n\n"
                        "_Disclaimer: PostCare Assistant is an AI informational tool and does not replace professional medical advice._"
                    )
        else:
            # Gemini not enabled, try local Ollama
            logger.info("Gemini client is disabled. Querying local Ollama...")
            ollama_response = await self.query_ollama(system_instruction, full_prompt)
            if ollama_response:
                assistant_text = ollama_response
            else:
                # Sandbox mock response fallback
                assistant_text = (
                    f"Hello! I am PostCare AI. Based on your mock prescription data:\n"
                    f"- You are taking Paracetamol for fever.\n"
                    f"- You are taking Pantocid before breakfast.\n\n"
                    f"Please consult your doctor before modifying these doses.\n\n"
                    f"_Disclaimer: PostCare Assistant is an AI informational tool and does not provide clinical diagnosis or replace professional medical advice._"
                )

        # 7. Save assistant response message to database
        assistant_msg = AIMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_text,
            referenced_document_ids=[str(doc_id) for doc_id in referenced_doc_ids] if referenced_doc_ids else None,
        )
        db.add(assistant_msg)

        # Update conversation timestamp
        conversation.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(conversation)

        await db.commit()
        await db.refresh(assistant_msg)

        return assistant_msg

    async def extract_structured_health_data(self, raw_text: str) -> dict:
        """
        Send raw OCR text to Gemini Flash to extract a structured JSON summary,
        including key metrics (medicines, tests) and abnormal flags.
        """
        import json

        system_instruction = (
            "You are a strict clinical data parser. Analyze medical document text and extract structured metrics in JSON format.\n"
            "You must return ONLY a raw JSON object matching this schema:\n"
            "{\n"
            "  \"summary\": \"Brief friendly summary of what this document is.\",\n"
            "  \"key_metrics\": {\n"
            "     \"medicines\": [{\"name\": \"...\", \"dosage\": \"...\", \"frequency\": \"...\", \"duration\": \"...\"}],\n"
            "     \"tests\": [{\"name\": \"...\", \"value\": \"...\", \"reference_range\": \"...\", \"unit\": \"...\", \"status\": \"...\"}]\n"
            "  },\n"
            "  \"abnormal_flags\": {\n"
            "     \"alerts\": [\"List any abnormal indicators or values found. Empty list if none.\"]\n"
            "  }\n"
            "}"
        )

        prompt = f"Extract clinical metrics from this medical record text:\n\n{raw_text}\n\nReturn ONLY the JSON object. Do not wrap in markdown code blocks."

        default_result = {
            "summary": "Medical record containing patient health details and observations.",
            "key_metrics": {
                "medicines": [],
                "tests": []
            },
            "abnormal_flags": {
                "alerts": []
            }
        }

        if not self.client_enabled:
            logger.info("Gemini client is disabled. Attempting structured extraction via local Ollama...")
            ollama_response = await self.query_ollama(system_instruction, prompt)
            if ollama_response:
                try:
                    clean_text = ollama_response.strip()
                    if clean_text.startswith("```json"):
                        clean_text = clean_text[7:]
                    elif clean_text.startswith("```"):
                        clean_text = clean_text[3:]
                    if clean_text.endswith("```"):
                        clean_text = clean_text[:-3]
                    clean_text = clean_text.strip()
                    return json.loads(clean_text)
                except Exception as parse_err:
                    logger.error(f"Failed to parse Ollama JSON response: {parse_err}")

            # Fallback mock structured extraction for local sandbox dev
            if "Prescription" in raw_text or "Paracetamol" in raw_text:
                return {
                    "summary": "Doctor prescription containing fever medications and guidelines.",
                    "key_metrics": {
                        "medicines": [
                            {"name": "Paracetamol", "dosage": "650mg", "frequency": "TDS (Thrice Daily)", "duration": "5 days"},
                            {"name": "Pantocid", "dosage": "40mg", "frequency": "OD (Once Daily) - before breakfast", "duration": "10 days"}
                        ],
                        "tests": []
                    },
                    "abnormal_flags": {
                        "alerts": []
                    }
                }
            return default_result

        try:
            model = genai.GenerativeModel(
                model_name=settings.LLM_MODEL,
                system_instruction=system_instruction
            )
            response = await model.generate_content_async(prompt)
            clean_text = response.text.strip()
            # Clean markdown code blocks if any returned by model
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            elif clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            return json.loads(clean_text)
        except Exception as e:
            logger.error(f"Failed to extract structured data via Gemini: {e}. Trying Ollama fallback...")
            ollama_response = await self.query_ollama(system_instruction, prompt)
            if ollama_response:
                try:
                    clean_text = ollama_response.strip()
                    if clean_text.startswith("```json"):
                        clean_text = clean_text[7:]
                    elif clean_text.startswith("```"):
                        clean_text = clean_text[3:]
                    if clean_text.endswith("```"):
                        clean_text = clean_text[:-3]
                    clean_text = clean_text.strip()
                    return json.loads(clean_text)
                except Exception as parse_err:
                    logger.error(f"Failed to parse fallback Ollama JSON: {parse_err}")
            return default_result


ai_service = AIService()



