import {UsersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import type {Staff} from '../../../sanity.types'

/**
 * Staff schema.  Define and edit the fields for the 'staff' content type.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const staff = defineType({
  name: 'staff',
  title: 'Staff',
  icon: UsersIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'A slug is required for the staff member to show up on the staff archive page',
      options: {
        source: (doc) => `${(doc as Staff).firstName || ''} ${(doc as Staff).lastName || ''}`,
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'picture',
      title: 'Picture',
      type: 'image',
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
          validation: (rule) => {
            // Custom validation to ensure alt text is provided if the image is present. https://www.sanity.io/docs/validation
            return rule.custom((alt, context) => {
              const document = context.document as Staff
              if (document?.picture?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        }),
      ],
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{type: 'department'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'jobTitle',
      title: 'Job Title',
      type: 'string',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 4,
    }),
  ],
  // List preview configuration. https://www.sanity.io/docs/previews-list-views
  preview: {
    select: {
      firstName: 'firstName',
      lastName: 'lastName',
      picture: 'picture',
      departmentTitle: 'department.title',
    },
    prepare(selection) {
      return {
        title: `${selection.firstName} ${selection.lastName}`,
        subtitle: selection.departmentTitle || 'Staff',
        media: selection.picture,
      }
    },
  },
})
