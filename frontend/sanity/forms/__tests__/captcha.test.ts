import {describe, it, expect, vi, afterEach} from 'vitest'
import {createRecaptchaProvider} from '../captcha/recaptcha'
import {createTurnstileProvider} from '../captcha/turnstile'
import {getCaptchaProvider} from '../captcha/index'

function mockFetchOnce(json: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(json), {status: 200}),
  )
}

afterEach(() => vi.restoreAllMocks())

describe('recaptcha provider', () => {
  it('succeeds when google succeeds and score clears the threshold', async () => {
    mockFetchOnce({success: true, score: 0.9})
    const res = await createRecaptchaProvider('secret', 0.5).verify('tok')
    expect(res).toEqual({success: true, score: 0.9})
  })
  it('fails when the score is below the threshold', async () => {
    mockFetchOnce({success: true, score: 0.2})
    const res = await createRecaptchaProvider('secret', 0.5).verify('tok')
    expect(res.success).toBe(false)
    expect(res.score).toBe(0.2)
  })
  it('fails when google reports failure', async () => {
    mockFetchOnce({success: false, score: 0.9})
    const res = await createRecaptchaProvider('secret').verify('tok')
    expect(res.success).toBe(false)
  })
  it('succeeds when google succeeds and score is undefined', async () => {
    mockFetchOnce({success: true})
    const res = await createRecaptchaProvider('secret').verify('tok')
    expect(res).toEqual({success: true, score: undefined})
  })
})

describe('turnstile provider', () => {
  it('mirrors the success flag and has no score', async () => {
    mockFetchOnce({success: true})
    const res = await createTurnstileProvider('secret').verify('tok')
    expect(res).toEqual({success: true, score: undefined})
  })
  it('fails on a failed verification', async () => {
    mockFetchOnce({success: false})
    expect((await createTurnstileProvider('secret').verify('tok')).success).toBe(false)
  })
})

describe('getCaptchaProvider', () => {
  it('returns null when unset', () => {
    expect(getCaptchaProvider({} as NodeJS.ProcessEnv)).toBeNull()
  })
  it('returns null for none', () => {
    expect(getCaptchaProvider({NEXT_PUBLIC_CAPTCHA_PROVIDER: 'none'} as never)).toBeNull()
  })
  it('builds a recaptcha provider from env', () => {
    const p = getCaptchaProvider({
      NEXT_PUBLIC_CAPTCHA_PROVIDER: 'recaptcha',
      RECAPTCHA_SECRET_KEY: 's',
    } as never)
    expect(p?.name).toBe('recaptcha')
  })
  it('builds a turnstile provider from env', () => {
    const p = getCaptchaProvider({
      NEXT_PUBLIC_CAPTCHA_PROVIDER: 'turnstile',
      TURNSTILE_SECRET_KEY: 's',
    } as never)
    expect(p?.name).toBe('turnstile')
  })
  it('returns null when the secret is missing', () => {
    expect(
      getCaptchaProvider({NEXT_PUBLIC_CAPTCHA_PROVIDER: 'recaptcha'} as never),
    ).toBeNull()
  })
  it('returns null when the turnstile secret is missing', () => {
    expect(getCaptchaProvider({NEXT_PUBLIC_CAPTCHA_PROVIDER: 'turnstile'} as never)).toBeNull()
  })
})
