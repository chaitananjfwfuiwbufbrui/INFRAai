import sqlite3
import json

DB_NAME = "nodes.db"

nodes = [
    # ================== COMPUTE ==================
    {
        "id": "compute-engine",
        "label": "Compute Engine",
        "category": "compute",
        "cloud": "gcp",
        "icon": "Server",
        "description": "Virtual machines on GCP",
        "connections": {
            "canConnectTo": ["cloud-storage", "cloud-sql", "firestore", "pub-sub", "vpc"],
            "canReceiveFrom": ["load-balancer", "vpc", "cloud-nat"]
        }
    },
    {
        "id": "cloud-run",
        "label": "Cloud Run",
        "category": "compute",
        "cloud": "gcp",
        "icon": "Cloud",
        "description": "Serverless container platform",
        "connections": {
            "canConnectTo": ["cloud-storage", "cloud-sql", "firestore", "pub-sub", "secret-manager"],
            "canReceiveFrom": ["load-balancer", "pub-sub", "cloud-tasks"]
        }
    },
    {
        "id": "gke-cluster",
        "label": "GKE Cluster",
        "category": "compute",
        "cloud": "gcp",
        "icon": "Container",
        "description": "Managed Kubernetes cluster",
        "connections": {
            "canConnectTo": ["cloud-storage", "cloud-sql", "firestore", "pub-sub", "vpc"],
            "canReceiveFrom": ["load-balancer", "vpc"]
        }
    },

    # ================== NETWORKING ==================
    {
        "id": "vpc",
        "label": "VPC",
        "category": "networking",
        "cloud": "gcp",
        "icon": "Network",
        "description": "Virtual Private Cloud",
        "connections": {
            "canConnectTo": ["subnet", "compute-engine", "gke-cluster"],
            "canReceiveFrom": ["cloud-nat", "load-balancer"]
        }
    },
    {
        "id": "load-balancer",
        "label": "Load Balancer",
        "category": "networking",
        "cloud": "gcp",
        "icon": "Globe",
        "description": "Cloud Load Balancer",
        "connections": {
            "canConnectTo": ["compute-engine", "cloud-run", "gke-cluster"],
            "canReceiveFrom": ["cloud-dns"]
        }
    },

    # ================== STORAGE ==================
    {
        "id": "cloud-storage",
        "label": "Cloud Storage",
        "category": "storage",
        "cloud": "gcp",
        "icon": "HardDrive",
        "description": "Object storage bucket",
        "connections": {
            "canConnectTo": ["bigquery"],
            "canReceiveFrom": ["compute-engine", "cloud-run", "gke-cluster"]
        }
    },

    # ================== DATABASE ==================
    {
        "id": "cloud-sql",
        "label": "Cloud SQL",
        "category": "database",
        "cloud": "gcp",
        "icon": "Database",
        "description": "Managed MySQL/PostgreSQL",
        "connections": {
            "canConnectTo": [],
            "canReceiveFrom": ["compute-engine", "cloud-run", "gke-cluster"]
        }
    },
    {
        "id": "firestore",
        "label": "Firestore",
        "category": "database",
        "cloud": "gcp",
        "icon": "Database",
        "description": "NoSQL document database",
        "connections": {
            "canConnectTo": [],
            "canReceiveFrom": ["compute-engine", "cloud-run", "gke-cluster"]
        }
    },

    # ================== MESSAGING ==================
    {
        "id": "pub-sub",
        "label": "Pub/Sub",
        "category": "messaging",
        "cloud": "gcp",
        "icon": "MessageSquare",
        "description": "Messaging and streaming",
        "connections": {
            "canConnectTo": ["cloud-run", "compute-engine", "gke-cluster"],
            "canReceiveFrom": ["compute-engine", "cloud-run", "gke-cluster"]
        }
    },

    # ================== SECURITY ==================
    {
        "id": "secret-manager",
        "label": "Secret Manager",
        "category": "security",
        "cloud": "gcp",
        "icon": "Lock",
        "description": "Secrets management",
        "connections": {
            "canConnectTo": [],
            "canReceiveFrom": ["compute-engine", "cloud-run", "gke-cluster"]
        }
    }
,
    # ================== NETWORKING (ADDITIONS) ==================
{
    "id": "subnet",
    "label": "Subnet",
    "category": "networking",
    "cloud": "gcp",
    "icon": "Network",
    "description": "Subnet inside a VPC",
    "connections": {
        "canConnectTo": ["compute-engine", "gke-cluster", "cloud-run"],
        "canReceiveFrom": ["vpc"]
    }
},
{
    "id": "cloud-nat",
    "label": "Cloud NAT",
    "category": "networking",
    "cloud": "gcp",
    "icon": "Shuffle",
    "description": "Outbound internet access for private resources",
    "connections": {
        "canConnectTo": ["vpc"],
        "canReceiveFrom": ["compute-engine", "gke-cluster"]
    }
},
{
    "id": "cloud-dns",
    "label": "Cloud DNS",
    "category": "networking",
    "cloud": "gcp",
    "icon": "Globe",
    "description": "Managed DNS service",
    "connections": {
        "canConnectTo": ["load-balancer"],
        "canReceiveFrom": []
    }
},
{
    "id": "firewall-rules",
    "label": "Firewall Rules",
    "category": "networking",
    "cloud": "gcp",
    "icon": "Shield",
    "description": "Network firewall rules",
    "connections": {
        "canConnectTo": ["compute-engine", "gke-cluster"],
        "canReceiveFrom": ["vpc"]
    }
},

# ================== COMPUTE (ADDITIONS) ==================
{
    "id": "instance-group",
    "label": "Instance Group",
    "category": "compute",
    "cloud": "gcp",
    "icon": "Layers",
    "description": "Managed group of VM instances",
    "connections": {
        "canConnectTo": ["compute-engine"],
        "canReceiveFrom": ["load-balancer"]
    }
},
{
    "id": "cloud-functions",
    "label": "Cloud Functions",
    "category": "compute",
    "cloud": "gcp",
    "icon": "Zap",
    "description": "Event-driven serverless functions",
    "connections": {
        "canConnectTo": ["cloud-storage", "firestore", "pub-sub"],
        "canReceiveFrom": ["pub-sub", "cloud-storage"]
    }
},

# ================== DATA / ANALYTICS ==================
{
    "id": "bigquery",
    "label": "BigQuery",
    "category": "analytics",
    "cloud": "gcp",
    "icon": "BarChart",
    "description": "Serverless data warehouse",
    "connections": {
        "canConnectTo": [],
        "canReceiveFrom": ["cloud-storage", "pub-sub"]
    }
},

# ================== DEVOPS / OPS ==================
{
    "id": "artifact-registry",
    "label": "Artifact Registry",
    "category": "devops",
    "cloud": "gcp",
    "icon": "Package",
    "description": "Container and artifact storage",
    "connections": {
        "canConnectTo": ["gke-cluster", "cloud-run"],
        "canReceiveFrom": []
    }
},
{
    "id": "cloud-monitoring",
    "label": "Cloud Monitoring",
    "category": "devops",
    "cloud": "gcp",
    "icon": "Activity",
    "description": "Metrics, logs, and alerts",
    "connections": {
        "canConnectTo": [],
        "canReceiveFrom": ["compute-engine", "gke-cluster", "cloud-run", "cloud-sql"]
    }
}

]

def seed_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    for node in nodes:
        cur.execute("""
        INSERT OR REPLACE INTO nodes
        (id, label, category, cloud, icon, description, connections)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            node["id"],
            node["label"],
            node["category"],
            node["cloud"],
            node["icon"],
            node["description"],
            json.dumps(node["connections"])
        ))

    conn.commit()
    conn.close()
    print("✅ Nodes inserted successfully")

if __name__ == "__main__":
    seed_db()
