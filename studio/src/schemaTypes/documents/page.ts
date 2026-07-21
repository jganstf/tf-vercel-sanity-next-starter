import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons'
import type {Page} from '../../../sanity.types'

/**
 * Page schema.  Define and edit the fields for the 'page' content type.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'settings', title: 'Settings'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'The URL segment for this page, relative to its parent page (if any).',
      group: 'settings',
      validation: (Rule) => Rule.required(),
      options: {
        source: 'title',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'parent',
      title: 'Parent page',
      description: 'Nest this page under another page to build a nested URL, e.g. /parent/child.',
      type: 'reference',
      group: 'settings',
      to: [{type: 'page'}],
      options: {
        filter: ({document}) => ({
          filter: '_id != $id && _id != $draftId',
          params: {
            id: (document?._id as string)?.replace(/^drafts\./, ''),
            draftId: `drafts.${(document?._id as string)?.replace(/^drafts\./, '')}`,
          },
        }),
      },
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      description: 'Featured image for this page.',
      type: 'image',
      group: 'settings',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
          validation: (rule) => {
            return rule.custom((alt, context) => {
              const document = context.document as Page
              if (document?.coverImage?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        },
      ],
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page builder',
      type: 'array',
      group: 'content',
      of: [{type: 'callToAction'}, {type: 'infoSection'}, {type: 'heroSecondary'}, {type: 'formBlock'}],
      options: {
        insertMenu: {
          // Configure the "Add Item" menu to display a thumbnail preview of the content type. https://www.sanity.io/docs/studio/array-type#efb1fe03459d
          views: [
            {
              name: 'grid',
              previewImageUrl: (schemaTypeName) =>
                `/static/page-builder-thumbnails/${schemaTypeName}.webp`,
            },
          ],
        },
      },
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      parentName: 'parent.title',
    },
    prepare({title, parentName}) {
      return {
        title,
        subtitle: parentName ? `Nested under ${parentName}` : undefined,
      }
    },
  },
})
