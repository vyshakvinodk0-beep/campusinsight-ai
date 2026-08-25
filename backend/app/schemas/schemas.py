from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "Faculty"
    department: str = "Computer Science & Engineering"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    token: Optional[str] = None
    email: EmailStr
    full_name: Optional[str] = "Google User"
    role: Optional[str] = "Faculty"
    department: Optional[str] = "Computer Science & Engineering"



class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Document Schemas
class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_type: str
    file_size: int
    sub_criterion: str
    status: str
    hod_validated: bool = False
    hod_validated_by: Optional[str] = None
    principal_validated: bool = False
    principal_validated_by: Optional[str] = None
    validation_status: str = "Pending HOD Validation"
    rejection_reason: Optional[str] = None
    chunk_count: int
    upload_date: datetime
    extracted_preview: Optional[str] = None
    user_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_department: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentRejectionRequest(BaseModel):
    rejection_reason: str


class UserUpdateRole(BaseModel):
    user_id: int
    role: str
    is_active: bool = True

class RagQueryRequest(BaseModel):
    query: str
    sub_criterion: Optional[str] = "All"
    top_k: int = 4
    doc_id: Optional[int] = None

class RagQueryResult(BaseModel):
    answer: str
    retrieved_chunks: List[Dict[str, Any]]

# Analysis & Gap Schemas
class CriterionAnalysisResponse(BaseModel):
    id: int
    sub_criterion: str
    title: str
    score: float
    cgpa_equivalent: float
    readiness_level: str
    evidence_count: int
    gap_count: int
    summary: Optional[str]

    class Config:
        from_attributes = True

class GapItemResponse(BaseModel):
    id: int
    sub_criterion: str
    title: str
    description: str
    severity: str
    status: str
    missing_evidence: Optional[str]
    recommended_action: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class GapStatusUpdate(BaseModel):
    status: str


class RecommendationResponse(BaseModel):
    id: int
    sub_criterion: str
    title: str
    recommendation_text: str
    priority: str
    shap_explanation_json: Optional[Dict[str, Any]]
    action_items: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardOverviewResponse(BaseModel):
    overall_quality_score: float
    overall_cgpa: float
    overall_readiness: str
    total_documents: int
    total_gaps: int
    gaps_by_severity: Dict[str, int]
    sub_criteria_analyses: List[CriterionAnalysisResponse]
    recent_gaps: List[GapItemResponse]
    recent_recommendations: List[RecommendationResponse]
