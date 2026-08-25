from typing import List, Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, InboxMessage
from app.services.email_service import email_service

router = APIRouter(prefix="/inbox", tags=["Accreditation Inbox & Real Mail"])

class ComposeMessageRequest(BaseModel):
    recipient_user_id: Optional[int] = None
    recipient_email: Optional[EmailStr] = None
    recipient_role: Optional[str] = None # All, Faculty, HOD, Principal, Administrator
    category: str = "Direct" # Approval, Gap, Evidence, System, Direct
    subject: str
    body: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None

@router.get("")
def get_inbox_messages(
    category: Optional[str] = None,
    folder: Optional[str] = "inbox", # inbox, sent, unread
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if folder == "sent":
        query = db.query(InboxMessage).filter(InboxMessage.sender_user_id == current_user.id)
    else:
        query = db.query(InboxMessage).filter(
            (InboxMessage.recipient_user_id == current_user.id) |
            (InboxMessage.recipient_email == current_user.email) |
            (InboxMessage.recipient_role == "All") |
            (InboxMessage.recipient_role == current_user.role)
        )
        if folder == "unread":
            query = query.filter(InboxMessage.is_read == False)

    if category and category != "All":
        query = query.filter(InboxMessage.category == category)
    
    return query.order_by(InboxMessage.created_at.desc()).all()

@router.post("/send")
def send_inbox_message(
    req: ComposeMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Composes and dispatches a real internal accreditation email message.
    Sends async notification via EmailService.
    """
    target_email = req.recipient_email

    if req.recipient_user_id:
        recipient = db.query(User).filter(User.id == req.recipient_user_id).first()
        if recipient and recipient.email:
            target_email = recipient.email

    msg = InboxMessage(
        sender_name=current_user.full_name,
        sender_user_id=current_user.id,
        recipient_user_id=req.recipient_user_id,
        recipient_email=target_email,
        recipient_role=req.recipient_role,
        category=req.category,
        subject=req.subject,
        body=req.body,
        target_type=req.target_type,
        target_id=req.target_id,
        is_read=False
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Trigger real email delivery if target email exists or if a specific role is targeted
    if target_email:
        email_service.send_inbox_email_async(target_email, current_user.full_name, req.subject, req.body)
    elif req.recipient_role and req.recipient_role != "All":
        role_users = db.query(User).filter(User.role == req.recipient_role, User.is_active == True).all()
        for u in role_users:
            if u.email:
                email_service.send_inbox_email_async(u.email, current_user.full_name, req.subject, req.body)

    return {
        "message": "Mail sent successfully",
        "inbox_id": msg.id,
        "recipient_email": target_email
    }

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(InboxMessage).filter(
        ((InboxMessage.recipient_user_id == current_user.id) |
         (InboxMessage.recipient_email == current_user.email) |
         (InboxMessage.recipient_role == "All") |
         (InboxMessage.recipient_role == current_user.role)),
        InboxMessage.is_read == False
    ).count()
    return {"unread_count": count}

@router.patch("/{msg_id}/read")
def mark_message_read(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(InboxMessage).filter(InboxMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True
    db.commit()
    return {"message": "Message marked as read"}

@router.delete("/{msg_id}")
def delete_inbox_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(InboxMessage).filter(InboxMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(msg)
    db.commit()
    return {"message": "Message deleted successfully"}

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msgs = db.query(InboxMessage).filter(
        ((InboxMessage.recipient_user_id == current_user.id) |
         (InboxMessage.recipient_email == current_user.email) |
         (InboxMessage.recipient_role == "All") |
         (InboxMessage.recipient_role == current_user.role)),
        InboxMessage.is_read == False
    ).all()
    for m in msgs:
        m.is_read = True
    db.commit()
    return {"message": f"{len(msgs)} messages marked as read"}
