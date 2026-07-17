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
        title: title || 'Untitled Hero Secondary',
        subtitle: 'Hero Secondary',
      }
    },
  },
})
