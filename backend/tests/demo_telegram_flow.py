import os
import sys
import sqlite3
import requests
import json
from pathlib import Path

# Setup paths
BACKEND_DIR = Path(__file__).parent.parent
DB_PATH = BACKEND_DIR / "data" / "nodes.db"
RUN_ID = "demo_run_123"
RUN_DIR = BACKEND_DIR / "runs" / RUN_ID
RESOURCE_NAME = "demo-instance-1"
WEBHOOK_URL = "http://localhost:8000/ops/webhook"

def setup_dummy_deployment():
    print(f"[*] Setting up dummy deployment: {RUN_ID}...")
    
    # 1. Create Run Directory and File
    os.makedirs(RUN_DIR, exist_ok=True)
    tf_file = RUN_DIR / "main.tf"
    if not tf_file.exists():
        with open(tf_file, "w") as f:
            f.write(f'''
terraform {{
  required_providers {{
    google = {{
      source = "hashicorp/google"
    }}
  }}
}}

resource "google_compute_instance" "app" {{
  name         = "{RESOURCE_NAME}"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  
  boot_disk {{
    initialize_params {{
      image = "debian-cloud/debian-11"
    }}
  }}

  network_interface {{
    network = "default"
  }}
  
  labels = {{
    environment = "dev"
    managed_by  = "terraform"
  }}
}}
''')
        print(f"    - Created {tf_file}")

    # 2. Register in Database
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Check if deployment exists
    cur.execute("SELECT id FROM deployments WHERE run_id = ?", (RUN_ID,))
    row = cur.fetchone()
    
    if row:
        deployment_id = row[0]
        print(f"    - Deployment already exists (ID: {deployment_id})")
    else:
        cur.execute("""
            INSERT INTO deployments (run_id, user_id, status, terraform_dir, state_file_path)
            VALUES (?, ?, ?, ?, ?)
        """, (RUN_ID, "system", "active", str(RUN_DIR), str(RUN_DIR / "terraform.tfstate")))
        deployment_id = cur.lastrowid
        conn.commit()
        print(f"    - Registered new deployment (ID: {deployment_id})")

    # Check if resource exists
    cur.execute("SELECT id FROM resources WHERE resource_name = ?", (RESOURCE_NAME,))
    if cur.fetchone():
        print(f"    - Resource {RESOURCE_NAME} already exists")
    else:
        cur.execute("""
            INSERT INTO resources (deployment_id, resource_type, resource_name, resource_id, metadata)
            VALUES (?, ?, ?, ?, ?)
        """, (
            deployment_id,
            "google_compute_instance",
            RESOURCE_NAME,
            RESOURCE_NAME, # Using name as ID for demo
            json.dumps({"zone": "us-central1-a"})
        ))
        conn.commit()
        print(f"    - Registered resource {RESOURCE_NAME}")
        
    conn.close()

def trigger_alert():
    print(f"[*] Triggering alert for {RESOURCE_NAME}...")
    
    # GCP Alert Payload Structure
    payload = {
        "incident": {
            "incident_id": "test-incident-12345",
            "resource_id": "1234567890",
            "resource_name": RESOURCE_NAME,
            "state": "open",
            "started_at": 1699999999,
            "policy_name": "CPU Usage High",
            "condition": {
                "name": "projects/my-project/alertPolicies/123/conditions/456",
                "displayName": "VM Instance - CPU utilization",
                "conditionThreshold": {
                    "filter": f"metric.type=\"compute.googleapis.com/instance/cpu/utilization\" resource.type=\"gce_instance\" metric.label.instance_name=\"{RESOURCE_NAME}\"",
                    "comparison": "COMPARISON_GT",
                    "thresholdValue": 0.8,
                    "duration": "60s",
                    "trigger": {
                        "count": 1
                    }
                },
                "metricType": "compute.googleapis.com/instance/cpu/utilization",
                "currentValue": 0.95
            },
            "resource": {
                "type": "gce_instance",
                "labels": {
                    "instance_name": RESOURCE_NAME,
                    "project_id": "my-project",
                    "zone": "us-central1-a"
                }
            },
            "url": "https://console.cloud.google.com/monitoring/alerting/incidents/test?project=my-project",
            "severity": "CRITICAL"
        },
        "version": "1.2"
    }

    try:
        response = requests.post(WEBHOOK_URL, json=payload)
        print(f"    - Response Code: {response.status_code}")
        print(f"    - Response Body: {response.text}")
        
        if response.status_code == 200:
            print("\n[SUCCESS] Alert sent! check your Telegram.")
            print("You can now reply to the Telegram message with instructions like:")
            print("  'Scale it up to n1-standard-1'")
        else:
            print("\n[ERROR] Failed to send alert.")
            
    except Exception as e:
        print(f"\n[ERROR] Could not connect to webhook: {e}")
        print("Make sure the backend server is running on port 8000.")

if __name__ == "__main__":
    setup_dummy_deployment()
    trigger_alert()
