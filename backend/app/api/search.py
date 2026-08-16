from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, Document, CriterionMetric, EvidenceItem, GapItem, RecommendationItem, AuditLog, InboxMessage

router = APIRouter(prefix="/search", tags=["Global Search"])

@router.get("/global")
def global_search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    search_term = f"%{q}%"

    # Search Documents
    docs = db.query(Document).filter(
        (Document.filename.ilike(search_term)) |
        (Document.original_name.ilike(search_term)) |
        (Document.extracted_text.ilike(search_term))
    ).limit(5).all()

    # Search Metrics
    metrics = db.query(CriterionMetric).filter(
        (CriterionMetric.metric_id.ilike(search_term)) |
        (CriterionMetric.name.ilike(search_term)) |
        (CriterionMetric.description.ilike(search_term))
    ).limit(5).all()

    # Search Evidence Items
    evidence = db.query(EvidenceItem).filter(
        (EvidenceItem.evidence_text.ilike(search_term)) |
        (EvidenceItem.verification_notes.ilike(search_term))
    ).limit(5).all()

    # Search Gaps
    gaps = db.query(GapItem).filter(
        (GapItem.title.ilike(search_term)) |
        (GapItem.description.ilike(search_term)) |
        (GapItem.recommended_action.ilike(search_term))
    ).limit(5).all()

    # Search Recommendations
    recs = db.query(RecommendationItem).filter(
        (RecommendationItem.title.ilike(search_term)) |
        (RecommendationItem.recommendation_text.ilike(search_term))
    ).limit(5).all()

    # Search Audit Logs
    audits = db.query(AuditLog).filter(
        (AuditLog.details.ilike(search_term)) |
        (AuditLog.action.ilike(search_term)) |
        (AuditLog.user_name.ilike(search_term))
    ).limit(5).all()

    return {
        "query": q,
        "results": {
            "documents": [
                {
                    "id": d.id,
                    "title": d.original_name or d.filename,
                    "sub_criterion": d.sub_criterion,
                    "type": d.file_type,
                    "status": d.validation_status
                } for d in docs
            ],
            "metrics": [
                {
                    "id": m.id,
                    "metric_id": m.metric_id,
                    "name": m.name,
                    "sub_criterion": m.sub_criterion,
                    "status": m.status
                } for m in metrics
            ],
            "evidence": [
                {
                    "id": e.id,
                    "metric_id": e.metric_id,
                    "page_number": e.page_number,
                    "snippet": e.evidence_text[:120] + "..." if len(e.evidence_text) > 120 else e.evidence_text
                } for e in evidence
            ],
            "gaps": [
                {
                    "id": g.id,
                    "title": g.title,
                    "sub_criterion": g.sub_criterion,
                    "severity": g.severity,
                    "status": g.status
                } for g in gaps
            ],
            "recommendations": [
                {
                    "id": r.id,
                    "title": r.title,
                    "sub_criterion": r.sub_criterion,
                    "priority": r.priority
                } for r in recs
            ],
            "audit_logs": [
                {
                    "id": a.id,
                    "action": a.action,
                    "user_name": a.user_name,
                    "details": a.details
                } for a in audits
            ]
        }
    }
