import logging
from typing import List
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger("app.embeddings")


class EmbeddingService:
    def __init__(self):
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_key":
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.client_enabled = True
        else:
            self.client_enabled = False

    def chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
        """
        Slice raw text into overlapping windows.
        Creates semantic chunks of approximate character lengths.
        """
        if not text:
            return []

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            
            # Move index forward by chunk size minus overlap
            start += chunk_size - overlap
            
            # Safeguard to prevent infinite loops if overlap >= chunk_size
            if chunk_size - overlap <= 0:
                start += chunk_size

        return chunks

    async def get_embedding(self, text: str) -> List[float]:
        """
        Fetch a 768-dimension vector embedding from Gemini's text-embedding-004 model.
        Returns a mock vector if the Gemini API key is missing.
        """
        if not self.client_enabled:
            # Return a mock 768-dimension vector for local sandbox dev
            return [0.1] * 768

        try:
            # Run embedding call asynchronously (or run in threadpool)
            result = genai.embed_content(
                model=settings.EMBEDDING_MODEL,
                content=text,
                task_type="retrieval_document",
            )
            return result["embedding"]
        except Exception as e:
            logger.error(f"Failed to generate embedding via Gemini API: {e}")
            # Fallback to mock vector
            return [0.0] * 768


embedding_service = EmbeddingService()
