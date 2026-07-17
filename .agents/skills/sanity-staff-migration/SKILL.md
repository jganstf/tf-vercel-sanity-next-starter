---
name: sanity-staff-migration
description: Rename the Sanity `person` document type to `staff`, add a `department` categorization type and staff archive settings, nest them under a dedicated Studio sidebar node, and add /staff frontend routing with department filtering. Use when asked to convert a `person` type to `staff`, add staff/department content modeling, or build a staff directory page in this repo.
---

# Sanity Staff Migration

Converts the `person` document type into a `staff` type with department categorization, and adds matching frontend routing. This is a one-time schema + routing migration, not a recurring automation — re-run it manually if the source/target type names need to change.

See `docs/superpowers/specs/2026-07-17-staff-migration-design.md` and
`docs/superpowers/plans/2026-07-17-staff-migration.md` for the full design
rationale and step-by-step implementation this skill was built from.

## Procedure

1. **Rename the schema** (`studio/src/schemaTypes/documents/person.ts` →
   `staff.ts`): change `name`/`title` to `staff`, add `slug`, `department`
   (reference), `jobTitle`, `bio` fields. Update `post.ts`'s `author`
   reference target from `person` to `staff`. Update
   `studio/src/schemaTypes/index.ts` accordingly.
2. **Add a `department` document type**: `title` + `slug` fields only.
3. **Add a `staffSettings` singleton**: `title`, `intro` (portable text),
   `ogImage` — mirrors the existing `settings.tsx` pattern, fixed document
   id `staffSettings`.
4. **Nest Studio structure**: in `studio/src/structure/index.ts`, add
   `staff`, `department`, `staffSettings` to `DISABLED_TYPES` (so they drop
   out of the flat "Website Content" list), then add a top-level `"Staff"`
   list item whose child list contains "Staff Members", "Departments", and
   "Staff Settings".
5. **Scaffold (don't run) a migration script** at
   `studio/migrations/personToStaff.ts` using `defineMigration` from
   `sanity/migrate`, patching `_type: "person"` → `"staff"`. Document that
   `slug`/`department` aren't backfilled and must be run manually via
   `npx sanity migration run personToStaff` — never execute it as part of
   this skill.
6. **Add GROQ queries** to `frontend/sanity/lib/queries.ts`:
   `allStaffQuery` (with an optional `$department` slug filter),
   `staffQuery`, `staffSlugs`, `allDepartmentsQuery`, `staffSettingsQuery`.
7. **Add `/staff` archive page** (`frontend/app/staff/page.tsx` +
   `frontend/app/components/Staff.tsx`): renders `staffSettings` title/intro,
   department filter links (`?department=slug`), and a staff grid.
8. **Add `/staff/[slug]` single page**
   (`frontend/app/staff/[slug]/page.tsx`): same `generateStaticParams` /
   `generateMetadata` / `notFound()` shape as `frontend/app/posts/[slug]/page.tsx`.
9. **Wire Visual Editing**: add a `staff` case to `resolveHref` in
   `studio/sanity.config.ts`.

After every schema or query change, run `npm run sanity:typegen` (from
`studio/` for schema changes, `frontend/` for query changes) before writing
code that depends on the new types — both packages' generated
`sanity.types.ts` files must stay in sync with the schema.

## Constraints

- No new npm dependencies — use the `sanity`/`sanity/migrate` runtime
  already bundled with the `sanity` package.
- Never run the migration script against a real dataset automatically.
- `bio` is plain `text`, not portable text — keep it lightweight.
- Match existing file conventions (`defineField`/`defineType`, icons from
  `@sanity/icons`, all GROQ in the single `queries.ts` file, `PageProps<'/route'>`
  typed route props).
