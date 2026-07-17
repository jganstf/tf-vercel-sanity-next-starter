# Staff Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Sanity `person` document type to `staff`, add a `department` categorization type and a `staffSettings` singleton, nest staff content under a dedicated Studio sidebar node, scaffold a migration script, and add a `/staff` archive (filterable by department) + `/staff/[slug]` single page to the Next.js frontend — all encoded as a reusable Claude Code skill.

**Architecture:** This is a Sanity Studio + Next.js (App Router) monorepo with `studio/` (schema, structure, config) and `frontend/` (routes, GROQ queries, `next-sanity` live fetch). Schema changes flow through `sanity typegen generate` to produce typed query results consumed by the frontend. No test runner exists in this repo — verification is via `sanity typegen`, `tsc --noEmit` (`type-check` script), and `next build`, plus manual dev-server checks.

**Tech Stack:** Sanity Studio v5 (`sanity`, `@sanity/icons`, `sanity/structure`), `next-sanity` (`defineQuery`, `sanityFetch`), Next.js App Router, TypeScript.

## Global Constraints

- No new npm dependencies — the migration script uses the Sanity CLI's built-in `sanity/migrate` runtime (already bundled with the `sanity` package), not `@sanity/migrate` as a separate install.
- The migration script is scaffolded only. Never run `sanity migration run` against a real dataset as part of this plan.
- Follow existing file conventions exactly: `defineField`/`defineType` from `sanity`, icons from `@sanity/icons`, GROQ in the single flat `frontend/sanity/lib/queries.ts` file, `PageProps<'/route'>` typed route props in page components.
- `bio` field on staff is plain `text` (not portable text) per the approved spec — keep it lightweight.
- Every schema/query change must be followed by regenerating types (`npm run sanity:typegen` from `frontend/`) before writing code that depends on the new/changed types, since the frontend imports generated types (e.g. `AllPostsQueryResult`) from `frontend/sanity.types.ts`.

---

### Task 1: Rename `person` schema to `staff` with new fields

