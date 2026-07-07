# Worker Routing Module

Connects an existing Cloudflare Worker service to a custom domain, route, or
both. OMSCS Hub dev uses this module for both the review API Worker and the
static UI Worker.

## Resources

- `cloudflare_workers_custom_domain.this`: Created when `custom_hostname` is
  set.
- `cloudflare_workers_route.this`: Created when `route_pattern` is set.

The Worker service itself is deployed outside Terraform with Wrangler. This
module only manages routing for that service. In the dev environment,
Terraform-created placeholder Workers satisfy Cloudflare's "service must exist"
requirement before routing is attached.

## Inputs

- `account_id`: Cloudflare account ID that owns the Worker.
- `custom_hostname`: Optional custom hostname routed to the Worker.
- `route_pattern`: Optional Workers route pattern, such as `api.example.com/*`.
- `worker_name`: Worker service name deployed by Wrangler.
- `zone_id`: Cloudflare zone ID containing the hostname or route.
- `zone_name`: Optional zone name for Workers custom domains.

## Outputs

- `custom_domain_id`: Workers custom domain ID, when configured.
- `custom_hostname`: Custom hostname input value.
- `route_id`: Workers route ID, when configured.
- `route_pattern`: Route pattern input value.
- `worker_name`: Worker service name.

## Example

```hcl
module "api_worker_routing" {
  source = "../../modules/worker_routing"

  account_id      = var.cloudflare_account_id
  custom_hostname = "api.example.com"
  route_pattern   = null
  worker_name     = "omscs-hub-review-api-dev"
  zone_id         = var.cloudflare_zone_id
  zone_name       = "example.com"
}
```
