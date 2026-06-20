# D1 Database Module

Creates one Cloudflare D1 database.

## Resource

- `cloudflare_d1_database.this`

## Inputs

- `account_id`: Cloudflare account ID that owns the database.
- `name`: D1 database name.
- `primary_location_hint`: Optional D1 primary location hint.
- `read_replication_mode`: D1 read replication mode (`auto` or `disabled`).

## Outputs

- `database_id`: Created D1 database ID. Use this in `api/wrangler.toml`.
- `database_name`: Created D1 database name.

## Example

```hcl
module "review_database" {
  source = "../../modules/d1_database"

  account_id            = var.cloudflare_account_id
  name                  = "omscs-hub-reviews-dev"
  primary_location_hint = null
  read_replication_mode = "disabled"
}
```
