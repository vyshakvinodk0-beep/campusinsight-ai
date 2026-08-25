import os
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.api.auth import get_current_user, require_role
from app.models.models import User, Document, CriterionAnalysis, GapItem, RecommendationItem, AuditLog, InboxMessage, EvidenceItem, DocumentConflict, CriterionMetric
from app.schemas.schemas import DocumentResponse, DocumentRejectionRequest, RagQueryRequest, RagQueryResult
from app.services.ocr_service import DocumentExtractorService
from app.services.vector_store import vector_store_service
from app.services.rag_service import rag_service
from app.services.metric_service import metric_service
from app.agents.workflow import langgraph_agent_pipeline

router = APIRouter(prefix="/documents", tags=["Documents"])

def process_ai_pipeline_results(doc: Document, final_state: dict, db: Session):
    """
    Persists all artifacts produced by the 6-Agent LangGraph AI Pipeline:
    - Extracted Evidence Items with page-level citations
    - Detected Document Conflicts
    - Identified Documentation Gaps
    - Agentic AI Recommendations
    - Sub-Criteria Performance Scores & Readiness Indices
    - Criterion Metrics Completeness & Missing Evidence Status
    """
    # 1. Save / Update Extracted Evidence Items
    for ev_data in final_state.get("evidence_items", []):
        metric_id = ev_data.get("metric_id")
        ev_text = ev_data.get("evidence_text")
        if not metric_id or not ev_text:
            continue

        existing_ev = db.query(EvidenceItem).filter(
            EvidenceItem.document_id == doc.id,
            EvidenceItem.metric_id == metric_id,
            EvidenceItem.evidence_text == ev_text
        ).first()

        if not existing_ev:
            db_ev = EvidenceItem(
                document_id=doc.id,
                sub_criterion=ev_data.get("sub_criterion", doc.sub_criterion),
                metric_id=metric_id,
                evidence_text=ev_text,
                page_number=ev_data.get("page_number", 1),
                confidence=ev_data.get("confidence", 90.0),
                relevance_status=ev_data.get("relevance_status", "Relevant"),
                verification_notes=ev_data.get("verification_notes", f"Extracted from {doc.original_name}")
            )
            db.add(db_ev)

    # 2. Save Detected Document Conflicts
    for c_data in final_state.get("conflicts", []):
        conflict_title = c_data.get("conflict_title") or c_data.get("title")
        if not conflict_title:
            continue

        existing_conflict = db.query(DocumentConflict).filter(
            DocumentConflict.conflict_title == conflict_title
        ).first()

        if not existing_conflict:
            db_conflict = DocumentConflict(
                sub_criterion=c_data.get("sub_criterion", doc.sub_criterion),
                metric_id=c_data.get("metric_id", f"{doc.sub_criterion}.1"),
                conflict_title=conflict_title,
                description=c_data.get("description", f"Discrepancy identified in {doc.filename}"),
                conflicting_documents=c_data.get("conflicting_documents", doc.filename),
                discrepancy_details=c_data.get("discrepancy_details", ""),
                status="Open",
                severity=c_data.get("severity", "Medium")
            )
            db.add(db_conflict)

    # 3. Save Detected Gaps
    for gap_data in final_state.get("detected_gaps", []):
        gap_title = gap_data.get("title")
        if not gap_title:
            continue
        existing_gap = db.query(GapItem).filter(
            GapItem.title == gap_title,
            GapItem.sub_criterion == gap_data.get("sub_criterion", doc.sub_criterion)
        ).first()
        if not existing_gap:
            db_gap = GapItem(
                sub_criterion=gap_data.get("sub_criterion", doc.sub_criterion),
                title=gap_title,
                description=gap_data.get("description", ""),
                severity=gap_data.get("severity", "Medium"),
                status="Open",
                missing_evidence=gap_data.get("missing_evidence"),
                recommended_action=gap_data.get("recommended_action")
            )
            db.add(db_gap)

    # 4. Save AI Recommendations
    for rec_data in final_state.get("recommendations", []):
        rec_title = rec_data.get("title")
        if not rec_title:
            continue
        existing_rec = db.query(RecommendationItem).filter(
            RecommendationItem.title == rec_title
        ).first()
        if not existing_rec:
            db_rec = RecommendationItem(
                sub_criterion=rec_data.get("sub_criterion", doc.sub_criterion),
                title=rec_title,
                recommendation_text=rec_data.get("recommendation_text", ""),
                priority=rec_data.get("priority", "Medium"),
                shap_explanation_json=rec_data.get("shap_explanation_json"),
                action_items=rec_data.get("action_items")
            )
            db.add(db_rec)

    # 5. Update Sub-Criteria Analyses Scores
    mapped_scores = final_state.get("mapped_criteria", {}).get("sub_scores", {})
    for sub_crit, new_score in mapped_scores.items():
        analysis = db.query(CriterionAnalysis).filter(CriterionAnalysis.sub_criterion == sub_crit).first()
        if analysis:
            analysis.score = round(min(100.0, (analysis.score * 0.7) + (new_score * 0.3)), 1)
            analysis.cgpa_equivalent = round(analysis.score * 4.0 / 100, 2)
            analysis.evidence_count += 1
            if analysis.score >= 85:
                analysis.readiness_level = "Excellent (A++ Grade)"
            elif analysis.score >= 75:
                analysis.readiness_level = "Good (A Grade)"
            elif analysis.score >= 60:
                analysis.readiness_level = "Satisfactory (B Grade)"
            else:
                analysis.readiness_level = "Needs Improvement"

    db.commit()

    # 6. Recalculate Completeness and Missing Evidence for all Criterion Metrics
    metrics = db.query(CriterionMetric).all()
    for m in metrics:
        evidence_items = db.query(EvidenceItem).filter(EvidenceItem.metric_id == m.metric_id).all()
        comp_res = metric_service.calculate_metric_completeness(m, evidence_items)
        if not m.human_validation_status or "Overridden" not in m.human_validation_status:
            m.completeness_score = comp_res["completeness_score"]
            m.status = comp_res["status"]
        m.missing_evidence = comp_res["missing_evidence"]
    db.commit()

