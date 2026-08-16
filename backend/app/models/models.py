from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="Faculty") # Faculty, HOD, Principal, Administrator
    department = Column(String, default="Computer Science & Engineering")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="owner")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # pdf, docx, image, scanned_pdf
    file_size = Column(Integer, default=0)
    sub_criterion = Column(String, default="General") # 1.1, 1.2, 1.3, 1.4, General
    status = Column(String, default="Uploaded") # Uploaded, Processed, Failed
    hod_validated = Column(Boolean, default=False)
    hod_validated_by = Column(String, nullable=True)
    principal_validated = Column(Boolean, default=False)
    principal_validated_by = Column(String, nullable=True)
    validation_status = Column(String, default="Pending HOD Validation") # Pending HOD Validation, Pending Principal Validation, Fully Validated, Rejected by HOD, Rejected by Principal
    rejection_reason = Column(Text, nullable=True)
    validated_at = Column(DateTime, nullable=True)
    extracted_text = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)
    
    # Document Quality & Metadata Attributes
    file_hash = Column(String, nullable=True, index=True)
    text_quality_score = Column(Float, default=95.0)
    ocr_quality_score = Column(Float, default=90.0)
    readability_score = Column(Float, default=92.0)
    is_scanned_pdf = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    version_status = Column(String, default="Current") # Current, Superseded, Archived, Invalid
    academic_year = Column(String, default="2024-25")

    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="documents")

class CriterionMetric(Base):
    __tablename__ = "criterion_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    metric_id = Column(String, unique=True, index=True, nullable=False) # 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.3.1, 1.3.2, 1.4.1, 1.4.2
    sub_criterion = Column(String, nullable=False, index=True) # 1.1, 1.2, 1.3, 1.4
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    required_evidence = Column(JSON, nullable=False) # List of required evidence item strings
    optional_evidence = Column(JSON, nullable=True)
    expected_doc_types = Column(JSON, nullable=True)
    completeness_score = Column(Float, default=0.0) # 0 to 100
    relevance_score = Column(Float, default=0.0)
    status = Column(String, default="Missing") # Complete, Partial, Missing, Conflicting
    ai_confidence = Column(Float, default=0.0)
    human_validation_status = Column(String, default="Pending Validation") # Pending Validation, Faculty Verified, HOD Approved, Principal Approved
    missing_evidence = Column(JSON, nullable=True) # List of missing evidence descriptions
    override_reason = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    metric_id = Column(String, nullable=False, index=True) # e.g. 1.1.2
    sub_criterion = Column(String, nullable=False)
    evidence_text = Column(Text, nullable=False)
    page_number = Column(Integer, default=1)
    confidence = Column(Float, default=90.0)
    relevance_status = Column(String, default="Relevant") # Relevant, Partial, Irrelevant
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DocumentConflict(Base):
    __tablename__ = "document_conflicts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    metric_id = Column(String, nullable=False)
    doc_id_a = Column(Integer, ForeignKey("documents.id"), nullable=False)
    doc_id_b = Column(Integer, ForeignKey("documents.id"), nullable=False)
    conflict_type = Column(String, default="Data Discrepancy")
    conflict_description = Column(Text, nullable=False)
    severity = Column(String, default="Major") # Major, Minor
    status = Column(String, default="Open") # Open, Resolved
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=False)
    action = Column(String, nullable=False) # Upload, OCR, AI Analysis, HOD Validation, Principal Approval, AI Override, Document Status Update
    target_type = Column(String, nullable=False) # Document, Metric, Gap, Recommendation
    target_id = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    override_reason = Column(Text, nullable=True)

class CriterionAnalysis(Base):
    __tablename__ = "criterion_analyses"

    id = Column(Integer, primary_key=True, index=True)
    sub_criterion = Column(String, unique=True, index=True, nullable=False) # 1.1, 1.2, 1.3, 1.4
    title = Column(String, nullable=False)
    score = Column(Float, default=0.0) # 0 to 100
    cgpa_equivalent = Column(Float, default=0.0) # 0 to 4.0
    readiness_level = Column(String, default="Needs Improvement") # Excellent, Good, Satisfactory, Needs Improvement
    evidence_count = Column(Integer, default=0)
    gap_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GapItem(Base):
    __tablename__ = "gap_items"

    id = Column(Integer, primary_key=True, index=True)
    sub_criterion = Column(String, nullable=False) # 1.1, 1.2, 1.3, 1.4
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, default="Medium") # High, Medium, Low
    status = Column(String, default="Open") # Open, Pending, Resolved
    missing_evidence = Column(String, nullable=True)
    recommended_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RecommendationItem(Base):
    __tablename__ = "recommendation_items"

    id = Column(Integer, primary_key=True, index=True)
    sub_criterion = Column(String, nullable=False) # 1.1, 1.2, 1.3, 1.4
    title = Column(String, nullable=False)
    recommendation_text = Column(Text, nullable=False)
    priority = Column(String, default="High") # High, Medium, Low
    shap_explanation_json = Column(JSON, nullable=True) # { feature_importance: {...}, base_value: float, shap_values: [...] }
    action_items = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class InboxMessage(Base):
    __tablename__ = "inbox_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sender_name = Column(String, default="System Administrator")
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_role = Column(String, nullable=True) # All, Faculty, HOD, Principal, Administrator
    category = Column(String, default="Approval") # Approval, Gap, Evidence, System
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    target_type = Column(String, nullable=True) # Document, Metric, Gap, Approval
    target_id = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(String, unique=True, index=True, nullable=False)
    duration_seconds = Column(Float, default=0.0)
    status = Column(String, default="Success") # Success, Failed, Partial
    chunks_processed = Column(Integer, default=0)
    metrics_mapped = Column(Integer, default=0)
    gaps_detected = Column(Integer, default=0)
    node_logs = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EvidenceChain(Base):
    __tablename__ = "evidence_chains"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    metric_id = Column(String, nullable=False, index=True) # 1.4.1, 1.3.2 etc.
    chain_stage = Column(String, nullable=False) # Collection, Analysis, Action Taken, Public Disclosure
    is_present = Column(Boolean, default=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    page_number = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    notify_critical_gaps = Column(Boolean, default=True)
    notify_approvals = Column(Boolean, default=True)
    notify_rejections = Column(Boolean, default=True)
    notify_assignments = Column(Boolean, default=True)
    in_app = Column(Boolean, default=True)
    email = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)



