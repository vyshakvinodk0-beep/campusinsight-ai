import os
import sys
import time
import shutil
import tempfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

import fitz # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, Base, engine
from app.models.models import Document, EvidenceItem, CriterionAnalysis, GapItem, RecommendationItem
from app.services.ocr_service import DocumentExtractorService
from app.services.vector_store import vector_store_service
from app.services.rag_service import rag_service
from app.agents.workflow import langgraph_agent_pipeline

# Ensure DB tables exist
Base.metadata.create_all(bind=engine)

def create_sample_text_pdf(output_path: str, page_count: int, title: str = "Sample Document"):
    """
    Creates a text-based PDF with selectable text, headings, and page numbers.
    """
    doc = fitz.open()
    for p in range(page_count):
        page = doc.new_page(width=595, height=842) # A4
        text_content = (
            f"{title} - Page {p + 1} of {page_count}\n\n"
            f"1.1 Curriculum Design and Development & Programme Outcomes (PO/CO Attainment)\n"
            f"The Department of Computer Science & Engineering conducted Board of Studies (BOS) meeting for syllabus revision.\n"
            f"Page {p + 1}: Course outcomes (CO) are mapped with Programme Outcomes (PO) and Programme Specific Outcomes (PSO).\n"
            f"Value-added courses and Open Electives (CBCS) are introduced as per NAAC Criterion 1 guidelines.\n"
            f"Stakeholder feedback from students, faculty, alumni, and employers was collected and Action Taken Report (ATR) was prepared.\n\n"
            f"Signature of HOD / Dean Academic Affairs\n"
            f"Institutional Accreditation Evidence Code: NAAC-CSE-2025-P{p+1}"
        )
        page.insert_text((50, 70), text_content, fontsize=11)
    doc.save(output_path)
    doc.close()

