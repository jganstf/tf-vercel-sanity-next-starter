# Post Categorization & Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `postCategory` taxonomy to posts, a `postSettings` singleton, and a public `/posts` archive page with search, category filtering, a responsive 3/2/1-column grid, and configurable load-more (button or infinite scroll) pagination, plus a seed script for sample data.

**Architecture:** Sanity Studio schema additions (new document type + singleton, nested structure) drive new GROQ queries in the Next.js frontend. The `/posts` route is a server component that fetches the first page + settings + categories, and hands off to a client component (`PostArchive`) that owns search/filter/pagination state, synced to the URL, fetching subsequent pages through a server action.

**Tech Stack:** Sanity Studio v5 (`defineType`/`defineField`, structure builder), Next.js 16 App Router, `next-sanity` (`defineQuery`, `sanityFetch`), TypeScript, Tailwind CSS v4. No test framework exists in this repo — verification is via `tsc`/`next typegen` type-checks and manual checks in the running dev servers.

## Global Constraints

- Reuse the existing `postFields` GROQ fragment pattern in `frontend/sanity/lib/queries.ts` rather than duplicating field lists.
- Follow existing schema conventions: `defineType`/`defineField`, icons from `@sanity/icons`, singleton pattern used by `settings.tsx` (fixed `documentId`, hidden from default document list via `DISABLED_TYPES`).
- Grid breakpoints: 1 column (mobile), 2 columns at `sm:`, 3 columns at `lg:` (Tailwind, matching this repo's existing breakpoint usage).
- Default `postsPerPage` is `6`; default `loadMoreMode` is `'button'`.
- No new test framework is being introduced — verify each task with the repo's existing `type-check`/`typegen` scripts and a manual dev-server check.
- After any schema change, regenerate types in **both** `studio` and `frontend` before moving on (`npm run sanity:typegen` in each), since both keep their own `sanity.types.ts` generated from the shared `sanity.schema.json`.

---

### Task 1: `postCategory` document schema

**Files:**
- Create: `studio/src/schemaTypes/documents/postCategory.ts`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Produces: schema type name `postCategory` with fields `title` (string), `slug` (slug), `description` (text), consumed by Task 2 (post's `categories` reference) and Task 4 (structure).

- [ ] **Step 1: Create the schema file**

```ts
// studio/src/schemaTypes/documents/postCategory.ts
import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Category schema. Used to tag posts for filtering on the blog archive.
 * Learn more: https://www.sanity.io/docs/schema-types
 */

export const postCategory = defineType({
  name: 'postCategory',
  title: 'Category',
  icon: TagIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'A slug is required for the category to be used as a filter',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
```

- [ ] **Step 2: Register the schema type**

In `studio/src/schemaTypes/index.ts`, add the import and register it in the `documents` group of the array:

```ts
import {person} from './documents/person'
import {page} from './documents/page'
import {post} from './documents/post'
import {postCategory} from './documents/postCategory'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {settings} from './singletons/settings'
import {link} from './objects/link'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'

export const schemaTypes = [
  // Singletons
  settings,
  // Documents
  page,
  post,
  postCategory,
  person,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
]
```

- [ ] **Step 3: Regenerate types and type-check the studio**

Run from `studio/`:

```bash
npm run sanity:typegen
npm run type-check
```

Expected: both commands complete with no errors; `studio/sanity.types.ts` and `sanity.schema.json` (repo root) now contain a `PostCategory` type.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/documents/postCategory.ts studio/src/schemaTypes/index.ts studio/sanity.types.ts sanity.schema.json
git commit -m "feat: add postCategory document schema"
```

---

### Task 2: Add `categories` reference field to `post`

**Files:**
- Modify: `studio/src/schemaTypes/documents/post.ts`

**Interfaces:**
- Consumes: schema type `postCategory` (Task 1).
- Produces: `post.categories` — array of references to `postCategory`, consumed by GROQ queries in Task 5.

- [ ] **Step 1: Add the field**

In `studio/src/schemaTypes/documents/post.ts`, add a new field after the existing `author` field (before the closing `]` of `fields`):

```ts
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'person'}],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'postCategory'}]}],
    }),
