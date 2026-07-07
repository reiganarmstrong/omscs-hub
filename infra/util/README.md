# Infrastructure Utility Scripts

Optional helper scripts for running Terraform with Cloudflare credentials loaded
from Bitwarden. Run these scripts from the Terraform environment directory you
are working in, such as `infra/environments/dev`.

The app does not require these helpers; they are a convenience for local
Terraform workflows that keep Cloudflare API tokens and R2 backend credentials
out of files.

## Prerequisites

- Bitwarden CLI (`bw`)
- `jq`
- Terraform
- An unlocked Bitwarden vault exported through `BW_SESSION`

Unlock Bitwarden before using either script:

```bash
export BW_SESSION=$(bw unlock --raw)
```

## Scripts

### `cf-env-loader.sh`

Loads the Cloudflare Terraform API token and Cloudflare R2 S3 backend
credentials from Bitwarden, then runs `terraform` with the arguments passed to
the script.

The script expects a Bitwarden item named `Local Cloudflare Token` with a custom
field named `API_KEY`.

It also expects the same R2 backend credential items used by
`cf-init-env-loader.sh`.

Example:

```bash
cd infra/environments/dev
../../util/cf-env-loader.sh plan -var-file=terraform.tfvars
../../util/cf-env-loader.sh apply -var-file=terraform.tfvars
```

For read-only validation, use Terraform directly when no credentials are needed:

```bash
terraform fmt -check -recursive
terraform validate
```

### `cf-init-env-loader.sh`

Loads Cloudflare R2 S3 backend credentials from Bitwarden, exports them as
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, then runs `terraform init`.

The script expects these Bitwarden items in a folder named `OMSCS-Hub`:

- `OMSCS-Hub-State-ID`: access key ID stored in item notes
- `OMSCS-Hub-State-Secret`: secret access key stored in item notes

Example:

```bash
cd infra/environments/dev
../../util/cf-init-env-loader.sh -backend-config=backend.hcl
```

Useful init variants:

```bash
../../util/cf-init-env-loader.sh -backend-config=backend.hcl -reconfigure
../../util/cf-init-env-loader.sh -backend-config=backend.hcl -migrate-state
```

Enable credential length debug output when troubleshooting empty or malformed
R2 credentials:

```bash
CF_INIT_ENV_LOADER_DEBUG=1 ../../util/cf-init-env-loader.sh -backend-config=backend.hcl
```

For normal Terraform commands, use the matching debug flag:

```bash
CF_ENV_LOADER_DEBUG=1 ../../util/cf-env-loader.sh plan -var-file=terraform.tfvars
```

## Credential Storage

Keep real Cloudflare API tokens, R2 access keys, and Terraform variable files
out of git. Store secrets in Bitwarden and keep only placeholder examples in
the repository.
