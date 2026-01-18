from fastapi import FastAPI, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import sqlite3
import json
import os
from fastapi import HTTPException
from services.canvas_compiler import compile_to_canvas
from services.graph_generator import InfraGraphGenerator
from fastapi import Depends
from auth.clerk import get_current_user
from pydantic import BaseModel
from services.terraform_generator import TerraformGenerator

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

        # ---------- IMAGE FLOW ----------
        if image:
            image_path = os.path.join(UPLOAD_DIR, image.filename)
            with open(image_path, "wb") as f:
                f.write(await image.read())

            logical_graph = generator.generate(
                user_prompt=prompt or "",
                available_nodes=nodes,
                input_type="image",
                image_path=image_path
            )

        # ---------- TEXT FLOW ----------
        else:
            if not prompt:
                raise HTTPException(status_code=400, detail="Either prompt or image must be provided")

            logical_graph = generator.generate(
                user_prompt=prompt,
                available_nodes=nodes,
                input_type="text"
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
            "summary": logical_graph["summary"],
            "graph": canvas_graph
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph generation failed: {str(e)}")
    

class TerraformGenerateRequest(BaseModel):
    infra_spec: dict
@app.post("/generate_terraform")
def generate_terraform(req: TerraformGenerateRequest):
    tg = TerraformGenerator()
    result = tg.generate_and_store(req.infra_spec)

    return {
        "run_id": result["run_id"],
        "files": result["files"]
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

    result = executor.run(
        action=req.action,
        auto_approve=req.auto_approve
    )

    return {
        "status": "success",
        "platform": "gcp",
        "run_id": req.run_id,
        "action": req.action,
        "summary": {
            "duration_seconds": result["duration_seconds"]
        },
        "outputs": result["outputs"],
        "destroy": {
            "endpoint": "/execute",
            "method": "POST",
            "payload": {
                "run_id": req.run_id,
                "action": "destroy",
                "auto_approve": True
            }
        }
    }