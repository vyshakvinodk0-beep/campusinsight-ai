from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    doc_id: int
    filename: str
    sub_criterion_input: str
    raw_text: str
    chunks: List[str]
    
    # Quality Analysis & Metadata
    quality_metrics: Dict[str, float]
    file_hash: str
    
    # Document Analysis Agent output
    doc_analysis: Dict[str, Any]
    
    # Evidence Verification Agent output
    evidence_items: List[Dict[str, Any]]
    conflicts: List[Dict[str, Any]]
    
    # Criteria Mapping Agent output
    mapped_criteria: Dict[str, Any]
    
    # Gap Detection Agent output
    detected_gaps: List[Dict[str, Any]]
    
    # Recommendation Agent output
    recommendations: List[Dict[str, Any]]
    
    # Explanation Agent output (Evidence Attribution)
    shap_explanations: Dict[str, Any]
    
    # Status / Errors
    status: str
    error_message: Optional[str]
