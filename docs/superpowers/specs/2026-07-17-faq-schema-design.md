# FAQ Schema + Skill — Design

## Goal

Add a nested FAQ content model to the Sanity Studio (`faq`, `faqCategory`, `faqSettings`), wire up a
Next.js frontend route for it, and capture the pattern as a reusable Claude Code skill under
`.agents/skills/`, matching the existing `.agents/skills/sanity-live-cache-components` convention.

## Studio schema (`studio/src/schemaTypes`)

### `objects/seo.ts` (new, shared)

Reusable SEO object, following the alt-text validation pattern already used in `post.ts`/`settings.tsx`:

- `metaTitle` (string)
- `metaDescription` (text)
- `ogImage` (image, hotspot, `aiAssist.imageDescriptionField: 'alt'`, with an `alt` subfield required
  when the image is set — same `rule.custom` pattern as `post.coverImage`)

### `documents/faqCategory.ts` (new)

- `title` (string, required)
- `slug` (slug, source: `title`, required)
- `parent` (reference to `faqCategory`, optional) — enables arbitrary-depth nesting. A
  `validation.custom` prevents a category from referencing itself as parent. Deeper cycles
  (A→B→A) are not runtime-enforced by the schema; this is a documented limitation, not a bug to
  fix here.
- `description` (text, optional)
- Preview: title + parent's title as subtitle (via `select` on `parent.title`)

### `documents/faq.ts` (new)

- `question` (string, required) — also the document title in previews
- `slug` (slug, source: `question`, required)
- `category` (reference to `faqCategory`, required)
- `shortAnswer` (text, required) — concise answer for list views / rich snippets
- `longAnswer` (`blockContent`, optional) — full answer body
- `seo` (object, type `seo`)
- Preview: `question` as title, category title as subtitle

### `singletons/faqSettings.ts` (new)

Singleton following the `settings.tsx` pattern:

- `title` (string) — heading for the FAQ index page
- `intro` (array of blocks, minified like `settings.description`) — intro copy for the FAQ index
- `defaultSeo` (object, type `seo`) — fallback metadata for FAQ pages that don't set their own `seo`

### Wiring

- `schemaTypes/index.ts`: import and register `faq`, `faqCategory`, `seo` (objects section),
  `faqSettings` (singletons section).
- `structure/index.ts`: add `'faqSettings'` to `DISABLED_TYPES`, add a second `S.listItem()` for
  "FAQ Settings" pointing at a fixed `documentId('faqSettings')`, alongside the existing "Site
  Settings" item.

## Frontend (`frontend/`)

### Route

`frontend/app/faq/[...path]/page.tsx` — catch-all route. `path` = `[...categorySlugPath,
faqSlug]`, reflecting arbitrary category nesting in the URL (e.g.
`/faq/billing/refunds/how-do-i-get-a-refund`).

- `generateStaticParams`: query all `faq` docs with their resolved category slug chain (walking
  `category->parent->parent...`), and all `faqCategory` docs' own chains for index pages; emit one
  `{path: string[]}` per faq and per category level.
- Page component: if the resolved path's last segment matches an `faq` slug within the resolved
  category chain, render the FAQ detail (short + long answer via existing `PortableText`
  component); if it matches only a category chain, render a simple index of child categories and
  FAQs directly under that category (reusing list patterns from `app/posts/[slug]`/`Posts.tsx`
  where reasonable — no new shared components beyond what's needed).
- `generateMetadata`: use the faq's `seo` (or the matched category index has no per-category SEO
  in this iteration — falls back to `faqSettings.defaultSeo`), same `resolveOpenGraphImage` helper
  used in `posts/[slug]/page.tsx`.
- 404 via `notFound()` when the path doesn't resolve to a known category chain or faq.

### GROQ (`frontend/sanity/lib/queries.ts`)

- `faqSettingsQuery` — the singleton, analogous to `settingsQuery`.
- `faqCategoryTreeQuery` — all `faqCategory` docs with `slug`, `parent->slug` resolved recursively
  enough levels to build paths (GROQ doesn't do arbitrary recursion natively, so this resolves a
  bounded number of parent levels, e.g. 5, which comfortably covers realistic nesting — documented
  as a practical bound, not an arbitrary-depth guarantee at the query layer).
- `faqPagesSlugs` — all faqs with resolved category path array, for `generateStaticParams`.
- `faqQuery` — single faq by full path (category slugs + faq slug), including `longAnswer`,
  `shortAnswer`, `seo`.
- `faqsByCategoryQuery` — faqs whose `category._ref` matches a resolved category id, for index
  pages.

## Skill package (`.agents/skills/sanity-faq-schema/`)

- `SKILL.md` — what this skill is for (scaffolding a nested-FAQ content model with SEO metadata
  and category-aware URLs in a Sanity + Next.js project), when to use it, and the file list it
  produces/expects (mirrors the schema section above).
- `reference/schema-files.md` — canonical field definitions for `seo`, `faqCategory`, `faq`,
  `faqSettings`, and the structure-builder wiring, as concrete code snippets to copy/adapt.
- `reference/frontend-route.md` — the catch-all route pattern, static params strategy for
  resolving nested category paths, and the GROQ queries above, as a reference implementation.

This repo's `studio/src/schemaTypes` and `frontend/` changes serve as the working reference
implementation the skill's docs point to.

## Out of scope

- Enforcing arbitrary-depth cycle prevention beyond the direct self-parent check.
- Visual polish/design system for the FAQ pages — functional layout only, reusing existing
  Tailwind classes/components where they fit.
- Search/filtering across FAQs.
