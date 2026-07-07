# Dev Environment

Terraform root for OMSCS Hub development infrastructure in Cloudflare.

## Current Resources

This root composes local modules and placeholder Worker resources to manage:

- D1 review database.
- API placeholder Worker service.
- UI placeholder Worker service.
- API Worker custom domain or route.
- UI Worker custom domain or route.

Real Worker code is deployed separately with Wrangler from `../../../api` and
`../../../ui`.

## Worker Placeholder Model

Workers custom domains and routes require the target Worker service to already
exist. This environment creates Terraform-managed placeholder Workers before
attaching routing.

After apply:

```bash
cd ../../../api
pnpm wrangler deploy
```

```bash
cd ../../../ui
pnpm deploy:remote
```

Later Terraform applies ignore Worker deploy fields so Terraform does not
replace Wrangler-deployed Worker code, bindings, secrets, or assets.

## State Backend

`terraform.tf` declares a partial S3 backend. `backend.hcl` contains placeholder
R2 backend values for the bucket created by `../bootstrap`.

Initialize with:

```bash
terraform init -backend-config=backend.hcl
```

Prefer environment variables for real R2 credentials:

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

## Variables

Copy example variables:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Required values:

- `cloudflare_account_id`
- `cloudflare_zone_id`
- `ui_custom_hostname`

Frequently used optional values:

- `api_custom_hostname`
- `api_route_pattern`
- `ui_route_pattern`
- `cloudflare_zone_name`
- `d1_database_name`
- `d1_primary_location_hint`
- `d1_read_replication_mode`
- `api_worker_name`
- `ui_worker_name`
- Worker compatibility dates

Default app-facing names should line up with Wrangler config:

- API Worker: `omscs-hub-review-api-dev`
- UI Worker: `omscs-hub-ui-dev`
- D1 database: `omscs-hub-reviews-dev`

## Outputs

Key outputs:

- `api_url`: set in UI `NEXT_PUBLIC_API_BASE_URL` and Clerk origins.
- `ui_custom_url`: Clerk redirect/origin URL and browser URL.
- `d1_database_id`: copy into `api/wrangler.toml`.
- `d1_database_name`: use for Wrangler migration/import commands.
- `api_worker_name`: API Wrangler Worker name.
- `ui_worker_name`: UI Wrangler Worker name.
- route/custom-domain IDs for API and UI routing.

## Commands

```bash
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=terraform.tfvars
```

Run `terraform apply` only when ready to change dev Cloudflare resources.

## After Apply

1. Copy `d1_database_id` into `../../../api/wrangler.toml`.
2. Ensure API `database_name` and Worker `name` match Terraform outputs.
3. Apply D1 migrations from `../../../api`.
4. Set API Worker secret `CLERK_SECRET_KEY`.
5. Deploy API Worker with Wrangler.
6. Import OMSCentral data if needed.
7. Set `../../../ui/.env.remote.local` from Terraform and Clerk values.
8. Deploy UI Workers Assets with `pnpm deploy:remote`.

## Troubleshooting

If apply fails with Cloudflare error `10007` and message `This Worker does not
exist on your account.`, confirm `api_worker_name` or `ui_worker_name` matches
the Terraform-managed placeholder Worker script name.

If the deployed UI still shows a placeholder page after Terraform, deploy the UI
from `../../../ui`; Terraform only creates the placeholder and routing.
