# Figma Tokens → Tailwind v4 Skill

## Purpose

A Claude Code skill that extracts design tokens (colors, typography, spacing) from a Figma file via the Figma MCP server and writes them into this project as Tailwind v4 `@theme` CSS variables, keeping `frontend/app/globals.css` as the single source of truth for Tailwind config.

## Trigger

Invoked when the user wants to sync/extract Figma design tokens into Tailwind, e.g. "pull the tokens from this Figma file into Tailwind", "sync our design system from Figma", or when a figma.com URL is shared alongside a request to generate/update theme tokens.

## Inputs

- A Figma file, page, or frame URL (or the currently selected frame in the Figma desktop app, if the MCP tool supports selection-based context with no URL given).

## Flow

1. Resolve the Figma target (URL argument, or current selection via the Figma MCP tools).
2. Call `get_variable_defs` scoped to the file to retrieve variable collections. Filter to collections/variables that are colors, typography (font family, size, weight, line-height), and spacing/number scales. Ignore other variable types (booleans, strings unrelated to type, opacity-only tokens, etc.) — out of scope per this design.
3. If `get_variable_defs` returns nothing usable (file uses Styles instead of Variables, or no variables at all), fall back to `get_design_context` (and `get_screenshot` for visual confirmation) to infer basic color/type values, and clearly flag in the summary that this path is best-effort and should be manually reviewed.
4. Map each variable to a Tailwind v4 token name:
   - Color variable `Foo/Bar Baz` → `--color-foo-bar-baz` (kebab-case, slashes/spaces → hyphens)
   - Font family variable → `--font-{name}`
   - Font size (paired with line-height when Figma exposes both on the same type style) → `--text-{name}` and `--text-{name}--line-height`
   - Font weight → `--font-weight-{name}` if Tailwind v4's default scale doesn't already cover the value
   - Spacing/number scale → `--spacing-{name}`
5. Mode handling: if a variable collection has a second mode named "Dark" (case-insensitive) or similar, its values are treated as dark-mode overrides for the same token names. The default/first mode's values populate `@theme`; the second mode's values populate a `.dark { ... }` override block, mirroring the existing `@custom-variant dark (&:where(.dark, .dark *));` pattern in `globals.css`. Additional modes beyond a light/dark pair are ignored, with a note in the summary.
6. Write output to a new file `frontend/app/tokens.css`, structured as:
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
7. Ensure `frontend/app/globals.css` imports the new file: insert `@import './tokens.css';` directly after the existing `@import 'tailwindcss';` line, if not already present. Do not touch any other existing content in `globals.css`.
8. Collision handling: if a generated token name already exists as a hand-written `--color-*`/`--font-*`/etc. variable in `globals.css`, do not overwrite it silently — skip that token, and list it in the summary as a collision needing manual review.
9. Report a summary to the user: tokens added, tokens skipped (collisions), variable types ignored (out of scope), and whether the fallback (styles/screenshot-based) path was used.

## Non-goals

- No custom `@utility` class blocks — Tailwind v4 auto-generates utilities from `@theme` variables, so this skill only needs to populate theme variables.
- No extraction of shadows, radius, breakpoints, or effects tokens.
- No modification of components or JSX/TSX files — CSS token output only.
- No automatic resolution of naming collisions — flagged for manual review instead.

## Error handling

- No Figma MCP connection / file not accessible: report the error and stop; do not fabricate token values.
- No variables found and design-context fallback also yields nothing usable: report that no tokens could be extracted, no file changes made.
