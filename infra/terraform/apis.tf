# Enable required GCP APIs

# Service Networking API (required for Cloud SQL private IP)
resource "google_project_service" "servicenetworking" {
  project = var.gcp_project_id
  service = "servicenetworking.googleapis.com"

  disable_on_destroy = false
}

# VPC Access API (required for VPC Access Connector)
resource "google_project_service" "vpcaccess" {
  project = var.gcp_project_id
  service = "vpcaccess.googleapis.com"

  disable_on_destroy = false
}

# Compute Engine API (required for VPC and networking)
resource "google_project_service" "compute" {
  project = var.gcp_project_id
  service = "compute.googleapis.com"

  disable_on_destroy = false
}

# Cloud SQL Admin API (required for Cloud SQL)
resource "google_project_service" "sqladmin" {
  project = var.gcp_project_id
  service = "sqladmin.googleapis.com"

  disable_on_destroy = false
}
