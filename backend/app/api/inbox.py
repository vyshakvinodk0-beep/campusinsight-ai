from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, InboxMessage

router = APIRouter(prefix="/inbox", tags=["Accreditation Inbox"])

@router.get("")
def get_inbox_messages(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InboxMessage).filter(
        (InboxMessage.recipient_user_id == current_user.id) |
        (InboxMessage.recipient_role == "All") |
        (InboxMessage.recipient_role == current_user.role)
    )
    if category and category != "All":
        query = query.filter(InboxMessage.category == category)
    
    return query.order_by(InboxMessage.created_at.desc()).all()

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(InboxMessage).filter(
        ((InboxMessage.recipient_user_id == current_user.id) |
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

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msgs = db.query(InboxMessage).filter(
        ((InboxMessage.recipient_user_id == current_user.id) |
         (InboxMessage.recipient_role == "All") |
         (InboxMessage.recipient_role == current_user.role)),
        InboxMessage.is_read == False
    ).all()
    for m in msgs:
        m.is_read = True
    db.commit()
    return {"message": f"{len(msgs)} messages marked as read"}
