import re
from app.agents.state import AgentState

def document_analysis_agent(state: AgentState) -> AgentState:
    """
    Document Analysis Agent: Extracts and understands uploaded institutional documents.
    Identifies key academic keywords, document type, and evidence markers using precise word boundaries.
    """
    raw_text = state.get("raw_text", "")
    filename = state.get("filename", "")
    text_lower = raw_text.lower()
    
    # Precise regex boundary keyword detection
    def match_any(patterns, text):
        return any(re.search(pat, text) for pat in patterns)

    po_co_pats = [r"\bprogramme outcome\b", r"\bcourse outcome\b", r"\bpo-co\b", r"\bpo/co\b", r"\bco-po\b", r"\bpso\b", r"\bbloom'?s taxonomy\b", r"\battainment\b", r"\b1\.1\.1\b"]
    revision_pats = [r"\bcurriculum revision\b", r"\bboard of studies\b", r"\bbos minutes\b", r"\bacademic council\b", r"\bsyllabus revision\b", r"\bsyllabus update\b", r"\b1\.1\.2\b"]
    flexibility_pats = [r"\bopen elective\b", r"\bchoice based credit\b", r"\bcbcs\b", r"\bminor degree\b", r"\bhonours\b", r"\bmooc\b", r"\bnptel\b", r"\bcredit transfer\b", r"\b1\.2\b"]
    enrichment_pats = [r"\bvalue-added\b", r"\bcertificate course\b", r"\bhuman values\b", r"\bprofessional ethics\b", r"\benvironmental studies\b", r"\bgender equity\b", r"\b1\.3\b"]
    feedback_pats = [r"\bstakeholder feedback\b", r"\bstudent feedback\b", r"\bfaculty feedback\b", r"\balumni feedback\b", r"\bemployer feedback\b", r"\baction taken report\b", r"\batr\b", r"\bfeedback analysis\b", r"\bfeedback review\b", r"\bfeedback register\b", r"\bfeedback system\b", r"\bfeedback\b", r"\baction taken\b", r"\b1\.4\b"]

    has_po_co = match_any(po_co_pats, text_lower)
    has_revision = match_any(revision_pats, text_lower)
    has_flexibility = match_any(flexibility_pats, text_lower)
    has_enrichment = match_any(enrichment_pats, text_lower)
    has_feedback = match_any(feedback_pats, text_lower)

    # Score each sub-criterion by keyword frequency
    scores = {
        "1.1": sum(len(re.findall(p, text_lower)) for p in po_co_pats + revision_pats),
        "1.2": sum(len(re.findall(p, text_lower)) for p in flexibility_pats),
        "1.3": sum(len(re.findall(p, text_lower)) for p in enrichment_pats),
        "1.4": sum(len(re.findall(p, text_lower)) for p in feedback_pats)
    }

    detected_tags = [k for k, v in scores.items() if v > 0]
    
    # Primary sub-criterion is highest scoring sub-criterion
    if detected_tags and max(scores.values()) > 0:
        primary_sub = max(scores, key=scores.get)
    else:
        primary_sub = state.get("sub_criterion_input") or "1.4"

    doc_analysis = {
        "filename": filename,
        "character_count": len(raw_text),
        "word_count": len(raw_text.split()),
        "detected_sub_criteria": detected_tags if detected_tags else [primary_sub],
        "primary_sub_criterion": primary_sub,
        "sub_criterion_scores": scores,
        "has_po_co": has_po_co,
        "has_revision": has_revision,
        "has_flexibility": has_flexibility,
        "has_enrichment": has_enrichment,
        "has_feedback": has_feedback,
        "summary": f"Analyzed {filename}: Contains {len(raw_text.split())} words. Dynamically classified into Sub-Criterion {primary_sub} (Detected: {', '.join(detected_tags) if detected_tags else primary_sub})."
    }

    state["doc_analysis"] = doc_analysis
    return state

