import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.seed_data import seed_database
from app.api import auth, documents, criterion, analytics, reports, metrics, inbox, search

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

# Migration helper for SQLite missing columns
with engine.connect() as conn:
    for col_def in [
        "hod_validated BOOLEAN DEFAULT 0",
        "hod_validated_by VARCHAR",
        "principal_validated BOOLEAN DEFAULT 0",
        "principal_validated_by VARCHAR",
        "validation_status VARCHAR DEFAULT 'Pending HOD Validation'",
        "rejection_reason TEXT",
        "validated_at DATETIME",
        "file_hash VARCHAR",
        "text_quality_score FLOAT DEFAULT 95.0",
        "ocr_quality_score FLOAT DEFAULT 90.0",
        "readability_score FLOAT DEFAULT 92.0",
        "is_scanned_pdf BOOLEAN DEFAULT 0",
        "version INTEGER DEFAULT 1",
        "version_status VARCHAR DEFAULT 'Current'",
        "academic_year VARCHAR DEFAULT '2024-25'"
    ]:
        try:
            conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_def}"))
            conn.commit()
        except Exception:
            pass

# Seed Sample NAAC Criterion 1 Data
db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CampusInsight AI - Agentic AI Intelligent Document Analysis & Recommendation System for NAAC Criterion 1 (Curricular Aspects)",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import FileResponse

# Mount Uploads directory for file preview
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(criterion.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(metrics.router, prefix=settings.API_V1_STR)
app.include_router(inbox.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)

# Serve Frontend SPA if compiled dist folder exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "docs" or full_path == "openapi.json":
            raise HTTPException(status_code=404, detail="API route not found")
        
        target_file = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend build not found"}
else:
    @app.get("/")
    def root():
        return {
            "app": settings.PROJECT_NAME,
            "status": "Online",
            "scope": "NAAC Criterion 1 (Curricular Aspects)",
            "docs_url": "/docs"
        }

