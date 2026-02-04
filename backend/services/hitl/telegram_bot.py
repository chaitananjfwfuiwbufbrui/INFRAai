import os
import requests
import json
import sqlite3
from typing import Optional
from services.schemas import OpsDecision

# Env vars
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "mock-token")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "mock-chat-id")
API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

DB_NAME = "data/nodes.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def notify_decision(alert: dict, decision: OpsDecision, alert_id: int):
    """
    Send structured alert + decision to Telegram for approval.
    """
    text = (
        f"🚨 *{alert['severity'].upper()} ALERT* 🚨\n\n"
        f"📍 *Resource:* `{alert['resource']}`\n"
        f"📉 *Metric:* `{alert['metric']}` = `{alert['value']}`\n\n"
        f"🤖 *Gemini Recommendation:*\n"
        f"Action: `{decision.recommended_action}`\n"
        f"Confidence: `{decision.confidence}`\n"
        f"Reason: _{decision.reasoning}_\n\n"
        f"Reply with:\n"
        f"`APPROVE {alert_id}` to execute\n"
        f"`REJECT {alert_id}` to ignore\n"
        f"`STOP` to kill autonomy"
    )
    
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown"
    }

    try:
        # Check if we are in a real env or test
        if TELEGRAM_BOT_TOKEN != "mock-token":
            requests.post(API_URL, json=payload, timeout=5)
        else:
            print(f"[MOCK TELEGRAM] Sent to {TELEGRAM_CHAT_ID}: {text}")
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")


def check_kill_switch() -> bool:
    """Check if the global kill switch is active."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT value FROM ops_control_flags WHERE key = 'kill_switch'")
    row = cur.fetchone()
    conn.close()
    return row and row["value"] == "active"


def process_telegram_update(update: dict):
    """
    Process incoming webhook from Telegram.
    Parse text for commands: STOP, APPROVE <id>, REJECT <id>.
    """
    message = update.get("message", {})
    text = message.get("text", "").strip()
    chat_id = message.get("chat", {}).get("id")
    
    if not text:
        return

    response_text = "Did not understand command."

    # 1. KILL CONTROL
    if "STOP" in text.upper():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO ops_control_flags (key, value) VALUES ('kill_switch', 'active')")
        conn.commit()
        conn.close()
        response_text = "🛑 AUTONOMY STOPPED. All future actions halted until manual reset."

    # 2. APPROVAL FLOW
    elif text.upper().startswith("APPROVE"):
        try:
            alert_id = int(text.split()[1])
            _update_alert_status(alert_id, "approved")
            # Logic to trigger ActionExecutor would go here (Phase 8)
            response_text = f"✅ Alert {alert_id} APPROVED. Action executing..."
        except (IndexError, ValueError):
            response_text = "Usage: APPROVE <alert_id>"

    # 3. REJECTION FLOW
    elif text.upper().startswith("REJECT"):
        try:
            alert_id = int(text.split()[1])
            _update_alert_status(alert_id, "rejected")
            response_text = f"❌ Alert {alert_id} REJECTED."
        except (IndexError, ValueError):
            response_text = "Usage: REJECT <alert_id>"

    # Reply to user
    _send_reply(chat_id or TELEGRAM_CHAT_ID, response_text)


def _update_alert_status(alert_id: int, status: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE ops_alerts SET status = ? WHERE id = ?", (status, alert_id))
    conn.commit()
    conn.close()


def _send_reply(chat_id, text):
    if TELEGRAM_BOT_TOKEN == "mock-token":
        print(f"[MOCK TELEGRAM] Reply to {chat_id}: {text}")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text})
    except Exception as e:
        print(f"Failed to reply: {e}")
