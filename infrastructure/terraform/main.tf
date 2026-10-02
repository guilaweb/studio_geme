terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# 1. Artifact Registry
resource "google_artifact_registry_repository" "api_repo" {
  location      = var.gcp_region
  repository_id = "profundidade-registry"
  description   = "Docker repository for PROFUNDIDADE services"
  format        = "DOCKER"
}

# 2. Cloud Storage for Evidence Custody with Object Versioning
resource "google_storage_bucket" "evidence_storage" {
  name                     = "${var.gcp_project_id}-profundidade-evidence"
  location                 = var.gcp_region
  storage_class            = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 90
    }
  }
}

# 3. Secret Manager for JWT Secret & Database Credentials
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "profundidade-jwt-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "db_url" {
  secret_id = "profundidade-db-url"
  replication {
    auto {}
  }
}

# 4. Cloud SQL (PostgreSQL 16)
resource "google_sql_database_instance" "postgres" {
  name             = "profundidade-postgres"
  database_version = "POSTGRES_16"
  region           = var.gcp_region

  settings {
    tier = "db-custom-2-7680"
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
    ip_configuration {
      ipv4_enabled = true
    }
  }
}

resource "google_sql_database" "db" {
  name     = "profundidade"
  instance = google_sql_database_instance.postgres.name
}

# 5. Pub/Sub for Asynchronous Intelligence & Ingestion Pipelines
resource "google_pubsub_topic" "investigation_events" {
  name = "profundidade-investigation-events"
}

resource "google_pubsub_subscription" "si_processing_sub" {
  name  = "profundidade-si-processing"
  topic = google_pubsub_topic.investigation_events.name
}
