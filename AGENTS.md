<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Temper & Forge Sanity + NextJS Starter

This is an **agent-first repo**: it's built and maintained primarily by AI agents. The docs *are* the onboarding — there's no team to ask, so keeping them true is part of every task (see [Documentation procedure](#documentation-procedure)).

## Start here

1. Read this file top to bottom — it's the operating manual.
2. Open only the [docs](#docs-index) your task actually touches. Don't read everything; conserve context.
3. New to a tool? [docs/stack.md](docs/stack.md) links to the *right* docs for the exact versions this repo uses.

## Non-negotiables

- **Next.js is non-standard** (see the box above) — read `node_modules/next/dist/docs/` before writing Next.js code.
- **Styling is tokens-only** — semantic utilities (`bg-surface`, `text-foreground`, `border-border`), never raw palette colours (`bg-zinc-*`) or hex. Full rules in [docs/design-system.md](docs/design-system.md); enforced by `npm run lint:tokens`.
- **No new dependencies** without checking with the user first.
- **No secrets in the repo** — keys and config go in `.env.local` (gitignored). Flag anything that needs a change *outside* the codebase (see [External dependencies](#external-dependencies)).

## Definition of done

A task isn't finished until all of these hold:

- [ ] **Builds clean** — `npm run build` succeeds with no errors and no new warnings.
- [ ] **Lints clean** — `npm run lint` passes (ESLint **and** the design-token check).
- [ ] **Types clean** — no TypeScript errors.
- [ ] **Tests pass** — `npm run test-storybook`; any new or changed component has a `*.stories.tsx`.
- [ ] **No new accessibility violations** — check the Storybook a11y panel for components you touched.
- [ ] **No regressions** — existing behaviour still works, *verified* in the running app or Storybook, not assumed.
- [ ] **Scope held** — you did what was asked. Adjacent problems are flagged to the user and logged in [docs/deferred-work.md](docs/deferred-work.md), not silently fixed. No abstractions nothing yet needs.
- [ ] **External changes flagged** — see [External dependencies](#external-dependencies).
- [ ] **Docs updated** — see [Documentation procedure](#documentation-procedure).

> There's no CI yet, so *you* are the gate. A pre-commit token check is available — opt in once with `git config core.hooksPath .githooks`.

## Don't leave servers running

Most verification needs **no long-running server**: `npm run build`, `npm run lint`, and `npm run test-storybook` (headless Vitest) each run once and exit. Reach for these first — they cover almost everything in the Definition of done.

Only start a persistent server (`npm run dev`, `npm run storybook`) when you actually need to *see* the running app or Storybook. When you do: start it, run your check, then **stop it before you finish the task** — via `preview_stop` if you launched it through the preview tools, or by killing the process you started. Never background one and walk away. Orphaned servers stack up across chat sessions and block the ports (`3000`, `6006`) the next session needs.

## External dependencies

Some work depends on configuration that lives outside this repo — host environment variables, the Sanity project, DNS, third-party dashboards. The codebase can't make those changes. When a task needs one, **stop and tell the user exactly what to change and where**, so it doesn't silently half-ship.

## Deferred work

Anything you intentionally leave for later — out of scope, blocked on an external step, or a
decision that's the user's to make — goes in [docs/deferred-work.md](docs/deferred-work.md) **in
the same change**, so it outlives the PR thread. Drop a code comment at the relevant spot pointing
there, and **delete the entry when the work lands**. Telling the user is good; only the doc makes
it durable.

## Documentation procedure

The docs are the map every future agent navigates by. A wrong doc misleads every session that follows, so stale docs are worse than messy code.

- **Docs reflect reality.** If your change makes a doc untrue, fix the doc in the same change.
- **Leave them better than you found them.** Not every task touches the docs — but every task *asks the question before finishing*: did anything here make a doc stale, or reveal something the docs should have told me?
- **One source of truth.** Each fact lives in exactly one doc; everything else links to it. Don't restate — link.
- **Stay terse and scoped.** One doc, one job. Link out instead of inlining. Match the house style of [docs/sanity-project.md](docs/sanity-project.md), and name doc files in lowercase kebab-case.
- **Keep the index honest.** Add, rename, or remove a doc → update the [Docs index](#docs-index) in the same change.

## When something goes wrong

A mistake — a broken build, a wrong assumption, or a correction from the user — is a signal the docs had a gap. Close it:

1. **Fix the issue** — the root cause, not just the symptom.
2. **Find the gap** — what rule or context, had it been written down, would have prevented this?
3. **Write it down** — add that rule to the right doc (or this file). A lesson that isn't captured gets repeated.

## Docs index

| Doc | What it covers |
| --- | --- |
| [docs/stack.md](docs/stack.md) | Tech stack — exact versions and links to the matching docs |
| [docs/design-system.md](docs/design-system.md) | Design-token & styling system — colour, type, spacing, icons, dark mode, responsive |
| [docs/token-sync.md](docs/token-sync.md) | Syncing tokens & type styles from Figma — export, diff, and the JSON→CSS mapping |
| [docs/component-organization.md](docs/component-organization.md) | Component tier system — primitives, patterns, sections, layout; decision heuristic and import paths |
| [docs/sanity-project.md](docs/sanity-project.md) | Pointing the frontend at a different Sanity project |
| [docs/sanity-typegen.md](docs/sanity-typegen.md) | Sanity schema extraction & typegen — why `sanity.schema.json` is committed, how to regenerate it |
| [docs/environment-variables.md](docs/environment-variables.md) | All env vars for the frontend and Studio, and how they're set locally vs. on Vercel/deployed Studio |
| [docs/sitemap.md](docs/sitemap.md) | Site map — all URLs, their status (built / planned), and the three-tier hierarchy (category → solution → service) |
| [docs/editor-routing.md](docs/editor-routing.md) | How editor-driven pages resolve under a reserved URL prefix (Solutions, Scope) and how to add a new one |
| [docs/content-preview.md](docs/content-preview.md) | Preview/sample content vs. Sanity content — CMS-backed components never invent defaults; empty blocks render nothing |
| [docs/section-reveals.md](docs/section-reveals.md) | Shared reveal-on-scroll system — one tuning point, coverage, opt-outs, and safe extension rules |
| [docs/deferred-work.md](docs/deferred-work.md) | Known work intentionally deferred — what's parked, where, and what unblocks it |
| [README.md](README.md) | Human-facing overview — getting started, scripts, project structure |

Planning docs and specs live under `docs/superpowers/{plans,specs}`.
