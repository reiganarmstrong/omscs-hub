output "dev_backend_config" {
  description = "Non-secret backend configuration values for infra/environments/dev/backend.hcl."
  value = {
    bucket   = cloudflare_r2_bucket.terraform_state.name
    endpoint = local.r2_endpoint
    key      = "dev/terraform.tfstate"
    region   = "auto"
  }
}

output "r2_bucket_id" {
  description = "ID of the R2 bucket used for dev Terraform state."
  value       = cloudflare_r2_bucket.terraform_state.id
}

output "r2_bucket_name" {
  description = "Name of the R2 bucket used for dev Terraform state."
  value       = cloudflare_r2_bucket.terraform_state.name
}

output "r2_endpoint" {
  description = "S3-compatible R2 endpoint for Terraform backend configuration."
  value       = local.r2_endpoint
}
