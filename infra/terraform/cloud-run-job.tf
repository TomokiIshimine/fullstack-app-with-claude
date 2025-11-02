# Cloud Run Job for database migrations
# This job runs database migrations before deploying the backend service

resource "google_cloud_run_v2_job" "db_migrate" {
  name     = "${var.app_name}-db-migrate"
  location = var.gcp_region
  project  = var.gcp_project_id

  template {
    template {
      containers {
        # Initial dummy image, will be updated by GitHub Actions
        image = "gcr.io/cloudrun/hello"

        # Migration command
        command = ["python"]
        args    = ["scripts/create_tables.py"]

        # Environment variables (same as Cloud Run service)
        env {
          name  = "DATABASE_URL"
          value = "mysql+pymysql://${var.cloud_sql_user}:${var.cloud_sql_password}@${google_sql_database_instance.main.private_ip_address}/${var.cloud_sql_database_name}?charset=utf8mb4"
        }

        env {
          name  = "FLASK_ENV"
          value = "production"
        }

        # Resource limits
        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }

      # VPC connection for private Cloud SQL access
      vpc_access {
        connector = google_vpc_access_connector.connector.id
        egress    = "PRIVATE_RANGES_ONLY"
      }

      # Timeout for migration job (5 minutes)
      timeout = "300s"
    }
  }

  depends_on = [
    google_project_service.run,
    google_sql_database_instance.main,
    google_vpc_access_connector.connector
  ]

  # Ignore changes to the image as it will be updated by GitHub Actions
  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image
    ]
  }
}
