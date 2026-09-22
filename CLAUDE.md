# Talenta Performance — Project Rules for Claude

> ## 🔴 READ FIRST — before ANY UI work
> **[`docs/README.md`](docs/README.md) is the design-system source of truth.** Before
> building, replicating, or changing any page/feature/component, open the matching
> pattern doc in [`docs/patterns/`](docs/patterns/) — **tables especially**
> ([`docs/patterns/table.md`](docs/patterns/table.md)). Then cross-check the live system:
> `ai.mekari.design/mcp` (Pixel MCP) and the `pixel` / `implement-to-pixel` /
> `mekari-taste` skills. Mirror existing patterns exactly — do not invent new
> components/behaviours/CSS. The sections below are the foundational rules; the pattern
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

### Empty states
- When a list/collection has no records, **replace** the filter bar + table with
  a centered empty state: illustration (`public/illustrations/`) + title + caption
  + action button. Never show an empty table shell.
- The empty-state action button is **`variant="secondary"`** (the page's primary
  CTA stays in the header bar). See `docs/empty-state.md` for the authoritative rule.

### Grid
- Content area uses 12-column grid
- Form column: `span 6 / span 6` on desktop (`lg`), `span 12 / span 12` on tablet/mobile (`base`)
- Gap between grid cells: `gap: '6'`
- Gap between form fields: `gap: '4'` (16px)
- Margin between sections: `marginTop: '10'` (top), `marginBottom: '3'` (before first field)

### Tables
- **GOLDEN RULE — cell padding**: every table cell (`th` AND `td`) has **8px** top and bottom
  padding (`paddingTop: '2', paddingBottom: '2'`). No exceptions — apply to every table.
- **GOLDEN RULE — vertical alignment**: table cell content is **`verticalAlign: 'middle'` by
  default**. It becomes **`verticalAlign: 'top'` for the WHOLE table** only when at least one
  column stacks **3 or more lines** in a single cell. 1 or 2 lines → still middle.
  - Example (align top, because this one cell is 3 lines):
    ```
    Name
    Job title
    Organization
    ```
  - A cell with just a name (1 line), or name + code (2 lines) → the table stays middle.
  - The decision is per-table: if any column hits ≥3 lines, ALL cells in that table go top.
  - See `docs/table-design.md` for the authoritative rule + rationale.
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
- Launch config: `.claude/launch.json`

---

## Branch Strategy
- `feat/review-cycles-create` — Review cycles (Evaluation form)
- `feat/flexible-competency-assignment` — Talents: competency assignment & succession plans
- Main branch: `main`

---

## 🔴 Changelog — "What's new (internal)" (update on EVERY commit + push)

There is an engineer-facing changelog in the user menu (top-right → **What's new
(internal)**), backed by `composables/useWhatsNew.ts` (rendered by
`components/WhatsNewDrawer.vue`). **Whenever you commit and push a user-facing
change, you MUST add it here in the same commit** — treat it as part of "done",
not an afterthought.

Rules:
- **One entry per `module` per `date`.** If an entry with the same `date` +
  `module` already exists, **append an item to its `items`** — do NOT create a
  second entry. Only add a new entry when the day or module is new.
- Newest **day** first (top of the `CHANGELOG` array).
- Each `item` = `{ category, area, detail, files }`:
  - `category`: `'Feature' | 'Fix' | 'Chore'`.
  - `area`: the sub-feature/screen it lives in.
  - `detail`: what actually changed (plain, specific).
  - `files`: the files touched, so it's traceable in the repo.
- `date` format: `"01 Sep 2026"`. `module` is a short area name (e.g. `Goals`,
  `Competencies`, `Internal tools`, `Build & deploy`).
