import type {CaptchaProvider, CaptchaResult} from './types'

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

export function createRecaptchaProvider(secret: string, minScore = 0.5): CaptchaProvider {
  return {
    name: 'recaptcha',
    async verify(token: string, remoteIp?: string): Promise<CaptchaResult> {
      const body = new URLSearchParams({secret, response: token})
      if (remoteIp) body.set('remoteip', remoteIp)
      const res = await fetch(VERIFY_URL, {method: 'POST', body})
      const data = (await res.json()) as {success?: boolean; score?: number}
      const score = typeof data.score === 'number' ? data.score : undefined
      const success = Boolean(data.success) && (score === undefined || score >= minScore)
      return {success, score}
    },
  }
}
