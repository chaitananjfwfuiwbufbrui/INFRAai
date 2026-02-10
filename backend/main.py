from fastapi import FastAPI, Query, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import sqlite3
import json
import os
from fastapi import HTTPException
from services.canvas_compiler import compile_to_canvas
from services.graph_generator import InfraGraphGenerator
from services.planner_agent import PlannerAgent
from fastapi import Depends
from auth.clerk import get_current_user
from pydantic import BaseModel
from services.terraform_generator import TerraformGenerator
from fastapi.responses import StreamingResponse

from services.terraform_executor import *
# ---------------- APP ----------------
app = FastAPI(title="Cloud Node Registry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "data/nodes.db"
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

generator = InfraGraphGenerator()
planner = PlannerAgent()

# ---------------- DB ----------------
def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_nodes_from_db(cloud=None, category=None, label=None):
    conn = get_db()
    cur = conn.cursor()

    query = "SELECT * FROM nodes WHERE 1=1"
    params = []

    if cloud:
        query += " AND cloud = ?"
        params.append(cloud)

    if category:
        query += " AND category = ?"
        params.append(category)

    if label:
        query += " AND label LIKE ?"
        params.append(f"%{label}%")

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    nodes = []
    for row in rows:
        nodes.append({
            "id": row["id"],
            "label": row["label"],
            "category": row["category"],
            "cloud": row["cloud"],
            "icon": row["icon"],
            "description": row["description"],
            "connections": json.loads(row["connections"]) if row["connections"] else {
                "canConnectTo": [],
                "canReceiveFrom": []
            }
        })

    return nodes


# ---------------- NODES API ----------------
@app.get("/nodes")
def get_nodes(
    cloud: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    label: Optional[str] = Query(None),
):
    return fetch_nodes_from_db(cloud, category, label)


@app.post("/generate-graph")
async def generate_graph(
    prompt: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user),  # 👈 Clerk auth
):
    try:
        nodes = fetch_nodes_from_db()

        image_path = None
        plan = None

        # ---------- GENERATE PLAN ----------
        if prompt:
            plan = planner.plan(prompt)

        # ---------- IMAGE FLOW ----------
        if image:
            image_path = os.path.join(UPLOAD_DIR, image.filename)
            with open(image_path, "wb") as f:
                f.write(await image.read())

            logical_graph = generator.generate(
                user_prompt=prompt or "",
                available_nodes=nodes,
                input_type="image",
                image_path=image_path,
                plan=plan
            )

        # ---------- TEXT FLOW ----------
        else:
            if not prompt:
                raise HTTPException(status_code=400, detail="Either prompt or image must be provided")

            logical_graph = generator.generate(
                user_prompt=prompt,
                available_nodes=nodes,
                input_type="text",
                plan=plan
            )

        canvas_graph = compile_to_canvas(logical_graph["graph"])

        # ---------- STORE USER REQUEST ----------
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO user_requests (
                user_id, prompt, image_path, summary, graph_json
            ) VALUES (?, ?, ?, ?, ?)
        """, (
            user_id,
            prompt,
            image_path,
            logical_graph["summary"],
            json.dumps(canvas_graph)
        ))

        conn.commit()
        conn.close()

        return {
            "plan": plan.dict() if plan else None,
            "summary": logical_graph["summary"],
            "graph": canvas_graph
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph generation failed: {str(e)}")
    

from services.llm_terraform_generator import LLMTerraformGenerator
import uuid
from datetime import datetime

class TerraformGenerateRequest(BaseModel):
    infra_spec: dict
    monitoring_policies: Optional[list] = []

@app.post("/generate_terraform")
def generate_terraform(req: TerraformGenerateRequest):
    # Old logic:
    # tg = TerraformGenerator() 
    # result = tg.generate_and_store(req.infra_spec, req.monitoring_policies)
    
    # New logic using LLM Generator:
    llm_tg = LLMTerraformGenerator()
    
    # Create run ID
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    uid = uuid.uuid4().hex[:6]
    run_id = f"run_{ts}_{uid}"
    
    # Webhook URL
    webhook_url = os.getenv("webhook", "http://localhost:8000/ops/webhook")

    # Convert infra_spec to a prompt string
    # We can just dump the JSON and ask LLM to generate based on it
    prompt = f"Generate Terraform code for the following infrastructure specification:\n{json.dumps(req.infra_spec, indent=2)}\n"
    prompt += f"\nIMPORTANT: Set the default value of the `ops_webhook_url` variable to '{webhook_url}'.\n"

    if req.monitoring_policies:
         prompt += f"\nAlso include the following monitoring policies:\n{json.dumps(req.monitoring_policies, indent=2)}"

    result = llm_tg.generate(run_id=run_id, user_request=prompt)
    
    if not result["success"]:
         raise HTTPException(status_code=500, detail=f"LLM Generation failed: {result.get('error')}")

    # Read the generated files to return them
    run_dir = result["run_dir"]
    files = {}
    for filename in os.listdir(run_dir):
        if filename.endswith(".tf"):
            with open(os.path.join(run_dir, filename), "r") as f:
                files[filename] = f.read()

    return {
        "run_id": run_id,
        "files": files.keys(), # The frontend expects a list of filenames or dict? Previous return was {"files": list(files.keys())}
        # Wait, the previous return was: "files": list(files.keys())
        # Let's check the previous code... YES.
        "files": list(files.keys()) 
    }



@app.get("/{run_id}")
def load_terraform_files(run_id: str):
    run_path = os.path.join("runs", run_id)

    if not os.path.exists(run_path):
        return {"error": "Run not found"}

    files = {}
    for filename in os.listdir(run_path):
        if filename.endswith(".tf"):
            with open(os.path.join(run_path, filename), "r") as f:
                files[filename] = f.read()

    return {
        "run_id": run_id,
        "files": files
    }


class TerraformExecuteRequest(BaseModel):
    run_id: str
    action: str
    project_id: str
    sa_key_json: str
    auto_approve: bool = False
@app.post("/execute")
def execute_terraform(req: TerraformExecuteRequest):
    run_path = os.path.join("runs", req.run_id)

    if not os.path.exists(run_path):
        raise HTTPException(status_code=404, detail="Run not found")

    executor = TerraformExecutor(
        run_path=run_path,
        project_id=req.project_id,
        sa_key_json=req.sa_key_json
    )

    # Run in background thread
    import threading

    thread = threading.Thread(
        target=executor.run,
        kwargs={
            "action": req.action,
            "auto_approve": req.auto_approve
        },
        daemon=True
    )
    thread.start()

    return {
        "status": "started",
        "platform": "gcp",
        "run_id": req.run_id,
        "action": req.action,
        "monitor": {
            "status_endpoint": f"/runs/{req.run_id}/status",
            "logs_endpoint": f"/runs/{req.run_id}/logs"
        }
    }

@app.get("/runs/{run_id}/status")
def get_run_status(run_id: str):
    """Get current status of a terraform run."""
    run_path = os.path.join("runs", run_id)
    status_path = os.path.join(run_path, "status.json")
    
    if not os.path.exists(run_path):
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    
    if not os.path.exists(status_path):
        return {
            "run_id": run_id,
            "status": "initializing",
            "phase": "starting",
            "updated_at": time.time()
        }
    
    try:
        with open(status_path, "r") as f:
            status_data = json.load(f)
        
        # Add terraform state if execution completed
        tfstate_path = os.path.join(run_path, "terraform.tfstate")
        if status_data.get("status") == "completed" and os.path.exists(tfstate_path):
            with open(tfstate_path, "r") as f:
                status_data["tfstate"] = json.load(f)
        
        # Add verification result if available
        metadata_path = os.path.join(run_path, "metadata.json")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    metadata = json.load(f)
                    if "verification" in metadata:
                        status_data["verification"] = metadata["verification"]
            except json.JSONDecodeError:
                pass
        
        status_data["run_id"] = run_id
        return status_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read status: {str(e)}")

@app.get("/runs/{run_id}/logs")
def get_run_logs(run_id: str):
    """Get execution logs for a terraform run."""
    run_path = os.path.join("runs", run_id)
    log_path = os.path.join(run_path, "executor.log")
    
    if not os.path.exists(run_path):
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    
    if not os.path.exists(log_path):
        return {
            "run_id": run_id,
            "logs": "Execution not started yet. Logs will appear once execution begins.",
            "lines": []
        }
    
    try:
        with open(log_path, "r") as f:
            logs = f.read()
        
        return {
            "run_id": run_id,
            "logs": logs,
            "lines": logs.split("\n") if logs else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read logs: {str(e)}")

@app.get("/runs/{run_id}/terminal")
def stream_terminal(run_id: str):
    log_path = os.path.join("runs", run_id, "executor.log")
    status_path = os.path.join("runs", run_id, "status.json")

    def event_stream():
        last_pos = 0
        while True:
            if os.path.exists(log_path):
                with open(log_path, "r") as f:
                    f.seek(last_pos)
                    data = f.read()
                    last_pos = f.tell()
                    if data:
                        yield f"data: {data}\n\n"

            if os.path.exists(status_path):
                with open(status_path, "r") as f:
                    status = json.load(f)
                    if status["status"] in ("completed", "failed"):
                        yield "event: end\ndata: done\n\n"
                        break

    return StreamingResponse(event_stream(), media_type="text/event-stream")


from services.hitl.telegram_bot import notify_decision, process_telegram_update
from services.ops_decision_agent import OpsDecisionAgent

# --------------------------------------------------
# OPS WEBHOOK (PHASE 5)
# --------------------------------------------------
def normalize_alert(payload: dict) -> dict:
    """Normalize GCP alert payload to flat dictionary."""
    incident = payload.get("incident", {})
    condition = incident.get("condition", {})
    resource = incident.get("resource", {})
    
    return {
        "policy_name": incident.get("policy_name"),
        "resource": resource.get("labels", {}).get("instance_name"),
        "metric": condition.get("metricType", "").split("/")[-1],
        "value": condition.get("currentValue"),
        "severity": incident.get("severity", "warning").lower(),
        "cloud": "gcp",
        "resource_type": resource.get("type", "unknown")
    }

@app.post("/ops/webhook")
async def ops_webhook(payload: dict = Body(...)):
    """
    Receive alerts from GCP. Analyze with Gemini. Ask Human if critical.
    """
    try:
        print("Received payload:", payload)
        normalized = normalize_alert(payload)
        
        # Phase 6: Autonomous Decision
        decision = OpsDecisionAgent.decide(normalized)
        
        # Save to DB
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO ops_alerts (
                policy_name, resource, resource_type, cloud, metric, value, severity, decision_json, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        """, (
            normalized["policy_name"],
            normalized["resource"],
            normalized["resource_type"],
            normalized["cloud"],
            normalized["metric"],
            normalized["value"],
            normalized["severity"],
            decision.json()
        ))
        alert_id = cur.lastrowid
        conn.commit()
        conn.close()
        
        # Phase 7: HITL Notification
        if True:
            print("Sending notification to Telegram")
            await notify_decision(normalized, decision, alert_id)

        return {
            "received": True, 
            "alert_id": alert_id,
            "decision": decision.dict()
        }

    except Exception as e:
        print(f"Webhook error: {e}")
        return {"received": False, "error": str(e)}


