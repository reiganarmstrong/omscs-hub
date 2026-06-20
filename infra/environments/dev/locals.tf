locals {
  api_url = var.api_custom_hostname == null ? "https://${var.api_worker_name}.${var.cloudflare_account_id}.workers.dev" : "https://${var.api_custom_hostname}"
  ui_url  = "https://${var.ui_custom_hostname}"
}
