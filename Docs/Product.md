# PostCare India MVP

A patient-owned medical record locker with AI-powered report understanding.

---

## 1) Product Vision

PostCare India is a simple health record app for patients in India to upload prescriptions, lab reports, discharge summaries, and scans into one secure place, then ask AI questions about those documents in plain language.

The product is not a hospital EHR, not a telemedicine app, and not a doctor replacement. It is a patient-facing layer that solves three core problems:

- Medical records are scattered across paper files and different hospitals.
- Patients often do not understand what their reports or prescriptions mean.
- Patients need a simple way to share records with doctors or family members.

The long-term vision is to become the most trusted personal medical record and report-explanation tool for Indian families.

---

## 2) Problem Summary

Patients in India frequently leave clinics with handwritten prescriptions, unclear instructions, and fragmented records. Studies show that prescription understanding is often poor, and many patients do not fully understand the diagnosis or medication details after visiting a doctor [web:114][web:120][web:121].

The current gap is not just storage. It is also comprehension. People need a way to:
- keep all records in one place,
- find them quickly,
- and understand them without medical knowledge.

This product addresses that gap directly.

---

## 3) MVP Scope

### Must-have features
1. **User login**
   - Phone number OTP or email-based login.
   - Basic profile creation.

2. **Upload medical documents**
   - Camera capture.
   - Gallery upload.
   - PDF upload.
   - Document type selection.

3. **Central storage**
   - Store files in object storage.
   - Store metadata in PostgreSQL.
   - Keep all records tied to one user.

4. **Browse records**
   - Timeline/list view.
   - Search and filter by type/date.

5. **Share records**
   - Create share links for doctors or family.
   - Time-limited access.

6. **AI assistant**
   - Ask questions about uploaded reports.
   - Get a simple summary.
   - Get plain-language explanations.

### Not in MVP
- ABHA integration.
- Clinic dashboard.
- Doctor portal.
- WhatsApp bot.
- Medication reminders.
- Corporate or B2B workflows.
- Full OCR automation for all edge cases.
- Family account management beyond basic future design.

---

## 4) Recommended Product Shape

The first version should be a **mobile-first Flutter app** with a simple, clean UI.

The product flow should be:

1. User signs in.
2. User uploads a report or prescription.
3. The system stores the file and extracts text.
4. The user can browse all uploads in one timeline.
5. The user can ask AI what the report means.
6. The user can share selected documents with a doctor.

This is the narrowest and strongest MVP.

---

## 5) Architecture Overview

### Frontend
- Flutter
- Dart
- Riverpod or BLoC
- go_router
- Material 3

### Backend
- FastAPI
- Python 3.12+
- PostgreSQL
- SQLAlchemy 2.x
- Alembic
- JWT authentication
- Object storage such as AWS S3 or MinIO
- Optional Redis for queues and caching

### AI Layer
- OCR service for extracting text from scans and PDFs.
- Retrieval layer over document chunks.
- LLM API for summaries and Q&A.

### High-level flow
1. Flutter app uploads file to FastAPI.
2. FastAPI stores file in object storage.
3. FastAPI stores metadata in PostgreSQL.
4. OCR extracts text.
5. Text is chunked and indexed.
6. AI retrieves relevant chunks when the user asks a question.
7. AI returns a grounded answer.

---

## 6) Database Model

Use PostgreSQL as the main source of truth.

### Tables

#### users
Stores user identity and profile data.

Fields:
- id
- phone_number
- email
- full_name
- date_of_birth
- age
- gender
- blood_group
- emergency_contact_name
- emergency_contact_phone
- allergies
- chronic_conditions
- created_at
- updated_at

#### medical_documents
Stores metadata for each uploaded file.

Fields:
- id
- user_id
- document_type
- title
- file_url
- thumbnail_url
- file_format
- document_date
- uploaded_at
- notes
- tags
- source_type
- created_at
- updated_at

