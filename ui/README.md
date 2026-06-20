# OMSCS Hub UI

Next.js frontend for OMSCS Hub: course catalog, review archive, specialization
browser, and term planner.

## Stack

- Next.js 16 App Router with static export.
- React 19 client components for filters, planning, auth, and review actions.
- Tailwind CSS 4 with shadcn-style primitives.
- Clerk for sign-in and verified review submission.
- Cloudflare Workers Assets for deployment.

## Layout

```text
ui/
  app/                  # App Router pages and global styles
  components/           # Feature components and UI primitives
  lib/
    api/                # API client helpers
    data/               # Seeded course, review, and specialization data
    store/              # Client state providers
    types.ts
  next.config.mjs       # Static export config
  wrangler.toml         # Workers Assets config
```

## Setup

Install dependencies:

```bash
pnpm install
```

Create local environment values:

```bash
cp .env.local.example .env.local
cp .env.remote.example .env.remote.local
```

Environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key.
- `NEXT_PUBLIC_API_BASE_URL`: Review API base URL. Use
  `http://localhost:8787` for local API development.

If `NEXT_PUBLIC_API_BASE_URL` is unset, course pages fall back to seeded review
data and skip remote review loading.

## Commands

```bash
pnpm dev        # Run Next dev server at http://localhost:3001
pnpm build      # Build static export into out/
pnpm build:remote  # Build with .env.remote.local values
pnpm deploy:remote # Build with .env.remote.local, then deploy Workers Assets
pnpm lint       # Run ESLint
pnpm typecheck  # Type-check UI source
pnpm format     # Format TypeScript and TSX files
```

## Routes

- `/`: Catalog and filtering surface.
- `/courses/[id]`: Course detail, distribution charts, and reviews.
- `/specializations`: Specialization comparison.
- `/planner`: Term-aware degree planner.
- `/about`: Project context.
- `/sign-in` and `/sign-up`: Clerk auth flows.

## Review Data Flow

The UI starts from local seed data in `lib/data`. Course pages request live
reviews through `lib/api/reviews.ts` when `NEXT_PUBLIC_API_BASE_URL` is set.
Authenticated create, update, and delete requests send Clerk bearer tokens to
the API.

## Deployment

`next.config.mjs` uses `output: "export"`, so `pnpm build` writes static assets
to `out/`. `wrangler.toml` serves that directory through Cloudflare Workers
Assets.

Deploy only when environment values and API URL are ready:

```bash
pnpm deploy:remote
```

`pnpm deploy:remote` loads `.env.remote.local` before building, so local
development values from `.env.local` are not baked into the remote static
export. Use `pnpm deploy:remote -- --env-file .env.somewhere.local` to target a
different ignored env file.

Worker names, domains, and route infrastructure are managed from `../infra`.
