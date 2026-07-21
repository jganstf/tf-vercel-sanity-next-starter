import {describe, it, expect} from 'vitest'
import {validateField, validateSubmission} from '../validation'
import type {FormFieldDef} from '../types'

const field = (over: Partial<FormFieldDef>): FormFieldDef => ({
  _key: 'k',
  label: 'L',
  name: 'f',
  fieldType: 'text',
  ...over,
})

describe('validateField', () => {
  it('flags a required field left empty', () => {
    expect(validateField(field({required: true}), '')).toMatch(/required/i)
  })

  it('passes a required field with a value', () => {
    expect(validateField(field({required: true}), 'hi')).toBeNull()
  })

  it('passes an empty optional field', () => {
    expect(validateField(field({required: false}), '')).toBeNull()
  })

  it('enforces minLength', () => {
    expect(validateField(field({minLength: 3}), 'ab')).toMatch(/at least 3/i)
  })

  it('enforces maxLength', () => {
    expect(validateField(field({maxLength: 2}), 'abc')).toMatch(/at most 2/i)
  })

  it('rejects a malformed email', () => {
    expect(validateField(field({fieldType: 'email'}), 'nope')).toMatch(/valid email/i)
  })

  it('accepts a well-formed email', () => {
    expect(validateField(field({fieldType: 'email'}), 'a@b.co')).toBeNull()
  })

  it('rejects a malformed url', () => {
    expect(validateField(field({fieldType: 'url'}), 'not a url')).toMatch(/valid url/i)
  })

  it('accepts a well-formed url', () => {
    expect(validateField(field({fieldType: 'url'}), 'https://x.dev')).toBeNull()
  })

  it('requires consent when required', () => {
    expect(validateField(field({fieldType: 'consent', required: true}), 'false')).toMatch(/required/i)
    expect(validateField(field({fieldType: 'consent', required: true}), 'true')).toBeNull()
  })

  it('treats html blocks as always valid', () => {
    expect(validateField(field({fieldType: 'html', required: true}), '')).toBeNull()
  })

  it('validates multiSelect required by array length', () => {
    expect(validateField(field({fieldType: 'multiSelect', required: true}), [])).toMatch(/required/i)
    expect(validateField(field({fieldType: 'multiSelect', required: true}), ['a'])).toBeNull()
  })
})

describe('validateSubmission', () => {
  it('collects errors keyed by field name', () => {
    const fields = [
      field({name: 'email', fieldType: 'email', required: true}),
      field({name: 'msg', fieldType: 'textarea', required: true}),
    ]
    const errors = validateSubmission(fields, {email: 'bad', msg: ''})
    expect(Object.keys(errors).sort()).toEqual(['email', 'msg'])
  })

  it('returns an empty object when everything is valid', () => {
    const fields = [field({name: 'email', fieldType: 'email', required: true})]
    expect(validateSubmission(fields, {email: 'a@b.co'})).toEqual({})
  })
})
