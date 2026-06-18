from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class SendOTPRequest(BaseModel):
    phone_number: Optional[str] = Field(None, description="Phone number to send OTP to")
    email: Optional[EmailStr] = Field(None, description="Email address to send OTP to")


class VerifyOTPRequest(BaseModel):
    phone_number: Optional[str] = Field(None, description="Phone number targeted")
    email: Optional[EmailStr] = Field(None, description="Email address targeted")
    otp_code: str = Field(..., description="The received mock OTP code")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
