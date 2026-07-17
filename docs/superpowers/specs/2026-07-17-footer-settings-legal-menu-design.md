# Footer Settings + Legal Menu — Design

## Goal
Give editors a dedicated Footer settings page in Sanity Studio, with a "legal menu" (e.g. Privacy Policy, Terms) that renders in the frontend `FooterBottom` component.

## Studio schema

New singleton schema type `footer`, file `studio/src/schemaTypes/singletons/footer.ts`:

```ts
export const footer = defineType({
  name: 'footer',
  title: 'Footer',
  type: 'document',
  icon: <icon, e.g. PinBottomIcon or similar>,
  fields: [
    defineField({
      name: 'legalMenu',
      title: 'Legal Menu',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'legalMenuItem',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string', validation: (r) => r.required()}),
            defineField({name: 'link', title: 'Link', type: 'link', validation: (r) => r.required()}),
          ],
          preview: {select: {title: 'label'}},
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Footer'}
    },
  },
})
```

- Reuses the existing shared `link` object type (`studio/src/schemaTypes/objects/link.ts`) rather than duplicating link-type radio logic.
- Pattern of pairing a separate `label` with a `link` field matches the existing `button` field convention seen in `Cta.tsx` (`buttonText` + `link`), rather than adding a `label` field to the shared `link` type (which is also used as a portable-text annotation elsewhere and shouldn't gain an unrelated field).
- Registered in `studio/src/schemaTypes/index.ts` singletons list, alongside `settings`.

## Desk structure

`studio/src/structure/index.ts` — Footer becomes its own top-level singleton, placed above Site Settings, both visually set apart from the main content-type list with dividers:

```ts
S.list()
  .title('Website Content')
  .items([
    ...S.documentTypeListItems()
      .filter((listItem) => !DISABLED_TYPES.includes(listItem.getId()))
      .map((listItem) => listItem.title(pluralize(listItem.getTitle() as string))),
    S.divider(),
    S.listItem()
      .title('Footer')
      .child(S.document().schemaType('footer').documentId('footer'))
      .icon(<footer icon>),
    S.divider(),
    S.listItem()
      .title('Site Settings')
      .child(S.document().schemaType('settings').documentId('siteSettings'))
      .icon(CogIcon),
  ])
```

- `DISABLED_TYPES` gets `'footer'` added, for the same reason `'settings'` is already there: it's a singleton edited via the dedicated desk item, not a collection editors should create multiple documents of via the normal content-type list.

## Frontend query

Add `footerQuery` to `frontend/sanity/lib/queries.ts`, mirroring the existing `settingsQuery` singleton-fetch pattern:

```ts
export const footerQuery = defineQuery(`*[_type == "footer"][0]{
  legalMenu[]{
    label,
    link{
      ...,
      ${linkReference fragment used elsewhere for resolving page/post refs}
    }
  }
}`)
```

Reuse whatever existing GROQ fragment resolves `link.page->slug.current` / `link.post->slug.current` (used elsewhere for the shared `link` type) rather than re-deriving it.

## Frontend component

`frontend/components/layout/Footer.tsx`:

- `FooterBottom` becomes an async server component (matching the pattern already used in `Header.tsx`, which calls `sanityFetch({query: settingsQuery})`).
- It calls `sanityFetch({query: footerQuery})`, then renders the legal menu items using the existing `ResolvedLink` component (same one used in `Cta.tsx`) — one link per `legalMenuItem`, label as the visible text.
- Rendered alongside (not replacing) the existing copyright line.
- `FooterMain` and the outer `Footer` wrapper are unchanged.

## TypeGen

After adding the schema, regenerate `sanity.types.ts` via the studio's typegen command so the new `Footer` type is available to `queries.ts` and the frontend component, matching how `Settings` and `Link` types are currently generated.

## Out of scope
- No support for plain-text (non-link) legal menu items — every item requires a link.
- No changes to `FooterMain`.
- No changes to the shared `link` object type.
