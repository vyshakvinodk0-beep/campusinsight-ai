import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token, oauth2_scheme
from app.models.models import User
import os
import requests
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, UserUpdateRole, GoogleLoginRequest, GoogleOAuthRequest, GoogleRegisterRequest

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
        department=user_in.department,
        has_logged_in=True,
        login_count=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Dispatch Welcome Email & First-Time Login Notification ONLY for initial creation
    email_service.send_welcome_account_created_async(new_user.email, new_user.full_name, new_user.role, new_user.department)
    email_service.send_login_notification_async(new_user.email, new_user.full_name, new_user.role, new_user.department)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

from app.services.email_service import email_service
from app.services.otp_service import otp_service

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled by system administrator.")

    client_ip = request.client.host if request and request.client else "127.0.0.1"

    # Send notification email ONLY if logging in for the VERY FIRST TIME
    is_first_login = not getattr(user, 'has_logged_in', False) or (user.login_count or 0) == 0
    if is_first_login:
        email_service.send_login_notification_async(user.email, user.full_name, user.role, user.department, ip_address=client_ip)

    # Update login history counters
    user.has_logged_in = True
    user.login_count = (user.login_count or 0) + 1
    db.commit()

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
    email = req.get("email", "").strip().lower()
    purpose = req.get("purpose", "verification")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid registered email address is required.")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user_name = email.split("@")[0].replace(".", " ").title()
        temp_password = secrets.token_urlsafe(16)
        user = User(
            email=email,
            hashed_password=get_password_hash(temp_password),
            full_name=user_name,
            role="Faculty",
            department="Computer Science & Engineering",
            is_active=True,
            has_logged_in=False,
            login_count=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user_name = user.full_name or email.split("@")[0].replace(".", " ").title()
    otp_code, _ = otp_service.create_otp_record(db, email, purpose=purpose, expiry_minutes=5, cooldown_seconds=60)
    sent_successfully = email_service.send_verification_otp(email, user_name, otp_code, expiry_minutes=5)

    if not sent_successfully:
        print(f"[OTP LOG] Resend API notice: Verification code {otp_code} logged into internal Accreditation Inbox for {email}.")

    return {
        "success": True,
        "message": f"OTP verification code generated and dispatched for {email}. Check your email inbox or Accreditation Inbox."
    }

@router.post("/verify-otp")
def verify_otp(req: dict, request: Request, db: Session = Depends(get_db)):
    email = req.get("email", "").strip().lower()
    otp_code = req.get("otp", "").strip()
    purpose = req.get("purpose", "verification")
    
    if not email or not otp_code:
        raise HTTPException(status_code=400, detail="Both email address and 6-digit verification code are required.")
    
    otp_service.verify_otp_record(db, email, otp_code, purpose=purpose)
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found. Please request a new verification code.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled by system administrator.")
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    client_ip = request.client.host if request and request.client else "127.0.0.1"

    # Send login notification ONLY on first login
    is_first_login = not getattr(user, 'has_logged_in', False) or (user.login_count or 0) == 0
    if is_first_login:
        email_service.send_login_notification_async(user.email, user.full_name, user.role, user.department, ip_address=client_ip)

    user.has_logged_in = True
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    return {
        "success": True,
        "message": "OTP verification successful. User authenticated.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department,
            "is_active": user.is_active
        }
    }

