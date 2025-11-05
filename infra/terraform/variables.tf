# GCPプロジェクトID
variable "gcp_project_id" {
  description = "Google Cloud Project ID"
  type        = string
  default     = "fullstack-app-base"
}

# GCPリージョン
variable "gcp_region" {
  description = "Google Cloud region"
  type        = string
  default     = "asia-northeast1"
}

# アプリケーション名
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "fullstack-app"
}

# 環境名 (development, staging, production)
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Cloud Run最小インスタンス数
variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

# Cloud Run最大インスタンス数
variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 1
}

# Cloud Runメモリ(MB)
variable "cloud_run_memory" {
  description = "Cloud Run memory in MB"
  type        = string
  default     = "512Mi"
}

# Cloud Run CPU数
variable "cloud_run_cpu" {
  description = "Cloud Run CPU"
  type        = string
  default     = "1"
}

# Cloud SQLデータベース名
variable "cloud_sql_database_name" {
  description = "Cloud SQL database name"
  type        = string
  default     = "app_db"
}

# Cloud SQLユーザー名
variable "cloud_sql_user" {
  description = "Cloud SQL user"
  type        = string
  default     = "app_user"
}

# Cloud SQLパスワード (GitHub Secretsから取得)
variable "cloud_sql_password" {
  description = "Cloud SQL user password"
  type        = string
  sensitive   = true
}

# Flask Secret Key (GitHub Secretsから取得)
variable "flask_secret_key" {
  description = "Flask secret key for session management"
  type        = string
  sensitive   = true
}

# Cloud SQL 削除保護
variable "cloud_sql_deletion_protection" {
  description = "Enable deletion protection for Cloud SQL instance. If not set (null), automatically determined by environment (true for production, false otherwise). Can be explicitly set to override automatic behavior."
  type        = bool
  default     = null
  nullable    = true
}