```

- [ ] **Step 2: Regenerate types and type-check the studio**

```bash
npm run sanity:typegen
npm run type-check
```

Expected: no errors; `Post` type in `studio/sanity.types.ts` now includes an optional `categories` array field.

- [ ] **Step 3: Commit**

```bash
git add studio/src/schemaTypes/documents/post.ts studio/sanity.types.ts sanity.schema.json
git commit -m "feat: add categories field to post schema"
```

---

### Task 3: `postSettings` singleton schema

**Files:**
- Create: `studio/src/schemaTypes/singletons/postSettings.tsx`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Produces: schema type `postSettings` with fields `postsPerPage` (number, default `6`) and `loadMoreMode` (string enum `'button' | 'infiniteScroll'`, default `'button'`), singleton document id `postSettings`. Consumed by Task 4 (structure) and Task 9 (archive page).

- [ ] **Step 1: Create the schema file**

```tsx
// studio/src/schemaTypes/singletons/postSettings.tsx
import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Post Settings schema Singleton. Controls pagination behavior for the public blog archive.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const postSettings = defineType({
  name: 'postSettings',
  title: 'Post Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'postsPerPage',
      title: 'Posts per page',
      description: 'Number of posts to show per page on the blog archive.',
      type: 'number',
      initialValue: 6,
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'loadMoreMode',
      title: 'Load more behavior',
      description: 'How additional posts are loaded on the blog archive.',
      type: 'string',
      initialValue: 'button',
      options: {
        list: [
          {title: 'Load More Button', value: 'button'},
          {title: 'Infinite Scroll', value: 'infiniteScroll'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Post Settings',
      }
    },
  },
})
```

- [ ] **Step 2: Register the schema type**

In `studio/src/schemaTypes/index.ts`:

```ts
import {settings} from './singletons/settings'
import {postSettings} from './singletons/postSettings'
// ...
export const schemaTypes = [
  // Singletons
  settings,
  postSettings,
  // Documents
  page,
  post,
  postCategory,
  person,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
]
```

- [ ] **Step 3: Regenerate types and type-check the studio**

```bash
npm run sanity:typegen
npm run type-check
```

Expected: no errors; `PostSettings` type appears in `studio/sanity.types.ts`.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/singletons/postSettings.tsx studio/src/schemaTypes/index.ts studio/sanity.types.ts sanity.schema.json
git commit -m "feat: add postSettings singleton schema"
```

---

### Task 4: Nest categories under Posts in Studio structure, add Post Settings entry

**Files:**
- Modify: `studio/src/structure/index.ts`

**Interfaces:**
- Consumes: schema types `post`, `postCategory` (Task 1), `postSettings` (Task 3).

- [ ] **Step 1: Update the structure resolver**

Replace the full contents of `studio/src/structure/index.ts`:

```ts
import {CogIcon} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 */

// Types handled manually below (nested lists / singletons) rather than via the default flat list.
const DISABLED_TYPES = [
  'settings',
  'postSettings',
  'post',
  'postCategory',
  'assist.instruction.context',
]

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      // Posts, nested with its Categories sub-list.
      S.listItem()
        .title('Posts')
        .child(
          S.list()
            .title('Posts')
            .items([
              S.documentTypeListItem('post').title('All Posts'),
              S.documentTypeListItem('postCategory').title('Categories'),
            ]),
        ),
      ...S.documentTypeListItems()
        // Remove types handled manually above from the default flat list.
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        // Pluralize the title of each document type.  This is not required but just an option to consider.
        .map((listItem) => {
          return listItem.title(pluralize(listItem.getTitle() as string))
        }),
      // Settings Singleton in order to view/edit the one particular document for Settings.  Learn more about Singletons: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),
      S.listItem()
        .title('Post Settings')
        .child(S.document().schemaType('postSettings').documentId('postSettings'))
        .icon(CogIcon),
    ])
```

- [ ] **Step 2: Type-check the studio**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Manually verify in the Studio**

Run `npm run dev` from `studio/`, open the local Studio URL, and confirm:
- A single "Posts" item in the left nav expands to "All Posts" and "Categories".
- "Post Settings" appears next to "Site Settings" and opens a singleton editor (no "create new" list).
- `post` and `postCategory` no longer appear as separate top-level items.

Stop the dev server after verifying.

- [ ] **Step 4: Commit**

```bash
git add studio/src/structure/index.ts
git commit -m "feat: nest post categories and add Post Settings in studio structure"
```

---

### Task 5: GROQ queries for categories, settings, and the archive

**Files:**
- Modify: `frontend/sanity/lib/queries.ts`

