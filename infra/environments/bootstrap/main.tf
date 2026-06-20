resource "cloudflare_r2_bucket" "terraform_state" {
  account_id    = var.cloudflare_account_id
  jurisdiction  = var.r2_bucket_jurisdiction
  location      = var.r2_bucket_location
  name          = var.r2_bucket_name
  storage_class = var.r2_storage_class

  lifecycle {
    prevent_destroy = true
  }
}
