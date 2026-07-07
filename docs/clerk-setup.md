# Clerk Setup

Clerk is managed manually for v1. Terraform provisions Cloudflare resources
only.

## Current Auth Model

- Anyone can read the catalog and reviews.
- Signing in enables account-aware UI, including the navbar `UserButton`.
- Review writes require a Clerk bearer token.
- The API verifies that the user's primary email is verified and ends in
  `@gatech.edu`.
- Non-Georgia-Tech users receive `403` from protected review write routes.
- UI sign-in and sign-up routes are `/sign-in` and `/sign-up`.

## Clerk Application

1. Create a Clerk application for OMSCS Hub.
2. Enable email-code passwordless authentication.
3. Disable passwords, social auth, passkeys, and other methods for v1 unless
   they preserve the Georgia Tech restriction.
4. Restrict signups/logins to `gatech.edu` with Clerk allowlist/domain controls
   where available.
5. Set custom sign-in URL to `/sign-in`.
6. Set custom sign-up URL to `/sign-up`.
7. Add local and deployed origins/redirects listed below.

## Domains And Redirects

Use Terraform outputs from `infra/environments/dev`:

- `ui_custom_url`: deployed app origin and redirect URL.
- `api_url`: API base URL for the UI and any Clerk origin/API configuration that
  needs it.

Add local development URLs:

- `http://localhost:3001`
- `http://localhost:8787`

For local-network testing from another machine, also add the URL you open in the
browser if Clerk blocks that origin, for example:

- `http://192.168.1.215:3001`
- `http://pc:3001`

`ui/next.config.mjs` separately controls Next dev resource origins. Current
allowed dev origins are `192.168.1.215` and `pc`; restart the dev server after
editing them.

## UI Environment

Local:

```bash
cd ui
cp .env.local.example .env.local
```

Remote build:

```bash
cd ui
cp .env.remote.example .env.remote.local
```

Values:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

For remote deploy, set `NEXT_PUBLIC_API_BASE_URL` to Terraform's `api_url`
output before running `pnpm deploy:remote`.

## API Environment

Local:

```bash
cd api
cp .dev.vars.example .dev.vars
```

Values:

```text
CLERK_SECRET_KEY=sk_...
CORS_ORIGIN=http://localhost:3001
```

Remote Worker secret:

```bash
cd api
pnpm wrangler secret put CLERK_SECRET_KEY
```

Current `api/wrangler.toml` includes:

```toml
CORS_ORIGIN = "https://dev.omscs-hub.reaganarmstrong.com,http://localhost:3001"
```

Update that value when UI origins change.

## GitHub Actions Values

If deploying through GitHub Actions, keep values in the `dev` environment:

Secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN_API`
- `CLOUDFLARE_API_TOKEN_UI`
- `CLERK_SECRET_KEY`

Variables:

- `D1_DATABASE_NAME`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_BASE_URL`

## API Protected Routes

These routes require Clerk auth and a verified `@gatech.edu` primary email:

- `POST /courses/:courseId/reviews`
- `PUT /courses/:courseId/reviews/me`
- `DELETE /courses/:courseId/reviews/me`

The UI obtains tokens with Clerk React's `getToken()` and sends them as:

```text
Authorization: Bearer <token>
```

## Expected User Experience

- Signed-out users can browse courses, specializations, the planner, and public
  reviews.
- Signed-out users see `Sign in to review` on course pages.
- Signed-in non-Georgia-Tech users can browse but see a message that a verified
  `@gatech.edu` account is required to write reviews.
- Signed-in Georgia Tech users can open the review form and submit reviews when
  `NEXT_PUBLIC_API_BASE_URL` is configured.
- If the API URL is missing, the review form shows `API URL not configured.`
- If the API is unreachable, course pages keep seeded reviews visible and show a
  review API fallback notice.

## Validation Checklist

- Local UI loads at <http://localhost:3001>.
- Local API `/health` loads at <http://localhost:8787/health>.
- Clerk sign-in and sign-up routes work.
- Navbar shows `Sign in` when signed out and `UserButton` when signed in.
- Georgia Tech account can submit a review.
- Non-Georgia-Tech account cannot submit a review.
- New review appears after course review reload.
