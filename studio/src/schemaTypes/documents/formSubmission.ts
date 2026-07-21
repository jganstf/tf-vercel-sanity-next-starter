import {defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons'

// Written only by the website's submit Server Action. Editors browse/inspect but
// never author these — every field is read-only and creation is disabled in
// sanity.config.ts (document.newDocumentOptions / document.actions).
export const formSubmission = defineType({
  name: 'formSubmission',
  title: 'Form Submission',
  type: 'document',
  icon: DocumentTextIcon,
  readOnly: true,
  fields: [
    defineField({name: 'form', title: 'Form', type: 'reference', to: [{type: 'form'}]}),
    defineField({name: 'submittedAt', title: 'Submitted at', type: 'datetime'}),
    defineField({
      name: 'values',
      title: 'Values',
      type: 'array',
      of: [
        defineField({
          name: 'value',
          type: 'object',
          fields: [
            defineField({name: 'fieldName', title: 'Field', type: 'string'}),
            defineField({name: 'value', title: 'Value', type: 'text'}),
          ],
          preview: {select: {title: 'fieldName', subtitle: 'value'}},
        }),
      ],
    }),
    defineField({
      name: 'files',
      title: 'Files',
      type: 'array',
      of: [
        defineField({
          name: 'fileEntry',
          type: 'object',
          fields: [
            defineField({name: 'fieldName', title: 'Field', type: 'string'}),
            defineField({name: 'asset', title: 'File', type: 'file'}),
          ],
          preview: {select: {title: 'fieldName'}},
        }),
      ],
    }),
    defineField({
      name: 'spamMeta',
      title: 'Spam metadata',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'captchaProvider', title: 'CAPTCHA provider', type: 'string'}),
        defineField({name: 'captchaScore', title: 'CAPTCHA score', type: 'number'}),
        defineField({name: 'honeypotTriggered', title: 'Honeypot triggered', type: 'boolean'}),
        defineField({name: 'timeToSubmitMs', title: 'Time to submit (ms)', type: 'number'}),
      ],
    }),
  ],
  orderings: [
    {title: 'Newest first', name: 'submittedAtDesc', by: [{field: 'submittedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {formTitle: 'form.title', submittedAt: 'submittedAt'},
    prepare({formTitle, submittedAt}) {
      return {title: formTitle || 'Submission', subtitle: submittedAt ? new Date(submittedAt).toLocaleString() : ''}
    },
  },
})
