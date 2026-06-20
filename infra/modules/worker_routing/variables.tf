variable "account_id" {
  description = "Cloudflare account ID that owns the Worker."
  type        = string
}

variable "custom_hostname" {
  description = "Optional custom hostname routed to the Worker."
  type        = string
  default     = null
}

variable "route_pattern" {
  description = "Optional Workers route pattern, such as api.example.com/*."
  type        = string
  default     = null
}

variable "worker_name" {
  description = "Worker service name deployed by Wrangler."
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID containing route/custom-domain hostnames."
  type        = string
}

variable "zone_name" {
  description = "Optional Cloudflare zone name for Workers custom domains."
  type        = string
  default     = null
}
