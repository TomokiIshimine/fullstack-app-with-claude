# Cloud SQL (MySQL) for database

# Random suffix for Cloud SQL instance name
resource "random_id" "db_suffix" {
  byte_length = 4
}

# Cloud SQL Instance (MySQL 8.0, db-f1-micro)
resource "google_sql_database_instance" "main" {
  name             = "${var.app_name}-db-${random_id.db_suffix.hex}"
  database_version = "MYSQL_8_0"
  region           = var.gcp_region
  project          = var.gcp_project_id

  # Smallest tier for cost optimization
  settings {
    tier = "db-f1-micro"

    # IP configuration - Private IP only for security
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.self_link
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    # Backup configuration - Disabled for cost savings
    backup_configuration {
      enabled            = false
      binary_log_enabled = false
    }

    # Maintenance window
    maintenance_window {
      day  = 7 # Sunday
      hour = 3 # 3 AM
    }

    # Database flags
    database_flags {
      name  = "character_set_server"
      value = "utf8mb4"
    }

    database_flags {
      name  = "collation_server"
      value = "utf8mb4_unicode_ci"
    }

    database_flags {
      name  = "cloudsql_iam_authentication"
      value = "on"
    }

    # Disk configuration - Fixed size for cost savings
    disk_autoresize       = false
    disk_autoresize_limit = 0
    disk_size             = 10 # 10 GB minimum
    disk_type             = "PD_HDD"

    # Availability configuration - Single zone for cost savings
    availability_type = "ZONAL"

    # Insights configuration - Disabled for cost savings
    insights_config {
      query_insights_enabled  = false
      query_plans_per_minute  = 0
      query_string_length     = 1024
      record_application_tags = false
      record_client_address   = false
    }
  }

  # Deletion protection - Auto-enabled for production, or can be explicitly set
  # If cloud_sql_deletion_protection is set explicitly, use that value
  # Otherwise, automatically enable for production environment
  deletion_protection = var.cloud_sql_deletion_protection != null ? var.cloud_sql_deletion_protection : (var.environment == "production")

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_project_service.sqladmin
  ]
}

# Database creation
resource "google_sql_database" "database" {
  name     = var.cloud_sql_database_name
  instance = google_sql_database_instance.main.name
  project  = var.gcp_project_id

  charset   = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

# Database user creation (password-based, for migration purposes only)
# This user is used exclusively by the Cloud Run Job (db_migrate) to:
# 1. Create database tables via scripts/create_tables.py
# 2. Grant permissions to the IAM user for application access
# The application itself (Cloud Run service) uses IAM authentication via google_sql_user.iam_user
resource "google_sql_user" "user" {
  name     = var.cloud_sql_user
  instance = google_sql_database_instance.main.name
  password = var.cloud_sql_password
  project  = var.gcp_project_id
}

# Service Account for Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "${var.app_name}-cloud-run-sa"
  display_name = "Cloud Run Service Account for ${var.app_name}"
  project      = var.gcp_project_id
}

# Grant Cloud SQL Client role to the service account
resource "google_project_iam_member" "cloud_sql_client" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Grant Cloud SQL Instance User role for IAM authentication
resource "google_project_iam_member" "cloud_sql_instance_user" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# IAM-based database user (no password required)
resource "google_sql_user" "iam_user" {
  name     = google_service_account.cloud_run.email
  instance = google_sql_database_instance.main.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
  project  = var.gcp_project_id
}

# VPC Network for private IP
resource "google_compute_network" "vpc" {
  name                    = "${var.app_name}-vpc"
  project                 = var.gcp_project_id
  auto_create_subnetworks = true
}

# VPC Peering for Cloud SQL private IP
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.app_name}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
  project       = var.gcp_project_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]

  depends_on = [google_project_service.servicenetworking]
}

# VPC Access Connector for Cloud Run to access Cloud SQL via private IP
resource "google_vpc_access_connector" "connector" {
  name          = "${var.app_name}-vpc-conn" # Must match pattern ^[a-z][-a-z0-9]{0,23}[a-z0-9]$
  project       = var.gcp_project_id
  region        = var.gcp_region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28" # Must be /28 and not overlap with existing ranges

  depends_on = [google_compute_network.vpc, google_project_service.vpcaccess]
}
