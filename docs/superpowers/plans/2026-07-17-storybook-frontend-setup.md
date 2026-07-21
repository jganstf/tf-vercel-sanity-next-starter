# Storybook Frontend Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Storybook to the `frontend` npm workspace, configured for Next.js 16 (App Router) + Tailwind v4 + React 19, with stories for the 12 existing presentational components identified as Tier 1 in the design spec.

**Architecture:** Install `@storybook/nextjs` (the official Next.js framework for Storybook) inside `frontend/` via the `storybook@latest init` CLI, which auto-detects the Next.js project, wires up the `@/*` path alias from `frontend/tsconfig.json`, and mocks `next/font/google`, `next/navigation`, and `next/image`. Import `frontend/app/globals.css` in `.storybook/preview.tsx` so Tailwind styles and custom fonts/colors apply. Each component gets a co-located `*.stories.tsx` file using realistic mock data typed against the existing generated Sanity types (`frontend/sanity.types.ts`, `frontend/sanity/lib/types.ts`) — no network calls, no real Sanity project required.

**Tech Stack:** Storybook 10.x, `@storybook/nextjs` framework, React 19, Next.js 16, Tailwind CSS v4, TypeScript.

## Global Constraints

- Storybook config and stories live entirely inside `frontend/` — do not touch the repo root `package.json` or `turbo.json`.
- No story may depend on a live network call (no real `cdn.sanity.io` image fetches, no real `sanityFetch`/GROQ calls) — spec explicitly scopes out components that need live data (`Header`, `Posts`, `PageBuilder`, `SanityImage`).
- `frontend/sanity/lib/api.ts` throws at import time if `NEXT_PUBLIC_SANITY_DATASET` / `NEXT_PUBLIC_SANITY_PROJECT_ID` are unset — Storybook must provide these (via `.storybook/main.ts`'s `env` field) so any component that transitively imports `@/sanity/lib/api` or `@/sanity/lib/utils` doesn't crash on load, even with no `.env.local` present.
- Story mock data must satisfy the real TypeScript types (`ExtractPageBuilderType<'callToAction'>`, `InfoSection`, `DereferencedLink`, `PageBuilderSection`, `PortableTextBlock[]`) — no `any`, no type assertions to paper over shape mismatches.
- Follow existing repo conventions: no comments explaining *what* code does, Prettier formatting (`npm run format` is already configured at the root), one component per file.

---

### Task 1: Install and configure Storybook core

**Files:**
- Create: `frontend/.storybook/main.ts`
- Create: `frontend/.storybook/preview.tsx`
- Modify: `frontend/package.json` (add `storybook` / `build-storybook` scripts + devDependencies)
- Modify: `frontend/.gitignore` (ignore `storybook-static/`)

**Interfaces:**
- Produces: a working `npm run storybook --workspace=frontend` dev server and `npm run build-storybook --workspace=frontend` static build, on top of which every later task adds `*.stories.tsx` files.

- [ ] **Step 1: Run the Storybook CLI installer from `frontend/`**

Run:
```bash
cd frontend && npx storybook@latest init --yes --package-manager npm --type nextjs
```

Expected: it detects the Next.js project, installs `@storybook/nextjs`, `storybook`, and related devDependencies into `frontend/package.json`, creates `frontend/.storybook/main.ts` and `frontend/.storybook/preview.ts` (may generate example stories under `frontend/stories/` — delete that generated `stories/` directory afterward, it's not part of this plan's scope), and adds `storybook`/`build-storybook` scripts to `frontend/package.json`.

- [ ] **Step 2: Remove generated example content**

Run:
```bash
rm -rf frontend/stories
```

Expected: no `frontend/stories` directory remains (only the hand-written stories from later tasks will exist, co-located with their components).

- [ ] **Step 3: Configure `.storybook/main.ts` for the `@/*` path alias and required env vars**

Replace the contents of `frontend/.storybook/main.ts` with:

```typescript
import type {StorybookConfig} from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  env: (config) => ({
    ...config,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'storybook',
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET || 'storybook',
  }),
}

export default config
```

If `storybook init` did not install `@storybook/addon-essentials` (some recent versions bundle its addons into `@storybook/addon-a11y`/`@storybook/addon-vitest` instead), check `frontend/package.json` for whichever essentials-equivalent addon package it actually installed and use that name in the `addons` array instead — keep whatever the CLI installed, don't add a second competing addon.

- [ ] **Step 4: Configure `.storybook/preview.tsx` to load global styles**

Replace the contents of `frontend/.storybook/preview.tsx` (rename from `.ts` to `.tsx` if the CLI generated `.ts`) with:

```tsx
import type {Preview} from '@storybook/nextjs'

import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
```

- [ ] **Step 5: Add `storybook-static/` to `.gitignore`**

Append to `frontend/.gitignore`:
```
storybook-static
```

- [ ] **Step 6: Verify the dev server starts cleanly**

Run: `npm run storybook --workspace=frontend -- --ci --smoke-test`
Expected: exits 0 with no errors (smoke-test mode boots Storybook and exits without opening a browser).

- [ ] **Step 7: Commit**

```bash
git add frontend/.storybook frontend/package.json frontend/.gitignore frontend/package-lock.json
git commit -m "chore: install and configure Storybook for frontend workspace"
```

If `npm install` also touched the root `package-lock.json`, include that too:
```bash
git add package-lock.json
```

---

### Task 2: Stories for zero-prop / simple-prop components (`SideBySideIcons`, `Footer`, `DraftModeToast`, `GetStartedCode`, `Onboarding`)

**Files:**
- Create: `frontend/app/components/SideBySideIcons.stories.tsx`
- Create: `frontend/app/components/Footer.stories.tsx`
- Create: `frontend/app/components/DraftModeToast.stories.tsx`
- Create: `frontend/app/components/GetStartedCode.stories.tsx`
- Create: `frontend/app/components/Onboarding.stories.tsx`

**Interfaces:**
- Consumes: `frontend/app/components/{SideBySideIcons,Footer,DraftModeToast,GetStartedCode,Onboarding}.tsx` (all take zero props).
- Produces: nothing consumed by later tasks — this task is self-contained.

- [ ] **Step 1: `SideBySideIcons.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import SideBySideIcons from './SideBySideIcons'

const meta = {
  title: 'Components/SideBySideIcons',
  component: SideBySideIcons,
} satisfies Meta<typeof SideBySideIcons>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

- [ ] **Step 2: `Footer.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import Footer from './Footer'

const meta = {
  title: 'Components/Footer',
  component: Footer,
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

- [ ] **Step 3: `DraftModeToast.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'
import {Toaster} from 'sonner'

import DraftModeToast from './DraftModeToast'

const meta = {
  title: 'Components/DraftModeToast',
  component: DraftModeToast,
  decorators: [
    (Story) => (
      <>
        <Toaster />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof DraftModeToast>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

- [ ] **Step 4: `GetStartedCode.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import GetStartedCode from './GetStartedCode'

const meta = {
  title: 'Components/GetStartedCode',
  component: GetStartedCode,
} satisfies Meta<typeof GetStartedCode>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

- [ ] **Step 5: `Onboarding.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import Onboarding, {PageOnboarding} from './Onboarding'

const meta = {
  title: 'Components/Onboarding',
  component: Onboarding,
} satisfies Meta<typeof Onboarding>

export default meta
type Story = StoryObj<typeof meta>

export const NoPosts: Story = {}

export const NoAboutPage: Story = {
  render: () => <PageOnboarding />,
}
```

- [ ] **Step 6: Verify all five render without errors**

Run: `npm run storybook --workspace=frontend -- --ci --smoke-test`
Expected: exits 0. Then run `npm run storybook --workspace=frontend`, open the local URL, and visually confirm `Components/SideBySideIcons`, `Components/Footer`, `Components/DraftModeToast`, `Components/GetStartedCode`, `Components/Onboarding` (`NoPosts` and `NoAboutPage`) all render with Tailwind styling applied and no console errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/components/SideBySideIcons.stories.tsx frontend/app/components/Footer.stories.tsx frontend/app/components/DraftModeToast.stories.tsx frontend/app/components/GetStartedCode.stories.tsx frontend/app/components/Onboarding.stories.tsx
git commit -m "test: add Storybook stories for zero-prop components"
```

---

### Task 3: Stories for `Date` and `Avatar`

**Files:**
- Create: `frontend/app/components/Date.stories.tsx`
- Create: `frontend/app/components/Avatar.stories.tsx`

**Interfaces:**
- Consumes: `frontend/app/components/Date.tsx` (`{dateString: string | undefined}`), `frontend/app/components/Avatar.tsx` (`Props` = `{person: {firstName: string | null; lastName: string | null; picture?: {...}}; date?: string; small?: boolean}`).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: `Date.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import DateComponent from './Date'

const meta = {
  title: 'Components/Date',
  component: DateComponent,
} satisfies Meta<typeof DateComponent>

export default meta
type Story = StoryObj<typeof meta>

export const WithDate: Story = {
  args: {
    dateString: '2026-03-14T00:00:00.000Z',
  },
}

export const Undefined: Story = {
  args: {
    dateString: undefined,
  },
}
```

- [ ] **Step 2: `Avatar.stories.tsx`**

No `picture` is passed — a real `picture.asset._ref` would require a live `cdn.sanity.io` fetch, which is out of scope (see Global Constraints). Without it, `Avatar` renders its `By ` fallback, which is a legitimate, deterministic state to story.

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import Avatar from './Avatar'

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    person: {firstName: 'Ada', lastName: 'Lovelace'},
    date: '2026-03-14T00:00:00.000Z',
  },
}

export const Small: Story = {
  args: {
    person: {firstName: 'Ada', lastName: 'Lovelace'},
    date: '2026-03-14T00:00:00.000Z',
    small: true,
  },
}

export const NoPerson: Story = {
  args: {
    person: {firstName: null, lastName: null},
  },
}
```

- [ ] **Step 3: Verify**

Run `npm run storybook --workspace=frontend`, confirm `Components/Date` (`WithDate` renders a formatted date like "March 14, 2026", `Undefined` renders nothing) and `Components/Avatar` (`Default`, `Small`, `NoPerson`) all render without console errors or network requests to `cdn.sanity.io`.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/Date.stories.tsx frontend/app/components/Avatar.stories.tsx
git commit -m "test: add Storybook stories for Date and Avatar"
```

---

### Task 4: Story for `ResolvedLink`

**Files:**
- Create: `frontend/app/components/ResolvedLink.stories.tsx`

**Interfaces:**
- Consumes: `frontend/app/components/ResolvedLink.tsx` (`ResolvedLinkProps` = `{link: DereferencedLink; children: React.ReactNode; className?: string}`), `DereferencedLink` from `frontend/sanity/lib/types.ts`.
- Produces: the `DereferencedLink` mock-building pattern reused by Task 5 (`Cta`) and Task 6 (`PortableText`) — those tasks build their own inline `DereferencedLink`/`Link`-shaped objects following this same shape, they do not import from this file.

- [ ] **Step 1: `ResolvedLink.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import ResolvedLink from './ResolvedLink'

const meta = {
  title: 'Components/ResolvedLink',
  component: ResolvedLink,
} satisfies Meta<typeof ResolvedLink>

export default meta
type Story = StoryObj<typeof meta>

export const ExternalHref: Story = {
  args: {
    link: {
      _type: 'link',
      linkType: 'href',
      href: 'https://www.sanity.io',
      openInNewTab: true,
    },
    children: 'Visit Sanity',
  },
}

export const InternalPage: Story = {
  args: {
    link: {
      _type: 'link',
      linkType: 'page',
      page: 'about',
    },
    children: 'About page',
  },
}

export const NoLink: Story = {
  args: {
    link: undefined as never,
    children: 'Plain text, no anchor',
  },
}
```

- [ ] **Step 2: Verify**

Run `npm run storybook --workspace=frontend`, confirm `Components/ResolvedLink`: `ExternalHref` renders an `<a href="https://www.sanity.io" target="_blank">`, `InternalPage` renders an `<a href="/about">`, `NoLink` renders bare text with no anchor. No console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/ResolvedLink.stories.tsx
git commit -m "test: add Storybook story for ResolvedLink"
```

---

### Task 5: Story for `PortableText`

**Files:**
- Create: `frontend/app/components/PortableText.stories.tsx`

**Interfaces:**
- Consumes: `frontend/app/components/PortableText.tsx` (`{className?: string; value: PortableTextBlock[]}`).
- Produces: the text-only `PortableTextBlock[]` mock array pattern reused by Task 6 (`Cta`) and Task 7 (`InfoSection`) for their `body`/`content` props — those tasks inline their own copies of this array (same shape), they do not import from this file.

- [ ] **Step 1: `PortableText.stories.tsx`**

No `image`-type block is included in the mock value — an image block would require a live `cdn.sanity.io` asset (out of scope per Global Constraints).

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'
import type {PortableTextBlock} from 'next-sanity'

import PortableText from './PortableText'

const sampleValue: PortableTextBlock[] = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'h2',
    children: [{_type: 'span', _key: 's1', text: 'A heading with an anchor link'}],
  },
  {
    _type: 'block',
    _key: 'b2',
    style: 'normal',
    children: [
      {_type: 'span', _key: 's2', text: 'Some body copy with a '},
      {_type: 'span', _key: 's3', text: 'linked phrase', marks: ['link1']},
      {_type: 'span', _key: 's4', text: ' inside it.'},
    ],
    markDefs: [{_type: 'link', _key: 'link1', linkType: 'href', href: 'https://www.sanity.io'}],
  },
]

