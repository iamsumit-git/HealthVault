from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "PostCare India API"
    API_V1_STR: str = "/api/v1"

    # Database Settings
    DATABASE_URL: str = "postgresql+asyncpg://healthadmin:healthpassword@db:5432/healthvault"

    # Security Settings
    JWT_SECRET: str = "supersecretjwtkeyforpostcareindia123"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Object Storage (MinIO/S3)
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadminpassword"
    MINIO_BUCKET_NAME: str = "health-documents"
    MINIO_SECURE: bool = False  # Set to True for HTTPS S3

    # AI Service Settings
    GEMINI_API_KEY: str = "mock_key"
    EMBEDDING_MODEL: str = "models/text-embedding-004"
    LLM_MODEL: str = "gemini-1.5-flash"

    # Ollama Settings
    OLLAMA_ENDPOINT: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "qwen3-coder:480b-cloud"

    # SMS/Email Mock Send Config
    OTP_EXPIRY_MINUTES: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
