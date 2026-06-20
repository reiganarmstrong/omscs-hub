# Clerk Setup

Clerk is managed manually for v1. Terraform provisions only Cloudflare resources.

## Application

1. Create a Clerk application for OMSCS Hub.
2. Enable email-code passwordless authentication.
3. Disable password, social, passkey, and other methods for v1 unless they preserve the `@gatech.edu` restriction.
4. Restrict signups/logins to `gatech.edu` using Clerk allowlist/domain controls when available.
5. Set custom sign-in URL to `/sign-in`.
6. Set custom sign-up URL to `/sign-up`.

## Domains And Redirects

Use Terraform outputs from `infra/environments/dev`:

- `ui_custom_url`: add as allowed origin and redirect URL.
- `api_url`: use for local UI `NEXT_PUBLIC_API_BASE_URL` and as allowed origin where Clerk requires it.

Add local dev URLs too:

- `http://localhost:3000`
- `http://localhost:8787`

## Secrets

Store values in these places:

- `ui/.env.local`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_BASE_URL`
- `api/.dev.vars`: `CLERK_SECRET_KEY`, optional `CORS_ORIGIN`
- GitHub Actions `dev` environment secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN_API`, `CLOUDFLARE_API_TOKEN_UI`, `CLERK_SECRET_KEY`
- GitHub Actions `dev` environment vars: `D1_DATABASE_NAME`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_BASE_URL`
- Cloudflare Worker secret: `CLERK_SECRET_KEY`

Set the Worker secret after the API Worker exists:

```bash
cd api
pnpm wrangler secret put CLERK_SECRET_KEY
```

## Expected Behavior

- Anyone can read course reviews.
- Review writes require a valid Clerk bearer token.
- API verifies the account primary email is verified and ends in `@gatech.edu`.
- Non-Georgia Tech users receive `403`.
