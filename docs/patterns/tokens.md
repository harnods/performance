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

## Sanctioned raw-hex exceptions (NOT violations)

Two cases are allowed, both documented at their pattern:

1. **Chart series colours** — Chart.js paints to a canvas and cannot resolve a Panda
   token, so `backgroundColor` values are literal. Name the Figma variable in a comment
   beside each. See [`donut-chart.md`](donut-chart.md); `DashCycleOverview.vue` set the
   precedent.
2. **Stat-card tints** — `#B4CCB8`, `#D9D1B8`, `#405244`, `#61533F` have no DT 2.4
   equivalent. See [`stat-card.md`](stat-card.md).

Before writing any literal, check whether a token resolves to that **exact** value —
`gray.100` is `#D0D6DD` and `gray.600` is `#626B79`, so those never need hard-coding.

> ⚠️ **A Figma token name is not a runtime token value.** The Dashboard v2.0 file is a
> different palette generation from this app's DT 2.4 runtime: Figma `green.400` #68BE79
> vs runtime #7DC7A8, `green.700` #3C914D vs #1C8459, `red.400` #DA473F vs #EA7A72.
> Verify with `getComputedStyle(document.documentElement).getPropertyValue('--mp-colors-…')`
> before swapping a literal for a token or vice versa.

## Known violations to fix (from audit)

- **Raw hex** (make these tokens):
  - `pages/talents/talent-directory/[id].vue:110-113` (review-type palette), `:175-176` (`#232933`/`#626B79` → `text.default`/`text.secondary`), `:189` (`#EDF0F2` gridline).
  - `components/DashCyclePurposeModal.vue:63` (`#4B61DD` fallback in a `var()`; also hand-rolls radio "cards" — should use `MpRadio`).
- **Static `:style` → move into `css()`**:
  - `CycleGeneralForm.vue:405,531,571,594` (`marginTop: '16px'`), `CycleDeductionDrawer.vue:143,157,169` (`marginTop: '24px'`), `review-cycles/index.vue:297,428`, `notifications.vue:373`, `AppSidebar.vue:402` (plain `style="width: 40px"`).

## Toast (convention)

Use Pixel's `toast` directly (no wrapper): `toast.notify({ id, position: 'top-center', variant, title })` — always `top-center`, always a unique string `id`.

`ToastVariant` is **`'success' | 'error' | 'greeting'`** — that's the whole union.
`'success'` for confirmations *and* neutral transitions, `'error'` for validation
failures.

> 🚫 **`'information'` is not a valid variant.** It type-errors and falls back at
> runtime. Two pre-existing call sites still pass it — `pages/dashboard.vue:89` and
> `pages/reviews/pending-actions/[uuid]/index.vue:127`. Don't copy them.

## Rules

- Semantic tokens only; never raw hex (even as a `var()` fallback) — except the two
  sanctioned cases above, and only after checking for an exact-value token.
- Static styles in `css()`, dynamic-only in `:style`.
- Validate component props/tokens against `ai.mekari.design/mcp` (`get-component`, `get-docs`) and the `pixel` skill when unsure.
