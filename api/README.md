# OMSCS Hub API

Cloudflare Workers API for OMSCS Hub reviews.

## Stack

- Hono for routing and middleware.
- Cloudflare D1 for course and review storage.
- Clerk backend SDK for authenticated review writes.
- Zod validation through `@hono/zod-validator`.
- Vitest for request-level tests.

## Layout

```text
api/
  migrations/                 # D1 schema migrations
  scripts/import-omscentral.ts # OMSCentral JSON to D1 import helper
  src/
    auth.ts                   # Clerk token verification and @gatech.edu gate
    index.ts                  # Worker entrypoint, CORS, health route
    reviews.ts                # Review read/write routes
    terms.ts                  # Academic term normalization
    validation.ts             # Request schemas
  tests/
    reviews.test.ts
  wrangler.toml
```

## Setup

Install dependencies:

```bash
pnpm install
```

Create local Worker secrets from the example:

```bash
cp .dev.vars.example .dev.vars
```

Required local values:

- `CLERK_SECRET_KEY`: Clerk secret key. Tests use `test`.
- `CORS_ORIGIN`: Allowed browser origin, usually `http://localhost:3001`.
  Comma-separated values are supported. When any configured origin is localhost
  or loopback, local UI ports are allowed for development.

`wrangler.toml` binds the D1 database as `DB`. Replace placeholder database IDs
after Terraform creates the dev D1 database.

## Commands

```bash
pnpm dev        # Run Worker locally with Wrangler
pnpm test       # Run Vitest suite
pnpm typecheck  # Type-check Worker source
pnpm build      # Wrangler dry-run build into dist/
```

## D1 Migrations

Apply migrations with Wrangler when database config is ready:

```bash
pnpm wrangler d1 migrations apply omscs-hub-reviews-dev --local
```

Drop `--local` when intentionally applying to the remote dev database.

## API Routes

- `GET /health`: Worker health check.
- `GET /courses/:courseId/reviews`: List reviews for a course.
- `GET /courses/:courseId/reviews/summary`: Aggregate review summary.
- `POST /courses/:courseId/reviews`: Create the signed-in user's review.
- `PUT /courses/:courseId/reviews/me`: Update the signed-in user's review.
- `DELETE /courses/:courseId/reviews/me`: Soft-delete the signed-in user's
  review.

Review writes require a Clerk bearer token for a verified `@gatech.edu` email.

Query parameters for review reads:

- `source`: `all`, `omscentral`, or `app`. Defaults to `all`.
- `includeDeleted`: `true` or `false`. Defaults to `false`.

## Importing OMSCentral Data

The import script reads scraper output from `../omscentral-scraper/data` by
default and emits SQL for D1.

Generate SQL only:

```bash
pnpm import:omscentral --sql-out .wrangler/tmp/omscentral-import.sql
```

Generate and apply locally:

```bash
pnpm import:omscentral --apply --local
```

Apply to remote dev only when ready:

```bash
pnpm import:omscentral --apply --remote --database omscs-hub-reviews-dev
```
