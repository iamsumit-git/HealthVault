import base64
import logging
from typing import List, Optional
import pdfplumber
import io
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger("app.ocr")


class OCRService:
    def __init__(self):
        # Configure Gemini API key on startup
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_key":
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.client_enabled = True
        else:
            logger.warning("Gemini API Key is not set or using 'mock_key'. OCR will use mock/fallback mode.")
            self.client_enabled = False

    def extract_text_from_pdf_digital(self, file_bytes: bytes) -> List[str]:
        """
        Attempt to extract digital text directly from the PDF pages using pdfplumber.
        Returns a list of strings representing the text of each page.
        """
        pages_text = []
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text and len(text.strip()) > 50:  # Valid digital text page
                        pages_text.append(text)
                    else:
                        pages_text.append("")  # Scanned page
            return pages_text
        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
            return []

    async def extract_text_via_gemini(
        self, file_bytes: bytes, mime_type: str
    ) -> List[str]:
        """
        Send document bytes (PDF or Image) to Gemini 1.5 Flash to perform OCR.
        Returns extracted text.
        """
        if not self.client_enabled:
            logger.warning("Gemini client is disabled. Returning mock OCR text.")
            return [
                "Mock Prescription OCR:\nPatient Name: Sumit Vijay\nAge: 30\nDate: 2026-06-18\nMedicines:\n1. Paracetamol 650mg - TDS - 5 days\n2. Pantocid 40mg - OD - before breakfast - 10 days\nNotes: Rest well and monitor temperature."
            ]

        try:
            model = genai.GenerativeModel(settings.LLM_MODEL)
            prompt = (
                "Extract the full, raw text content of this medical document page by page. "
                "Do not summarize, do not omit any values, numbers, or handwriting. "
                "Transcribe all handwritten notes and printed tabular values accurately. "
                "Provide the transcription page by page, separated by '--- PAGE BREAK ---'."
            )

            # Build inline data dictionary
            document_part = {
                "mime_type": mime_type,
                "data": base64.b64encode(file_bytes).decode("utf-8"),
            }

            response = await model.generate_content_async([document_part, prompt])
            raw_response = response.text

            # Split pages if separated by page break marker
            if "--- PAGE BREAK ---" in raw_response:
                pages = raw_response.split("--- PAGE BREAK ---")
                return [p.strip() for p in pages if p.strip()]
            
            return [raw_response.strip()]

        except Exception as e:
            logger.error(f"Gemini OCR extraction failed: {e}")
            # Fallback mock text if API call fails
            return ["Error during Gemini OCR processing. Raw text unavailable."]

    async def extract_document_text(
        self, file_bytes: bytes, file_format: str
    ) -> List[str]:
        """
        Main entrypoint to extract page-by-page text from a document.
        Uses direct PDF parsing for digital PDFs, and delegates to Gemini OCR for scans/images.
        """
        # Define mime type
        mime_type = "application/pdf" if file_format == "pdf" else f"image/{file_format}"

        # If PDF, try digital text extraction first
        if file_format == "pdf":
            logger.info("Attempting direct digital PDF extraction...")
            digital_pages = self.extract_text_from_pdf_digital(file_bytes)
            # If all pages have content, return them
            if digital_pages and all(len(page.strip()) > 0 for page in digital_pages):
                logger.info("Direct digital PDF extraction successful.")
                return digital_pages

        # Fallback to Gemini OCR for images or scanned PDFs
        logger.info(f"Falling back to Gemini LLM OCR for {mime_type}...")
        return await self.extract_text_via_gemini(file_bytes, mime_type)


ocr_service = OCRService()
