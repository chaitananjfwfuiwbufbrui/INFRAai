import sqlite3
import json

DB_NAME = "nodes.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        category TEXT NOT NULL,
        cloud TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT,
        connections TEXT
    )
    """)

    conn.commit()
    conn.close()
init_db()