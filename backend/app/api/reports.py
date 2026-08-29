import os
from typing import Optional
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import CriterionAnalysis, GapItem, RecommendationItem, Document, EvidenceItem
from app.services.report_service import PDFReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

def _generate_pdf_response(institution: str, document_id: Optional[int], db: Session) -> Response:
    print(f"[REPORT GENERATION START] Generating PDF report for document_id: {document_id}, institution: {institution}")
    doc = None
    evidence_items = []
    
    if document_id:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail=f"Document #{document_id} not found in system database. Please select a valid document or Full Portfolio.")
        evidence_items = db.query(EvidenceItem).filter(EvidenceItem.document_id == document_id).all()
        if doc.institution_name and doc.institution_name != "Not reliably identified from document":
            institution = doc.institution_name

    analyses = db.query(CriterionAnalysis).all()
    
    if doc:
        gaps = db.query(GapItem).filter(GapItem.sub_criterion == doc.sub_criterion).all()
        recs = db.query(RecommendationItem).filter(RecommendationItem.sub_criterion == doc.sub_criterion).all()
    else:
        gaps = db.query(GapItem).all()
        recs = db.query(RecommendationItem).all()

    pdf_bytes = PDFReportService.generate_criterion1_report(
        analyses=analyses,
        gaps=gaps,
        recommendations=recs,
        institution_name=institution,
        doc=doc,
        evidence_items=evidence_items
    )

    if doc:
        base_name = os.path.splitext(doc.original_name)[0].replace(" ", "_")
        filename = f"CampusInsight_Report_Doc_{doc.id}_{base_name}.pdf"
    else:
        filename = "NAAC_Criterion1_Accreditation_Report.pdf"
    
    print(f"[REPORT GENERATION SUCCESS] PDF compiled successfully for document_id: {document_id or 'Global'} (filename: {filename})")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/download-pdf")
def download_naac_report(
    institution: str = "Higher Education Institution",
    document_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return _generate_pdf_response(institution, document_id, db)

@router.get("/download-pdf/{doc_id}")
def download_naac_report_by_path(
    doc_id: int,
    institution: str = "Higher Education Institution",
    db: Session = Depends(get_db)
):
    return _generate_pdf_response(institution, doc_id, db)

@router.get("/download-csv")
def download_naac_csv_report(
    institution: str = "Higher Education Institution",
    document_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    analyses = db.query(CriterionAnalysis).all()
    gaps = db.query(GapItem).all()
    recs = db.query(RecommendationItem).all()

    csv_content = PDFReportService.generate_criterion1_csv(
        analyses=analyses,
        gaps=gaps,
        recommendations=recs,
        institution_name=institution
    )

    filename = f"NAAC_Criterion1_Accreditation_Data_Doc_{document_id}.csv" if document_id else "NAAC_Criterion1_Accreditation_Data.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