**Files:**
- Create: `studio/src/schemaTypes/documents/staff.ts`
- Delete: `studio/src/schemaTypes/documents/person.ts`
- Modify: `studio/src/schemaTypes/documents/post.ts:84` (author reference target)
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Produces: schema type `staff` with fields `firstName` (string), `lastName` (string), `slug` (slug), `picture` (image), `department` (reference to `department`, added in Task 2 — the reference is declared here but the target type doesn't need to exist yet for TypeScript; Sanity resolves reference types by string name), `jobTitle` (string, optional), `bio` (text, optional).
- Consumes: nothing from other tasks.

- [ ] **Step 1: Create `studio/src/schemaTypes/documents/staff.ts`**

```typescript
import {UsersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import type {Staff} from '../../../sanity.types'

/**
 * Staff schema.  Define and edit the fields for the 'staff' content type.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const staff = defineType({
  name: 'staff',
  title: 'Staff',
  icon: UsersIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'A slug is required for the staff member to show up on the staff archive page',
      options: {
        source: (doc) => `${(doc as Staff).firstName || ''} ${(doc as Staff).lastName || ''}`,
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'picture',
      title: 'Picture',
      type: 'image',
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
          validation: (rule) => {
            // Custom validation to ensure alt text is provided if the image is present. https://www.sanity.io/docs/validation
            return rule.custom((alt, context) => {
              const document = context.document as Staff
              if (document?.picture?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        }),
      ],
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{type: 'department'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'jobTitle',
      title: 'Job Title',
      type: 'string',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 4,
    }),
  ],
  // List preview configuration. https://www.sanity.io/docs/previews-list-views
  preview: {
    select: {
      firstName: 'firstName',
      lastName: 'lastName',
      picture: 'picture',
      departmentTitle: 'department.title',
    },
    prepare(selection) {
      return {
        title: `${selection.firstName} ${selection.lastName}`,
        subtitle: selection.departmentTitle || 'Staff',
        media: selection.picture,
      }
    },
  },
})
```

Note: `import type {Staff} from '../../../sanity.types'` will not resolve until Task 1 Step 4 regenerates types. This is expected — TypeScript errors here are fixed by Step 4, not before.

- [ ] **Step 2: Delete the old person schema file**

```bash
rm studio/src/schemaTypes/documents/person.ts
```

- [ ] **Step 3: Update `studio/src/schemaTypes/index.ts`**

Replace the file contents with:

```typescript
import {staff} from './documents/staff'
import {page} from './documents/page'
import {post} from './documents/post'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {settings} from './singletons/settings'
import {link} from './objects/link'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/studio/schema-types

export const schemaTypes = [
  // Singletons
  settings,
  // Documents
  page,
  post,
  staff,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
]
```

(`department` and `staffSettings` are added to this array in Tasks 2 and 3.)

- [ ] **Step 4: Update `studio/src/schemaTypes/documents/post.ts:84`**

Change:
```typescript
      type: 'reference',
      to: [{type: 'person'}],
```
to:
```typescript
      type: 'reference',
      to: [{type: 'staff'}],
```

- [ ] **Step 5: Regenerate types and typecheck the studio**

Run from `studio/`:
```bash
npm run sanity:typegen
```
Expected: completes without error, `studio/sanity.types.ts` now contains a `Staff` type (no `Person` type). Note this step will still show a resolution error for `department` reference target — that's expected until Task 2 adds the `department` schema; the type extraction only fails on truly unknown fields, not on forward-referenced document types, so this should succeed.

Then run:
```bash
cd studio && npx tsc --noEmit
```
Expected: no errors from `staff.ts`, `post.ts`, or `index.ts` (errors from not-yet-created `department`/`staffSettings` files don't exist yet since we haven't referenced them elsewhere).

- [ ] **Step 6: Commit**

```bash
git add studio/src/schemaTypes/documents/staff.ts studio/src/schemaTypes/documents/post.ts studio/src/schemaTypes/index.ts studio/sanity.types.ts
git rm studio/src/schemaTypes/documents/person.ts
git commit -m "Rename person schema to staff with slug, department, jobTitle, bio fields"
```

---

### Task 2: Add `department` document type

**Files:**
- Create: `studio/src/schemaTypes/documents/department.ts`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: schema type `department` with fields `title` (string), `slug` (slug). Referenced by `staff.department` (Task 1) and used by structure (Task 4) and frontend queries (Task 7).

- [ ] **Step 1: Create `studio/src/schemaTypes/documents/department.ts`**

```typescript
import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Department schema.  Used to categorize staff members.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const department = defineType({
  name: 'department',
  title: 'Department',
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
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
    prepare({title}) {
      return {title}
    },
  },
})
```

- [ ] **Step 2: Register `department` in `studio/src/schemaTypes/index.ts`**

Add the import at the top (alongside the other document imports):
```typescript
import {department} from './documents/department'
```
Add `department` to the `schemaTypes` array, after `staff`:
```typescript
export const schemaTypes = [
  // Singletons
  settings,
  // Documents
  page,
  post,
  staff,
  department,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
]
```

- [ ] **Step 3: Regenerate types and typecheck**

Run from `studio/`:
```bash
npm run sanity:typegen && npx tsc --noEmit
```
Expected: no errors. `studio/sanity.types.ts` now includes a `Department` type, and the `staff.department` reference in `Staff` resolves to `{_ref: string; _type: 'reference'; ...}` referencing `department`.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/documents/department.ts studio/src/schemaTypes/index.ts studio/sanity.types.ts
git commit -m "Add department document type for staff categorization"
```

---

### Task 3: Add `staffSettings` singleton

**Files:**
- Create: `studio/src/schemaTypes/singletons/staffSettings.tsx`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: schema type `staffSettings` (singleton, fixed document id `staffSettings`), fields `title` (string), `intro` (portable text array), `ogImage` (image). Used by Studio structure (Task 4) and the frontend `staffSettingsQuery` (Task 7).

- [ ] **Step 1: Create `studio/src/schemaTypes/singletons/staffSettings.tsx`**

```typescript
import {CogIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import type {StaffSettings} from '../../../sanity.types'

/**
 * Staff Settings schema Singleton. Controls the staff archive page's title, intro copy, and social image.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const staffSettings = defineType({
  name: 'staffSettings',
  title: 'Staff Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'title',
      description: 'This field is the title of your staff archive page.',
      title: 'Title',
      type: 'string',
      initialValue: 'Our Staff',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      description: 'Used on the staff archive page',
      title: 'Intro',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          options: {},
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
          description: 'Important for accessibility and SEO.',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => {
            return rule.custom((alt, context) => {
              const document = context.document as StaffSettings
              if (document?.ogImage?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Staff Settings',
      }
    },
  },
})
```

- [ ] **Step 2: Register `staffSettings` in `studio/src/schemaTypes/index.ts`**

Add the import at the top:
```typescript
import {staffSettings} from './singletons/staffSettings'
```
Add `staffSettings` to the `schemaTypes` array, alongside `settings`:
```typescript
export const schemaTypes = [
  // Singletons
  settings,
  staffSettings,
  // Documents
  page,
  post,
  staff,
  department,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
]
```

- [ ] **Step 3: Regenerate types and typecheck**

Run from `studio/`:
```bash
npm run sanity:typegen && npx tsc --noEmit
```
Expected: no errors. `studio/sanity.types.ts` now includes a `StaffSettings` type.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/singletons/staffSettings.tsx studio/src/schemaTypes/index.ts studio/sanity.types.ts
git commit -m "Add staffSettings singleton for staff archive page metadata"
```

---

### Task 4: Nest staff content under a dedicated Studio sidebar node

**Files:**
- Modify: `studio/src/structure/index.ts`

**Interfaces:**
- Consumes: schema type names `staff`, `department`, `staffSettings` from Tasks 1–3.
- Produces: nothing consumed by later tasks (this is a leaf/UI-only change).

- [ ] **Step 1: Replace the contents of `studio/src/structure/index.ts`**

```typescript
import {CogIcon, UsersIcon} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 */

const DISABLED_TYPES = [
  'settings',
  'assist.instruction.context',
  'staff',
  'department',
  'staffSettings',
]

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      ...S.documentTypeListItems()
        // Remove content types that get their own dedicated structure nodes below
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
      // Staff: a dedicated nested node grouping staff members, departments, and staff archive settings.
      S.listItem()
        .title('Staff')
        .icon(UsersIcon)
        .child(
          S.list()
            .title('Staff')
            .items([
              S.documentTypeListItem('staff').title('Staff Members'),
              S.documentTypeListItem('department').title('Departments'),
              S.listItem()
                .title('Staff Settings')
                .child(S.document().schemaType('staffSettings').documentId('staffSettings'))
                .icon(CogIcon),
            ]),
        ),
    ])
