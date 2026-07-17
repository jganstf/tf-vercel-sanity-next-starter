---
name: figma-tokens-to-tailwind
description: Use when extracting Figma design variables (colors, typography, spacing) into Tailwind v4 theme tokens, when syncing a design system from Figma into a codebase, or when the user shares a figma.com URL alongside a request to generate or update Tailwind theme tokens.
---

# Figma Tokens → Tailwind v4

Extracts Figma variables via the Figma MCP tools and writes them as Tailwind v4 `@theme` CSS variables, keeping `frontend/app/globals.css` as the single source of truth for Tailwind config.

## Prerequisites

- Figma MCP server connected (tools named `mcp__<figma-server>__get_variable_defs`, `get_design_context`, `get_screenshot`).
- Tailwind v4 CSS-first config in `frontend/app/globals.css` with a `@theme { ... }` block and a `@custom-variant dark (&:where(.dark, .dark *));` line (already present in this repo).

## 1. Resolve the Figma target and pull variables

Use the Figma file/frame URL given by the user (or the current selection if no URL is given). Call `get_variable_defs` scoped to that target. Keep only variables belonging to color, typography (font family/size/weight/line-height), and spacing/number-scale collections — ignore booleans, opacity-only tokens, and anything not in those three categories.

If `get_variable_defs` returns nothing (the file uses Styles, not Variables), fall back to `get_design_context` (and `get_screenshot` to visually confirm). Flag in the final summary that this path is best-effort and needs manual review.

## 2. Map variable names to Tailwind v4 tokens

| Figma variable | Tailwind v4 token |
| --- | --- |
| Color, e.g. `Foo/Bar Baz` | `--color-foo-bar-baz` (kebab-case; `/` and spaces → `-`) |
| Font family | `--font-{name}` |
| Font size (+ line-height if paired in the same type style) | `--text-{name}` and `--text-{name}--line-height` |
| Font weight (only if outside Tailwind's default weight scale) | `--font-weight-{name}` |
| Spacing / number scale | `--spacing-{name}` |

## 3. Handle modes (light/dark)

If a variable collection has a second mode named "Dark" (case-insensitive), treat it as a dark-mode override for the same token names: first/default mode values go in `@theme`, second-mode values go in a `.dark { ... }` block inside `@layer base`. Ignore any additional modes beyond this pair and note them in the summary.

## 4. Write `frontend/app/tokens.css`

Create (or update) `frontend/app/tokens.css`:

```css
@theme {
  --color-...: ...;
  --font-...: ...;
  --text-...: ...;
  --spacing-...: ...;
}

@layer base {
  .dark {
    --color-...: ...;
  }
}
```

## 5. Wire the import

In `frontend/app/globals.css`, insert `@import './tokens.css';` directly after the existing `@import 'tailwindcss';` line, if not already present. Do not modify any other line in that file.

## 6. Collisions and summary

Before writing a token, check whether that exact `--color-*`/`--font-*`/`--text-*`/`--spacing-*` name already exists as a hand-written variable elsewhere in `globals.css`. If it does, skip writing it (don't overwrite) and list it under "skipped (collision)" in your final summary.

Report to the user: tokens added, tokens skipped (collisions), variable categories ignored (out of scope), and whether the styles/screenshot fallback path was used.

## Out of scope

No custom `@utility` blocks (Tailwind v4 auto-generates utilities from `@theme` variables). No shadows, radius, breakpoints, or effects tokens. No JSX/TSX edits.
