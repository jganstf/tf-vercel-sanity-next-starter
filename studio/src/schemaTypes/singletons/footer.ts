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