```

- [ ] **Step 2: Typecheck the studio**

Run from `studio/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Manually verify in Studio**

Run from `studio/`:
```bash
npm run dev
```
Open the printed local URL, confirm the sidebar shows: "Website Content" (no Staff/Department/Staff Settings entries in it), "Site Settings", and a new "Staff" node that expands to "Staff Members", "Departments", "Staff Settings". Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add studio/src/structure/index.ts
git commit -m "Nest staff, department, and staff settings under a dedicated sidebar node"
```

---

### Task 5: Scaffold the (unexecuted) person→staff migration script

**Files:**
- Create: `studio/migrations/personToStaff.ts`

**Interfaces:**
- Consumes: nothing (standalone script, not imported by app code).
- Produces: nothing consumed by later tasks — this is a leaf deliverable.

- [ ] **Step 1: Create the `studio/migrations/` directory and migration file**

```bash
mkdir -p studio/migrations
```

Create `studio/migrations/personToStaff.ts`:

```typescript
import {defineMigration, at, setIfMissing} from 'sanity/migrate'

/**
 * One-time migration: renames every `person` document to `staff`.
 *
 * This does NOT backfill the new required `slug` or `department` fields —
 * there's no reasonable automatic default for either, so migrated documents
 * will show validation warnings in Studio until an editor fills them in.
 *
 * Reference integrity: `post.author` references store only a document `_id`,
 * and this migration does not change any document `_id` — only `_type` — so
 * existing `post.author` references continue to resolve correctly after this
 * migration runs, now pointing at documents of type `staff` instead of `person`.
 *
 * To run this migration against a real dataset (do this manually, not as
 * part of any automated process):
 *   npx sanity migration run personToStaff --project <projectId> --dataset <dataset>
 * Add --no-dry-run once you've reviewed the dry-run output.
 */
