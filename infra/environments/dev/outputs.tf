output "api_custom_domain_id" {
  description = "API Workers custom domain ID, when configured."
  value       = module.api_worker_routing.custom_domain_id
}

output "api_route_id" {
  description = "API Workers route ID, when configured."
  value       = module.api_worker_routing.route_id
}

output "api_url" {
  description = "API base URL for NEXT_PUBLIC_API_BASE_URL and Clerk origins."
  value       = local.api_url
}

output "api_worker_name" {
  description = "API Worker name."
  value       = module.api_worker_routing.worker_name
}

output "d1_database_id" {
  description = "D1 database ID for api/wrangler.toml."
  value       = module.review_database.database_id
}

output "d1_database_name" {
  description = "D1 database name."
  value       = module.review_database.database_name
}

output "ui_custom_domain_id" {
  description = "UI Workers custom domain ID."
  value       = module.ui_worker_routing.custom_domain_id
}

output "ui_custom_url" {
  description = "UI custom URL for Clerk redirect/origin settings."
  value       = local.ui_url
}

output "ui_route_id" {
  description = "UI Workers route ID, when configured."
  value       = module.ui_worker_routing.route_id
}

output "ui_worker_name" {
  description = "Static UI Worker name."
  value       = module.ui_worker_routing.worker_name
}
