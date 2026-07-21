import type {FieldProps} from '@/sanity/forms/types'

export default function ConsentField({field, error}: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name={field.name}
          value="true"
          required={field.required}
          aria-invalid={error ? true : undefined}
          className="mt-1"
        />
        <span>{field.consentLabel || field.label}</span>
      </label>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
