from fastapi import FastAPI, Query
import sqlite3
import json
import requests
from typing import Optional

from services.canvas_compiler import compile_to_canvas
from fastapi.middleware.cors import CORSMiddleware
from services.graph_generator import InfraGraphGenerator
app = FastAPI(title="Cloud Node Registry API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "nodes.db"
generator = InfraGraphGenerator()

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/nodes")
def get_nodes(
    cloud: Optional[str] = Query(None, description="gcp | aws | azure"),
    category: Optional[str] = Query(None, description="compute | networking | storage | database | messaging | security"),
    label: Optional[str] = Query(None, description="Search by label")
):
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
            "icon": row["icon"],  # 👈 IMPORTANT
            "description": row["description"],
            "connections": json.loads(row["connections"]) if row["connections"] else {
                "canConnectTo": [],
                "canReceiveFrom": []
            }
        })

    return nodes
@app.post("/generate-graph")
def generate_graph(prompt: str):
    nodes = requests.get("http://localhost:8000/nodes").json()
    logical_graph = generator.generate(prompt, nodes)
    canvas_graph = compile_to_canvas(logical_graph["graph"])
    return {
        "summary": logical_graph["summary"],"graph": canvas_graph}