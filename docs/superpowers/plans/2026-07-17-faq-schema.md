# FAQ Schema + Frontend + Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a nested FAQ content model (`faq`, `faqCategory`, `faqSettings`, shared `seo` object) to the Sanity Studio, a Next.js catch-all frontend route that reflects category nesting in the URL, and a reusable `.agents/skills/sanity-faq-schema` skill documenting the pattern.

**Architecture:** Studio schema files follow the existing `defineType`/`defineField` conventions in `studio/src/schemaTypes`. The frontend adds one catch-all route (`frontend/app/faq/[...path]/page.tsx`) plus GROQ queries in `frontend/sanity/lib/queries.ts`, resolving arbitrary category nesting by walking `parent` references (bounded to 5 levels at the query layer). The skill package documents the schema/route pattern for reuse, using this implementation as its reference.

**Tech Stack:** Sanity Studio v3 (`sanity`, `@sanity/icons`), Next.js App Router, `next-sanity` (`defineQuery`), GROQ.

## Global Constraints

- Follow existing schema conventions exactly: `defineField`/`defineType` from `sanity`, icons from `@sanity/icons`, alt-text-required-if-image-present validation pattern (see `studio/src/schemaTypes/documents/post.ts:55-72`).
- Category self-parent cycle prevention is a direct self-reference check only — deeper cycles are a documented limitation, not enforced.
- Category path resolution (schema-adjacent query logic) is bounded to 5 parent levels — documented as a practical bound, not arbitrary depth.
- No new shared frontend components beyond what's needed; reuse `PortableText`, `resolveOpenGraphImage`, `sanityFetch` as already used in `frontend/app/posts/[slug]/page.tsx`.
- No design-system polish — functional layout using existing Tailwind classes only.

---

### Task 1: Shared `seo` object type

**Files:**
- Create: `studio/src/schemaTypes/objects/seo.ts`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Produces: `seo` schema type (name `'seo'`), fields `metaTitle` (string), `metaDescription` (text), `ogImage` (image with required `alt` when set). Consumed by Task 2 (`faqSettings.defaultSeo`) and Task 3 (`faq.seo`).

- [ ] **Step 1: Create the `seo` object schema**

```typescript
// studio/src/schemaTypes/objects/seo.ts
import {SearchIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Reusable SEO metadata object. Attach to any document type that needs
 * page-level meta title/description/og image overrides.
 */

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  icon: SearchIcon,
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
      description: 'Displayed on social cards and search engine results.',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          description: 'Important for accessibility and SEO.',
          type: 'string',
          validation: (rule) =>
            rule.custom((alt, context) => {
              const parent = context.parent as {asset?: {_ref?: string}}
              if (parent?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            }),
        }),
      ],
    }),
  ],
})
```

- [ ] **Step 2: Register `seo` in the schema index**

Edit `studio/src/schemaTypes/index.ts` — add the import near the other object imports and add `seo` to the `// Objects` section of the exported array:

```typescript
import {seo} from './objects/seo'
```

```typescript
export const schemaTypes = [
  // Singletons
  settings,
  // Documents
  page,
  post,
  person,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
  seo,
]
```

- [ ] **Step 3: Verify the Studio builds**

Run: `cd studio && npx tsc --noEmit`
Expected: No new type errors.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/objects/seo.ts studio/src/schemaTypes/index.ts
git commit -m "feat(studio): add shared seo object schema"
```

---

### Task 2: `faqCategory` document type

**Files:**
- Create: `studio/src/schemaTypes/documents/faqCategory.ts`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `faqCategory` schema type (name `'faqCategory'`) with fields `title` (string), `slug` (slug), `parent` (reference to `faqCategory`), `description` (text). Consumed by Task 3 (`faq.category` reference) and Task 5 (frontend queries).

- [ ] **Step 1: Create the `faqCategory` schema**

```typescript
// studio/src/schemaTypes/documents/faqCategory.ts
import {FolderIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * FAQ category schema. Categories may nest via `parent`, to arbitrary depth.
 * Direct self-parenting is blocked by validation; deeper cycles (A -> B -> A)
 * are not runtime-enforced.
 */

export const faqCategory = defineType({
  name: 'faqCategory',
  title: 'FAQ Category',
  icon: FolderIcon,
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
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'parent',
      title: 'Parent Category',
      type: 'reference',
      to: [{type: 'faqCategory'}],
      validation: (rule) =>
        rule.custom((value, context) => {
          if (value?._ref && value._ref === context.document?._id) {
            return 'A category cannot be its own parent'
          }
          return true
        }),
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
      parentTitle: 'parent.title',
    },
    prepare({title, parentTitle}) {
      return {
        title,
        subtitle: parentTitle ? `under ${parentTitle}` : undefined,
      }
    },
  },
})
```

- [ ] **Step 2: Register `faqCategory` in the schema index**

Edit `studio/src/schemaTypes/index.ts`:

```typescript
import {faqCategory} from './documents/faqCategory'
```

```typescript
export const schemaTypes = [
  // Singletons
  settings,
  // Documents
  page,
  post,
  person,
  faqCategory,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
  seo,
]
```

- [ ] **Step 3: Verify the Studio builds**

Run: `cd studio && npx tsc --noEmit`
Expected: No new type errors.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/documents/faqCategory.ts studio/src/schemaTypes/index.ts
git commit -m "feat(studio): add faqCategory document type with nested parent"
```

