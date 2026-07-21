import {describe, it, expect} from 'vitest'
import {extractValues, extractFiles, validateFile} from '../formData'
import type {FormFieldDef} from '../types'

const fields: FormFieldDef[] = [
  {_key: '1', label: 'Email', name: 'email', fieldType: 'email'},
  {_key: '2', label: 'Topics', name: 'topics', fieldType: 'multiSelect'},
  {_key: '3', label: 'Agree', name: 'agree', fieldType: 'consent'},
  {_key: '4', label: 'Resume', name: 'resume', fieldType: 'file', maxSizeMb: 1, allowedTypes: ['application/pdf', '.pdf']},
]

function fd(entries: [string, string][]): FormData {
  const f = new FormData()
  for (const [k, v] of entries) f.append(k, v)
  return f
}

describe('extractValues', () => {
  it('pulls scalars, arrays, and consent; ignores reserved + file keys', () => {
    const f = fd([
      ['email', 'a@b.co'],
      ['topics', 'x'],
      ['topics', 'y'],
      ['agree', 'on'],
      ['_formId', 'form-1'],
      ['company_website', ''],
    ])
    const values = extractValues(fields, f)
    expect(values).toEqual({email: 'a@b.co', topics: ['x', 'y'], agree: 'true'})
  })

  it('records unchecked consent as false', () => {
    expect(extractValues(fields, fd([['email', 'a@b.co']])).agree).toBe('false')
  })
})

describe('validateFile', () => {
  const field = fields[3]
  it('rejects an oversize file', () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'r.pdf', {type: 'application/pdf'})
    expect(validateFile(field, big)).toMatch(/too large/i)
  })
  it('rejects a disallowed type', () => {
    const wrong = new File([new Uint8Array(10)], 'r.png', {type: 'image/png'})
    expect(validateFile(field, wrong)).toMatch(/not an allowed/i)
  })
  it('accepts an allowed, in-size file', () => {
    const ok = new File([new Uint8Array(10)], 'r.pdf', {type: 'application/pdf'})
    expect(validateFile(field, ok)).toBeNull()
  })
})

describe('extractFiles', () => {
  it('returns only non-empty file entries', () => {
    const f = new FormData()
    f.append('resume', new File([new Uint8Array(10)], 'r.pdf', {type: 'application/pdf'}))
    const files = extractFiles(fields, f)
    expect(files).toHaveLength(1)
    expect(files[0].fieldName).toBe('resume')
  })
  it('skips empty file inputs', () => {
    const f = new FormData()
    f.append('resume', new File([], '', {type: 'application/octet-stream'}))
    expect(extractFiles(fields, f)).toHaveLength(0)
  })
})
