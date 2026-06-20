# Terraform Environments

Each directory here is a Terraform root module with its own state.

## Roots

- `bootstrap` creates the R2 bucket that can store dev Terraform state.
- `dev` creates the dev application infrastructure in Cloudflare.

## Workflow

Bootstrap must be created before dev can use R2 remote state.

```bash
cd bootstrap
terraform init
terraform plan -var-file=terraform.tfvars
```

After the bootstrap bucket exists and R2 credentials are available, initialize
dev with its backend config:

```bash
cd ../dev
terraform init -backend-config=backend.hcl
```

Keep backend configuration and variable files environment-specific. Shared,
reusable infrastructure belongs in `../modules`.
