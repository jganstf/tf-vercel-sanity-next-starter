import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Department schema.  Used to categorize staff members.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const department = defineType({
  name: 'department',
  title: 'Department',
  icon: TagIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
    prepare({title}) {
      return {title}
    },
  },
})
