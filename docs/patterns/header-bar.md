# Header bar

There are **two distinct bars** stacked vertically. Do not confuse them.

| | Global AppHeader | Per-page header bar |
|---|---|---|
| File | `components/AppHeader.vue` | `layouts/default.vue:72-108` |
| Height | **56px** | **72px** (hard rule — never change) |
| Scope | App-wide, identical every route | Per-route, driven by `route.meta` |
| Background | `background.neutral` + bottom border | none (inherits `background.surface`), no border |
| Content | logo, product switcher, inbox, launcher, user menu | breadcrumb, H1 title, teleported actions |

See also [`page-title.md`](page-title.md) for the title/breadcrumb inside the per-page bar.

---

## Per-page header bar (72px)

`layouts/default.vue:72-108`. 72px, `paddingInline="6"`, `flexShrink="0"`, `justify="space-between"`. It has **no background/border of its own** — the visible white "stage" with border/radius is a *separate* box below it.

```vue
<MpFlex align="center" justify="space-between" gap="4" height="72px" paddingInline="6" flexShrink="0">
  <MpFlex direction="column" gap="0" justify="center">
    <MpFlex v-if="breadcrumb" align="center" gap="1"> … breadcrumb … </MpFlex>
    <MpText as="h1" size="h1" weight="semiBold" color="text.default">{{ pageTitle }}</MpText>
  </MpFlex>
  <div id="page-header-actions" :class="css({ display: 'flex', alignItems: 'center', gap: '3' })" />
</MpFlex>
```

A status badge can sit beside the title via the `#page-title-badge` teleport target (inline after the `<h1>`) — see [`page-title.md`](page-title.md).

Two opt-outs via `definePageMeta`:
- `noPageHeader: true` → skips the whole title+tabs block, stage runs flush to top (e.g. `pages/inbox/notifications.vue`).
- `boxed: true` → flat grey canvas, no white stage panel (e.g. `pages/dashboard.vue`, `pages/index.vue`). Logic: `layouts/default.vue:27,123-134`.

### Action buttons → `#page-header-actions` teleport

The layout renders an empty `<div id="page-header-actions">` (`layouts/default.vue:104-107`). Pages inject CTAs into it — buttons live in the page's `<template>` but render at the header bar's right edge. **Always use `defer`.**

```vue
<!-- pages/goals/goal-cycles/index.vue:289-292 -->
<Teleport to="#page-header-actions" defer>
  <MpButton variant="secondary" @click="openHelp">Help</MpButton>
  <MpButton variant="primary" @click="openDrawer">New goal cycle</MpButton>
</Teleport>
```

The page's **primary CTA always lives here**, not inside the stage. Richer example with a Help popover: `pages/reviews/review-cycles/index.vue:198-222`.

---

## Global AppHeader (56px)

`components/AppHeader.vue`. `MpFlex as="header"`, 56px, `background="background.neutral"`, `borderBottom` `border.default`, `paddingInline="6"`, `justify="space-between"` (`:169-179`).

- **Left** (`:180-207`): Talenta SVG logo → 1px×20px `headerDivider` → product-switcher button reading **"Performance"** + `caret-down` (visual stub).
- **Right** (`:209-292`):
  - **Inbox** — `NuxtLink to="/inbox/notifications"` + `PxIcon name="inbox" :size="20"`.
  - **App launcher** — button + `PxIcon name="shortcuts" :size="20"` (stub).
  - **User menu** — `MpPopover placement="bottom-end" trigger="click"` (320px): profile header, **"View as"** persona switcher (`VIEW_AS_PERSONAS` from `composables/useCurrentUser`), "Add another account", **"Reset demo data"** (`resetDemoData` resets the stores), "Sign out" (stub), footer links.

Both avatars are wrapped in `<ClientOnly>` to avoid SSR hydration mismatch.

---

## Rules

- The 72px per-page bar height is fixed — never override it.
- Page CTAs go through `#page-header-actions` teleport (`defer`), never hard-coded inside the stage, never in the global AppHeader.
- The global AppHeader is app chrome — don't add page-specific content to it.
