# Infrastructure

Terraform for the Cloudflare resources that support OMSCS Hub.

## Current State

Infrastructure is split from application deploys:

- Terraform creates D1, placeholder Workers, and Worker routing/custom domains.
- Wrangler deploys the real API Worker from `../api`.
- Wrangler deploys the static UI assets from `../ui`.
- Clerk is configured manually outside Terraform.

## Layout

```text
infra/
  environments/
    bootstrap/   # One-time R2 state bucket setup
    dev/         # Dev Cloudflare resources
  modules/
    d1_database/     # D1 database module
    worker_routing/  # Worker custom-domain/route module
  util/          # Bitwarden-backed Terraform helper scripts
```

## Environments

- `environments/bootstrap` provisions the R2 bucket used by the dev Terraform
  remote state backend.
- `environments/dev` provisions the current development resources:
  - D1 review database
  - API placeholder Worker
  - UI placeholder Worker
  - API Worker custom domain or route
  - UI Worker custom domain or route

## Worker Ownership

Cloudflare Worker routes/custom domains require a Worker service to exist
before routing can attach. The dev environment creates Terraform-managed
placeholder Workers for first apply:

- API placeholder for `omscs-hub-review-api-dev`
- UI placeholder for `omscs-hub-ui-dev`

After Terraform succeeds, deploy real code with Wrangler:

- API: `cd ../api && pnpm wrangler deploy`
- UI: `cd ../ui && pnpm deploy:remote`

The Terraform resources ignore Worker code/assets/binding changes after initial
creation so later Terraform applies do not replace Wrangler-deployed artifacts.

## Common Commands

Run commands from the environment root you are changing.

```bash
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -var-file=terraform.tfvars
```

Run `terraform apply` only when you intend to change Cloudflare resources.

## Outputs Used By The App

The dev environment exports values consumed by app deploys:

- `d1_database_id`: copy into `api/wrangler.toml`.
- `d1_database_name`: use in Wrangler migration/import commands.
- `api_url`: set as UI `NEXT_PUBLIC_API_BASE_URL`.
- `ui_custom_url`: configure in Clerk origins/redirects.
- `api_worker_name`: should match API Wrangler `name`.
- `ui_worker_name`: should match UI Wrangler `name`.

## Secrets

Do not commit real values for:

- `terraform.tfvars`
- `backend.hcl` credentials
- R2 access keys
- Cloudflare API tokens
- Clerk secret keys

Use `*.example` files for safe placeholders and keep real values local or in a
secret manager.
