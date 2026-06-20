output "database_id" {
  description = "D1 database ID."
  value       = cloudflare_d1_database.this.id
}

output "database_name" {
  description = "D1 database name."
  value       = cloudflare_d1_database.this.name
}
