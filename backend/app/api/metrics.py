from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, CriterionMetric, EvidenceItem, Document, AuditLog
from app.services.metric_service import metric_service
from pydantic import BaseModel

router = APIRouter(prefix="/metrics", tags=["Criterion 1 Metrics"])

class MetricOverrideRequest(BaseModel):
    new_status: str # Complete, Partial, Missing
    override_reason: str

@router.get("/matrix")
def get_evidence_matrix(sub_criterion: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns the complete Evidence Matrix for NAAC Criterion 1 (1.1.1 - 1.4.2).
    Includes Required vs Available evidence, Completeness %, Status, and AI Confidence.
    """
    query = db.query(CriterionMetric)
    if sub_criterion and sub_criterion != "All":
        query = query.filter(CriterionMetric.sub_criterion == sub_criterion)
    
    metrics = query.order_by(CriterionMetric.metric_id.asc()).all()

    matrix_rows = []
    for m in metrics:
        evidence_items = db.query(EvidenceItem).filter(EvidenceItem.metric_id == m.metric_id).all()
        comp_res = metric_service.calculate_metric_completeness(m, evidence_items)

        # Update metric completeness in DB if changed
        if m.completeness_score != comp_res["completeness_score"] or m.status != comp_res["status"]:
            m.completeness_score = comp_res["completeness_score"]
            m.status = comp_res["status"]
            db.commit()

        matrix_rows.append({
            "id": m.id,
            "metric_id": m.metric_id,
            "sub_criterion": m.sub_criterion,
            "name": m.name,
            "description": m.description,
            "required_evidence": m.required_evidence or [],
            "optional_evidence": m.optional_evidence or [],
            "expected_doc_types": m.expected_doc_types or [],
            "completeness_score": m.completeness_score,
            "relevance_score": m.relevance_score,
            "status": m.status,
            "ai_confidence": m.ai_confidence,
            "human_validation_status": m.human_validation_status,
            "available_evidence_count": len(evidence_items),
            "missing_evidence": m.missing_evidence or comp_res["missing_evidence"],
            "override_reason": m.override_reason
        })

    return matrix_rows

@router.get("/{metric_id}")
def get_metric_detail(metric_id: str, db: Session = Depends(get_db)):
    """
    Returns granular metric view with extracted page-level evidence citations,
    source documents, missing evidence list, and AI analysis.
    """
    metric = db.query(CriterionMetric).filter(CriterionMetric.metric_id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail=f"Metric ID '{metric_id}' not found")

    evidence_items = db.query(EvidenceItem).filter(EvidenceItem.metric_id == metric_id).all()
    
    citations = []
    for ev in evidence_items:
        doc = db.query(Document).filter(Document.id == ev.document_id).first()
        citations.append({
            "id": ev.id,
            "document_id": ev.document_id,
            "document_name": doc.original_name if doc else "Document",
            "filename": doc.filename if doc else "document.pdf",
            "page_number": ev.page_number,
            "evidence_text": ev.evidence_text,
            "confidence": ev.confidence,
            "relevance_status": ev.relevance_status,
            "verification_notes": ev.verification_notes
        })

    comp_res = metric_service.calculate_metric_completeness(metric, evidence_items)

    return {
        "metric": metric,
        "completeness_analysis": comp_res,
        "evidence_citations": citations
    }

@router.post("/missing-evidence")
def find_missing_evidence(db: Session = Depends(get_db)):
    """
    Find Missing Evidence Scanner:
    Scans all Criterion 1 metrics and returns prioritized missing evidence items with assigned roles.
    """
    return metric_service.find_missing_evidence_checklist(db)

@router.post("/{metric_id}/override")
def override_metric_status(
    metric_id: str,
    override_req: MetricOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Human-in-the-Loop Override:
    Allows Faculty/HOD/Principal to override AI metric status with mandatory reason logging in AuditLog.
    """
    if current_user.role not in ["HOD", "Principal", "Administrator"]:
        raise HTTPException(status_code=403, detail="Only HOD, Principal, or Admin can override metric validation status.")

    metric = db.query(CriterionMetric).filter(CriterionMetric.metric_id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail=f"Metric ID '{metric_id}' not found")

    old_status = metric.status
    metric.status = override_req.new_status
    metric.override_reason = override_req.override_reason
    metric.human_validation_status = f"{current_user.role} Overridden"

    if override_req.new_status == "Complete":
        metric.completeness_score = 100.0

    # Record in Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="Human Override",
        target_type="Metric",
        target_id=metric_id,
        details=f"Overrode status for Metric {metric_id} from '{old_status}' to '{override_req.new_status}'.",
        override_reason=override_req.override_reason
    )
    db.add(audit)
    db.commit()
    db.refresh(metric)

    return {
        "message": f"Metric {metric_id} status updated to {metric.status}",
        "metric": metric
    }
