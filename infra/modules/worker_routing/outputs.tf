output "custom_domain_id" {
  description = "Workers custom domain ID, when configured."
  value       = try(cloudflare_workers_custom_domain.this[0].id, null)
}

output "custom_hostname" {
  description = "Workers custom hostname, when configured."
  value       = var.custom_hostname
}

output "route_id" {
  description = "Workers route ID, when configured."
  value       = try(cloudflare_workers_route.this[0].id, null)
}

output "route_pattern" {
  description = "Workers route pattern, when configured."
  value       = var.route_pattern
}

output "worker_name" {
  description = "Worker service name."
  value       = var.worker_name
}