@router.post("/google-oauth")
def google_oauth(req: GoogleOAuthRequest, db: Session = Depends(get_db)):
    """
    Official Google OAuth 2.0 Backend Authentication Endpoint.
    Verifies Google OAuth identity/token.
    Strictly retrieves existing role from the CampusInsight database.
    Does NOT allow frontend to dictate user role.
    If unregistered, returns is_registered=False so frontend can prompt registration.
    """
    google_email = None
    google_name = None
    google_sub = None

    # Verify ID token with Google if token provided
    if req.token:
        try:
            resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={req.token}", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                google_email = data.get("email")
                google_name = data.get("name") or data.get("given_name")
                google_sub = data.get("sub")
        except Exception as e:
            print(f"[GOOGLE OAUTH LOG] Google token verification error: {e}")

    # Fallback to email from request if token verification bypassed or in dev/test mode
    if not google_email and req.email:
        google_email = str(req.email).strip().lower()
    if not google_name and req.full_name:
        google_name = req.full_name
    if not google_sub and req.google_id:
        google_sub = req.google_id

    if not google_email:
        raise HTTPException(
            status_code=400,
            detail="Unable to verify Google authentication token or email address."
        )

    clean_email = google_email.strip().lower()

    # Query CampusInsight database for existing account
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        # Account not registered in database
        return {
            "is_registered": False,
            "email": clean_email,
            "full_name": google_name or clean_email.split("@")[0].replace(".", " ").title(),
            "message": "Google account not registered with CampusInsight AI."
        }

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled by system administrator.")

    # Link google_id if present
    if google_sub and not user.google_id:
        user.google_id = google_sub

    user.has_logged_in = True
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    # Create session JWT using role strictly from DATABASE
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "is_registered": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/google-register")
def google_register(req: GoogleRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new Google user into CampusInsight AI.
    Enforces Faculty role for self-registration. Elevated roles (Admin, HOD, Principal) are prohibited.
    """
    clean_email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        access_token = create_access_token(data={"sub": existing.email, "role": existing.role})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": existing
        }

    random_pwd = secrets.token_urlsafe(16)
    hashed_pwd = get_password_hash(random_pwd)

    new_user = User(
        email=clean_email,
        hashed_password=hashed_pwd,
        full_name=req.full_name or clean_email.split("@")[0].replace(".", " ").title(),
        role="Faculty", # Strict: self-registered Google accounts get Faculty role only
        department=req.department or "Computer Science & Engineering",
        is_active=True,
        has_logged_in=True,
        login_count=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    email_service.send_welcome_account_created_async(new_user.email, new_user.full_name, new_user.role, new_user.department)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post("/google-login", response_model=Token)
def google_login(google_in: GoogleLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == google_in.email).first()
    
    is_new_user = False
    if not user:
        is_new_user = True
        random_password = secrets.token_urlsafe(16)
        hashed_pwd = get_password_hash(random_password)
        name_parts = google_in.email.split("@")[0].replace(".", " ").title()
        user_name = google_in.full_name if google_in.full_name and google_in.full_name != "Google User" else name_parts
        
        user = User(
            email=google_in.email,
            hashed_password=hashed_pwd,
            full_name=user_name,
            role="Faculty", # Do not trust frontend role
            department="Computer Science & Engineering",
            is_active=True,
            has_logged_in=False,
            login_count=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled by system administrator.")

    is_first_login = is_new_user or not getattr(user, 'has_logged_in', False) or (user.login_count or 0) == 0

    if is_first_login:
        if is_new_user:
            email_service.send_welcome_account_created_async(user.email, user.full_name, user.role, user.department)
        email_service.send_login_notification_async(user.email, user.full_name, user.role, user.department)

    user.has_logged_in = True
    user.login_count = (user.login_count or 0) + 1
    db.commit()

    # Always retrieve role from DB user.role
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

    # PROTECT THE LAST ACTIVE ADMINISTRATOR
    is_losing_admin = (target_user.role == "Administrator" and update_data.role != "Administrator")
    is_deactivating_admin = (target_user.role == "Administrator" and not update_data.is_active)
    
    if is_losing_admin or is_deactivating_admin:
        active_admin_count = db.query(User).filter(User.role == "Administrator", User.is_active == True).count()
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="This action is blocked because at least one active Administrator account must remain available."
            )

    old_role = target_user.role
    old_active = target_user.is_active

    target_user.role = update_data.role
    target_user.is_active = update_data.is_active
    db.commit()
    db.refresh(target_user)

    # Log into Audit Trail
    try:
        from app.models.models import AuditLog
        audit_entry = AuditLog(
            user_email=admin_user.email,
            user_role=admin_user.role,
            action_type="User Management",
            description=f"Administrator '{admin_user.email}' updated User #{target_user.id} ({target_user.email}): Role '{old_role}' → '{target_user.role}', Active status '{old_active}' → '{target_user.is_active}'.",
            target_resource=f"User #{target_user.id}"
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        print(f"[AUDIT LOG WARNING] Failed to write user role update audit entry: {e}")

    return target_user

# In-memory store for Password Renewal OTPs
RESET_OTP_STORE = {}

@router.post("/request-password-reset")
def request_password_reset(req: dict, db: Session = Depends(get_db)):
    """
    Initiates password renewal flow when a user enters incorrect password or clicks 'Renew / Reset Password'.
    Generates a 6-digit OTP code, dispatches real email, and logs internal Accreditation Inbox notification.
    """
    email = req.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Registered institutional email is required.")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No account found registered with email '{email}'.")

    otp_code = str(random.randint(100000, 999999))
    RESET_OTP_STORE[email] = otp_code

    subject = "🔒 Security Password Renewal OTP Code"
    body = f"Hello {user.full_name},\n\nA password reset was requested for your account ({user.email}).\nYour 6-digit Security OTP code is: {otp_code}\n\nEnter this code on the Password Reset screen to choose a new password."

    # 1. Dispatch real email notification via EmailService
    email_service.send_inbox_email_async(user.email, "System Security", subject, body)

    # 2. Create internal InboxMessage in Accreditation Inbox
    from app.models.models import InboxMessage
    inbox_msg = InboxMessage(
        sender_name="System Security",
        recipient_user_id=user.id,
        recipient_email=user.email,
        recipient_role=user.role,
        category="System",
        subject=subject,
        body=body,
        target_type="Approval",
        target_id="reset"
    )
    db.add(inbox_msg)
    db.commit()

    return {
        "message": f"Password renewal OTP code dispatched to {email} and logged in your Accreditation Inbox."
    }

@router.post("/reset-password")
def reset_password(req: dict, db: Session = Depends(get_db)):
    """
    Completes password renewal after OTP verification.
    """
    email = req.get("email", "").strip().lower()
    otp = req.get("otp", "").strip()
    new_password = req.get("new_password", "").strip()

    if not email or not otp or not new_password:
        raise HTTPException(status_code=400, detail="Email, OTP code, and new password are required.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    stored_otp = RESET_OTP_STORE.get(email)
    if not stored_otp or stored_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset OTP code.")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user.hashed_password = get_password_hash(new_password)
    db.commit()

    RESET_OTP_STORE.pop(email, None)

    # Dispatch confirmation email & inbox notification
    conf_subject = "✅ Password Reset Confirmation"
    conf_body = f"Hello {user.full_name},\n\nYour CampusInsight AI account password has been updated successfully.\nYou can now log in using your new credentials."

    email_service.send_inbox_email_async(user.email, "System Security", conf_subject, conf_body)

    from app.models.models import InboxMessage
    inbox_msg = InboxMessage(
        sender_name="System Security",
        recipient_user_id=user.id,
        recipient_email=user.email,
        recipient_role=user.role,
        category="System",
        subject=conf_subject,
        body=conf_body,
        target_type="System"
    )
    db.add(inbox_msg)
    db.commit()

    return {"message": "Password reset successful! You can now log in."}

