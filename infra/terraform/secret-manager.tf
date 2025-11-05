# Secret Manager for secure storage of sensitive configuration

# Secret Manager API
resource "google_project_service" "secretmanager" {
  project = var.gcp_project_id
  service = "secretmanager.googleapis.com"

  disable_on_destroy = false
}

# JWT Secret Key secret
resource "google_secret_manager_secret" "jwt_secret_key" {
  project   = var.gcp_project_id
  secret_id = "${var.app_name}-jwt-secret-key"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    app         = var.app_name
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.secretmanager]
}

# JWT Secret Key version (initial value from terraform.tfvars)
resource "google_secret_manager_secret_version" "jwt_secret_key" {
  secret      = google_secret_manager_secret.jwt_secret_key.id
  secret_data = var.flask_secret_key
}

# Flask Secret Key secret
resource "google_secret_manager_secret" "flask_secret_key" {
  project   = var.gcp_project_id
  secret_id = "${var.app_name}-flask-secret-key"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    app         = var.app_name
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.secretmanager]
}

# Flask Secret Key version (initial value from terraform.tfvars)
resource "google_secret_manager_secret_version" "flask_secret_key" {
  secret      = google_secret_manager_secret.flask_secret_key.id
  secret_data = var.flask_secret_key
}

# Grant Cloud Run service account access to JWT secret
resource "google_secret_manager_secret_iam_member" "jwt_secret_access" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.jwt_secret_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Grant Cloud Run service account access to Flask secret
resource "google_secret_manager_secret_iam_member" "flask_secret_access" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.flask_secret_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}
