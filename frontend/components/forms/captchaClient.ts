type Provider = 'recaptcha' | 'turnstile'

const SCRIPTS: Record<Provider, (siteKey: string) => string> = {
  recaptcha: (k) => `https://www.google.com/recaptcha/api.js?render=${k}`,
  turnstile: () => 'https://challenges.cloudflare.com/turnstile/v0/api.js',
}

const loaded = new Set<string>()

export function loadCaptchaScript(provider: Provider, siteKey: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  const src = SCRIPTS[provider](siteKey)
  if (loaded.has(src)) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => {
      loaded.add(src)
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load CAPTCHA script: ${src}`))
    document.head.appendChild(script)
  })
}

// Minimal typings for the provider globals injected by the scripts above.
declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: {action: string}) => Promise<string>
    }
    turnstile?: {
      render: (el: HTMLElement, opts: {sitekey: string; callback: (token: string) => void}) => string
    }
  }
}