export default defineMigration({
  title: 'Convert person documents to staff',
  documentTypes: ['person'],
  migrate: {
    document(doc) {
      return [at('_type', setIfMissing('staff')), at('_type', () => 'staff')]
    },
  },
})
```

- [ ] **Step 2: Validate the migration file loads via the Sanity CLI's dry run**

Run from `studio/`:
```bash
npx sanity migration run personToStaff --dry-run
```
Expected: the CLI parses and reports the migration (e.g. "Found 0 documents of type person" if the dataset currently contains none, since `person` no longer exists as a schema type after Task 1 — that's fine, this step only validates the script is syntactically valid and loadable by the CLI, not that it does anything on this dataset). If the CLI errors on `documentTypes: ['person']` because `person` isn't a known schema type anymore, that's expected and acceptable — the script targets historical data (`_type == "person"` documents that may still exist from before the schema rename), not the current schema.

- [ ] **Step 3: Commit**

```bash
git add studio/migrations/personToStaff.ts
git commit -m "Scaffold person-to-staff migration script (not executed)"
```

---

### Task 6: Add staff/department GROQ queries

**Files:**
- Modify: `frontend/sanity/lib/queries.ts`

**Interfaces:**
- Consumes: schema field names `firstName`, `lastName`, `slug`, `picture`, `department`, `jobTitle`, `bio` (Task 1), `title`/`slug` on `department` (Task 2), `title`/`intro`/`ogImage` on `staffSettings` (Task 3).
- Produces: `allStaffQuery`, `staffQuery`, `staffSlugs`, `allDepartmentsQuery`, `staffSettingsQuery` — consumed by Tasks 8 and 9.

- [ ] **Step 1: Append the new queries to `frontend/sanity/lib/queries.ts`**

Add at the end of the file:

```typescript
const staffFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  firstName,
  lastName,
  "slug": slug.current,
  picture,
  jobTitle,
  bio,
  "department": department->{title, "slug": slug.current},
`

export const allStaffQuery = defineQuery(`
  *[_type == "staff" && defined(slug.current) && (!defined($department) || department->slug.current == $department)] | order(lastName asc, firstName asc) {
    ${staffFields}
  }
`)

export const staffQuery = defineQuery(`
  *[_type == "staff" && slug.current == $slug] [0] {
    ${staffFields}
  }
`)

export const staffSlugs = defineQuery(`
  *[_type == "staff" && defined(slug.current)]
  {"slug": slug.current}
`)

export const allDepartmentsQuery = defineQuery(`
  *[_type == "department" && defined(slug.current)] | order(title asc) {
    title,
    "slug": slug.current,
  }
`)

export const staffSettingsQuery = defineQuery(`*[_type == "staffSettings"][0]`)
```

Note: `$department` is passed as `null` when no filter is active — GROQ's `!defined($department)` correctly treats a `null` param as "not defined," so the query works for both the unfiltered and filtered case with the same query string.

- [ ] **Step 2: Regenerate frontend types**

Run from `frontend/`:
```bash
npm run sanity:typegen
```
Expected: completes without error. `frontend/sanity.types.ts` now includes `AllStaffQueryResult`, `StaffQueryResult`, `StaffSlugsResult`, `AllDepartmentsQueryResult`, `StaffSettingsQueryResult`.

- [ ] **Step 3: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts
git commit -m "Add staff and department GROQ queries"
```

---

### Task 7: Staff archive page (`/staff`) with department filtering

**Files:**
- Create: `frontend/app/staff/page.tsx`
- Create: `frontend/app/components/Staff.tsx`

**Interfaces:**
- Consumes: `allStaffQuery`, `allDepartmentsQuery`, `staffSettingsQuery` (Task 6); `AllStaffQueryResult`, `AllDepartmentsQueryResult` types (Task 6, Step 2); `sanityFetch` from `@/sanity/lib/live`; `SanityImage` component (existing, same as used by `Avatar.tsx`).
- Produces: the `Staff` component (`StaffCard`, `StaffGrid`) — not consumed by other tasks, this is the archive page's own rendering unit.

- [ ] **Step 1: Create `frontend/app/components/Staff.tsx`**

```typescript
import Link from 'next/link'

import Image from '@/app/components/SanityImage'
import {AllStaffQueryResult} from '@/sanity.types'
import {dataAttr} from '@/sanity/lib/utils'