---

### Task 3: `faq` document type

**Files:**
- Create: `studio/src/schemaTypes/documents/faq.ts`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Consumes: `faqCategory` (Task 2), `seo` (Task 1), `blockContent` (existing object).
- Produces: `faq` schema type (name `'faq'`) with fields `question` (string), `slug` (slug), `category` (reference to `faqCategory`), `shortAnswer` (text), `longAnswer` (blockContent), `seo` (seo object). Consumed by Task 5 (frontend queries).

- [ ] **Step 1: Create the `faq` schema**

```typescript
// studio/src/schemaTypes/documents/faq.ts
import {HelpCircleIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * FAQ schema. Each FAQ belongs to exactly one category; the category's
 * (possibly nested) slug chain plus this document's slug form the frontend URL.
 */

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  icon: HelpCircleIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'question',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'faqCategory'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shortAnswer',
      title: 'Short Answer',
      description: 'Concise answer, used in FAQ lists and rich snippets.',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'longAnswer',
      title: 'Long Answer',
      type: 'blockContent',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'question',
      categoryTitle: 'category.title',
    },
    prepare({title, categoryTitle}) {
      return {
        title,
        subtitle: categoryTitle,
      }
    },
  },
})
```

- [ ] **Step 2: Register `faq` in the schema index**

Edit `studio/src/schemaTypes/index.ts`:

```typescript
import {faq} from './documents/faq'
```

```typescript
export const schemaTypes = [
  // Singletons
  settings,
  // Documents
  page,
  post,
  person,
  faq,
  faqCategory,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
  seo,
]
```

- [ ] **Step 3: Verify the Studio builds**

Run: `cd studio && npx tsc --noEmit`
Expected: No new type errors.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/documents/faq.ts studio/src/schemaTypes/index.ts
git commit -m "feat(studio): add faq document type"
```

---

### Task 4: `faqSettings` singleton + structure wiring

**Files:**
- Create: `studio/src/schemaTypes/singletons/faqSettings.tsx`
- Modify: `studio/src/schemaTypes/index.ts`
- Modify: `studio/src/structure/index.ts`

**Interfaces:**
- Consumes: `seo` (Task 1).
- Produces: `faqSettings` schema type (name `'faqSettings'`), singleton document with fixed id `faqSettings`, fields `title` (string), `intro` (minified block array), `defaultSeo` (seo object). Consumed by Task 5 (`faqSettingsQuery`).

- [ ] **Step 1: Create the `faqSettings` singleton schema**

```typescript
// studio/src/schemaTypes/singletons/faqSettings.tsx
import {HelpCircleIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * FAQ Settings singleton. Holds the FAQ index page heading/intro and
 * fallback SEO metadata for FAQ pages that don't set their own `seo`.
 */

export const faqSettings = defineType({
  name: 'faqSettings',
  title: 'FAQ Settings',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      description: 'Heading for the FAQ index page.',
      type: 'string',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      description: 'Intro copy shown on the FAQ index page.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [],
          lists: [],
          marks: {
            decorators: [],
            annotations: [],
          },
        }),
      ],
    }),
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      description: 'Fallback metadata for FAQ pages without their own SEO fields set.',
      type: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'FAQ Settings',
      }
    },
  },
})
```

- [ ] **Step 2: Register `faqSettings` in the schema index**

Edit `studio/src/schemaTypes/index.ts`:

```typescript
import {faqSettings} from './singletons/faqSettings'
```

```typescript
export const schemaTypes = [
  // Singletons
  settings,
  faqSettings,
  // Documents
  page,
  post,
  person,
  faq,
  faqCategory,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
  seo,
]
```

- [ ] **Step 3: Wire `faqSettings` into the desk structure**

Edit `studio/src/structure/index.ts` — add `'faqSettings'` to `DISABLED_TYPES` and add a second singleton `S.listItem()`:

```typescript
const DISABLED_TYPES = ['settings', 'faqSettings', 'assist.instruction.context']
```

```typescript
      // Settings Singleton in order to view/edit the one particular document for Settings.  Learn more about Singletons: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),
      // FAQ Settings Singleton, same pattern as Site Settings above.
      S.listItem()
        .title('FAQ Settings')
        .child(S.document().schemaType('faqSettings').documentId('faqSettings'))
        .icon(HelpCircleIcon),
    ])
