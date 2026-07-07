# OMSCS Hub

An unofficial catalog, review archive, and degree planner for Georgia Tech's
**Online Master of Science in Computer Science** program.

OMSCS Hub combines the public OMSCentral review archive with a planning
experience shaped around OMSCS specializations, course logistics, and
term-aware scheduling. The current application is a Cloudflare-backed web app:
the UI is a static-exported Next.js app served by Workers Assets, while the
review API is a Cloudflare Worker with D1 storage and Clerk-authenticated
review writes.

## Current State

- Catalog, course detail, specialization, planner, and about pages are live in
  the Next.js UI.
- The local course catalog contains 68 seeded OMSCS courses.
- Seeded fallback reviews are generated deterministically for 36 profiled
  courses, totaling 561 local reviews for offline/demo use.
- The API supports D1-backed course/review reads and authenticated review
  creates, updates, and soft deletes.
- OMSCentral imports flow from `omscentral-scraper/data` into generated D1 SQL.
  The currently documented import baseline is 134 courses and 9298 reviews when
  that scraper output is present.
- Review writing requires Clerk authentication and a verified `@gatech.edu`
  primary email.
- Cloudflare infrastructure is managed with Terraform under `infra/`; Wrangler
  deploys the real API Worker and static UI assets after Terraform creates the
  database, placeholder Workers, and routing.

## Product Features

- **Responsive navigation.** Desktop uses a single horizontal header. Mobile
  keeps the brand, theme toggle, and auth control on the top row, then exposes
  Catalog, Specializations, Planner, and About as a visible horizontal tab row.
- **Catalog search and filters.** Search across code, title, tags, and
  descriptions. Filter by specialization, role, term offered, difficulty range,
  workload range, rating range, and minimum review count.
- **Dual catalog views.** Browse courses as cards or a dense table, with
  sorting by code, title, rating, difficulty, workload, and review count.
- **Course detail pages.** Each course page shows description, tags,
  specialization role, offered terms, prerequisites, review distributions,
  review controls, and planner actions.
- **Distribution charts.** Difficulty, weekly workload, and rating use custom
  SVG distribution bars with the mean bucket highlighted.
- **Review archive.** Course pages load live API reviews when
  `NEXT_PUBLIC_API_BASE_URL` is configured; otherwise they fall back to seeded
  data. Review lists support semester filtering, recommendation filtering,
  minimum rating, and multiple sort orders.
- **Verified review submission.** Signed-in Georgia Tech users can submit an
  OMSCS Hub review with rating, difficulty, workload, recommendation, program
  stage, semester, and body. The API enforces one active app review per user per
  course and supports update/delete endpoints.
- **Specialization browser.** Tracks show required slots, elective buckets,
  free-elective progress, selected track state, and planned-course progress.
  Clicking a course adds/removes it from the planner's unscheduled bucket.
- **Term-aware planner.** Plans Spring/Summer/Fall terms for 2025-2027, keeps an
  unscheduled bucket, filters course picks by term availability, and summarizes
  credit hours, course count, average difficulty, average workload, and
  specialization progress.
- **Preferences and local state.** Theme, planner state, and selected
  specialization are client-side concerns backed by context and local storage.
- **Dark mode.** `next-themes` controls light/dark mode with a navbar toggle and
  `d` keyboard shortcut when focus is not in a typing field.

## Stack

- **UI:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4,
  shadcn/radix-nova-style primitives, `next-themes`, Motion, Clerk React, and
  custom icon/chart components.
- **API:** Cloudflare Workers, Hono, Cloudflare D1, Clerk backend SDK, Zod,
  Vitest, and Wrangler.
- **Scraper:** Python 3.11+ project using only the standard library at runtime,
  managed with `uv`.
- **Infrastructure:** Terraform for Cloudflare D1, placeholder Workers, Worker
  routes/custom domains, and R2-backed Terraform state.

## Repository Layout

