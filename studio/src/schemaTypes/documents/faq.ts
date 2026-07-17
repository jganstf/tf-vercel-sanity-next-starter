import {HelpCircleIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * FAQ schema. Each FAQ belongs to exactly one category; the category's
 * (possibly nested) slug chain plus this document's slug form the frontend URL.
 */

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  icon: HelpCircleIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'question',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'faqCategory'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shortAnswer',
      title: 'Short Answer',
      description: 'Concise answer, used in FAQ lists and rich snippets.',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'longAnswer',
      title: 'Long Answer',
      type: 'blockContent',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'question',
      categoryTitle: 'category.title',
    },
    prepare({title, categoryTitle}) {
      return {
        title,
        subtitle: categoryTitle,
      }
    },
  },
})
