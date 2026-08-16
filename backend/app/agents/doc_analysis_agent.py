from app.agents.state import AgentState

def document_analysis_agent(state: AgentState) -> AgentState:
    """
    Document Analysis Agent: Extracts and understands uploaded institutional documents.
    Identifies key academic keywords, document type, and evidence markers.
    """
    raw_text = state.get("raw_text", "")
    filename = state.get("filename", "")
    
    text_lower = raw_text.lower()
    
    # Keyword detection for document classification
    has_po_co = any(k in text_lower for k in ["programme outcome", "po", "pso", "course outcome", "co", "blooms taxonomy"])
    has_revision = any(k in text_lower for k in ["curriculum revision", "board of studies", "bos minutes", "academic council", "syllabus update"])
    has_flexibility = any(k in text_lower for k in ["open elective", "choice based credit", "cbcs", "minor degree", "honours", "mooc", "nptel", "credit transfer"])
    has_enrichment = any(k in text_lower for k in ["value-added", "certificate course", "human values", "professional ethics", "environmental studies", "workshop", "seminar"])
    has_feedback = any(k in text_lower for k in ["stakeholder feedback", "student feedback", "faculty feedback", "alumni feedback", "employer feedback", "action taken report", "atr"])

    detected_tags = []
    if has_po_co or has_revision:
        detected_tags.append("1.1")
    if has_flexibility:
        detected_tags.append("1.2")
    if has_enrichment:
        detected_tags.append("1.3")
    if has_feedback:
        detected_tags.append("1.4")
        
    primary_sub = detected_tags[0] if detected_tags else (state.get("sub_criterion_input") or "1.1")

    doc_analysis = {
        "filename": filename,
        "character_count": len(raw_text),
        "word_count": len(raw_text.split()),
        "detected_sub_criteria": detected_tags,
        "primary_sub_criterion": primary_sub,
        "has_po_co": has_po_co,
        "has_revision": has_revision,
        "has_flexibility": has_flexibility,
        "has_enrichment": has_enrichment,
        "has_feedback": has_feedback,
        "summary": f"Analyzed {filename}: Contains {len(raw_text.split())} words. Mapped to sub-criteria: {', '.join(detected_tags) if detected_tags else 'General Curricular Aspects'}."
    }

    state["doc_analysis"] = doc_analysis
    return state
