'use client'

import {useEffect, useState} from 'react'
import {loadCaptchaScript} from './captchaClient'

const PROVIDER = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER as
  | 'recaptcha'
  | 'turnstile'
  | 'none'
  | undefined

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function useCaptchaToken(): {token: string; provider: string | null} {
  const [token, setToken] = useState('')

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    async function run() {
      if (PROVIDER === 'recaptcha' && RECAPTCHA_SITE_KEY) {
        await loadCaptchaScript('recaptcha', RECAPTCHA_SITE_KEY)
        const refresh = () =>
          window.grecaptcha?.ready(() => {
            window
              .grecaptcha!.execute(RECAPTCHA_SITE_KEY!, {action: 'submit'})
              .then((t) => !cancelled && setToken(t))
              .catch(() => undefined)
          })
        refresh()
        // v3 tokens expire after ~2 minutes; refresh periodically.
        interval = setInterval(refresh, 90_000)
      } else if (PROVIDER === 'turnstile' && TURNSTILE_SITE_KEY) {
        await loadCaptchaScript('turnstile', TURNSTILE_SITE_KEY)
        const container = document.createElement('div')
        container.style.display = 'none'
        document.body.appendChild(container)
        window.turnstile?.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => !cancelled && setToken(t),
        })
      }
    }
    run().catch(() => undefined)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [])

  const provider = PROVIDER && PROVIDER !== 'none' ? PROVIDER : null
  return {token, provider}
}