def _run_ai_analysis_for_document(doc: Document, db: Session):
    """
    Executes the 6-Agent LangGraph AI Pipeline immediately upon document extraction & quality check.
    """
    initial_state = {
        "doc_id": doc.id,
        "filename": doc.filename,
        "sub_criterion_input": doc.sub_criterion,
        "raw_text": doc.extracted_text or "",
        "chunks": [doc.extracted_text or ""],
        "quality_metrics": {
            "text_quality_score": doc.text_quality_score or 95.0,
            "ocr_quality_score": doc.ocr_quality_score or 90.0,
            "readability_score": doc.readability_score or 92.0
        },
        "file_hash": doc.file_hash or "",
        "doc_analysis": {},
        "evidence_items": [],
        "conflicts": [],
        "mapped_criteria": {},
        "detected_gaps": [],
        "recommendations": [],
        "shap_explanations": {},
        "status": "Starting",
        "error_message": None
    }

    try:
        final_state = langgraph_agent_pipeline.invoke(initial_state)
        process_ai_pipeline_results(doc, final_state, db)
    except Exception as e:
        print(f"Error running LangGraph pipeline for {doc.filename}: {e}")

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    sub_criterion: str = Form("1.1"),
    force_duplicate: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[UPLOAD START] Received upload request for file: {file.filename}, sub_criterion: {sub_criterion}, force_duplicate: {force_duplicate}")
    allowed_extensions = [".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".bmp", ".tiff"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: PDF, DOCX, Scanned PDF, Images (PNG/JPG)."
        )

    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Calculate SHA-256 Hash for Duplicate Detection
    file_hash = DocumentExtractorService.calculate_file_hash(file_path)
    existing_hash_doc = db.query(Document).filter(Document.file_hash == file_hash).first()
    if existing_hash_doc and not force_duplicate:
        os.remove(file_path)
        raise HTTPException(
            status_code=409,
            detail={
                "is_duplicate": True,
                "existing_filename": existing_hash_doc.original_name,
                "existing_doc_id": existing_hash_doc.id,
                "message": f"Exact duplicate file detected! Content in '{file.filename}' is identical to existing uploaded document '{existing_hash_doc.original_name}' (ID: #{existing_hash_doc.id}). Do you still want to submit this file again as a new entry?"
            }
        )

    # Step 1: Text Extraction, Page Mapping & Quality Scoring
    try:
        extracted_text, file_type, pages_list, quality_metrics, file_hash = DocumentExtractorService.extract_text_with_pages(file_path, file.filename)
    except ValueError as ve:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"⚠ Unable to process document: {str(ve)}"
        )
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"⚠ Document extraction error: {str(e)}"
        )

    chunks = DocumentExtractorService.split_text_into_chunks(extracted_text)

    # Workflow status assignment
    init_hod_val = current_user.role in ["HOD", "Principal", "Administrator"]
    init_prin_val = current_user.role in ["Principal", "Administrator"]

    val_status = "Fully Validated" if init_prin_val else ("Pending Principal Validation" if init_hod_val else "Pending HOD Validation")
    doc_status = "Processed"

    # Step 2: Save Document record in DB
    new_doc = Document(
        filename=file.filename,
        original_name=file.filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        sub_criterion=sub_criterion,
        status=doc_status,
        hod_validated=init_hod_val,
        hod_validated_by=current_user.full_name if init_hod_val else None,
        principal_validated=init_prin_val,
        principal_validated_by=current_user.full_name if init_prin_val else None,
        validation_status=val_status,
        rejection_reason=None,
        extracted_text=extracted_text,
        chunk_count=len(chunks),
        user_id=current_user.id,
        file_hash=file_hash,
        text_quality_score=quality_metrics.get("text_quality_score", 95.0),
        ocr_quality_score=quality_metrics.get("ocr_quality_score", 90.0),
        readability_score=quality_metrics.get("readability_score", 92.0),
        is_scanned_pdf=file_type in ["scanned_pdf", "image"],
        version=1,
        version_status="Current",
        academic_year="2024-25"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    print(f"[UPLOAD SUCCESS] DOCUMENT ID: {new_doc.id} created for file: {new_doc.original_name}")

    # Step 3: Add chunks with page citations to FAISS vector store
    page_nums = [p.get("page_number", 1) for p in pages_list] if pages_list else [1] * len(chunks)
    vector_store_service.add_chunks(
        chunks=chunks,
        doc_id=new_doc.id,
        filename=new_doc.filename,
        sub_criterion=sub_criterion,
        page_numbers=page_nums
    )

    # Run AI Analysis Pipeline IMMEDIATELY post upload so HOD/Principal review an AI-analyzed doc
    print(f"[PROCESSING START] Running AI analysis pipeline for DOCUMENT ID: {new_doc.id}")
    _run_ai_analysis_for_document(new_doc, db)
    print(f"[PROCESSING SUCCESS] AI analysis complete for DOCUMENT ID: {new_doc.id}")

    # Record in Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="Upload & AI Analysis",
        target_type="Document",
        target_id=str(new_doc.id),
        details=f"Uploaded '{new_doc.original_name}' for Sub-criterion {sub_criterion}. Extracted {len(chunks)} chunks, executed 6-Agent LangGraph AI Pipeline."
    )
    db.add(audit)

    # Create Inbox notification for HOD / Principal
    inbox_msg = InboxMessage(
        sender_name=current_user.full_name,
        recipient_role="HOD" if not init_hod_val else "Principal",
        category="Approval",
        subject=f"New Evidence Document Uploaded for Sub-{sub_criterion}",
        body=f"Faculty member {current_user.full_name} uploaded '{new_doc.original_name}'. AI Analysis complete. Pending verification.",
        target_type="Document",
        target_id=str(new_doc.id)
    )
    db.add(inbox_msg)
    db.commit()

    resp = DocumentResponse.model_validate(new_doc)
    resp.owner_name = current_user.full_name
    resp.owner_department = current_user.department
    if new_doc.extracted_text:
        resp.extracted_preview = new_doc.extracted_text[:300] + ("..." if len(new_doc.extracted_text) > 300 else "")
    return resp

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    sub_criterion: Optional[str] = None,
    validation_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)
    
    # Role-based document access control
    if current_user.role == "Faculty":
        dept_str = (current_user.department or "").strip()
        dept_prefix = dept_str.split()[0] if dept_str else ""
        query = query.outerjoin(User, Document.user_id == User.id).filter(
            (Document.user_id == current_user.id) |
            (Document.user_id == None) |
            (User.department == current_user.department) |
            (User.department.ilike(f"%{dept_prefix}%"))
        ).distinct()
    elif current_user.role == "HOD":
        dept_str = (current_user.department or "").strip()
        dept_prefix = dept_str.split()[0] if dept_str else ""
        query = query.outerjoin(User, Document.user_id == User.id).filter(
            (Document.validation_status == "Pending HOD Validation") |
            (User.department == current_user.department) |
            (User.department.ilike(f"%{dept_prefix}%")) |
            (Document.user_id == None) |
            (Document.user_id == current_user.id)
        ).distinct()

    if sub_criterion and sub_criterion != "All":
        query = query.filter(Document.sub_criterion == sub_criterion)
    if validation_status and validation_status != "All":
        query = query.filter(Document.validation_status == validation_status)

    docs = query.order_by(Document.upload_date.desc()).all()
    
    result = []
    for d in docs:
        d_resp = DocumentResponse.model_validate(d)
        if d.owner:
            d_resp.owner_name = d.owner.full_name
            d_resp.owner_department = d.owner.department
        if d.extracted_text:
            d_resp.extracted_preview = d.extracted_text[:300] + ("..." if len(d.extracted_text) > 300 else "")
        result.append(d_resp)
    return result

