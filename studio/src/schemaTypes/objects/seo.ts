import {defineField, defineType} from 'sanity'
import {SearchIcon} from '@sanity/icons'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  icon: SearchIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Meta title',
      description: 'Overrides the page name for search engines and browser tabs, if provided.',
      type: 'string',
      validation: (Rule) => Rule.max(60).warning('Longer titles may be truncated in search results.'),
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      validation: (Rule) =>
        Rule.max(160).warning('Longer descriptions may be truncated in search results.'),
    }),
    defineField({
      name: 'image',
      title: 'Social share image',
      description: 'Used for Open Graph / social cards (1200x630 recommended).',
      type: 'image',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          description: 'Important for accessibility and SEO.',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
