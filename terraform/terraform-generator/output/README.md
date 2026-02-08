# GCP Terraform Infrastructure: VPC, Compute & Cloud SQL

This Terraform configuration provisions a production-ready infrastructure on Google Cloud Platform.

## Architecture

*   **VPC**: Custom VPC with Global routing.
*   **Subnets**:
    *   **Public**: Contains the App Server. Includes external access.
    *   **Private**: Reserved for future internal workloads. Outbound internet via Cloud NAT.
*   **Compute Engine**: Debian 11 VM running in the Public Subnet.
    *   Protected by Identity-Aware Proxy (IAP) firewall rules (Port 22 is NOT open to the world).
    *   Shielded Instance enabled.
    *   Custom Service Account.
*   **Cloud SQL (PostgreSQL)**:
    *   Private IP only (No public IP).
    *   Connected via Private Service Access (VPC Peering).
    *   SSL Enforced.
    *   Automated Backups enabled.

## Prerequisites

1.  [Terraform](https://www.terraform.io/downloads.html) >= 1.3.0
2.  [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth application-default login`).
3.  A GCP Project with the following APIs enabled:
    *   Compute Engine API
    *   Cloud SQL Admin API
    *   Service Networking API

## Usage

1.  **Initialize Terraform:**
    terraform init

2.  **Plan the deployment:**
    terraform plan -var="project_id=YOUR_PROJECT_ID" -var="db_password=YOUR_SECRET_PASSWORD"

3.  **Apply:**
    terraform apply -var="project_id=YOUR_PROJECT_ID" -var="db_password=YOUR_SECRET_PASSWORD"

## Security Note: SSH Access

For security, this setup strictly blocks SSH (Port 22) from the open internet (0.0.0.0/0). It uses **Identity-Aware Proxy (IAP)**.

To connect to the VM, use the output command:

gcloud compute ssh <vm-name> --zone <zone> --tunnel-through-iap

## Inputs

| Name | Description | Default |
|------|-------------|---------|
| `project_id` | GCP Project ID | **Required** |
| `region` | GCP Region | `us-central1` |
| `db_password` | Database User Password | **Required** |
| `environment` | Environment tag | `dev` |

## Outputs

*   `public_vm_external_ip`: Public IP of the web server.
*   `db_private_ip`: Internal IP of the PostgreSQL database.
*   `db_connection_name`: Connection string for Cloud Proxy or application usage.