# Cloud Storage bucket for frontend static hosting
# NOTE: Currently disabled as frontend is served from Cloud Run container
# Uncomment this file if you want to use Cloud Storage for static hosting again

/*
# Random suffix for bucket name to ensure global uniqueness
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Frontend Cloud Storage bucket
resource "google_storage_bucket" "frontend" {
  name     = "${var.app_name}-frontend-${random_id.bucket_suffix.hex}"
  location = var.gcp_region
  project  = var.gcp_project_id

  # Static website hosting configuration
  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html" # For SPA, route all requests to index.html
  }

  # Enable uniform bucket-level access for public hosting
  uniform_bucket_level_access = true

  # CORS configuration for API communication
  cors {
    origin          = ["*"] # In production, restrict to specific domains
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"]
    response_header = ["Content-Type", "Authorization"]
    max_age_seconds = 3600
  }

  # Disable versioning for cost savings
  versioning {
    enabled = false
  }

  # Lifecycle rule to automatically delete old files for cost savings
  lifecycle_rule {
    condition {
      age                = 30 # Delete files older than 30 days
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }

  # Allow force destroy even with files in bucket (for terraform destroy)
  force_destroy = true

  labels = {
    environment = var.environment
    app         = var.app_name
    managed_by  = "terraform"
  }
}

# Make bucket publicly accessible
resource "google_storage_bucket_iam_member" "frontend_public_access" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Default index.html file (placeholder for initial deployment)
resource "google_storage_bucket_object" "index_html" {
  name    = "index.html"
  bucket  = google_storage_bucket.frontend.name
  content = <<-EOT
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fullstack App - Deploying...</title>
    </head>
    <body>
      <h1>Deployment in progress...</h1>
      <p>The application is being deployed. Please wait a moment and refresh the page.</p>
    </body>
    </html>
  EOT

  content_type = "text/html"

  # Ignore changes as this will be overwritten by GitHub Actions deployment
  lifecycle {
    ignore_changes = [
      content,
      detect_md5hash
    ]
  }
}
*/
