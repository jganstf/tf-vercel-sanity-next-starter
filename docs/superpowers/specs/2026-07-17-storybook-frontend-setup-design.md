# Storybook setup for `frontend`

## Goal

Add Storybook to the `frontend` workspace so components can be developed and reviewed in isolation, with initial stories for the existing presentational components.

## Scope

- Storybook lives entirely inside `frontend/` (config at `frontend/.storybook/`), not at the monorepo root — this workspace already owns its own eslint/tailwind/tsconfig, and Storybook only needs to understand the frontend's Next.js/Tailwind setup.
- Framework: `@storybook/nextjs` (the official Next.js framework for Storybook), installed via `npx storybook@latest init` run from `frontend/`. This auto-detects the Next.js + TypeScript project, wires up path aliases (`@/...`) from `frontend/tsconfig.json`, and mocks Next-specific APIs (`next/font/google`, `next/navigation`, `next/image`) automatically.
- `frontend/app/globals.css` (Tailwind v4 + custom theme) is imported in `.storybook/preview.tsx` so components render with real styling, fonts, and the `text-brand`/custom color tokens used throughout the app.
- Scripts added to `frontend/package.json` only: `storybook` (dev) and `build-storybook` (static build).

## Stories

**Tier 1 — get real stories now** (pure presentational components: props in, JSX out, no data fetching):
- `Avatar`
- `Date`
- `SideBySideIcons`
- `Footer`
- `Cta`
- `ResolvedLink`
- `InfoSection`
- `BlockRenderer`
- `PortableText`
- `DraftModeToast` (`'use client'`, but takes no async data — fine to render standalone)
- `GetStartedCode` (`'use client'`)
- `Onboarding` (`'use client'`)

Each gets a co-located `ComponentName.stories.tsx` with realistic mock props (e.g. mock Sanity image refs for `Avatar`, mock Portable Text blocks for `PortableText`/`BlockRenderer`).

**Tier 2 — explicitly out of scope, noted for follow-up:**
- `Header`, `Posts` — async Server Components that call `sanityFetch` directly against the live Sanity client. Storying these would require a real Sanity data-mocking layer (e.g. MSW against the Sanity API, or refactoring to accept data as props), which is a separate, larger effort.
- `PageBuilder` — a dispatcher over Sanity page-builder block types; better storied once the individual block components it renders have their own stories.
- `SanityImage` — a 9-line wrapper around the `sanity-image` package; not enough surface to warrant a story.

## Verification

- `npm run storybook --workspace=frontend` starts the dev server and every Tier 1 story renders without console errors, with Tailwind styles and fonts applied.
- `npm run build-storybook --workspace=frontend` produces a static build with no errors.
- `npm run lint` and `npm run type-check` (frontend) still pass with the new files in place.