const meta = {
  title: 'Components/PortableText',
  component: PortableText,
} satisfies Meta<typeof PortableText>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: sampleValue,
  },
}
```

- [ ] **Step 2: Verify**

Run `npm run storybook --workspace=frontend`, confirm `Components/PortableText` renders an `<h2>` with a hover-anchor icon and a paragraph with a working link to `https://www.sanity.io`. No console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/PortableText.stories.tsx
git commit -m "test: add Storybook story for PortableText"
```

---

### Task 6: Story for `Cta`

**Files:**
- Create: `frontend/app/components/Cta.stories.tsx`

**Interfaces:**
- Consumes: `frontend/app/components/Cta.tsx` (`CtaProps` = `{block: ExtractPageBuilderType<'callToAction'>; index: number; pageType: string; pageId: string}`), `ExtractPageBuilderType` from `frontend/sanity/lib/types.ts`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: `Cta.stories.tsx`**

No `image` field is set on the mock block — an image would require a live `cdn.sanity.io` asset (out of scope per Global Constraints); `Cta` already handles a missing image by omitting that grid column.

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import Cta from './Cta'
import type {ExtractPageBuilderType} from '@/sanity/lib/types'

const block: ExtractPageBuilderType<'callToAction'> = {
  _key: 'cta-1',
  _type: 'callToAction',
  eyebrow: 'Get started',
  heading: 'Build your next site with Sanity + Next.js',
  body: [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      children: [{_type: 'span', _key: 's1', text: 'Structured content, real-time editing.'}],
    },
  ],
  button: {
    _type: 'button',
    buttonText: 'Get started',
    link: {
      _type: 'link',
      linkType: 'href',
      href: 'https://www.sanity.io',
      page: null,
      post: null,
    },
  },
  theme: 'light',
  contentAlignment: 'textFirst',
}

const meta = {
  title: 'Components/Cta',
  component: Cta,
} satisfies Meta<typeof Cta>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = {
  args: {
    block,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}

export const Dark: Story = {
  args: {
    block: {...block, theme: 'dark'},
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}
```

