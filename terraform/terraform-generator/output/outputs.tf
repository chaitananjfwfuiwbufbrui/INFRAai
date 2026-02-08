output "vpc_name" {
  description = "The name of the VPC"
  value       = google_compute_network.vpc.name
}

output "public_vm_name" {
  description = "Name of the public VM"
  value       = google_compute_instance.app_server.name
}

output "public_vm_external_ip" {
  description = "The external IP of the public VM"
  value       = google_compute_instance.app_server.network_interface[0].access_config[0].nat_ip
}

output "public_vm_internal_ip" {
  description = "The internal IP of the public VM"
  value       = google_compute_instance.app_server.network_interface[0].network_ip
}

output "db_connection_name" {
  description = "The connection name of the database instance to be used in connection strings"
  value       = google_sql_database_instance.postgres.connection_name
}

output "db_private_ip" {
  description = "The private IP address of the database"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "ssh_command" {
  description = "Command to connect to the VM using IAP"
  value       = "gcloud compute ssh ${google_compute_instance.app_server.name} --zone ${var.zone} --tunnel-through-iap"
}