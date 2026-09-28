# Deployment

OMSCS Hub deploys to Cloudflare. Terraform owns infrastructure and routing;
Wrangler owns the deployed Worker code and static UI assets.

## Current Deployment Model

- `infra/environments/bootstrap` creates the R2 bucket used for Terraform remote
  state.
- `infra/environments/dev` creates:
  - D1 review database
  - API placeholder Worker
  - UI placeholder Worker
  - API Worker routing or custom domain
  - UI Worker routing or custom domain
- `api/` deploys the real Hono Worker with Wrangler.
- `ui/` builds a static Next.js export and deploys it with Workers Assets.
- Clerk remains manual for v1.

Terraform creates placeholder Workers because Cloudflare routes/custom domains
must point at an existing Worker service. After Terraform apply succeeds,
Wrangler deploys the real code/assets to the same Worker names. Later Terraform
applies ignore Worker code/assets/bindings so Terraform does not replace the
Wrangler deploy.

## Prerequisites

- Cloudflare account and zone.
- Cloudflare API token for Terraform.
- R2 access key/secret for Terraform remote state.
- Wrangler auth for API and UI deploys.
- Clerk application and secrets.
- `pnpm`, Terraform, and `uv` if refreshing scraper data.

## 1. Bootstrap Terraform State

The bootstrap root uses local state and creates the R2 bucket used by the dev
root.

```bash
cd infra/environments/bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Use the `dev_backend_config` output to fill `infra/environments/dev/backend.hcl`
with non-secret backend settings. Keep real R2 credentials in environment
variables or a secret manager.

## 2. Apply Dev Infrastructure

```bash
cd infra/environments/dev
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Important outputs:

- `d1_database_id`: copy into `api/wrangler.toml`.
- `d1_database_name`: D1 database name for Wrangler migration/import commands.
- `api_worker_name`: should match `api/wrangler.toml` `name`.
- `ui_worker_name`: should match `ui/wrangler.toml` `name`.
- `api_url`: use for `NEXT_PUBLIC_API_BASE_URL` and Clerk origins.
- `ui_custom_url`: use for Clerk redirect/origin settings.

## 3. Configure Clerk

Follow [clerk-setup.md](clerk-setup.md). At minimum:

- enable email-code auth
- configure `/sign-in` and `/sign-up`
- add local and deployed UI/API origins
- create UI publishable key and API secret key
- set the API Worker `CLERK_SECRET_KEY` secret

## 4. Configure API

```bash
cd api
pnpm install
cp .dev.vars.example .dev.vars
```

Update `wrangler.toml` after Terraform:

- `name` should match `api_worker_name`
- `database_name` should match `d1_database_name`
- `database_id` and `preview_database_id` should match `d1_database_id`
- `CORS_ORIGIN` should include deployed UI URL and local UI URL

Current dev config uses:

```toml
name = "omscs-hub-review-api-dev"
CORS_ORIGIN = "https://dev.omscs-hub.reaganarmstrong.com,http://localhost:3001"
```

Set the remote Clerk secret:

```bash
pnpm wrangler secret put CLERK_SECRET_KEY
```

## 5. Migrate D1

Local:

```bash
cd api
pnpm wrangler d1 migrations apply omscs-hub-reviews-dev --local
```

Remote dev:

```bash
cd api
pnpm wrangler d1 migrations apply omscs-hub-reviews-dev --remote
```

Use the same target for migration and import. Do not migrate local and import
remote, or vice versa.

## 6. Import OMSCentral Data

Refresh scraper data when needed:

```bash
cd omscentral-scraper
uv run omscentral-scrape
```

Generate import SQL:

```bash
cd ../api
pnpm import:omscentral --sql-out .wrangler/tmp/omscentral-import.sql
```

The import dry run should report `134` courses and `9298` reviews when the
expected `omscentral-scraper/data` files are present.

Apply locally:

```bash
pnpm import:omscentral --apply --local --sql-out .wrangler/tmp/omscentral-import.sql
```

Apply to remote dev:

```bash
pnpm import:omscentral --apply --remote --database omscs-hub-reviews-dev --sql-out .wrangler/tmp/omscentral-import.sql
```

## 7. Deploy API Worker

```bash
cd api
pnpm typecheck
pnpm test
pnpm build
pnpm wrangler deploy
```

Smoke test:

```bash
curl https://<api-host>/health
```

Expected shape:

```json
{
  "ok": true,
  "service": "omscs-hub-review-api",
  "time": "..."
}
```

## 8. Configure UI

```bash
cd ui
pnpm install
cp .env.remote.example .env.remote.local
```

Set in `.env.remote.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_BASE_URL`, usually Terraform's `api_url` output

For local development, `ui/.env.local` should usually use:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

## 9. Deploy UI Assets

```bash
cd ui
pnpm lint
pnpm typecheck
pnpm deploy:remote
```

`pnpm deploy:remote` loads `.env.remote.local`, runs the static Next.js build,
and deploys `out/` through Cloudflare Workers Assets. Use a different ignored
env file with:

```bash
pnpm deploy:remote -- --env-file .env.somewhere.local
```

