import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function FileField({field, error}: FieldProps) {
  const accept = (field.allowedTypes ?? []).join(',')
  return (
    <FieldShell field={field} error={error}>
      <input
        id={field.name}
        name={field.name}
        type="file"
        required={field.required}
        accept={accept || undefined}
        aria-invalid={error ? true : undefined}
        className="text-sm"
      />
    </FieldShell>
  )
}
