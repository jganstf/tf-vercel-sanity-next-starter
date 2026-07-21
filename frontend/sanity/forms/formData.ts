import type {FormFieldDef} from './types'

export const HONEYPOT_FIELD = 'company_website'
export const RESERVED_KEYS = new Set(['_formId', '_renderedAt', '_captchaToken', HONEYPOT_FIELD])

export function extractValues(
  fields: FormFieldDef[],
  formData: FormData,
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (RESERVED_KEYS.has(field.name)) continue
    if (field.fieldType === 'html' || field.fieldType === 'file') continue

    if (field.fieldType === 'multiSelect') {
      values[field.name] = formData.getAll(field.name).map((v) => String(v))
      continue
    }
    if (field.fieldType === 'consent') {
      const raw = formData.get(field.name)
      // Checkboxes submit "on" (or a custom value) when checked, nothing when not.
      values[field.name] = raw == null || raw === '' ? 'false' : 'true'
      continue
    }
    const raw = formData.get(field.name)
    values[field.name] = raw == null ? '' : String(raw)
  }
  return values
}

export function extractFiles(
  fields: FormFieldDef[],
  formData: FormData,
): {fieldName: string; file: File}[] {
  const out: {fieldName: string; file: File}[] = []
  for (const field of fields) {
    if (field.fieldType !== 'file') continue
    const entry = formData.get(field.name)
    if (entry instanceof File && entry.size > 0 && entry.name) {
      out.push({fieldName: field.name, file: entry})
    }
  }
  return out
}

export function validateFile(field: FormFieldDef, file: File): string | null {
  if (typeof field.maxSizeMb === 'number') {
    const maxBytes = field.maxSizeMb * 1024 * 1024
    if (file.size > maxBytes) {
      return `${field.label}: file is too large (max ${field.maxSizeMb} MB).`
    }
  }
  const allowed = field.allowedTypes ?? []
  if (allowed.length > 0) {
    const name = file.name.toLowerCase()
    const matches = allowed.some((t) => {
      const type = t.toLowerCase()
      return type.startsWith('.') ? name.endsWith(type) : file.type === type
    })
    if (!matches) {
      return `${field.label}: file type is not an allowed format.`
    }
  }
  return null
}
