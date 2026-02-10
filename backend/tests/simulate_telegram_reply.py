import requests
import json
import os
from dotenv import load_dotenv

# Load env to get chat ID if available, else use dummy
load_dotenv()
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "123456789")
WEBHOOK_URL = "http://localhost:8000/telegram/webhook"

def simulate_reply(message_text):
    print(f"[*] Simulating Telegram user reply: '{message_text}'...")
    
    # Telegram Update Payload Structure
    payload = {
        "update_id": 999999,
        "message": {
            "message_id": 8888,
            "from": {
                "id": int(CHAT_ID),
                "is_bot": False,
                "first_name": "Demo",
                "username": "demo_user"
            },
            "chat": {
                "id": int(CHAT_ID),
                "type": "private"
            },
            "date": 1700000000,
            "text": message_text
        }
    }

    try:
        response = requests.post(WEBHOOK_URL, json=payload)
        
        if response.status_code == 200:
            print(f"    - Webhook received the update (Status: 200)")
            print(f"    - Backend should determine action now.")
            print(f"    - If TELEGRAM_BOT_TOKEN is valid, you will see the bot's reply in Telegram.")
            print(f"    - If not, check the backend logs for the 'ActionExecutor' output.")
        else:
            print(f"    - Failed to hit webhook. Status: {response.status_code}")
            print(f"    - Body: {response.text}")

    except Exception as e:
        print(f"    - Error connecting to backend: {e}")

if __name__ == "__main__":
    import sys
    # Allow command line arg for message, default to scaling instruction
    msg = "Scale it up to n1-standard-2"
    if len(sys.argv) > 1:
        msg = " ".join(sys.argv[1:])
        
    simulate_reply(msg)
