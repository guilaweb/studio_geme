variable "gcp_project_id" {
  type        = string
  description = "The Google Cloud Platform project ID"
  default     = "profundidade-angola"
}

variable "gcp_region" {
  type        = string
  description = "The GCP region for deployments"
  default     = "europe-west1"
}
