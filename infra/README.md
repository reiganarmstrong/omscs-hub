# Infrastructure

Terraform for the Cloudflare resources that support OMSCS Hub.

## Layout

```text
infra/
  environments/
    bootstrap/   # One-time state bucket setup
    dev/         # Dev Cloudflare resources
  modules/
    d1_database/
    worker_routing/
```

## Environments

- `environments/bootstrap` provisions the R2 bucket used as the remote state
  backend for `dev`.
- `environments/dev` provisions the current development resources: D1 database,
  API Worker routing, and UI Worker routing.

## Common Commands

Run commands from the environment root you are changing.

```bash
terraform fmt
terraform init
terraform validate
terraform plan -var-file=terraform.tfvars
```

Do not run `terraform apply` unless you intend to change Cloudflare resources.

## Secrets

Do not commit real `terraform.tfvars`, R2 access keys, Cloudflare API tokens, or
other credentials. Use `*.tfvars.example` files for safe placeholders and keep
real values local.
