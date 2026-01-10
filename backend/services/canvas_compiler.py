import time
import random


NODE_WIDTH = 180
NODE_HEIGHT = 70


def generate_id(base):
    return f"{base}-{int(time.time() * 1000)}"


def auto_position(index, level=0):
    return {
        "x": level * 260,
        "y": 120 + index * 160
    }


def compile_to_canvas(logical_graph):
    id_map = {}
    canvas_nodes = []
    canvas_edges = []

    # --- group nodes by hierarchy level ---
    levels = {
        "VPC": 0,
        "Subnet": 1,
        "EC2": 2,
        "RDS": 2,
        "S3": 3
    }

    # ---------- Nodes ----------
    for idx, node in enumerate(logical_graph["nodes"]):
        label = node["data"]["label"]
        canvas_id = generate_id(label.lower())
        id_map[node["id"]] = canvas_id

        canvas_nodes.append({
            "id": canvas_id,
            "type": "gcpNode",  # UI node type
            "position": auto_position(idx, levels.get(label, 2)),
            "data": {
                "label": label,
                "category": node["data"]["category"],
                "icon": label.lower(),
                "configured": False,
                "config": {}
            },
            "measured": {
                "width": NODE_WIDTH,
                "height": NODE_HEIGHT
            }
        })

    # ---------- Edges ----------
    for edge in logical_graph["edges"]:
        canvas_edges.append({
            "id": f"xy-edge__{id_map[edge['source']]}-{id_map[edge['target']]}",
            "type": "smoothstep",
            "animated": True,
            "source": id_map[edge["source"]],
            "target": id_map[edge["target"]],
            "sourceHandle": "right",
            "targetHandle": "left"
        })

    return {
        "nodes": canvas_nodes,
        "edges": canvas_edges
    }
