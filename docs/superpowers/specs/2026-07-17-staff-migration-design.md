# Staff Migration: Design Spec

Date: 2026-07-17

## Goal

Create a reusable Claude Code skill that migrates the existing Sanity `person` document type to a `staff` type, adds a `department` categorization type, adds a staff-specific settings singleton, nests staff-related content under a dedicated sidebar node in Sanity Studio, and updates the Next.js frontend with a staff archive page (filterable by department) and a staff single-page template.

## Scope

This is a one-time orchestration skill (not a recurring/automated tool). It performs a coordinated set of edits across the Sanity Studio schema, Studio structure, a data migration script, and the Next.js frontend. Running the resulting migration script against real content is a manual, explicit step — not something the skill executes automatically.

## 1. Schema changes

Location: `studio/src/schemaTypes/`

- **Rename `documents/person.ts` → `documents/staff.ts`.**
  - `type` name changes from `person` to `staff`.
  - Icon changes to `UsersIcon` (from `@sanity/icons`), reflecting the type's new purpose.
  - Fields:
    - `firstName` (string, required) — unchanged from `person`.
    - `lastName` (string, required) — unchanged from `person`.
    - `slug` (slug, required) — **new**. Source field: a combination of `firstName`/`lastName` (via `slugify` options on the slug field, similar to how `post`/`page` slugs are generated in this codebase).
    - `picture` (image, required, with required `alt` on presence, hotspot + aiAssist) — unchanged from `person`.
    - `department` (reference, required, to `department`) — **new**.
    - `jobTitle` (string, optional) — **new**.
    - `bio` (text, optional, plain multi-line text — not portable text, to keep this field lightweight) — **new**.
  - `preview.prepare` updated: subtitle changes from `'Person'` to the referenced department's title (or `'Staff'` as fallback if no department resolved), media stays `picture`.

- **New `documents/department.ts`.**
  - `type: 'document'`, icon `TagIcon` (or similar categorization icon from `@sanity/icons`).
  - Fields: `title` (string, required), `slug` (slug, required, source `title`).
  - `preview.prepare`: title = `title`.

- **New `singletons/staffSettings.ts`.**
  - Follows the exact pattern of `singletons/settings.tsx`.
  - `type: 'document'`, icon `CogIcon`.
  - Fields: `title` (string, initial value e.g. `"Staff"`), `intro` (portable text, same minimal block config as `settings.tsx`'s `description` field), `ogImage` (image, same shape as `settings.tsx`'s `ogImage`, with required alt + `metadataBase` URL subfield).
  - `preview.prepare()` returns static title `'Staff Settings'`.
  - Singleton document id: `staffSettings`.

- **Update `documents/post.ts`.**
  - `author` field's reference `to` array changes from `[{type: 'person'}]` to `[{type: 'staff'}]`.

- **Update `schemaTypes/index.ts`.**
  - Remove `person` import/export, add `staff`, `department`, `staffSettings` imports/exports.

## 2. Studio structure

Location: `studio/src/structure/index.ts`

- Add `'staff'`, `'department'`, and `'staffSettings'` to `DISABLED_TYPES` so they're excluded from the generic flat "Website Content" document list.
- Add a new top-level structure list item, in addition to the existing "Website Content" list and "Site Settings" item:
  - Title: `"Staff"`, icon `UsersIcon`.
  - Children:
    1. `"Staff Members"` — `S.documentTypeListItem('staff')`.
    2. `"Departments"` — `S.documentTypeListItem('department')`.
    3. `"Staff Settings"` — `S.listItem().child(S.document().schemaType('staffSettings').documentId('staffSettings'))`.

## 3. Data migration script

Location: `studio/migrations/` (new directory if one doesn't already exist, following `@sanity/migrate` conventions per Sanity best practices).

- A migration that:
  1. Patches every existing document with `_type == "person"` to `_type: "staff"`.
  2. Patches every existing `post` document's `author` reference so its `_ref` still resolves (the referenced document ID doesn't change — only its `_type` does — so reference integrity is preserved automatically; this step is a verification/no-op safeguard rather than a required patch, but the migration should assert/log that existing `author` references still resolve post-migration).
  3. Does **not** attempt to backfill `slug`, `department`, or `jobTitle`/`bio` on existing documents — those are new required/optional fields that content editors will need to fill in manually in Studio after the migration runs (the `slug` field, if left empty on a required field, will simply surface a validation warning in Studio until filled in — this is acceptable for a low-volume, editor-curated document type).
- The skill scaffolds this script but does **not** execute it — running `sanity migration run <name>` against real datasets is left as an explicit manual step for the user, called out in the skill's final instructions/output.

## 4. Frontend

Location: `frontend/`

- **`sanity/lib/queries.ts`** — add:
  - `allStaffQuery` — fetches all staff docs, optionally filtered by department slug via a `$department` GROQ param (`department->slug.current == $department` when param is set — implemented as a conditional filter passed from the calling page).
  - `staffQuery` — single staff doc by slug, resolves `department->title` and `department->slug`.
  - `staffSlugs` — for `generateStaticParams`, same shape as `postPagesSlugs`.
  - `allDepartmentsQuery` — fetches all departments (title + slug) for building the filter UI.
  - `staffSettingsQuery` — fetches the `staffSettings` singleton.

- **`app/staff/page.tsx`** — new archive page.
  - Fetches `staffSettingsQuery` (page title/intro), `allDepartmentsQuery` (filter options), and `allStaffQuery` (list, filtered server-side by a `department` search param read from `searchParams`).
  - Renders department filter links as `?department=<slug>` (plus an "All" link with no param), and a grid/list of staff cards linking to `/staff/[slug]`.
  - Follows the same server-component + `sanityFetch` pattern as `components/Posts.tsx`.

- **`app/staff/[slug]/page.tsx`** — new single staff template.
  - Same shape as `app/posts/[slug]/page.tsx`: `generateStaticParams()` via `staffSlugs`, `generateMetadata()`, `notFound()` guard, default async page component calling `sanityFetch({query: staffQuery, params: {slug}})`.
  - Renders picture, full name, jobTitle, department (linked back to `/staff?department=slug`), and bio.

- **`sanity.config.ts`** — `resolveHref` switch gets a new `case 'staff': return `/staff/${slug}``.

## 5. The skill

New Claude Code skill directory: `.agents/skills/sanity-staff-migration/SKILL.md`.

- Documents the above as an ordered, repeatable procedure (schema rename → new department type → new staffSettings singleton → structure nesting → migration script scaffold → frontend routing/queries/config).
- Written so it can be reviewed or re-run (e.g., against a differently-named source type) rather than as throwaway one-off instructions, per the user's explicit request to add a "skill."
- Skill output ends with an explicit reminder that the scaffolded migration script must be run manually (`sanity migration run ...`) against the target dataset, and that new required fields (`slug`, `department`) on existing migrated documents will need manual completion in Studio.

## Out of scope

- Automatic execution of the migration against a live/production dataset.
- Backfilling `slug`/`department` values on existing person→staff documents (no reasonable automatic default exists).
- Auth/permissions changes to the new Studio structure nodes (inherits existing project-wide Studio access rules).
