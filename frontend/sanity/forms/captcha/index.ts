import 'server-only'
import type {CaptchaProvider} from './types'
import {createRecaptchaProvider} from './recaptcha'
import {createTurnstileProvider} from './turnstile'

export type {CaptchaProvider, CaptchaResult} from './types'

// Chooses the active provider from the global site setting (env). One provider
// site-wide; returns null when disabled or misconfigured (fail open to the
// honeypot + timing layers, which are always on).
export function getCaptchaProvider(env: NodeJS.ProcessEnv = process.env): CaptchaProvider | null {
  const which = env.NEXT_PUBLIC_CAPTCHA_PROVIDER
  if (which === 'recaptcha') {
    const secret = env.RECAPTCHA_SECRET_KEY
    return secret ? createRecaptchaProvider(secret) : null
  }
  if (which === 'turnstile') {
    const secret = env.TURNSTILE_SECRET_KEY
    return secret ? createTurnstileProvider(secret) : null
  }
  return null
}
