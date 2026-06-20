variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Terraform state R2 bucket."
  type        = string
}

variable "r2_bucket_jurisdiction" {
  description = "Jurisdiction for the Terraform state R2 bucket."
  type        = string
  default     = "default"

  validation {
    condition     = contains(["default", "eu"], var.r2_bucket_jurisdiction)
    error_message = "R2 bucket jurisdiction must be default or eu."
  }
}

variable "r2_bucket_location" {
  description = "Optional location hint for the Terraform state R2 bucket."
  type        = string
  default     = "enam"

  validation {
    condition     = contains(["apac", "eeur", "enam", "weur", "wnam", "oc"], var.r2_bucket_location)
    error_message = "R2 bucket location must be apac, eeur, enam, weur, wnam, or oc."
  }
}

variable "r2_bucket_name" {
  description = "Name of the R2 bucket that stores dev Terraform state."
  type        = string
  default     = "omscs-hub-terraform-state-dev"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$", var.r2_bucket_name))
    error_message = "R2 bucket name must be 3-64 lowercase letters, numbers, or hyphens, and cannot start or end with a hyphen."
  }
}

variable "r2_storage_class" {
  description = "Storage class for new Terraform state objects in the R2 bucket."
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Standard", "InfrequentAccess"], var.r2_storage_class)
    error_message = "R2 storage class must be Standard or InfrequentAccess."
  }
}
