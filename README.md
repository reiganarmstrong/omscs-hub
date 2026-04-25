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
- **Frictionless contribution.** Reviews are submitted anonymously. No account,
  no signup, no name attached to your post.
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
- **Anonymous review submission** that updates aggregates and distributions
  immediately (locally stored, until the back-end ships).

## Status

This is the **front-end prototype**.

- Course list, reviews, and aggregate stats are **synthetic test data**
  generated deterministically from per-course profiles. They are realistic in
  shape but are not real student reviews.
- Submitted reviews are stored in your browser (`localStorage`) and shown in
  the live aggregates. They are not persisted to a server.
- A real back-end and review-submission API are planned next; auth will follow
  after that, but reviews will remain anonymous.

## Stack

- **Next.js 16** (App Router, RSC, Turbopack dev server)
- **React 19**
- **Tailwind CSS 4** with shadcn radix-nova base
- **Motion**, `next-themes`, and a small set of custom SVG icons
- TypeScript end to end

## Running locally

```bash
cd ui
pnpm install          # already pre-installed in this repo
pnpm dev              # Next.js dev server with Turbopack
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
```

The dev server runs at <http://localhost:3000>.

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
    reviews/                 # Sortable list, anonymous submission form
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
      reviews-store.tsx      # Anonymous review provider (localStorage)
      planner-store.tsx      # Per-term plan provider (localStorage)
```

## Design notes

The visual direction is "academic registry" — paper / ink with a Georgia Tech
gold accent and a deep claret secondary. Typefaces:

- **Fraunces** — display (variable serif)
- **Geist** — body sans
- **JetBrains Mono** — labels, codes, numerics

Distribution charts are hand-rolled SVG bars (no chart dependency). All
interactivity is local state plus context — no Redux or external store.
