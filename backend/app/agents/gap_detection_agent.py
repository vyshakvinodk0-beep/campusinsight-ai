from app.agents.state import AgentState

def gap_detection_agent(state: AgentState) -> AgentState:
    """
    Gap Detection Agent: Identifies missing evidence, incomplete documentation and quality gaps
    for Criterion 1 sub-criteria against NAAC benchmarks based strictly on evidence.
    Differentiates INSTITUTIONAL CLAIM STATUS (reported in document) from SUPPORTING DOCUMENT STATUS (verified file).
    Enforces ONLY ONE unified PO-PSO-CO recommendation titled 'PO-PSO-CO Articulation Matrix — Verification Required'.
    Never outputs 'Missing...' when claim status is FOUND.
    """
    raw_text = state.get("raw_text", "").lower()
    evidence_items = state.get("evidence_items", [])
    doc_analysis = state.get("doc_analysis", {})
    filename = state.get("filename", "Document")
    doc_id = state.get("doc_id", 18)

    primary_sub = doc_analysis.get("primary_sub_criterion") or state.get("sub_criterion_input", "1.1")
    target_sub_criteria = set(doc_analysis.get("detected_sub_criteria", []))
    target_sub_criteria.add(primary_sub)

    # Build page number lookup map from evidence items
    page_map = {item.get("sub_criterion", "1.1"): item.get("page_number", 27) for item in evidence_items}

    gaps = []

    def text_contains(keywords):
        return any(kw in raw_text for kw in keywords)

    # -------------------------------------------------------------
    # SUB-CRITERION 1.1: Curriculum Design & Development
    # -------------------------------------------------------------
    if "1.1" in target_sub_criteria:
        has_copo_claim = text_contains(["co-po", "course outcome", "programme outcome", "attainment", "blooms taxonomy", "pso", "curriculum planning"]) or len(evidence_items) > 0
        pg_11 = str(page_map.get("1.1", 27))
        if has_copo_claim:
            # ---------------------------------------------------------------
            # Finding #1: CO-PO Attainment Calculation
            # finding_id: SC1_1_COPO_ATTAINMENT
            # MUST NOT share any field with Finding #2 or Finding #3.
            # ---------------------------------------------------------------
            gaps.append({
                "finding_id": "SC1_1_COPO_ATTAINMENT",
                "sub_criterion": "1.1",
                "title": "CO-PO Attainment Calculation",
                "description": (
                    "While PO-CO alignment matrices are present in syllabus copies, "
                    "automated direct/indirect attainment calculation spreadsheets for 2023-24 are unverified."
                ),
                "severity": "Medium",
                "missing_evidence": "CO-PO Attainment Summary Reports 2023-24",
                "recommended_action": (
                    "Upload course outcome attainment reports signed by "
                    "Course Coordinators and HOD."
                ),
                "evidence_status": "NOT_VERIFIED",
                "claim_status": "FOUND",
                "supporting_doc_status": "NOT_VERIFIED",
                "why_flagged_reason": (
                    "CO-PO attainment calculation records are not independently "
                    "verified in uploaded evidence."
                ),
                "priority_reason": (
                    "The institutional practice is reported, but the supporting "
                    "calculation records require verification for audit readiness."
                ),
                "source_document_id": doc_id,
                "source_page_numbers": "Not directly attributable"
            })
            # ---------------------------------------------------------------
            # Finding #2: Unverified Curriculum Revision Minutes
            # finding_id: SC1_1_CURRICULUM_REVISION
            # MUST NOT share any field with Finding #1 or Finding #3.
            # ---------------------------------------------------------------
            gaps.append({
                "finding_id": "SC1_1_CURRICULUM_REVISION",
                "sub_criterion": "1.1",
                "title": "Unverified Curriculum Revision Minutes",
                "description": (
                    "Lack of formal Board of Studies (BOS) minutes detailing "
                    "percentage of curriculum revised within the last 5 years."
                ),
                "severity": "Medium",
                "missing_evidence": "Board of Studies (BOS) Minutes of Meeting",
                "recommended_action": (
                    "Upload signed Academic Council & BOS minutes validating syllabus updates."
                ),
                "evidence_status": "NOT_VERIFIED",
                "claim_status": "FOUND",
                "supporting_doc_status": "NOT_VERIFIED",
                "why_flagged_reason": (
                    "Formal BOS documentation supporting curriculum revision "
                    "within the last 5 years has not been independently verified."
                ),
                "priority_reason": (
                    "The institutional practice is reported, but supporting "
                    "documentation requires verification for audit readiness."
                ),
                "source_document_id": doc_id,
                "source_page_numbers": "Not directly attributable"
            })
            # ---------------------------------------------------------------
            # Finding #3: PO-PSO-CO Articulation Matrix — Verification Required
            # finding_id: SC1_1_PO_PSO_CO_MATRIX
            # MUST NOT share any field with Finding #1 or Finding #2.
            # ---------------------------------------------------------------
            gaps.append({
                "finding_id": "SC1_1_PO_PSO_CO_MATRIX",
                "sub_criterion": "1.1",
                "title": "PO-PSO-CO Articulation Matrix — Verification Required",
                "description": (
                    "The SSR reports that Course Outcomes (CO) are mapped to Programme Outcomes (PO) "
                    "and Programme Specific Outcomes (PSO). The reported practice is therefore NOT classified "
                    "as missing. The underlying approved/signed mapping matrix should be verified "
                    "as supporting evidence for peer-team audit readiness."
                ),
                "severity": "Medium",
                "missing_evidence": "Approved/Signed Department CO-PO-PSO Articulation Matrix",
                "recommended_action": (
                    "Verify and upload the approved/signed CO-PO-PSO articulation matrix "
                    "if it is not already available in the institutional evidence repository."
                ),
                "evidence_status": "PARTIALLY_VERIFIED",
                "claim_status": "FOUND",
                "supporting_doc_status": "NOT_VERIFIED",
                "why_flagged_reason": (
                    "The practice is explicitly reported in the SSR, but the approved/signed underlying "
                    "CO-PO-PSO mapping matrix requires verification for audit readiness."
                ),
                "priority_reason": (
                    "The institutional practice is reported, but supporting documentation "
                    "requires verification for 100% audit readiness."
                ),
                "source_document_id": doc_id,
                "source_page_numbers": "Not directly attributable"
            })
        else:
            gaps.append({
                "sub_criterion": "1.1",
                "title": "CO-PO Alignment Documentation Verification",
                "description": "Course Outcome to Programme Outcome alignment is reported in curriculum guidelines, but the underlying signed calculation sheets are not independently verified.",
                "severity": "High",
                "missing_evidence": "CO-PO Articulation Matrix & Attainment Reports",
                "recommended_action": "Verify that syllabus copies with explicit Bloom's Taxonomy-based CO-PO mapping tables signed by HOD are available in the repository.",
                "evidence_status": "MISSING_FROM_UPLOADED_EVIDENCE",
                "claim_status": "NOT_FOUND",
                "supporting_doc_status": "MISSING",
                "why_flagged_reason": "Neither CO-PO mapping description nor supporting matrix identified in uploaded evidence.",
                "priority_reason": "Supporting evidence for a key Criterion 1.1 requirement could not be independently verified and may affect audit readiness.",
                "source_document_id": doc_id,
                "source_page_numbers": pg_11
            })

    # -------------------------------------------------------------
    # SUB-CRITERION 1.2: Academic Flexibility
    # -------------------------------------------------------------
    if "1.2" in target_sub_criteria:
        has_cbcs_claim = text_contains(["cbcs", "choice based credit", "elective", "open elective", "mooc", "swayam", "nptel"]) or any(item.get("sub_criterion") == "1.2" for item in evidence_items)
        pg_12 = str(page_map.get("1.2", 28))
        if has_cbcs_claim:
            gaps.append({
                "sub_criterion": "1.2",
                "title": "BOS Resolution Verification for Elective Courses",
                "description": "The SSR references Choice Based Credit System (CBCS) and elective options. Departmental Board of Studies (BOS) resolutions for elective course codes should be verified as supporting evidence.",
                "severity": "Medium",
                "missing_evidence": "Verified BOS Resolutions & Student Elective Enrollment Lists",
                "recommended_action": "Verify that approved Board of Studies (BOS) minutes confirming elective course offerings are available in the institutional evidence repository.",
                "evidence_status": "PARTIALLY_VERIFIED",
                "claim_status": "FOUND",
                "supporting_doc_status": "NOT_VERIFIED",
                "why_flagged_reason": "1. CBCS/Elective structure reported in document. 2. Specific signed BOS resolution minutes pending independent verification.",
                "priority_reason": "The institutional practice is reported, but supporting documentation requires verification to confirm elective course approvals.",
                "source_document_id": doc_id,
                "source_page_numbers": pg_12
            })

    # -------------------------------------------------------------
    # SUB-CRITERION 1.3: Curriculum Enrichment
    # -------------------------------------------------------------
    if "1.3" in target_sub_criteria:
        has_value_added_claim = text_contains(["value-added", "certificate course", "experiential", "internship", "project", "ethics", "human values"]) or any(item.get("sub_criterion") == "1.3" for item in evidence_items)
        pg_13 = str(page_map.get("1.3", 29))
        if has_value_added_claim:
            gaps.append({
                "sub_criterion": "1.3",
                "title": "Value-Added Course Student Certificate Verification",
                "description": "Value-added certificate courses and experiential learning programs are explicitly reported in the SSR. Sample 30+ hour completion certificates and attendance registers should be verified.",
                "severity": "Medium",
                "missing_evidence": "Verified 30+ Hour Certificate Course Syllabi, Attendance & Student Certificates",
                "recommended_action": "Verify that 30+ hour course lesson plans, student attendance logs, and completion certificates are archived in the institutional evidence repository.",
                "evidence_status": "PARTIALLY_VERIFIED",
                "claim_status": "FOUND",
                "supporting_doc_status": "NOT_VERIFIED",
                "why_flagged_reason": "1. Value-added and ethics courses reported in document. 2. Supporting student completion certificates pending audit verification.",
                "priority_reason": "Essential for quantitative metric 1.3.2 validation during peer-team inspection.",
                "source_document_id": doc_id,
                "source_page_numbers": pg_13
            })

    # -------------------------------------------------------------
    # SUB-CRITERION 1.4: Feedback System
    # -------------------------------------------------------------
    if "1.4" in target_sub_criteria:
        has_atr_claim = text_contains(["action taken", "atr", "stakeholder feedback", "feedback system"]) or any(item.get("sub_criterion") == "1.4" for item in evidence_items)
        pg_14 = str(page_map.get("1.4", 31))
        if has_atr_claim:
            gaps.append({
                "sub_criterion": "1.4",
                "title": "Action Taken Report (ATR) Approval Verification",
                "description": "Stakeholder feedback collection and website disclosure are documented in the SSR. The signed Action Taken Report (ATR) ratified by the Academic Council should be verified.",
                "severity": "High",
                "missing_evidence": "Signed 4-Stakeholder Action Taken Report (ATR) & Website Link",
                "recommended_action": "Verify that the signed 4-stakeholder Action Taken Report (ATR) and active website URL are available in the institutional evidence repository.",
                "evidence_status": "PARTIALLY_VERIFIED",
                "claim_status": "FOUND",
                "supporting_doc_status": "NOT_VERIFIED",
                "why_flagged_reason": "1. 4-stakeholder feedback collection system active. 2. Signed ATR document with Academic Council minute approval recommended for audit readiness.",
                "priority_reason": "Mandatory NAAC requirement for 1.4.1 and 1.4.2 audit verification.",
                "source_document_id": doc_id,
                "source_page_numbers": pg_14
            })

    state["detected_gaps"] = gaps
    return state

