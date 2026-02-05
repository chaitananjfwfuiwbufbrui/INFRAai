
import asyncio
import os
import sys

# Ensure we can import from backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.hitl.telegram_bot import notify_decision, process_telegram_update
from services.schemas import OpsDecision

# Mock Data
MOCK_ALERT = {
    "severity": "critical",
    "resource": "backend-vm-1",
    "metric": "cpu_utilization",
    "value": "92%",
    "policy_name": "High CPU Policy",
    "resource_type": "gcp_compute_instance",
    "cloud": "gcp",
    "status": "pending"
}

MOCK_DECISION = OpsDecision(
    severity="critical",
    recommended_action="scale_up_vm",
    requires_approval=True,
    confidence=0.95,
    reasoning="CPU has been > 90% for 5 minutes. Scaling up is safe."
)

async def test_mock_flow():
    print("--- TEST 1: Sending Notification (Mock Mode) ---")
    # This should print [MOCK TELEGRAM] log
    await notify_decision(MOCK_ALERT, MOCK_DECISION, alert_id=999)
    print("\n✅ Notification test complete.\n")

    print("--- TEST 2: Processing Webhook (Approve) ---")
    # Simulate Telegram update payload for "1" (Approve)
    update_approve = {
        "message": {
            "text": "1",
            "chat": {"id": 123456789}
        }
    }
    await process_telegram_update(update_approve)
    print("\n✅ Approve webhook test complete.\n")

    print("--- TEST 3: Processing Webhook (Stop Autonomy) ---")
    # Simulate Telegram update payload for "STOP AUTONOMY"
    update_stop = {
        "message": {
            "text": "STOP AUTONOMY",
            "chat": {"id": 123456789}
        }
    }
    await process_telegram_update(update_stop)
    print("\n✅ Stop Autonomy webhook test complete.\n")

if __name__ == "__main__":
    # Ensure dependencies are installed
    try:
        import telegram
    except ImportError:
        print("❌ Error: python-telegram-bot is not installed.")
        print("Run: pip install python-telegram-bot")
        sys.exit(1)

    # Pre-test: Insert a dummy pending alert so the "Approve" test has something to target
    import sqlite3
    conn = sqlite3.connect("data/nodes.db")
    cur = conn.cursor()
    # Ensure tables exist (just in case db_init wasn't run)
    # But usually db_init should be run. We'll assume it is or the run_command above fixes it.
    
    # Insert dummy alert
    print("Inserting dummy pending alert for testing...")
    cur.execute("""
        INSERT INTO ops_alerts (policy_name, resource, resource_type, cloud, metric, value, severity, decision_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    """, ("Test Policy", "backend-vm-1", "gcp_compute_instance", "gcp", "cpu", 95.0, "critical", "{}",))
    conn.commit()
    conn.close()

    print("Running Telegram Integration Tests (Mock Mode)...\n")
    asyncio.run(test_mock_flow())
