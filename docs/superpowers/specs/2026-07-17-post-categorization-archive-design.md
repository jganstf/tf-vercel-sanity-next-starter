# Post Categorization & Archive — Design

Date: 2026-07-17

## Goal

Add a category taxonomy to the `post` document type, a dedicated Post Settings singleton, and a public `/posts` archive page with search, category filtering, a responsive card grid, and configurable pagination (load-more button or infinite scroll). Seed sample categories and posts for local development.

## Schema Changes

### `postCategory` (new document type)
`studio/src/schemaTypes/documents/postCategory.ts`
- `title`: string, required
- `slug`: slug, source `title`, required, unique
- `description`: text, optional
- Preview: `{title}`

### `post` (update)
`studio/src/schemaTypes/documents/post.ts`
- Add `categories`: array of `reference` to `postCategory` (optional, no min required)

### `postSettings` (new singleton)
`studio/src/schemaTypes/singletons/postSettings.tsx`
- `postsPerPage`: number, default `6`, validation `min(1)`, integer
- `loadMoreMode`: string, options list `[{title: 'Load More Button', value: 'button'}, {title: 'Infinite Scroll', value: 'infiniteScroll'}]`, layout radio, default `'button'`
- Singleton doc id: `postSettings`
- Preview: static title `'Post Settings'`

Register all three in `studio/src/schemaTypes/index.ts`.

## Studio Structure

`studio/src/structure/index.ts`
- Add `postCategory` to `DISABLED_TYPES` (hidden from the default flat document-type list, same treatment as `settings`).
- Replace the auto-generated "Posts" list item with a manually nested list item:
  - `S.listItem().title('Posts').child(S.list().title('Posts').items([S.documentTypeListItem('post').title('All Posts'), S.documentTypeListItem('postCategory').title('Categories')]))`
  - This item is inserted in place of post's position in the mapped `documentTypeListItems()` (filter `post` out of the auto list alongside the disabled types, then splice the manual item back into the items array).
- Add a second singleton-style list item "Post Settings" → `S.document().schemaType('postSettings').documentId('postSettings')`, placed next to the existing "Site Settings" item.

## GROQ Queries

`frontend/sanity/lib/queries.ts`
- Extend `postFields` projection with `"categories": categories[]->{_id, title, "slug": slug.current}`.
- `postSettingsQuery`: `*[_type == "postSettings"][0]`
- `postCategoriesQuery`: `*[_type == "postCategory"] | order(title asc) {_id, title, "slug": slug.current, description}`
- `archivePostsQuery(params: {search, category, offset, limit})`: filters `defined(slug.current)`, `($search == "" || title match $search + "*" || excerpt match $search + "*")`, `($category == "" || $category in categories[]->slug.current)`, ordered `date desc, _updatedAt desc`, sliced `[$offset...$offset + $limit]`, projecting `postFields`.
- `archivePostsCountQuery`: same filters, `count(*[...])` to determine `hasMore`.

Empty-string params (not `null`/`undefined`) are used for "no filter" so a single query shape works for both the initial server render and later client-triggered fetches.

## Frontend Archive Page

### Route: `frontend/app/posts/page.tsx` (new — currently only `/posts/[slug]` exists)
Server component:
1. Reads `searchParams`: `q` (string), `category` (slug string).
2. Fetches `postSettingsQuery` (falls back to `{postsPerPage: 6, loadMoreMode: 'button'}` if the singleton doc doesn't exist yet) and `postCategoriesQuery` in parallel with the first page of `archivePostsQuery`/`archivePostsCountQuery` (offset `0`, limit = `postsPerPage`).
3. Renders `<PostArchive>` client component, passing initial posts, total count, categories, settings, and initial `q`/`category`.

### `frontend/app/components/PostArchive.tsx` (new, client component)
- Owns local state: `posts` (array, seeded from server), `search` (input, debounced), `category` (selected slug), `offset`.
- Search input and category select/pills update the URL via `router.replace` with the new `q`/`category` params (shallow), and reset `posts`/`offset` by re-running the fetch through a server action.
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` — 1 col mobile, 2 tablet (`sm:`), 3 desktop (`lg:`). Reuses the existing card markup/style from `Posts.tsx`'s `Post` component (extracted into a shared `PostCard` component used by both `Posts.tsx` and `PostArchive.tsx` to avoid duplication).
- Load more:
  - `button` mode: a "Load more" button below the grid, disabled/hidden when `hasMore` is false, calls the fetch-next-page action on click.
  - `infiniteScroll` mode: an invisible sentinel `<div>` after the grid observed via `IntersectionObserver` (`useEffect` + ref); when it intersects and `hasMore` is true and not already loading, triggers the same fetch-next-page action.
- Fetch-next-page logic: a server action `frontend/app/posts/actions.ts` exporting `fetchPosts({search, category, offset, limit})` that runs `archivePostsQuery`/`archivePostsCountQuery` via `sanityFetch` and returns `{posts, hasMore}`. Client component appends results and advances `offset`.

### Shared `PostCard`
Extract the existing `Post` article card out of `frontend/app/components/Posts.tsx` into `frontend/app/components/PostCard.tsx` so `Posts.tsx` (existing "recent posts"/"more posts" usages) and the new `PostArchive.tsx` share one implementation. No visual change to existing usages.

## Seed Data

`studio/seed.mjs` (new, run manually with `node studio/seed.mjs` from `studio/`, requires `SANITY_API_WRITE_TOKEN` env var; not wired into any build/dev script since it performs live writes):
- Creates 5 `postCategory` docs (e.g. Engineering, Design, Product, Company News, Tutorials) via `createIfNotExists` keyed by a deterministic `_id` (e.g. `postCategory.engineering`) so it's safely re-runnable.
- Creates ~15 `post` docs with title, slug, excerpt, simple `content` block, `date` spread over recent months, and 1-2 `categories` references each, also via `createIfNotExists` with deterministic ids (`post.seed-1` etc).
- Prints a summary of created/skipped docs.

## Out of Scope
- Category landing pages (`/posts/category/[slug]`) — filtering happens only within the `/posts` archive via query param, no dedicated category route.
- Editing/moderation UI beyond default Studio document editing.
- Full-text/fuzzy search — uses GROQ `match` (prefix/glob) on title and excerpt only.
