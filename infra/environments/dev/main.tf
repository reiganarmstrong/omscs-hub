module "review_database" {
  source = "../../modules/d1_database"

  account_id            = var.cloudflare_account_id
  name                  = var.d1_database_name
  primary_location_hint = var.d1_primary_location_hint
  read_replication_mode = var.d1_read_replication_mode
}

resource "cloudflare_workers_script" "api_placeholder" {
  account_id         = var.cloudflare_account_id
  compatibility_date = var.api_worker_compatibility_date
  content_file       = "${path.module}/javascript/placeholder-api-worker.js"
  content_sha256     = filesha256("${path.module}/javascript/placeholder-api-worker.js")
  main_module        = "worker.js"
  script_name        = var.api_worker_name

  lifecycle {
    ignore_changes = [
      assets,
      bindings,
      body_part,
      compatibility_date,
      compatibility_flags,
      content,
      content_file,
      content_sha256,
      content_type,
      keep_assets,
      main_module,
    ]
  }
}

resource "cloudflare_workers_script" "ui_placeholder" {
  account_id         = var.cloudflare_account_id
  compatibility_date = var.ui_worker_compatibility_date
  content_file       = "${path.module}/javascript/placeholder-worker.js"
  content_sha256     = filesha256("${path.module}/javascript/placeholder-worker.js")
  main_module        = "worker.js"
  script_name        = var.ui_worker_name

  lifecycle {
    ignore_changes = [
      assets,
      bindings,
      body_part,
      compatibility_date,
      compatibility_flags,
      content,
      content_file,
      content_sha256,
      content_type,
      keep_assets,
      main_module,
    ]
  }
}

module "api_worker_routing" {
  source = "../../modules/worker_routing"

  account_id      = var.cloudflare_account_id
  custom_hostname = var.api_custom_hostname
  route_pattern   = var.api_route_pattern
  worker_name     = var.api_worker_name
  zone_id         = var.cloudflare_zone_id
  zone_name       = var.cloudflare_zone_name

  depends_on = [cloudflare_workers_script.api_placeholder]
}

module "ui_worker_routing" {
  source = "../../modules/worker_routing"

  account_id      = var.cloudflare_account_id
  custom_hostname = var.ui_custom_hostname
  route_pattern   = var.ui_route_pattern
  worker_name     = var.ui_worker_name
  zone_id         = var.cloudflare_zone_id
  zone_name       = var.cloudflare_zone_name

  depends_on = [cloudflare_workers_script.ui_placeholder]
}
