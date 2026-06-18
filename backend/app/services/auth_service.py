import random
from datetime import datetime, timedelta, timezone
import logging
from typing import Dict, Tuple, Optional
from app.core.config import settings

logger = logging.getLogger("app.auth")

# In-memory store for OTP validation
# Format: {identifier (email or phone): (otp_code, expires_at)}
MOCK_OTP_STORE: Dict[str, Tuple[str, datetime]] = {}


class AuthService:
    def generate_otp(self, identifier: str) -> str:
        """
        Generate a 6-digit verification code, cache it in memory,
        and log it for mock verification.
        """
        # Generate 6-digit numeric OTP code
        otp_code = "".join([str(random.randint(0, 9)) for _ in range(6)])
        # Set expiry duration
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.OTP_EXPIRY_MINUTES
        )

        # Cache in memory
        MOCK_OTP_STORE[identifier] = (otp_code, expires_at)

        # Print/Log OTP code for developer inspection
        print(f"\n========================================")
        print(f" MOCK OTP FOR: {identifier}")
        print(f" CODE:         {otp_code}")
        print(f" EXPIRES AT:   {expires_at.isoformat()}")
        print(f"========================================\n")
        logger.info(f"Generated mock OTP for {identifier}: {otp_code}")

        return otp_code

    def verify_otp(self, identifier: str, code: str) -> bool:
        """
        Verify if the given OTP matches the cached value and is not expired.
        """
        if identifier not in MOCK_OTP_STORE:
            logger.warning(f"OTP verification failed: no code generated for {identifier}")
            return False

        cached_code, expires_at = MOCK_OTP_STORE[identifier]

        # Check expiration
        if datetime.now(timezone.utc) > expires_at:
            logger.warning(f"OTP verification failed: code expired for {identifier}")
            # Clean up expired code
            del MOCK_OTP_STORE[identifier]
            return False

        # Verify matching code
        if cached_code == code:
            # Clean up on success
            del MOCK_OTP_STORE[identifier]
            logger.info(f"OTP verification successful for {identifier}")
            return True

        logger.warning(f"OTP verification failed: code mismatch for {identifier}")
        return False


auth_service = AuthService()
