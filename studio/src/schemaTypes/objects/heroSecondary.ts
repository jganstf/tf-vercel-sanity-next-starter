import {defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons'

export const heroSecondary = defineType({
  name: 'heroSecondary',
  title: 'Hero Secondary',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'If left empty, the page title will be used instead.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'heading',
    },
    prepare({title}) {
      return {
        title: title || 'Hero Secondary',
        subtitle: title ? 'Hero Secondary' : 'Falls back to page title',
      }
    },
  },
})
