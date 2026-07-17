import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Post Settings schema Singleton. Controls pagination behavior for the public blog archive.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const postSettings = defineType({
  name: 'postSettings',
  title: 'Post Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'postsPerPage',
      title: 'Posts per page',
      description: 'Number of posts to show per page on the blog archive.',
      type: 'number',
      initialValue: 6,
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'loadMoreMode',
      title: 'Load more behavior',
      description: 'How additional posts are loaded on the blog archive.',
      type: 'string',
      initialValue: 'button',
      options: {
        list: [
          {title: 'Load More Button', value: 'button'},
          {title: 'Infinite Scroll', value: 'infiniteScroll'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Post Settings',
      }
    },
  },
})
