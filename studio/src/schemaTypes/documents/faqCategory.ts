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
