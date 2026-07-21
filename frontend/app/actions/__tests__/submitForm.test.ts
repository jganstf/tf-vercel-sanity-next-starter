import {describe, it, expect, vi, beforeEach} from 'vitest'
import type {FormDef} from '@/sanity/forms/types'

const formDef: FormDef = {
  _id: 'form-1',
  title: 'Contact',
  fields: [
    {_key: '1', label: 'Email', name: 'email', fieldType: 'email', required: true},
    {_key: '2', label: 'Message', name: 'message', fieldType: 'textarea', required: true},
  ],
  captchaEnabled: false,
  successBehavior: {type: 'message', message: 'Thanks!'},
}

const formDefWithCaptcha: FormDef = {
  ...formDef,
  captchaEnabled: true,
}

const formDefWithFile: FormDef = {
  _id: 'form-2',
  title: 'Upload',
  fields: [
    {_key: '1', label: 'Email', name: 'email', fieldType: 'email', required: true},
    {
      _key: '2',
      label: 'Attachment',
      name: 'attachment',
      fieldType: 'file',
      required: true,
      maxSizeMb: 1,
    },
  ],
  captchaEnabled: false,
  successBehavior: {type: 'message', message: 'Thanks!'},
}

const fetchMock = vi.fn()
const createMock = vi.fn()
const uploadMock = vi.fn()
const captchaProviderMock = vi.fn(() => null as null | {name: string; verify: (t: string) => Promise<{success: boolean; score?: number}>})

vi.mock('@/sanity/lib/live', () => ({sanityFetch: (...a: unknown[]) => fetchMock(...a)}))
vi.mock('@/sanity/lib/writeClient', () => ({
  getWriteClient: () => ({create: createMock, assets: {upload: uploadMock}}),
}))
vi.mock('@/sanity/forms/captcha/index', () => ({getCaptchaProvider: () => captchaProviderMock()}))

async function loadAction() {
  const mod = await import('../submitForm')
  return mod.submitForm
}

function baseForm(over: Record<string, string> = {}): FormData {
  const f = new FormData()
  f.set('_formId', 'form-1')
  f.set('_renderedAt', String(1000))
  f.set('email', 'a@b.co')
  f.set('message', 'hello there')
  f.set('company_website', '')
  for (const [k, v] of Object.entries(over)) f.set(k, v)
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockResolvedValue({data: formDef})
  createMock.mockResolvedValue({_id: 'sub-1'})
  uploadMock.mockResolvedValue({_id: 'asset-1'})
  captchaProviderMock.mockReturnValue(null)
  vi.spyOn(Date, 'now').mockReturnValue(1000 + 5000) // 5s elapsed => not too fast
})

describe('submitForm', () => {
  it('writes a submission and returns success', async () => {
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm())
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(state.status).toBe('success')
    expect(state.message).toBe('Thanks!')
  })

  it('returns field errors and does not write when validation fails', async () => {
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm({email: 'bad'}))
    expect(state.status).toBe('error')
    expect(state.errors?.email).toBeTruthy()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('rejects when the honeypot is filled', async () => {
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm({company_website: 'bot'}))
    expect(state.status).toBe('error')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('rejects a too-fast submission', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000 + 200) // 200ms elapsed
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm())
    expect(state.status).toBe('error')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('rejects a submission with _renderedAt omitted entirely', async () => {
    const submitForm = await loadAction()
    const form = new FormData()
    form.set('_formId', 'form-1')
    // Intentionally never set `_renderedAt` to simulate a hand-crafted bot POST.
    form.set('email', 'a@b.co')
    form.set('message', 'hello there')
    form.set('company_website', '')
    const state = await submitForm({status: 'idle'}, form)
    expect(state.status).toBe('error')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('errors when the form cannot be found', async () => {
    fetchMock.mockResolvedValue({data: null})
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm())
    expect(state.status).toBe('error')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('rejects with the generic message when CAPTCHA verification fails', async () => {
    fetchMock.mockResolvedValue({data: formDefWithCaptcha})
    captchaProviderMock.mockReturnValue({
      name: 'recaptcha',
      verify: vi.fn().mockResolvedValue({success: false, score: 0.1}),
    })
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm({_captchaToken: 'tok'}))
    expect(state.status).toBe('error')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('succeeds when CAPTCHA verification passes', async () => {
    fetchMock.mockResolvedValue({data: formDefWithCaptcha})
    captchaProviderMock.mockReturnValue({
      name: 'recaptcha',
      verify: vi.fn().mockResolvedValue({success: true, score: 0.9}),
    })
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm({_captchaToken: 'tok'}))
    expect(state.status).toBe('success')
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('rejects with the generic message when CAPTCHA verification throws', async () => {
    fetchMock.mockResolvedValue({data: formDefWithCaptcha})
    captchaProviderMock.mockReturnValue({
      name: 'recaptcha',
      verify: vi.fn().mockRejectedValue(new Error('network timeout')),
    })
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm({_captchaToken: 'tok'}))
    expect(state.status).toBe('error')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('rejects with the generic message when writeClient.create throws', async () => {
    createMock.mockRejectedValueOnce(new Error('missing SANITY_API_WRITE_TOKEN'))
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm())
    expect(state.status).toBe('error')
    expect(state.message).toBe(
      'We could not process your submission. Please try again.',
    )
  })

  it('returns a field error and does not upload/write when file validation fails', async () => {
    fetchMock.mockResolvedValue({data: formDefWithFile})
    const oversizedFile = new File([new Uint8Array(2 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    })
    const form = new FormData()
    form.set('_formId', 'form-2')
    form.set('_renderedAt', String(1000))
    form.set('email', 'a@b.co')
    form.set('company_website', '')
    form.set('attachment', oversizedFile)

    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, form)
    expect(state.status).toBe('error')
    expect(state.errors?.attachment).toBeTruthy()
    expect(uploadMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })
})
