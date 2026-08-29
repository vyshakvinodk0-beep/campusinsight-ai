import sqlite3
import os

def clean_and_reprocess():
    db_path = "campusinsight.db"
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 1. Clean contradictory PO-PSO-CO gaps and recommendations across all documents
    c.execute("DELETE FROM gap_items WHERE title LIKE '%Missing PO-PSO-CO%'")
    c.execute("DELETE FROM recommendation_items WHERE title LIKE '%Missing PO-PSO-CO%'")

    # 2. Update existing PO-PSO-CO gap title to standard
    c.execute("""
        UPDATE gap_items 
        SET title = 'PO-PSO-CO Articulation Matrix — Verification Required',
            claim_status = 'FOUND',
            supporting_doc_status = 'NOT_VERIFIED',
            description = 'The SSR reports that Course Outcomes (CO) are mapped to Programme Outcomes (PO) and Programme Specific Outcomes (PSO). The reported practice is therefore not classified as missing. However, the underlying approved/signed mapping matrix should be verified as supporting evidence for peer-team audit readiness.',
            missing_evidence = 'Approved/Signed Department CO-PO-PSO Articulation Matrix',
            recommended_action = 'Verify and upload the approved/signed CO-PO-PSO articulation matrix if it is not already available in the institutional evidence repository.',
            priority_reason = 'The institutional practice is reported, but supporting documentation requires verification for 100% audit readiness.'
        WHERE title LIKE '%PO-PSO-CO%'
    """)

    c.execute("""
        UPDATE recommendation_items 
        SET title = 'Recommendation: PO-PSO-CO Articulation Matrix — Verification Required',
            claim_status = 'FOUND',
            supporting_doc_status = 'NOT_VERIFIED',
            category = 'EVIDENCE_BASED',
            priority_reason = 'The institutional practice is reported, but supporting documentation requires verification for 100% audit readiness.'
        WHERE title LIKE '%PO-PSO-CO%'
    """)

    # 3. Clean any recommendation with "Missing..." when claim_status is FOUND
    c.execute("""
        UPDATE gap_items
        SET title = 'CO-PO Attainment Calculation Evidence — Verification Required'
        WHERE title LIKE 'Missing Direct CO-PO Attainment%' AND claim_status = 'FOUND'
    """)

    c.execute("""
        UPDATE recommendation_items
        SET title = 'Recommendation: CO-PO Attainment Calculation Evidence — Verification Required'
        WHERE title LIKE '%Missing Direct CO-PO Attainment%' AND claim_status = 'FOUND'
    """)

    # 4. Fill all NULL / empty priority_reasons in recommendation_items
    c.execute("""
        UPDATE recommendation_items
        SET priority_reason = 'Supporting evidence for a key Criterion requirement could not be independently verified and may affect audit readiness.'
        WHERE priority = 'High' AND (priority_reason IS NULL OR priority_reason = '' OR priority_reason = 'None')
    """)

    c.execute("""
        UPDATE recommendation_items
        SET priority_reason = 'The institutional practice is reported, but supporting documentation requires verification.'
        WHERE priority = 'Medium' AND (priority_reason IS NULL OR priority_reason = '' OR priority_reason = 'None')
    """)

    c.execute("""
        UPDATE recommendation_items
        SET priority_reason = 'The evidence exists, but additional documentation would improve audit traceability.'
        WHERE priority = 'Low' AND (priority_reason IS NULL OR priority_reason = '' OR priority_reason = 'None')
    """)

    # 5. Fix evidence_items where metric_id is 1.1.2 and page_number is 32
    c.execute("""
        UPDATE evidence_items
        SET page_number = 27,
            evidence_text = 'Sub-Criterion 1.1 curriculum planning reported in naac-ssr-2024.pdf (Page 27), but specific syllabus revision sheet is pending verification.'
        WHERE metric_id = '1.1.2' AND page_number = 32
    """)

    conn.commit()
    print("[CLEANUP SUCCESS] Database entries cleaned, priority reasons populated, and citations sanitized.")
    conn.close()

if __name__ == "__main__":
    clean_and_reprocess()
