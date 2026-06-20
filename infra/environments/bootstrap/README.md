# Bootstrap Environment

This root provisions the Cloudflare R2 bucket used by the dev Terraform remote
state backend. Keep this root on local state unless you later create a separate
backend for bootstrap itself.

## Resources

- `cloudflare_r2_bucket.terraform_state`: R2 bucket for dev Terraform state.

## Inputs

- `cloudflare_account_id`: Cloudflare account that owns the bucket.
- `r2_bucket_name`: Bucket name. Defaults to `omscs-hub-terraform-state-dev`.
- `r2_bucket_jurisdiction`: R2 jurisdiction. Defaults to `default`.
- `r2_bucket_location`: R2 location hint. Defaults to `enam`.
- `r2_storage_class`: Storage class for new objects. Defaults to `Standard`.

## Outputs

- `dev_backend_config`: Non-secret values for `../dev/backend.hcl`.
- `r2_bucket_id`: Created bucket ID.
- `r2_bucket_name`: Created bucket name.
- `r2_endpoint`: S3-compatible R2 endpoint.

## Backend Credentials

Cloudflare requires an R2 API token with Object Read and Write permissions for
Terraform's S3 backend. Create that token after the bucket exists, scoped to this
bucket, then use its Access Key ID and Secret Access Key with
`infra/environments/dev/backend.hcl` or the equivalent AWS environment
variables.

## Manual Deployment

```bash
cd infra/environments/bootstrap
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Then initialize dev with:

```bash
cd ../dev
terraform init -backend-config=backend.hcl
```
