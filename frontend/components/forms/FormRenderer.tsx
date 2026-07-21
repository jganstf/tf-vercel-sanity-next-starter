'use client'

import {useActionState, useState} from 'react'
import {submitForm} from '@/app/actions/submitForm'
import type {FormState, FormDef} from '@/sanity/forms/types'
import {validateSubmission} from '@/sanity/forms/validation'
import {HONEYPOT_FIELD} from '@/sanity/forms/formData'
import FieldRenderer from './fields/FieldRenderer'
import {useCaptchaToken} from './useCaptchaToken'

const initialState: FormState = {status: 'idle'}

export default function FormRenderer({form}: {form: FormDef}) {
  const [state, formAction, pending] = useActionState(submitForm, initialState)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [renderedAt] = useState<number>(() => Date.now())
  const {token} = useCaptchaToken()

  const errors = {...clientErrors, ...(state.errors ?? {})}

  if (state.status === 'success') {
    return (
      <div className="container py-12" role="status">
        <p>{state.message}</p>
      </div>
    )
  }

  // Client-side pre-validation for immediate UX; the server re-validates authoritatively.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget)
    const values: Record<string, unknown> = {}
    for (const field of form.fields) {
      if (field.fieldType === 'multiSelect') values[field.name] = fd.getAll(field.name)
      else if (field.fieldType === 'consent') values[field.name] = fd.get(field.name) ? 'true' : 'false'
      else values[field.name] = fd.get(field.name) ?? ''
    }
    const found = validateSubmission(form.fields, values)
    setClientErrors(found)
    if (Object.keys(found).length > 0) e.preventDefault()
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="container flex flex-col gap-4 py-12" noValidate>
      <input type="hidden" name="_formId" value={form._id} />
      <input type="hidden" name="_renderedAt" value={renderedAt} />
      <input type="hidden" name="_captchaToken" value={token} />

      {/* Honeypot: visually hidden but present in the DOM (not display:none). */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {form.fields.map((field) => (
        <FieldRenderer key={field._key} field={field} error={errors[field.name]} />
      ))}

      {state.status === 'error' && state.message ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-black px-6 py-3 font-mono text-sm text-white transition-colors duration-200 hover:bg-blue disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  )
}
