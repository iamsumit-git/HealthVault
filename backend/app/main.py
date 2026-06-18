from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, users, documents, shares, ai

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="A patient-owned medical record locker with AI-powered report understanding.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS for local frontend testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(shares.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)






@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Welcome to PostCare India Personal Health Locker API",
        "docs_url": "/docs"
    }
