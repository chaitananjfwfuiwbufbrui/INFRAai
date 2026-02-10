import os
import sqlite3
from telegram import Bot  # Fix: Import Bot directly
from telegram.constants import ParseMode  # Optional: for better parse mode handling
from services.schemas import OpsDecision
from services.schemas import OpsDecision
from services.action_executor import ActionExecutor
from models.action_types import ActionRequest, ActionType
from typing import Optional
import json
from dotenv import load_dotenv

load_dotenv()

# Env vars
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

print(f"DEBUG: TELEGRAM_BOT_TOKEN loaded: {bool(TELEGRAM_BOT_TOKEN)}")
print(f"DEBUG: TELEGRAM_CHAT_ID loaded: {TELEGRAM_CHAT_ID}")

DB_NAME = "data/nodes.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

async def notify_decision(alert: dict, decision: OpsDecision, alert_id: int):
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
        f"Reply 1 (approve) / 2 (ignore) / STOP AUTONOMY"
    )
    
    try:
        if TELEGRAM_BOT_TOKEN == "mock-token":
            print(f"[MOCK TELEGRAM] Sent to {TELEGRAM_CHAT_ID}: {text}")
            return
        
        bot = Bot(token=TELEGRAM_BOT_TOKEN)  # Fix: Use Bot directly
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=text,
            parse_mode=ParseMode.MARKDOWN  # Better: use constant instead of string
        )
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

async def process_telegram_update(update: dict):
    """
    Process incoming webhook from Telegram.
    Parse text for commands: STOP AUTONOMY, 1, 2.
    """
    message = update.get("message", {})
    text = message.get("text", "").strip()
    chat_id = message.get("chat", {}).get("id")
    
    if not text:
        return
    
    response_text = "Did not understand command."
    
    # 1. KILL CONTROL
    if "STOP AUTONOMY" in text.upper():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO ops_control_flags (key, value) VALUES ('kill_switch', 'active')")
        conn.commit()
        conn.close()
        response_text = "🛑 AUTONOMY STOPPED. All future actions halted until manual reset."
    
    # 2. APPROVAL FLOW (1 = Approve latest pending)
    elif text == "1":
        alert = _get_latest_pending_alert()
        if alert:
            alert_id = alert["id"]
            _update_alert_status(alert_id, "approved")
            _update_alert_status(alert_id, "approved")
            
            # --- EXECUTE ACTION (Phase 1) ---
            try:
                decision_data = json.loads(alert["decision_json"])
                
                # Check kill switch before executing
                if check_kill_switch():
                    response_text = f"⚠️ Alert {alert_id} APPROVED, but AUTONOMY IS STOPPED. Action NOT executed."
                else:
                    executor = ActionExecutor()
                    
                    # Convert decision to ActionRequest
                    req = ActionRequest(
                        action_type=ActionType(decision_data.get("recommended_action")),
                        resource_id=alert["resource"],
                        parameters={}, # Parameters like node_count would come from decision or be inferred
                        confidence=decision_data.get("confidence", 0.0),
                        reason=decision_data.get("reasoning", "")
                    )
                    
                    result = executor.execute_action(req)
                    
                    if result["success"]:
                       response_text = f"✅ Alert {alert_id} APPROVED & EXECUTED.\nRun ID: {result.get('original_run_id')}"
                       _update_alert_status(alert_id, "executed")
                    else:
                       response_text = f"⚠️ Alert {alert_id} APPROVED but execution failed.\nError: {result.get('error')}"
            
            except Exception as e:
                response_text = f"⚠️ Execution Error: {str(e)}"
        else:
            response_text = "⚠️ No pending alerts found to approve."
    
    # 3. REJECTION FLOW (2 = Ignore latest pending)
    elif text == "2":
        alert = _get_latest_pending_alert()
        if alert:
            alert_id = alert["id"]
            _update_alert_status(alert_id, "rejected")
            response_text = f"❌ Alert {alert_id} REJECTED (Ignored)."
        else:
            response_text = "⚠️ No pending alerts found to reject."
    
    # 4. FREEFORM CONVERSATIONAL FLOW (Demo / Advanced)
    else:
        # User sent text that isn't a strict command. Treat as instruction.
        alert = _get_latest_alert_context()
        if alert:
            resource_id = alert["resource"]
            # Reply acknowledging receipt
            await _send_reply(chat_id or TELEGRAM_CHAT_ID, f"🤖 Processing instruction for {resource_id}: '{text}'...")
            
            try:
                executor = ActionExecutor()
                result = executor.execute_freeform(resource_id, text)
                
                if result["success"]:
                    response_text = f"✅ Success!\n{result['message']}\nRun ID: {result.get('original_run_id')}"
                else:
                    response_text = f"❌ Failed to execute instruction.\nError: {result.get('error')}"
            except Exception as e:
                response_text = f"⚠️ Error processing instruction: {str(e)}"
        else:
            response_text = "⚠️ No active or recent alert context found to apply this instruction to."

    # Reply to user
    await _send_reply(chat_id or TELEGRAM_CHAT_ID, response_text)

def _get_latest_pending_alert():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM ops_alerts WHERE status = 'pending' ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row

def _get_latest_alert_context():
    """Get the latest alert (any status) to use as context for chat."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM ops_alerts ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row

def _update_alert_status(alert_id: int, status: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE ops_alerts SET status = ? WHERE id = ?", (status, alert_id))
    conn.commit()
    conn.close()

async def _send_reply(chat_id, text):
    if TELEGRAM_BOT_TOKEN == "mock-token":
        print(f"[MOCK TELEGRAM] Reply to {chat_id}: {text}")
        return
    
    try:
        bot = Bot(token=TELEGRAM_BOT_TOKEN)  # Fix: Use Bot directly
        await bot.send_message(chat_id=chat_id, text=text)
    except Exception as e:
        print(f"Failed to reply: {e}")