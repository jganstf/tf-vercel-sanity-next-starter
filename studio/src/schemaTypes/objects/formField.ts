import {defineField, defineType} from 'sanity'
import {StringIcon} from '@sanity/icons'

const FIELD_TYPES = [
  {title: 'Single-line text', value: 'text'},
  {title: 'Email', value: 'email'},
  {title: 'Phone', value: 'phone'},
  {title: 'Paragraph (textarea)', value: 'textarea'},
  {title: 'Website / URL', value: 'url'},
  {title: 'Time', value: 'time'},
  {title: 'Dropdown (select)', value: 'select'},
  {title: 'Multi-select (checkboxes)', value: 'multiSelect'},
  {title: 'Single choice (radio)', value: 'radio'},
  {title: 'Consent checkbox', value: 'consent'},
  {title: 'Rich text (display only)', value: 'html'},
  {title: 'File upload', value: 'file'},
]

const HAS_OPTIONS = ['select', 'multiSelect', 'radio']
const HAS_LENGTH = ['text', 'textarea']

export const formField = defineType({
  name: 'formField',
  title: 'Form Field',
  type: 'object',
  icon: StringIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Field name (machine key)',
      type: 'string',
      description: 'Lowercase identifier used to store the value. Letters, numbers, and underscores only. Must be unique within the form.',
      validation: (Rule) =>
        Rule.required()
          .regex(/^[a-z][a-z0-9_]*$/, {name: 'identifier'})
          .custom((value, context) => {
            const parent = context.document?.fields as {name?: string}[] | undefined
            if (!value || !parent) return true
            const count = parent.filter((f) => f?.name === value).length
            return count > 1 ? 'Field names must be unique within the form' : true
          }),
    }),
    defineField({
      name: 'fieldType',
      title: 'Field type',
      type: 'string',
      initialValue: 'text',
      options: {list: FIELD_TYPES},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'required',
      title: 'Required',
      type: 'boolean',
      initialValue: false,
      hidden: ({parent}) => parent?.fieldType === 'html',
    }),
    defineField({
      name: 'helpText',
      title: 'Help text',
      type: 'string',
      hidden: ({parent}) => parent?.fieldType === 'html',
    }),
    defineField({
      name: 'minLength',
      title: 'Minimum length',
      type: 'number',
      hidden: ({parent}) => !HAS_LENGTH.includes(parent?.fieldType),
    }),
    defineField({
      name: 'maxLength',
      title: 'Maximum length',
      type: 'number',
      hidden: ({parent}) => !HAS_LENGTH.includes(parent?.fieldType),
    }),
    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',
      of: [
        defineField({
          name: 'option',
          type: 'object',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'value', title: 'Value', type: 'string', validation: (R) => R.required()}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
      hidden: ({parent}) => !HAS_OPTIONS.includes(parent?.fieldType),
    }),
    defineField({
      name: 'consentLabel',
      title: 'Consent label',
      type: 'text',
      rows: 2,
      description: 'Text shown next to the consent checkbox.',
      hidden: ({parent}) => parent?.fieldType !== 'consent',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'blockContentTextOnly',
      description: 'Display-only rich text (headings, instructions). Not submitted.',
      hidden: ({parent}) => parent?.fieldType !== 'html',
    }),
    defineField({
      name: 'maxSizeMb',
      title: 'Max file size (MB)',
      type: 'number',
      initialValue: 10,
      hidden: ({parent}) => parent?.fieldType !== 'file',
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: 'allowedTypes',
      title: 'Allowed file types',
      type: 'array',
      of: [{type: 'string'}],
      description: 'MIME types (e.g. application/pdf) or extensions (e.g. .pdf). Empty allows any type.',
      options: {layout: 'tags'},
      hidden: ({parent}) => parent?.fieldType !== 'file',
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'fieldType'},
    prepare({title, subtitle}) {
      return {title: title || 'Untitled field', subtitle: String(subtitle ?? '')}
    },
  },
})
