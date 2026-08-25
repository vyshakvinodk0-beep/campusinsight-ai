import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import OTPVerification

class OTPService:
    @staticmethod
    def generate_otp() -> str:
        """
        Generates a cryptographically secure 6-digit OTP code using Python's secrets module.
        """
        return f"{secrets.randbelow(1000000):06d}"

    @staticmethod
    def hash_otp(otp_code: str) -> str:
        """
        Hashes the 6-digit OTP string using SHA-256 for secure database storage.
        """
        return hashlib.sha256(otp_code.strip().encode("utf-8")).hexdigest()

    @staticmethod
    def create_otp_record(
        db: Session,
        email: str,
        purpose: str = "verification",
        expiry_minutes: int = 5,
        cooldown_seconds: int = 60
    ) -> Tuple[str, OTPVerification]:
        """
        Enforces 60-second resend rate-limiting, invalidates past unused OTPs,
        and creates a new 5-minute OTP record.
        Returns (plaintext_otp_code, otp_record).
        """
        clean_email = email.strip().lower()
        now = datetime.utcnow()

        # 1. Rate limiting check: check if OTP was created in the last cooldown_seconds
        recent_otp = (
            db.query(OTPVerification)
            .filter(
                OTPVerification.email == clean_email,
                OTPVerification.purpose == purpose,
                OTPVerification.created_at >= (now - timedelta(seconds=cooldown_seconds))
            )
            .order_by(OTPVerification.id.desc())
            .first()
        )
        if recent_otp:
            time_passed = (now - recent_otp.created_at).total_seconds()
            remaining = int(cooldown_seconds - time_passed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {max(1, remaining)} seconds before requesting a new verification code."
            )

        # 2. Invalidate older active unused OTPs for this email and purpose
        db.query(OTPVerification).filter(
            OTPVerification.email == clean_email,
            OTPVerification.purpose == purpose,
            OTPVerification.is_used == False
        ).update({"is_used": True}, synchronize_session=False)

        # 3. Generate cryptographically secure OTP and hash it
        otp_code = OTPService.generate_otp()
        otp_hash = OTPService.hash_otp(otp_code)
        expires_at = now + timedelta(minutes=expiry_minutes)

        # 4. Save to database
        otp_record = OTPVerification(
            email=clean_email,
            otp_hash=otp_hash,
            purpose=purpose,
            created_at=now,
            expires_at=expires_at,
            attempts=0,
            max_attempts=5,
            is_used=False
        )
        db.add(otp_record)
        db.commit()
        db.refresh(otp_record)

        return otp_code, otp_record

    @staticmethod
    def verify_otp_record(
        db: Session,
        email: str,
        otp_code: str,
        purpose: str = "verification"
    ) -> bool:
        """
        Verifies the user-entered OTP against the stored record:
        - OTP exists
        - OTP not expired (5 min)
        - OTP not already used
        - Attempts < max_attempts (5)
        - Matches SHA-256 hash
        Marks OTP as used upon successful verification.
        Raises HTTPException with clear error details on failure.
        """
        clean_email = email.strip().lower()
        clean_code = otp_code.strip()

        if not clean_code or len(clean_code) != 6 or not clean_code.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code must be a 6-digit number."
            )

        # Find latest record for email & purpose
        otp_record = (
            db.query(OTPVerification)
            .filter(
                OTPVerification.email == clean_email,
                OTPVerification.purpose == purpose
            )
            .order_by(OTPVerification.id.desc())
            .first()
        )

        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No verification code was requested for this email address."
            )

        if otp_record.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification code has already been used. Please request a new code."
            )

        if otp_record.attempts >= otp_record.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum verification attempts exceeded. Please request a new verification code."
            )

        now = datetime.utcnow()
        if now > otp_record.expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Codes are valid for 5 minutes. Please request a new code."
            )

        # Hash input code and compare
        input_hash = OTPService.hash_otp(clean_code)
        if input_hash != otp_record.otp_hash:
            otp_record.attempts += 1
            db.commit()
            remaining_attempts = max(0, otp_record.max_attempts - otp_record.attempts)
            if remaining_attempts == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect verification code. Maximum attempts exceeded. Please request a new code."
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect verification code. {remaining_attempts} attempt(s) remaining."
            )

        # Mark as used on success
        otp_record.is_used = True
        db.commit()
        return True

otp_service = OTPService()
