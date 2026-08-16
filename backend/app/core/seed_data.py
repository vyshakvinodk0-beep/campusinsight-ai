from sqlalchemy.orm import Session
from app.models.models import (
    User, Document, CriterionAnalysis, GapItem, RecommendationItem,
    CriterionMetric, EvidenceItem, DocumentConflict, AuditLog
)
from app.core.security import get_password_hash
from app.services.vector_store import vector_store_service
from app.services.shap_service import shap_service
from datetime import datetime
import os
import hashlib

def seed_database(db: Session):
    # 1. Create Default Users for Role-Based Access
    users_data = [
        {"email": "admin@campusinsight.edu", "full_name": "Dr. Ramesh Sharma (System Admin)", "role": "Administrator", "department": "IQAC Cell"},
        {"email": "principal@campusinsight.edu", "full_name": "Prof. Ananya Roy (Principal)", "role": "Principal", "department": "Executive Office"},
        {"email": "hod.cse@campusinsight.edu", "full_name": "Dr. Vikramaditya Singh (HOD CSE)", "role": "HOD", "department": "Computer Science & Engg"},
        {"email": "faculty@campusinsight.edu", "full_name": "Prof. Meera Deshmukh (Faculty)", "role": "Faculty", "department": "Computer Science & Engg"}
    ]

    for u_data in users_data:
        existing = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing:
            user = User(
                email=u_data["email"],
                hashed_password=get_password_hash("password123"),
                full_name=u_data["full_name"],
                role=u_data["role"],
                department=u_data["department"],
                is_active=True
            )
            db.add(user)
    db.commit()

    admin_user = db.query(User).filter(User.email == "admin@campusinsight.edu").first()
    faculty_user = db.query(User).filter(User.email == "faculty@faculty.edu").first() or db.query(User).filter(User.email == "faculty@campusinsight.edu").first()
    hod_user = db.query(User).filter(User.email == "hod.cse@campusinsight.edu").first()
    principal_user = db.query(User).filter(User.email == "principal@campusinsight.edu").first()

    # 2. Seed Criterion 1 Metrics Hierarchy (1.1.1 to 1.4.2)
    metrics_data = [
        {
            "metric_id": "1.1.1",
            "sub_criterion": "1.1",
            "name": "Curriculum Design & PO-CO Attainment Alignment",
            "description": "Curriculum design aligned with Program Outcomes (POs), Program Specific Outcomes (PSOs), and Course Outcomes (COs) with documented Board of Studies (BOS) approval.",
            "required_evidence": [
                "BOS Meeting Minutes & Resolutions",
                "PO-CO Alignment Matrix & Syllabus Copies",
                "Attainment Calculation Spreadsheets",
                "Academic Council Approval Copy"
            ],
            "optional_evidence": ["External Academic Audit Report", "Industry Advisory Board Feedback"],
            "expected_doc_types": ["digital_pdf", "scanned_pdf"],
            "completeness_score": 92.0,
            "relevance_score": 95.0,
            "status": "Complete",
            "ai_confidence": 94.0,
            "human_validation_status": "HOD Approved"
        },
        {
            "metric_id": "1.1.2",
            "sub_criterion": "1.1",
            "name": "Percentage of Courses Revised (Last 5 Years)",
            "description": "Percentage of total courses where syllabus revision was carried out during the last five years.",
            "required_evidence": [
                "Syllabus Revision Notification",
                "List of Revised Courses with Percentage",
                "Comparison Matrix (Old vs New Curriculum)",
                "BOS Ratification Document"
            ],
            "optional_evidence": ["Departmental Curriculum Review Committee Report"],
            "expected_doc_types": ["digital_pdf", "docx"],
            "completeness_score": 78.0,
            "relevance_score": 88.0,
            "status": "Partial",
            "ai_confidence": 90.0,
            "human_validation_status": "Faculty Verified",
            "missing_evidence": ["Detailed Course-by-Course Comparison Matrix 2023-24"]
        },
        {
            "metric_id": "1.2.1",
            "sub_criterion": "1.2",
            "name": "CBCS / Elective Course System Implementation",
            "description": "Percentage of Programs in which Choice Based Credit System (CBCS) / Elective Course system has been implemented across all departments.",
            "required_evidence": [
                "Institutional CBCS Policy Notification",
                "List of Open Electives Offered",
                "Program Structure & Credit Allocation Regulations",
                "Student Enrollment List in Electives"
            ],
            "optional_evidence": ["Credit Allocation Chart"],
            "expected_doc_types": ["digital_pdf"],
            "completeness_score": 90.0,
            "relevance_score": 92.0,
            "status": "Complete",
            "ai_confidence": 93.0,
            "human_validation_status": "HOD Approved"
        },
        {
            "metric_id": "1.2.2",
            "sub_criterion": "1.2",
            "name": "MOOCs / SWAYAM Credit Transfer Integration",
            "description": "Number of add-on / certificate / online courses (NPTEL, SWAYAM, Coursera) with credit transfer facility integrated into official marksheets.",
            "required_evidence": [
                "Credit Transfer Equivalence Policy Document",
                "Approved NPTEL/SWAYAM Course Mapping List",
                "Credit Transfer Verification Certificates signed by Dean Academics"
            ],
            "optional_evidence": ["Student Grade Transfer Receipts"],
            "expected_doc_types": ["digital_pdf"],
            "completeness_score": 65.0,
            "relevance_score": 85.0,
            "status": "Partial",
            "ai_confidence": 88.0,
            "human_validation_status": "Pending Validation",
            "missing_evidence": ["Signed Credit Transfer Verification Certificates by Dean Academics"]
        },
        {
            "metric_id": "1.3.1",
            "sub_criterion": "1.3",
            "name": "Integration of Cross-Cutting Issues into Curriculum",
            "description": "Curriculum integrates cross-cutting issues relevant to Professional Ethics, Gender Equality, Human Values, Environment & Sustainability.",
            "required_evidence": [
                "Course Copies for Environmental Studies, Professional Ethics & Gender Equity",
                "Student Enrollment Records in Mandatory Audit Courses",
                "Activity Reports & Photos of Ethics/Gender Seminars"
            ],
            "optional_evidence": ["Guest Lecture Attendance Logs"],
            "expected_doc_types": ["digital_pdf", "scanned_pdf"],
            "completeness_score": 95.0,
            "relevance_score": 98.0,
            "status": "Complete",
            "ai_confidence": 96.0,
            "human_validation_status": "Principal Approved"
        },
        {
            "metric_id": "1.3.2",
            "sub_criterion": "1.3",
            "name": "Value-Added Courses Offered (30+ Contact Hours)",
            "description": "Number of Value-Added courses imparting transferable and life skills offered during the last five years.",
            "required_evidence": [
                "List of Value-Added Courses with Syllabus & Contact Hours (>= 30 hrs)",
                "Attendance Registers & Completion Certificates",
                "Course Completion Assessment Results"
            ],
            "optional_evidence": ["Brochures & Trainer Profiles"],
            "expected_doc_types": ["digital_pdf"],
            "completeness_score": 88.0,
            "relevance_score": 90.0,
            "status": "Complete",
            "ai_confidence": 92.0,
            "human_validation_status": "HOD Approved"
        },
        {
            "metric_id": "1.4.1",
            "sub_criterion": "1.4",
            "name": "Structured Stakeholder Feedback Collection",
            "description": "Structured feedback on curriculum obtained from 1) Students, 2) Teachers, 3) Employers, and 4) Alumni.",
            "required_evidence": [
                "Sample Feedback Forms & Portal Link Documentation",
                "Stakeholder Wise Response Analytics (Students, Faculty, Alumni, Employers)",
                "Feedback Compilation & Consolidated Analysis Report"
            ],
            "optional_evidence": ["Raw Feedback Response Sheet CSVs"],
            "expected_doc_types": ["digital_pdf", "docx"],
            "completeness_score": 85.0,
            "relevance_score": 89.0,
            "status": "Complete",
            "ai_confidence": 91.0,
            "human_validation_status": "Faculty Verified"
        },
        {
            "metric_id": "1.4.2",
            "sub_criterion": "1.4",
            "name": "Action Taken Report (ATR) on Feedback & Public Disclosure",
            "description": "Feedback process of the institution includes Action Taken Report (ATR) on curriculum, approved by Academic Council and published on website.",
            "required_evidence": [
                "Official Action Taken Report (ATR) signed by HOD / IQAC Coordinator",
                "Academic Council Ratification Minutes for ATR",
                "Website URL Link / Screenshot of Public Feedback ATR"
            ],
            "optional_evidence": ["Curriculum Action Note to BOS"],
            "expected_doc_types": ["digital_pdf"],
            "completeness_score": 60.0,
            "relevance_score": 82.0,
            "status": "Partial",
            "ai_confidence": 86.0,
            "human_validation_status": "Pending Validation",
            "missing_evidence": ["Academic Council Signature Page on Action Taken Report (ATR) 2024"]
        }
    ]

    for m_data in metrics_data:
        existing = db.query(CriterionMetric).filter(CriterionMetric.metric_id == m_data["metric_id"]).first()
        if not existing:
            metric = CriterionMetric(**m_data)
            db.add(metric)
    db.commit()

    # 3. Seed Criterion 1 Sub-Criteria Summaries
    analyses_data = [
        {
            "sub_criterion": "1.1",
            "title": "Curriculum Design and Development",
            "score": 85.0,
            "cgpa_equivalent": 3.40,
            "readiness_level": "Good (A Grade)",
            "evidence_count": 8,
            "gap_count": 1,
            "summary": "Verified alignment of Programme Outcomes (PO), Programme Specific Outcomes (PSO), and Course Outcomes (CO). Board of Studies (BOS) revised 24% of core courses in 2024."
        },
        {
            "sub_criterion": "1.2",
            "title": "Academic Flexibility",
            "score": 78.0,
            "cgpa_equivalent": 3.12,
            "readiness_level": "Good (A Grade)",
            "evidence_count": 6,
            "gap_count": 1,
            "summary": "Choice Based Credit System (CBCS) implemented across 100% of B.Tech programmes. Credit transfer policy for MOOCs/SWAYAM courses integrated."
        },
        {
            "sub_criterion": "1.3",
            "title": "Curriculum Enrichment",
            "score": 92.0,
            "cgpa_equivalent": 3.68,
            "readiness_level": "Excellent (A++ Grade)",
            "evidence_count": 12,
            "gap_count": 0,
            "summary": "Integrates courses on Professional Ethics, Gender Equality, Environmental Studies, and Human Values. 14 Value-Added skill programs completed in 2024-25."
        },
        {
            "sub_criterion": "1.4",
            "title": "Feedback System",
            "score": 74.0,
            "cgpa_equivalent": 2.96,
            "readiness_level": "Satisfactory (B++ Grade)",
            "evidence_count": 5,
            "gap_count": 2,
            "summary": "Feedback collected from Students, Faculty, Alumni, and Employers. Feedback analysis report present; Action Taken Report (ATR) pending Academic Council signature."
        }
    ]

    for a_data in analyses_data:
        existing = db.query(CriterionAnalysis).filter(CriterionAnalysis.sub_criterion == a_data["sub_criterion"]).first()
        if not existing:
            analysis = CriterionAnalysis(**a_data)
            db.add(analysis)
    db.commit()

    # 4. Seed Gap Items
    gaps_data = [
        {
            "sub_criterion": "1.1",
            "title": "Missing Direct CO-PO Attainment Calculation Sheets",
            "description": "While PO-CO alignment matrices are present in syllabus copies, automated direct/indirect attainment calculation spreadsheets for 2023-24 are unverified.",
            "severity": "Medium",
            "status": "Open",
            "missing_evidence": "CO-PO Attainment Summary Reports 2023-24",
            "recommended_action": "Upload course outcome attainment reports signed by Course Coordinators and HOD."
        },
        {
            "sub_criterion": "1.2",
            "title": "Incomplete Record of Credit Transfers for NPTEL/MOOCs",
            "description": "List of students who successfully completed NPTEL credit transfers is missing grade card verification signatures from Dean Academics.",
            "severity": "Low",
            "status": "Open",
            "missing_evidence": "Signed MOOC Credit Transfer Equivalence Certificates",
            "recommended_action": "Compile and upload official NPTEL/SWAYAM credit transfer approvals signed by Dean Academics."
        },
        {
            "sub_criterion": "1.4",
            "title": "Unsigned Employer Action Taken Report (ATR)",
            "description": "Employer feedback indicates request for AI/Cloud skills. The corresponding Action Taken Report (ATR) lacks formal Academic Council ratification signature.",
            "severity": "High",
            "status": "Open",
            "missing_evidence": "Academic Council Approved Action Taken Report",
            "recommended_action": "Present Employer Feedback ATR to Academic Council and upload signed resolution copy."
        }
    ]

    for g_data in gaps_data:
        existing = db.query(GapItem).filter(GapItem.title == g_data["title"]).first()
        if not existing:
            gap = GapItem(**g_data)
            db.add(gap)
    db.commit()

    # 5. Seed Recommendation Items
    recs_data = [
        {
            "sub_criterion": "1.1",
            "title": "Publish Standardized PO-CO Attainment Protocol",
            "recommendation_text": "Establish a standardized digital template for calculating direct (Internal/End-Sem Exams) and indirect (Course Exit Surveys) CO attainment to boost Metric 1.1.1 readiness score.",
            "priority": "High",
            "shap_explanation_json": shap_service.explain_sub_criterion_score("1.1", {"PO_CO_Mapping_Density": 8.5, "Curriculum_Revision_Recency": 8.0}),
            "action_items": [
                "Deploy institutional CO-PO calculation template across all departments.",
                "Conduct faculty workshop on Bloom's Taxonomy CO formulation.",
                "Submit sample attainment files for NAAC peer team review."
            ]
        },
        {
            "sub_criterion": "1.4",
            "title": "Formalize Employer & Alumni Feedback Action Loop",
            "recommendation_text": "Close the feedback loop by publishing a bi-annual Action Taken Report (ATR) explicitly detailing how stakeholder input influenced curriculum revisions.",
            "priority": "High",
            "shap_explanation_json": shap_service.explain_sub_criterion_score("1.4", {"Stakeholder_Feedback_Coverage": 9.5, "ATR_Action_Taken_Completeness": 6.0}),
            "action_items": [
                "Schedule Academic Council meeting for ATR approval.",
                "Publish ATR on institutional website public portal as mandated by NAAC."
            ]
        }
    ]

    for r_data in recs_data:
        existing = db.query(RecommendationItem).filter(RecommendationItem.title == r_data["title"]).first()
        if not existing:
            rec = RecommendationItem(**r_data)
            db.add(rec)
    db.commit()

    # 6. Seed Sample Documents & Index in FAISS
    if faculty_user and db.query(Document).count() == 0:
        sample_docs = [
            {
                "filename": "BTech_CSE_Curriculum_Revision_2024.pdf",
                "original_name": "B.Tech CSE Curriculum Revision & BOS Minutes 2024.pdf",
                "file_type": "digital_pdf",
                "file_size": 245000,
                "sub_criterion": "1.1",
                "status": "Processed",
                "validation_status": "Fully Validated",
                "hod_validated": True,
                "hod_validated_by": hod_user.full_name if hod_user else "Dr. Vikramaditya Singh",
                "principal_validated": True,
                "principal_validated_by": principal_user.full_name if principal_user else "Prof. Ananya Roy",
                "file_hash": "a1b2c3d4e5f67890123456789abcdef0",
                "text_quality_score": 98.0,
                "ocr_quality_score": 95.0,
                "readability_score": 96.0,
                "academic_year": "2024-25",
                "extracted_text": (
                    "B.Tech Computer Science and Engineering Curriculum Revision 2024.\n"
                    "Board of Studies (BOS) Meeting held on May 14, 2024.\n"
                    "Resolution 1: Revised 24% of core curriculum content including Artificial Intelligence, Cloud Computing, and Agentic AI.\n"
                    "Resolution 2: Formulated explicit Course Outcomes (CO) aligned to NBA/NAAC Programme Outcomes (PO1 to PO12) and PSOs.\n"
                    "Skill development initiatives and industry-oriented laboratory experiments incorporated into 5th and 6th semester schemes."
                ),
                "chunk_count": 3,
                "user_id": faculty_user.id
            },
            {
                "filename": "Academic_Flexibility_CBCS_MOOCs_Policy.pdf",
                "original_name": "Institutional Choice Based Credit System (CBCS) & MOOC Credit Transfer Policy.pdf",
                "file_type": "digital_pdf",
                "file_size": 182000,
                "sub_criterion": "1.2",
                "status": "Processed",
                "validation_status": "Fully Validated",
                "hod_validated": True,
                "hod_validated_by": hod_user.full_name if hod_user else "Dr. Vikramaditya Singh",
                "principal_validated": True,
                "principal_validated_by": principal_user.full_name if principal_user else "Prof. Ananya Roy",
                "file_hash": "b2c3d4e5f67890123456789abcdef0a1",
                "text_quality_score": 96.0,
                "ocr_quality_score": 92.0,
                "readability_score": 94.0,
                "academic_year": "2024-25",
                "extracted_text": (
                    "Institutional Policy on Academic Flexibility and Choice Based Credit System (CBCS).\n"
                    "Students may register for up to 18 credits of Open Electives, Minor Degree Programmes in Data Science, and Honours Degree in Cyber Security.\n"
                    "Credit Transfer: Up to 20% of total degree credits permitted via NPTEL / SWAYAM / Coursera online learning platforms.\n"
                    "Value-added learning flexibility enables multidisciplinary credit transfer across engineering departments."
                ),
                "chunk_count": 2,
                "user_id": faculty_user.id
            },
            {
                "filename": "Value_Added_Courses_Report_2024.pdf",
                "original_name": "Report on Value-Added Certificate Courses & Human Values Integration 2024.pdf",
                "file_type": "digital_pdf",
                "file_size": 310000,
                "sub_criterion": "1.3",
                "status": "Uploaded",
                "validation_status": "Pending Principal Validation",
                "hod_validated": True,
                "hod_validated_by": hod_user.full_name if hod_user else "Dr. Vikramaditya Singh",
                "principal_validated": False,
                "file_hash": "c3d4e5f67890123456789abcdef0a1b2",
                "text_quality_score": 94.0,
                "ocr_quality_score": 90.0,
                "readability_score": 91.0,
                "academic_year": "2024-25",
                "extracted_text": (
                    "Curriculum Enrichment Report 2024-2025.\n"
                    "Offered 14 Value-Added Certificate Programmes (30+ contact hours each) covering Full-Stack Web Development, Ethics in AI, and Environmental Sustainability.\n"
                    "Mandatory audit courses on Professional Ethics, Gender Equity, and Environmental Studies completed by 1,240 undergraduate students.\n"
                    "Workshops and hands-on seminars conducted in collaboration with industry partners."
                ),
                "chunk_count": 3,
                "user_id": faculty_user.id
            },
            {
                "filename": "Stakeholder_Feedback_Analysis_ATR_2024.pdf",
                "original_name": "Stakeholder Feedback Analysis Report & Action Taken Report (ATR) 2024.pdf",
                "file_type": "digital_pdf",
                "file_size": 195000,
                "sub_criterion": "1.4",
                "status": "Uploaded",
                "validation_status": "Pending HOD Validation",
                "hod_validated": False,
                "principal_validated": False,
                "file_hash": "d4e5f67890123456789abcdef0a1b2c3",
                "text_quality_score": 91.0,
                "ocr_quality_score": 88.0,
                "readability_score": 90.0,
                "academic_year": "2024-25",
                "extracted_text": (
                    "NAAC Criterion 1.4 Feedback Analysis and Action Taken Report (ATR) 2024.\n"
                    "Feedback collected online from Students (94% response rate), Faculty (98%), Alumni (76%), and Industry Employers (82%).\n"
                    "Key Feedback Findings: Employers requested inclusion of DevOps and GenAI frameworks in curriculum.\n"
                    "Action Taken Report (ATR): Introduced elective course CSE-402 Agentic AI and Cloud DevOps in 7th semester."
                ),
                "chunk_count": 2,
                "user_id": faculty_user.id
            }
        ]

        for s_doc in sample_docs:
            doc = Document(
                filename=s_doc["filename"],
                original_name=s_doc["original_name"],
                file_path=os.path.join("uploads", s_doc["filename"]),
                file_type=s_doc["file_type"],
                file_size=s_doc["file_size"],
                sub_criterion=s_doc["sub_criterion"],
                status=s_doc["status"],
                validation_status=s_doc["validation_status"],
                hod_validated=s_doc["hod_validated"],
                hod_validated_by=s_doc.get("hod_validated_by"),
                principal_validated=s_doc["principal_validated"],
                principal_validated_by=s_doc.get("principal_validated_by"),
                file_hash=s_doc["file_hash"],
                text_quality_score=s_doc["text_quality_score"],
                ocr_quality_score=s_doc["ocr_quality_score"],
                readability_score=s_doc["readability_score"],
                academic_year=s_doc["academic_year"],
                extracted_text=s_doc["extracted_text"],
                chunk_count=s_doc["chunk_count"],
                user_id=s_doc["user_id"]
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            # Seed Evidence Items with page citations for this document
            if doc.sub_criterion == "1.1":
                ev1 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.1.1",
                    sub_criterion="1.1",
                    evidence_text="Resolution 1: Revised 24% of core curriculum content including Artificial Intelligence, Cloud Computing, and Agentic AI (BOS Minutes 2024).",
                    page_number=2,
                    confidence=95.0,
                    relevance_status="Relevant",
                    verification_notes="Verified by HOD Dr. Vikramaditya Singh"
                )
                ev2 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.1.2",
                    sub_criterion="1.1",
                    evidence_text="Formulated explicit Course Outcomes (CO) aligned to NBA/NAAC Programme Outcomes (PO1 to PO12) and PSOs.",
                    page_number=4,
                    confidence=92.0,
                    relevance_status="Relevant",
                    verification_notes="Verified by Principal Prof. Ananya Roy"
                )
                db.add_all([ev1, ev2])

            elif doc.sub_criterion == "1.2":
                ev1 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.2.1",
                    sub_criterion="1.2",
                    evidence_text="Students may register for up to 18 credits of Open Electives, Minor Degree Programmes in Data Science, and Honours Degree in Cyber Security.",
                    page_number=1,
                    confidence=94.0,
                    relevance_status="Relevant",
                    verification_notes="CBCS Policy verified"
                )
                ev2 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.2.2",
                    sub_criterion="1.2",
                    evidence_text="Credit Transfer: Up to 20% of total degree credits permitted via NPTEL / SWAYAM / Coursera online learning platforms.",
                    page_number=3,
                    confidence=88.0,
                    relevance_status="Partial",
                    verification_notes="Missing Dean Academics signature page"
                )
                db.add_all([ev1, ev2])

            elif doc.sub_criterion == "1.3":
                ev1 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.3.1",
                    sub_criterion="1.3",
                    evidence_text="Mandatory audit courses on Professional Ethics, Gender Equity, and Environmental Studies completed by 1,240 undergraduate students.",
                    page_number=5,
                    confidence=98.0,
                    relevance_status="Relevant",
                    verification_notes="Complete attendance records uploaded"
                )
                ev2 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.3.2",
                    sub_criterion="1.3",
                    evidence_text="Offered 14 Value-Added Certificate Programmes (30+ contact hours each) covering Full-Stack Web Development and Ethics in AI.",
                    page_number=2,
                    confidence=92.0,
                    relevance_status="Relevant",
                    verification_notes="30+ contact hours syllabus verified"
                )
                db.add_all([ev1, ev2])

            elif doc.sub_criterion == "1.4":
                ev1 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.4.1",
                    sub_criterion="1.4",
                    evidence_text="Feedback collected online from Students (94% response rate), Faculty (98%), Alumni (76%), and Industry Employers (82%).",
                    page_number=1,
                    confidence=91.0,
                    relevance_status="Relevant",
                    verification_notes="All 4 stakeholder categories present"
                )
                ev2 = EvidenceItem(
                    document_id=doc.id,
                    metric_id="1.4.2",
                    sub_criterion="1.4",
                    evidence_text="Action Taken Report (ATR): Introduced elective course CSE-402 Agentic AI and Cloud DevOps in 7th semester based on employer feedback.",
                    page_number=3,
                    confidence=86.0,
                    relevance_status="Partial",
                    verification_notes="Pending Academic Council ratification"
                )
                db.add_all([ev1, ev2])

            db.commit()

            # Seed Audit Logs for initialization
            audit1 = AuditLog(
                user_name=hod_user.full_name if hod_user else "System Admin",
                user_role="HOD",
                action="Document Verification",
                target_type="Document",
                target_id=str(doc.id),
                details=f"Verified and approved evidence document '{doc.filename}' for NAAC Sub-criterion {doc.sub_criterion}."
            )
            db.add(audit1)
            db.commit()

            # Index into FAISS Vector Store
            chunks = [s_doc["extracted_text"]]
            vector_store_service.add_chunks(
                chunks=chunks,
                doc_id=doc.id,
                filename=s_doc["filename"],
                sub_criterion=s_doc["sub_criterion"]
            )


