from app.agents.state import AgentState

def gap_detection_agent(state: AgentState) -> AgentState:
    """
    Gap Detection Agent: Identifies missing evidence, incomplete documentation and quality gaps
    for Criterion 1 sub-criteria against NAAC benchmarks.
    """
    mapped = state.get("mapped_criteria", {})
    sub_scores = mapped.get("sub_scores", {})
    evidence = mapped.get("evidence_extracted", {})
    raw_text = state.get("raw_text", "").lower()
    
    gaps = []
    doc_analysis = state.get("doc_analysis", {})
    primary_sub = mapped.get("primary_mapped") or doc_analysis.get("primary_sub_criterion") or state.get("sub_criterion_input", "1.4")
    target_sub_criteria = set(doc_analysis.get("detected_sub_criteria", []))
    target_sub_criteria.add(primary_sub)

    # Check 1.1 Gaps (only if document targets/includes Sub-Criterion 1.1)
    if "1.1" in target_sub_criteria:
        if not any("PO-PSO-CO" in e for e in evidence.get("1.1", [])):
            gaps.append({
                "sub_criterion": "1.1",
                "title": "Missing PO-PSO-CO Articulation Matrix",
                "description": "No clear alignment matrix mapping Course Outcomes (CO) to Programme Outcomes (PO) and Programme Specific Outcomes (PSO) was found.",
                "severity": "High",
                "missing_evidence": "PO-PSO-CO Attainment & Alignment Documents",
                "recommended_action": "Publish updated syllabus copy containing explicit Bloom's Taxonomy-based CO-PO mapping tables signed by HOD."
            })
        if not any("Revision" in e for e in evidence.get("1.1", [])):
            gaps.append({
                "sub_criterion": "1.1",
                "title": "Unverified Curriculum Revision Minutes",
                "description": "Lack of formal Board of Studies (BOS) minutes detailing percentage of curriculum revised within last 5 years.",
                "severity": "Medium",
                "missing_evidence": "Board of Studies (BOS) Minutes of Meeting",
                "recommended_action": "Upload signed Academic Council & BOS minutes validating syllabus updates."
            })

    # Check 1.2 Gaps (only if document targets/includes Sub-Criterion 1.2)
    if "1.2" in target_sub_criteria:
        if not any("Open electives" in e for e in evidence.get("1.2", [])):
            gaps.append({
                "sub_criterion": "1.2",
                "title": "Incomplete Academic Flexibility Evidence",
                "description": "Insufficient evidence of Choice Based Credit System (CBCS) / Elective course options across programmes.",
                "severity": "Medium",
                "missing_evidence": "CBCS / Open Elective Course Allocation List",
                "recommended_action": "Compile institutional list of open electives offered across departments with student enrollment figures."
            })

    # Check 1.3 Gaps (only if document targets/includes Sub-Criterion 1.3)
    if "1.3" in target_sub_criteria:
        if not any("Value-added" in e for e in evidence.get("1.3", [])):
            gaps.append({
                "sub_criterion": "1.3",
                "title": "Missing Value-Added & Skill Development Courses",
                "description": "No documented proof of 30+ hour value-added certificate courses offered for skill enhancement.",
                "severity": "High",
                "missing_evidence": "Value-Added Course Syllabi & Attendance Sheets",
                "recommended_action": "Document minimum 2 value-added certificate programs per department per academic year with student completion certificates."
            })

    # Check 1.4 Gaps (only if document targets/includes Sub-Criterion 1.4)
    if "1.4" in target_sub_criteria:
        if "action taken" not in raw_text and "atr" not in raw_text:
            gaps.append({
                "sub_criterion": "1.4",
                "title": "Missing Stakeholder Action Taken Report (ATR)",
                "description": "Feedback collected from students/faculty/employers lacks a corresponding Action Taken Report approved by Academic Authority.",
                "severity": "High",
                "missing_evidence": "Action Taken Report (ATR) signed by Principal/HOD",
                "recommended_action": "Formulate Action Taken Report detailing curriculum modifications made in response to employer and alumni feedback."
            })

    state["detected_gaps"] = gaps
    return state
