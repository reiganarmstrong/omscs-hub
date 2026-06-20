locals {
  r2_endpoint = var.r2_bucket_jurisdiction == "eu" ? "https://${var.cloudflare_account_id}.eu.r2.cloudflarestorage.com" : "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
}
