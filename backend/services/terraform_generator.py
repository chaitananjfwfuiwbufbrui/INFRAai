import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from services.schemas import MonitoringPolicy


WEBHOOK_CHANNEL_TEMPLATE = """
resource "google_monitoring_notification_channel" "ops_webhook" {
  project      = var.project_id
  display_name = "INFRAai Ops Webhook"
  type         = "webhook_tokenauth"

  labels = {
    url = var.ops_webhook_url
  }
}
"""

ALERT_POLICY_TEMPLATE = """
resource "google_monitoring_alert_policy" "{name}" {{
  {depends_on}project      = var.project_id
  display_name = "{resource_ref} - {metric_name}"
  combiner     = "OR"

  conditions {{
    display_name = "{display_threshold_text}"

    condition_threshold {{
      filter          = "{filter_expression}"
      comparison      = "COMPARISON_GT"
      threshold_value = {threshold}
      duration        = "{duration}"

      aggregations {{
        alignment_period   = "{duration}"
        per_series_aligner = "{aligner}"
      }}
    }}
  }}

  notification_channels = [
    google_monitoring_notification_channel.ops_webhook.id
  ]
}}
"""


class TerraformGenerator:
    """
    Deterministic Infra Spec → Terraform compiler (GCP only)
    """

    BASE_DIR = os.path.join(os.getcwd(), "runs")

    # --------------------------------------------------
    # PUBLIC ENTRY (USED BY API)
    # --------------------------------------------------
    def generate_and_store(self, infra_spec: dict, monitoring_policies: List[dict] = None) -> dict:
        ir = self._normalize_infra_spec(infra_spec)
        
        # Convert dicts back to MonitoringPolicy objects if needed, or just pass list
        # We'll expect a list of dicts that match the schema for simplicity in serialization
        ir["monitoring"] = monitoring_policies or []

        files = self._render_terraform(ir)

        run_id = self._create_run_id()
        run_path = os.path.join(self.BASE_DIR, run_id)
        os.makedirs(run_path, exist_ok=True)

        for name, content in files.items():
            with open(os.path.join(run_path, name), "w") as f:
                f.write(content.strip() + "\n")

        meta = {
            "run_id": run_id,
            "provider": "gcp",
            "created_at": datetime.utcnow().isoformat(),
            "resources": {k: len(v) for k, v in ir["resources"].items()},
            "monitoring_count": len(ir["monitoring"])
        }

        with open(os.path.join(run_path, "meta.json"), "w") as f:
            json.dump(meta, f, indent=2)

        return {
            "run_id": run_id,
            "path": run_path,
            "files": list(files.keys()),
        }

    # --------------------------------------------------
    # NORMALIZE FRONTEND SPEC (IR)
    # --------------------------------------------------
    def _normalize_infra_spec(self, infra_spec: dict) -> dict:
        if infra_spec.get("provider") != "gcp":
            raise ValueError("Only GCP is supported")

        resource_map = {
            "vpc": "vpc",
            "subnet": "subnet",
            "ec2": "vm",
            "rds": "sql",
            "s3": "storage",
            "storage": "storage",
            "compute engine": "vm",
            "cloud sql": "sql",
            "cloud storage": "storage",
        }

        resources: Dict[str, List[dict]] = {}

        for r in infra_spec.get("resources", []):
            normalized = resource_map.get(r["type"])
            if not normalized:
                raise ValueError(f"Unsupported resource: {r['type']}")

            resources.setdefault(normalized, []).append(r)

        return {
            "provider": {
                "project_id": infra_spec["project_name"],
                "region": infra_spec["region"],
                "zone": infra_spec.get("zone", "us-central1-a"),
            },
            "resources": resources,
        }

    # --------------------------------------------------
    # TERRAFORM RENDERING
    # --------------------------------------------------
    def _render_terraform(self, ir: dict) -> Dict[str, str]:
        files = {
            "main.tf": self._render_main(ir),
            "variables.tf": self._render_variables(ir),
            "outputs.tf": self._render_outputs(ir),
        }
        
        # If monitoring is present, append key blocks
        if ir.get("monitoring"):
            files["main.tf"] += "\n\n" + self._render_monitoring(ir["monitoring"], ir["provider"])
            
        return files

    # --------------------------------------------------
    # MONITORING GENERATION (FIXED)
    # --------------------------------------------------
    def _render_monitoring(self, policies: List[dict], provider_config: dict) -> str:
        blocks = []
        
        # 1. Webhook Channel
        blocks.append(WEBHOOK_CHANNEL_TEMPLATE)
        
        # 2. Alert Policies
        for p in policies:
            # Handle both object and dict access for safety
            policy_data = p if isinstance(p, dict) else p.dict()
            
            # Determine Aligner (Gauge vs Counter)
            # Gauges (utilization, memory, storage, connections) -> ALIGN_MEAN
            # Counters (requests, bytes sent, operations) -> ALIGN_RATE
            metric_path = policy_data['metric_path'].lower()
            if any(x in metric_path for x in ['request', 'bytes', 'count', 'ops', 'read_bytes', 'write_bytes']):
                aligner = "ALIGN_RATE"
            else:
                aligner = "ALIGN_MEAN"

            # FIX: Add depends_on for Cloud SQL alert policies
            depends_on = ""
            if "cloudsql" in policy_data['metric_path'].lower():
                depends_on = "depends_on   = [google_sql_database_instance.sql]\n  "

            # CRITICAL FIX: Determine proper resource.type and filter expression
            filter_expr = self._build_filter_expression(
                metric_path=policy_data['metric_path'],
                resource_ref=policy_data['resource_ref'],
                project_id=provider_config['project_id']
            )

            # FIX: Better display name formatting
            display_threshold = policy_data['threshold']
            display_threshold_text = f"{policy_data['metric_name']} > {display_threshold}"
            if 'disk' in policy_data['metric_name'].lower() and display_threshold >= 1000000:
                display_threshold_text = f"{policy_data['metric_name']} > {int(display_threshold / 1000000)}MB"

            blocks.append(ALERT_POLICY_TEMPLATE.format(
                name=f"{policy_data['resource_ref']}_{policy_data['metric_name']}".replace("-", "_"),
                resource_ref=policy_data['resource_ref'],
                metric_name=policy_data['metric_name'],
                threshold=policy_data['threshold'],
                duration=policy_data['duration'],
                aligner=aligner,
                filter_expression=filter_expr,
                depends_on=depends_on,
                display_threshold_text=display_threshold_text
            ))
            
        return "\n".join(blocks)

    def _build_filter_expression(self, metric_path: str, resource_ref: str, project_id: str) -> str:
        """
        Build proper filter expression with resource.type
        
        CRITICAL: Google Cloud Monitoring REQUIRES resource.type in ALL filters
        """
        metric_path_lower = metric_path.lower()
        
        # Determine resource type and labels based on metric
        if "cloudsql" in metric_path_lower:
            # Cloud SQL metrics
            resource_type = "cloudsql_database"
            
            # Special handling for PostgreSQL connections metric
            if "database_connections" in metric_path_lower or "num_backends" in metric_path_lower:
                # Use the correct PostgreSQL metric
                metric_path = "cloudsql.googleapis.com/database/postgresql/num_backends"
            
            # FIX: Cloud SQL uses database_id in format: project_id:instance_name
            # Use dynamic reference to the actual SQL instance name from Terraform resource
            filter_parts = [
                f'resource.type=\\"{resource_type}\\"',
                f'metric.type=\\"{metric_path}\\"',
                f'resource.labels.database_id=\\"${{var.project_id}}:${{google_sql_database_instance.sql.name}}\\"'
            ]
            
        elif "compute.googleapis.com" in metric_path_lower:
            # Compute Engine metrics
            resource_type = "gce_instance"
            
            # CRITICAL: Use instance_id (not instance_name) and reference from Terraform resource
            # We need to get the instance_id from the created resource
            filter_parts = [
                f'resource.type=\\"{resource_type}\\"',
                f'metric.type=\\"{metric_path}\\"',
                # Use the actual instance_id from the terraform resource
                'resource.labels.instance_id=\\"${google_compute_instance.vm[0].instance_id}\\"'
            ]
            
        else:
            # Default fallback (shouldn't happen with proper validation)
            resource_type = "gce_instance"
            filter_parts = [
                f'resource.type=\\"{resource_type}\\"',
                f'metric.type=\\"{metric_path}\\"',
                'resource.labels.instance_id=\\"${google_compute_instance.vm[0].instance_id}\\"'
            ]
        
        return " AND ".join(filter_parts)

    # --------------------------------------------------
    # MAIN.TF
    # --------------------------------------------------
    def _render_main(self, ir: dict) -> str:
        r = ir["resources"]

        tf = """
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.8"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# --------------------------------------------------
# REQUIRED APIS
# --------------------------------------------------
resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}
"""

        if "sql" in r:
            tf += """
resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}
"""
        
        # Monitoring API
        if ir.get("monitoring"):
             tf += """
resource "google_project_service" "monitoring" {
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false
}
"""

        if "vpc" in r:
            tf += """
resource "google_compute_network" "vpc" {
  depends_on              = [google_project_service.compute]
  name                    = var.vpc_name
  auto_create_subnetworks = false
}
"""

        if "subnet" in r:
            # FIX: Changed from $$ to $ for proper Terraform interpolation
            tf += """
resource "google_compute_subnetwork" "subnet" {
  depends_on    = [google_project_service.compute]
  name          = var.subnet_name
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.vpc_name}-allow-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_internal" {
  name    = "${var.vpc_name}-allow-internal"
  network = google_compute_network.vpc.name

  allow {
    protocol = "icmp"
  }
  
  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = ["10.0.0.0/16"]
}
"""

        if "vm" in r:
            tf += """
resource "google_compute_instance" "vm" {
  depends_on   = [google_project_service.compute]
  count        = length(var.vm_names)
  name         = var.vm_names[count.index]
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id
    access_config {}
  }
}
"""

        if "sql" in r:
            tf += """
resource "google_sql_database_instance" "sql" {
  depends_on          = [google_project_service.sqladmin]
  name                = var.sql_name
  region              = var.region
  database_version    = "POSTGRES_14"
  deletion_protection = false

  settings {
    tier              = "db-g1-small"
    availability_type = "ZONAL"
  }
}
"""

        if "storage" in r:
            # FIX: Changed from $$ to $ for proper Terraform interpolation
            tf += """
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "google_storage_bucket" "bucket" {
  name                        = "${var.project_id}-bucket-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}
"""

        return tf.strip()

    # --------------------------------------------------
    # VARIABLES.TF (DEFAULTS INCLUDED)
    # --------------------------------------------------
    def _render_variables(self, ir: dict) -> str:
        vm_count = len(ir["resources"].get("vm", []))
        vm_names = self._generate_vm_names(vm_count or 1)
        
        vars_tf = f"""
variable "project_id" {{
  default = "{ir['provider']['project_id']}"
}}

variable "region" {{
  default = "{ir['provider']['region']}"
}}

variable "zone" {{
  default = "{ir['provider']['zone']}"
}}

variable "vpc_name" {{
  default = "vpc"
}}

variable "subnet_name" {{
  default = "subnet"
}}

variable "vm_names" {{
  type    = list(string)
  default = {json.dumps(vm_names)}
}}

variable "sql_name" {{
  default = "sql"
}}
"""
        # Add ops webhook var if monitoring is enabled
        if ir.get("monitoring"):
             vars_tf += """
variable "ops_webhook_url" {
  description = "URL for the Ops Agent Webhook"
  default     = "http://localhost:8000/ops/webhook"  # Placeholder to prevent empty value error
}
"""
        return vars_tf.strip()

    # --------------------------------------------------
    # OUTPUTS.TF
    # --------------------------------------------------
    def _render_outputs(self, ir: dict) -> str:
        r = ir["resources"]
        out = ""

        if "vpc" in r:
            out += """
output "vpc_id" {
  value = google_compute_network.vpc.id
}
"""

        if "subnet" in r:
            out += """
output "subnet_id" {
  value = google_compute_subnetwork.subnet.id
}
"""

        if "vm" in r:
            out += """
output "vm_ids" {
  value = google_compute_instance.vm[*].id
}

output "vm_instance_ids" {
  value = google_compute_instance.vm[*].instance_id
}
"""

        if "sql" in r:
            out += """
output "sql_id" {
  value = google_sql_database_instance.sql.id
}

output "sql_connection_name" {
  value = google_sql_database_instance.sql.connection_name
}
"""

        return out.strip()

    # --------------------------------------------------
    # HELPERS
    # --------------------------------------------------
    def _generate_vm_names(self, count: int) -> List[str]:
        return [f"vm-{i+1}" for i in range(count)]

    def _create_run_id(self) -> str:
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        uid = uuid.uuid4().hex[:6]
        return f"run_{ts}_{uid}"