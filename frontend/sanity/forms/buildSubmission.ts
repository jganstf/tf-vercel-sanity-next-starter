import type {FormFieldDef, SpamMeta} from './types'

export type SubmissionValue = {_key: string; fieldName: string; value: string}

export type SubmissionFileRef = {
  _key: string
  fieldName: string
  asset: {_type: 'reference'; _ref: string}
}

export type SubmissionDoc = {
  _type: 'formSubmission'
  form: {_type: 'reference'; _ref: string}
  submittedAt: string
  values: SubmissionValue[]
  files: SubmissionFileRef[]
  spamMeta: SpamMeta
}

function serialize(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function buildSubmissionDoc(input: {
  formId: string
  fields: FormFieldDef[]
  values: Record<string, unknown>
  submittedAt: string
  fileRefs: SubmissionFileRef[]
  spamMeta: SpamMeta
}): SubmissionDoc {
  const values: SubmissionValue[] = input.fields
    .filter((f) => f.fieldType !== 'html' && f.fieldType !== 'file')
    .map((f) => ({
      _key: `val-${f.name}`,
      fieldName: f.name,
      value: serialize(input.values[f.name]),
    }))

  return {
    _type: 'formSubmission',
    form: {_type: 'reference', _ref: input.formId},
    submittedAt: input.submittedAt,
    values,
    files: input.fileRefs,
    spamMeta: input.spamMeta,
  }
}
