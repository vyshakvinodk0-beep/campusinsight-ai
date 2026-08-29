import sqlite3
import os
import logging

logger = logging.getLogger("migrations")

def run_migrations(db_path: str = "campusinsight.db"):
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if category column exists in recommendation_items
        cursor.execute("PRAGMA table_info(recommendation_items)")
        columns = [column[1] for column in cursor.fetchall()]
        if "category" not in columns:
            cursor.execute("ALTER TABLE recommendation_items ADD COLUMN category VARCHAR DEFAULT 'EVIDENCE_BASED'")
            conn.commit()
            print("[MIGRATION SUCCESS] Added 'category' column to 'recommendation_items' table.")
    except Exception as e:
        print(f"[MIGRATION ERROR] Failed to run migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migrations()