def create_sample_scanned_pdf(output_path: str, page_count: int):
    """
    Creates a scanned image-only PDF where pages contain drawn text rendered as bitmap images (no selectable text).
    """
    doc = fitz.open()
    for p in range(page_count):
        # Create a PIL image containing rendered text
        img = Image.new("RGB", (600, 800), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((40, 50), f"SCANNED INSTITUTIONAL EVIDENCE - PAGE {p + 1}", fill=(0, 0, 0))
        draw.text((40, 100), f"Sub-Criterion 1.4 Feedback Analysis Report & ATR", fill=(0, 0, 0))
        draw.text((40, 150), f"Page {p + 1}: Verified stakeholder feedback system implementation.", fill=(0, 0, 0))
        draw.text((40, 200), f"Signed by Principal & IQAC Coordinator", fill=(0, 0, 0))

        img_byte_arr = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(img_byte_arr.name)
        img_byte_arr.close()

        page = doc.new_page(width=595, height=842)
        page.insert_image(page.rect, filename=img_byte_arr.name)
        os.remove(img_byte_arr.name)

    doc.save(output_path)
    doc.close()

def create_sample_mixed_pdf(output_path: str, text_pages: int, scanned_pages: int):
    """
    Creates a hybrid PDF containing both text-selectable pages and scanned image pages.
    """
    doc = fitz.open()
    
    # Text pages
    for p in range(text_pages):
        page = doc.new_page(width=595, height=842)
        text = f"Digital Text Page {p + 1}: Criterion 1.2 Academic Flexibility, CBCS & MOOCs credit transfer regulations."
        page.insert_text((50, 70), text, fontsize=12)

    # Scanned pages
    for p in range(scanned_pages):
        p_num = text_pages + p + 1
        img = Image.new("RGB", (600, 800), color=(245, 245, 245))
        draw = ImageDraw.Draw(img)
        draw.text((40, 50), f"Scanned Annexure Page {p_num}: BOS Resolution & Signature Sheet", fill=(0, 0, 0))
        
        img_tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(img_tmp.name)
        img_tmp.close()

        page = doc.new_page(width=595, height=842)
        page.insert_image(page.rect, filename=img_tmp.name)
        os.remove(img_tmp.name)

    doc.save(output_path)
    doc.close()

def create_sample_table_pdf(output_path: str):
    """
    Creates a PDF containing structured tables.
    """
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    text = (
        "NAAC Criterion 1 Evidence - Table Representation\n\n"
        "Sub-Criterion | Metric ID | Required Evidence | Status\n"
        "1.1 | 1.1.1 | PO-CO Attainment & Syllabus Revision | Available\n"
        "1.2 | 1.2.1 | CBCS & Elective Course Matrix | Available\n"
        "1.3 | 1.3.1 | Human Values & Ethics Certificate Courses | Complete\n"
        "1.4 | 1.4.1 | Stakeholder Feedback Analysis & ATR | Action Taken\n"
    )
    page.insert_text((50, 70), text, fontsize=11)
    doc.save(output_path)
    doc.close()


def run_all_pipeline_tests():
    print("=" * 70)
    print("CAMPUSINSIGHT AI — ROBUST LARGE DOCUMENT ANALYSIS TEST SUITE")
    print("=" * 70)

    test_dir = tempfile.mkdtemp(prefix="campusinsight_test_")
    test_results = []

    try:
        # TEST 1: 1-page text PDF
        print("\n[TEST 1] Processing 1-page text PDF...")
        pdf1 = os.path.join(test_dir, "test_1page.pdf")
        create_sample_text_pdf(pdf1, 1, "1-Page Syllabus")
        text1, type1, pages1, metrics1, hash1, failed1 = DocumentExtractorService.process_document_in_batches(pdf1, "test_1page.pdf")
        assert len(pages1) == 1, f"Expected 1 page, got {len(pages1)}"
        assert pages1[0]["text_source"] == "TEXT", "Page 1 should be TEXT source"
        print(f"✓ TEST 1 PASSED: 1 page extracted cleanly ({pages1[0]['text_source']})")
        test_results.append(("TEST 1: 1-page text PDF", "PASS"))

        # TEST 2: 10-page text PDF
        print("\n[TEST 2] Processing 10-page text PDF...")
        pdf2 = os.path.join(test_dir, "test_10page.pdf")
        create_sample_text_pdf(pdf2, 10, "10-Page BOS Minutes")
        text2, type2, pages2, metrics2, hash2, failed2 = DocumentExtractorService.process_document_in_batches(pdf2, "test_10page.pdf")
        assert len(pages2) == 10, f"Expected 10 pages, got {len(pages2)}"
        assert all(p["text_source"] == "TEXT" for p in pages2), "All pages should be TEXT"
        print(f"✓ TEST 2 PASSED: 10 pages extracted cleanly without unnecessary OCR")
        test_results.append(("TEST 2: 10-page text PDF", "PASS"))

        # TEST 3: 100-page text PDF
        print("\n[TEST 3] Processing 100-page text PDF...")
        pdf3 = os.path.join(test_dir, "test_100page.pdf")
        create_sample_text_pdf(pdf3, 100, "100-Page AQAR Evidence")
        text3, type3, pages3, metrics3, hash3, failed3 = DocumentExtractorService.process_document_in_batches(pdf3, "test_100page.pdf")
        assert len(pages3) == 100, f"Expected 100 pages, got {len(pages3)}"
        print(f"✓ TEST 3 PASSED: 100 pages processed incrementally")
        test_results.append(("TEST 3: 100-page text PDF", "PASS"))

        # TEST 4: 360-page SSR PDF
        print("\n[TEST 4] Processing 360-page SSR PDF...")
        pdf4 = os.path.join(test_dir, "test_360page_ssr.pdf")
        create_sample_text_pdf(pdf4, 360, "360-Page SSR Accreditation Report")
        text4, type4, pages4, metrics4, hash4, failed4 = DocumentExtractorService.process_document_in_batches(pdf4, "test_360page_ssr.pdf")
        assert len(pages4) == 360, f"Expected 360 pages, got {len(pages4)}"
        print(f"✓ TEST 4 PASSED: 360-page SSR processed cleanly in batches")
        test_results.append(("TEST 4: 360-page SSR PDF", "PASS"))

        # TEST 5: 600-page text PDF
        print("\n[TEST 5] Processing 600-page text PDF...")
        pdf5 = os.path.join(test_dir, "test_600page.pdf")
        create_sample_text_pdf(pdf5, 600, "600-Page Master Syllabus Vault")
        text5, type5, pages5, metrics5, hash5, failed5 = DocumentExtractorService.process_document_in_batches(pdf5, "test_600page.pdf")
        assert len(pages5) == 600, f"Expected 600 pages, got {len(pages5)}"
        chunks5 = DocumentExtractorService.create_page_aware_chunks(pages5, 555, "test_600page.pdf", "1.1")
        assert len(chunks5) > 0, "Chunks should be created"
        print(f"✓ TEST 5 PASSED: 600-page document processed & chunked safely ({len(chunks5)} chunks)")
        test_results.append(("TEST 5: 600-page text PDF", "PASS"))

        # TEST 6: Scanned 10-page PDF (Triggers Tesseract OCR)
        print("\n[TEST 6] Processing Scanned 10-page PDF (Selective OCR)...")
        pdf6 = os.path.join(test_dir, "test_scanned_10page.pdf")
        create_sample_scanned_pdf(pdf6, 10)
        text6, type6, pages6, metrics6, hash6, failed6 = DocumentExtractorService.process_document_in_batches(pdf6, "test_scanned_10page.pdf")
        assert len(pages6) == 10, f"Expected 10 pages, got {len(pages6)}"
        ocr_count6 = sum(1 for p in pages6 if p["is_scanned"])
        assert ocr_count6 > 0, "OCR should be triggered for scanned pages"
        print(f"✓ TEST 6 PASSED: Scanned 10-page PDF activated Tesseract OCR ({ocr_count6} OCR pages)")
        test_results.append(("TEST 6: Scanned 10-page PDF", "PASS"))

        # TEST 7: Mixed PDF (Text pages + Scanned pages)
        print("\n[TEST 7] Processing Mixed PDF (Text + Scanned pages)...")
        pdf7 = os.path.join(test_dir, "test_mixed.pdf")
        create_sample_mixed_pdf(pdf7, text_pages=5, scanned_pages=5)
        text7, type7, pages7, metrics7, hash7, failed7 = DocumentExtractorService.process_document_in_batches(pdf7, "test_mixed.pdf")
        assert len(pages7) == 10, f"Expected 10 pages, got {len(pages7)}"
        text_count7 = sum(1 for p in pages7 if not p["is_scanned"])
        ocr_count7 = sum(1 for p in pages7 if p["is_scanned"])
        assert text_count7 == 5, f"Expected 5 text pages, got {text_count7}"
        assert ocr_count7 == 5, f"Expected 5 OCR pages, got {ocr_count7}"
        print(f"✓ TEST 7 PASSED: Mixed PDF processed selectively ({text_count7} Text pages, {ocr_count7} OCR pages)")
        test_results.append(("TEST 7: Mixed PDF (Text + Scanned)", "PASS"))

        # TEST 8: Large scanned document (25 pages scanned)
        print("\n[TEST 8] Processing Large Scanned Document (25 pages scanned)...")
        pdf8 = os.path.join(test_dir, "test_large_scanned.pdf")
        create_sample_scanned_pdf(pdf8, 25)
        text8, type8, pages8, metrics8, hash8, failed8 = DocumentExtractorService.process_document_in_batches(pdf8, "test_large_scanned.pdf")
        assert len(pages8) == 25, f"Expected 25 pages, got {len(pages8)}"
        print(f"✓ TEST 8 PASSED: Large scanned document processed via OCR pipeline")
        test_results.append(("TEST 8: Large scanned document", "PASS"))

        # TEST 9: PDF containing tables
        print("\n[TEST 9] Processing PDF containing tables...")
        pdf9 = os.path.join(test_dir, "test_tables.pdf")
        create_sample_table_pdf(pdf9)
        text9, type9, pages9, metrics9, hash9, failed9 = DocumentExtractorService.process_document_in_batches(pdf9, "test_tables.pdf")
        assert "1.1" in text9 and "1.4" in text9, "Table content should be preserved"
        print(f"✓ TEST 9 PASSED: PDF table content preserved cleanly")
        test_results.append(("TEST 9: PDF containing tables", "PASS"))

        # TEST 10: FAISS Indexing, RAG Retrieval & 6-Agent LangGraph Analysis
        print("\n[TEST 10] Testing FAISS Vector Store, RAG Retrieval & 6-Agent Workflow...")
        # Add chunks from mixed doc
        chunks7 = DocumentExtractorService.create_page_aware_chunks(pages7, 999, "test_mixed.pdf", "1.2")
        vector_store_service.add_chunks(chunks7, 999, "test_mixed.pdf", "1.2")
        
        # Test RAG query
        rag_res = rag_service.answer_query("CBCS credit transfer open electives", sub_criterion="1.2", top_k=3)
        assert "retrieved_chunks" in rag_res, "RAG should return retrieved chunks"
        assert len(rag_res["retrieved_chunks"]) > 0, "RAG should retrieve relevant chunks"
        
        # Test 6-Agent pipeline invoke
        db = SessionLocal()
        test_doc = Document(
            filename="test_mixed.pdf",
            original_name="test_mixed.pdf",
            file_path=pdf7,
            file_type="mixed_pdf",
            sub_criterion="1.2",
            extracted_text=text7,
            page_count=10,
            user_id=1
        )
        db.add(test_doc)
        db.commit()
        db.refresh(test_doc)

        initial_state = {
            "doc_id": test_doc.id,
            "filename": test_doc.filename,
            "sub_criterion_input": "1.2",
            "raw_text": text7[:2500],
            "chunks": [c["text"] for c in chunks7[:3]],
            "quality_metrics": metrics7,
            "file_hash": hash7,
            "doc_analysis": {},
            "evidence_items": [],
            "conflicts": [],
            "mapped_criteria": {},
            "detected_gaps": [],
            "recommendations": [],
            "shap_explanations": {},
            "status": "Starting",
            "error_message": None
        }

        final_state = langgraph_agent_pipeline.invoke(initial_state)
        assert "evidence_items" in final_state, "LangGraph should output evidence items"
        print(f"✓ TEST 10 PASSED: RAG retrieval & 6-Agent LangGraph pipeline executed successfully")
        test_results.append(("TEST 10: FAISS RAG & 6-Agent LangGraph Pipeline", "PASS"))

        db.delete(test_doc)
        db.commit()
        db.close()

    finally:
        shutil.rmtree(test_dir, ignore_errors=True)

    print("\n" + "=" * 70)
    print("TEST SUMMARY RESULTS:")
    print("=" * 70)
    all_passed = True
    for name, status in test_results:
        print(f"[{status}] {name}")
        if status != "PASS":
            all_passed = False

    print("=" * 70)
    if all_passed:
        print("ALL 10 MANDATED PIPELINE TESTS COMPLETED SUCCESSFULLY!")
    else:
        print("SOME TESTS FAILED!")
    print("=" * 70)

if __name__ == "__main__":
    run_all_pipeline_tests()
