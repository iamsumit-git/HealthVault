# PostCare India 🇮🇳

PostCare India is a patient-owned personal medical record locker designed for Indian families. It allows users to store prescriptions, lab reports, discharge summaries, and medical scans securely, with AI-powered clinical structured parsing, summarization, and Retrieval-Augmented Generation (RAG) chat.

---

## 🚀 Features

* **🔐 Passwordless Login**: Simple OTP verification (email-based sandbox mockup for developer MVP).
* **📄 Central Health Locker**: Upload and index PDFs, gallery pictures, or live camera scans.
* **🔬 Clinical AI OCR & Processing**: Automatic text extraction using digital parsing or Gemini OCR fallback.
* **🧠 Structured Health Insights**: AI-extracted clinical summaries, medication lists, and color-coded flags warning of abnormal lab metrics.
* **💬 RAG Locker Assistant**: Chat with your medical records in plain language. Features clickable citation badges referencing source files.
* **🤖 Automatic Local AI Fallback**: Seamless local [Ollama](https://ollama.com/) integration targeting `qwen3-coder:480b-cloud` when Gemini API is unavailable.
* **🔗 Expirable Share Links**: Generate time-limited secure URLs to share selected documents with doctors or family members.

---

## 🛠️ Technology Stack

### Backend Services
* **Framework**: FastAPI (Python 3.12+)
* **Database**: PostgreSQL with `pgvector` for storing semantic chunks and embeddings.
* **Migrations**: Alembic
* **Storage**: MinIO (simulating AWS S3 API locally)
* **Deployment**: Docker Compose for containerized environment.

### Mobile Client
* **Framework**: React Native + Expo (with Expo Router)
* **State Management**: Zustand
* **Styling**: Premium Teal-accented modern dark/glassmorphic custom layout system.

### AI Integration
* **API Providers**: Google Gemini 1.5 Flash (for structured extraction & OCR) and local Ollama REST client (`host.docker.internal:11434`) as a local offline fallback.
* **Embedding Model**: Gemini `text-embedding-004` (with a 768-dimension mock fallback for offline development).

---

## 📂 Project Structure

```text
HealthVault/
├── backend/                  # FastAPI app code
│   ├── app/
│   │   ├── core/             # Configuration, Database connections, Security utilities
│   │   ├── models/           # SQLAlchemy Declarative Models (User, MedicalDocument, etc.)
│   │   ├── repositories/     # Database operations abstraction layers
│   │   ├── schemas/          # Pydantic Schemas for validation
│   │   ├── services/         # OCR, Storage, RAG, and AI generation logic
│   │   └── routers/          # API endpoints (Auth, Users, Documents, shares, AI)
│   ├── alembic/              # SQL schema migration records
│   ├── Dockerfile            # Container build file
│   └── requirements.txt      # Python dependencies
├── mobile/                   # React Native (Expo) app code
│   ├── src/
│   │   ├── app/              # Expo Router File-based Navigation Pages
│   │   ├── components/       # UI Components & Buttons
│   │   └── services/         # Mobile client endpoints communication
│   └── package.json          # Node dependencies
├── Docs/                     # Specifications and detailed test guides
│   ├── Product.md            # Original product specifications
│   └── test_step.md          # Step-by-step physical device test guide
└── docker-compose.yml        # Orchestration configurations for Db, MinIO, and FastAPI
```

---

## 🏗️ Getting Started

### 1. Run the Backend (Docker)
Ensure Docker Desktop is running, then run the following in the project root:
```bash
docker compose up -d --build
```
This builds and starts:
* **PostgreSQL + pgvector** (`healthvault_db`) on port `5432`
* **MinIO Object Storage** (`healthvault_minio`) on port `9000` (API) & `9001` (Dashboard)
* **FastAPI Server** (`healthvault_backend`) on port `8000` (API documentation at `http://localhost:8000/docs`)

*Note: Alembic database migrations are applied automatically during container boot.*

### 2. Configure Local VS Code Workspace (Optional)
To resolve unresolved module imports and lint errors in VS Code:
1. Create a local virtual environment:
   ```bash
   python -m venv .venv
   ```
2. Install dependencies locally:
   ```bash
   .venv\Scripts\pip install -r backend/requirements.txt
   ```
3. Open VS Code Command Palette (`Ctrl+Shift+P`), choose **`Python: Select Interpreter`**, and select the interpreter inside `.venv`.

---

## 📱 Running the Mobile Client

1. **Find your host IP address**:
   Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your local IPv4 network address (e.g., `192.168.1.15`).
2. **Configure API endpoint**:
   Open [mobile/src/services/api.ts](file:///d:/odido/EAI_19.3/sumit/AI/HealthVault/mobile/src/services/api.ts) and modify `getBaseURL` to point to your computer's IP address:
   ```typescript
   const getBaseURL = () => {
     return "http://192.168.1.15:8000/api/v1"; // Replace with your host IP
   };
   ```
3. **Start Expo Packager**:
   ```bash
   cd mobile
   npm install
   npm run start
   ```
4. **Scan QR Code**:
   * Open the **Expo Go** application on your physical iOS or Android phone.
   * Make sure your phone and computer are on the **exact same Wi-Fi network**.
   * Scan the QR Code shown in the terminal.

For detailed instructions on logging in, uploading clinical reports, and testing the AI locker assistant, refer to the [test_step.md](file:///d:/odido/EAI_19.3/sumit/AI/HealthVault/Docs/test_step.md) file.
