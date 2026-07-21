import {defineField, defineType} from 'sanity'
import {ComposeIcon} from '@sanity/icons'

export const formBlock = defineType({
  name: 'formBlock',
  title: 'Form',
  type: 'object',
  icon: ComposeIcon,
  fields: [
    defineField({
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'form'}],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'form.title'},
    prepare({title}) {
      return {title: title || 'Form', subtitle: 'Form'}
    },
  },
})
