# Deferred work

Known work intentionally left for later. Delete an entry once it lands.

## `npm run build` fails prerendering `/_global-error`

`next build` fails with `TypeError: Cannot read properties of null (reading 'useContext')` while
prerendering the special `/_global-error` page, aborting the build. Confirmed this predates the
`development` → `dev-frontend` merge (reproduces on `dev-frontend`'s pre-merge tip in an isolated
worktree with the same `.env.local`), so it isn't something the merge or HeroSecondary Storybook
work introduced. Needs a systematic-debugging pass — likely an RSC/client boundary issue in
`app/layout.tsx` or one of the components it wires together (`Header`, `Footer`, `Banner`,
`TopNav`), since that's the only file every render path shares.

## 404 page template

`app/[...slug]/page.tsx` calls `notFound()` when no matching Sanity page exists, but the repo has
no custom `app/not-found.tsx` — visitors currently hit Next.js's default 404 page. Add a
branded 404 template.

## Form builder — phases 2 & 3 (deferred)

Phase 1 (core form system) shipped — see
[docs/superpowers/specs/2026-07-21-form-builder-phase1-design.md](superpowers/specs/2026-07-21-form-builder-phase1-design.md).
Deferred:

- **Phase 2 — mailing/notification layer:** pluggable submission routing (SMTP + other
  providers), per-form destination choice beyond "store in Sanity", notification emails.
- **Phase 3 — abandonment tracking:** partial-submission capture, resume links, reminder emails.
- **Rate limiting:** only honeypot + timing + CAPTCHA today; add IP/edge throttling if spam persists.

## Stale AGENTS.md docs index

The AGENTS.md Docs index links several files that don't exist (`docs/design-system.md`,
`docs/component-organization.md`, `docs/stack.md`, `docs/sanity-typegen.md`, and others), and the
Definition of Done cites scripts that don't exist (`npm run test-storybook`, `npm run lint:tokens`).
`docs/environment-variables.md` was created by the form-builder work; the rest remain to be either
written or removed from the index. Flagged for the user to decide.
