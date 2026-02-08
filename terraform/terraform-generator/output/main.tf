provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  resource_labels = merge(var.common_labels, {
    environment = var.environment
  })
}

# ------------------------------------------------------------------------------
# NETWORK INFRASTRUCTURE (VPC & SUBNETS)
# ------------------------------------------------------------------------------

resource "google_compute_network" "vpc" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

# Public Subnet
resource "google_compute_subnetwork" "public" {
  name          = "${var.environment}-public-subnet"
  ip_cidr_range = var.public_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  # Enable Flow Logs for Production Auditing
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Private Subnet
resource "google_compute_subnetwork" "private" {
  name                     = "${var.environment}-private-subnet"
  ip_cidr_range            = var.private_subnet_cidr
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true # Allows talking to Google APIs without External IP
}

# ------------------------------------------------------------------------------
# NAT GATEWAY (For Private Subnet Internet Access)
# ------------------------------------------------------------------------------

resource "google_compute_router" "router" {
  name    = "${var.environment}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.environment}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.private.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ------------------------------------------------------------------------------
# FIREWALL RULES
# ------------------------------------------------------------------------------

# Allow internal traffic between subnets
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.environment}-allow-internal"
  network = google_compute_network.vpc.id

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

  source_ranges = [var.vpc_cidr]
}

# Allow SSH via IAP (Identity-Aware Proxy) ONLY.
# Do NOT open port 22 to 0.0.0.0/0
resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "${var.environment}-allow-iap-ssh"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # IP range for Google IAP
  source_ranges = ["35.235.240.0/20"]
}

# ------------------------------------------------------------------------------
# COMPUTE ENGINE (APP SERVER)
# ------------------------------------------------------------------------------

# Custom Service Account for Least Privilege
resource "google_service_account" "app_sa" {
  account_id   = "${var.environment}-app-sa"
  display_name = "App Server Service Account"
}

resource "google_compute_instance" "app_server" {
  name         = "${var.environment}-app-server"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["web-server", "ssh-enabled"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      labels = local.resource_labels
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.public.id

    # Including this block gives the VM a Public IP. 
    # Remove this block to make it truly private.
    access_config {
      # Ephemeral public IP
    }
  }

  service_account {
    email  = google_service_account.app_sa.email
    scopes = ["cloud-platform"]
  }

  # Security Hardening
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  metadata = {
    block-project-ssh-keys = "true"
    enable-oslogin         = "TRUE"
  }

  labels = local.resource_labels
}

# ------------------------------------------------------------------------------
# CLOUD SQL (DATABASE)
# ------------------------------------------------------------------------------

# 1. Private Service Access Configuration
# We need to reserve an IP range for Google Services to peer with our VPC
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.environment}-private-ip-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# 2. Database Instance
# Random ID to handle Cloud SQL name reuse restrictions
resource "random_id" "db_name_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.environment}-db-${random_id.db_name_suffix.hex}"
  region           = var.region
  database_version = "POSTGRES_15"
  
  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = var.db_tier
    
    ip_configuration {
      ipv4_enabled    = false # Disable public IP
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    user_labels = local.resource_labels
  }

  deletion_protection = false # Set to true for actual production
}

resource "google_sql_database" "database" {
  name     = "${var.environment}-app-db"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "users" {
  name     = "appuser"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}