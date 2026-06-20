# Dev Environment

Terraform root for OMSCS Hub development infrastructure in Cloudflare.

## Resources

This root composes local modules to manage:

- D1 review database.
- API placeholder Worker service.
- UI placeholder Worker service.
- API Worker custom domain or route.
- UI Worker custom domain or route.

Real Worker code is deployed separately with Wrangler from `api/` and `ui/`.
This environment manages the Cloudflare infrastructure around those Workers,
plus placeholder Workers for first-apply routing.

Workers custom domains and routes require the target Worker service to already
exist. This environment creates Terraform-managed placeholder Workers before
attaching custom domains. After apply, deploy the real API and UI from
`../../../api` and `../../../ui` with Wrangler. Later Terraform applies ignore
Worker deploy fields so they do not replace the Wrangler-deployed Worker code,
bindings, secrets, or assets.

## State Backend

`terraform.tf` declares a partial S3 backend. `backend.hcl` contains placeholder
R2 backend values for the bucket created by `../bootstrap`.

Initialize with:

```bash
terraform init -backend-config=backend.hcl
```

Prefer `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables for
real R2 credentials instead of writing secrets into `backend.hcl`.

## Variables

Copy `terraform.tfvars.example` to `terraform.tfvars` and replace placeholders
with real Cloudflare values:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Required values:

- `cloudflare_account_id`
- `cloudflare_zone_id`
- `ui_custom_hostname`

Optional values configure API hostnames, route patterns, zone name, D1 location,
D1 read replication, Worker service names, and the UI placeholder Worker
compatibility date.

## Commands

```bash
terraform fmt
terraform validate
terraform plan -var-file=terraform.tfvars
```

Run `terraform apply` only when ready to change dev Cloudflare resources.

If apply fails with Cloudflare error `10007` and message `This Worker does not
exist on your account.`, confirm the `api_worker_name` or `ui_worker_name` value
matches the Terraform-managed placeholder Worker script name.
