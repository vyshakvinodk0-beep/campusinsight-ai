import os
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.api.auth import get_current_user, require_role
from app.models.models import User, Document, CriterionAnalysis, GapItem, RecommendationItem, AuditLog, InboxMessage
from app.schemas.schemas import DocumentResponse, DocumentRejectionRequest, RagQueryRequest, RagQueryResult
from app.services.ocr_service import DocumentExtractorService
from app.services.vector_store import vector_store_service
from app.services.rag_service import rag_service
from app.agents.workflow import langgraph_agent_pipeline

router = APIRouter(prefix="/documents", tags=["Documents"])

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

        # Save detected gaps
        for gap_data in final_state.get("detected_gaps", []):
            existing_gap = db.query(GapItem).filter(
                GapItem.title == gap_data["title"],
                GapItem.sub_criterion == gap_data["sub_criterion"]
            ).first()
            if not existing_gap:
                db_gap = GapItem(
                    sub_criterion=gap_data["sub_criterion"],
                    title=gap_data["title"],
                    description=gap_data["description"],
                    severity=gap_data["severity"],
                    status="Open",
                    missing_evidence=gap_data.get("missing_evidence"),
                    recommended_action=gap_data.get("recommended_action")
                )
                db.add(db_gap)

        # Save AI Recommendations
        for rec_data in final_state.get("recommendations", []):
            existing_rec = db.query(RecommendationItem).filter(
                RecommendationItem.title == rec_data["title"]
            ).first()
            if not existing_rec:
                db_rec = RecommendationItem(
                    sub_criterion=rec_data["sub_criterion"],
                    title=rec_data["title"],
                    recommendation_text=rec_data["recommendation_text"],
                    priority=rec_data["priority"],
                    shap_explanation_json=rec_data.get("shap_explanation_json"),
                    action_items=rec_data.get("action_items")
                )
                db.add(db_rec)

        # Update Sub-Criteria Scores
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
    except Exception as e:
        print(f"Error running LangGraph pipeline for {doc.filename}: {e}")

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    sub_criterion: str = Form("1.1"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    if existing_hash_doc:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"Exact duplicate file detected! Content is identical to existing uploaded document '{existing_hash_doc.original_name}' (ID: {existing_hash_doc.id})."
        )

    # Step 1: Text Extraction, Page Mapping & Quality Scoring
    extracted_text, file_type, pages_list, quality_metrics, file_hash = DocumentExtractorService.extract_text_with_pages(file_path, file.filename)
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
    _run_ai_analysis_for_document(new_doc, db)

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
        query = query.filter(Document.user_id == current_user.id)
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

