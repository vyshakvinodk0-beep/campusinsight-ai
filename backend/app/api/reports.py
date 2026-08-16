from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import CriterionAnalysis, GapItem, RecommendationItem
from app.services.report_service import PDFReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/download-pdf")
def download_naac_report(institution: str = "Higher Education Institution", db: Session = Depends(get_db)):
    analyses = db.query(CriterionAnalysis).all()
    gaps = db.query(GapItem).all()
    recs = db.query(RecommendationItem).all()

    pdf_bytes = PDFReportService.generate_criterion1_report(
        analyses=analyses,
        gaps=gaps,
        recommendations=recs,
        institution_name=institution
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=NAAC_Criterion1_Accreditation_Report.pdf"
        }
    )

@router.get("/download-csv")
def download_naac_csv_report(institution: str = "Higher Education Institution", db: Session = Depends(get_db)):
    analyses = db.query(CriterionAnalysis).all()
    gaps = db.query(GapItem).all()
    recs = db.query(RecommendationItem).all()

    csv_content = PDFReportService.generate_criterion1_csv(
        analyses=analyses,
        gaps=gaps,
        recommendations=recs,
        institution_name=institution
    )

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=NAAC_Criterion1_Accreditation_Data.csv"
        }
    )

