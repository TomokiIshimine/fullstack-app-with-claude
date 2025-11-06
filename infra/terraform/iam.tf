# IAM configuration for GitHub Actions
# This file defines service accounts and IAM roles for GitHub Actions CI/CD

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

# Grant Cloud Run Developer role to GitHub Actions service account
# Allows deploying services and managing jobs (sufficient for CI/CD)
resource "google_project_iam_member" "github_actions_cloud_run_developer" {
  project = var.gcp_project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Cloud SQL Editor role to GitHub Actions service account
# Allows managing Cloud SQL instances via Terraform (less privileged than admin)
resource "google_project_iam_member" "github_actions_cloud_sql_editor" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.editor"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Storage Object Admin role to GitHub Actions service account
# Allows managing objects in Cloud Storage (for Terraform state)
resource "google_project_iam_member" "github_actions_storage_object_admin" {
  project = var.gcp_project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Storage Legacy Bucket Writer role removed
# This role is bucket-level only and cannot be granted at project level
# roles/storage.objectAdmin is sufficient for Terraform state management

# Grant Service Account User role to GitHub Actions service account
resource "google_project_iam_member" "github_actions_sa_user" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Artifact Registry Writer role to GitHub Actions service account
# Allows pushing Docker images (sufficient for CI/CD)
resource "google_project_iam_member" "github_actions_artifact_registry_writer" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Artifact Registry Repo Admin role for repository management
# Required for Terraform to manage repositories
resource "google_project_iam_member" "github_actions_artifact_registry_repo_admin" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.repoAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant VPC Access Admin role to GitHub Actions service account
# Required for Terraform to manage VPC Access Connectors
resource "google_project_iam_member" "github_actions_vpcaccess_admin" {
  project = var.gcp_project_id
  role    = "roles/vpcaccess.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Service Networking Admin role for VPC peering
# Required for Cloud SQL private IP (VPC peering connection)
resource "google_project_iam_member" "github_actions_servicenetworking_admin" {
  project = var.gcp_project_id
  role    = "roles/servicenetworking.networksAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Project IAM Admin role removed for security
# This was too permissive and not needed for regular deployments
# If Terraform needs to manage IAM policies, use more specific roles:
# - roles/iam.securityAdmin (for IAM policy management)
# - roles/resourcemanager.projectIamAdmin (only if absolutely necessary)
# resource "google_project_iam_member" "github_actions_project_iam_admin" {
#   project = var.gcp_project_id
#   role    = "roles/resourcemanager.projectIamAdmin"
#   member  = "serviceAccount:${google_service_account.github_actions.email}"
# }

# Grant Compute Network Admin role to GitHub Actions service account
# Required for Terraform to manage VPC networks, subnets, and VPC Access Connectors
resource "google_project_iam_member" "github_actions_compute_network_admin" {
  project = var.gcp_project_id
  role    = "roles/compute.networkAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Workload Identity Pool Admin role removed for security
# This was only needed during initial Terraform setup
# After the pool is created, this permission is no longer required
#
# IMPORTANT: If you are running Terraform for the first time and creating
# the Workload Identity Pool, you may need to temporarily enable this role:
# resource "google_project_iam_member" "github_actions_workload_identity_pool_admin" {
#   project = var.gcp_project_id
#   role    = "roles/iam.workloadIdentityPoolAdmin"
#   member  = "serviceAccount:${google_service_account.github_actions.email}"
# }

# Grant Service Account Creator role for creating service accounts
resource "google_project_iam_member" "github_actions_service_account_creator" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountCreator"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Service Account Key Admin role to GitHub Actions service account
# Allows managing service account keys (less privileged than serviceAccountAdmin)
resource "google_project_iam_member" "github_actions_service_account_key_admin" {
  project = var.gcp_project_id
  role    = "roles/iam.serviceAccountKeyAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Security Admin role for managing IAM policies
# Required for Terraform to manage IAM bindings (less privileged than projectIamAdmin)
resource "google_project_iam_member" "github_actions_security_admin" {
  project = var.gcp_project_id
  role    = "roles/iam.securityAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Role Viewer role for IAM role information
resource "google_project_iam_member" "github_actions_iam_role_viewer" {
  project = var.gcp_project_id
  role    = "roles/iam.roleViewer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Secret Manager Admin role for managing secrets
# Required for Terraform to create/delete secrets and manage versions
# Note: This is one of the few Admin roles we keep because Terraform needs
# to manage Secret Manager resources (secrets, versions, IAM policies)
resource "google_project_iam_member" "github_actions_secret_manager_admin" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Service Usage Admin role to GitHub Actions service account
# Required for Terraform to enable GCP APIs (compute, sql, run, etc.)
# Note: This is kept as Admin because Terraform needs to manage API enablement
resource "google_project_iam_member" "github_actions_service_usage_admin" {
  project = var.gcp_project_id
  role    = "roles/serviceusage.serviceUsageAdmin"
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
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/TomokiIshimine/fullstack-app-with-claude"
}
