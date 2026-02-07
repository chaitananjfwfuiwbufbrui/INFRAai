
import sqlite3
import json
import os
from typing import Dict, List, Optional

DB_NAME = "data/nodes.db"

class DeploymentRegistry:
    def __init__(self):
        self.db_path = DB_NAME

    def _get_conn(self):
        return sqlite3.connect(self.db_path)

    def register_deployment(self, run_id: str, terraform_dir: str, state_file_path: str, user_id: str = "system") -> int:
        """Register a new deployment and return its DB ID."""
        conn = self._get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO deployments (run_id, user_id, status, terraform_dir, state_file_path)
                VALUES (?, ?, ?, ?, ?)
            """, (run_id, user_id, "active", terraform_dir, state_file_path))
            deployment_id = cur.lastrowid
            conn.commit()
            return deployment_id
        finally:
            conn.close()

    def register_resources(self, deployment_id: int, resources: List[Dict]):
        """Register resources for a deployment."""
        conn = self._get_conn()
        cur = conn.cursor()
        try:
            for params in resources:
                cur.execute("""
                    INSERT INTO resources (deployment_id, resource_type, resource_name, resource_id, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    deployment_id,
                    params["type"],
                    params["name"],
                    params["id"],
                    json.dumps(params["metadata"])
                ))
            conn.commit()
        finally:
            conn.close()

    def get_deployment_by_resource(self, resource_name: str) -> Optional[Dict]:
        """Find deployment info by resource name."""
        conn = self._get_conn()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        try:
            # Join required tables
            cur.execute("""
                SELECT d.run_id, d.terraform_dir, d.state_file_path, r.resource_type, r.metadata
                FROM resources r
                JOIN deployments d ON r.deployment_id = d.id
                WHERE r.resource_name = ? OR r.resource_id = ?
                ORDER BY d.created_at DESC
                LIMIT 1
            """, (resource_name, resource_name))
            
            row = cur.fetchone()
            if row:
                return {
                    "run_id": row["run_id"],
                    "terraform_dir": row["terraform_dir"],
                    "state_file_path": row["state_file_path"],
                    "resource_type": row["resource_type"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {}
                }
            return None
        finally:
            conn.close()