**Interfaces:**
- Consumes: schema fields from Tasks 1-3.
- Produces:
  - `postSettingsQuery` → typegen result `PostSettingsQueryResult`
  - `postCategoriesQuery` → typegen result `PostCategoriesQueryResult` (array of `{_id, title, slug, description}`)
  - `archivePostsQuery` → typegen result `ArchivePostsQueryResult`, GROQ params `{search: string, category: string, offset: number, end: number}` (NOTE: the slice uses two independent numeric params `$offset` and `$end`, not arithmetic in-query, because groq-js typegen cannot statically evaluate a slice bound expression like `$offset + $limit` — it silently fails to generate `ArchivePostsQueryResult` at all. Callers compute `end = offset + limit` in JS before passing params.)
  - `archivePostsCountQuery` → typegen result `ArchivePostsCountQueryResult` (number), params `{search: string, category: string}`
  - `postFields` fragment now includes `categories`, so `AllPostsQueryResult`, `PostQueryResult`, `ArchivePostsQueryResult` all gain a `categories` array field. Consumed by Task 6 (`PostCard`) and Task 8/9 (`PostArchive`, archive page).

- [ ] **Step 1: Extend `postFields` with categories**

In `frontend/sanity/lib/queries.ts`, update the `postFields` fragment:

```ts
const postFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  "date": coalesce(date, _updatedAt),
  "author": author->{firstName, lastName, picture},
  "categories": categories[]->{_id, title, "slug": slug.current},
`
```

- [ ] **Step 2: Add settings, categories, and archive queries**

Append these to the end of `frontend/sanity/lib/queries.ts`:

```ts
export const postSettingsQuery = defineQuery(`*[_type == "postSettings"][0]`)

export const postCategoriesQuery = defineQuery(`
  *[_type == "postCategory"] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description
  }
`)

const archivePostsFilter = /* groq */ `
  _type == "post" &&
  defined(slug.current) &&
  ($search == "" || title match $search + "*" || excerpt match $search + "*") &&
  ($category == "" || $category in categories[]->slug.current)
`

export const archivePostsQuery = defineQuery(`
  *[${archivePostsFilter}] | order(date desc, _updatedAt desc) [$offset...$end] {
    ${postFields}
  }
`)

export const archivePostsCountQuery = defineQuery(`
  count(*[${archivePostsFilter}])
`)
```

- [ ] **Step 3: Regenerate frontend types and type-check**

Run from `frontend/`:

```bash
npm run sanity:typegen
npm run type-check
```

Expected: no errors; `frontend/sanity.types.ts` now contains `PostSettingsQueryResult`, `PostCategoriesQueryResult`, `ArchivePostsQueryResult`, `ArchivePostsCountQueryResult`, and `AllPostsQueryResult`/`PostQueryResult` gain a `categories` field.

- [ ] **Step 4: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts
git commit -m "feat: add GROQ queries for post categories, settings, and archive"
```

---

### Task 6: Extract shared `PostCard` component

**Files:**
- Create: `frontend/app/components/PostCard.tsx`
- Modify: `frontend/app/components/Posts.tsx`

**Interfaces:**
- Produces: `export default function PostCard({post}: {post: AllPostsQueryResult[number]})`, consumed by Task 8 (`PostArchive`) and `Posts.tsx`.

- [ ] **Step 1: Create `PostCard.tsx` with the card markup moved out of `Posts.tsx`**

```tsx
// frontend/app/components/PostCard.tsx
import Link from 'next/link'

import {AllPostsQueryResult} from '@/sanity.types'
import DateComponent from '@/app/components/Date'
import Avatar from '@/app/components/Avatar'
import {dataAttr} from '@/sanity/lib/utils'

export default function PostCard({post}: {post: AllPostsQueryResult[number]}) {
  const {_id, title, slug, excerpt, date, author} = post

  return (
    <article
      data-sanity={dataAttr({id: _id, type: 'post', path: 'title'}).toString()}
      key={_id}
      className="border border-gray-200 rounded-sm p-6 bg-gray-50 flex flex-col justify-between transition-colors hover:bg-white relative"
    >
      <Link className="hover:text-brand underline transition-colors" href={`/posts/${slug}`}>
        <span className="absolute inset-0 z-10" />
      </Link>
      <div>
        <h3 className="text-2xl mb-4">{title}</h3>

        <p className="line-clamp-3 text-sm leading-6 text-gray-600 max-w-[70ch]">{excerpt}</p>
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        {author && author.firstName && author.lastName && (
          <div className="flex items-center">
            <Avatar person={author} small={true} />
          </div>
        )}
        <time className="text-gray-500 text-xs font-mono" dateTime={date}>
          <DateComponent dateString={date} />
        </time>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Update `Posts.tsx` to use the shared component**

Replace the whole file `frontend/app/components/Posts.tsx`:

```tsx
import {sanityFetch} from '@/sanity/lib/live'
import {morePostsQuery, allPostsQuery} from '@/sanity/lib/queries'
import {AllPostsQueryResult} from '@/sanity.types'
import OnBoarding from '@/app/components/Onboarding'
import PostCard from '@/app/components/PostCard'

