import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Category schema. Used to tag posts for filtering on the blog archive.
 * Learn more: https://www.sanity.io/docs/schema-types
 */

export const postCategory = defineType({
  name: 'postCategory',
  title: 'Category',
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
      description: 'A slug is required for the category to be used as a filter',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
