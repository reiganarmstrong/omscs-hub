variable "api_custom_hostname" {
  description = "Optional API Worker custom hostname."
  type        = string
  default     = null
}

variable "api_route_pattern" {
  description = "Optional API Worker route pattern."
  type        = string
  default     = null
}

variable "api_worker_compatibility_date" {
  description = "Compatibility date for the Terraform-managed API placeholder Worker."
  type        = string
  default     = "2026-05-10"
}

variable "api_worker_name" {
  description = "API Worker service name deployed by Wrangler."
  type        = string
  default     = "omscs-hub-review-api-dev"
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for UI/API hostnames."
  type        = string
}

variable "cloudflare_zone_name" {
  description = "Optional Cloudflare zone name for Workers custom domains."
  type        = string
  default     = null
}

variable "d1_database_name" {
  description = "D1 database name."
  type        = string
  default     = "omscs-hub-reviews-dev"
}

variable "d1_primary_location_hint" {
  description = "Optional Cloudflare D1 primary location hint."
  type        = string
  default     = null
}

variable "d1_read_replication_mode" {
  description = "D1 read replication mode."
  type        = string
  default     = "disabled"

  validation {
    condition     = contains(["auto", "disabled"], var.d1_read_replication_mode)
    error_message = "D1 read replication mode must be auto or disabled."
  }
}

variable "ui_custom_hostname" {
  description = "Required UI Worker custom hostname."
  type        = string
}

variable "ui_route_pattern" {
  description = "Optional UI Worker route pattern."
  type        = string
  default     = null
}

variable "ui_worker_compatibility_date" {
  description = "Compatibility date for the Terraform-managed UI placeholder Worker."
  type        = string
  default     = "2026-05-10"
}

variable "ui_worker_name" {
  description = "Static UI Worker service name deployed by Wrangler."
  type        = string
  default     = "omscs-hub-ui-dev"
}
