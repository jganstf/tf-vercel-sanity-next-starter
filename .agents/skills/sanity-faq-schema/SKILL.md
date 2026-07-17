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
for the query + route implementation. Both are copied verbatim from a working reference
implementation in this repository — adapt import paths and reused component names
(`PortableText`, `resolveOpenGraphImage`, `sanityFetch`) to the target project's conventions.

## Known limitations

- Only direct self-parenting is blocked by schema validation; a category cycle spanning more
  than one hop (A -> B -> A) is not runtime-enforced.
- Category path resolution in GROQ is bounded to a fixed number of parent levels (5 by
  default) since GROQ has no native arbitrary recursion — deeper structures need the bound
  raised in the query fragment (`faqCategoryPath` in `reference/frontend-route.md`).
- The `faq` document's `category` field is a single reference, not a composite slug — the
  frontend route validates the full resolved category path against the requested URL before
  rendering, so a leaf-category slug collision under a different parent still 404s correctly
  rather than rendering the wrong FAQ.
