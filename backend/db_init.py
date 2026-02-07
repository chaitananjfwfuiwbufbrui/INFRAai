import sqlite3
import json

import os

DB_NAME = "C:\\Users\\Venkata Chaitanya\\Desktop\\INFRAai\\backend\\data\\nodes.db"

def init_db():
    os.makedirs(os.path.dirname(DB_NAME), exist_ok=True)
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        category TEXT NOT NULL,
        cloud TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT,
        connections TEXT
    );

    CREATE TABLE IF NOT EXISTS ops_alerts (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        policy_name     TEXT,
        resource        TEXT,
        resource_type   TEXT,
        cloud           TEXT DEFAULT 'gcp',
        metric          TEXT,
        value           REAL,
        severity        TEXT,
        decision_json   TEXT,
        status          TEXT DEFAULT 'pending',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ops_alerts_status ON ops_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_ops_alerts_resource_type ON ops_alerts(resource_type);

    CREATE TABLE IF NOT EXISTS deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        terraform_dir TEXT,
        state_file_path TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_deployments_run_id ON deployments(run_id);

    CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deployment_id INTEGER REFERENCES deployments(id),
        resource_type TEXT,
        resource_name TEXT,
        resource_id TEXT,
        metadata JSON, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_resources_name ON resources(resource_name);

    CREATE TABLE IF NOT EXISTS ops_control_flags (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)

    conn.commit()
    conn.close()
init_db()