const Posts = ({
  children,
  heading,
  subHeading,
}: {
  children: React.ReactNode
  heading?: string
  subHeading?: string
}) => (
  <div>
    {heading && <h2 className="text-3xl text-gray-900 sm:text-4xl lg:text-5xl">{heading}</h2>}
    {subHeading && <p className="mt-2 text-lg leading-8 text-gray-600">{subHeading}</p>}
    <div className="pt-6 space-y-6">{children}</div>
  </div>
)

export const MorePosts = async ({skip, limit}: {skip: string; limit: number}) => {
  const {data} = await sanityFetch({
    query: morePostsQuery,
    params: {skip, limit},
  })

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Posts heading={`Recent Posts (${data?.length})`}>
      {data?.map((post: AllPostsQueryResult[number]) => (
        <PostCard key={post._id} post={post} />
      ))}
    </Posts>
  )
}

export const AllPosts = async () => {
  const {data} = await sanityFetch({query: allPostsQuery})

  if (!data || data.length === 0) {
    return <OnBoarding />
  }

  return (
    <Posts
      heading="Recent Posts"
      subHeading={`${data.length === 1 ? 'This blog post is' : `These ${data.length} blog posts are`} populated from your Sanity Studio.`}
    >
      {data.map((post: AllPostsQueryResult[number]) => (
        <PostCard key={post._id} post={post} />
      ))}
    </Posts>
  )
}
```

- [ ] **Step 3: Type-check the frontend**

Run from `frontend/`:

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Manually verify no regression**

Run `npm run dev` from `frontend/`, open the homepage (wherever `AllPosts`/`MorePosts` are rendered) and confirm post cards render identically to before (title, excerpt, author, date). Stop the dev server after verifying.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/components/PostCard.tsx frontend/app/components/Posts.tsx
git commit -m "refactor: extract PostCard component for reuse in the post archive"
```

---

### Task 7: Server action for paginated/filterable post fetches

**Files:**
- Create: `frontend/app/posts/actions.ts`

**Interfaces:**
- Consumes: `archivePostsQuery`, `archivePostsCountQuery` (Task 5).
- Produces: `export async function fetchArchivePosts(args: {search: string; category: string; offset: number; limit: number}): Promise<{posts: AllPostsQueryResult; hasMore: boolean}>`, consumed by Task 8 (`PostArchive`).

- [ ] **Step 1: Create the server action**

```ts
// frontend/app/posts/actions.ts
'use server'

import {sanityFetch} from '@/sanity/lib/live'
import {archivePostsCountQuery, archivePostsQuery} from '@/sanity/lib/queries'
import type {AllPostsQueryResult} from '@/sanity.types'

export async function fetchArchivePosts({
  search,
  category,
  offset,
  limit,
}: {
  search: string
  category: string
  offset: number
  limit: number
}): Promise<{posts: AllPostsQueryResult; hasMore: boolean}> {
  const [{data: posts}, {data: total}] = await Promise.all([
    sanityFetch({
      query: archivePostsQuery,
      // archivePostsQuery's GROQ slice takes two independent numeric params ($offset, $end)
      // rather than an in-query arithmetic expression, because groq-js typegen cannot
      // statically evaluate a slice bound like `$offset + $limit` (see Task 5 notes).
      params: {search, category, offset, end: offset + limit},
    }),
    sanityFetch({
      query: archivePostsCountQuery,
      params: {search, category},
    }),
  ])

  return {
    posts: posts ?? [],
    hasMore: offset + (posts?.length ?? 0) < (total ?? 0),
  }
}
```

- [ ] **Step 2: Type-check the frontend**

```bash
npm run type-check
```

