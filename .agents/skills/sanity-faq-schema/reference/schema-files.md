# FAQ Schema Files

Reference implementation from `studio/src/schemaTypes/`. Copy these files as a starting point,
adjusting icons/naming to match the target project's conventions.

## `studio/src/schemaTypes/objects/seo.ts`

```typescript
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

## `studio/src/schemaTypes/documents/faqCategory.ts`

```typescript
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

## `studio/src/schemaTypes/documents/faq.ts`

```typescript
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

Note: `longAnswer` uses a `blockContent` object type — reuse the target project's existing
rich-text object type name if it differs.

## `studio/src/schemaTypes/singletons/faqSettings.tsx`

```tsx
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

## Registration (`studio/src/schemaTypes/index.ts`)

Add each new type to the schema array, grouped with its kind (singleton / document / object):

```typescript
import {faq} from './documents/faq'
import {faqCategory} from './documents/faqCategory'
import {faqSettings} from './singletons/faqSettings'
import {seo} from './objects/seo'

export const schemaTypes = [
  // Singletons
  // ...existing singletons,
  faqSettings,
  // Documents
  // ...existing documents,
  faq,
  faqCategory,
  // Objects
  // ...existing objects,
  seo,
]
```

## Desk structure wiring (`studio/src/structure/index.ts`)

Add `'faqSettings'` to the list of singleton type names excluded from the pluralized document
list, then add a list item pointing at its fixed document ID — same pattern as any other
singleton in the project:

```typescript
const DISABLED_TYPES = [/* ...existing entries, */ 'faqSettings']

// inside the structure's .items([...]) array, alongside other singleton list items:
S.listItem()
  .title('FAQ Settings')
  .child(S.document().schemaType('faqSettings').documentId('faqSettings'))
  .icon(HelpCircleIcon),
```
