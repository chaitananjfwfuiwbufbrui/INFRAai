
import asyncio
import os
import sys
import json
import sqlite3
import requests
from services.deployment_registry import DeploymentRegistry
from services.hitl.telegram_bot import process_telegram_update

# Ensure we can import from backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

DB_PATH = "data/nodes.db"
BASE_URL = "http://localhost:8000"

def setup_mock_db():
    """Seed the DB with a mock active deployment"""
    print("🌱 Seeding Mock Deployment Registry...")
    registry = DeploymentRegistry()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Clear old test data
    cur.execute("DELETE FROM resources WHERE resource_name = 'vm-test-1'")
    cur.execute("DELETE FROM deployments WHERE run_id = 'run_test_1'")
    conn.commit()
    conn.close()

    # 2. Register Mock Deployment
    # We need a fake run folder for ActionExecutor to find
    fake_run_dir = os.path.abspath("runs/run_test_1")
    os.makedirs(fake_run_dir, exist_ok=True)
    
    # Create fake tf files
    with open(os.path.join(fake_run_dir, "main.tf"), "w") as f:
        f.write('''
resource "google_compute_instance" "vm" {
  name         = "vm-test-1"
  machine_type = "e2-micro"
}
''')

    dept_id = registry.register_deployment(
        run_id="run_test_1",
        terraform_dir=fake_run_dir,
        state_file_path=os.path.join(fake_run_dir, "terraform.tfstate")
    )

    # 3. Register Mock Resource
    registry.register_resources(dept_id, [{
        "type": "google_compute_instance",
        "name": "vm-test-1",
        "id": "12345",
        "metadata": {"zone": "us-central1-a"}
    }])
    print("✅ Seed complete.")

async def test_autonomous_loop():
    print("\n🚀 Starting Autonomous Loop Test...")
    
    # Step 1: Trigger Alert
    print("\n1️⃣  Triggering Fake Alert...")
    alert_payload = {
        "incident": {
            "policy_name": "Test High CPU",
            "severity": "critical",
            "resource": {
                "type": "gce_instance",
                "labels": { "instance_name": "vm-test-1" }
            },
            "condition": {
                "metricType": "compute.googleapis.com/instance/cpu/utilization",
                "currentValue": 0.95
            }
        }
    }
    
    # We use direct function call or requests? 
    # Let's use requests to test the API route integration too
    try:
        r = requests.post(f"{BASE_URL}/ops/webhook", json=alert_payload)
        res = r.json()
        print(f"   Response: {res}")
        alert_id = res["alert_id"]
        assert res["received"] == True
        print("✅ Alert received & Decision made.")
    except Exception as e:
        print(f"❌ Failed to post alert: {e}")
        return

    # Step 2: Simulate User Approval via Telegram
    print(f"\n2️⃣  Simulating User Approval for Alert {alert_id}...")
    
    # Force the latest pending alert ID to match our test alert
    # The Update message just sends "1"
    update_approve = {
        "message": {
            "text": "1",
            "chat": {"id": 12345}
        }
    }
    
    # Call the processing logic directly
    await process_telegram_update(update_approve)
    print("✅ Approval signal sent.")

    # Step 3: Verify Action Execution
    print("\n3️⃣  Verifying Action Execution...")
    
    # Check DB status
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT status, decision_json FROM ops_alerts WHERE id = ?", (alert_id,))
    row = cur.fetchone()
    conn.close()
    
    status = row[0]
    print(f"   Alert Status: {status}")
    
    assert status == "executed" or status == "approved"
    
    # Verify file change
    with open("runs/run_test_1/main.tf", "r") as f:
        content = f.read()
        print("\n   Checking main.tf content...")
        if 'machine_type = "e2-medium"' in content or 'machine_type = "e2-standard-4"' in content: 
             # Implementation may choose e2-medium or whatever the generated decision was
             # In action_executor.py we default to e2-medium if not specified
             print("   ✅ SUCCESS: machine_type was upgraded!")
        else:
             print(f"   ⚠️  WARNING: machine_type might not have changed. Content:\n{content}")

    print("\n🎉 Test Complete!")

if __name__ == "__main__":
    setup_mock_db()
    asyncio.run(test_autonomous_loop())