The first Terraform apply may leave the UI hostname serving the placeholder
Worker until this deploy completes.

## 10. Post-Deploy Checks

Run the deployed smoke suite on desktop and mobile layouts:

```bash
cd ui
pnpm exec playwright install --with-deps chromium
SMOKE_BASE_URL=https://<ui-host> \
SMOKE_API_URL=https://<api-host> \
SMOKE_EMAIL=<smoke-account>@gatech.edu \
SMOKE_EMAIL_CODE=<code> \
pnpm test:smoke:deployed
```

It runs `ui/tests/release`, the same journeys CI runs against the local UI and
API harness:

- API health, CORS for the UI origin, and `401` for unauthenticated or invalid
  tokens on protected routes.
- Anonymous Catalog browsing with every current Course, course facts, real
  Imported Reviews with original links, and current Specialization rules.
- Review-service failure, from first load and after a course page loads, keeps
  course facts and shows no reviews, review statistics, or write controls.
- A verified Georgia Tech account selects a Specialization, plans a course,
  records a Course Attempt, sees current-rule progress, and sees the same
  private Study Plan on a second browser context. The run clears the plan
  before and after.
- The same account publishes, edits, and deletes a Hub Review under its
  pseudonym. The review is public for a few seconds; set
  `SMOKE_REVIEW_COURSE` to choose the Course (default `CS-6300`).

The smoke account must already exist and have a verified primary
`@gatech.edu` email. With a Clerk development instance, use a Clerk test
address such as `omscs-smoke+clerk_test@gatech.edu` and code `424242`; no email
is sent. Production Clerk instances do not accept test codes; there, run the
suite with `SMOKE_ANONYMOUS_ONLY=1` and walk the signed-in journeys by hand.
`SMOKE_ANONYMOUS_ONLY=1` skips the signed-in journeys; the release workflow
never sets it.

Still check manually after release:

- A non-Georgia-Tech email cannot sign up or sign in (Clerk allowlist).
- The mobile navbar shows brand/theme/auth on top and nav tabs below.

## 11. Release Workflow

`.github/workflows/release-beta.yml` runs steps 5 to 10 in order. Start it
manually from GitHub Actions. It:

1. Runs API, UI, script, and browser journey checks (desktop and mobile).
2. Runs `scripts/check_release_config.py`: required values, https origins,
   `CORS_ORIGIN` containing `PUBLIC_UI_URL`, the D1 name matching
   `api/wrangler.toml`, matching Clerk key types, a `@gatech.edu` smoke
   account, and scheduled source-check workflows. It then confirms both
   source-check workflows are enabled in GitHub.
3. Scrapes OMSCentral and stops if historical review courses differ from
   `ui/lib/data/historical-courses.json`. It then applies D1 migrations and
   imports Catalog facts and Imported Reviews into the same remote database.
   A failed OMSCentral scrape stops the release before any change.
4. Deploys the API with `CLERK_SECRET_KEY`, checks `/health`, builds the
   public Catalog, and deploys UI assets.
5. Runs the deployed smoke suite and uploads its report.

The public beta is the `dev` environment (Clerk development instance). The
push-triggered `deploy-api.yml` and `deploy-ui.yml` workflows still deploy code
without imports or smoke checks; run this workflow for every release.

The `dev` GitHub environment needs:

| Kind | Name |
| --- | --- |
| Variable | `PUBLIC_UI_URL` (deployed UI origin) |
| Variable | `NEXT_PUBLIC_API_BASE_URL` |
| Variable | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Variable | `D1_DATABASE_NAME` |
| Variable | `SMOKE_EMAIL` |
| Secret | `SMOKE_EMAIL_CODE` |
| Secret | `CLERK_SECRET_KEY` |
| Secret | `CLOUDFLARE_ACCOUNT_ID` |
| Secret | `CLOUDFLARE_API_TOKEN_API` |
| Secret | `CLOUDFLARE_API_TOKEN_UI` |

Release notes: [releases/public-beta.md](releases/public-beta.md).

## Local-Network Development

The UI dev server runs on port `3001`. If testing from another device on the
LAN, use the host machine's network URL and make sure `allowedDevOrigins` in
`ui/next.config.mjs` includes the origin seen by the browser. Current values are
`192.168.1.215` and `pc`.

Restart the Next dev server after changing `next.config.mjs`.

## Troubleshooting

### Cloudflare Worker Does Not Exist

If Terraform fails with Cloudflare error `10007` and message `This Worker does
not exist on your account.`, confirm `api_worker_name` and `ui_worker_name`
match the Terraform-managed placeholder Worker script names.

### Review API Unavailable In UI

Check:

- `NEXT_PUBLIC_API_BASE_URL` was set at UI build time.
- API Worker `/health` responds.
- API `CORS_ORIGIN` includes the deployed UI origin.
- For local dev, API and UI are using matching local/remote targets.

### D1 Import Fails

Check:

- migrations were applied to the same D1 target as the import
- scraper JSON exists under `omscentral-scraper/data`
- `--database` matches the D1 database name
- `--local` or `--remote` matches the intended target