```

Add the icon import at the top of the file:

```typescript
import {CogIcon, HelpCircleIcon} from '@sanity/icons'
```

- [ ] **Step 4: Verify the Studio builds**

Run: `cd studio && npx tsc --noEmit`
Expected: No new type errors.

- [ ] **Step 5: Manually verify in Studio**

Run: `cd studio && npm run dev`
Visit the Studio, confirm "FAQ Settings" appears as a singleton item (not in the pluralized document list), and that "FAQ" and "FAQ Categories" appear as regular pluralized document type lists. Create one `faqCategory` and one `faq` referencing it to confirm the schema behaves (required fields enforced, self-parent validation blocks selecting itself as parent).

- [ ] **Step 6: Commit**

```bash
git add studio/src/schemaTypes/singletons/faqSettings.tsx studio/src/schemaTypes/index.ts studio/src/structure/index.ts
git commit -m "feat(studio): add faqSettings singleton and wire into desk structure"
```

---

### Task 5: Frontend GROQ queries

**Files:**
- Modify: `frontend/sanity/lib/queries.ts`

**Interfaces:**
- Consumes: `faq`, `faqCategory`, `faqSettings` document types (Tasks 2-4).
- Produces: `faqSettingsQuery`, `faqCategoryTreeQuery`, `faqPagesSlugs`, `faqQuery`, `faqsByCategoryQuery` — all exported `defineQuery` results, consumed by Task 6 (route).

- [ ] **Step 1: Add the category path fragment and queries**

Append to `frontend/sanity/lib/queries.ts` (category chain resolved 5 levels deep — documented bound, not arbitrary depth):

```typescript
export const faqSettingsQuery = defineQuery(`*[_type == "faqSettings"][0]{
  title,
  intro,
  defaultSeo,
}`)

const faqCategoryPath = /* groq */ `
  "pathSegments": [
    parent->parent->parent->parent->slug.current,
    parent->parent->parent->slug.current,
    parent->parent->slug.current,
    parent->slug.current,
    slug.current
  ][defined(@)]
`

export const faqCategoryTreeQuery = defineQuery(`
  *[_type == "faqCategory" && defined(slug.current)]{
    _id,
    title,
    ${faqCategoryPath}
  }
`)

export const faqPagesSlugs = defineQuery(`
  *[_type == "faq" && defined(slug.current) && defined(category->slug.current)]{
    "path": [
      ...category->{${faqCategoryPath}}.pathSegments,
      slug.current
    ]
  }
`)

export const faqQuery = defineQuery(`
  *[_type == "faq" && slug.current == $slug && category->slug.current == $categorySlug][0]{
    _id,
    question,
    shortAnswer,
    longAnswer,
    seo,
    "category": category->{
      title,
      ${faqCategoryPath}
    },
  }
`)

export const faqsByCategoryQuery = defineQuery(`
  *[_type == "faq" && category->slug.current == $categorySlug] | order(question asc){
    question,
    shortAnswer,
    "slug": slug.current,
  }
`)
```

Note: `faqQuery` matches on the leaf category's own slug (`$categorySlug`) rather than the full path, since `category` is a single reference per `faq` — the route (Task 6) validates the full resolved path matches the requested URL before rendering, so a slug collision across different parents still 404s correctly.

- [ ] **Step 2: Regenerate Sanity types**

Run: `cd frontend && npx sanity typegen generate`
Expected: `frontend/sanity.types.ts` updates with new query result types, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts
git commit -m "feat(frontend): add FAQ GROQ queries"
```

