resource "cloudflare_workers_custom_domain" "this" {
  count = var.custom_hostname == null ? 0 : 1

  account_id = var.account_id
  hostname   = var.custom_hostname
  service    = var.worker_name
  zone_id    = var.zone_id
  zone_name  = var.zone_name
}

resource "cloudflare_workers_route" "this" {
  count = var.route_pattern == null ? 0 : 1

  pattern = var.route_pattern
  script  = var.worker_name
  zone_id = var.zone_id
}
