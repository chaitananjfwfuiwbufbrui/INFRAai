import requests
import sys
import time

def simulate_alert():
    # Use 127.0.0.1 to avoid localhost resolution issues on some Windows systems
    url = "http://127.0.0.1:8000/demo/simulate-alert"
    params = {
        "resource_name": "production-db-01",
        "severity": "CRITICAL"
    }
    
    print(f"🚀 Sending fake alert to {url}...", flush=True)
    print("⏳ Waiting for backend to process (LLM + Telegram)... This might take 10-20 seconds.", flush=True)
    
    start_time = time.time()
    try:
        # Increase timeout to 60s as LLM/Telegram might be slow
        response = requests.post(url, params=params, timeout=60)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            print(f"✅ Alert sent successfully! (took {elapsed:.2f}s)", flush=True)
            print("Response:", response.json(), flush=True)
            print("\nPlease check your Telegram for the notification.")
        else:
            print(f"❌ Failed to send alert. Status: {response.status_code} (took {elapsed:.2f}s)", flush=True)
            print("Response:", response.text, flush=True)
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 60s.", flush=True)
        print("The backend received the request but took too long to respond.", flush=True)
        print("Possible causes:\n1. Telegram API is blocked/slow.\n2. LLM generation is slow.\n3. Verify your internet connection.", flush=True)
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the backend server.", flush=True)
        print("Make sure 'uvicorn main:app' is running on http://127.0.0.1:8000", flush=True)
    except Exception as e:
        print(f"❌ Unexpected error: {e}", flush=True)

if __name__ == "__main__":
    simulate_alert()