#### document_pages
Stores page-level OCR text if the file is multi-page.

Fields:
- id
- document_id
- page_number
- raw_text
- created_at

#### document_chunks
Stores smaller chunks used for retrieval.

Fields:
- id
- document_id
- page_id
- chunk_index
- chunk_text
- embedding_vector
- token_count
- created_at

#### extracted_health_data
Stores structured outputs from OCR and parsing.

Fields:
- id
- document_id
- user_id
- extracted_text
- key_values_json
- abnormal_flags_json
- created_at

#### document_shares
Stores share links and their expiry.

Fields:
- id
- user_id
- share_token
- expires_at
- is_active
- created_at

#### document_share_items
Join table for which documents are included in a share.

Fields:
- share_id
- document_id

#### ai_conversations
Stores AI chat sessions.

Fields:
- id
- user_id
- session_title
- created_at
- updated_at

#### ai_messages
Stores messages in a conversation.

Fields:
- id
- conversation_id
- role
- content
- referenced_document_ids
- created_at

#### audit_logs
Stores security and action logs.

Fields:
- id
- actor_user_id
- action
- entity_type
- entity_id
- metadata_json
- created_at

---

## 7) SQLAlchemy Model Design

Use UUID primary keys for all public entities.

### Core relationships
- One user has many documents.
- One document has many pages.
- One page has many chunks.
- One document has one extracted health data row.
- One user has many AI conversations.
- One conversation has many messages.
- One share can include many documents.

### Recommended models
- `User`
- `MedicalDocument`
- `DocumentPage`
- `DocumentChunk`
- `ExtractedHealthData`
- `DocumentShare`
- `DocumentShareItem`
- `AIConversation`
- `AIMessage`
- `AuditLog`

### Vector storage
For document retrieval, store embeddings in `document_chunks.embedding_vector` using `pgvector`.

---

## 8) FastAPI Backend Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   ├── dependencies.py
│   │   └── logging.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── medical_document.py
│   │   ├── document_page.py
│   │   ├── document_chunk.py
│   │   ├── extracted_health_data.py
│   │   ├── document_share.py
│   │   ├── ai_conversation.py
│   │   ├── ai_message.py
│   │   └── audit_log.py
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── share.py
│   │   ├── ai.py
│   │   └── common.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── documents.py
│   │   ├── shares.py
│   │   ├── ai.py
│   │   └── health.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── document_service.py
│   │   ├── share_service.py
│   │   ├── ai_service.py
│   │   ├── ocr_service.py
│   │   ├── embedding_service.py
│   │   └── storage_service.py
│   ├── repositories/
│   │   ├── user_repository.py
│   │   ├── document_repository.py
│   │   ├── share_repository.py
│   │   ├── ai_repository.py
│   │   └── audit_repository.py
│   ├── utils/
│   │   ├── file_utils.py
│   │   ├── text_utils.py
│   │   ├── token_utils.py
│   │   └── date_utils.py
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── conftest.py
├── alembic/
├── alembic.ini
├── requirements.txt
└── README.md
```

### Backend responsibilities
- Routers accept requests.
- Services contain business logic.
- Repositories talk to the database.
- OCR service extracts text.
- Embedding service converts text chunks into vectors.
- AI service performs retrieval and response generation.

---

## 9) AI Retrieval Approach

This product should use a **RAG** flow, not just raw prompt stuffing.

### Recommended pipeline
1. User uploads a document.
2. OCR extracts text.
3. The text is split into pages and chunks.
4. Each chunk is embedded.
5. Embeddings are stored in PostgreSQL using `pgvector`.
6. When the user asks a question, the backend embeds the question.
7. The backend retrieves the top matching chunks.
8. The LLM answers using only those chunks and the user’s documents.

### Why this approach
- Better factual grounding.
- Better answers than page-only search.
- Easier to cite specific report text.
- Works well for queries like:
  - “What is wrong in my report?”
  - “Is my sugar high?”
  - “Summarize all my abnormal values.”
  - “Explain this prescription in simple language.”

### Page index vs vector DB
For the MVP, **page indexing alone is not enough** for natural-language Q&A. It is useful for navigation, but not for semantic understanding.

### Best MVP approach
- Store page text.
- Store chunk text.
- Store embeddings with `pgvector`.
- Use hybrid retrieval later if needed:
  - keyword search,
  - page lookup,
  - vector similarity.

### AI safety rules
- Use only the user’s own documents.
- Do not hallucinate diagnoses.
- Do not recommend medication changes.
- Always include a medical disclaimer.
- If there is a possible emergency, advise the user to contact a doctor immediately.

---

## 10) OCR and Document Parsing

### Input types
- Photos of prescriptions.
- Photos of lab reports.
- PDFs.
- Scanned discharge summaries.

### Parsing steps
1. Preprocess image.
2. OCR text extraction.
3. Page splitting.
4. Chunking.
5. Extract structured fields:
   - medicines,
   - dosage,
   - test names,
   - values,
   - abnormal flags,
   - dates.
6. Store extracted content.

### MVP OCR approach
- Start with one OCR provider.
- Improve later with handwriting-specific support.
- If OCR confidence is low, allow manual correction.

---

## 11) APIs

### Auth
- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/login`

