import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function SelectField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <select
        id={field.name}
        name={field.name}
        required={field.required}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
      >
        <option value="" disabled>
          Select…
        </option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
