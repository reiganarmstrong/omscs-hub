# Clerk Setup

Clerk is managed manually for v1. Terraform provisions Cloudflare resources
only.

## Current Auth Model

- Anyone can read the catalog and reviews.
- Guests can browse the Catalog and create, assign, remove, and reload a local Study Plan.
- Sign-in enables account UI only after the API approves the verified primary email.
- Review writes require a Clerk bearer token.
- The API verifies the Clerk bearer token, loads the current user from Clerk, and
  requires the primary address to be verified with the exact `gatech.edu` domain.
  A verified secondary address never substitutes for a missing or ineligible primary.
- Non-Georgia-Tech users receive `403` from protected review write routes.
- UI sign-in and sign-up routes are `/sign-in` and `/sign-up`.

## Clerk Application

1. Create a Clerk application for OMSCS Hub.
2. Enable email-code passwordless authentication.
3. Disable passwords, social auth, passkeys, and other methods for v1 unless
   they preserve the Georgia Tech restriction.
4. In Clerk Dashboard, enable sign-up restrictions and add `gatech.edu` to the
   email domain allowlist for the application. Require email verification. Keep
   email code as the only sign-in and sign-up method. Apply these settings to
   both development and production instances before release.
   These provider settings block creation of ineligible accounts. Existing users
   and changes to primary emails still pass through the API eligibility check.
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

- `GET /auth/session` returns only `{ "eligible": true }`, never email or account ID.
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
- Sign-in rejects an unverified or non-Georgia-Tech primary email with a generic
  restriction message, even if another address on the account is verified.
- Restored ineligible sessions are signed out before account controls appear.
- If eligibility cannot be checked because the API is unavailable, account UI
  stays locked. Catalog browsing and local Study Plans remain available.
- Clerk errors show generic retry guidance without account or email details.
- If the Clerk publishable key is missing, guest browsing and planning still work;
  the sign-in page explains that sign-in is unavailable.
- Signed-in Georgia Tech users can open the review form and submit reviews when
  `NEXT_PUBLIC_API_BASE_URL` is configured.
- If the API URL is missing, sign-in cannot complete. The UI explains that
  sign-in could not be verified and keeps guest browsing and planning usable.
- If the API is unreachable, course pages keep seeded reviews visible and show a
  review API fallback notice.

## Validation Checklist

- Local UI loads at <http://localhost:3001>.
- Local API `/health` loads at <http://localhost:8787/health>.
- Clerk sign-in and sign-up routes work.
- Navbar shows `Sign in` when signed out and `UserButton` when signed in.
- Georgia Tech account can submit a review.
- Unverified primary, non-Georgia-Tech primary, and missing-primary accounts
  cannot sign in or submit, edit, or delete reviews. A verified Georgia Tech
  secondary address does not grant access.
- An invalid or expired token receives `401`; an ineligible primary receives `403`.
- Existing ineligible sessions do not show account controls.
- New review appears after course review reload.

## Automated local checks

```bash
cd api
pnpm test
pnpm typecheck
cd ../ui
pnpm exec playwright install --with-deps chromium
pnpm test:browser
pnpm lint
pnpm typecheck
pnpm build
```

The browser suite runs the actual Next UI against the actual Hono API. It replaces
external Clerk identity/email delivery and D1 storage with deterministic fixtures.
The Clerk React fixture is enabled only for a development server with
`OMSCS_BROWSER_TEST=1`; production builds always use the real Clerk package.
The request tests exercise every protected route against Clerk boundary fixtures,
including rejected primary emails, expired tokens, and successful review writes.

These tests do not validate Clerk Dashboard settings or live email delivery.
Before release, use the validation checklist against the deployed UI and API with
real verified and rejected accounts. No deployment or live Clerk configuration
change is performed by the local test suite.