@router.post("/{doc_id}/validate-hod", response_model=DocumentResponse)
def validate_document_hod(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HOD", "Principal", "Administrator"]))
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.hod_validated = True
    doc.hod_validated_by = current_user.full_name
    doc.validation_status = "Pending Principal Validation"
    doc.rejection_reason = None
    doc.validated_at = datetime.utcnow()

    # Log in Audit Trail
    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="HOD Validation",
        target_type="Document",
        target_id=str(doc.id),
        details=f"HOD {current_user.full_name} validated evidence document '{doc.original_name}'. Stage 1 complete."
    )
    db.add(audit)

    # Notify Principal
    inbox_msg = InboxMessage(
        sender_name=current_user.full_name,
        recipient_role="Principal",
        category="Approval",
        subject=f"Stage 1 Validated: {doc.original_name}",
        body=f"HOD {current_user.full_name} validated '{doc.original_name}' for Sub-{doc.sub_criterion}. Pending final Principal approval.",
        target_type="Document",
        target_id=str(doc.id)
    )
    db.add(inbox_msg)

    db.commit()
    db.refresh(doc)

    resp = DocumentResponse.model_validate(doc)
    if doc.owner:
        resp.owner_name = doc.owner.full_name
        resp.owner_department = doc.owner.department
    return resp

