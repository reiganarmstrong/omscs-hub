# Terraform Environments

Each directory here is a Terraform root module with its own state boundary.

## Roots

- `bootstrap`: creates the Cloudflare R2 bucket used for dev Terraform remote
  state.
- `dev`: creates OMSCS Hub development infrastructure in Cloudflare.

## Bootstrap First

Bootstrap uses local state by default:

```bash
cd bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

After the bucket exists, create R2 S3 credentials and configure dev backend
values from the bootstrap output.

## Initialize Dev

```bash
cd ../dev
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=terraform.tfvars
```

Use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for real R2 backend
credentials rather than writing them into `backend.hcl`.

## Boundary

Environment roots wire modules together for a concrete deployment target.
Reusable Terraform belongs in `../modules`; application code deploys remain in
`../../api` and `../../ui`.
