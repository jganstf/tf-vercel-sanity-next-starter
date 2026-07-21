import {defineField, defineType} from 'sanity'
import {ThListIcon} from '@sanity/icons'

/**
 * Archive schema object. A generic, catch-all listing block for the page builder —
 * renders a paginated collection of documents of the selected type.
 * Learn more: https://www.sanity.io/docs/studio/object-type
 */

export const archive = defineType({
  name: 'archive',
  title: 'Archive',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'string',
    }),
    defineField({
      name: 'documentType',
      title: 'Content type to list',
      type: 'string',
      options: {
        list: [{title: 'Posts', value: 'post'}],
        layout: 'radio',
      },
      initialValue: 'post',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'limit',
      title: 'Number of items',
      description: 'Leave empty to show every matching document',
      type: 'number',
      validation: (Rule) => Rule.integer().positive(),
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      documentType: 'documentType',
    },
    prepare({title, documentType}) {
      return {
        title: title || 'Untitled Archive',
        subtitle: documentType ? `Archive of ${documentType}s` : 'Archive',
      }
    },
  },
})
