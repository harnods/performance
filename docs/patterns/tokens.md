# Token hygiene

Rule (CLAUDE.md): **DT 2.4 only. No raw hex. No inline `style=""`. All styling via `css()`.**

## Semantic tokens actually used here

`text.default`, `text.secondary`, `text.link`, `text.danger`, `border.default`, `border.bold`, `border.brand`, `background.surface`, `background.neutral`, `background.neutral.subtle`, `background.neutral.hovered`, `background.brand.bold`, `background.brand.selected`, `background.information.bold`, `icon.default`, `icon.secondary`, `icon.brand`.

## Styling entry point

```ts
import { css } from '@mekari/pixel3'
const myClass = css({ color: 'text.default', borderBottom: '1px solid', borderBottomColor: 'border.default' })
```

No Tailwind, no raw CSS classes, no `MpText size="h2"` for section headers (recipe broken — hand-roll `h2Class`, see [`form.md`](form.md)).

## `:style=""` — when it's OK

Legitimate only for **dynamic values** that can't be static `css()`: progress-bar width `%`, sidebar animation opacity, avatar-stack offsets, grid template strings, popover positioning. Everything **static** belongs in `css()`.

## Known violations to fix (from audit)

- **Raw hex** (make these tokens):
  - `pages/talents/talent-directory/[id].vue:110-113` (review-type palette), `:175-176` (`#232933`/`#626B79` → `text.default`/`text.secondary`), `:189` (`#EDF0F2` gridline).
  - `components/DashCycleOverview.vue:28-29,48` (`#22C55E`, `#E4E7EC`, `#1B2126`).
  - `components/DashCyclePurposeModal.vue:63` (`#4B61DD` fallback in a `var()`; also hand-rolls radio "cards" — should use `MpRadio`).
- **Static `:style` → move into `css()`**:
  - `CycleGeneralForm.vue:405,531,571,594` (`marginTop: '16px'`), `CycleDeductionDrawer.vue:143,157,169` (`marginTop: '24px'`), `review-cycles/index.vue:297,428`, `notifications.vue:373`, `AppSidebar.vue:402` (plain `style="width: 40px"`).

## Toast (convention)

Use Pixel's `toast` directly (no wrapper): `toast.notify({ id, position: 'top-center', variant, title })` — always `top-center`, always a unique string `id`. `variant`: `'success'` for confirmations, `'error'` for validation failures, `'information'` for transitions.

## Rules

- Semantic tokens only; never raw hex (even as a `var()` fallback).
- Static styles in `css()`, dynamic-only in `:style`.
- Validate component props/tokens against `ai.mekari.design/mcp` (`get-component`, `get-docs`) and the `pixel` skill when unsure.