---

### Task 6: Frontend catch-all FAQ route

**Files:**
- Create: `frontend/app/faq/[...path]/page.tsx`

**Interfaces:**
- Consumes: `faqSettingsQuery`, `faqCategoryTreeQuery`, `faqPagesSlugs`, `faqQuery`, `faqsByCategoryQuery` (Task 5); `sanityFetch` (`frontend/sanity/lib/live.ts`); `resolveOpenGraphImage` (`frontend/sanity/lib/utils.ts`); `PortableText` (`frontend/app/components/PortableText.tsx`).
- Produces: the `/faq/[...path]` page — no other task consumes this.

- [ ] **Step 1: Write the route**

```tsx
// frontend/app/faq/[...path]/page.tsx
import type {Metadata, ResolvingMetadata} from 'next'
import {notFound} from 'next/navigation'
import {type PortableTextBlock} from 'next-sanity'

import PortableText from '@/app/components/PortableText'
import {sanityFetch} from '@/sanity/lib/live'
import {
  faqCategoryTreeQuery,
  faqPagesSlugs,
  faqQuery,
  faqSettingsQuery,
  faqsByCategoryQuery,
} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'

/**
 * Generate static params for every FAQ (full nested category path + faq slug)
 * and every FAQ category (its own nested path, for index pages).
 */
export async function generateStaticParams() {
  const [{data: faqSlugs}, {data: categories}] = await Promise.all([
    sanityFetch({query: faqPagesSlugs, perspective: 'published', stega: false}),
    sanityFetch({query: faqCategoryTreeQuery, perspective: 'published', stega: false}),
  ])

  const faqParams = faqSlugs.map((faq) => ({path: faq.path}))
  const categoryParams = categories.map((category) => ({path: category.pathSegments}))

  return [...faqParams, ...categoryParams]
}

async function resolveFaqPath(path: string[]) {
  const categorySlug = path[path.length - 2]
  const faqSlug = path[path.length - 1]

  if (!categorySlug) return null

  const {data: faq} = await sanityFetch({
    query: faqQuery,
    params: {slug: faqSlug, categorySlug},
    stega: false,
  })

  if (!faq?._id) return null
  if (faq.category?.pathSegments?.join('/') !== path.slice(0, -1).join('/')) return null

  return faq
}

export async function generateMetadata(
  props: PageProps<'/faq/[...path]'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params
  const [faq, {data: faqSettings}] = await Promise.all([
    resolveFaqPath(params.path),
    sanityFetch({query: faqSettingsQuery, stega: false}),
  ])

  const previousImages = (await parent).openGraph?.images || []
  const seo = faq?.seo ?? faqSettings?.defaultSeo
  const ogImage = resolveOpenGraphImage(seo?.ogImage)

  return {
    title: seo?.metaTitle ?? faq?.question,
    description: seo?.metaDescription ?? faq?.shortAnswer,
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
}

export default async function FaqPage(props: PageProps<'/faq/[...path]'>) {
  const params = await props.params
  const faq = await resolveFaqPath(params.path)

  if (faq) {
    return (
      <div className="container my-12 lg:my-24 grid gap-6 max-w-3xl">
        <h1 className="text-4xl text-gray-900 sm:text-5xl">{faq.question}</h1>
        <p className="text-lg text-gray-700">{faq.shortAnswer}</p>
        {faq.longAnswer?.length ? (
          <PortableText
            className="max-w-2xl prose-headings:font-medium prose-headings:tracking-tight"
            value={faq.longAnswer as PortableTextBlock[]}
          />
        ) : null}
      </div>
    )
  }

  // Not a single FAQ - try resolving as a category index page instead.
  const categorySlug = params.path[params.path.length - 1]
  const {data: categories} = await sanityFetch({query: faqCategoryTreeQuery, stega: false})
  const category = categories.find(
    (candidate) => candidate.pathSegments?.join('/') === params.path.join('/'),
  )

  if (!category) {
    return notFound()
  }

  const {data: faqs} = await sanityFetch({
    query: faqsByCategoryQuery,
    params: {categorySlug},
  })

  return (
    <div className="container my-12 lg:my-24 grid gap-6 max-w-3xl">
      <h1 className="text-4xl text-gray-900 sm:text-5xl">{category.title}</h1>
      <ul className="grid gap-4">
        {faqs.map((item) => (
          <li key={item.slug}>
            <a href={`/faq/${[...params.path, item.slug].join('/')}`} className="underline">
              {item.question}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Regenerate Sanity types (route param types)**

Run: `cd frontend && npx next typegen`
Expected: `PageProps<'/faq/[...path]'>` resolves without type errors.

- [ ] **Step 3: Verify locally**

Run: `cd frontend && npm run dev`
Visit `/faq/<category-slug>` and `/faq/<category-slug>/<faq-slug>` for the test content created in Task 4, Step 5. Expected: category page lists FAQs, FAQ page shows short + long answer, unknown paths 404.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/faq
git commit -m "feat(frontend): add nested FAQ catch-all route"
```

