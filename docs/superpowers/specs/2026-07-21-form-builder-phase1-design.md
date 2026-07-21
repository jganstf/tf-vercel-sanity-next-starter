# General Form Builder — Phase 1: Core Form System — Design

## Goal
Let editors build and edit forms in Sanity Studio (fields, labels, validation), embed them into any page via the existing `PageBuilder`/`BlockRenderer`, and have submissions land as Sanity documents — with spam protection on by default. This is phase 1 of a larger effort; the mailing/notification layer (phase 2) and abandoned-submission tracking (phase 3) are explicitly out of scope here.

## Studio schema

Forms are **reusable documents** referenced from pages via a thin page-builder block, so one form can appear on multiple pages.

New object type `formBlock` (`studio/src/schemaTypes/objects/formBlock.ts`) — the page-builder entry:
- `form` (reference to `form`, required) — which form to render here.
- Registered in `page.ts`'s `pageBuilder.of` array alongside `callToAction`/`infoSection`/`heroSecondary`, and keyed as `formBlock` in `BlockRenderer.tsx`.

New document type `form` (`studio/src/schemaTypes/documents/form.ts`):
- `title` (string, required) — internal/admin label.
- `fields` (array of `formField` objects, required, min 1).
- `captchaEnabled` (boolean, default true) — per-form opt-out of the site's CAPTCHA if ever needed.
- `successBehavior` (object): `type` (`'message' | 'redirect'`), `message` (text, shown when type is `message`), `redirectUrl` (url, shown when type is `redirect`) — conditional visibility via `hidden` callbacks on the two value fields.

New object type `formField` (`studio/src/schemaTypes/objects/formField.ts`):
- `label` (string, required).
- `name` (string, required) — machine key used as the submission's field key; validated as a slug-safe identifier, unique within the form (custom validation checking sibling `fields`).
- `fieldType` (string, required) — one of: `text`, `email`, `phone`, `textarea`, `url`, `time`, `select`, `multiSelect`, `radio`, `consent`, `html`, `file`.
- `required` (boolean).
- `helpText` (string, optional).
- Type-specific fields, shown conditionally via `hidden` based on `fieldType`:
  - `text` / `textarea`: `minLength`, `maxLength`.
  - `select` / `multiSelect` / `radio`: `options` (array of `{label, value}`).
  - `html`: `content` (array of portable text blocks) — display-only, never part of submitted values.
  - `consent`: `consentLabel` (string) — the text next to the checkbox, e.g. "I agree to the [Terms]".
  - `file`: `maxSizeMb` (number), `allowedTypes` (array of string MIME types or extensions).
- `preview`: title from `label`, subtitle from `fieldType`.

New document type `formSubmission` (`studio/src/schemaTypes/documents/formSubmission.ts`) — created only by the server, never manually by editors:
- `form` (reference to `form`, required).
- `submittedAt` (datetime, required).
- `values` (array of `{fieldName, value}` pairs — stored generically since field sets vary per form).
- `files` (array of file/image asset references, for any `file`-type fields).
- `spamMeta` (object): `captchaProvider` (string), `captchaScore` (number, provider-dependent — reCAPTCHA v3 returns a score, Turnstile does not), `honeypotTriggered` (boolean), `timeToSubmitMs` (number) — kept for auditing/tuning, not shown as actionable UI fields.
- Studio: not creatable and not editable by hand — editors browse/inspect submissions but the server is the only author. The repo has **no existing precedent** for a create-disabled-but-listed document type, so this is a new pattern: implemented via `sanity.config.ts` `document.newDocumentOptions` (remove `formSubmission` from the global "＋ Create" menu) + `document.actions` (strip `duplicate`/`publish` etc.), plus `readOnly: true` on the schema fields, and a `formSubmission` list item in `studio/src/structure/index.ts` for browsing. Document this pattern inline in `sanity.config.ts` with a comment.

