# Footer Settings + Legal Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-level "Footer" singleton settings page in Sanity Studio (with dividers around it and Site Settings in the desk structure) holding a `legalMenu` array, and render that legal menu in the frontend `FooterBottom` component.

**Architecture:** A new `footer` singleton schema (object array of `{label, link}` items reusing the existing shared `link` object type) is added to the Studio, registered in the schema list and given its own desk-structure entry. The frontend adds a `footerQuery` GROQ query mirroring the existing `settingsQuery` singleton pattern, reusing the existing `linkReference` fragment to resolve page/post references. `FooterBottom` becomes an async server component (matching `Header.tsx`'s existing `sanityFetch` pattern) that renders the resolved links via the existing `ResolvedLink` component.

**Tech Stack:** Sanity Studio v3 (schema/structure builder), Next.js App Router (async server components), `next-sanity` (`defineQuery`, `sanityFetch`), GROQ, TypeScript, Sanity TypeGen.

**Reference:** design spec at `docs/superpowers/specs/2026-07-17-footer-settings-legal-menu-design.md`.

## Global Constraints

- No automated test framework exists in this repo (`frontend/package.json` and `studio/package.json` have no `test` script, no jest/vitest). Verification steps in this plan use `tsc`/typegen/build commands and manual Studio/browser checks instead of unit tests — this is a deliberate deviation from TDD, matching this codebase's existing conventions (there are no existing test files for schema types or layout components either).
- Reuse the existing shared `link` object type (`studio/src/schemaTypes/objects/link.ts`) as-is — do not add a `label` field to it (per design: label lives on the wrapping `legalMenuItem` object, matching the `button`/`buttonText` convention in `Cta.tsx`).
- No plain-text (non-link) legal menu items — every item requires a link (per design, out of scope).
- After any schema change, regenerate types by running `npm run sanity:typegen` from `frontend/` (this runs `sanity schema extract` in `studio/` then `sanity typegen generate` in `frontend/`).

---

### Task 1: Footer singleton schema

**Files:**
- Create: `studio/src/schemaTypes/singletons/footer.ts`
- Modify: `studio/src/schemaTypes/index.ts`

**Interfaces:**
- Consumes: existing `link` object type (`studio/src/schemaTypes/objects/link.ts`, schema type name `'link'`).
- Produces: schema type name `'footer'`, document field `legalMenu` (array of objects named `'legalMenuItem'`, each with `label: string` and `link: link`). Singleton document id used later by the desk structure: `'footer'`.

- [ ] **Step 1: Write the schema file**

Create `studio/src/schemaTypes/singletons/footer.ts`:

```ts
import {DocumentIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Footer schema Singleton. Holds the site-wide footer legal menu (e.g. Privacy Policy, Terms).
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const footer = defineType({
  name: 'footer',
  title: 'Footer',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'legalMenu',
      title: 'Legal Menu',
      description: 'Links shown in the footer bottom bar, e.g. Privacy Policy, Terms of Service.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'legalMenuItem',
          title: 'Legal Menu Item',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'link',
              title: 'Link',
              type: 'link',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {title: 'label'},
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Footer',
      }
    },
  },
})
```

- [ ] **Step 2: Register the schema type**

In `studio/src/schemaTypes/index.ts`, add the import and register `footer` alongside `settings` in the singletons section:

```ts
import {person} from './documents/person'
import {page} from './documents/page'
import {post} from './documents/post'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {settings} from './singletons/settings'
import {footer} from './singletons/footer'
import {link} from './objects/link'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'

export const schemaTypes = [
  // Singletons
  settings,
  footer,
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
]
```

- [ ] **Step 3: Verify the schema is valid**

Run from `studio/`:

```bash
cd studio && npx sanity schema extract --enforce-required-fields --path ../sanity.schema.json
```

Expected: command exits 0 and `sanity.schema.json` at the repo root now contains a `"footer"` type definition (check with `grep '"name": "footer"' ../sanity.schema.json`).

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/singletons/footer.ts studio/src/schemaTypes/index.ts sanity.schema.json
git commit -m "Add footer singleton schema with legal menu"
```

---

### Task 2: Desk structure — Footer above Site Settings with dividers

**Files:**
- Modify: `studio/src/structure/index.ts`

**Interfaces:**
- Consumes: schema type `'footer'` (Task 1), schema type `'settings'` (existing).
- Produces: desk structure with a `'footer'` singleton document reachable at document id `'footer'`, placed above the existing `'settings'` singleton (document id `'siteSettings'`), both separated from the main content list and each other by `S.divider()`.

- [ ] **Step 1: Update the structure resolver**

Replace the contents of `studio/src/structure/index.ts`:

```ts
import {CogIcon, DocumentIcon} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 */

const DISABLED_TYPES = ['settings', 'footer', 'assist.instruction.context']

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      ...S.documentTypeListItems()
        // Remove the "assist.instruction.context", "settings", and "footer" content from the list of content types
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        // Pluralize the title of each document type.  This is not required but just an option to consider.
        .map((listItem) => {
          return listItem.title(pluralize(listItem.getTitle() as string))
        }),
      S.divider(),
      // Footer Singleton in order to view/edit the one particular document for Footer.
      S.listItem()
        .title('Footer')
        .child(S.document().schemaType('footer').documentId('footer'))
        .icon(DocumentIcon),
      S.divider(),
      // Settings Singleton in order to view/edit the one particular document for Settings.  Learn more about Singletons: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),
    ])
