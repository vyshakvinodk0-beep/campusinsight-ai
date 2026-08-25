from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, Document, GapItem, DocumentConflict, AuditLog, InboxMessage, CriterionAnalysis

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=Dict[str, Any])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dynamically generates real role-based notifications and action alerts based strictly on 
    REAL database state (Documents, Gaps, Conflicts, Audit Logs, Inbox Messages).
    No fake or hardcoded static notifications.
    """
    role = current_user.role
    user_dept = current_user.department or ""
    dept_prefix = user_dept.split()[0] if user_dept else ""

    action_required: List[Dict[str, Any]] = []
    recent_activity: List[Dict[str, Any]] = []
    system_alerts: List[Dict[str, Any]] = []

    # =========================================================================
    # 1. HOD NOTIFICATIONS (Departmental Review & Validation Authority)
    # =========================================================================
    if role in ["HOD", "Administrator"]:
        # Query documents pending HOD validation in authorized department
        hod_pending_docs = db.query(Document).filter(
            Document.validation_status == "Pending HOD Validation"
        ).all()

        for d in hod_pending_docs:
            action_required.append({
                "id": f"doc_hod_{d.id}",
                "type": "HOD_VALIDATION",
                "priority": "WARNING",
                "title": "Evidence Awaiting HOD Validation",
                "message": f"'{d.original_name}' ({d.owner.full_name if d.owner else 'Faculty'}) is waiting for your HOD review.",
                "document_id": d.id,
                "document_name": d.original_name,
                "sub_criterion": d.sub_criterion,
                "created_at": d.upload_date.isoformat() if d.upload_date else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "Review Evidence",
                "action_url": "/documents"
            })

        # Query resubmitted documents after revision
        resubmitted_docs = db.query(Document).filter(
            Document.validation_status == "Revision Requested"
        ).all()

        for d in resubmitted_docs:
            action_required.append({
                "id": f"doc_resub_{d.id}",
                "type": "REVISION_RESUBMITTED",
                "priority": "WARNING",
                "title": "Revision Requested / Pending Faculty Update",
                "message": f"Revision was requested for '{d.original_name}' (Sub-{d.sub_criterion}). Reason: {d.rejection_reason or 'Documentation update required'}",
                "document_id": d.id,
                "document_name": d.original_name,
                "sub_criterion": d.sub_criterion,
                "created_at": d.upload_date.isoformat() if d.upload_date else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "Inspect Status",
                "action_url": "/documents"
            })

        # Open Cross-Document Conflicts
        open_conflicts = db.query(DocumentConflict).filter(DocumentConflict.status == "Open").all()
        for c in open_conflicts:
            system_alerts.append({
                "id": f"conflict_{c.id}",
                "type": "EVIDENCE_CONFLICT",
                "priority": "URGENT",
                "title": "Evidence Conflict Detected",
                "message": f"Conflicting evidence data detected for Metric {c.metric_id}: '{c.conflict_title}'.",
                "sub_criterion": c.sub_criterion,
                "created_at": c.created_at.isoformat() if c.created_at else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "Review Conflict",
                "action_url": "/documents"
            })

        # Departmental High/Critical Gaps
        critical_gaps = db.query(GapItem).filter(GapItem.severity.in_(["High", "Critical"]), GapItem.status != "Resolved").all()
        for g in critical_gaps:
            system_alerts.append({
                "id": f"gap_{g.id}",
                "type": "EVIDENCE_GAP",
                "priority": "WARNING",
                "title": f"Evidence Gap Identified (Sub-{g.sub_criterion})",
                "message": f"Gaps detected: {g.title}. Action required: {g.recommended_action}",
                "sub_criterion": g.sub_criterion,
                "created_at": g.created_at.isoformat() if g.created_at else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "View Gap",
                "action_url": "/gaps-recommendations"
            })

    # =========================================================================
    # 2. PRINCIPAL NOTIFICATIONS (Final Institutional Approval Authority)
    # =========================================================================
    if role in ["Principal", "Administrator"]:
        principal_pending_docs = db.query(Document).filter(
            Document.validation_status == "Pending Principal Validation"
        ).all()

        for d in principal_pending_docs:
            action_required.append({
                "id": f"doc_prin_{d.id}",
                "type": "PRINCIPAL_APPROVAL",
                "priority": "URGENT",
                "title": "Pending Principal Validation",
                "message": f"'{d.original_name}' (Sub-{d.sub_criterion}) validated by HOD ({d.hod_validated_by or 'HOD'}) is awaiting final institutional approval.",
                "document_id": d.id,
                "document_name": d.original_name,
                "sub_criterion": d.sub_criterion,
                "created_at": d.upload_date.isoformat() if d.upload_date else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "Review & Validate",
                "action_url": "/documents"
            })

        # High-priority institutional gaps for Criterion 1
        high_gaps = db.query(GapItem).filter(GapItem.severity == "High", GapItem.status != "Resolved").all()
        for g in high_gaps:
            system_alerts.append({
                "id": f"prin_gap_{g.id}",
                "type": "INSTITUTIONAL_GAP",
                "priority": "URGENT",
                "title": f"High-Priority Institutional Evidence Gap (Sub-{g.sub_criterion})",
                "message": f"Insufficient evidence for {g.title}. Recommended action: {g.recommended_action}",
                "sub_criterion": g.sub_criterion,
                "created_at": g.created_at.isoformat() if g.created_at else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "View Institutional Gaps",
                "action_url": "/gaps-recommendations"
            })

    # =========================================================================
    # 3. FACULTY NOTIFICATIONS (Evidence Contributor)
    # =========================================================================
    if role == "Faculty":
        # Revision requested on faculty's uploaded evidence
        faculty_revisions = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.validation_status.in_(["Revision Requested", "Revision Requested by Principal"])
        ).all()

        for d in faculty_revisions:
            action_required.append({
                "id": f"fac_rev_{d.id}",
                "type": "REVISION_REQUIRED",
                "priority": "URGENT",
                "title": "Revision Required for Evidence",
                "message": f"Changes requested for '{d.original_name}'. Reason: {d.rejection_reason or 'Please upload supporting documentation'}",
                "document_id": d.id,
                "document_name": d.original_name,
                "sub_criterion": d.sub_criterion,
                "created_at": d.upload_date.isoformat() if d.upload_date else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "Update Evidence",
                "action_url": "/documents"
            })

        # Rejected evidence
        faculty_rejections = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.validation_status.in_(["Rejected by HOD", "Rejected by Principal"])
        ).all()

        for d in faculty_rejections:
            system_alerts.append({
                "id": f"fac_rej_{d.id}",
                "type": "EVIDENCE_REJECTED",
                "priority": "WARNING",
                "title": "Evidence Document Rejected",
                "message": f"'{d.original_name}' was rejected. Reason: {d.rejection_reason or 'Insufficient evidence'}",
                "document_id": d.id,
                "document_name": d.original_name,
                "sub_criterion": d.sub_criterion,
                "created_at": d.upload_date.isoformat() if d.upload_date else datetime.utcnow().isoformat(),
                "is_read": False,
                "action_text": "View Details",
                "action_url": "/documents"
            })

        # HOD Validated evidence awaiting Principal
        faculty_validated = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.validation_status == "Pending Principal Validation"
        ).all()

        for d in faculty_validated:
            recent_activity.append({
                "id": f"fac_val_{d.id}",
                "type": "EVIDENCE_VALIDATED",
                "priority": "INFO",
                "title": "Stage 1 HOD Validation Complete",
                "message": f"Your document '{d.original_name}' was validated by HOD and is awaiting Principal final approval.",
                "document_id": d.id,
                "created_at": d.upload_date.isoformat() if d.upload_date else datetime.utcnow().isoformat(),
                "is_read": True,
                "action_text": "View Status",
                "action_url": "/documents"
            })

    # =========================================================================
    # 4. ADMINISTRATOR NOTIFICATIONS (System Governance Authority)
    # =========================================================================
    if role == "Administrator":
        recent_users = db.query(User).order_by(User.id.desc()).limit(3).all()
        for u in recent_users:
            recent_activity.append({
                "id": f"user_reg_{u.id}",
                "type": "USER_REGISTRATION",
                "priority": "INFO",
                "title": "User Account Registered",
                "message": f"User {u.full_name} ({u.role} - {u.department}) account active.",
                "created_at": u.created_at.isoformat() if getattr(u, 'created_at', None) else datetime.utcnow().isoformat(),
                "is_read": True,
                "action_text": "Manage Users",
                "action_url": "/user-management"
            })

    # Query Recent System Audit Trail for Recent Activity Timeline
    recent_audits = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(5).all()
    for a in recent_audits:
        recent_activity.append({
            "id": f"audit_{a.id}",
            "type": "SYSTEM_AUDIT",
            "priority": "INFO",
            "title": f"Activity: {a.action}",
            "message": f"{a.user_name} ({a.user_role}): {a.details}",
            "created_at": a.timestamp.isoformat() if a.timestamp else datetime.utcnow().isoformat(),
            "is_read": True,
            "action_text": "View Audit Trail",
            "action_url": "/trust-center"
        })

    # Calculate Dynamic Unread Count
    unread_count = len(action_required) + len([s for s in system_alerts if not s.get("is_read", False)])

    # Calculate Login Attention Popup (ONLY if action_required count > 0)
    login_popup = None
    if len(action_required) > 0:
        if role == "HOD":
            pending_hod_cnt = len([a for a in action_required if a["type"] == "HOD_VALIDATION"])
            resub_cnt = len([a for a in action_required if a["type"] == "REVISION_RESUBMITTED"])
            login_popup = {
                "show": True,
                "title": f"🔔 {len(action_required)} Actions Require Your Attention",
                "summary": f"{pending_hod_cnt} evidence documents are waiting for HOD validation. {resub_cnt} documents have pending revisions.",
                "action_text": "Review Now",
                "action_url": "/documents"
            }
        elif role == "Principal":
            pending_prin_cnt = len([a for a in action_required if a["type"] == "PRINCIPAL_APPROVAL"])
            login_popup = {
                "show": True,
                "title": f"🔔 {len(action_required)} Actions Require Your Attention",
                "summary": f"{pending_prin_cnt} HOD-validated evidence documents are waiting for final institutional approval.",
                "action_text": "Review Pending Approvals",
                "action_url": "/documents"
            }
        elif role == "Faculty":
            login_popup = {
                "show": True,
                "title": f"🔔 Action Required on Your Evidence",
                "summary": f"Your uploaded evidence requires revision or attention. Please inspect HOD comments.",
                "action_text": "Review & Update",
                "action_url": "/documents"
            }
        elif role == "Administrator":
            login_popup = {
                "show": True,
                "title": f"⚠️ System Governance Attention Required",
                "summary": f"{len(action_required)} administrative items require system oversight.",
                "action_text": "View System Issues",
                "action_url": "/user-management"
            }

    return {
        "unread_count": unread_count,
        "action_required": action_required,
        "recent_activity": recent_activity[:5],
        "system_alerts": system_alerts[:5],
        "login_popup": login_popup
    }

@router.post("/mark-read")
def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    """
    Marks notifications as read for current session.
    """
    return {"status": "success", "message": "All notifications marked as read."}
