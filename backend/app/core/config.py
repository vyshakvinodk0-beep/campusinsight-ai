import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Calculate absolute path to backend/.env file regardless of current working directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(backend_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusInsight AI - NAAC Criterion 1"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campusinsight_super_secret_jwt_key_naac_2026_criterion1")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database - Absolute path ensures single persistent SQLite file regardless of CWD
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(backend_dir, 'campusinsight.db').replace('\\\\', '/').replace('\\', '/')}")
    
    # Uploads & FAISS directory
    UPLOAD_DIR: str = os.path.join(backend_dir, "uploads")
    FAISS_INDEX_DIR: str = os.path.join(backend_dir, "faiss_index")
    
    # Gemini AI API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Resend API Key & Sender Address
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "CampusInsight AI <onboarding@resend.dev>")
        
    EMAILS_ENABLED: bool = True

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = env_path
        env_file_encoding = "utf-8"

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.FAISS_INDEX_DIR, exist_ok=True)

def print_env_diagnostics():
    has_key = bool(settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip())
    sender = settings.RESEND_FROM_EMAIL

    print("\n==================================================")
    print("   CAMPUSINSIGHT AI - RESEND EMAIL DIAGNOSTICS    ")
    print("==================================================")
    print(f"RESEND_API_KEY DETECTED : {'YES' if has_key else 'NO'}")
    print(f"SENDER ADDRESS         : {sender}")
    print("==================================================\n")

print_env_diagnostics()