```

- [ ] **Step 2: Verify the studio config compiles**

Run from `studio/`:

```bash
cd studio && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Manually verify in the Studio UI**

Run from `studio/`:

```bash
cd studio && npm run dev
```

Open the printed local URL, confirm the left sidebar shows: content types, a divider, "Footer", a divider, "Site Settings" — in that order — and clicking "Footer" opens a single editable document titled "Footer" with a "Legal Menu" array field. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add studio/src/structure/index.ts
git commit -m "Add Footer singleton to desk structure above Site Settings"
```

---

### Task 3: Frontend `footerQuery`

**Files:**
- Modify: `frontend/sanity/lib/queries.ts`
- Modify: `frontend/sanity/lib/types.ts`

**Interfaces:**
- Consumes: existing `linkReference` GROQ fragment (`frontend/sanity/lib/queries.ts:16-21`), existing `DereferencedLink` type (`frontend/sanity/lib/types.ts:10-17`).
- Produces: exported `footerQuery` (a `defineQuery` result) and exported `DereferencedLegalMenuItem` type, for use in Task 4.

- [ ] **Step 1: Add the query**

In `frontend/sanity/lib/queries.ts`, add after `settingsQuery`:

```ts
export const settingsQuery = defineQuery(`*[_type == "settings"][0]`)

export const footerQuery = defineQuery(`
  *[_type == "footer"][0]{
    legalMenu[]{
      label,
      ${linkFields}
    }
  }
`)
```

Note: `linkFields` is defined further down the file (line 23-28); since this is all one module evaluated top-to-bottom at call time inside template literals (not at declaration time), and `footerQuery`'s definition must come after `linkFields` is declared. Place the `footerQuery` export immediately after the `linkFields` declaration instead (i.e., right before `getPageQuery`), not directly after `settingsQuery`. The full ordering in the file becomes: `settingsQuery`, `postFields`, `linkReference`, `linkFields`, `footerQuery`, `getPageQuery`, ...

- [ ] **Step 2: Add the resolved-type helper**

In `frontend/sanity/lib/types.ts`, add after `DereferencedLink`:

```ts
// Represents a footer legalMenu item after GROQ dereferencing
export type DereferencedLegalMenuItem = {
  label: string
  link: DereferencedLink
}
```

- [ ] **Step 3: Regenerate Sanity types**

Run from `frontend/`:

```bash
cd frontend && npm run sanity:typegen
```

Expected: command exits 0 and `frontend/sanity.types.ts` now contains a `FooterQueryResult` type (check with `grep 'FooterQueryResult' sanity.types.ts`).

- [ ] **Step 4: Verify types compile**

Run from `frontend/`:

```bash
cd frontend && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity/lib/types.ts frontend/sanity.types.ts
git commit -m "Add footerQuery for fetching footer legal menu"
```

---

### Task 4: Render legal menu in `FooterBottom`

**Files:**
- Modify: `frontend/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `footerQuery` (Task 3, `@/sanity/lib/queries`), `sanityFetch` (`@/sanity/lib/live`, same import used in `Header.tsx`), `ResolvedLink` (`@/components/ResolvedLink`, same component used in `Cta.tsx`), `DereferencedLegalMenuItem` (Task 3, `@/sanity/lib/types`).
- Produces: `FooterBottom` as an async server component rendering the legal menu next to the existing copyright text; `Footer` default export awaits it.

- [ ] **Step 1: Update `Footer.tsx`**

Replace `frontend/components/layout/Footer.tsx`:

```tsx
import {footerQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'
import ResolvedLink from '@/components/ResolvedLink'
import {DereferencedLegalMenuItem} from '@/sanity/lib/types'

const FooterMain = () => {
  return (
    <div className="footerMain">
      <p className="text-center text-sm text-gray-500">
        This is the main footer content.
      </p>
    </div>
  )
}

const FooterBottom = async () => {
  const {data: footer} = await sanityFetch({query: footerQuery})
  const legalMenu = (footer?.legalMenu ?? []) as DereferencedLegalMenuItem[]

  return (
    <div className="footerBottom flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
      <p className="text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} TF. All rights reserved.
      </p>
      {legalMenu.length > 0 && (
        <ul role="list" className="flex items-center gap-4">
          {legalMenu.map((item, index) => (
            <li key={index}>
              <ResolvedLink link={item.link} className="text-sm text-gray-500 hover:underline">
                {item.label}
              </ResolvedLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="bg-gray-50 relative py-4">
      <FooterMain />
      <FooterBottom />
      <div className="absolute inset-0 bg-[url(/images/tile-grid-black.png)] bg-size-[17px] opacity-20 bg-position-[0_1]" />
    </footer>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run from `frontend/`:

```bash
cd frontend && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Manually verify in the browser**

In the Studio (from Task 2's dev server or a fresh `npm run dev` in `studio/`), open the "Footer" document, add at least one Legal Menu item (e.g. label "Privacy Policy", link type URL, href `/privacy`), and publish.

Then run the frontend dev server from `frontend/`:

```bash
cd frontend && npm run dev
```

Open the printed local URL, scroll to the footer, and confirm the "Privacy Policy" link renders next to the copyright text and navigates to `/privacy` when clicked. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/layout/Footer.tsx
git commit -m "Render footer legal menu in FooterBottom"
```