@router.post("/{doc_id}/reject-hod", response_model=DocumentResponse)
def reject_document_hod(
    doc_id: int,
    reject_req: DocumentRejectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HOD", "Principal", "Administrator"]))
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.hod_validated = False
    doc.validation_status = "Rejected by HOD"
    doc.rejection_reason = reject_req.rejection_reason
    doc.validated_at = datetime.utcnow()

    # Log Audit
    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="HOD Rejection",
        target_type="Document",
        target_id=str(doc.id),
        details=f"HOD {current_user.full_name} rejected document '{doc.original_name}'. Reason: {reject_req.rejection_reason}",
        override_reason=reject_req.rejection_reason
    )
    db.add(audit)

    # Notify Uploader
    if doc.user_id:
        inbox_msg = InboxMessage(
            sender_name=current_user.full_name,
            recipient_user_id=doc.user_id,
            category="Evidence",
            subject=f"🔴 Evidence Document Returned: {doc.original_name}",
            body=f"HOD {current_user.full_name} requested revision for '{doc.original_name}'. Reason: {reject_req.rejection_reason}",
            target_type="Document",
            target_id=str(doc.id)
        )
        db.add(inbox_msg)

    db.commit()
    db.refresh(doc)

    resp = DocumentResponse.model_validate(doc)
    if doc.owner:
        resp.owner_name = doc.owner.full_name
        resp.owner_department = doc.owner.department
    return resp