- [ ] **Step 2: Verify**

Run `npm run storybook --workspace=frontend`, confirm `Components/Cta`: `Light` renders on a light background with black text, `Dark` renders on a black background with white text, both show the eyebrow/heading/body/button. No console errors, no network requests.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/Cta.stories.tsx
git commit -m "test: add Storybook story for Cta"
```

---

### Task 7: Story for `InfoSection`

**Files:**
- Create: `frontend/app/components/InfoSection.stories.tsx`

**Interfaces:**
- Consumes: `frontend/app/components/InfoSection.tsx` (`InfoProps` = `{block: InfoSection; index: number; pageId: string; pageType: string}`), `InfoSection` type from `frontend/sanity.types.ts`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: `InfoSection.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import InfoSection from './InfoSection'
import type {InfoSection as InfoSectionType} from '@/sanity.types'

const block: InfoSectionType = {
  _type: 'infoSection',
  heading: 'Why structured content matters',
  subheading: 'Content that works everywhere',
  content: [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 's1',
          text: 'Structured content lets you reuse the same data across web, mobile, and beyond.',
        },
      ],
    },
  ],
}

const meta = {
  title: 'Components/InfoSection',
  component: InfoSection,
} satisfies Meta<typeof InfoSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    block,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}
```

- [ ] **Step 2: Verify**

Run `npm run storybook --workspace=frontend`, confirm `Components/InfoSection` renders the heading, subheading, and body copy. No console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/InfoSection.stories.tsx
git commit -m "test: add Storybook story for InfoSection"
```

