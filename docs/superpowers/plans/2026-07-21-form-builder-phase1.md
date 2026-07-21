# Form Builder — Phase 1: Core Form System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors build reusable forms in Sanity Studio, drop them onto any page via the existing PageBuilder, and have spam-protected submissions stored as Sanity documents.

**Architecture:** Studio gets four schema types (`formBlock`, `form`, `formField`, `formSubmission`). The frontend dereferences the form in the page's GROQ query and renders it with a client `FormRenderer` wired to a Next.js **Server Action** (`useActionState`). The action re-validates server-side, runs three spam layers (honeypot + timing + pluggable CAPTCHA), uploads any files, and writes a `formSubmission` via a new server-only write client. Security-critical logic lives in small pure modules unit-tested with Vitest; UI gets Storybook stories.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Sanity v5 Studio + next-sanity, TypeScript, Vitest (new, dev-only). Zero new runtime dependencies.

**Spec:** [docs/superpowers/specs/2026-07-21-form-builder-phase1-design.md](../specs/2026-07-21-form-builder-phase1-design.md)

## Global Constraints

Every task's requirements implicitly include this section.

- **Non-standard Next.js:** this repo's Next.js (`^16.2.7`) differs from training data. Before writing any Next.js-specific code, read the relevant file under `node_modules/next/dist/docs/`. The forms mechanism is confirmed in `node_modules/next/dist/docs/01-app/02-guides/forms.md` (Server Actions + `useActionState`).
- **No new runtime dependencies.** Vitest is the only new package, and it is `devDependencies`-only. Validation is hand-rolled (no `zod`); CAPTCHA is manual script injection + `fetch` (no wrapper package). If a task seems to need another dependency, stop and ask the user.
- **Secrets never in the repo.** New env vars (`SANITY_API_WRITE_TOKEN`, CAPTCHA keys) go in `.env.local` (gitignored) and are flagged for Vercel. `NEXT_PUBLIC_*` vars are public by design; secret keys must never be `NEXT_PUBLIC_`.
- **Import alias:** frontend uses `@/*` → `./*` (frontend root). E.g. `@/sanity/lib/client`, `@/components/forms/FormRenderer`, `@/app/actions/submitForm`.
- **Server-only modules:** anything importing a secret or the write client starts with `import 'server-only'`.
- **TypeGen after schema changes:** run `npm run sanity:typegen --workspace=frontend` after any Studio schema edit (Task 13 covers the batch regen).
- **Styling:** AGENTS.md states "tokens-only," but the tooling (`lint:tokens`) and several linked docs don't exist yet, and existing components (`Cta.tsx`, `InfoSection.tsx`) use plain Tailwind utility classes. Match the existing component idioms and use semantic tokens from `frontend/css/globals.css` where they already exist. Do not block on the aspirational token linter.
- **Definition of done per task:** the task's own tests pass, plus the repo stays green on the scripts that actually exist: `npm run lint` (from root), `npm run type-check` (from root), and `npm run build --workspace=frontend` where relevant. There is **no** `test-storybook` or `lint:tokens` script despite AGENTS.md — do not invoke them.
- **Value storage simplification (phase 1):** submission field values are stored as strings (`multiSelect` comma-joined, `consent` as `"true"`/`"false"`). Structured/typed values are out of scope. File fields are stored in `files[]`, not `values[]`.
- **Commit after every task.**

---

### Task 1: Add Vitest test infrastructure

**Files:**
- Modify: `frontend/package.json` (add devDep + scripts)
- Create: `frontend/vitest.config.ts`
- Create: `frontend/sanity/forms/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm run test --workspace=frontend` (Vitest, node environment) that all later TDD tasks rely on.

- [ ] **Step 1: Install Vitest (dev-only)**

Run from repo root:
```bash
npm install -D vitest --workspace=frontend
```
Expected: `vitest` added under `frontend/package.json` `devDependencies`, no runtime deps changed.

- [ ] **Step 2: Create the Vitest config**

Create `frontend/vitest.config.ts`:
```ts
import {defineConfig} from 'vitest/config'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'storybook-static'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
```

- [ ] **Step 3: Add test scripts**

In `frontend/package.json` `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test**

Create `frontend/sanity/forms/__tests__/smoke.test.ts`:
```ts
import {describe, it, expect} from 'vitest'

