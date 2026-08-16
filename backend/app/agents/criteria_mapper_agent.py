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
        "1.1": 45.0,
        "1.2": 40.0,
        "1.3": 40.0,
        "1.4": 35.0
    }
    
    evidence_extracted = {
        "1.1": [],
        "1.2": [],
        "1.3": [],
        "1.4": []
    }

    # 1.1 Checks
    if "programme outcome" in raw_text or "po" in raw_text or "co" in raw_text:
        sub_scores["1.1"] += 25.0
        evidence_extracted["1.1"].append("PO-PSO-CO alignment metrics present")
    if "board of studies" in raw_text or "bos" in raw_text or "curriculum revision" in raw_text:
        sub_scores["1.1"] += 25.0
        evidence_extracted["1.1"].append("Curriculum Revision & Board of Studies Minutes verified")

    # 1.2 Checks
    if "open elective" in raw_text or "cbcs" in raw_text or "minor" in raw_text:
        sub_scores["1.2"] += 30.0
        evidence_extracted["1.2"].append("Open electives / Minor / Honours flexibility documented")
    if "mooc" in raw_text or "nptel" in raw_text or "credit transfer" in raw_text:
        sub_scores["1.2"] += 25.0
        evidence_extracted["1.2"].append("MOOCs & Credit Transfer guidelines identified")

    # 1.3 Checks
    if "value-added" in raw_text or "certificate programme" in raw_text:
        sub_scores["1.3"] += 30.0
        evidence_extracted["1.3"].append("Value-added and Certificate courses evidence identified")
    if "human values" in raw_text or "environmental studies" in raw_text or "professional ethics" in raw_text:
        sub_scores["1.3"] += 25.0
        evidence_extracted["1.3"].append("Cross-cutting issues (Human Values, Ethics, Environment) integrated")

    # 1.4 Checks
    if "student feedback" in raw_text or "faculty feedback" in raw_text or "alumni" in raw_text or "employer" in raw_text:
        sub_scores["1.4"] += 30.0
        evidence_extracted["1.4"].append("Multi-stakeholder feedback collection verified")
    if "action taken" in raw_text or "atr" in raw_text:
        sub_scores["1.4"] += 30.0
        evidence_extracted["1.4"].append("Action Taken Report (ATR) for feedback recorded")

    mapped_result = {
        "sub_scores": {k: min(100.0, v) for k, v in sub_scores.items()},
        "evidence_extracted": evidence_extracted,
        "primary_mapped": analysis.get("primary_sub_criterion", "1.1")
    }

    state["mapped_criteria"] = mapped_result
    return state
