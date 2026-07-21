import {DocumentIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Header schema Singleton. Holds the site-wide header menu.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const header = defineType({
  name: 'header',
  title: 'Header',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'headerMenu',
      title: 'Header Menu',
      description: 'Links shown in the site header navigation.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'headerMenuItem',
          title: 'Header Menu Item',
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
        title: 'Header',
      }
    },
  },
})
