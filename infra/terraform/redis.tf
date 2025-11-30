# Redis (Memorystore) for rate limiting storage
#
# =============================================================================
# COST OPTIMIZATION: Redis is currently DISABLED to reduce infrastructure costs.
# The application uses in-memory rate limiting instead (via Flask-Limiter).
#
# To re-enable Redis for production use:
# 1. Uncomment the resources below
# 2. Uncomment Redis-related environment variables in cloud-run.tf
# 3. Uncomment Redis outputs in outputs.tf
# 4. Run `terraform apply`
#
# Estimated cost savings: ~$35-40/month
# =============================================================================

/*
# Redis API
resource "google_project_service" "redis" {
  project = var.gcp_project_id
  service = "redis.googleapis.com"

  disable_on_destroy = false
}

# Redis instance for Flask-Limiter backend
resource "google_redis_instance" "rate_limiter" {
  name           = "${var.app_name}-rate-limiter"
  project        = var.gcp_project_id
  region         = var.gcp_region
  tier           = "BASIC"
  memory_size_gb = 1

  # Use the same VPC network as Cloud Run
  authorized_network = google_compute_network.vpc.id

  # Redis version
  redis_version = "REDIS_7_0"

  # Display name
  display_name = "Rate Limiter Redis"

  # Connect mode - DIRECT_PEERING for VPC access
  connect_mode = "DIRECT_PEERING"

  # Auth enabled for security
  auth_enabled = true

  # Transit encryption mode - DISABLED for VPC internal traffic
  # (already secured by VPC, enabling TLS adds overhead)
  transit_encryption_mode = "DISABLED"

  # Maintenance policy - Sunday 3 AM (same as Cloud SQL)
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  # Labels
  labels = {
    environment = var.environment
    app         = var.app_name
    managed_by  = "terraform"
    purpose     = "rate-limiting"
  }

  depends_on = [
    google_project_service.redis,
    google_compute_network.vpc
  ]
}
*/
