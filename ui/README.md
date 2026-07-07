# OMSCS Hub UI

Next.js frontend for OMSCS Hub. It provides the catalog, course detail pages,
review archive, specialization browser, term planner, auth screens, responsive
navigation, theme controls, and static deployment bundle.

## Current State

- Runs on Next.js 16.2.6 with the App Router, React 19, TypeScript 6, and
  Tailwind CSS 4.
- Builds as a static export with `output: "export"`.
- Deploys through Cloudflare Workers Assets from `out/`.
- Uses Clerk for sign-in/sign-up and review author identity.
- Uses local seed data as the base catalog and fallback review source.
- Loads live reviews from the API only when `NEXT_PUBLIC_API_BASE_URL` is set.
- Stores planner state and selected specialization in browser local storage.
- Uses a two-level mobile navbar: brand/theme/auth on row one, visible nav tabs
  on row two.
- Allows the current LAN dev origins `192.168.1.215` and `pc` in
  `next.config.mjs`; restart the dev server after changing those values.

## Stack

- Next.js App Router with React Server Components and client components.
- React 19 for interactive catalog filters, review controls, planner, and auth
  state.
- Tailwind CSS 4 with shadcn/radix-nova-style primitives.
- Clerk React for auth UI and bearer tokens.
- `next-themes` for light/dark mode.
- Motion dependency available for richer animations.
- `lucide-react`, custom inline icons, and custom SVG distribution charts.
- Wrangler for Workers Assets deployment.

## Layout

```text
ui/
  app/
    layout.tsx              # Providers, fonts, nav, footer
    page.tsx                # Catalog
    courses/[id]/page.tsx   # Static course detail routes
    specializations/page.tsx
    planner/page.tsx
    about/page.tsx
    sign-in/page.tsx
    sign-up/page.tsx
    globals.css
  components/
    catalog/                # Filter rail, cards, rows, sort/view controls
    courses/                # Course detail, logistics, planner sidebar
    planner/                # Term grid, unscheduled bucket, plan health
    reviews/                # Review list and verified review form
    specializations/        # Track browser and bucket progress
    ui/                     # Shared UI primitives
    site-nav.tsx            # Responsive nav + theme/auth controls
    site-footer.tsx
  lib/
    api/reviews.ts          # Browser API client
    data/                   # Course seeds, review seeds, specialization rules
    store/                  # Reviews, planner, and preference providers
    types.ts
  scripts/deploy-remote.mjs # Env-aware remote build/deploy helper
  next.config.mjs
  wrangler.toml
```

## Routes

- `/`: Catalog with search, filter rail, sort menu, and card/table view toggle.
- `/courses/[id]`: Course detail, distribution charts, logistics, reviews, and
  planner actions. Static params are generated from the seeded course list.
- `/specializations`: Track list, rules, required/foundational/elective
  buckets, free-elective search, selected-track state, and planner toggles.
- `/planner`: 2025-2027 Spring/Summer/Fall grid, unscheduled bucket,
  term-aware course picker, specialization progress, plan health, and clear
  action.
- `/about`: Project context and goals.
- `/sign-in`, `/sign-up`: Clerk email-code auth pages.

## Data And State

- `lib/data/courses.seed.ts` contains the local catalog; current count is 68
  courses.
- `lib/data/reviews.seed.ts` generates deterministic fallback reviews for 36
  profiled courses; current fallback total is 561 reviews.
- `lib/data/specializations.ts` defines specialization requirements and bucket
  progress helpers.
- `ReviewsProvider` exposes live API reviews when available and seeded reviews
  as fallback.
- `PlannerProvider` stores selected courses by term key in local storage.
- `PrefsProvider` stores selected specialization in local storage.

## Review Behavior

Course pages call `loadCourseReviews(course.id)` after mount. If
`NEXT_PUBLIC_API_BASE_URL` is configured, the UI requests:

```text
GET /courses/:courseId/reviews?source=all
```

When the API URL is missing, the UI skips remote loading and uses seeded data.
When the API is configured but unreachable, course pages show a fallback notice
and keep displaying seeded data.

Review writes require:

- signed-in Clerk user
- primary email ending in `@gatech.edu`
- configured `NEXT_PUBLIC_API_BASE_URL`
- review body of at least 20 characters

The form submits rating, difficulty, workload, recommendation, program stage,
semester, and body with a Clerk bearer token.

## Environment

Create local and remote env files:

```bash
cp .env.local.example .env.local
cp .env.remote.example .env.remote.local
```

Variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key.
- `NEXT_PUBLIC_API_BASE_URL`: Review API base URL. Use
  `http://localhost:8787` for local API development.

`pnpm deploy:remote` loads `.env.remote.local` before building, so local
development values from `.env.local` are not baked into the deployed static
export.

## Commands

```bash
pnpm install
pnpm dev            # Next dev server at http://localhost:3001
pnpm build          # Static export into out/
pnpm build:remote   # Build with .env.remote.local values
pnpm deploy:remote  # Build with .env.remote.local, then deploy Workers Assets
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm format         # Prettier for TS/TSX
```

Use a different remote env file with:

```bash
pnpm deploy:remote -- --env-file .env.somewhere.local
```

## Local Development

Run API and UI in separate terminals:

```bash
cd ../api
pnpm dev
```

```bash
cd ../ui
pnpm dev
```

Default URLs:

- UI: <http://localhost:3001>
- API: <http://localhost:8787>

If testing from another computer on the LAN, browse to the host machine's
network address and ensure `allowedDevOrigins` in `next.config.mjs` includes the
origin used by that browser. Restart `pnpm dev` after editing config.

## Deployment

`next.config.mjs` uses static export, and `wrangler.toml` serves `./out` with
Workers Assets:

```toml
name = "omscs-hub-ui-dev"
[assets]
directory = "./out"
```

Deploy after Terraform has created the placeholder UI Worker and routing:

```bash
pnpm deploy:remote
```

Terraform owns infrastructure and routing. Wrangler owns the deployed static
assets.
