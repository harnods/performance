# Talenta Performance — Project Rules for Codex

> ## 🔴 READ FIRST — before ANY UI work
> **`docs/README.md` is the design-system source of truth.** Before building,
> replicating, or changing any page/feature/component, open the matching pattern doc in
> `docs/patterns/` — **tables especially** (`docs/patterns/table.md`). Then cross-check
> the live system: `ai.mekari.design/mcp` (Pixel MCP) and the `pixel` /
> `implement-to-pixel` / `mekari-taste` skills. Mirror existing patterns exactly — do not
> invent new components/behaviours/CSS. The sections below are foundational; the pattern
> docs go deeper per surface.

## Stack
- **Nuxt 3** + **Vue 3** SFC with `<script setup lang="ts">`
- **Mekari Pixel 3** (`@mekari/pixel3`) design system
- **Panda CSS** via `css()` from `@mekari/pixel3` for all styling

---

## Design Tokens
- **Always DT 2.4. Never DT 2.1. No exceptions.**
- Never use raw hex colors (e.g. `#4B61DD`) — always use semantic tokens
- Never use inline `style=""` attributes — always use `css()`
- Token examples: `text.default`, `text.secondary`, `border.default`, `background.neutral.subtle`, `background.brand.bold`, `background.information.bold`

---

## Styling with `css()`

```ts
import { css } from '@mekari/pixel3'

const myClass = css({
  fontSize: '14px',
  color: 'text.default',
  borderBottom: '1px solid',
  borderBottomColor: 'border.default',
})
```

- Use `css()` for all custom styles — no Tailwind, no raw CSS classes
- Responsive via Panda CSS object syntax: `{ base: 'span 12 / span 12', lg: 'span 6 / span 6' }`
- `lg` breakpoint = ≥1024px (desktop). Below lg = tablet/mobile.

---

## Mekari Taste Principles

### Layout
- **No cards for form sections** — use flat sections with `border-bottom` separators only
- Section headers: H2 (`fontSize: '20px', fontWeight: '600', lineHeight: '32px'`) — do NOT use `MpText size="h2"` (CSS recipe broken)
- Sub-headers: H3 (`fontSize: '16px', fontWeight: '600', lineHeight: '24px'`)
- Description text under section headers: `size="label"` (14px/regular/lh20), `color="text.secondary"`
- No divider lines between sections — spacing only

### Forms
- Every field wrapped in `MpFormControl` + `MpFormLabel`
- All dropdowns/selects use `PxSelectPopover` (custom component) — never raw `MpSelect` in forms
- Select width = `50%` of form column by default (3/12 grid = ~264px on desktop)
- Buttons default size = **md** (never `size="sm"` unless explicitly requested)
- `MpToggle`, `MpCheckbox`, `MpRadio` — use built-in `default` and `#description` slots for labels/captions (do not wrap in external `MpFlex`)
- Input with unit suffix: use `MpInputGroup` + `MpInputRightAddon`

### Grid
- Content area uses 12-column grid
- Form column: `span 6 / span 6` on desktop (`lg`), `span 12 / span 12` on tablet/mobile (`base`)
- Gap between grid cells: `gap: '6'`
- Gap between form fields: `gap: '4'` (16px)
- Margin between sections: `marginTop: '10'` (top), `marginBottom: '3'` (before first field)

### Tables
- Row hover state ONLY when the row is interactive (clickable → opens detail / navigates).
  For read-only / display tables, disable it with `<MpTable :is-hoverable="false">` — a hover
  highlight implies clickability that isn't there.
- Numeric columns right-aligned; use `fontVariantNumeric: 'tabular-nums'`.
- 1px bottom row border only (Pixel default) — no zebra striping, no outer border.

---

## Page Layout (`layouts/default.vue`)
- Outer: `MpFlex direction="column" height="100vh"` — full viewport
- `AppHeader` sticky at top
- `AppSidebar` + main column in flex row
- Main column: `overflowY="auto"` — scrollable
- Page header: **fixed 72px** — never change this height
- Breadcrumb: set via `definePageMeta({ breadcrumb: { label: '...', to: '/...' } })`
- Page title: set via `definePageMeta({ title: '...' })`
- Page header action buttons: use `<Teleport to="#page-header-actions" defer>`

---

## Components

### `PxSelectPopover`
Custom popover-driven select. Always use this for form dropdowns.
```vue
<PxSelectPopover
  v-model="value"
  :options="[{ value: 'a', label: 'Option A', description?: '...' }]"
  placeholder="Select..."
  :width="selectWidth"
  :searchable="true"
  search-placeholder="Search..."
  :is-clearable="true"
/>
```

### `PxNoAssignmentNotice`
Empty state notice for pages with no assignments yet.

### Pixel components commonly used
`MpFlex`, `MpText`, `MpButton`, `MpInput`, `MpInputGroup`, `MpInputRightAddon`, `MpInputLeftAddon`, `MpIcon`, `MpToggle`, `MpCheckbox`, `MpRadio`, `MpBadge`, `MpFormControl`, `MpFormLabel`, `MpTooltip`, `MpPopover`, `MpPopoverTrigger`, `MpPopoverContent`, `MpPopoverList`, `MpPopoverListItem`, `MpTextlink`

---

## Routing & Navigation
- Active submenu state: `route.path === child.path || route.path.startsWith(child.path + '/')`
- Catch-all `pages/[...slug].vue` redirects unknown routes to `/`
- Nested page directories follow Nuxt file-based routing (e.g. `pages/reviews/review-cycles/create.vue`)

---

## Dev Server
- Runs on **port 3003** via `npm run dev`
- Launch config: `.Codex/launch.json`

---

## Branch Strategy
- `feat/review-cycles-create` — Review cycles (Evaluation form)
- `feat/flexible-competency-assignment` — Talents: competency assignment & succession plans
- Main branch: `main`

## Push workflow

When the user has finished "vibe coding" (an implementation/iteration session) and signals they want to
push the branch to remote, ask first whether the change needs a design review, offering exactly these 3
options:

1. **Review + generate HTML report** — run `/pixel-review` in full and produce the HTML report as usual.
2. **Review + summary in this chat** — run the same review (Playwright exploration + CHOICE+NNG-weighted
   audit) but report the findings as a summary in this chat session only; skip generating the HTML
   report file.
3. **I'll review later** — skip the review now; proceed straight to pushing the branch to remote (still
   following the standard git safety protocol, e.g. confirming the push itself unless already
   pre-authorized).

Don't ask this when the user explicitly requests a plain `git push` with no vibe-coding context (e.g.
they're just syncing an already-reviewed branch).

`/pixel-review` is provided by the `pixel-review` devDependency (`.claude/commands/pixel-review.md`,
scaffolded via `npx pixel-review init`) — a live browser UX audit of the running prototype, distinct
from any diff/compliance-checklist review the repo may already have.
