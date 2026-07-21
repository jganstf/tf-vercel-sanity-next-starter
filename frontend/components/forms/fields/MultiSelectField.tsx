import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function MultiSelectField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <div className="flex flex-col gap-1">
        {(field.options ?? []).map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={field.name} value={opt.value} />
            {opt.label}
          </label>
        ))}
      </div>
    </FieldShell>
  )
}
