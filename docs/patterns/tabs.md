# Tabs

⚠️ **`MpTabs` is NOT used anywhere in this repo, and the class `.page-tab--active` does not exist.** Do not introduce them. There are two real mechanisms:

## Type A — Section/status tabs teleported to `#page-tabs`

The layout provides a tabs zone below the title bar, **outside the white stage** (`layouts/default.vue:110-120`):

```vue
<div id="page-tabs" :class="css({ display:'flex', alignItems:'flex-end', paddingInline:'6', flexShrink:'0', background:'background.surface' })" />
```

Pages teleport an underline tab bar into it. These flip an `activeTab` ref (in-page state switch), **not routes**. Used by ~8 pages (goal-cycle detail sub-pages, `pending-actions/index.vue`, timeframe detail).

Canonical (`pages/goals/goal-cycles/[id]/index.vue:437-471`, styles `:315-325`):

```vue
<Teleport to="#page-tabs" defer>
  <div :class="tabBar">
    <button type="button" :class="activeTab === 'requests' ? tabItemActive : tabItem" @click="activeTab = 'requests'">
      My requests
      <span v-if="myPendingRequestsCount > 0" :class="awaitingBadge">{{ myPendingRequestsCount }}</span>
    </button>
    <button type="button" :class="activeTab === 'info' ? tabItemActive : tabItem" @click="activeTab = 'info'">Goal cycle info</button>
  </div>
</Teleport>
```

```ts
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2',
  paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400',
  color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })
```

Active tab = **`color: text.link`, `fontWeight: 600`, `borderBottomColor: border.brand`**; the `-1px` bottom margin overlaps the zone edge. Badges (`awaitingBadge`) can sit inside a tab.

> **Canonical naming**: use `tabItem` / `tabItemActive` with `text.link`. `pages/reviews/review-cycles/[id]/timeframe/[timeframeId].vue:328-335` diverges (`tabActive` + `text.brand`) — **do not copy that variant**; use `text.link`.

## Type B — In-page detail navigation (scroll-spy, NOT tabs)

Long detail pages that look tabbed are a **sticky scroll-spy**, not tabs. `pages/talents/talent-directory/[id].vue:54-84` defines a `NAV` array (`Profile / Performance / Competencies / History`) + an `IntersectionObserver` that sets `activeSection` on scroll; clicking calls `scrollIntoView`. The file explicitly documents this (`:8-11`). `pages/reviews/review-cycles/[id]/index.vue` uses an in-stage sticky header (`data-stuck`) instead of `#page-tabs`.

## Rules

- Section/status switching on a list/scoped page → `#page-tabs` teleport + `tabItem`/`tabItemActive` (`text.link`).
- Long detail page navigation → scroll-spy inside the stage.
- Never reach for `MpTabs` or `.page-tab--active` — they aren't part of this codebase.