Expected: no errors. `ArchivePostsQueryResult` should be structurally assignable to `AllPostsQueryResult` since both come from `postFields`; if `tsc` reports a mismatch, change the return type annotation to `ArchivePostsQueryResult` (imported from `@/sanity.types`) instead of `AllPostsQueryResult`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/posts/actions.ts
git commit -m "feat: add fetchArchivePosts server action"
```

---

### Task 8: `PostArchive` client component (search, filter, grid, load more)

**Files:**
- Create: `frontend/app/components/PostArchive.tsx`

**Interfaces:**
- Consumes: `PostCard` (Task 6), `fetchArchivePosts` (Task 7), types `AllPostsQueryResult`, `PostCategoriesQueryResult` (Task 5).
- Produces: `export default function PostArchive(props: PostArchiveProps)` consumed by Task 9 (archive page). `PostArchiveProps`:
  ```ts
  {
    initialPosts: AllPostsQueryResult
    initialHasMore: boolean
    categories: PostCategoriesQueryResult
    postsPerPage: number
    loadMoreMode: 'button' | 'infiniteScroll'
    initialSearch: string
    initialCategory: string
  }
  ```

- [ ] **Step 1: Create the component**

```tsx
// frontend/app/components/PostArchive.tsx
'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import PostCard from '@/app/components/PostCard'
import {fetchArchivePosts} from '@/app/posts/actions'
import type {AllPostsQueryResult, PostCategoriesQueryResult} from '@/sanity.types'

export type PostArchiveProps = {
  initialPosts: AllPostsQueryResult
  initialHasMore: boolean
  categories: PostCategoriesQueryResult
  postsPerPage: number
  loadMoreMode: 'button' | 'infiniteScroll'
  initialSearch: string
  initialCategory: string
}

export default function PostArchive({
  initialPosts,
  initialHasMore,
  categories,
  postsPerPage,
  loadMoreMode,
  initialSearch,
  initialCategory,
}: PostArchiveProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const search = searchParams.get('q') ?? initialSearch
  const category = searchParams.get('category') ?? initialCategory

  const [searchInput, setSearchInput] = useState(search)
  const [posts, setPosts] = useState<AllPostsQueryResult>(initialPosts)
  const [offset, setOffset] = useState(initialPosts.length)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  const updateQuery = useCallback(
    (next: {q?: string; category?: string}) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.q !== undefined) {
        if (next.q) params.set('q', next.q)
        else params.delete('q')
      }
      if (next.category !== undefined) {
        if (next.category) params.set('category', next.category)
        else params.delete('category')
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  // Debounce free-text search input into a URL update.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) {
        updateQuery({q: searchInput})
      }
    }, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // Re-fetch page 1 whenever the URL's search/category change (skip on first render, it's already server-rendered).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    let cancelled = false
    setIsLoading(true)
    fetchArchivePosts({search, category, offset: 0, limit: postsPerPage}).then((result) => {
      if (cancelled) return
      setPosts(result.posts)
      setOffset(result.posts.length)
      setHasMore(result.hasMore)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, postsPerPage])

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    fetchArchivePosts({search, category, offset, limit: postsPerPage}).then((result) => {
      setPosts((prev) => [...prev, ...result.posts])
      setOffset((prev) => prev + result.posts.length)
      setHasMore(result.hasMore)
      setIsLoading(false)
    })
  }, [search, category, offset, postsPerPage, isLoading, hasMore])

  useEffect(() => {
    if (loadMoreMode !== 'infiniteScroll') return
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      {rootMargin: '200px'},
    )
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMoreMode, loadMore])

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search posts..."
          aria-label="Search posts"
          className="border border-gray-200 rounded-sm px-4 py-2 flex-1"
        />
        <select
          value={category}
          onChange={(e) => updateQuery({category: e.target.value})}
          aria-label="Filter by category"
          className="border border-gray-200 rounded-sm px-4 py-2"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.slug ?? ''}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {posts.length === 0 && !isLoading ? (
        <p className="text-gray-600">No posts found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}

      {loadMoreMode === 'button' && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="border border-gray-200 rounded-sm px-6 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {loadMoreMode === 'infiniteScroll' && <div ref={sentinelRef} className="h-1" aria-hidden />}
    </div>
  )
}
```

- [ ] **Step 2: Type-check the frontend**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/PostArchive.tsx
git commit -m "feat: add PostArchive client component with search, filter, and load more"
```

---

### Task 9: `/posts` archive page

