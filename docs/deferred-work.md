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
