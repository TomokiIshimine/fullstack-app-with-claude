# IAM configuration for GitHub Actions
# This file defines service accounts and IAM roles for GitHub Actions CI/CD
#

# IAM API (Identity and Access Management API)
resource "google_project_service" "iam" {
  project = var.gcp_project_id
  service = "iam.googleapis.com"

  disable_on_destroy = false
}

# IAM Credentials API (required for Workload Identity)
resource "google_project_service" "iamcredentials" {
  project = var.gcp_project_id
  service = "iamcredentials.googleapis.com"

  disable_on_destroy = false
}

# Security Token Service API (required for Workload Identity)
resource "google_project_service" "sts" {
  project = var.gcp_project_id
  service = "sts.googleapis.com"

  disable_on_destroy = false
}

# Service account for GitHub Actions
resource "google_service_account" "github_actions" {
  account_id   = "${var.app_name}-github-actions"
  display_name = "GitHub Actions Service Account"
  description  = "Service account for GitHub Actions CI/CD pipeline"
  project      = var.gcp_project_id

  depends_on = [google_project_service.iam]
}

# Grant Cloud Run Admin role to GitHub Actions service account
resource "google_project_iam_member" "github_actions_cloud_run_admin" {
  project = var.gcp_project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Cloud SQL Admin role to GitHub Actions service account
resource "google_project_iam_member" "github_actions_cloud_sql_admin" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Storage Admin role to GitHub Actions service account
resource "google_project_iam_member" "github_actions_storage_admin" {
  project = var.gcp_project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Service Account User role to GitHub Actions service account
resource "google_project_iam_member" "github_actions_sa_user" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Artifact Registry Admin role to GitHub Actions service account (for Docker images)
resource "google_project_iam_member" "github_actions_artifact_registry_admin" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant VPC Access Viewer role to GitHub Actions service account (for VPC Access Connector)
resource "google_project_iam_member" "github_actions_vpcaccess_viewer" {
  project = var.gcp_project_id
  role    = "roles/vpcaccess.viewer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Project IAM Admin role to GitHub Actions service account (for managing IAM policies)
resource "google_project_iam_member" "github_actions_project_iam_admin" {
  project = var.gcp_project_id
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Workload Identity Pool for GitHub Actions
resource "google_iam_workload_identity_pool" "github_actions" {
  workload_identity_pool_id = "${var.app_name}-github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"
  project                   = var.gcp_project_id

  depends_on = [google_project_service.iam, google_project_service.iamcredentials]
}

# Workload Identity Pool Provider for GitHub Actions
resource "google_iam_workload_identity_pool_provider" "github_actions" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "${var.app_name}-github-provider"
  display_name                       = "GitHub Actions Provider"
  description                        = "Workload Identity Pool Provider for GitHub Actions"
  project                            = var.gcp_project_id

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository_owner == 'TomokiIshimine'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  depends_on = [google_project_service.sts]
}

# Allow GitHub Actions to impersonate the service account
# This binding allows specific GitHub repository to use the service account
resource "google_service_account_iam_member" "github_actions_workload_identity" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  # You need to replace <YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO> with your actual repository
  # Example: "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/octocat/hello-world"
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/*"
}