**Files:**
- Create: `frontend/app/posts/page.tsx`

**Interfaces:**
- Consumes: `postSettingsQuery`, `postCategoriesQuery`, `archivePostsQuery`, `archivePostsCountQuery` (Task 5), `PostArchive` (Task 8).

- [ ] **Step 1: Create the page**

```tsx
// frontend/app/posts/page.tsx
import type {Metadata} from 'next'

import PostArchive from '@/app/components/PostArchive'
import {sanityFetch} from '@/sanity/lib/live'
import {
  archivePostsCountQuery,
  archivePostsQuery,
  postCategoriesQuery,
  postSettingsQuery,
} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Blog Archive',
  description: 'Search and browse all blog posts by category.',
}

const DEFAULT_POSTS_PER_PAGE = 6
const DEFAULT_LOAD_MORE_MODE = 'button' as const

export default async function PostsArchivePage(props: PageProps<'/posts'>) {
  const resolvedSearchParams = await props.searchParams
  const search =
    typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : ''
  const category =
    typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : ''

  const {data: settings} = await sanityFetch({query: postSettingsQuery})
  const postsPerPage = settings?.postsPerPage ?? DEFAULT_POSTS_PER_PAGE
  const loadMoreMode =
    settings?.loadMoreMode === 'infiniteScroll' ? 'infiniteScroll' : DEFAULT_LOAD_MORE_MODE

  const [{data: categories}, {data: posts}, {data: total}] = await Promise.all([
    sanityFetch({query: postCategoriesQuery}),
    sanityFetch({
      query: archivePostsQuery,
      // See Task 5/7 notes: archivePostsQuery's slice takes independent $offset/$end params.
      params: {search, category, offset: 0, end: postsPerPage},
    }),
    sanityFetch({query: archivePostsCountQuery, params: {search, category}}),
  ])

  return (
    <div className="container my-12 lg:my-24">
      <h1 className="text-4xl text-gray-900 sm:text-5xl mb-8">Blog Archive</h1>
      <PostArchive
        initialPosts={posts ?? []}
        initialHasMore={(posts?.length ?? 0) < (total ?? 0)}
        categories={categories ?? []}
        postsPerPage={postsPerPage}
        loadMoreMode={loadMoreMode}
        initialSearch={search}
        initialCategory={category}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check the frontend**

```bash
npm run type-check
```

Expected: no errors. If `PageProps<'/posts'>` isn't recognized, run `npx next typegen` first (this is also part of `type-check`), then re-run.

- [ ] **Step 3: Manually verify in the browser**

With `postSettings` not yet seeded (Task 10 hasn't run), start `npm run dev` from `frontend/` and open `/posts`. Confirm:
- Page renders with the default 6-per-page, button mode (since no `postSettings` doc exists yet, defaults apply).
- Grid shows 1 column on narrow viewport, 2 on tablet width, 3 on desktop width.
- Search box and category select are present (category select will show "All categories" only until Task 10 seeds categories).
- No console errors.

Stop the dev server after verifying.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/posts/page.tsx
git commit -m "feat: add /posts archive page with search, filtering, and pagination"
```

---

### Task 10: Seed script for sample categories and posts

**Files:**
- Create: `frontend/scripts/seed.mjs`

**Interfaces:**
- Consumes: `@sanity/client` (already a `frontend` dependency), env vars `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION` (existing), and a new `SANITY_API_WRITE_TOKEN` (must have write/editor access — separate from the existing read-only `SANITY_API_READ_TOKEN`).
- Produces: 5 `postCategory` documents, 15 `post` documents (each with 2 categories), and 1 `postSettings` document, all with deterministic `_id`s so the script is safely re-runnable via `createIfNotExists`.

- [ ] **Step 1: Create the seed script**