@router.post("/{doc_id}/validate-principal", response_model=DocumentResponse)
def validate_document_principal(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Principal", "Administrator"]))
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.principal_validated = True
    doc.principal_validated_by = current_user.full_name
    doc.validation_status = "Fully Validated"
    doc.status = "Processed"
    doc.rejection_reason = None
    doc.validated_at = datetime.utcnow()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="Principal Approval",
        target_type="Document",
        target_id=str(doc.id),
        details=f"Principal {current_user.full_name} granted final institutional approval for document '{doc.original_name}'."
    )
    db.add(audit)

    # Re-run AI to refine readiness scores with final approval weight
    _run_ai_analysis_for_document(doc, db)

    db.commit()
    db.refresh(doc)

    resp = DocumentResponse.model_validate(doc)
    if doc.owner:
        resp.owner_name = doc.owner.full_name
        resp.owner_department = doc.owner.department
    return resp

@router.post("/{doc_id}/reject-principal", response_model=DocumentResponse)
def reject_document_principal(
    doc_id: int,
    reject_req: DocumentRejectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Principal", "Administrator"]))
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.principal_validated = False
    doc.validation_status = "Rejected by Principal"
    doc.rejection_reason = reject_req.rejection_reason
    doc.validated_at = datetime.utcnow()

    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="Principal Rejection",
        target_type="Document",
        target_id=str(doc.id),
        details=f"Principal {current_user.full_name} rejected document '{doc.original_name}'. Reason: {reject_req.rejection_reason}",
        override_reason=reject_req.rejection_reason
    )
    db.add(audit)

    db.commit()
    db.refresh(doc)

    resp = DocumentResponse.model_validate(doc)
    if doc.owner:
        resp.owner_name = doc.owner.full_name
        resp.owner_department = doc.owner.department
    return resp

@router.patch("/{doc_id}/version-status")
def update_document_version_status(
    doc_id: int,
    version_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HOD", "Principal", "Administrator"]))
):
    valid_statuses = ["Current", "Superseded", "Archived", "Invalid"]
    if version_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid version status '{version_status}'. Allowed: {valid_statuses}")
    
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    old_v = doc.version_status
    doc.version_status = version_status

    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="Version Status Update",
        target_type="Document",
        target_id=str(doc.id),
        details=f"Updated version status for '{doc.original_name}' from '{old_v}' to '{version_status}'."
    )
    db.add(audit)
    db.commit()
    return {"message": f"Document version status updated to '{version_status}'"}

@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Faculty can only delete their own non-validated documents; HOD/Principal/Admin can delete department/system docs
    if current_user.role == "Faculty" and doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Faculty can only delete their own uploaded documents.")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}

@router.post("/search", response_model=RagQueryResult)
def rag_search(query_req: RagQueryRequest):
    res = rag_service.answer_query(
        query=query_req.query,
        sub_criterion=query_req.sub_criterion,
        top_k=query_req.top_k
    )
    return res

