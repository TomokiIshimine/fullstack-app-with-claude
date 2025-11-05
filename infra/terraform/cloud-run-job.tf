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

        # Migration command - run shell script that creates tables and grants IAM permissions
        command = ["/bin/bash"]
        args    = ["scripts/run_migrations.sh"]

        # Cloud SQL Connector configuration
        env {
          name  = "USE_CLOUD_SQL_CONNECTOR"
          value = "true"
        }

        env {
          name  = "CLOUDSQL_INSTANCE"
          value = google_sql_database_instance.main.connection_name
        }

        # Use password-based admin user for migrations (has full privileges)
        env {
          name  = "DB_USER"
          value = var.cloud_sql_user
        }

        env {
          name  = "DB_PASS"
          value = var.cloud_sql_password
        }

        env {
          name  = "DB_NAME"
          value = var.cloud_sql_database_name
        }

        # Use password authentication for migrations (not IAM)
        env {
          name  = "ENABLE_IAM_AUTH"
          value = "false"
        }

        env {
          name  = "CLOUDSQL_IP_TYPE"
          value = "PRIVATE"
        }

        # IAM user email to grant permissions to (for application access)
        env {
          name  = "IAM_USER_EMAIL"
          value = google_service_account.cloud_run.email
        }

        env {
          name  = "FLASK_ENV"
          value = "production"
        }

        # Legacy DATABASE_URL (kept for reference, not used when USE_CLOUD_SQL_CONNECTOR=true)
        env {
          name  = "DATABASE_URL"
          value = "mysql+pymysql://${var.cloud_sql_user}:${var.cloud_sql_password}@${google_sql_database_instance.main.private_ip_address}/${var.cloud_sql_database_name}?charset=utf8mb4"
        }

        # Resource limits
        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }

      # Service account for IAM authentication
      service_account = google_service_account.cloud_run.email

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
