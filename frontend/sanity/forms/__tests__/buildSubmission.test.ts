import {it, expect} from 'vitest'
import {buildSubmissionDoc} from '../buildSubmission'
import type {FormFieldDef, SpamMeta} from '../types'

const spam: SpamMeta = {
  captchaProvider: 'none',
  honeypotTriggered: false,
  timeToSubmitMs: 4200,
}

const fields: FormFieldDef[] = [
  {_key: '1', label: 'Email', name: 'email', fieldType: 'email'},
  {_key: '2', label: 'Topics', name: 'topics', fieldType: 'multiSelect'},
  {_key: '3', label: 'Agree', name: 'agree', fieldType: 'consent'},
  {_key: '4', label: 'Intro', name: 'intro', fieldType: 'html'},
  {_key: '5', label: 'Resume', name: 'resume', fieldType: 'file'},
]

it('builds a formSubmission document', () => {
  const doc = buildSubmissionDoc({
    formId: 'form-123',
    fields,
    values: {email: 'a@b.co', topics: ['x', 'y'], agree: 'true', intro: 'ignored'},
    submittedAt: '2026-07-21T00:00:00.000Z',
    fileRefs: [{_key: 'file-resume', fieldName: 'resume', asset: {_type: 'reference', _ref: 'file-abc'}}],
    spamMeta: spam,
  })

  expect(doc._type).toBe('formSubmission')
  expect(doc.form).toEqual({_type: 'reference', _ref: 'form-123'})
  expect(doc.submittedAt).toBe('2026-07-21T00:00:00.000Z')
  expect(doc.spamMeta).toEqual(spam)

  // html + file excluded from values; multiSelect joined; consent stringified
  expect(doc.values).toEqual([
    {_key: 'val-email', fieldName: 'email', value: 'a@b.co'},
    {_key: 'val-topics', fieldName: 'topics', value: 'x, y'},
    {_key: 'val-agree', fieldName: 'agree', value: 'true'},
  ])
  expect(doc.files).toEqual([
    {_key: 'file-resume', fieldName: 'resume', asset: {_type: 'reference', _ref: 'file-abc'}},
  ])
})

it('handles missing field values as empty strings', () => {
  const fields: FormFieldDef[] = [
    {_key: '1', label: 'Name', name: 'name', fieldType: 'text'},
    {_key: '2', label: 'Phone', name: 'phone', fieldType: 'phone'},
  ]

  const doc = buildSubmissionDoc({
    formId: 'form-456',
    fields,
    values: {name: 'Alice'}, // phone is missing
    submittedAt: '2026-07-21T12:00:00.000Z',
    fileRefs: [],
    spamMeta: {captchaProvider: 'none', honeypotTriggered: false, timeToSubmitMs: 1000},
  })

  expect(doc.values).toEqual([
    {_key: 'val-name', fieldName: 'name', value: 'Alice'},
    {_key: 'val-phone', fieldName: 'phone', value: ''},
  ])
})
