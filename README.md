# OMSCS Hub

An unofficial catalog, review archive, and degree planner for Georgia Tech's
**Online Master of Science in Computer Science**.

This project exists to combine the strengths of two long-standing community
resources for the program — [OMSCentral](https://www.omscentral.com/) (the
review archive) and the
[OMSCS Course Planner](https://omscscourseplanner.com/) (the schedule and
specialization-aware planner) — into a single, more pleasant interface that
scales from a first-time student picking their first course to a power user
comparing electives across specializations.

## Goals

- **One surface, both jobs.** Catalog browsing, reviews, statistics, and
  semester planning live under the same roof, navigable in seconds.
- **Better navigability.** Editorial layout, persistent filtering, dual
  card/table views, sortable reviews, and dark mode. Designed for speed of
  scanning *and* depth of inspection.
- **More signal in the stats.** Beyond average difficulty / workload / rating,
  every course detail page renders **distribution graphs** showing how many
  students reported each value — so you can see when an "average" hides a
  bimodal distribution.
- **Verified contribution.** Imported OMSCentral reviews stay source-labeled.
  New OMSCS Hub reviews require a verified `@gatech.edu` account.
- **Honest planning.** The planner respects each course's actual term
  offerings (Fall / Spring / Summer) and surfaces aggregate workload and
  difficulty across the courses you've selected.

## Beyond OMSCentral

Features added on top of the existing OMSCentral feature set:

- **Distribution graphs** for difficulty, weekly workload, and rating on every
  course page (gold-highlighted bin marks the mean).
- **Multi-axis review sorting** — newest, highest, lowest, hardest, easiest,
  longest workload, shortest workload — combined with semester / rating /
  recommendation filters.
- **Persistent catalog filter rail** — specialization, role (foundational vs
  elective), term offered, difficulty range, workload range, rating range, and
  a minimum-reviews floor.
- **Specialization compare view** with rules and full elective pools.
- **Term-aware planner** with live aggregate workload, difficulty, and degree
  progress. Courses won't slot into a term they aren't offered in.
- **Verified OMSCS Hub review submission** through Clerk and the D1-backed API,
  with OMSCentral imports kept as distinct source-labeled reviews.

## Status

This is moving from **front-end prototype** to Cloudflare-backed review system.

- Course list and fallback aggregates still come from deterministic seed data
  until the D1 import is loaded.
- A Cloudflare Workers API under `api/` provides D1-backed review reads and
  authenticated review writes.
- The UI is configured for static export and Workers Assets deployment.
- Clerk is configured manually for v1; see `docs/clerk-setup.md`.

## Stack

- **Next.js 16** (App Router, RSC, Turbopack dev server)
- **React 19**
- **Tailwind CSS 4** with shadcn radix-nova base
- **Motion**, `next-themes`, and a small set of custom SVG icons
- TypeScript end to end

## Running locally

```bash
cd api && pnpm install && pnpm dev
cd ui && pnpm install && pnpm dev
cd api && pnpm typecheck && pnpm test
cd ui && pnpm typecheck && pnpm lint
```

The UI dev server runs at <http://localhost:3000>. The API dev server defaults
to <http://localhost:8787>.

## Project layout

```
ui/
  app/                       # Next.js App Router
    page.tsx                 # Landing + catalog
    courses/[id]/page.tsx    # Course detail
    specializations/page.tsx
    planner/page.tsx
    about/page.tsx
  components/
    catalog/                 # Filter rail, course card, course row, catalog client
    courses/                 # Course detail (charts, sidebar, sections)
    reviews/                 # Sortable list, verified submission form
    planner/                 # Term grid, picker, plan health
    badges.tsx               # Tag, Stat, Stars
    distribution-chart.tsx   # Custom SVG distribution bars
    icons.tsx                # Inline SVG icon set
    site-nav.tsx, site-footer.tsx
    theme-provider.tsx       # next-themes + d hotkey
  lib/
    types.ts                 # Course, Review, Specialization, filter shapes
    data/
      courses.seed.ts        # Curated OMSCS course list
      reviews.seed.ts        # Deterministic synthetic reviews
      specializations.ts     # Track definitions
      index.ts               # Aggregation + distribution baking
    store/
      reviews-store.tsx      # API-backed review provider with seeded fallback
      planner-store.tsx      # Per-term plan provider (localStorage)
api/
  src/                       # Hono Worker API
  migrations/                # D1 SQL migrations
  scripts/import-omscentral.ts
infra/
  modules/                   # Cloudflare Terraform modules
  environments/dev           # Dev Terraform root
```

## Design notes

The visual direction is "academic registry" — paper / ink with a Georgia Tech
gold accent and a deep claret secondary. Typefaces:

- **Fraunces** — display (variable serif)
- **Geist** — body sans
- **JetBrains Mono** — labels, codes, numerics

Distribution charts are hand-rolled SVG bars (no chart dependency). All
interactivity is local state plus context — no Redux or external store.
