# Terraform outputs
# デプロイ後にこれらの値を参照できます

# Cloud Storage outputs (currently disabled as frontend is served from Cloud Run)
/*
# Cloud Storage バケット名
output "frontend_bucket_name" {
  description = "Frontend Cloud Storage bucket name"
  value       = google_storage_bucket.frontend.name
}

# Cloud Storage ホスティングURL
output "frontend_url" {
  description = "Frontend URL (Cloud Storage static hosting)"
  value       = "https://storage.googleapis.com/${google_storage_bucket.frontend.name}/index.html"
}

# Cloud Storage バケットURL(gsutil用)
output "frontend_bucket_url" {
  description = "Frontend bucket URL for gsutil"
  value       = "gs://${google_storage_bucket.frontend.name}"
}
*/

# Cloud SQL インスタンス名
output "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.main.name
}

# Cloud SQL 接続名
output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name for Cloud Run"
  value       = google_sql_database_instance.main.connection_name
}

# Cloud SQL データベース名
output "cloud_sql_database_name" {
  description = "Cloud SQL database name"
  value       = google_sql_database.database.name
}

# Cloud SQL パブリックIPアドレス
output "cloud_sql_public_ip" {
  description = "Cloud SQL public IP address"
  value       = google_sql_database_instance.main.public_ip_address
  sensitive   = true
}

# Cloud SQL プライベートIPアドレス
output "cloud_sql_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.main.private_ip_address
}

# VPC Connector名
output "vpc_connector_name" {
  description = "VPC Access Connector name for Cloud Run"
  value       = google_vpc_access_connector.connector.name
}

# VPC Connector ID (フルパス)
output "vpc_connector_id" {
  description = "VPC Access Connector ID for Cloud Run configuration"
  value       = google_vpc_access_connector.connector.id
}

# Cloud Run サービス名
output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_service.backend.name
}

# Cloud Run サービスURL
output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_service.backend.status[0].url
}

# Cloud Run サービスロケーション
output "cloud_run_location" {
  description = "Cloud Run service location"
  value       = google_cloud_run_service.backend.location
}

# GitHub Actions サービスアカウントメール
output "github_actions_service_account_email" {
  description = "GitHub Actions service account email"
  value       = google_service_account.github_actions.email
}

# Workload Identity Provider名（フルパス）
output "workload_identity_provider" {
  description = "Workload Identity Provider for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github_actions.name
}

# Workload Identity Pool ID
output "workload_identity_pool_id" {
  description = "Workload Identity Pool ID"
  value       = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
}

# Artifact Registry Repository
output "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  value       = google_artifact_registry_repository.backend.name
}

# Docker Image URL base
output "docker_image_url_base" {
  description = "Base URL for Docker images in Artifact Registry"
  value       = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.backend.repository_id}"
}

# Database Migration Job name
output "db_migrate_job_name" {
  description = "Cloud Run Job name for database migrations"
  value       = google_cloud_run_v2_job.db_migrate.name
}

# =============================================================================
# Redis outputs (COST OPTIMIZATION: Currently disabled)
# To re-enable, uncomment the outputs below and redis.tf resources
# =============================================================================
/*
# Redis instance host
output "redis_host" {
  description = "Redis instance host for rate limiting"
  value       = google_redis_instance.rate_limiter.host
}

# Redis instance port
output "redis_port" {
  description = "Redis instance port"
  value       = google_redis_instance.rate_limiter.port
}

# Redis auth string (sensitive)
output "redis_auth_string" {
  description = "Redis AUTH string for authentication"
  value       = google_redis_instance.rate_limiter.auth_string
  sensitive   = true
}
*/
