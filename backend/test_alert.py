import requests
import sys
import time

def test_alert():
    # Try 127.0.0.1 instead of localhost
    url = "http://127.0.0.1:8000/demo/simulate-alert"
    params = {
        "resource_name": "test-vm-01",
        "severity": "CRITICAL"
    }
    
    print(f"Testing connection to {url}...", flush=True)
    print("Waiting for response (timeout 30s)...", flush=True)
    
    start_time = time.time()
    try:
        response = requests.post(url, params=params, timeout=30)
        elapsed = time.time() - start_time
        print(f"Status Code: {response.status_code} (took {elapsed:.2f}s)", flush=True)
        
        if response.status_code == 200:
            print("✅ Alert sent successfully!", flush=True)
            print("Response JSON:", response.json(), flush=True)
        else:
            print(f"❌ Failed. Response: {response.text}", flush=True)
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 30s. The backend might be hanging on the Telegram API call.", flush=True)
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error. Is the backend running?", flush=True)
    except Exception as e:
        print(f"❌ Unexpected error: {e}", flush=True)

if __name__ == "__main__":
    test_alert()
