import {defineField, defineType} from 'sanity'
import {ComposeIcon} from '@sanity/icons'

export const form = defineType({
  name: 'form',
  title: 'Form',
  type: 'document',
  icon: ComposeIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Internal name for this form (not shown to visitors).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',
      of: [{type: 'formField'}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'captchaEnabled',
      title: 'Enable CAPTCHA',
      type: 'boolean',
      initialValue: true,
      description: 'Uses the site-wide CAPTCHA provider, if one is configured.',
    }),
    defineField({
      name: 'successBehavior',
      title: 'On successful submission',
      type: 'object',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({
          name: 'type',
          title: 'Behavior',
          type: 'string',
          initialValue: 'message',
          options: {
            list: [
              {title: 'Show a message', value: 'message'},
              {title: 'Redirect to a URL', value: 'redirect'},
            ],
            layout: 'radio',
          },
        }),
        defineField({
          name: 'message',
          title: 'Success message',
          type: 'text',
          rows: 3,
          initialValue: 'Thanks — your submission has been received.',
          hidden: ({parent}) => parent?.type !== 'message',
        }),
        defineField({
          name: 'redirectUrl',
          title: 'Redirect URL',
          type: 'url',
          hidden: ({parent}) => parent?.type !== 'redirect',
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'title', fields: 'fields'},
    prepare({title, fields}) {
      const count = Array.isArray(fields) ? fields.length : 0
      return {title: title || 'Untitled form', subtitle: `${count} field${count === 1 ? '' : 's'}`}
    },
  },
})
