# Deferred work

Known work intentionally left for later. Delete an entry once it lands.

## 404 page template

`app/[...slug]/page.tsx` calls `notFound()` when no matching Sanity page exists, but the repo has
no custom `app/not-found.tsx` — visitors currently hit Next.js's default 404 page. Add a
branded 404 template.
