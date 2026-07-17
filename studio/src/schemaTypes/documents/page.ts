import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons'

/**
 * Page schema.  Define and edit the fields for the 'page' content type.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'The URL segment for this page, relative to its parent page (if any).',
      validation: (Rule) => Rule.required(),
      options: {
        source: 'name',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'parent',
      title: 'Parent page',
      description: 'Nest this page under another page to build a nested URL, e.g. /parent/child.',
      type: 'reference',
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
      name: 'pageBuilder',
      title: 'Page builder',
      type: 'array',
      of: [{type: 'callToAction'}, {type: 'infoSection'}, {type: 'heroSecondary'}],
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
  ],
  preview: {
    select: {
      title: 'name',
      parentName: 'parent.name',
    },
    prepare({title, parentName}) {
      return {
        title,
        subtitle: parentName ? `Nested under ${parentName}` : undefined,
      }
    },
  },
})