---

### Task 7: `sanity-faq-schema` skill package

**Files:**
- Create: `.agents/skills/sanity-faq-schema/SKILL.md`
- Create: `.agents/skills/sanity-faq-schema/reference/schema-files.md`
- Create: `.agents/skills/sanity-faq-schema/reference/frontend-route.md`

**Interfaces:**
- Consumes: the finished implementation from Tasks 1-6 (referenced by file path).
- Produces: nothing consumed by later tasks — this is the terminal deliverable.

- [ ] **Step 1: Write `SKILL.md`**

```markdown
---
name: sanity-faq-schema
description: Scaffold a nested FAQ content model in a Sanity + Next.js project — faq, faqCategory (self-referencing parent), faqSettings singleton, shared seo object, and a category-aware frontend route.
---

# Sanity FAQ Schema

Use this skill when a project needs an FAQ section backed by Sanity, where:

- FAQs are grouped into categories
- Categories can nest (a category can have a parent category), to arbitrary depth
- Each FAQ needs a short answer (for lists/rich snippets) and a long answer (full body)
- Each FAQ needs per-document SEO metadata, with a settings-level fallback
- The frontend URL should reflect the FAQ's full category path, e.g.
  `/faq/billing/refunds/how-do-i-get-a-refund`

## What this produces

Sanity Studio (`studio/src/schemaTypes/`):

- `objects/seo.ts` — shared `metaTitle` / `metaDescription` / `ogImage` object
- `documents/faqCategory.ts` — `title`, `slug`, `parent` (self-reference), `description`
- `documents/faq.ts` — `question`, `slug`, `category` (reference), `shortAnswer`, `longAnswer`
  (blockContent), `seo`
- `singletons/faqSettings.ts` — `title`, `intro`, `defaultSeo` (index page settings)
- Registration in `schemaTypes/index.ts` and the singleton wired into the desk `structure`

Frontend (Next.js App Router + `next-sanity`):

- GROQ queries resolving nested category paths (bounded depth — see reference)
- `app/faq/[...path]/page.tsx` catch-all route serving both FAQ detail pages and category
  index pages from the same nesting-aware path

See `reference/schema-files.md` for the exact schema code and `reference/frontend-route.md`
for the query + route implementation.

## Known limitations

- Only direct self-parenting is blocked by schema validation; a category cycle spanning more
  than one hop (A -> B -> A) is not runtime-enforced.
- Category path resolution in GROQ is bounded to a fixed number of parent levels (5 by
  default) since GROQ has no native arbitrary recursion — deeper structures need the bound
  raised in the query fragment.
```

- [ ] **Step 2: Write `reference/schema-files.md`**

Copy the complete code blocks from Task 1 Step 1, Task 2 Step 1, Task 3 Step 1, and Task 4 Steps 1 and 3 (the four schema files plus the structure wiring), each under a heading naming its file path, into `.agents/skills/sanity-faq-schema/reference/schema-files.md`.

- [ ] **Step 3: Write `reference/frontend-route.md`**

Copy the complete code blocks from Task 5 Step 1 (queries) and Task 6 Step 1 (route component) into `.agents/skills/sanity-faq-schema/reference/frontend-route.md`, each under a heading naming its file path.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/sanity-faq-schema
git commit -m "docs: add sanity-faq-schema reusable skill"
```