### Users
- `GET /users/me`
- `POST /users/me`
- `PUT /users/me`

### Documents
- `POST /documents/upload`
- `GET /documents`
- `GET /documents/{id}`
- `DELETE /documents/{id}`

### Shares
- `POST /shares/create`
- `GET /shares/{token}`
- `POST /shares/revoke`

### AI
- `POST /ai/chat`
- `POST /ai/summarize`

### System
- `GET /health`

---

## 12) Flutter App Structure

```text
lib/
├── core/
│   ├── constants/
│   ├── routing/
│   ├── theme/
│   ├── utils/
│   └── widgets/
├── features/
│   ├── auth/
│   ├── profile/
│   ├── documents/
│   ├── shares/
│   └── ai/
└── shared/
    ├── models/
    ├── repositories/
    └── services/
```

### Key screens
- Splash
- Login
- Profile setup
- Home dashboard
- Upload document
- Records timeline
- Document detail
- Share screen
- AI chat screen

---

## 13) Security Requirements

- Encrypt data in transit.
- Encrypt files at rest.
- Use JWT auth.
- Scope every query by `user_id`.
- Validate share token expiry.
- Log access events.
- Do not expose raw OCR text in logs.
- Rate-limit AI and upload endpoints.

---

## 14) Testing Plan

### Backend tests
- Auth tests.
- Upload tests.
- Retrieval tests.
- Share token tests.
- AI response safety tests.
- Database permission tests.

### Flutter tests
- Widget tests for login and upload screens.
- Unit tests for validators and state management.
- Integration tests for upload, browse, share, and ask-AI flow.

### Manual QA
- Upload a prescription photo.
- Upload a lab PDF.
- Search by date and type.
- Open a share link on another device.
- Ask the AI a question and verify the answer is grounded in uploaded data.

---

## 15) MVP Build Order

### Phase 1
- Flutter app skeleton.
- FastAPI skeleton.
- PostgreSQL schema.
- Login and profile.

### Phase 2
- Document upload and storage.
- Document timeline.

### Phase 3
- OCR and text extraction.
- Chunking and embeddings.

### Phase 4
- AI chat and summarization.

### Phase 5
- Share links and security hardening.
- Testing and beta launch.

---

## 16) Final MVP Definition

The MVP is a **medical record locker with AI report understanding**.

It solves a real patient pain point:
- records are fragmented,
- documents are hard to manage,
- and medical language is hard to understand.

The goal is to launch a product that is useful immediately, safe to operate, and simple enough to validate quickly.