All four new types (`formBlock`, `form`, `formField`, `formSubmission`) get registered in `studio/src/schemaTypes/index.ts`. Note: the existing `DISABLED_TYPES` list in `structure/index.ts` only removes types from the auto-generated desk list (used for true singletons rendered via explicit `S.listItem()`); it does **not** disable document creation. Preventing creation of `formSubmission` is handled by the `sanity.config.ts` `document.newDocumentOptions`/`actions` overrides described above, not by `DISABLED_TYPES`.

## Frontend

**Block registration**: a `FormBlock` component registered in `frontend/components/BlockRenderer.tsx`'s `Blocks` map keyed to the `formBlock` `_type`, matching the `formBlock` entry in `page.ts`'s `pageBuilder.of` array. Form components live under a new `frontend/components/forms/` directory (existing simple blocks like `Cta.tsx` live flat in `components/`; the form system has enough files — renderer, field components, hooks — to warrant its own folder).

**Rendering**: the form data is dereferenced in the page's GROQ query (the `formBlock` projection expands `form->{...}` with fields, captcha flag, success behavior), so `FormBlock` receives the resolved form as a prop from `BlockRenderer` — no separate client fetch. `FormBlock` renders a `FormRenderer` client component that:
- Maps each `formField` to the matching input component (one small component per `fieldType`, e.g. `TextField`, `SelectField`, `ConsentField`, `FileField`).
- Applies client-side validation per field (`required`, `minLength`/`maxLength`, pattern checks for `email`/`url`/`phone`) for immediate UX feedback.
- Renders the honeypot field (visually hidden, off-screen — not `display:none`, since some bots skip those) and records a form-render timestamp for the timing check.
- If `captchaEnabled` and a provider is configured, loads the configured CAPTCHA provider's script (reCAPTCHA v3 or Turnstile) and attaches a token to the submission.
- On submit, posts to the server-side handler; on success, swaps to `successBehavior.message` or navigates to `successBehavior.redirectUrl`; on failure, shows field-level or form-level errors returned by the server.