# --------------------------------------------------
# TELEGRAM WEBHOOK (PHASE 7)
# --------------------------------------------------
@app.post("/telegram/webhook")
async def telegram_webhook(update: dict = Body(...)):
    """
    Receive updates from Telegram (replies, commands).
    """
    try:
        print(f"[TELEGRAM UPDATE] {update}")
        await process_telegram_update(update)
        return {"ok": True}
    except Exception as e:
        print(f"Telegram webhook error: {e}")
        return {"ok": False}

# --------------------------------------------------
# DEMO API (For testing Telegram Integration)
# --------------------------------------------------
@app.post("/demo/simulate-alert")
async def demo_simulate_alert(resource_name: str = "demo-vm-1", severity: str = "CRITICAL"):
    """
    Simulate a GCP alert to trigger the Telegram bot.
    """
    import requests
    
    # --------------------------------------------------
    # DEMO API (For testing Telegram Integration)
    # --------------------------------------------------
    # Removed DB resource creation logic as requested.
    # Just simulates the alert payload.
    
    # 2. Trigger Webhook
    payload = {
        "incident": {
            "incident_id": f"test-{uuid.uuid4().hex}",
            "resource_id": "1234567890",
            "resource_name": resource_name,
            "state": "open",
            "policy_name": "Demo High CPU Alert",
            "condition": {
                "name": "projects/demo/alertPolicies/123",
                "displayName": "VM Instance - CPU utilization",
                "conditionThreshold": {
                    "filter": f"metric.type=\"compute.googleapis.com/instance/cpu/utilization\" resource.type=\"gce_instance\" metric.label.instance_name=\"{resource_name}\"",
                    "comparison": "COMPARISON_GT",
                    "thresholdValue": 0.8,
                },
                "metricType": "compute.googleapis.com/instance/cpu/utilization",
                "currentValue": 0.95
            },
            "resource": {
                "type": "gce_instance",
                "labels": {
                    "instance_name": resource_name,
                    "project_id": "demo-project",
                    "zone": "us-central1-a"
                }
            },
            "severity": severity.upper()
        },
        "version": "1.2"
    }
    
    # Call our own webhook
    # Call our own webhook logic directly to avoid deadlock
    try:
        # requests.post is synchronous and blocks the event loop, causing a deadlock if the server has limited workers.
        # Direct async call is safer and faster.
        webhook_response = await ops_webhook(payload)
        return {
            "status": "sent", 
            "webhook_response": webhook_response,
            "simulated_payload": payload
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}