```js
// frontend/scripts/seed.mjs
import {createClient} from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-09-25'
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !dataset) {
  throw new Error(
    'Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET environment variables',
  )
}
if (!token) {
  throw new Error(
    'Missing SANITY_API_WRITE_TOKEN environment variable (needs write access) to run the seed script',
  )
}

const client = createClient({projectId, dataset, apiVersion, token, useCdn: false})

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function block(text) {
  return [
    {
      _type: 'block',
      _key: 'seed-block-1',
      style: 'normal',
      children: [{_type: 'span', _key: 'seed-span-1', text}],
      markDefs: [],
    },
  ]
}

const categories = [
  {id: 'postCategory.engineering', title: 'Engineering', description: 'Deep dives into how we build things.'},
  {id: 'postCategory.design', title: 'Design', description: 'Notes on craft, process, and visual design.'},
  {id: 'postCategory.product', title: 'Product', description: 'Product decisions and roadmap thinking.'},
  {
    id: 'postCategory.company-news',
    title: 'Company News',
    description: 'Announcements and updates from the team.',
  },
  {id: 'postCategory.tutorials', title: 'Tutorials', description: 'Step-by-step guides.'},
]

const postTitles = [
  'Shipping our new component library',
  'How we redesigned the onboarding flow',
  'A field guide to GROQ queries',
  'What we learned migrating to the App Router',
  'Behind the scenes: our design system tokens',
  'Announcing our Series B',
  'Building accessible forms from scratch',
  'Why we chose Sanity for content modeling',
  'Five patterns for scalable Next.js apps',
  'Our new brand identity, explained',
  'Debugging performance regressions in production',
  'Welcoming three new engineers to the team',
  'A tutorial on Portable Text customization',
  'Rethinking our release process',
  'Design critique: what makes a good empty state',
]

async function seedCategories() {
  for (const category of categories) {
    await client.createIfNotExists({
      _id: category.id,
      _type: 'postCategory',
      title: category.title,
      slug: {_type: 'slug', current: slugify(category.title)},
      description: category.description,
    })
  }
  console.log(`Seeded ${categories.length} categories`)
}

async function seedPosts() {
  for (let i = 0; i < postTitles.length; i++) {
    const title = postTitles[i]
    const slug = slugify(title)
    const daysAgo = i * 4
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    const assignedCategoryIds = [
      categories[i % categories.length].id,
      categories[(i + 2) % categories.length].id,
    ]

    await client.createIfNotExists({
      _id: `post.seed-${i + 1}`,
      _type: 'post',
      title,
      slug: {_type: 'slug', current: slug},
      excerpt: `A sample excerpt for "${title}", generated by the seed script.`,
      content: block(
        `This is placeholder body content for "${title}". Replace with real writing in Sanity Studio.`,
      ),
      date,
      categories: assignedCategoryIds.map((id) => ({
        _type: 'reference',
        _ref: id,
        _key: id,
      })),
    })
  }
  console.log(`Seeded ${postTitles.length} posts`)
}

async function seedPostSettings() {
  await client.createIfNotExists({
    _id: 'postSettings',
    _type: 'postSettings',
    postsPerPage: 6,
    loadMoreMode: 'button',
  })
  console.log('Seeded post settings (postsPerPage: 6, loadMoreMode: button)')
}

async function run() {
  await seedCategories()
  await seedPosts()
  await seedPostSettings()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the seed script**

From `frontend/`, with a write-capable token set (create one in [manage.sanity.io](https://manage.sanity.io) under API > Tokens with "Editor" permissions, and export it, or add `SANITY_API_WRITE_TOKEN=...` to `frontend/.env.local`):

```bash
node --env-file=.env.local scripts/seed.mjs
```

Expected output:
```
Seeded 5 categories
Seeded 15 posts
Seeded post settings (postsPerPage: 6, loadMoreMode: button)
```

- [ ] **Step 3: Manually verify end-to-end**

Start `npm run dev` from `frontend/` and open `/posts`. Confirm:
- 6 posts render initially (default `postsPerPage`).
- The category select lists the 5 seeded categories; picking one filters the grid and updates the URL (`?category=...`).
- Typing in search filters by title/excerpt and updates the URL (`?q=...`) after the debounce.
- "Load more" button appears (seeded `loadMoreMode` is `button`) and clicking it appends more posts, disappearing once all matching posts are shown.
- Open the Studio (`npm run dev` in `studio/`), change Post Settings' "Load more behavior" to "Infinite Scroll", save, reload `/posts`, and confirm scrolling near the bottom of the grid loads more posts automatically instead of showing a button.

Stop both dev servers after verifying.

- [ ] **Step 4: Commit**

```bash
git add frontend/scripts/seed.mjs
git commit -m "feat: add seed script for sample post categories and posts"
```

---

## Post-Plan Verification

- [ ] Run `npm run type-check` in both `studio/` and `frontend/` one final time to confirm the full set of changes type-checks together.
- [ ] Run `npm run lint` in `frontend/` to catch any stray lint issues introduced across the tasks.
