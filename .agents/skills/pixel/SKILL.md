---
name: pixel
description: Build Mekari Pixel 3 UI in Vue 3/Nuxt from Figma or text. Use when implementing components, validating props, applying design tokens, or checking token mode (2.1 vs 2.4).
license: Proprietary
compatibility: Requires a Vue 3/Nuxt project with @mekari/pixel3 installed.
metadata:
  author: design@mekari.com
  version: '2026.7.2'
  source: https://ai.mekari.design/skills?skill=pixel
---

# Pixel Design System

Build Pixel 3 UI with a low-noise workflow: verify setup, map the UI, validate props, apply token-safe styling, and ship runnable Vue/Nuxt code.

## Golden Rules

1. Import components from `@mekari/pixel3`
2. Use Pixel primitives, for example `Pixel.div` and `Pixel.main`, before raw HTML equivalents
3. Use CSS props for `MpFlex`, `MpScrollbar`, `MpSkeleton`, and `Pixel.*`
4. Use CSS function `css()` only when CSS props are unavailable and you need to apply custom styling to a `Mp*` component
5. Use `get-block` first for any reusable UI section (data table, page header, confirmation modal, etc). If a block matches, it is the composition blueprint — do not rebuild the section from loose components
6. Use `get-component` to verify a component's props, slot, emit, and usage example before guessing - do this for every `Mp*` component
7. Use `get-icon-name` to verify icon names for `MpIcon` — do not invent icon names
8. Use design tokens 2.4 by default — only use 2.1 if the Figma file is in 2.1 mode and the user confirms to keep it
9. Use design tokens with semantic names ex: `background.surface`, `text.default`, `pxl-space-md`, over raw color, spacing, or typography values
10. Use `MpFormControl` to wrap validated fields, for example `MpInput`, `MpSelect`, and `MpTextarea`

## When loaded by `implement-to-pixel`

- Skip step 2 — plan already provided
- Before coding: verify `Pixel constraints` is present and filled. If blank, stop and ask — do not infer.
- Treat `Pixel constraints` as source of truth — do not re-derive from memory
- Start from step 3

## Workflow

### 1. Verify Setup

Read `references/setup.md` if package setup or token mode is unclear.

### 2. Analyze the Request

Produce a short component plan before coding:

- Figma: extract node ID, call `get_design_context` and `get_screenshot`.
- Text: break UI into sections, states, and interactions.

Read `references/validation.md` before generate code.

### 3. Create the UI

Read `references/components.md` for creating components and blocks.

### 4. Apply Styling

Read `references/styling.md` when deciding between CSS Props and `css()`.

### 5. Produce Final Code

Read `references/structure.md` before writing the final code.

## Installation & Updates

This skill is managed by the `pixel-hub` CLI. To install or update:

```bash
# Install (from your project root)
npx @mekari/pixel-hub skills install --skill pixel --agent claude-code --yes

# Update to latest
npx @mekari/pixel-hub skills update --skill pixel --yes
```

The CLI writes files to `.agents/skills/pixel/` and symlinks `.claude/skills/pixel/` for Claude Code.
Lock file: `.pixel-hub/skill-lock.json` — commit this so teammates can restore with `skills install --yes`.