**Server-side handler**: implemented as a **Next.js Server Action** (`'use server'`), driven from the client via React's `useActionState`. This is the mechanism the repo's Next.js version prescribes for forms — confirmed by reading `node_modules/next/dist/docs/01-app/02-guides/forms.md` (which shows the `useActionState` + `FormData` pattern and server-side validation). Server Actions receive a `FormData` object natively, including uploaded `File`s. Responsibilities:
1. Re-validate every field server-side (never trust client validation) against the `form`'s field definitions.
2. Reject if honeypot field is non-empty, or if time-to-submit is below a minimum threshold (default 1.5s, tunable).
3. If `captchaEnabled` and a CAPTCHA provider is configured, verify the token server-side against the active provider's verify endpoint using its secret key; reject or flag based on the result (for reCAPTCHA v3, a score threshold, default 0.5).
4. Validate any uploaded files against that field's `maxSizeMb`/`allowedTypes` before accepting; upload passing files as Sanity assets.
5. Write a `formSubmission` document via a dedicated server-only Sanity **write client** (see Dependencies), including `spamMeta`.
6. Return a `FormState` result (field-level error messages on validation failure, generic message on spam rejection so bots don't learn the detection logic, success payload otherwise).

> **Note — Server Action body size limit:** file uploads can exceed Next.js's default Server Action body size limit (1 MB). `next.config` must set `serverActions.bodySizeLimit` high enough to accommodate the largest configured `maxSizeMb` (plus overhead). This is a config change flagged in the plan.

## Spam protection
Three layers. Honeypot and timing are always on and free; the CAPTCHA layer is a pluggable provider abstraction.

- **Honeypot**: hidden input, bots fill it, humans don't — server rejects if non-empty.
- **Timing check**: server compares submission time against a render timestamp submitted with the form; too-fast submissions are rejected.
- **CAPTCHA (pluggable provider)**: supports **Google reCAPTCHA v3** and **Cloudflare Turnstile** behind a common `CaptchaProvider` interface (`verify(token) => {success, score?}`). The active provider is chosen by a **global site setting** — the `NEXT_PUBLIC_CAPTCHA_PROVIDER` env var (`'recaptcha' | 'turnstile' | 'none'`, default `'none'`) — one provider site-wide, not per-form. Per-form, `captchaEnabled` can still opt an individual form out.
  - **No new runtime dependency**: both providers are integrated by injecting the provider's own script client-side (no npm wrapper package) and verifying server-side with a plain `fetch` to the provider's siteverify endpoint. This supersedes the earlier plan to add `react-google-recaptcha-v3` — a single-provider wrapper doesn't fit a two-provider abstraction, and manual injection keeps the dependency count at zero, consistent with AGENTS.md's minimize-dependencies rule. *(If the user prefers the official wrapper for reCAPTCHA specifically, that's a reversible swap — flagged for their call.)*
  - **External setup (flag to user):** whichever provider(s) they enable require a site registration outside this repo (Google reCAPTCHA admin console and/or Cloudflare Turnstile dashboard) to obtain site + secret keys. Site keys are public (`NEXT_PUBLIC_*`), secret keys are server-only — both set in `.env.local` locally and in Vercel for deployment.

## File uploads
- Per-field `maxSizeMb` and `allowedTypes`, set by editors in Studio.
- Server validates both before writing the Sanity asset — client-side checks are UX-only, never trusted for enforcement.
- Stored as Sanity asset references on the `formSubmission.files` array, each tagged with which field it came from.

## Validation summary
- Every rule (`required`, length, pattern, file size/type) is defined once on the `formField`/`form` schema and enforced twice: client (UX) and server (security). No rule lives only on the client.

## Dependencies & infrastructure decisions
- **Sanity write client (new):** the repo has only a read client (`frontend/sanity/lib/client.ts`) and a read token (`frontend/sanity/lib/token.ts`, `SANITY_API_READ_TOKEN`). The submission handler needs write access, so add a **new server-only write client** `frontend/sanity/lib/writeClient.ts` (mirrors `token.ts`'s `import 'server-only'` + missing-var assertion, `useCdn: false`) backed by a **new `SANITY_API_WRITE_TOKEN`**. The user generates a write-scoped token in the Sanity manage dashboard and sets it in `.env.local` + Vercel (external step).
- **Test framework (new devDependency):** the repo has no server-side test runner (only Storybook). Add **Vitest** (dev-only) so the security-critical pure logic — validation, spam checks, CAPTCHA verification, submission mapping — is unit-tested test-first. UI components continue to get `*.stories.tsx`.
- **No new runtime dependencies:** validation is schema-driven (a small custom module interpreting the `formField` defs), so no `zod`/`react-hook-form`. CAPTCHA uses manual script injection + `fetch` (see Spam protection). Net new runtime deps for phase 1: **zero**.

## Documentation note (stale AGENTS.md index)
Several docs linked from `AGENTS.md`'s Docs index **do not exist** in the repo today: `docs/environment-variables.md`, `docs/component-organization.md`, `docs/design-system.md`, `docs/stack.md`, `docs/sanity-typegen.md`, and others. Likewise the Definition of Done cites scripts that don't exist (`npm run test-storybook`, `npm run lint:tokens`). This spec's plan **creates `docs/environment-variables.md`** (needed for the new env vars) but treats the other missing docs as out of scope — flag the broader stale-index problem to the user separately. Verification in the plan relies only on scripts that actually exist (`npm run build`, `npm run lint`, `npm run type-check`) plus the new `vitest run`.

## TypeGen
After adding `form`, `formField`, and `formSubmission` schemas, regenerate `sanity.types.ts` via `npm run sanity:typegen --workspace=frontend` (extracts `sanity.schema.json` from the Studio, then runs typegen) so `formQuery` and the submission-writing code get generated types.

## Out of scope (phase 1)
Logged in `docs/deferred-work.md` with a pointer back to this spec:
- Mailing/notification routing (SMTP or otherwise) on submission — phase 2.
- Per-form choice of submission destination beyond "always store in Sanity" — phase 2.
- Abandoned/partial submission capture and recovery emails — phase 3.
- Rate limiting beyond honeypot/timing/CAPTCHA (e.g. IP-based throttling) — revisit if spam persists after phase 1 ships.
