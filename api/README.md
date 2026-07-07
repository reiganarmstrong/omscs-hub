# OMSCS Hub API

Cloudflare Workers API for OMSCS Hub course reviews. The API exposes public
review reads and authenticated Georgia Tech review writes backed by Cloudflare
D1.

## Current State

- Worker entrypoint: `src/index.ts`
- Router: Hono
- Database: Cloudflare D1 binding named `DB`
- Auth: Clerk backend token verification
- Validation: Zod through `@hono/zod-validator`
- Tests: Vitest request-level tests
- Local/dev Worker name: `omscs-hub-review-api-dev`
- Local API default: <http://localhost:8787>
- Configured D1 database name: `omscs-hub-reviews-dev`
- Current `wrangler.toml` CORS origins:
  `https://dev.omscs-hub.reaganarmstrong.com,http://localhost:3001`

## Stack

- Hono for routing, middleware, and Worker request handling.
- Cloudflare D1 for course, review, term, and metadata storage.
- Clerk backend SDK for authenticated review writes.
- Zod for request body and query validation.
- Wrangler for local dev, dry-run builds, migrations, D1 commands, and deploys.
- Vitest for tests.

## Layout

```text
api/
  migrations/
    0001_reviews.sql          # D1 schema
  scripts/
    import-omscentral.ts      # OMSCentral JSON to idempotent D1 SQL
  src/
    auth.ts                   # Clerk token verification and @gatech.edu gate
    index.ts                  # Worker entrypoint, CORS, health, error handling
    reviews.ts                # Public read and authenticated write routes
    terms.ts                  # Academic term normalization
    types.ts                  # Bindings, variables, D1 row types
    validation.ts             # Zod schemas and validation responses
  tests/
    reviews.test.ts
  wrangler.toml
```

## Environment

Create local secrets:

```bash
cp .dev.vars.example .dev.vars
```

Required values:

- `CLERK_SECRET_KEY`: Clerk secret key. Tests use `test`.
- `CORS_ORIGIN`: Browser origins allowed by CORS. Use
  `http://localhost:3001` for the local UI.

`CORS_ORIGIN` accepts comma-separated values. If any configured origin is a
localhost or loopback origin, the API permits other localhost/loopback ports for
development.

Cloudflare Worker secrets:

- `CLERK_SECRET_KEY`

Set the remote Worker secret after the API Worker exists:

```bash
pnpm wrangler secret put CLERK_SECRET_KEY
```

## Commands

```bash
pnpm install
pnpm dev                # Wrangler dev server
pnpm test               # Vitest
pnpm typecheck          # TypeScript
pnpm build              # Wrangler deploy dry run into dist/
pnpm import:omscentral  # Import helper; see below
```

## Routes

### Health

```text
GET /health
```

Returns:

```json
{
  "ok": true,
  "service": "omscs-hub-review-api",
  "time": "..."
}
```

### List Reviews

```text
GET /courses/:courseId/reviews
```

Path `courseId` may be a course ID, slug, or course code. Codes are normalized
to uppercase with spaces converted to hyphens.

Query parameters:

- `source`: `all`, `omscentral`, or `app`; defaults to `all`.
- `includeDeleted`: `true` or `false`; defaults to `false`.

Response:

```json
{
  "courseId": "CS-6250",
  "reviews": []
}
```

### Review Summary

```text
GET /courses/:courseId/reviews/summary
```

Query parameters:

- `source`: `all`, `omscentral`, or `app`; defaults to `all`.

Returns active review counts, source counts, averages, and rating/difficulty
distributions.

### Create Review

```text
POST /courses/:courseId/reviews
Authorization: Bearer <clerk-token>
Content-Type: application/json
```

Creates a review for the signed-in user. A user may have only one active app
review per course.

### Update My Review

```text
PUT /courses/:courseId/reviews/me
Authorization: Bearer <clerk-token>
Content-Type: application/json
```

Updates the signed-in user's active app review for the course.

### Delete My Review

```text
DELETE /courses/:courseId/reviews/me
Authorization: Bearer <clerk-token>
```

Soft-deletes the signed-in user's active app review by setting `deleted_at`.

## Review Write Payload

```json
{
  "semester": "Fall 2025",
  "difficulty": 3,
  "workload": 15,
  "rating": 4,
  "recommend": true,
  "programStage": "Mid",
  "body": "At least 20 characters of review text."
}
```

Validation rules:

- `semester`: non-empty string, max 64 characters; defaults to `Unspecified`.
- `difficulty`: integer 1-5.
- `workload`: number 0-80.
- `rating`: integer 1-5.
- `recommend`: boolean.
- `programStage`: `First`, `Mid`, or `Late`.
- `body`: trimmed string, 20-8000 characters.

## Auth And Permissions

Public:

- `GET /health`
- review list and summary routes

Protected:

- review create/update/delete routes

Protected routes require:

- valid Clerk bearer token
- verified primary email
- email domain ending in `@gatech.edu`

Non-Georgia-Tech users receive `403`.

## D1 Schema

Migration `0001_reviews.sql` creates:

- `courses`
- `course_codes`
- `course_tags`
- `course_programs`
- `academic_terms`
- `app_users`
- `reviews`
- `omscentral_review_metadata`
- `app_review_metadata`

Notable constraints:

- `reviews.source` is `omscentral` or `app`.
- `difficulty` and `rating` are constrained to 1-5.
- `app_review_metadata` enforces one app review per user/course pair.
- Delete behavior is soft-delete through `reviews.deleted_at`.

## D1 Migrations

Apply locally:

```bash
pnpm wrangler d1 migrations apply omscs-hub-reviews-dev --local
```

Apply to remote dev:

```bash
pnpm wrangler d1 migrations apply omscs-hub-reviews-dev --remote
```

Use the same target for migrations and imports. If migrations run with
`--remote`, imports must also use `--remote`; for local, both must use
`--local`.

## OMSCentral Import

The import script reads scraper output from `../omscentral-scraper/data` by
default and emits idempotent SQL.

Generate SQL only:

```bash
pnpm import:omscentral --sql-out .wrangler/tmp/omscentral-import.sql
```

Generate and apply locally:

```bash
pnpm import:omscentral --apply --local
```

Apply to remote dev:

```bash
pnpm import:omscentral --apply --remote --database omscs-hub-reviews-dev --sql-out .wrangler/tmp/omscentral-import.sql
```

Options:

- `--data-dir <path>`: scraper data directory.
- `--database <name>`: D1 database name.
- `--sql-out <path>`: SQL output file.
- `--apply`: execute the generated SQL with Wrangler.
- `--local` or `--remote`: choose D1 target.

When the expected scraper data is present, the documented import dry run reports
134 courses and 9298 reviews.
