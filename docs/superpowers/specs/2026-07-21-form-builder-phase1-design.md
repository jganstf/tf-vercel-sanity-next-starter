# General Form Builder — Phase 1: Core Form System — Design

## Goal
Let editors build and edit forms in Sanity Studio (fields, labels, validation), embed them into any page via the existing `PageBuilder`/`BlockRenderer`, and have submissions land as Sanity documents — with spam protection on by default. This is phase 1 of a larger effort; the mailing/notification layer (phase 2) and abandoned-submission tracking (phase 3) are explicitly out of scope here.

## Studio schema

New document type `form` (`studio/src/schemaTypes/documents/form.ts`):
- `title` (string, required) — internal/admin label.
- `fields` (array of `formField` objects, required, min 1).
- `captchaEnabled` (boolean, default true) — per-form opt-out of reCAPTCHA if ever needed.
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
- `spamMeta` (object): `recaptchaScore` (number), `honeypotTriggered` (boolean), `timeToSubmitMs` (number) — kept for auditing/tuning, not shown as actionable UI fields.
- Studio: read-only in the desk structure (no create button; editors browse/inspect but don't hand-author these) — matches how generated/system content is handled elsewhere in this repo (confirm against any existing read-only-collection pattern before implementing; if none exists yet, this is a new pattern worth a short note in `docs/component-organization.md` or wherever schema conventions are documented).

Both `form` and `formSubmission` get registered in `studio/src/schemaTypes/index.ts`; `formSubmission` added to whatever `DISABLED_TYPES`-equivalent list keeps it out of the normal "create new" flow if such a mechanism exists (confirm current mechanism during implementation — don't assume `DISABLED_TYPES` from the footer spec covers document creation, not just desk-list visibility).

## Frontend

**Block registration**: a `FormBlock` component (`frontend/components/blocks/FormBlock.tsx` or wherever the existing block components live) registered in `BlockRenderer.tsx` alongside other block types, keyed to the `form` reference type in the page builder's array.

**Rendering**: `FormBlock` fetches the referenced `form` document (fields, captcha flag, success behavior) via a `formQuery` (mirrors the singleton-fetch pattern used for `footerQuery`/`settingsQuery`), then renders a `FormRenderer` client component that:
- Maps each `formField` to the matching input component (one small component per `fieldType`, e.g. `TextField`, `SelectField`, `ConsentField`, `FileField`).
- Applies client-side validation per field (`required`, `minLength`/`maxLength`, pattern checks for `email`/`url`/`phone`) for immediate UX feedback.
- Renders the honeypot field (visually hidden, off-screen — not `display:none`, since some bots skip those) and records a form-render timestamp for the timing check.
- If `captchaEnabled`, loads reCAPTCHA v3 and attaches a token to the submission.
- On submit, posts to the server-side handler; on success, swaps to `successBehavior.message` or navigates to `successBehavior.redirectUrl`; on failure, shows field-level or form-level errors returned by the server.

**Server-side handler**: exact mechanism (Route Handler vs. Server Action vs. whatever this Next.js version's non-standard convention is) TBD during implementation — implementer must read `node_modules/next/dist/docs/` first per AGENTS.md before choosing. Responsibilities, regardless of mechanism:
1. Re-validate every field server-side (never trust client validation) against the `form`'s field definitions.
2. Reject if honeypot field is non-empty, or if time-to-submit is below a minimum threshold (e.g. 1.5s — exact value tunable during implementation).
3. If `captchaEnabled`, verify the reCAPTCHA v3 token server-side against Google's verify endpoint using a secret key; reject or flag based on score threshold (exact threshold tunable during implementation, e.g. 0.5).
4. Validate any uploaded files against that field's `maxSizeMb`/`allowedTypes` before accepting.
5. Write a `formSubmission` document via the Sanity write client (server-side only — write token never exposed to the client), including `spamMeta`.
6. Return a success/failure response (field-level error messages on validation failure, generic message on spam rejection so bots don't learn the detection logic).

## Spam protection
- **Honeypot**: hidden input, bots fill it, humans don't — server rejects if non-empty.
- **Timing check**: server compares submission time against a render timestamp submitted with the form; too-fast submissions are rejected.
- **reCAPTCHA v3**: score-based, invisible to users. New dependency (e.g. `react-google-recaptcha-v3` client-side; server-side verification is a plain fetch, no dependency needed there) — **requires explicit sign-off before adding**, plus site key (public, `.env.local` + Vercel) and secret key (server-only, `.env.local` + Vercel, never committed) per `docs/environment-variables.md` conventions. This is an external-dependency item to flag to the user at implementation time: a Google reCAPTCHA site registration is needed outside this codebase.

## File uploads
- Per-field `maxSizeMb` and `allowedTypes`, set by editors in Studio.
- Server validates both before writing the Sanity asset — client-side checks are UX-only, never trusted for enforcement.
- Stored as Sanity asset references on the `formSubmission.files` array, each tagged with which field it came from.

## Validation summary
- Every rule (`required`, length, pattern, file size/type) is defined once on the `formField`/`form` schema and enforced twice: client (UX) and server (security). No rule lives only on the client.

## TypeGen
After adding `form`, `formField`, and `formSubmission` schemas, regenerate `sanity.types.ts` via the Studio's typegen command per `docs/sanity-typegen.md` so `formQuery` and the submission-writing code get generated types.

## Out of scope (phase 1)
Logged in `docs/deferred-work.md` with a pointer back to this spec:
- Mailing/notification routing (SMTP or otherwise) on submission — phase 2.
- Per-form choice of submission destination beyond "always store in Sanity" — phase 2.
- Abandoned/partial submission capture and recovery emails — phase 3.
- Rate limiting beyond honeypot/timing/reCAPTCHA (e.g. IP-based throttling) — revisit if spam persists after phase 1 ships.
