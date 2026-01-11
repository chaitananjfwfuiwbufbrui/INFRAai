from fastapi import FastAPI, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import sqlite3
import json
import os
from fastapi import HTTPException
from services.canvas_compiler import compile_to_canvas
from services.graph_generator import InfraGraphGenerator

# ---------------- APP ----------------
app = FastAPI(title="Cloud Node Registry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "nodes.db"
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
):
    try:
        # Always fetch all nodes
        nodes = fetch_nodes_from_db()

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
                raise HTTPException(
                    status_code=400,
                    detail="Either prompt or image must be provided"
                )

            logical_graph = generator.generate(
                user_prompt=prompt,
                available_nodes=nodes,
                input_type="text"
            )

        # ---------- COMPILE TO CANVAS ----------
        canvas_graph = compile_to_canvas(logical_graph["graph"])

        return {
            "summary": logical_graph["summary"],
            "graph": canvas_graph
        }

    except HTTPException:
        # Let FastAPI handle expected client errors
        raise

    except Exception as e:
        # Catch unexpected server-side failures
        raise HTTPException(
            status_code=500,
            detail=f"Graph generation failed: {str(e)}"
        )
