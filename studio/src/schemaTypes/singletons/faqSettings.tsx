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
