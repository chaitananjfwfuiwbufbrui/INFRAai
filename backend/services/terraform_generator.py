import os
import json
import uuid
from datetime import datetime
from typing import Dict, List


class TerraformGenerator:
    """
    Deterministic Infra Spec → Terraform compiler (GCP only)

    - API contract unchanged
    - Defaults handled internally
    - Multiple VM instances supported
    - Required GCP APIs auto-enabled
    """

    BASE_DIR = os.path.join(os.getcwd(), "runs")

    # --------------------------------------------------
    # PUBLIC ENTRY (USED BY API)
    # --------------------------------------------------
    def generate_and_store(self, infra_spec: dict) -> dict:
        ir = self._normalize_infra_spec(infra_spec)
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
        return {
            "main.tf": self._render_main(ir),
            "variables.tf": self._render_variables(ir),
            "outputs.tf": self._render_outputs(ir),
        }

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

        if "vpc" in r:
            tf += """
resource "google_compute_network" "vpc" {
  depends_on              = [google_project_service.compute]
  name                    = var.vpc_name
  auto_create_subnetworks = false
}
"""

        if "subnet" in r:
            tf += """
resource "google_compute_subnetwork" "subnet" {
  depends_on    = [google_project_service.compute]
  name          = var.subnet_name
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.vpc.id
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
  depends_on = [google_project_service.sqladmin]

  name                = var.sql_name
  region              = var.region
  database_version    = "POSTGRES_14"
  deletion_protection = false

  settings {
    tier = "db-f1-micro"
  }
}
"""

        return tf.strip()

    # --------------------------------------------------
    # VARIABLES.TF (DEFAULTS INCLUDED)
    # --------------------------------------------------
    def _render_variables(self, ir: dict) -> str:
        vm_count = len(ir["resources"].get("vm", []))
        vm_names = self._generate_vm_names(vm_count or 1)

        return f"""
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
""".strip()

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
"""

        if "sql" in r:
            out += """
output "sql_id" {
  value = google_sql_database_instance.sql.id
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
