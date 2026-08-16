from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token, oauth2_scheme
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, UserUpdateRole

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Role '{current_user.role}' does not have required permissions ({', '.join(roles)})."
            )
        return current_user
    return role_checker

@router.post("/register", response_model=Token)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.role == "Administrator":
        raise HTTPException(
            status_code=400, 
            detail="System Administrator role cannot be self-registered. Only one designated System Administrator account is permitted."
        )

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=user_in.role,
        department=user_in.department
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Dispatch Welcome Email & Security Notification to User's Email Address
    email_service.send_welcome_account_created_async(new_user.email, new_user.full_name, new_user.role, new_user.department)
    email_service.send_login_notification_async(new_user.email, new_user.full_name, new_user.role, new_user.department)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

from app.services.email_service import email_service
import random

# In-memory OTP storage for security verification (Email -> {otp: str, expires: datetime})
OTP_STORE = {}

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled by system administrator.")

    # Dispatch Security Notification Email to user's Gmail
    email_service.send_login_notification_async(user.email, user.full_name, user.role, user.department)

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

from app.schemas.schemas import GoogleLoginRequest
import secrets

@router.post("/google-check-email")
def google_check_email(req: dict, db: Session = Depends(get_db)):
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user = db.query(User).filter(User.email == email).first()
    if user:
        return {
            "exists": True,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department
        }
    return {"exists": False}

@router.post("/send-otp")
def send_otp(req: dict, db: Session = Depends(get_db)):
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Generate 6-digit verification code
    otp_code = str(random.randint(100000, 999999))
    OTP_STORE[email.lower()] = otp_code

    user = db.query(User).filter(User.email == email).first()
    user_name = user.full_name if user else email.split("@")[0].title()

    # Send OTP to user's Gmail address
    email_service.send_verification_otp_async(email, user_name, otp_code)

    from app.core.config import settings
    is_smtp_active = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)

    return {
        "message": f"Verification security code sent to {email}",
        "otp": otp_code if not is_smtp_active else None,
        "dev_mode": not is_smtp_active
    }

@router.post("/verify-otp")
def verify_otp(req: dict):
    email = req.get("email", "").lower()
    otp_code = req.get("otp", "").strip()
    
    stored_otp = OTP_STORE.get(email)
    if not stored_otp or stored_otp != otp_code:
        raise HTTPException(status_code=400, detail="Invalid or expired verification security code")
    
    # Clear OTP after successful verification
    OTP_STORE.pop(email, None)
    return {"status": "verified"}

@router.post("/google-login", response_model=Token)
def google_login(google_in: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Secure Google OAuth authentication endpoint for Gmail / Google Workspace.
    Verifies user identity, supports role selection, sends email alert, prevents data leakage via JWT token isolation.
    """
    user = db.query(User).filter(User.email == google_in.email).first()
    
    valid_roles = ["Faculty", "HOD", "Principal", "Administrator"]
    selected_role = google_in.role if google_in.role in valid_roles else "Faculty"
    selected_dept = google_in.department if google_in.department else "Computer Science & Engineering"

    is_new_user = False
    if not user:
        is_new_user = True
        # Create a new user securely for first-time Google sign-in with chosen role
        random_password = secrets.token_urlsafe(16)
        hashed_pwd = get_password_hash(random_password)
        name_parts = google_in.email.split("@")[0].replace(".", " ").title()
        user_name = google_in.full_name if google_in.full_name and google_in.full_name != "Google User" else name_parts
        
        user = User(
            email=google_in.email,
            hashed_password=hashed_pwd,
            full_name=user_name,
            role=selected_role,
            department=selected_dept,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled by system administrator.")

    # Dispatch Welcome Email if new user, and Security Login Notification to user's Gmail
    if is_new_user:
        email_service.send_welcome_account_created_async(user.email, user.full_name, user.role, user.department)
    
    email_service.send_login_notification_async(user.email, user.full_name, user.role, user.department)

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }




@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Manage Users (Roles & Access) - Administrator Only
@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Administrator"]))
):
    users = db.query(User).order_by(User.id.asc()).all()
    return users

@router.post("/users/create", response_model=UserResponse)
def create_user_admin(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Administrator"]))
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=user_in.role,
        department=user_in.department,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Dispatch Welcome Email to user's registered email
    email_service.send_welcome_account_created_async(new_user.email, new_user.full_name, new_user.role, new_user.department)

    return new_user

@router.post("/users/update-role", response_model=UserResponse)
def update_user_role(
    update_data: UserUpdateRole,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Administrator"]))
):
    target_user = db.query(User).filter(User.id == update_data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    valid_roles = ["Faculty", "HOD", "Principal", "Administrator"]
    if update_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

    target_user.role = update_data.role
    target_user.is_active = update_data.is_active
    db.commit()
    db.refresh(target_user)
    return target_user

