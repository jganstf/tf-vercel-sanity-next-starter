import type {FormFieldDef} from './types'

// Pragmatic patterns — server-side is authoritative but these needn't be RFC-perfect.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+()\-\s\d]{6,}$/

function asString(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (value instanceof Object && 'name' in value) return '' // File — not text
  return String(value)
}

function isEmpty(field: FormFieldDef, value: unknown): boolean {
  if (field.fieldType === 'multiSelect') return !Array.isArray(value) || value.length === 0
  if (field.fieldType === 'consent') return asString(value) !== 'true'
  return asString(value).trim() === ''
}

export function validateField(field: FormFieldDef, value: unknown): string | null {
  // Display-only blocks never carry a value.
  if (field.fieldType === 'html') return null

  const empty = isEmpty(field, value)

  if (field.required && empty) {
    return `${field.label} is required.`
  }
  // Optional + empty: nothing more to check.
  if (empty) return null

  const str = asString(value)

  if (typeof field.minLength === 'number' && str.length < field.minLength) {
    return `${field.label} must be at least ${field.minLength} characters.`
  }
  if (typeof field.maxLength === 'number' && str.length > field.maxLength) {
    return `${field.label} must be at most ${field.maxLength} characters.`
  }

  if (field.fieldType === 'email' && !EMAIL_RE.test(str)) {
    return `${field.label} must be a valid email address.`
  }
  if (field.fieldType === 'url') {
    try {
      new URL(str)
    } catch {
      return `${field.label} must be a valid URL.`
    }
  }
  if (field.fieldType === 'phone' && !PHONE_RE.test(str)) {
    return `${field.label} must be a valid phone number.`
  }

  return null
}

export function validateSubmission(
  fields: FormFieldDef[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const message = validateField(field, values[field.name])
    if (message) errors[field.name] = message
  }
  return errors
}
