import type {FieldProps} from '@/sanity/forms/types'

const INPUT_TYPE: Record<string, string> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  url: 'url',
  time: 'time',
}

export function FieldShell({
  field,
  error,
  children,
}: FieldProps & {children: React.ReactNode}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={field.name} className="text-sm font-medium">
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {field.helpText ? <p className="text-xs opacity-70">{field.helpText}</p> : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default function TextInputField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <input
        id={field.name}
        name={field.name}
        type={INPUT_TYPE[field.fieldType] ?? 'text'}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        aria-invalid={error ? true : undefined}
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
      />
    </FieldShell>
  )
}