describe('vitest infrastructure', () => {
  it('runs and resolves the @ alias config', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run the test**

Run: `npm run test --workspace=frontend`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json package-lock.json frontend/vitest.config.ts frontend/sanity/forms/__tests__/smoke.test.ts
git commit -m "chore(forms): add Vitest test infrastructure"
```

---

### Task 2: Shared form domain types

**Files:**
- Create: `frontend/sanity/forms/types.ts`

**Interfaces:**
- Produces: the domain types imported by every logic module and UI component:
  - `FieldType`, `FieldOption`, `FormFieldDef`, `SuccessBehavior`, `FormDef`
  - `SpamMeta`, `FormState`, `FieldProps`

These are deliberately hand-written domain types (not the generated Sanity types) so the pure logic is testable without the typegen output. The query boundary (Task 14/15) maps generated types → these.

- [ ] **Step 1: Create the types module**

Create `frontend/sanity/forms/types.ts`:
```ts
// Domain types for the form builder. Kept independent of generated Sanity types
// so the pure logic modules can be unit-tested in isolation. The GROQ layer maps
// generated query-result types onto these at the IO boundary.

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'url'
  | 'time'
  | 'select'
  | 'multiSelect'
  | 'radio'
  | 'consent'
  | 'html'
  | 'file'

export type FieldOption = {label: string; value: string}

export type FormFieldDef = {
  _key: string
  label: string
  name: string
  fieldType: FieldType
  required?: boolean
  helpText?: string
  minLength?: number
  maxLength?: number
  options?: FieldOption[]
  consentLabel?: string
  maxSizeMb?: number
  allowedTypes?: string[]
  // portable-text content for `html` display blocks; opaque to the logic layer
  content?: unknown
}

export type SuccessBehavior =
  | {type: 'message'; message: string}
  | {type: 'redirect'; redirectUrl: string}

export type FormDef = {
  _id: string
  title: string
  fields: FormFieldDef[]
  captchaEnabled?: boolean
  successBehavior?: SuccessBehavior
}

export type SpamMeta = {
  captchaProvider: string
  captchaScore?: number
  honeypotTriggered: boolean
  timeToSubmitMs: number
}

// Returned by the submit Server Action and consumed by useActionState.
export type FormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  // field-level validation errors, keyed by FormFieldDef.name
  errors?: Record<string, string>
}

// Common prop shape for the per-type field input components.
export type FieldProps = {
  field: FormFieldDef
  error?: string
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run type-check --workspace=frontend`
Expected: PASS (no errors). This is the test for a types-only module.

- [ ] **Step 3: Commit**

```bash
git add frontend/sanity/forms/types.ts
git commit -m "feat(forms): add shared form domain types"
```

---

### Task 3: Validation module (TDD)

**Files:**
- Create: `frontend/sanity/forms/validation.ts`
- Test: `frontend/sanity/forms/__tests__/validation.test.ts`

**Interfaces:**
- Consumes: `FormFieldDef` from `./types`.
- Produces:
  - `validateField(field: FormFieldDef, value: unknown): string | null` — returns an error message or `null`.
  - `validateSubmission(fields: FormFieldDef[], values: Record<string, unknown>): Record<string, string>` — returns a `{fieldName: message}` map; empty object means valid.

Rules: `required`; `minLength`/`maxLength` for `text`/`textarea`; email/url/phone pattern checks; `consent` required must be truthy. `html` fields are display-only and always valid. `file`/`select`/`multiSelect`/`radio`/`time` only check `required` here (file size/type is enforced separately server-side in Task 15).

- [ ] **Step 1: Write the failing tests**

Create `frontend/sanity/forms/__tests__/validation.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {validateField, validateSubmission} from '../validation'
import type {FormFieldDef} from '../types'

const field = (over: Partial<FormFieldDef>): FormFieldDef => ({
  _key: 'k',
  label: 'L',
  name: 'f',
  fieldType: 'text',
  ...over,
})

describe('validateField', () => {
  it('flags a required field left empty', () => {
    expect(validateField(field({required: true}), '')).toMatch(/required/i)
  })

  it('passes a required field with a value', () => {
    expect(validateField(field({required: true}), 'hi')).toBeNull()
  })

  it('passes an empty optional field', () => {
    expect(validateField(field({required: false}), '')).toBeNull()
  })

  it('enforces minLength', () => {
    expect(validateField(field({minLength: 3}), 'ab')).toMatch(/at least 3/i)
  })

  it('enforces maxLength', () => {
    expect(validateField(field({maxLength: 2}), 'abc')).toMatch(/at most 2/i)
  })

  it('rejects a malformed email', () => {
    expect(validateField(field({fieldType: 'email'}), 'nope')).toMatch(/valid email/i)
  })

  it('accepts a well-formed email', () => {
    expect(validateField(field({fieldType: 'email'}), 'a@b.co')).toBeNull()
  })

  it('rejects a malformed url', () => {
    expect(validateField(field({fieldType: 'url'}), 'not a url')).toMatch(/valid url/i)
  })

  it('accepts a well-formed url', () => {
    expect(validateField(field({fieldType: 'url'}), 'https://x.dev')).toBeNull()
  })

  it('requires consent when required', () => {
    expect(validateField(field({fieldType: 'consent', required: true}), 'false')).toMatch(/required/i)
    expect(validateField(field({fieldType: 'consent', required: true}), 'true')).toBeNull()
  })

  it('treats html blocks as always valid', () => {
    expect(validateField(field({fieldType: 'html', required: true}), '')).toBeNull()
  })

  it('validates multiSelect required by array length', () => {
    expect(validateField(field({fieldType: 'multiSelect', required: true}), [])).toMatch(/required/i)
    expect(validateField(field({fieldType: 'multiSelect', required: true}), ['a'])).toBeNull()
  })
})

describe('validateSubmission', () => {
  it('collects errors keyed by field name', () => {
    const fields = [
      field({name: 'email', fieldType: 'email', required: true}),
      field({name: 'msg', fieldType: 'textarea', required: true}),
    ]
    const errors = validateSubmission(fields, {email: 'bad', msg: ''})
    expect(Object.keys(errors).sort()).toEqual(['email', 'msg'])
  })

  it('returns an empty object when everything is valid', () => {
    const fields = [field({name: 'email', fieldType: 'email', required: true})]
    expect(validateSubmission(fields, {email: 'a@b.co'})).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- validation`
Expected: FAIL — `Cannot find module '../validation'`.

- [ ] **Step 3: Implement the validation module**

Create `frontend/sanity/forms/validation.ts`:
```ts
import type {FormFieldDef} from './types'

// Pragmatic patterns — server-side is authoritative but these needn't be RFC-perfect.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+()\-\s\d]{6,}$/

function asString(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (value instanceof Object && 'name' in value) return '' // File — not text
  return String(value)
}

function isEmpty(field: FormFieldDef, value: unknown): boolean {
  if (field.fieldType === 'multiSelect') return !Array.isArray(value) || value.length === 0
  if (field.fieldType === 'consent') return asString(value) !== 'true'
  return asString(value).trim() === ''
}

export function validateField(field: FormFieldDef, value: unknown): string | null {
  // Display-only blocks never carry a value.
  if (field.fieldType === 'html') return null

  const empty = isEmpty(field, value)

  if (field.required && empty) {
    return `${field.label} is required.`
  }
  // Optional + empty: nothing more to check.
  if (empty) return null

  const str = asString(value)

  if (typeof field.minLength === 'number' && str.length < field.minLength) {
    return `${field.label} must be at least ${field.minLength} characters.`
  }
  if (typeof field.maxLength === 'number' && str.length > field.maxLength) {
    return `${field.label} must be at most ${field.maxLength} characters.`
  }

  if (field.fieldType === 'email' && !EMAIL_RE.test(str)) {
    return `${field.label} must be a valid email address.`
  }
  if (field.fieldType === 'url') {
    try {
      new URL(str)
    } catch {
      return `${field.label} must be a valid URL.`
    }
  }
  if (field.fieldType === 'phone' && !PHONE_RE.test(str)) {
    return `${field.label} must be a valid phone number.`
  }

  return null
}

export function validateSubmission(
  fields: FormFieldDef[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const message = validateField(field, values[field.name])
    if (message) errors[field.name] = message
  }
  return errors
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- validation`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add frontend/sanity/forms/validation.ts frontend/sanity/forms/__tests__/validation.test.ts
git commit -m "feat(forms): add schema-driven submission validation"
```

---

### Task 4: Spam checks — honeypot + timing (TDD)

**Files:**
- Create: `frontend/sanity/forms/spam.ts`
- Test: `frontend/sanity/forms/__tests__/spam.test.ts`

**Interfaces:**
- Produces:
  - `isHoneypotTriggered(value: unknown): boolean` — true when the hidden field is non-empty.
  - `timeToSubmitMs(renderedAt: number, now: number): number`
  - `isTooFast(renderedAt: number, now: number, minMs?: number): boolean` — default `minMs = 1500`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/sanity/forms/__tests__/spam.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {isHoneypotTriggered, timeToSubmitMs, isTooFast} from '../spam'

describe('isHoneypotTriggered', () => {
  it('is false for an empty honeypot', () => {
    expect(isHoneypotTriggered('')).toBe(false)
    expect(isHoneypotTriggered(null)).toBe(false)
    expect(isHoneypotTriggered('   ')).toBe(false)
  })
  it('is true when a bot filled the honeypot', () => {
    expect(isHoneypotTriggered('http://spam.example')).toBe(true)
  })
})

describe('timing', () => {
  it('computes elapsed ms', () => {
    expect(timeToSubmitMs(1000, 4000)).toBe(3000)
  })
  it('flags submissions under the threshold', () => {
    expect(isTooFast(1000, 1500)).toBe(true) // 500ms elapsed
  })
  it('accepts submissions over the threshold', () => {
    expect(isTooFast(1000, 3000)).toBe(false) // 2000ms elapsed
  })
  it('treats a missing/NaN renderedAt as too fast (fail closed)', () => {
    expect(isTooFast(Number.NaN, 3000)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- spam`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the spam module**

Create `frontend/sanity/forms/spam.ts`:
```ts
export function isHoneypotTriggered(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function timeToSubmitMs(renderedAt: number, now: number): number {
  return now - renderedAt
}

export function isTooFast(renderedAt: number, now: number, minMs = 1500): boolean {
  const elapsed = timeToSubmitMs(renderedAt, now)
  // Fail closed: a missing/NaN timestamp is treated as suspicious.
  if (Number.isNaN(elapsed)) return true
  return elapsed < minMs
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- spam`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/sanity/forms/spam.ts frontend/sanity/forms/__tests__/spam.test.ts
git commit -m "feat(forms): add honeypot and timing spam checks"
```

---

### Task 5: Pluggable CAPTCHA providers (TDD)

**Files:**
- Create: `frontend/sanity/forms/captcha/types.ts`
- Create: `frontend/sanity/forms/captcha/recaptcha.ts`
- Create: `frontend/sanity/forms/captcha/turnstile.ts`
- Create: `frontend/sanity/forms/captcha/index.ts`
- Test: `frontend/sanity/forms/__tests__/captcha.test.ts`

**Interfaces:**
- Produces:
  - `type CaptchaResult = {success: boolean; score?: number}`
  - `interface CaptchaProvider { readonly name: string; verify(token: string, remoteIp?: string): Promise<CaptchaResult> }`
  - `createRecaptchaProvider(secret: string, minScore?: number): CaptchaProvider` (default `minScore = 0.5`)
  - `createTurnstileProvider(secret: string): CaptchaProvider`
  - `getCaptchaProvider(env?: NodeJS.ProcessEnv): CaptchaProvider | null` — reads `NEXT_PUBLIC_CAPTCHA_PROVIDER` + the matching secret; returns `null` when unset/`'none'`.

Verify uses the global `fetch` (available in the Node/Next runtime). The provider bakes the threshold in: reCAPTCHA `success` = Google-success **and** `score >= minScore`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/sanity/forms/__tests__/captcha.test.ts`:
```ts
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
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- captcha`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the provider interface**

Create `frontend/sanity/forms/captcha/types.ts`:
```ts
export type CaptchaResult = {success: boolean; score?: number}

export interface CaptchaProvider {
  readonly name: string
  verify(token: string, remoteIp?: string): Promise<CaptchaResult>
}
```

- [ ] **Step 4: Implement the reCAPTCHA provider**

Create `frontend/sanity/forms/captcha/recaptcha.ts`:
```ts
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
```

- [ ] **Step 5: Implement the Turnstile provider**

Create `frontend/sanity/forms/captcha/turnstile.ts`:
```ts
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
```

- [ ] **Step 6: Implement the provider selector**

Create `frontend/sanity/forms/captcha/index.ts`:
```ts
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
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- captcha`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/sanity/forms/captcha frontend/sanity/forms/__tests__/captcha.test.ts
git commit -m "feat(forms): add pluggable CAPTCHA providers (reCAPTCHA v3 + Turnstile)"
```

---

### Task 6: Submission document builder (TDD)

**Files:**
- Create: `frontend/sanity/forms/buildSubmission.ts`
- Test: `frontend/sanity/forms/__tests__/buildSubmission.test.ts`

**Interfaces:**
- Consumes: `FormFieldDef`, `SpamMeta` from `./types`.
- Produces:
  - `type SubmissionValue = {_key: string; fieldName: string; value: string}`
  - `type SubmissionFileRef = {_key: string; fieldName: string; asset: {_type: 'reference'; _ref: string}}`
  - `type SubmissionDoc = {_type: 'formSubmission'; form: {_type: 'reference'; _ref: string}; submittedAt: string; values: SubmissionValue[]; files: SubmissionFileRef[]; spamMeta: SpamMeta}`
  - `buildSubmissionDoc(input: {formId: string; fields: FormFieldDef[]; values: Record<string, unknown>; submittedAt: string; fileRefs: SubmissionFileRef[]; spamMeta: SpamMeta}): SubmissionDoc`

Serialization: skip `html` fields and `file` fields (files live in `fileRefs`). `multiSelect` arrays comma-join. `consent` booleans → `"true"`/`"false"`. `_key`s are deterministic (`val-<fieldName>`) so tests are stable and no RNG is needed.

- [ ] **Step 1: Write the failing tests**

Create `frontend/sanity/forms/__tests__/buildSubmission.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {buildSubmissionDoc} from '../buildSubmission'
import type {FormFieldDef, SpamMeta} from '../types'

const spam: SpamMeta = {
  captchaProvider: 'none',
  honeypotTriggered: false,
  timeToSubmitMs: 4200,
}

const fields: FormFieldDef[] = [
  {_key: '1', label: 'Email', name: 'email', fieldType: 'email'},
  {_key: '2', label: 'Topics', name: 'topics', fieldType: 'multiSelect'},
  {_key: '3', label: 'Agree', name: 'agree', fieldType: 'consent'},
  {_key: '4', label: 'Intro', name: 'intro', fieldType: 'html'},
  {_key: '5', label: 'Resume', name: 'resume', fieldType: 'file'},
]

it('builds a formSubmission document', () => {
  const doc = buildSubmissionDoc({
    formId: 'form-123',
    fields,
    values: {email: 'a@b.co', topics: ['x', 'y'], agree: 'true', intro: 'ignored'},
    submittedAt: '2026-07-21T00:00:00.000Z',
    fileRefs: [{_key: 'file-resume', fieldName: 'resume', asset: {_type: 'reference', _ref: 'file-abc'}}],
    spamMeta: spam,
  })

  expect(doc._type).toBe('formSubmission')
  expect(doc.form).toEqual({_type: 'reference', _ref: 'form-123'})
  expect(doc.submittedAt).toBe('2026-07-21T00:00:00.000Z')
  expect(doc.spamMeta).toEqual(spam)

  // html + file excluded from values; multiSelect joined; consent stringified
  expect(doc.values).toEqual([
    {_key: 'val-email', fieldName: 'email', value: 'a@b.co'},
    {_key: 'val-topics', fieldName: 'topics', value: 'x, y'},
    {_key: 'val-agree', fieldName: 'agree', value: 'true'},
  ])
  expect(doc.files).toEqual([
    {_key: 'file-resume', fieldName: 'resume', asset: {_type: 'reference', _ref: 'file-abc'}},
  ])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- buildSubmission`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the builder**

Create `frontend/sanity/forms/buildSubmission.ts`:
```ts
import type {FormFieldDef, SpamMeta} from './types'

export type SubmissionValue = {_key: string; fieldName: string; value: string}

export type SubmissionFileRef = {
  _key: string
  fieldName: string
  asset: {_type: 'reference'; _ref: string}
}

export type SubmissionDoc = {
  _type: 'formSubmission'
  form: {_type: 'reference'; _ref: string}
  submittedAt: string
  values: SubmissionValue[]
  files: SubmissionFileRef[]
  spamMeta: SpamMeta
}

function serialize(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function buildSubmissionDoc(input: {
  formId: string
  fields: FormFieldDef[]
  values: Record<string, unknown>
  submittedAt: string
  fileRefs: SubmissionFileRef[]
  spamMeta: SpamMeta
}): SubmissionDoc {
  const values: SubmissionValue[] = input.fields
    .filter((f) => f.fieldType !== 'html' && f.fieldType !== 'file')
    .map((f) => ({
      _key: `val-${f.name}`,
      fieldName: f.name,
      value: serialize(input.values[f.name]),
    }))

  return {
    _type: 'formSubmission',
    form: {_type: 'reference', _ref: input.formId},
    submittedAt: input.submittedAt,
    values,
    files: input.fileRefs,
    spamMeta: input.spamMeta,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- buildSubmission`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/sanity/forms/buildSubmission.ts frontend/sanity/forms/__tests__/buildSubmission.test.ts
git commit -m "feat(forms): add formSubmission document builder"
```

---

### Task 7: FormData extraction + file validation (TDD)

**Files:**
- Create: `frontend/sanity/forms/formData.ts`
- Test: `frontend/sanity/forms/__tests__/formData.test.ts`

**Interfaces:**
- Consumes: `FormFieldDef` from `./types`.
- Produces:
  - `extractValues(fields: FormFieldDef[], formData: FormData): Record<string, unknown>` — string for scalar fields, `string[]` for `multiSelect`, `"true"`/`"false"` for `consent`; `file`/`html` omitted.
  - `extractFiles(fields: FormFieldDef[], formData: FormData): {fieldName: string; file: File}[]` — only non-empty file entries.
  - `validateFile(field: FormFieldDef, file: File): string | null` — checks `maxSizeMb` and `allowedTypes` (matches by MIME type or extension); returns an error or `null`.

Reserved FormData keys (never treated as fields): `_formId`, `_renderedAt`, `_captchaToken`, and the honeypot key `company_website`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/sanity/forms/__tests__/formData.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {extractValues, extractFiles, validateFile} from '../formData'
import type {FormFieldDef} from '../types'

const fields: FormFieldDef[] = [
  {_key: '1', label: 'Email', name: 'email', fieldType: 'email'},
  {_key: '2', label: 'Topics', name: 'topics', fieldType: 'multiSelect'},
  {_key: '3', label: 'Agree', name: 'agree', fieldType: 'consent'},
  {_key: '4', label: 'Resume', name: 'resume', fieldType: 'file', maxSizeMb: 1, allowedTypes: ['application/pdf', '.pdf']},
]

function fd(entries: [string, string][]): FormData {
  const f = new FormData()
  for (const [k, v] of entries) f.append(k, v)
  return f
}

describe('extractValues', () => {
  it('pulls scalars, arrays, and consent; ignores reserved + file keys', () => {
    const f = fd([
      ['email', 'a@b.co'],
      ['topics', 'x'],
      ['topics', 'y'],
      ['agree', 'on'],
      ['_formId', 'form-1'],
      ['company_website', ''],
    ])
    const values = extractValues(fields, f)
    expect(values).toEqual({email: 'a@b.co', topics: ['x', 'y'], agree: 'true'})
  })

  it('records unchecked consent as false', () => {
    expect(extractValues(fields, fd([['email', 'a@b.co']])).agree).toBe('false')
  })
})

describe('validateFile', () => {
  const field = fields[3]
  it('rejects an oversize file', () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'r.pdf', {type: 'application/pdf'})
    expect(validateFile(field, big)).toMatch(/too large/i)
  })
  it('rejects a disallowed type', () => {
    const wrong = new File([new Uint8Array(10)], 'r.png', {type: 'image/png'})
    expect(validateFile(field, wrong)).toMatch(/not an allowed/i)
  })
  it('accepts an allowed, in-size file', () => {
    const ok = new File([new Uint8Array(10)], 'r.pdf', {type: 'application/pdf'})
    expect(validateFile(field, ok)).toBeNull()
  })
})

describe('extractFiles', () => {
  it('returns only non-empty file entries', () => {
    const f = new FormData()
    f.append('resume', new File([new Uint8Array(10)], 'r.pdf', {type: 'application/pdf'}))
    const files = extractFiles(fields, f)
    expect(files).toHaveLength(1)
    expect(files[0].fieldName).toBe('resume')
  })
  it('skips empty file inputs', () => {
    const f = new FormData()
    f.append('resume', new File([], '', {type: 'application/octet-stream'}))
    expect(extractFiles(fields, f)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- formData`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the extraction module**

Create `frontend/sanity/forms/formData.ts`:
```ts
import type {FormFieldDef} from './types'

export const HONEYPOT_FIELD = 'company_website'
export const RESERVED_KEYS = new Set(['_formId', '_renderedAt', '_captchaToken', HONEYPOT_FIELD])

export function extractValues(
  fields: FormFieldDef[],
  formData: FormData,
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (RESERVED_KEYS.has(field.name)) continue
    if (field.fieldType === 'html' || field.fieldType === 'file') continue

    if (field.fieldType === 'multiSelect') {
      values[field.name] = formData.getAll(field.name).map((v) => String(v))
      continue
    }
    if (field.fieldType === 'consent') {
      const raw = formData.get(field.name)
      // Checkboxes submit "on" (or a custom value) when checked, nothing when not.
      values[field.name] = raw == null || raw === '' ? 'false' : 'true'
      continue
    }
    const raw = formData.get(field.name)
    values[field.name] = raw == null ? '' : String(raw)
  }
  return values
}

export function extractFiles(
  fields: FormFieldDef[],
  formData: FormData,
): {fieldName: string; file: File}[] {
  const out: {fieldName: string; file: File}[] = []
  for (const field of fields) {
    if (field.fieldType !== 'file') continue
    const entry = formData.get(field.name)
    if (entry instanceof File && entry.size > 0 && entry.name) {
      out.push({fieldName: field.name, file: entry})
    }
  }
  return out
}

export function validateFile(field: FormFieldDef, file: File): string | null {
  if (typeof field.maxSizeMb === 'number') {
    const maxBytes = field.maxSizeMb * 1024 * 1024
    if (file.size > maxBytes) {
      return `${field.label}: file is too large (max ${field.maxSizeMb} MB).`
    }
  }
  const allowed = field.allowedTypes ?? []
  if (allowed.length > 0) {
    const name = file.name.toLowerCase()
    const matches = allowed.some((t) => {
      const type = t.toLowerCase()
      return type.startsWith('.') ? name.endsWith(type) : file.type === type
    })
    if (!matches) {
      return `${field.label}: file type is not an allowed format.`
    }
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- formData`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/sanity/forms/formData.ts frontend/sanity/forms/__tests__/formData.test.ts
git commit -m "feat(forms): add FormData extraction and file validation"
```

---

### Task 8: Server-only Sanity write client

**Files:**
- Create: `frontend/sanity/lib/writeClient.ts`

**Interfaces:**
- Consumes: `projectId`, `dataset`, `apiVersion` from `@/sanity/lib/api`.
- Produces: `getWriteClient(): SanityClient` — a lazily-created, cached, server-only write client. Throws only when first called (not at import), so the build doesn't require the write token to be present.

Rationale for lazy (vs. `token.ts`'s eager throw): the write token is only needed at submission time, and forcing it into the build environment is a heavier external requirement than the read token. The lazy check keeps builds working without it and makes the action easy to test by mocking this module.

- [ ] **Step 1: Create the write client**

Create `frontend/sanity/lib/writeClient.ts`:
```ts
import 'server-only'
import {createClient, type SanityClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '@/sanity/lib/api'

let cached: SanityClient | null = null

/**
 * Server-only Sanity client with write access, used by the form submission
 * Server Action to create `formSubmission` documents and upload file assets.
 * Lazily created so a missing token only fails at submit time, not at build.
 */
export function getWriteClient(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) {
    throw new Error('Missing SANITY_API_WRITE_TOKEN')
  }
  cached = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
  })
  return cached
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run type-check --workspace=frontend`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/sanity/lib/writeClient.ts
git commit -m "feat(forms): add server-only Sanity write client"
```

---

### Task 9: Studio — `formField` object type

**Files:**
- Create: `studio/src/schemaTypes/objects/formField.ts`

**Interfaces:**
- Produces: the `formField` object schema, consumed by `form` (Task 10) and registered in Task 12.

Field-type list must stay in sync with `FieldType` in `frontend/sanity/forms/types.ts` — after typegen (Task 13) the generated union enforces this at the type level.

- [ ] **Step 1: Create the schema**

Create `studio/src/schemaTypes/objects/formField.ts`:
```ts
import {defineField, defineType} from 'sanity'
import {StringIcon} from '@sanity/icons'

const FIELD_TYPES = [
  {title: 'Single-line text', value: 'text'},
  {title: 'Email', value: 'email'},
  {title: 'Phone', value: 'phone'},
  {title: 'Paragraph (textarea)', value: 'textarea'},
  {title: 'Website / URL', value: 'url'},
  {title: 'Time', value: 'time'},
  {title: 'Dropdown (select)', value: 'select'},
  {title: 'Multi-select (checkboxes)', value: 'multiSelect'},
  {title: 'Single choice (radio)', value: 'radio'},
  {title: 'Consent checkbox', value: 'consent'},
  {title: 'Rich text (display only)', value: 'html'},
  {title: 'File upload', value: 'file'},
]

const HAS_OPTIONS = ['select', 'multiSelect', 'radio']
const HAS_LENGTH = ['text', 'textarea']

export const formField = defineType({
  name: 'formField',
  title: 'Form Field',
  type: 'object',
  icon: StringIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Field name (machine key)',
      type: 'string',
      description: 'Lowercase identifier used to store the value. Letters, numbers, and underscores only. Must be unique within the form.',
      validation: (Rule) =>
        Rule.required()
          .regex(/^[a-z][a-z0-9_]*$/, {name: 'identifier'})
          .custom((value, context) => {
            const parent = context.document?.fields as {name?: string}[] | undefined
            if (!value || !parent) return true
            const count = parent.filter((f) => f?.name === value).length
            return count > 1 ? 'Field names must be unique within the form' : true
          }),
    }),
    defineField({
      name: 'fieldType',
      title: 'Field type',
      type: 'string',
      initialValue: 'text',
      options: {list: FIELD_TYPES},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'required',
      title: 'Required',
      type: 'boolean',
      initialValue: false,
      hidden: ({parent}) => parent?.fieldType === 'html',
    }),
    defineField({
      name: 'helpText',
      title: 'Help text',
      type: 'string',
      hidden: ({parent}) => parent?.fieldType === 'html',
    }),
    defineField({
      name: 'minLength',
      title: 'Minimum length',
      type: 'number',
      hidden: ({parent}) => !HAS_LENGTH.includes(parent?.fieldType),
    }),
    defineField({
      name: 'maxLength',
      title: 'Maximum length',
      type: 'number',
      hidden: ({parent}) => !HAS_LENGTH.includes(parent?.fieldType),
    }),
    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',
      of: [
        defineField({
          name: 'option',
          type: 'object',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'value', title: 'Value', type: 'string', validation: (R) => R.required()}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
      hidden: ({parent}) => !HAS_OPTIONS.includes(parent?.fieldType),
    }),
    defineField({
      name: 'consentLabel',
      title: 'Consent label',
      type: 'text',
      rows: 2,
      description: 'Text shown next to the consent checkbox.',
      hidden: ({parent}) => parent?.fieldType !== 'consent',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'blockContentTextOnly',
      description: 'Display-only rich text (headings, instructions). Not submitted.',
      hidden: ({parent}) => parent?.fieldType !== 'html',
    }),
    defineField({
      name: 'maxSizeMb',
      title: 'Max file size (MB)',
      type: 'number',
      initialValue: 10,
      hidden: ({parent}) => parent?.fieldType !== 'file',
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: 'allowedTypes',
      title: 'Allowed file types',
      type: 'array',
      of: [{type: 'string'}],
      description: 'MIME types (e.g. application/pdf) or extensions (e.g. .pdf). Empty allows any type.',
      options: {layout: 'tags'},
      hidden: ({parent}) => parent?.fieldType !== 'file',
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'fieldType'},
    prepare({title, subtitle}) {
      return {title: title || 'Untitled field', subtitle: String(subtitle ?? '')}
    },
  },
})
```

> Note: `blockContentTextOnly` is an existing object type in this repo (used by `callToAction.body`). Confirm it's exported from `studio/src/schemaTypes/index.ts` (it is, per the registry) before relying on it for the `html` field's `content`.

- [ ] **Step 2: Verify the Studio still compiles**

Run: `npm run type-check --workspace=studio`
Expected: PASS (the type isn't registered yet, but the file must type-check).

- [ ] **Step 3: Commit**

```bash
git add studio/src/schemaTypes/objects/formField.ts
git commit -m "feat(studio): add formField object schema"
```

---

### Task 10: Studio — `form` document type

**Files:**
- Create: `studio/src/schemaTypes/documents/form.ts`

**Interfaces:**
- Consumes: the `formField` object type (Task 9).
- Produces: the `form` document, referenced by `formBlock` (Task 11) and `formSubmission` (Task 12).

- [ ] **Step 1: Create the schema**

Create `studio/src/schemaTypes/documents/form.ts`:
```ts
import {defineField, defineType} from 'sanity'
import {ComposeIcon} from '@sanity/icons'

export const form = defineType({
  name: 'form',
  title: 'Form',
  type: 'document',
  icon: ComposeIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Internal name for this form (not shown to visitors).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',
      of: [{type: 'formField'}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'captchaEnabled',
      title: 'Enable CAPTCHA',
      type: 'boolean',
      initialValue: true,
      description: 'Uses the site-wide CAPTCHA provider, if one is configured.',
    }),
    defineField({
      name: 'successBehavior',
      title: 'On successful submission',
      type: 'object',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({
          name: 'type',
          title: 'Behavior',
          type: 'string',
          initialValue: 'message',
          options: {
            list: [
              {title: 'Show a message', value: 'message'},
              {title: 'Redirect to a URL', value: 'redirect'},
            ],
            layout: 'radio',
          },
        }),
        defineField({
          name: 'message',
          title: 'Success message',
          type: 'text',
          rows: 3,
          initialValue: 'Thanks — your submission has been received.',
          hidden: ({parent}) => parent?.type !== 'message',
        }),
        defineField({
          name: 'redirectUrl',
          title: 'Redirect URL',
          type: 'url',
          hidden: ({parent}) => parent?.type !== 'redirect',
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'title', fields: 'fields'},
    prepare({title, fields}) {
      const count = Array.isArray(fields) ? fields.length : 0
      return {title: title || 'Untitled form', subtitle: `${count} field${count === 1 ? '' : 's'}`}
    },
  },
})
```

- [ ] **Step 2: Verify the Studio compiles**

Run: `npm run type-check --workspace=studio`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add studio/src/schemaTypes/documents/form.ts
git commit -m "feat(studio): add form document schema"
```

---

### Task 11: Studio — `formBlock` object + register in page builder

**Files:**
- Create: `studio/src/schemaTypes/objects/formBlock.ts`
- Modify: `studio/src/schemaTypes/documents/page.ts` (add `{type: 'formBlock'}` to `pageBuilder.of`)

**Interfaces:**
- Consumes: the `form` document (Task 10).
- Produces: the `formBlock` page-builder entry, keyed as `formBlock` in the frontend `BlockRenderer` (Task 19).

- [ ] **Step 1: Create the block schema**

Create `studio/src/schemaTypes/objects/formBlock.ts`:
```ts
import {defineField, defineType} from 'sanity'
import {ComposeIcon} from '@sanity/icons'

export const formBlock = defineType({
  name: 'formBlock',
  title: 'Form',
  type: 'object',
  icon: ComposeIcon,
  fields: [
    defineField({
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'form'}],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'form.title'},
    prepare({title}) {
      return {title: title || 'Form', subtitle: 'Form'}
    },
  },
})
```

- [ ] **Step 2: Register it in the page builder**

In `studio/src/schemaTypes/documents/page.ts`, find the `pageBuilder` field's `of` array (currently `of: [{type: 'callToAction'}, {type: 'infoSection'}, {type: 'heroSecondary'}]`) and add `formBlock`:
```ts
      of: [{type: 'callToAction'}, {type: 'infoSection'}, {type: 'heroSecondary'}, {type: 'formBlock'}],
```

- [ ] **Step 3: Verify the Studio compiles**

Run: `npm run type-check --workspace=studio`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/objects/formBlock.ts studio/src/schemaTypes/documents/page.ts
git commit -m "feat(studio): add formBlock page-builder entry referencing a form"
```

---

### Task 12: Studio — `formSubmission` document + registry + no-create config

**Files:**
- Create: `studio/src/schemaTypes/documents/formSubmission.ts`
- Modify: `studio/src/schemaTypes/index.ts` (register all four new types)
- Modify: `studio/sanity.config.ts` (prevent hand-creation of `formSubmission`)

**Interfaces:**
- Consumes: `form` (Task 10), `formField` (Task 9), `formBlock` (Task 11).
- Produces: the `formSubmission` document (written by the Server Action in Task 15) and a Studio that lists submissions read-only.

- [ ] **Step 1: Create the submission schema (read-only fields)**

Create `studio/src/schemaTypes/documents/formSubmission.ts`:
```ts
import {defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons'

// Written only by the website's submit Server Action. Editors browse/inspect but
// never author these — every field is read-only and creation is disabled in
// sanity.config.ts (document.newDocumentOptions / document.actions).
export const formSubmission = defineType({
  name: 'formSubmission',
  title: 'Form Submission',
  type: 'document',
  icon: DocumentTextIcon,
  readOnly: true,
  fields: [
    defineField({name: 'form', title: 'Form', type: 'reference', to: [{type: 'form'}]}),
    defineField({name: 'submittedAt', title: 'Submitted at', type: 'datetime'}),
    defineField({
      name: 'values',
      title: 'Values',
      type: 'array',
      of: [
        defineField({
          name: 'value',
          type: 'object',
          fields: [
            defineField({name: 'fieldName', title: 'Field', type: 'string'}),
            defineField({name: 'value', title: 'Value', type: 'text'}),
          ],
          preview: {select: {title: 'fieldName', subtitle: 'value'}},
        }),
      ],
    }),
    defineField({
      name: 'files',
      title: 'Files',
      type: 'array',
      of: [
        defineField({
          name: 'fileEntry',
          type: 'object',
          fields: [
            defineField({name: 'fieldName', title: 'Field', type: 'string'}),
            defineField({name: 'asset', title: 'File', type: 'file'}),
          ],
          preview: {select: {title: 'fieldName'}},
        }),
      ],
    }),
    defineField({
      name: 'spamMeta',
      title: 'Spam metadata',
      type: 'object',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'captchaProvider', title: 'CAPTCHA provider', type: 'string'}),
        defineField({name: 'captchaScore', title: 'CAPTCHA score', type: 'number'}),
        defineField({name: 'honeypotTriggered', title: 'Honeypot triggered', type: 'boolean'}),
        defineField({name: 'timeToSubmitMs', title: 'Time to submit (ms)', type: 'number'}),
      ],
    }),
  ],
  orderings: [
    {title: 'Newest first', name: 'submittedAtDesc', by: [{field: 'submittedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {formTitle: 'form.title', submittedAt: 'submittedAt'},
    prepare({formTitle, submittedAt}) {
      return {title: formTitle || 'Submission', subtitle: submittedAt ? new Date(submittedAt).toLocaleString() : ''}
    },
  },
})
```

- [ ] **Step 2: Register all four types**

In `studio/src/schemaTypes/index.ts`, add the imports and array entries. The file's imports become (add these four lines alongside the existing imports):
```ts
import {form} from './documents/form'
import {formSubmission} from './documents/formSubmission'
import {formField} from './objects/formField'
import {formBlock} from './objects/formBlock'
```
And update the `schemaTypes` array — add `form` and `formSubmission` under `// Documents`, and `formField`, `formBlock` under `// Objects`:
```ts
export const schemaTypes = [
  // Singletons
  settings,
  footer,
  // Documents
  page,
  post,
  person,
  form,
  formSubmission,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  heroSecondary,
  seo,
  link,
  formField,
  formBlock,
]
```

- [ ] **Step 3: Disable hand-creation of submissions**

In `studio/sanity.config.ts`, add a `document` key to the `defineConfig({...})` object (a sibling of `plugins` and `schema`). Insert it right before the `schema: {...}` block:
```ts
  // Form submissions are authored only by the website's submit action.
  // Keep them out of the global "＋ Create" menu and strip create/edit actions;
  // combined with `readOnly: true` on the schema, editors can browse but not author.
  document: {
    newDocumentOptions: (prev) => prev.filter((template) => template.templateId !== 'formSubmission'),
    actions: (prev, {schemaType}) =>
      schemaType === 'formSubmission'
        ? prev.filter(({action}) => action === 'delete')
        : prev,
  },

  // Schema configuration, imported from ./src/schemaTypes/index.ts
  schema: {
    types: schemaTypes,
  },
```

- [ ] **Step 4: Verify the Studio compiles and builds**

Run: `npm run type-check --workspace=studio`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add studio/src/schemaTypes/documents/formSubmission.ts studio/src/schemaTypes/index.ts studio/sanity.config.ts
git commit -m "feat(studio): add formSubmission doc, register form types, disable hand-creation"
```

---

### Task 13: Regenerate Sanity types

**Files:**
- Modify: `sanity.schema.json` (regenerated)
- Modify: `frontend/sanity.types.ts` (regenerated)

**Interfaces:**
- Produces: generated types `Form`, `FormField`, `FormBlock`, `FormSubmission` (and the `fieldType` string union) available to the frontend.

- [ ] **Step 1: Regenerate**

Run from repo root:
```bash
npm run sanity:typegen --workspace=frontend
```
Expected: `sanity.schema.json` and `frontend/sanity.types.ts` update with no errors; output reports the schema extracted and types generated.

- [ ] **Step 2: Confirm the new types exist**

Run:
```bash
grep -E "Form(Field|Block|Submission)?\b" frontend/sanity.types.ts | head
```
Expected: type/interface declarations for the new schema types appear.

- [ ] **Step 3: Type-check the frontend**

Run: `npm run type-check --workspace=frontend`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add sanity.schema.json frontend/sanity.types.ts
git commit -m "chore(forms): regenerate Sanity schema and types for form builder"
```

---

### Task 14: GROQ — form query + page-builder projection

**Files:**
- Modify: `frontend/sanity/lib/queries.ts`

**Interfaces:**
- Consumes: generated types (Task 13).
- Produces:
  - `formByIdQuery` — fetches a single form's definition by `_id` (used server-side by the action, Task 15).
  - The `formBlock` projection inside `getPageQuery` so `FormBlock` receives the resolved form.

- [ ] **Step 1: Add the shared fragment and standalone query**

In `frontend/sanity/lib/queries.ts`, after the `linkFields` block (around line 45) add:
```ts
const formFieldsFragment = /* groq */ `
  _id,
  title,
  captchaEnabled,
  successBehavior,
  fields[]{
    _key,
    label,
    name,
    fieldType,
    required,
    helpText,
    minLength,
    maxLength,
    options[]{label, value},
    consentLabel,
    maxSizeMb,
    allowedTypes,
    content
  }
`

export const formByIdQuery = defineQuery(`
  *[_type == "form" && _id == $id][0]{
    ${formFieldsFragment}
  }
`)
```

- [ ] **Step 2: Add the `formBlock` projection to `getPageQuery`**

In the `pageBuilder[]{...}` projection inside `getPageQuery` (lines 70–88), add a `formBlock` branch after the `infoSection` branch:
```ts
      _type == "infoSection" => {
        content[]{
          ...,
          markDefs[]{
            ...,
            ${linkReference}
          }
        }
      },
      _type == "formBlock" => {
        _type,
        _key,
        "form": form->{
          ${formFieldsFragment}
        }
      },
```

- [ ] **Step 3: Regenerate query result types**

Run: `npm run sanity:typegen --workspace=frontend`
Expected: `GetPageQueryResult` now includes the `formBlock` variant; `FormByIdQueryResult` is generated.

- [ ] **Step 4: Type-check**

Run: `npm run type-check --workspace=frontend`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts
git commit -m "feat(forms): add form GROQ query and page-builder projection"
```

---

### Task 15: Submit Server Action (TDD with mocks)

**Files:**
- Create: `frontend/app/actions/submitForm.ts`
- Create: `frontend/sanity/forms/mapFormDef.ts` (maps a GROQ result → `FormDef` domain type)
- Test: `frontend/app/actions/__tests__/submitForm.test.ts`

**Interfaces:**
- Consumes: `validateSubmission`, `isHoneypotTriggered`/`isTooFast`, `getCaptchaProvider`, `buildSubmissionDoc`, `extractValues`/`extractFiles`/`validateFile`, `getWriteClient`, `client`, `formByIdQuery`.
- Produces: `submitForm(prevState: FormState, formData: FormData): Promise<FormState>` — the action bound by `useActionState` in Task 18. Also `mapFormDef(result): FormDef | null`.

Behavior order: load form def (server-authoritative) → honeypot → timing → CAPTCHA (if `captchaEnabled` and a provider is configured) → field validation → file validation + upload → write document → success. Spam rejections return a generic error; validation failures return field errors.

- [ ] **Step 1: Write the mapper**

Create `frontend/sanity/forms/mapFormDef.ts`:
```ts
import type {FormDef, FormFieldDef, FieldType} from './types'

// Narrow a raw GROQ form result (loose generated types / unknown) into the
// domain FormDef used by the logic layer. Returns null if there's no form.
export function mapFormDef(raw: unknown): FormDef | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r._id !== 'string') return null

  const fields: FormFieldDef[] = Array.isArray(r.fields)
    ? (r.fields as Record<string, unknown>[]).map((f) => ({
        _key: String(f._key ?? ''),
        label: String(f.label ?? ''),
        name: String(f.name ?? ''),
        fieldType: (f.fieldType as FieldType) ?? 'text',
        required: Boolean(f.required),
        helpText: f.helpText as string | undefined,
        minLength: typeof f.minLength === 'number' ? f.minLength : undefined,
        maxLength: typeof f.maxLength === 'number' ? f.maxLength : undefined,
        options: Array.isArray(f.options) ? (f.options as FormFieldDef['options']) : undefined,
        consentLabel: f.consentLabel as string | undefined,
        maxSizeMb: typeof f.maxSizeMb === 'number' ? f.maxSizeMb : undefined,
        allowedTypes: Array.isArray(f.allowedTypes) ? (f.allowedTypes as string[]) : undefined,
        content: f.content,
      }))
    : []

  return {
    _id: r._id,
    title: String(r.title ?? ''),
    fields,
    captchaEnabled: r.captchaEnabled !== false,
    successBehavior: r.successBehavior as FormDef['successBehavior'],
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `frontend/app/actions/__tests__/submitForm.test.ts`. The action module is mocked at its dependency boundaries so the test runs in Node without network or Sanity:
```ts
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

const fetchMock = vi.fn()
const createMock = vi.fn()

vi.mock('@/sanity/lib/live', () => ({sanityFetch: (...a: unknown[]) => fetchMock(...a)}))
vi.mock('@/sanity/lib/writeClient', () => ({
  getWriteClient: () => ({create: createMock, assets: {upload: vi.fn()}}),
}))
vi.mock('@/sanity/forms/captcha/index', () => ({getCaptchaProvider: () => null}))

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

  it('errors when the form cannot be found', async () => {
    fetchMock.mockResolvedValue({data: null})
    const submitForm = await loadAction()
    const state = await submitForm({status: 'idle'}, baseForm())
    expect(state.status).toBe('error')
    expect(createMock).not.toHaveBeenCalled()
  })
})
```

> Note: the test mocks `@/sanity/lib/live` (the action fetches the form via `sanityFetch`, consistent with the rest of the app). It stubs `Date.now` for the timing check — allowed in app code (only Workflow scripts forbid it).

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- submitForm`
Expected: FAIL — `../submitForm` not found.

- [ ] **Step 4: Implement the action**

Create `frontend/app/actions/submitForm.ts`:
```ts
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
```

> Note on `redirect()`: it throws a Next.js control-flow signal, so it must be called **outside** any try/catch and after the write. The success tests use `successBehavior.type === 'message'`, so `redirect()` isn't exercised in unit tests — verify redirect behavior manually in Task 22.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- submitForm`
Expected: PASS (5 cases).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/actions/submitForm.ts frontend/sanity/forms/mapFormDef.ts frontend/app/actions/__tests__/submitForm.test.ts
git commit -m "feat(forms): add submit Server Action with validation, spam, and file upload"
```

---

### Task 16: Field input components + dispatcher + stories

**Files:**
- Create: `frontend/components/forms/fields/TextInputField.tsx`
- Create: `frontend/components/forms/fields/TextareaField.tsx`
- Create: `frontend/components/forms/fields/SelectField.tsx`
- Create: `frontend/components/forms/fields/RadioField.tsx`
- Create: `frontend/components/forms/fields/MultiSelectField.tsx`
- Create: `frontend/components/forms/fields/ConsentField.tsx`
- Create: `frontend/components/forms/fields/FileField.tsx`
- Create: `frontend/components/forms/fields/HtmlField.tsx`
- Create: `frontend/components/forms/fields/FieldRenderer.tsx`
- Create: `frontend/components/forms/fields/FieldRenderer.stories.tsx`

**Interfaces:**
- Consumes: `FieldProps`, `FormFieldDef` from `@/sanity/forms/types`; existing `PortableText` component for `html`.
- Produces: `FieldRenderer` — dispatches a `FormFieldDef` to the correct input, rendering `name={field.name}` so the Server Action's `FormData` keys match. Each input surfaces `error` and `helpText`.

All field components are presentational (no `'use client'` needed on their own — they render standard inputs; the client boundary is `FormRenderer` in Task 18). Match Tailwind idioms from `Cta.tsx`.

- [ ] **Step 1: Shared label wrapper + text input**

Create `frontend/components/forms/fields/TextInputField.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'

const INPUT_TYPE: Record<string, string> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  url: 'url',
  time: 'time',
}

export function FieldShell({
  field,
  error,
  children,
}: FieldProps & {children: React.ReactNode}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={field.name} className="text-sm font-medium">
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {field.helpText ? <p className="text-xs opacity-70">{field.helpText}</p> : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default function TextInputField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <input
        id={field.name}
        name={field.name}
        type={INPUT_TYPE[field.fieldType] ?? 'text'}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        aria-invalid={error ? true : undefined}
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
      />
    </FieldShell>
  )
}
```

- [ ] **Step 2: Textarea**

Create `frontend/components/forms/fields/TextareaField.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function TextareaField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <textarea
        id={field.name}
        name={field.name}
        rows={4}
        required={field.required}
        minLength={field.minLength}
        maxLength={field.maxLength}
        aria-invalid={error ? true : undefined}
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
      />
    </FieldShell>
  )
}
```

- [ ] **Step 3: Select**

Create `frontend/components/forms/fields/SelectField.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function SelectField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <select
        id={field.name}
        name={field.name}
        required={field.required}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
      >
        <option value="" disabled>
          Select…
        </option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
```

- [ ] **Step 4: Radio**

Create `frontend/components/forms/fields/RadioField.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function RadioField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <div className="flex flex-col gap-1">
        {(field.options ?? []).map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <input type="radio" name={field.name} value={opt.value} required={field.required} />
            {opt.label}
          </label>
        ))}
      </div>
    </FieldShell>
  )
}
```

- [ ] **Step 5: Multi-select (checkbox group)**

Create `frontend/components/forms/fields/MultiSelectField.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function MultiSelectField({field, error}: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <div className="flex flex-col gap-1">
        {(field.options ?? []).map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={field.name} value={opt.value} />
            {opt.label}
          </label>
        ))}
      </div>
    </FieldShell>
  )
}
```

- [ ] **Step 6: Consent**

Create `frontend/components/forms/fields/ConsentField.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'

export default function ConsentField({field, error}: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name={field.name}
          value="true"
          required={field.required}
          aria-invalid={error ? true : undefined}
          className="mt-1"
        />
        <span>{field.consentLabel || field.label}</span>
      </label>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 7: File**

Create `frontend/components/forms/fields/FileField.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'
import {FieldShell} from './TextInputField'

export default function FileField({field, error}: FieldProps) {
  const accept = (field.allowedTypes ?? []).join(',')
  return (
    <FieldShell field={field} error={error}>
      <input
        id={field.name}
        name={field.name}
        type="file"
        required={field.required}
        accept={accept || undefined}
        aria-invalid={error ? true : undefined}
        className="text-sm"
      />
    </FieldShell>
  )
}
```

- [ ] **Step 8: HTML (display only)**

Create `frontend/components/forms/fields/HtmlField.tsx`:
```tsx
import type {PortableTextBlock} from 'next-sanity'
import PortableText from '@/components/PortableText'
import type {FieldProps} from '@/sanity/forms/types'

export default function HtmlField({field}: FieldProps) {
  if (!field.content) return null
  return <PortableText value={field.content as PortableTextBlock[]} />
}
```

- [ ] **Step 9: Dispatcher**

Create `frontend/components/forms/fields/FieldRenderer.tsx`:
```tsx
import type {FieldProps} from '@/sanity/forms/types'
import TextInputField from './TextInputField'
import TextareaField from './TextareaField'
import SelectField from './SelectField'
import RadioField from './RadioField'
import MultiSelectField from './MultiSelectField'
import ConsentField from './ConsentField'
import FileField from './FileField'
import HtmlField from './HtmlField'

export default function FieldRenderer({field, error}: FieldProps) {
  switch (field.fieldType) {
    case 'textarea':
      return <TextareaField field={field} error={error} />
    case 'select':
      return <SelectField field={field} error={error} />
    case 'radio':
      return <RadioField field={field} error={error} />
    case 'multiSelect':
      return <MultiSelectField field={field} error={error} />
    case 'consent':
      return <ConsentField field={field} error={error} />
    case 'file':
      return <FileField field={field} error={error} />
    case 'html':
      return <HtmlField field={field} error={error} />
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'time':
    default:
      return <TextInputField field={field} error={error} />
  }
}
```

- [ ] **Step 10: Story covering the field types**

Create `frontend/components/forms/fields/FieldRenderer.stories.tsx`:
```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'
import FieldRenderer from './FieldRenderer'
import type {FormFieldDef} from '@/sanity/forms/types'

const meta = {title: 'Forms/FieldRenderer', component: FieldRenderer} satisfies Meta<typeof FieldRenderer>
export default meta
type Story = StoryObj<typeof meta>

const base = (over: Partial<FormFieldDef>): FormFieldDef => ({
  _key: 'k',
  label: 'Field',
  name: 'field',
  fieldType: 'text',
  ...over,
})

export const Text: Story = {args: {field: base({label: 'Full name', required: true})}}
export const Email: Story = {args: {field: base({label: 'Email', name: 'email', fieldType: 'email', required: true})}}
export const Textarea: Story = {args: {field: base({label: 'Message', name: 'message', fieldType: 'textarea'})}}
export const Select: Story = {
  args: {field: base({label: 'Topic', name: 'topic', fieldType: 'select', options: [{label: 'Sales', value: 'sales'}, {label: 'Support', value: 'support'}]})},
}
export const Consent: Story = {
  args: {field: base({label: 'Consent', name: 'consent', fieldType: 'consent', required: true, consentLabel: 'I agree to the terms.'})},
}
export const WithError: Story = {args: {field: base({label: 'Email', name: 'email', fieldType: 'email'}), error: 'Please enter a valid email address.'}}
```

- [ ] **Step 11: Type-check and lint**

Run: `npm run type-check --workspace=frontend && npm run lint`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add frontend/components/forms/fields
git commit -m "feat(forms): add field input components, dispatcher, and stories"
```

---

### Task 17: Client CAPTCHA — script loader + token hook

**Files:**
- Create: `frontend/components/forms/captchaClient.ts`
- Create: `frontend/components/forms/useCaptchaToken.ts`

**Interfaces:**
- Produces:
  - `loadCaptchaScript(provider, siteKey): Promise<void>` — injects the provider's script once.
  - `useCaptchaToken(): {token: string; provider: string | null}` — reads public env, loads the script, keeps a fresh token.

Reads `NEXT_PUBLIC_CAPTCHA_PROVIDER`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. When no provider is configured, the hook returns `{token: '', provider: null}` and injects nothing.

> These use browser globals (`grecaptcha`, `turnstile`) that only exist after the script loads, and require live keys to fully exercise — verify against real keys in Task 22. Keep the implementation defensive (no throw when globals are absent).

- [ ] **Step 1: Script loader**

Create `frontend/components/forms/captchaClient.ts`:
```ts
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
```

- [ ] **Step 2: Token hook**

Create `frontend/components/forms/useCaptchaToken.ts`:
```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check --workspace=frontend`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/forms/captchaClient.ts frontend/components/forms/useCaptchaToken.ts
git commit -m "feat(forms): add client CAPTCHA script loader and token hook"
```

---

### Task 18: FormRenderer (client) + story

**Files:**
- Create: `frontend/components/forms/FormRenderer.tsx`
- Create: `frontend/components/forms/FormRenderer.stories.tsx`

**Interfaces:**
- Consumes: `submitForm`/`FormState`, `FieldRenderer`, `useCaptchaToken`, `HONEYPOT_FIELD`, `validateSubmission`, `FormDef`.
- Produces: `<FormRenderer form={FormDef} />` — the client form wired to the Server Action via `useActionState`, including honeypot, render-timestamp, CAPTCHA token, per-field errors, and success handling.

- [ ] **Step 1: Implement FormRenderer**

Create `frontend/components/forms/FormRenderer.tsx`:
```tsx
'use client'

import {useActionState, useRef, useState} from 'react'
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
  const renderedAt = useRef<number>(Date.now())
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
      <input type="hidden" name="_renderedAt" value={renderedAt.current} />
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
```

- [ ] **Step 2: Story**

Create `frontend/components/forms/FormRenderer.stories.tsx`:
```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'
import FormRenderer from './FormRenderer'
import type {FormDef} from '@/sanity/forms/types'

const form: FormDef = {
  _id: 'form-1',
  title: 'Contact us',
  captchaEnabled: false,
  successBehavior: {type: 'message', message: 'Thanks!'},
  fields: [
    {_key: '1', label: 'Full name', name: 'name', fieldType: 'text', required: true},
    {_key: '2', label: 'Email', name: 'email', fieldType: 'email', required: true},
    {_key: '3', label: 'Message', name: 'message', fieldType: 'textarea', required: true},
    {_key: '4', label: 'Consent', name: 'consent', fieldType: 'consent', required: true, consentLabel: 'I agree to be contacted.'},
  ],
}

const meta = {title: 'Forms/FormRenderer', component: FormRenderer} satisfies Meta<typeof FormRenderer>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {args: {form}}
```

> Note: the story renders the form bound to the real Server Action; submitting inside Storybook won't reach a server, which is fine for visual/a11y review. The submit path is covered by the Task 15 unit tests.

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check --workspace=frontend && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/forms/FormRenderer.tsx frontend/components/forms/FormRenderer.stories.tsx
git commit -m "feat(forms): add client FormRenderer wired to the submit Server Action"
```

---

### Task 19: FormBlock + BlockRenderer registration

**Files:**
- Create: `frontend/components/forms/FormBlock.tsx`
- Modify: `frontend/components/BlockRenderer.tsx` (register `formBlock`)

**Interfaces:**
- Consumes: the `formBlock` GROQ projection (Task 14), `FormRenderer` (Task 18), `mapFormDef` (Task 15).
- Produces: a block component keyed `formBlock` in `BlockRenderer`'s `Blocks` map.

- [ ] **Step 1: Implement FormBlock**

Create `frontend/components/forms/FormBlock.tsx`:
```tsx
import {mapFormDef} from '@/sanity/forms/mapFormDef'
import FormRenderer from './FormRenderer'

// The page GROQ query dereferences `form->{...}`, so the resolved form arrives on the block.
type FormBlockProps = {
  block: {_type: 'formBlock'; _key: string; form?: unknown}
}

export default function FormBlock({block}: FormBlockProps) {
  const form = mapFormDef(block.form)
  // CMS-backed: render nothing when the block has no form yet.
  if (!form || form.fields.length === 0) return null
  return <FormRenderer form={form} />
}
```

- [ ] **Step 2: Register in BlockRenderer**

In `frontend/components/BlockRenderer.tsx`, add the import and map entry. After the existing component imports:
```tsx
import FormBlock from '@/components/forms/FormBlock'
```
Then extend the `Blocks` map:
```tsx
const Blocks = {
  callToAction: Cta,
  infoSection: Info,
  heroSecondary: HeroSecondary,
  formBlock: FormBlock,
} as BlocksType
```

> Note: `BlockRenderer`'s `BlockProps.block` is typed as `PageBuilderSection`. If TypeScript complains that `FormBlock`'s narrower prop type is incompatible with `React.FC<BlockProps>`, widen `FormBlock` to accept `BlockProps` and narrow inside (`const block = props.block as ...`), mirroring however the other blocks satisfy the map. Verify against the generated `PageBuilderSection` union (now includes the `formBlock` variant after Task 14).

- [ ] **Step 3: Type-check, lint, and build**

Run: `npm run type-check --workspace=frontend && npm run lint && npm run build --workspace=frontend`
Expected: PASS. (If the pre-existing `/_global-error` prerender failure documented in `docs/deferred-work.md` still occurs, confirm it is that same unrelated failure and not something this task introduced.)

- [ ] **Step 4: Commit**

```bash
git add frontend/components/forms/FormBlock.tsx frontend/components/BlockRenderer.tsx
git commit -m "feat(forms): render forms in the page builder via FormBlock"
```

---

### Task 20: Raise the Server Action body-size limit for uploads

**Files:**
- Modify: `frontend/next.config.ts`

**Interfaces:**
- Produces: a `serverActions.bodySizeLimit` large enough for file uploads (default is 1 MB, below the schema's default 10 MB per-file limit).

- [ ] **Step 1: Update the Next config**

Edit `frontend/next.config.ts` to add the `experimental.serverActions` config:
```ts
import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://cdn.sanity.io/**')],
  },
  experimental: {
    serverActions: {
      // Must cover the largest form file field (schema default is 10 MB) plus overhead.
      bodySizeLimit: '12mb',
    },
  },
}

export default nextConfig
```

> Before finalizing, confirm the option's location/name for this Next version by checking `node_modules/next/dist/docs/` (search for `bodySizeLimit`). If it has moved out of `experimental`, follow the doc. This is the AGENTS.md "read the docs before writing Next.js code" rule.

- [ ] **Step 2: Build to confirm the config is accepted**

Run: `npm run build --workspace=frontend`
Expected: no config warning about an unknown key for `serverActions`. (Same pre-existing `/_global-error` caveat as Task 19.)

- [ ] **Step 3: Commit**

```bash
git add frontend/next.config.ts
git commit -m "chore(forms): raise Server Action body-size limit for file uploads"
```

---

### Task 21: Environment-variable docs + `.env.example` updates

**Files:**
- Create: `docs/environment-variables.md`
- Modify: `frontend/.env.example` (append new keys)

**Interfaces:**
- Produces: the doc `AGENTS.md` already links to (currently a dead link), documenting every env var including the new ones.

- [ ] **Step 1: Write the env doc**

Create `docs/environment-variables.md`:
```markdown
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
```

- [ ] **Step 2: Append the new keys to `.env.example`**

Append to `frontend/.env.example` (create it if it doesn't exist), matching the existing `KEY=` style:
```bash
# Form submissions (server-only write token; Editor scope)
SANITY_API_WRITE_TOKEN=

# Spam protection — CAPTCHA (recaptcha | turnstile | none)
NEXT_PUBLIC_CAPTCHA_PROVIDER=none
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

> The `.env.example` files are read-blocked by this session's tooling; open it yourself to confirm the existing comment/format style before appending, so the additions match.

- [ ] **Step 3: Commit**

```bash
git add docs/environment-variables.md frontend/.env.example
git commit -m "docs(forms): document env vars and add form/CAPTCHA keys to .env.example"
```

---

### Task 22: Deferred-work entry, full verification, and manual QA

**Files:**
- Modify: `docs/deferred-work.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a green repo, a logged deferred-work entry, and manual confirmation of the paths unit tests can't cover (redirect success, live CAPTCHA, real file upload).

- [ ] **Step 1: Log deferred work**

Append to `docs/deferred-work.md`:
```markdown
## Form builder — phases 2 & 3 (deferred)

Phase 1 (core form system) shipped — see
[docs/superpowers/specs/2026-07-21-form-builder-phase1-design.md](superpowers/specs/2026-07-21-form-builder-phase1-design.md).
Deferred:

- **Phase 2 — mailing/notification layer:** pluggable submission routing (SMTP + other
  providers), per-form destination choice beyond "store in Sanity", notification emails.
- **Phase 3 — abandonment tracking:** partial-submission capture, resume links, reminder emails.
- **Rate limiting:** only honeypot + timing + CAPTCHA today; add IP/edge throttling if spam persists.

## Stale AGENTS.md docs index

The AGENTS.md Docs index links several files that don't exist (`docs/design-system.md`,
`docs/component-organization.md`, `docs/stack.md`, `docs/sanity-typegen.md`, and others), and the
Definition of Done cites scripts that don't exist (`npm run test-storybook`, `npm run lint:tokens`).
`docs/environment-variables.md` was created by the form-builder work; the rest remain to be either
written or removed from the index. Flagged for the user to decide.
```

- [ ] **Step 2: Run the full test + quality gate**

Run from repo root:
```bash
npm run test --workspace=frontend
npm run lint
npm run type-check
npm run build --workspace=frontend
```
Expected: tests PASS; lint PASS; type-check PASS; build succeeds (or fails only on the pre-existing, documented `/_global-error` prerender issue — confirm it's unchanged and unrelated).

- [ ] **Step 3: Manual QA in the running app**

Only the browser can confirm these (unit tests mock them). Start the dev server via the preview tools (not raw `npm run dev`), create a `form` document in Studio with a few field types + a file field, add a `formBlock` to a page, then verify:
- The form renders with all field types and the honeypot is not visible.
- A valid submission creates a `formSubmission` document in Studio (browse the read-only list).
- `successBehavior: redirect` navigates to the URL; `message` shows the message.
- A too-fast/honeypot submission is rejected.
- A file upload within limits attaches; an oversize/disallowed file is rejected server-side.
- If a CAPTCHA provider + keys are configured, a submission passes; verify the score/provider in `spamMeta`.

Stop the dev server when done (`preview_stop`). Fix any issues by editing source and re-verifying.

- [ ] **Step 4: Final commit**

```bash
git add docs/deferred-work.md
git commit -m "docs(forms): log deferred phases 2/3 and stale-docs note"
```

---

## Self-Review (completed during authoring)

- **Spec coverage:** editor form building (Tasks 9–12), all field types incl. file with per-field limits (Tasks 9, 7, 16), reusable form + page-builder block (Tasks 11, 14, 19), Server Action handler (Task 15), honeypot + timing + pluggable CAPTCHA/global setting (Tasks 4, 5, 15, 17), always-store-in-Sanity via write client (Tasks 8, 15), configurable success message/redirect (Tasks 10, 15, 18), client + server validation (Tasks 3, 16, 18), TypeGen (Task 13), Vitest (Task 1), write token/client (Task 8), env doc (Task 21), body-size limit (Task 20), no-create submissions (Task 12), deferred work (Task 22). All spec sections map to tasks.
- **Type consistency:** `FormState`, `FormFieldDef`, `SpamMeta`, `SubmissionFileRef`, `CaptchaProvider`, `getWriteClient`, `getCaptchaProvider`, `HONEYPOT_FIELD`, `mapFormDef`, `validateSubmission`, `buildSubmissionDoc`, `extractValues/extractFiles/validateFile` are defined once and referenced with the same signatures across tasks.
- **No placeholders:** every code step contains real code; every test step has assertions and a run command with expected result.
```