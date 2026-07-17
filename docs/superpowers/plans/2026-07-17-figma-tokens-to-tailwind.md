# Figma Tokens → Tailwind v4 Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reference/technique skill at `.agents/skills/figma-tokens-to-tailwind/SKILL.md` that guides an agent through extracting Figma variables (color, typography, spacing) via the Figma MCP tools and writing them as Tailwind v4 `@theme` tokens into this repo.

**Architecture:** Single self-contained `SKILL.md` (no heavy reference files needed — the mapping rules fit inline per the writing-skills size guidance). It documents: how to call `get_variable_defs`/`get_design_context`, the Figma-variable-name → Tailwind-token-name mapping rules, the light/dark mode split, the output file (`frontend/app/tokens.css`) and the `globals.css` import wiring, and collision handling.

**Tech Stack:** Markdown skill file (agentskills.io spec frontmatter), Figma MCP tools (`get_variable_defs`, `get_design_context`, `get_screenshot`), Tailwind v4 CSS-first `@theme`/`@custom-variant` syntax as already used in `frontend/app/globals.css`.

## Global Constraints

- Skill directory convention for this repo: `.agents/skills/<name>/SKILL.md` (see `.agents/skills/sanity-live-cache-components/SKILL.md` for the format this repo follows).
- Frontmatter requires `name` (letters/numbers/hyphens only) and `description` (third-person, starts with "Use when...", describes triggers only, no workflow summary), combined under 1024 chars.
- Output CSS token file: `frontend/app/tokens.css` (new file).
- `frontend/app/globals.css` must gain exactly one new line: `@import './tokens.css';` directly after `@import 'tailwindcss';` — no other lines in that file may be touched.
- Token name mapping (from the approved spec, `docs/superpowers/specs/2026-07-17-figma-tokens-to-tailwind-design.md`):
  - Color: `Foo/Bar Baz` → `--color-foo-bar-baz`
  - Font family → `--font-{name}`
  - Font size/line-height pair → `--text-{name}` and `--text-{name}--line-height`
  - Font weight → `--font-weight-{name}` (only if not already covered by Tailwind v4's default scale)
  - Spacing/number scale → `--spacing-{name}`
- Mode handling: default/first mode → `@theme` block; a second mode named "Dark" (case-insensitive) → `.dark { ... }` override block inside `@layer base`, matching the `@custom-variant dark (&:where(.dark, .dark *));` pattern already in `globals.css`. Modes beyond a light/dark pair are ignored and noted in the summary.
- Collisions: if a generated token name already exists as a hand-written variable in `globals.css`, skip writing it and list it in the summary — never silently overwrite.
- Scope: colors, typography, spacing only. No shadows/radius/breakpoints/effects, no custom `@utility` blocks, no JSX/TSX edits.
- This is a Reference/Technique skill (per superpowers:writing-skills classification), not a discipline-enforcing skill — testing is by application scenario (does an agent correctly apply it end-to-end), not adversarial pressure-scenario testing.

---

### Task 1: Write the skill file

**Files:**
- Create: `.agents/skills/figma-tokens-to-tailwind/SKILL.md`

**Interfaces:**
- Produces: a skill document that, when loaded, tells the invoking agent exactly which Figma MCP tools to call, how to map variable names to Tailwind v4 token names, how to structure `frontend/app/tokens.css`, and how to wire the `globals.css` import.

- [ ] **Step 1: Draft the frontmatter and overview**

```markdown
---
name: figma-tokens-to-tailwind
description: Use when extracting Figma design variables (colors, typography, spacing) into Tailwind v4 theme tokens, when syncing a design system from Figma into a codebase, or when the user shares a figma.com URL alongside a request to generate or update Tailwind theme tokens.
---

# Figma Tokens → Tailwind v4

Extracts Figma variables via the Figma MCP tools and writes them as Tailwind v4 `@theme` CSS variables, keeping `frontend/app/globals.css` as the single source of truth for Tailwind config.

## Prerequisites

- Figma MCP server connected (tools named `mcp__<figma-server>__get_variable_defs`, `get_design_context`, `get_screenshot`).
- Tailwind v4 CSS-first config in `frontend/app/globals.css` with a `@theme { ... }` block and a `@custom-variant dark (&:where(.dark, .dark *));` line (already present in this repo).
```

- [ ] **Step 2: Write the extraction + mapping section**

Add this section to the same file, right after the overview:

```markdown
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
```

- [ ] **Step 3: Write the output-file and collision-handling section**

Add this section:

```markdown
## 4. Write `frontend/app/tokens.css`

Create (or update) `frontend/app/tokens.css`:

\`\`\`css
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
\`\`\`

## 5. Wire the import

In `frontend/app/globals.css`, insert `@import './tokens.css';` directly after the existing `@import 'tailwindcss';` line, if not already present. Do not modify any other line in that file.

## 6. Collisions and summary

Before writing a token, check whether that exact `--color-*`/`--font-*`/`--text-*`/`--spacing-*` name already exists as a hand-written variable elsewhere in `globals.css`. If it does, skip writing it (don't overwrite) and list it under "skipped (collision)" in your final summary.

Report to the user: tokens added, tokens skipped (collisions), variable categories ignored (out of scope), and whether the styles/screenshot fallback path was used.

## Out of scope

No custom `@utility` blocks (Tailwind v4 auto-generates utilities from `@theme` variables). No shadows, radius, breakpoints, or effects tokens. No JSX/TSX edits.
```

- [ ] **Step 4: Verify the frontmatter is well-formed**

Run: `head -c 1024 .agents/skills/figma-tokens-to-tailwind/SKILL.md | grep -c "^---$"`
Expected: `2` (opening and closing `---` delimiters within the first 1024 chars, confirming frontmatter length is in budget).

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/figma-tokens-to-tailwind/SKILL.md
git commit -m "Add figma-tokens-to-tailwind skill"
```

---

### Task 2: Application-scenario test and refactor

**Files:**
- Read: `.agents/skills/figma-tokens-to-tailwind/SKILL.md` (no changes unless the test surfaces gaps)
- Possible modify: `.agents/skills/figma-tokens-to-tailwind/SKILL.md` (if gaps found)

**Interfaces:**
- Consumes: the skill file produced by Task 1.
- Produces: confirmation the skill is usable end-to-end, or a refactored skill file with gaps closed.

- [ ] **Step 1: Run a baseline-free application scenario**

Dispatch a fresh subagent with a prompt like: "Using the figma-tokens-to-tailwind skill at `.agents/skills/figma-tokens-to-tailwind/SKILL.md`, extract tokens from [a real Figma file/frame URL you have access to] and apply them to this repo." Give it Figma MCP tool access and repo write access. Do not give it any extra guidance beyond pointing it at the skill.

- [ ] **Step 2: Review the subagent's output against the Global Constraints**

Check: did it call `get_variable_defs` first (not skip straight to screenshots)? Does `frontend/app/tokens.css` follow the `@theme` / `.dark` shape from Step 3 of Task 1? Is the `globals.css` diff exactly the one new `@import` line? Did it report skipped collisions instead of overwriting? Did it flag out-of-scope categories instead of guessing utility classes for them?

- [ ] **Step 3: Close any gaps found**

If the subagent misapplied a rule (e.g. wrong kebab-case handling, missed a collision, wrote a `@utility` block anyway), edit `.agents/skills/figma-tokens-to-tailwind/SKILL.md` to make that rule unambiguous — add a concrete example of the exact case that tripped it up.

- [ ] **Step 4: Re-run the scenario if the skill was edited**

Repeat Step 1 with a fresh subagent (same prompt) only if Step 3 made changes. Confirm compliance.

- [ ] **Step 5: Commit any refactor**

```bash
git add .agents/skills/figma-tokens-to-tailwind/SKILL.md
git commit -m "Refine figma-tokens-to-tailwind skill based on application test"
```

(Skip this step if Task 2 required no edits.)
