# Deployment

## Terraform

Terraform manages Cloudflare infrastructure: D1, Workers routes, Workers custom
domains, and a placeholder UI Worker used to make first apply succeed. Wrangler
deploys real Worker code and static assets.

Terraform creates a placeholder UI Worker before attaching the custom domain.
Wrangler deploys the real static UI assets after Terraform has created the D1
database and routing resources.

```bash
cd infra/environments/dev
terraform init
terraform fmt -check -recursive
terraform validate
terraform apply
```

Copy `d1_database_id` into `api/wrangler.toml` before deploying the API.

## API

```bash
cd api
pnpm install
pnpm wrangler d1 migrations apply omscs-hub-reviews-dev --remote
pnpm wrangler deploy
pnpm import:omscentral --sql-out .wrangler/tmp/omscentral-import.sql
pnpm import:omscentral --apply --remote --database omscs-hub-reviews-dev --sql-out .wrangler/tmp/omscentral-import.sql
```

The import dry run should report `134` courses and `9298` reviews when `omscentral-scraper/data` is present.
Use the same D1 location for migrations and import apply. For a remote deploy, both `pnpm import:omscentral` and `pnpm wrangler d1 migrations`
commands must use `--remote`. For a local database, both commands must use
`--local`; otherwise the import may run against a database whose schema was not
migrated.

## UI

```bash
cd ui
pnpm install
cp .env.remote.example .env.remote.local
pnpm deploy:remote
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.remote.local` to the Terraform
`api_url` output before building the static export. `pnpm deploy:remote` loads
that file into the build environment so `.env.local` development values are not
baked into the deployed assets.

The first Terraform apply may leave the custom UI hostname serving the
placeholder Worker until this Wrangler deploy completes. Terraform ignores
Worker deploy fields after creating the placeholder, so later applies should not
replace Wrangler-deployed UI assets.

## Troubleshooting

If Terraform fails with Cloudflare error `10007` and message `This Worker does
not exist on your account.`, confirm the `ui_worker_name` value matches the
Terraform-managed `cloudflare_workers_script.ui_placeholder` script name.
