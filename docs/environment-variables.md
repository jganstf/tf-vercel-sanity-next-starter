# Environment variables

All env vars for the frontend and Studio, and how they're set locally vs. on Vercel / the deployed Studio. Secrets live in `.env.local` (gitignored) locally and in the host's environment settings in production — never committed.

## Frontend (`frontend/`)

| Variable | Public? | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | yes | yes | Sanity project id (`frontend/sanity/lib/api.ts`). |
| `NEXT_PUBLIC_SANITY_DATASET` | yes | yes | Sanity dataset (e.g. `production`). |
| `NEXT_PUBLIC_SANITY_API_VERSION` | yes | no | API version; defaults to the value in `api.ts`. |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | yes | no | Studio URL for Visual Editing; defaults to `http://localhost:3333`. |
| `SANITY_API_READ_TOKEN` | no | yes | Read token for live/preview fetches (`frontend/sanity/lib/token.ts`). |
| `SANITY_API_WRITE_TOKEN` | no | for forms | **Write** token used by the form submission Server Action to create `formSubmission` documents and upload files (`frontend/sanity/lib/writeClient.ts`). Generate an **Editor**-scoped token in the Sanity manage dashboard. |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | yes | no | `recaptcha`, `turnstile`, or `none` (default `none`). Selects the site-wide CAPTCHA. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | yes | if reCAPTCHA | reCAPTCHA v3 site key (client). |
| `RECAPTCHA_SECRET_KEY` | no | if reCAPTCHA | reCAPTCHA v3 secret (server verification). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes | if Turnstile | Cloudflare Turnstile site key (client). |
| `TURNSTILE_SECRET_KEY` | no | if Turnstile | Cloudflare Turnstile secret (server verification). |

## Studio (`studio/`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `SANITY_STUDIO_PROJECT_ID` | yes | Sanity project id. |
| `SANITY_STUDIO_DATASET` | yes | Dataset. |
| `SANITY_STUDIO_PREVIEW_URL` | no | Frontend origin for Presentation preview; defaults to `http://localhost:3000`. |

## External setup required (outside this repo)

- **`SANITY_API_WRITE_TOKEN`** — create in the Sanity project's API settings (Editor scope). Add to `frontend/.env.local` and to Vercel's environment variables. Without it, form submissions fail at write time (builds still succeed — the client is created lazily).
- **CAPTCHA keys** — register a site in the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin) (v3) and/or the Cloudflare Turnstile dashboard, then set the matching site/secret keys. Set `NEXT_PUBLIC_CAPTCHA_PROVIDER` to the one you want active.
