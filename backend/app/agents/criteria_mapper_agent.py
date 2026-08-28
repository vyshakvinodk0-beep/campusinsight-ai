from app.agents.state import AgentState

def criteria_mapping_agent(state: AgentState) -> AgentState:
    """
    Criteria Mapping Agent: Maps document contents strictly to Criterion 1 and its 4 sub-criteria:
    1.1 Curriculum Design and Development
    1.2 Academic Flexibility
    1.3 Curriculum Enrichment
    1.4 Feedback System
    """
    analysis = state.get("doc_analysis", {})
    raw_text = state.get("raw_text", "").lower()
    
    sub_scores = {
        "1.1": 0.0,
        "1.2": 0.0,
        "1.3": 0.0,
        "1.4": 0.0
    }
    
    evidence_extracted = {
        "1.1": [],
        "1.2": [],
        "1.3": [],
        "1.4": []
    }

    # 1.1 Checks
    if "programme outcome" in raw_text or "course outcome" in raw_text or "po-co" in raw_text:
        sub_scores["1.1"] += 45.0
        evidence_extracted["1.1"].append("PO-PSO-CO alignment metrics present")
    if "board of studies" in raw_text or "bos minutes" in raw_text or "curriculum revision" in raw_text:
        sub_scores["1.1"] += 45.0
        evidence_extracted["1.1"].append("Curriculum Revision & Board of Studies Minutes verified")

    # 1.2 Checks
    if "open elective" in raw_text or "cbcs" in raw_text or "minor degree" in raw_text:
        sub_scores["1.2"] += 45.0
        evidence_extracted["1.2"].append("Open electives / Minor / Honours flexibility documented")
    if "mooc" in raw_text or "nptel" in raw_text or "credit transfer" in raw_text:
        sub_scores["1.2"] += 45.0
        evidence_extracted["1.2"].append("MOOCs & Credit Transfer guidelines identified")

    # 1.3 Checks
    if "value-added" in raw_text or "certificate course" in raw_text:
        sub_scores["1.3"] += 45.0
        evidence_extracted["1.3"].append("Value-added and Certificate courses evidence identified")
    if "human values" in raw_text or "environmental studies" in raw_text or "professional ethics" in raw_text:
        sub_scores["1.3"] += 45.0
        evidence_extracted["1.3"].append("Cross-cutting issues (Human Values, Ethics, Environment) integrated")

    # 1.4 Checks
    if "feedback" in raw_text or "stakeholder" in raw_text or "student feedback" in raw_text or "faculty feedback" in raw_text or "alumni" in raw_text or "employer" in raw_text:
        sub_scores["1.4"] += 50.0
        evidence_extracted["1.4"].append("Multi-stakeholder feedback collection verified")
    if "action taken" in raw_text or "atr" in raw_text or "action taken report" in raw_text:
        sub_scores["1.4"] += 45.0
        evidence_extracted["1.4"].append("Action Taken Report (ATR) for feedback recorded")

    primary_sub = analysis.get("primary_sub_criterion")
    if not primary_sub or (max(sub_scores.values()) > 0 and sub_scores.get(primary_sub, 0) == 0):
        if max(sub_scores.values()) > 0:
            primary_sub = max(sub_scores, key=sub_scores.get)
        else:
            primary_sub = state.get("sub_criterion_input", "1.4")

    mapped_result = {
        "sub_scores": {k: min(100.0, v) for k, v in sub_scores.items()},
        "evidence_extracted": evidence_extracted,
        "primary_mapped": primary_sub
    }

    state["mapped_criteria"] = mapped_result
    return state