---

### Task 8: Story for `BlockRenderer`

**Files:**
- Create: `frontend/app/components/BlockRenderer.stories.tsx`

**Interfaces:**
- Consumes: `frontend/app/components/BlockRenderer.tsx` (`BlockProps` = `{index: number; block: PageBuilderSection; pageId: string; pageType: string}`), `PageBuilderSection` from `frontend/sanity/lib/types.ts`. Reuses the same `callToAction` mock shape introduced in Task 6 (inlined here, not imported, per Task 6's Interfaces note).
- Produces: nothing consumed by later tasks. This is the last Tier 1 story task.

- [ ] **Step 1: `BlockRenderer.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs'

import BlockRenderer from './BlockRenderer'
import type {PageBuilderSection} from '@/sanity/lib/types'

const callToActionBlock: PageBuilderSection = {
  _key: 'cta-1',
  _type: 'callToAction',
  eyebrow: 'Get started',
  heading: 'Build your next site with Sanity + Next.js',
  body: [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      children: [{_type: 'span', _key: 's1', text: 'Structured content, real-time editing.'}],
    },
  ],
  button: {
    _type: 'button',
    buttonText: 'Get started',
    link: {
      _type: 'link',
      linkType: 'href',
      href: 'https://www.sanity.io',
      page: null,
      post: null,
    },
  },
  theme: 'light',
  contentAlignment: 'textFirst',
}

const infoSectionBlock: PageBuilderSection = {
  _key: 'info-1',
  _type: 'infoSection',
  heading: 'Why structured content matters',
  subheading: 'Content that works everywhere',
  content: [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 's1',
          text: 'Structured content lets you reuse the same data across web, mobile, and beyond.',
        },
      ],
      markDefs: [],
    },
  ],
}

const unknownBlock = {_key: 'unknown-1', _type: 'somethingNotBuiltYet'} as unknown as PageBuilderSection

const meta = {
  title: 'Components/BlockRenderer',
  component: BlockRenderer,
} satisfies Meta<typeof BlockRenderer>

export default meta
type Story = StoryObj<typeof meta>

export const CallToAction: Story = {
  args: {
    block: callToActionBlock,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}

export const InfoSectionBlock: Story = {
  args: {
    block: infoSectionBlock,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}

export const UnknownBlockType: Story = {
  args: {
    block: unknownBlock,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}
```

- [ ] **Step 2: Verify**

Run `npm run storybook --workspace=frontend`, confirm `Components/BlockRenderer`: `CallToAction` renders the same output as `Components/Cta`'s `Light` story, `InfoSectionBlock` renders the same output as `Components/InfoSection`, `UnknownBlockType` renders the gray "A 'somethingNotBuiltYet' block hasn't been created" placeholder. No console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/BlockRenderer.stories.tsx
git commit -m "test: add Storybook story for BlockRenderer"
```

---

### Task 9: Full-suite verification

**Files:**
- None created or modified — this task only runs verification commands across everything built in Tasks 1–8.

**Interfaces:**
- Consumes: every story file and the Storybook config from Tasks 1–8.
- Produces: nothing — this is the final task.

- [ ] **Step 1: Full Storybook build**

Run: `npm run build-storybook --workspace=frontend`
Expected: exits 0, produces `frontend/storybook-static/` with no build errors or warnings about unresolved modules.

- [ ] **Step 2: Lint check**

Run: `npm run lint --workspace=frontend`
Expected: exits 0 (no lint errors introduced by the new `.stories.tsx` files or `.storybook/` config).

- [ ] **Step 3: Type check**

Run: `npm run type-check --workspace=frontend`
Expected: exits 0 (all mock data satisfies the real Sanity-generated types with no `any`/unsafe casts beyond the single deliberate `UnknownBlockType` cast in Task 8, which is testing an intentionally-invalid `_type`).

- [ ] **Step 4: Manual smoke pass in the browser**

Run `npm run storybook --workspace=frontend`, open the local Storybook URL, and click through every story listed under "Components" in the sidebar (12 components, ~20 stories total). Confirm: no broken layouts, no console errors, no failed network requests (check the Network tab — there should be zero requests to `cdn.sanity.io` or any Sanity API).

- [ ] **Step 5: Clean up `storybook-static/` build output**

```bash
rm -rf frontend/storybook-static
```

(It's gitignored per Task 1 Step 5, but the local build artifact shouldn't linger in the working tree if the plan runner leaves it around.)

- [ ] **Step 6: Final commit (only if any fixes were made in Steps 1–4)**

If everything passed clean with no code changes needed, there is nothing to commit here — Tasks 1–8 already committed everything. If a fix was needed (e.g. a lint or type error), commit it:

```bash
git add -A
git commit -m "fix: address lint/type-check issues from Storybook verification pass"
```