const StaffCard = ({member}: {member: AllStaffQueryResult[number]}) => {
  const {_id, firstName, lastName, slug, picture, jobTitle, department} = member

  return (
    <Link
      href={`/staff/${slug}`}
      data-sanity={dataAttr({id: _id, type: 'staff', path: 'firstName'}).toString()}
      key={_id}
      className="border border-gray-200 rounded-sm p-6 bg-gray-50 flex flex-col gap-4 transition-colors hover:bg-white"
    >
      {picture?.asset?._ref && (
        <div className="h-16 w-16">
          <Image
            id={picture.asset._ref}
            alt={picture.alt || ''}
            className="h-full w-full rounded-full"
            width={64}
            height={64}
            hotspot={picture.hotspot}
            crop={picture.crop}
            mode="cover"
          />
        </div>
      )}
      <div>
        <h3 className="text-xl">
          {firstName} {lastName}
        </h3>
        {jobTitle && <p className="text-sm text-gray-600">{jobTitle}</p>}
        {department?.title && <p className="text-xs text-gray-500 font-mono">{department.title}</p>}
      </div>
    </Link>
  )
}

export const StaffGrid = ({staff}: {staff: AllStaffQueryResult}) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {staff.map((member) => (
      <StaffCard key={member._id} member={member} />
    ))}
  </div>
)
```

- [ ] **Step 2: Create `frontend/app/staff/page.tsx`**

```typescript
import type {Metadata} from 'next'
import Link from 'next/link'
import {PortableText} from '@portabletext/react'

import {StaffGrid} from '@/app/components/Staff'
import {sanityFetch} from '@/sanity/lib/live'
import {allDepartmentsQuery, allStaffQuery, staffSettingsQuery} from '@/sanity/lib/queries'

export async function generateMetadata(): Promise<Metadata> {
  const {data: staffSettings} = await sanityFetch({query: staffSettingsQuery, stega: false})
  return {
    title: staffSettings?.title || 'Our Staff',
  } satisfies Metadata
}

export default async function StaffArchivePage(props: PageProps<'/staff'>) {
  const searchParams = await props.searchParams
  const department =
    typeof searchParams.department === 'string' ? searchParams.department : null

  const [{data: staffSettings}, {data: departments}, {data: staff}] = await Promise.all([
    sanityFetch({query: staffSettingsQuery}),
    sanityFetch({query: allDepartmentsQuery}),
    sanityFetch({query: allStaffQuery, params: {department}}),
  ])

  return (
    <div className="container my-12 lg:my-24 grid gap-12">
      <div className="max-w-3xl flex flex-col gap-6">
        <h1 className="text-4xl text-gray-900 sm:text-5xl lg:text-7xl">
          {staffSettings?.title || 'Our Staff'}
        </h1>
        {staffSettings?.intro && (
          <div className="prose">
            <PortableText value={staffSettings.intro} />
          </div>
        )}
      </div>

      {departments && departments.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <Link
            href="/staff"
            className={`text-sm underline-offset-4 ${!department ? 'font-bold underline' : 'text-gray-600 hover:underline'}`}
          >
            All
          </Link>
          {departments.map((dept) => (
            <Link
              key={dept.slug}
              href={`/staff?department=${dept.slug}`}
              className={`text-sm underline-offset-4 ${department === dept.slug ? 'font-bold underline' : 'text-gray-600 hover:underline'}`}
            >
              {dept.title}
            </Link>
          ))}
        </div>
      )}

      {staff && staff.length > 0 ? (
        <StaffGrid staff={staff} />
      ) : (
        <p className="text-gray-600">No staff members found.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck the frontend**

Run from `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no errors. (`PageProps<'/staff'>` resolves once `next dev`/`next build` has generated route types at least once — if this errors with "route type not found," run `npx next typegen` first, then re-run `tsc --noEmit`.)

- [ ] **Step 4: Manually verify the archive page**

Run from `frontend/`:
```bash
npm run dev
```
Visit `http://localhost:3000/staff`. Confirm the page loads without a 500 error (it's expected to show "No staff members found." until real content exists, which is fine). Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/staff/page.tsx frontend/app/components/Staff.tsx
git commit -m "Add staff archive page with department filtering"
```

---

### Task 8: Staff single page (`/staff/[slug]`)

**Files:**
- Create: `frontend/app/staff/[slug]/page.tsx`

**Interfaces:**
- Consumes: `staffQuery`, `staffSlugs` (Task 6); `StaffQueryResult` type (Task 6); `SanityImage` component; `resolveOpenGraphImage` from `@/sanity/lib/utils`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `frontend/app/staff/[slug]/page.tsx`**

```typescript
import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'

import Image from '@/app/components/SanityImage'
import {sanityFetch} from '@/sanity/lib/live'
import {staffQuery, staffSlugs} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: staffSlugs,
    perspective: 'published',
    stega: false,
  })
  return data
}

