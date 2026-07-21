import type {FormDef, FormFieldDef, FieldType} from './types'

// Narrow a raw GROQ form result (loose generated types / unknown) into the
// domain FormDef used by the logic layer. Returns null if there's no form.
export function mapFormDef(raw: unknown): FormDef | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r._id !== 'string') return null

  const fields: FormFieldDef[] = Array.isArray(r.fields)
    ? (r.fields as Record<string, unknown>[]).map((f) => ({
        _key: String(f._key ?? ''),
        label: String(f.label ?? ''),
        name: String(f.name ?? ''),
        fieldType: (f.fieldType as FieldType) ?? 'text',
        required: Boolean(f.required),
        helpText: f.helpText as string | undefined,
        minLength: typeof f.minLength === 'number' ? f.minLength : undefined,
        maxLength: typeof f.maxLength === 'number' ? f.maxLength : undefined,
        options: Array.isArray(f.options) ? (f.options as FormFieldDef['options']) : undefined,
        consentLabel: f.consentLabel as string | undefined,
        maxSizeMb: typeof f.maxSizeMb === 'number' ? f.maxSizeMb : undefined,
        allowedTypes: Array.isArray(f.allowedTypes) ? (f.allowedTypes as string[]) : undefined,
        content: f.content,
      }))
    : []

  return {
    _id: r._id,
    title: String(r.title ?? ''),
    fields,
    captchaEnabled: r.captchaEnabled !== false,
    successBehavior: r.successBehavior as FormDef['successBehavior'],
  }
}
