import {CogIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import type {StaffSettings} from '../../../sanity.types'

/**
 * Staff Settings schema Singleton. Controls the staff archive page's title, intro copy, and social image.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const staffSettings = defineType({
  name: 'staffSettings',
  title: 'Staff Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'title',
      description: 'This field is the title of your staff archive page.',
      title: 'Title',
      type: 'string',
      initialValue: 'Our Staff',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      description: 'Used on the staff archive page',
      title: 'Intro',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          options: {},
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
          description: 'Important for accessibility and SEO.',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => {
            return rule.custom((alt, context) => {
              const document = context.document as StaffSettings
              if (document?.ogImage?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Staff Settings',
      }
    },
  },
})