export async function generateMetadata(props: PageProps<'/staff/[slug]'>): Promise<Metadata> {
  const params = await props.params
  const {data: member} = await sanityFetch({query: staffQuery, params, stega: false})
  const ogImage = resolveOpenGraphImage(member?.picture)

  return {
    title: member ? `${member.firstName} ${member.lastName}` : undefined,
    description: member?.jobTitle || undefined,
    openGraph: {
      images: ogImage ? [ogImage] : [],
    },
  } satisfies Metadata
}

export default async function StaffMemberPage(props: PageProps<'/staff/[slug]'>) {
  const params = await props.params
  const {data: member} = await sanityFetch({query: staffQuery, params})

  if (!member?._id) {
    return notFound()
  }

  return (
    <div className="container my-12 lg:my-24 grid gap-8 max-w-3xl">
      <div className="flex items-center gap-6">
        {member.picture?.asset?._ref && (
          <div className="h-24 w-24 shrink-0">
            <Image
              id={member.picture.asset._ref}
              alt={member.picture.alt || ''}
              className="h-full w-full rounded-full"
              width={96}
              height={96}
              hotspot={member.picture.hotspot}
              crop={member.picture.crop}
              mode="cover"
            />
          </div>
        )}
        <div>
          <h1 className="text-4xl text-gray-900 sm:text-5xl">
            {member.firstName} {member.lastName}
          </h1>
          {member.jobTitle && <p className="text-lg text-gray-600 mt-1">{member.jobTitle}</p>}
          {member.department?.title && (
            <Link
              href={`/staff?department=${member.department.slug}`}
              className="text-sm text-brand underline underline-offset-4 mt-1 inline-block"
            >
              {member.department.title}
            </Link>
          )}
        </div>
      </div>
      {member.bio && <p className="text-gray-700 leading-7 whitespace-pre-line">{member.bio}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck the frontend**

Run from `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Manually verify the single page returns 404 for an unknown slug**

Run from `frontend/`:
```bash
npm run dev
```
Visit `http://localhost:3000/staff/nonexistent-slug`. Confirm a 404 page renders (via `notFound()`). Stop the dev server once confirmed.

- [ ] **Step 4: Commit**

```bash
git add "frontend/app/staff/[slug]/page.tsx"
git commit -m "Add staff single-member page"
```

---

### Task 9: Wire `staff` into `resolveHref` for Visual Editing

**Files:**
- Modify: `studio/sanity.config.ts:35-45`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add a `staff` case to `resolveHref` in `studio/sanity.config.ts`**

Change:
```typescript
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    case 'post':
      return slug ? `/posts/${slug}` : undefined
    case 'page':
      return slug ? `/${slug}` : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}
```
to:
```typescript
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    case 'post':
      return slug ? `/posts/${slug}` : undefined
    case 'page':
      return slug ? `/${slug}` : undefined
    case 'staff':
      return slug ? `/staff/${slug}` : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}
```

- [ ] **Step 2: Typecheck the studio**

Run from `studio/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add studio/sanity.config.ts
git commit -m "Resolve staff document hrefs for Visual Editing"
```

---

### Task 10: Write the Claude Code skill documenting this procedure

**Files:**
- Create: `.agents/skills/sanity-staff-migration/SKILL.md`

**Interfaces:**
- Consumes: nothing (documentation artifact).
- Produces: nothing (terminal task).

- [ ] **Step 1: Check the existing skill file format**

Run:
```bash
ls .agents/skills/ && cat .agents/skills/*/SKILL.md | head -30
```
Use whatever frontmatter/structure convention appears (e.g. `name`/`description` frontmatter) — match it exactly rather than inventing a new format. If `.agents/skills/` doesn't exist yet, create it.

- [ ] **Step 2: Create `.agents/skills/sanity-staff-migration/SKILL.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/sanity-staff-migration/SKILL.md
git commit -m "Add sanity-staff-migration Claude Code skill"
```

---

## Final Verification

- [ ] **Full build check**

Run from the repo root:
```bash
cd studio && npx tsc --noEmit && cd ../frontend && npm run sanity:typegen && npx tsc --noEmit && npm run build
```
Expected: all commands succeed with no type errors and a successful Next.js production build.
