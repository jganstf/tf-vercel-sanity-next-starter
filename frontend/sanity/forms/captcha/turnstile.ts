import type {CaptchaProvider, CaptchaResult} from './types'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function createTurnstileProvider(secret: string): CaptchaProvider {
  return {
    name: 'turnstile',
    async verify(token: string, remoteIp?: string): Promise<CaptchaResult> {
      const body = new URLSearchParams({secret, response: token})
      if (remoteIp) body.set('remoteip', remoteIp)
      const res = await fetch(VERIFY_URL, {method: 'POST', body})
      const data = (await res.json()) as {success?: boolean}
      // Turnstile has no score.
      return {success: Boolean(data.success), score: undefined}
    },
  }
}
