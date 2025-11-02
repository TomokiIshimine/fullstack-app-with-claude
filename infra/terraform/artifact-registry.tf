# Artifact Registry repository for Docker images

# Artifact Registry repository
resource "google_artifact_registry_repository" "backend" {
  location      = var.gcp_region
  repository_id = "backend"
  description   = "Docker repository for backend images"
  format        = "DOCKER"
  project       = var.gcp_project_id

  depends_on = [google_project_service.artifactregistry]
}
