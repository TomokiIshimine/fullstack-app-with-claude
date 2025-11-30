# Cloud Run service for backend API

# Cloud Run API有効化
resource "google_project_service" "run" {
  project = var.gcp_project_id
  service = "run.googleapis.com"

  disable_on_destroy = false
}

# Artifact Registry API有効化 (Dockerイメージの保存用)
resource "google_project_service" "artifactregistry" {
  project = var.gcp_project_id
  service = "artifactregistry.googleapis.com"

  disable_on_destroy = false
}

# Cloud Run service
resource "google_cloud_run_service" "backend" {
  name     = "${var.app_name}-backend"
  location = var.gcp_region
  project  = var.gcp_project_id

  template {
    spec {
      # コンテナ設定
      containers {
        # 初期イメージ（実際のイメージはGitHub Actionsで更新される）
        image = "gcr.io/cloudrun/hello"

        # 環境変数
        env {
          name  = "FLASK_ENV"
          value = "production"
        }

        # JWT認証用のシークレットキー（Secret Managerから取得）
        env {
          name = "JWT_SECRET_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.jwt_secret_key.secret_id
              key  = "latest"
            }
          }
        }

        # Flaskのシークレットキー（Secret Managerから取得）
        env {
          name = "FLASK_SECRET_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.flask_secret_key.secret_id
              key  = "latest"
            }
          }
        }

        # CORS設定用のフロントエンドURL
        # フロントエンドとバックエンドが同一コンテナから配信されるため、
        # 同一オリジンとなりCORS制限は適用されない
        # デフォルト値（localhost:5173）がそのまま使用される

        # Cloud SQL Connector configuration
        env {
          name  = "USE_CLOUD_SQL_CONNECTOR"
          value = "true"
        }

        env {
          name  = "CLOUDSQL_INSTANCE"
          value = google_sql_database_instance.main.connection_name
        }

        env {
          name  = "DB_USER"
          value = google_service_account.cloud_run.email
        }

        env {
          name  = "DB_NAME"
          value = var.cloud_sql_database_name
        }

        env {
          name  = "ENABLE_IAM_AUTH"
          value = "true"
        }

        env {
          name  = "CLOUDSQL_IP_TYPE"
          value = "PRIVATE"
        }

        # =================================================================
        # Redis configuration for rate limiting
        # COST OPTIMIZATION: Redis is currently DISABLED.
        # Rate limiting uses in-memory storage instead.
        # To re-enable, uncomment the env blocks below and in redis.tf
        # =================================================================
        /*
        env {
          name  = "REDIS_HOST"
          value = google_redis_instance.rate_limiter.host
        }

        env {
          name  = "REDIS_PORT"
          value = tostring(google_redis_instance.rate_limiter.port)
        }

        env {
          name  = "REDIS_PASSWORD"
          value = google_redis_instance.rate_limiter.auth_string
        }
        */

        # Rate limiting is disabled (uses in-memory fallback in limiter.py)
        env {
          name  = "RATE_LIMIT_ENABLED"
          value = "false"
        }

        # リソース制限
        resources {
          limits = {
            cpu    = var.cloud_run_cpu
            memory = var.cloud_run_memory
          }
        }

        # ポート設定
        ports {
          container_port = 5000
        }
      }

      # コンテナ同時実行数
      container_concurrency = 80

      # タイムアウト設定
      timeout_seconds = 300

      # Service account for IAM authentication
      service_account_name = google_service_account.cloud_run.email
    }

    metadata {
      annotations = {
        # VPCアクセスコネクタ (Cloud SQL接続用)
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.id
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"

        # オートスケーリング設定
        "autoscaling.knative.dev/minScale" = tostring(var.cloud_run_min_instances)
        "autoscaling.knative.dev/maxScale" = tostring(var.cloud_run_max_instances)

        # Cloud SQL接続 (Cloud SQL Proxy使用時)
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.main.connection_name
      }

      labels = {
        environment = var.environment
        app         = var.app_name
        managed_by  = "terraform"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  # 依存関係
  depends_on = [
    google_project_service.run,
    google_sql_database_instance.main,
    google_vpc_access_connector.connector
    # google_redis_instance.rate_limiter  # COST OPTIMIZATION: Redis disabled
  ]

  # ライフサイクル設定 (イメージはGitHub Actionsで更新される)
  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
      template[0].metadata[0].annotations["client.knative.dev/user-image"],
      template[0].metadata[0].annotations["run.googleapis.com/client-name"],
      template[0].metadata[0].annotations["run.googleapis.com/client-version"]
    ]
  }
}

# Cloud Runサービスへのパブリックアクセス許可
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.backend.name
  location = google_cloud_run_service.backend.location
  project  = google_cloud_run_service.backend.project
  role     = "roles/run.invoker"
  member   = "allUsers"
}
