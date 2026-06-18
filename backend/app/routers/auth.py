from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, Token
from app.schemas.user import UserCreate
from app.services.auth_service import auth_service
from app.repositories.user_repository import user_repository

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_otp(payload: SendOTPRequest):
    """
    Simulate sending an OTP. In this mock implementation, the OTP is printed
    to the backend server log and also returned in the response for easy debugging.
    """
    identifier = payload.email or payload.phone_number
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or phone_number must be provided",
        )

    # Convert email to lowercase for consistency
    if payload.email:
        identifier = payload.email.lower()

    # Generate OTP (logs to console/logger)
    otp_code = auth_service.generate_otp(identifier)

    return {
        "message": f"Verification code sent to {identifier}",
        "otp_code": otp_code,  # Included in response for MVP sandbox testing ease
    }


@router.post("/verify-otp", response_model=Token, status_code=status.HTTP_200_OK)
async def verify_otp(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify the mock OTP. On successful verification, auto-registers the user
    if they do not already exist, and returns a JWT access token.
    """
    identifier = payload.email or payload.phone_number
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or phone_number must be provided",
        )

    if payload.email:
        identifier = payload.email.lower()

    # Verify the code
    is_valid = auth_service.verify_otp(identifier, payload.otp_code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    # Check database for existing user
    user = None
    if payload.email:
        user = await user_repository.get_by_email(db, email=identifier)
    else:
        user = await user_repository.get_by_phone(db, phone_number=identifier)

    # Auto-register if user doesn't exist
    if not user:
        user_in = UserCreate(
            email=identifier if payload.email else None,
            phone_number=identifier if payload.phone_number else None,
        )
        user = await user_repository.create(db, obj_in=user_in)

    # Generate JWT
    access_token = create_access_token(subject=user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
