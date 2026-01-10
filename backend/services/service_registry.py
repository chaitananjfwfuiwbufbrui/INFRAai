"""
service_registry.py

This file defines:
1. Canonical service names (cross-cloud)
2. Default safe configurations
3. Hard limits (future guardrails)
4. Supported clouds
"""

# ==============================
# SUPPORTED CLOUDS
# ==============================
SUPPORTED_CLOUDS = {"gcp", "aws", "azure"}

# ==============================
# CANONICAL SERVICE MAP
# UI node id  -> canonical infra service
# ==============================
CANONICAL_SERVICE_MAP = {
    # ---------- GCP ----------
    "compute-engine": "compute_vm",
    "cloud-run": "cloud_run",
    "gke-cluster": "kubernetes",
    "cloud-storage": "cloud_storage",
    "cloud-sql": "cloud_sql",
    "firestore": "firestore",
    "pub-sub": "pubsub",
    "secret-manager": "secret_manager",
    "load-balancer": "load_balancer",
     "gcp-vpc": "vpc",
    "gcp-subnet": "subnet",

    # ---------- AWS ----------
    "ec2": "compute_vm",
    "ecs": "container_service",
    "lambda": "serverless",
    "s3": "object_storage",
    "rds": "relational_db",
    "dynamodb": "nosql_db",
    "vpc": "vpc",
    "alb": "load_balancer",
    "iam-role": "iam_role",
    "sqs": "queue",

    # ---------- AZURE ----------
    "azure-vm": "compute_vm",
    "aks": "kubernetes",
    "azure-functions": "serverless",
    "blob-storage": "object_storage",
    "azure-sql": "relational_db",
    "cosmos-db": "nosql_db",
    "vnet": "vpc",
    "subnet": "subnet",
    "app-gateway": "load_balancer",
    "entra-id": "identity",
    "service-bus": "queue",
    "nat-gateway": "nat_gateway"
}

# ==============================
# DEFAULT CONFIGURATION
# (Best practices, boring = safe)
# ==============================
DEFAULTS = {
    "vpc": {},

    "subnet": {
        "cidr": "10.0.0.0/24"
    },

    "compute_vm": {
        "count": 1,
        "machine_type": "small",
        "public_access": False
    },

    "cloud_run": {
        "ingress": "internal"
    },

    "kubernetes": {
        "node_count": 1,
        "private_cluster": True
    },

    "cloud_sql": {
        "engine": "postgres",
        "version": "14",
        "public_access": False
    },

    "firestore": {
        "mode": "native"
    },

    "pubsub": {},

    "cloud_storage": {
        "versioning": False,
        "public_access": False
    },

    "object_storage": {
        "versioning": False
    },

    "load_balancer": {
        "type": "http"
    },

    "serverless": {},

    "relational_db": {
        "engine": "postgres"
    },

    "nosql_db": {},

    "queue": {},

    "iam_role": {},

    "identity": {},

    "nat_gateway": {}
}

# ==============================
# HARD LIMITS (GUARDRAILS)
# (Not enforced yet, but ready)
# ==============================
LIMITS = {
    "compute_vm": 2,
    "kubernetes": 1,
    "cloud_sql": 1,
    "cloud_storage": 3,
    "object_storage": 3,
    "load_balancer": 1,
    "vpc": 1,
    "subnet": 1
}

# ==============================
# NETWORK ATTACHMENT RULES
# ==============================
REQUIRES_SUBNET = {
    "compute_vm",
    "cloud_sql",
    "kubernetes"
}

REQUIRES_VPC = {
    "subnet"
}

# ==============================
# PUBLICLY EXPOSED SERVICES
# ==============================
CAN_BE_PUBLIC = {
    "compute_vm",
    "load_balancer",
    "cloud_run"
}