```text
.
  README.md
  docs/
    clerk-setup.md           # Clerk app, redirects, and secret placement
    deployment.md            # Terraform, API, UI, import, and deploy flow
  ui/
    app/                     # Next.js App Router pages
    components/              # Catalog, course, planner, review, nav, and UI components
    lib/
      api/                   # Browser API client helpers
      data/                  # Seeded courses, reviews, specializations
      store/                 # Review, planner, and preference providers
    scripts/deploy-remote.mjs
    next.config.mjs          # Static export + dev origin config
    wrangler.toml            # Workers Assets config
  api/
    src/                     # Hono Worker source
    migrations/              # D1 schema
    scripts/import-omscentral.ts
    tests/
    wrangler.toml
  omscentral-scraper/
    src/omscentral_scraper/  # OMSCentral scraper CLI/library
    tests/
  infra/
    environments/
      bootstrap/             # R2 state bucket root
      dev/                   # Dev Cloudflare root
    modules/                 # D1 and Worker routing modules
    util/                    # Bitwarden-backed Terraform helpers
```

## Local Development

Install dependencies per package:

```bash
cd api && pnpm install
cd ../ui && pnpm install
cd ../omscentral-scraper && uv sync
```

Create local env files:

```bash
cp api/.dev.vars.example api/.dev.vars
cp ui/.env.local.example ui/.env.local
cp ui/.env.remote.example ui/.env.remote.local
```

Run the API and UI in separate terminals:

```bash
cd api
pnpm dev
```

```bash
cd ui
pnpm dev
```

Default local URLs:

- UI: <http://localhost:3001>
- API: <http://localhost:8787>

For local-network UI testing against the dev server, `ui/next.config.mjs`
currently allows `192.168.1.215` and `pc` as dev origins. Restart the Next dev
server after changing `allowedDevOrigins`.

## Validation

```bash
cd ui
pnpm lint
pnpm typecheck
```

```bash
cd api
pnpm typecheck
pnpm test
pnpm build
```

```bash
cd omscentral-scraper
uv run python -m unittest discover -s tests
```

Terraform validation is environment-specific:

```bash
cd infra/environments/dev
terraform fmt -check -recursive
terraform validate
```

## Data Flow

1. Seeded UI data in `ui/lib/data` powers local browsing and fallback review
   behavior.
2. The scraper writes OMSCentral JSON into `omscentral-scraper/data`.
3. `api/scripts/import-omscentral.ts` converts scraper JSON into idempotent SQL
   for D1.
4. D1 stores courses, course codes/tags/programs, academic terms, imported
   OMSCentral reviews, app users, and app review metadata.
5. The API exposes review list/summary endpoints publicly and protects review
   writes with Clerk bearer tokens plus a verified `@gatech.edu` check.
6. The UI reads live reviews from `NEXT_PUBLIC_API_BASE_URL` when configured
   and falls back to seeded reviews when it is not.

## Deployment

Deployment is split deliberately:

1. Terraform in `infra/environments/bootstrap` creates the R2 bucket for dev
   Terraform state.
2. Terraform in `infra/environments/dev` creates the D1 database, placeholder
   Workers, and Worker routing/custom domains.
3. Wrangler applies D1 migrations and deploys the real API Worker from `api/`.
4. The OMSCentral import script loads scraper data into D1.
5. `ui/scripts/deploy-remote.mjs` loads `ui/.env.remote.local`, builds the
   static Next.js export, and deploys Workers Assets with Wrangler.

See [docs/deployment.md](docs/deployment.md) for step-by-step commands.

## Clerk

Clerk is manual for v1. Terraform does not manage Clerk resources. Configure
email-code auth, restrict eligible writers to Georgia Tech email addresses, and
place publishable/secret keys in the UI, API, GitHub Actions, and Cloudflare as
described in [docs/clerk-setup.md](docs/clerk-setup.md).

## Design Direction

The interface is an academic registry: paper/ink surfaces, restrained borders,
Georgia-Tech-adjacent gold/leaf accents, and dense but scannable controls.
Current typefaces:

- **Fraunces** for display headings.
- **Geist** for body/UI text.
- **JetBrains Mono** for labels, code-like values, and numerics.

Frontend design guidance in this repo now prefers the Anthropic
`frontend-design` skill for UI/design work. The workspace-local copy lives in
`.agents/skills/frontend-design`, and `skills-lock.json` records its source.
