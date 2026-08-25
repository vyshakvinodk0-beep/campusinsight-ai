import os
import sys
import uvicorn

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("  CAMPUSINSIGHT AI - STABLE LOCALHOST SERVER PORTAL:")
    print("  -> Web Application:        http://localhost:8000")
    print("  -> Frontend Dev Server:    http://localhost:5173")
    print("  -> Interactive API Docs:   http://localhost:8000/docs")
    print("=" * 70 + "\n")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[os.path.join(backend_dir, "app")],
        reload_excludes=["*.db", "*.db-journal", "*.sqlite", "*.log", "uploads/*", "faiss_index/*"]
    )
