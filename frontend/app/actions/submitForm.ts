'use server'

import {redirect} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/live'
import {getWriteClient} from '@/sanity/lib/writeClient'
import {formByIdQuery} from '@/sanity/lib/queries'
import {mapFormDef} from '@/sanity/forms/mapFormDef'
import {validateSubmission} from '@/sanity/forms/validation'
import {isHoneypotTriggered, isTooFast, timeToSubmitMs} from '@/sanity/forms/spam'
import {getCaptchaProvider} from '@/sanity/forms/captcha/index'
import {extractValues, extractFiles, validateFile, HONEYPOT_FIELD} from '@/sanity/forms/formData'
import {buildSubmissionDoc, type SubmissionFileRef} from '@/sanity/forms/buildSubmission'
import type {FormState, SpamMeta} from '@/sanity/forms/types'

const GENERIC_SPAM_ERROR = 'We could not process your submission. Please try again.'

export async function submitForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const formId = String(formData.get('_formId') ?? '')
  if (!formId) return {status: 'error', message: GENERIC_SPAM_ERROR}

  // Server-authoritative field definitions (never trust client-sent shape).
  const {data} = await sanityFetch({query: formByIdQuery, params: {id: formId}})
  const form = mapFormDef(data)
  if (!form) return {status: 'error', message: GENERIC_SPAM_ERROR}

  const now = Date.now()
  const renderedAt = Number(formData.get('_renderedAt'))
  const honeypotTriggered = isHoneypotTriggered(formData.get(HONEYPOT_FIELD))

  // Spam layer 1 + 2: honeypot and timing. Generic rejection — don't tip off bots.
  if (honeypotTriggered || isTooFast(renderedAt, now)) {
    return {status: 'error', message: GENERIC_SPAM_ERROR}
  }

  // Spam layer 3: CAPTCHA (only if enabled for this form and configured site-wide).
  const provider = getCaptchaProvider()
  let captchaScore: number | undefined
  if (form.captchaEnabled && provider) {
    const token = String(formData.get('_captchaToken') ?? '')
    const result = await provider.verify(token)
    captchaScore = result.score
    if (!result.success) {
      return {status: 'error', message: GENERIC_SPAM_ERROR}
    }
  }

  // Field validation (server-side, authoritative).
  const values = extractValues(form.fields, formData)
  const errors = validateSubmission(form.fields, values)
  if (Object.keys(errors).length > 0) {
    return {status: 'error', errors, message: 'Please correct the highlighted fields.'}
  }

  // Files: validate then upload.
  const files = extractFiles(form.fields, formData)
  const fileRefs: SubmissionFileRef[] = []
  const writeClient = getWriteClient()
  for (const {fieldName, file} of files) {
    const field = form.fields.find((f) => f.name === fieldName)!
    const fileError = validateFile(field, file)
    if (fileError) {
      return {status: 'error', errors: {[fieldName]: fileError}, message: 'Please correct the highlighted fields.'}
    }
    const asset = await writeClient.assets.upload('file', file, {filename: file.name})
    fileRefs.push({_key: `file-${fieldName}`, fieldName, asset: {_type: 'reference', _ref: asset._id}})
  }

  const spamMeta: SpamMeta = {
    captchaProvider: provider?.name ?? 'none',
    captchaScore,
    honeypotTriggered,
    timeToSubmitMs: timeToSubmitMs(renderedAt, now),
  }

  const doc = buildSubmissionDoc({
    formId: form._id,
    fields: form.fields,
    values,
    submittedAt: new Date(now).toISOString(),
    fileRefs,
    spamMeta,
  })

  await writeClient.create(doc)

  if (form.successBehavior?.type === 'redirect' && form.successBehavior.redirectUrl) {
    redirect(form.successBehavior.redirectUrl)
  }

  return {
    status: 'success',
    message: form.successBehavior?.type === 'message' ? form.successBehavior.message : 'Thanks — your submission has been received.',
  }
}
