import os
import sys
import subprocess

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")

if not os.path.exists(venv_python):
    venv_python = sys.executable

print("\n" + "=" * 70)
print("  CAMPUSINSIGHT AI - LAUNCHING SERVER PORTAL...")
print("  -> Access Web Application: http://localhost:8000")
print("  -> Access Frontend Dev:    http://localhost:5173")
print("  -> Access API Docs:        http://localhost:8000/docs")
print("=" * 70 + "\n")

cmd = [venv_python, "run.py"] + sys.argv[1:]
subprocess.run(cmd, cwd=backend_dir)
