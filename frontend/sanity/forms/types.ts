// Domain types for the form builder. Kept independent of generated Sanity types
// so the pure logic modules can be unit-tested in isolation. The GROQ layer maps
// generated query-result types onto these at the IO boundary.

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'url'
  | 'time'
  | 'select'
  | 'multiSelect'
  | 'radio'
  | 'consent'
  | 'html'
  | 'file'

export type FieldOption = {label: string; value: string}

export type FormFieldDef = {
  _key: string
  label: string
  name: string
  fieldType: FieldType
  required?: boolean
  helpText?: string
  minLength?: number
  maxLength?: number
  options?: FieldOption[]
  consentLabel?: string
  maxSizeMb?: number
  allowedTypes?: string[]
  // portable-text content for `html` display blocks; opaque to the logic layer
  content?: unknown
}

export type SuccessBehavior =
  | {type: 'message'; message: string}
  | {type: 'redirect'; redirectUrl: string}

export type FormDef = {
  _id: string
  title: string
  fields: FormFieldDef[]
  captchaEnabled?: boolean
  successBehavior?: SuccessBehavior
}

export type SpamMeta = {
  captchaProvider: string
  captchaScore?: number
  honeypotTriggered: boolean
  timeToSubmitMs: number
}

// Returned by the submit Server Action and consumed by useActionState.
export type FormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  // field-level validation errors, keyed by FormFieldDef.name
  errors?: Record<string, string>
}

// Common prop shape for the per-type field input components.
export type FieldProps = {
  field: FormFieldDef
  error?: string
}
