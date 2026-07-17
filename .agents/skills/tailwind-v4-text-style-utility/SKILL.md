---
name: tailwind-v4-text-style-utility
description: Use when a named typography/text style (e.g. a Figma text style like "headline/lg", a design-system token, or a spec in frontend/DESIGN.md) needs to become a reusable Tailwind v4 CSS class in frontend/app/globals.css, instead of a one-off Tailwind utility stack repeated across components.
---

# Tailwind v4 Text Style → Utility Class

Turns a named typography style into a single-class Tailwind v4 `@utility`, so components write `class="headline-lg"` instead of repeating `text-[2rem] leading-[2.4rem] font-semibold tracking-tight` everywhere.

## When to use

- A Figma text style or design token has a slash/namespace name (`headline/lg`, `body/md`, `label/caps`) and needs a matching CSS class.
- The same combination of font-size/line-height/weight/tracking/family shows up as repeated Tailwind utility stacks in JSX.
- Don't use this for a style used in exactly one place — inline Tailwind utilities are fine there.

## Naming convention

Convert the style name to a single kebab-case class: `headline/lg` → `.headline-lg`, `body/md` → `.body-md`. Do not create a `text-` prefixed utility unless the project's existing classes use that prefix (check `frontend/app/globals.css` first) — `headline-lg` reads better than `text-headline-lg` when the class already implies typography.

## Pattern

Define the class with Tailwind v4's `@utility` at-rule directly in `frontend/app/globals.css`, below the existing `@utility container` block and above `@theme`. Prefer referencing existing `@theme` tokens (`--font-*`, `--color-*`) over hardcoded values when one already covers the value; hardcode font-size/line-height/tracking since those are typically unique per text style.

```css
@utility headline-lg {
  font-family: var(--font-sans);
  font-size: 2rem;
  line-height: 2.4rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
```

If the design system will grow more of these styles, promote the repeated numeric values to `@theme` variables first (e.g. `--text-headline-lg: 2rem;` with `--text-headline-lg--line-height: 2.4rem;`), then reference them:

```css
@theme {
  --text-headline-lg: 2rem;
  --text-headline-lg--line-height: 2.4rem;
}

@utility headline-lg {
  font-size: var(--text-headline-lg);
  line-height: var(--text-headline-lg--line-height);
  font-weight: 600;
  letter-spacing: -0.01em;
}
```

Only do this promotion when a second style will reuse the same values — a single one-off style doesn't need the extra indirection.

## Sourcing the values

Never invent font-size/line-height/weight/tracking numbers — always pull them from a real source.

1. **Figma is the source of truth for a named text style** (`headline/lg` etc.) — read it before writing any CSS:
   - Resolve the target: a figma.com URL the user gave you, or the current selection in the Figma desktop app if no URL is given.
   - Call `get_design_context` (or `get_variable_defs` if the file uses Variables rather than Styles) scoped to that target, and locate the text style by name (matching on the `headline/lg`-style slash name Figma shows in its Styles panel).
   - Read off: font family, font size, line height, font weight, and letter-spacing/tracking from the returned style — these map directly to the CSS declarations in the Pattern section below.
   - If `get_design_context` can't find a style with that name, use `get_screenshot` to visually confirm which text on the frame it refers to, and say so in your summary — this path is best-effort and should be flagged for manual review.
   - `get_variable_defs`/`get_design_context` are read-only lookups and don't require the `figma-use` skill; only loading/writing to Figma (`use_figma`) does.
2. If no Figma file or selection is available at all, fall back to `frontend/DESIGN.md` if the style is documented there.
3. If neither source has the values, ask the user rather than guessing.

## Common mistakes

- Defining the class with `@layer components` and `@apply` instead of `@utility` — in Tailwind v4, `@utility` is what makes the class participate in variant stacking (`hover:`, `lg:`, `dark:`) and lets Tailwind's compiler tree-shake it like a built-in utility. `@apply`-in-`@layer` classes don't get that.
- Prefixing every one-off style name with `text-` — only do this if it matches an existing convention in the file.
- Skipping the `@theme` promotion step when a second, related style (`headline/sm`, `headline/md`) is coming next — extract the scale once, not per class.
