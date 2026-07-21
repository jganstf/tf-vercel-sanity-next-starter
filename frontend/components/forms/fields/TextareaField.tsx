import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function TextareaField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <textarea
        id={field.name}
        name={field.name}
        rows={4}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        aria-invalid={error ? true : undefined}
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
      />
    </FieldShell>
  )
}
