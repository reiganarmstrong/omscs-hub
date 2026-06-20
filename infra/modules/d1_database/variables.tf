variable "account_id" {
  description = "Cloudflare account ID that owns the D1 database."
  type        = string
}

variable "name" {
  description = "D1 database name."
  type        = string
}

variable "primary_location_hint" {
  description = "Optional Cloudflare D1 primary location hint."
  type        = string
  default     = null
}

variable "read_replication_mode" {
  description = "D1 read replication mode."
  type        = string
  default     = "disabled"

  validation {
    condition     = contains(["auto", "disabled"], var.read_replication_mode)
    error_message = "Read replication mode must be auto or disabled."
  }
}
