# Tabs

⚠️ **`MpTabs` is NOT used anywhere in this repo, and the class `.page-tab--active` does not exist.** Do not introduce them. There are two real mechanisms:

## Type A — Section/status tabs teleported to `#page-tabs`

The layout provides a tabs zone below the title bar, **outside the white stage** (`layouts/default.vue:110-120`):

```vue
<div id="page-tabs" :class="css({ display:'flex', alignItems:'flex-end', paddingInline:'6', flexShrink:'0', background:'background.surface' })" />
```

Pages teleport an underline tab bar into it. These flip an `activeTab` ref (in-page state switch) — the tab is **not its own route**, though it can be made deep-linkable via a query param (below). Used by ~8 pages (goal-cycle detail sub-pages, `pending-actions/index.vue`, timeframe detail).

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

### Deep-linkable tabs (`?tab=`)

A Type A tab is in-page state, so nothing links to it by default. When another surface
needs to land on a specific tab (the Goals dashboard's "Goals aligned" donut opens the
goal hierarchy), seed `activeTab` from a query param — **whitelist the value** so a typo
or stale link falls back to the default tab instead of rendering nothing:

```ts
type Tab = 'all' | 'hierarchy' | 'requests' | 'awaiting' | 'info'
const TABS: Tab[] = ['all', 'hierarchy', 'requests', 'awaiting', 'info']
const activeTab = ref<Tab>(TABS.includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'all')
```

Seed it **once** (`ref(...)`, not a `watch`) — the tab stays user-controlled afterwards,
so clicking another tab shouldn't fight the URL. Permission-gated tabs keep their own
guard (the existing `watch(currentUserId, …)` still bounces a non-admin off `awaiting`),
so a query param can't grant access to a tab the persona isn't allowed to see.

Reference: `pages/goals/goal-cycles/[id]/index.vue:127-134`. The same param convention
covers filters — see [`stat-card.md`](stat-card.md)'s drill-down contract.

### Tabs that also swap the header actions

`pages/dashboard.vue` puts **two whole dashboards** (Performance review · Goals) under
one page title — the title stays `Dashboard` on both; only the tab changes. When tabs
switch the entire page body like this, the `#page-header-actions` teleport must switch
with them, in the **same** teleport, branched by the same `activeTab`:

```vue
<Teleport to="#page-header-actions" defer>
  <template v-if="activeTab === 'review'">
    <MpButton variant="ghost" left-icon="newtab" @click="viewInsight">View insight</MpButton>
    <MpButton variant="primary" @click="createCycle">Create new cycle</MpButton>
  </template>
  <template v-else>
    <MpButton variant="ghost" left-icon="newtab" @click="viewGoalsInsight">View insights</MpButton>
    <MpButton v-if="goalsNewInterface" variant="primary" @click="createGoalCycle">Create goal cycle</MpButton>
    <MpButton v-else variant="primary" @click="createGoal">Create goal</MpButton>
  </template>
</Teleport>
```

Do **not** open a second `<Teleport to="#page-header-actions">` per tab — two teleports
targeting one container append both sets. One teleport, branched inside.

> Note the primary CTA also branches on the `goals-new-interface` cookie. A tab's
> actions can depend on more than the tab; keep every branch in this one block so the
> whole header is readable at a glance.

## Type B — In-page detail navigation (scroll-spy, NOT tabs)

Long detail pages that look tabbed are a **sticky scroll-spy**, not tabs. `pages/talents/talent-directory/[id].vue:54-84` defines a `NAV` array (`Profile / Performance / Competencies / History`) + an `IntersectionObserver` that sets `activeSection` on scroll; clicking calls `scrollIntoView`. The file explicitly documents this (`:8-11`). `pages/reviews/review-cycles/[id]/index.vue` uses an in-stage sticky header (`data-stuck`) instead of `#page-tabs`.

### "+ Add" tab (user-created tabs)

> 🔒 Its only current use (Talent directory pools) is hidden behind
> `TALENT_POOLS_ENABLED` ([`feature-flags.md`](feature-flags.md)) — the whole
> tab bar is unrendered while that's off, so don't go looking for it in the app.

When a page lets the user create their own tabs at runtime (e.g. Talent directory's
pool tabs, `pages/talents/talent-directory/index.vue`), append a trailing `+ Add …`
control to the same `#page-tabs` bar, styled with the tab's base styles (`tabItemBase`)
so it sits flush with the real tabs — never a separate button outside the tab bar:

```vue
<button type="button" :class="addPoolTab" @click="openAddPool">
  <MpIcon name="add" size="16px" />
  Add pool
</button>
```

```ts
const addPoolTab = css({ ...tabItemBase, color: 'text.secondary', _hover: { color: 'text.default' } })
```

Use icon name `add` (not `plus` — `plus` isn't a Pixel icon in this repo).

The button opens a right-side `MpDrawer` (`components/PxAddPoolDrawer.vue`), **not**
a modal — when the new tab needs more than just a name (here: a name, a job
position/branch scope, *and* a set of membership criteria), use the drawer +
fixed-criteria-list shape from
[`filter-bar.md`](filter-bar.md#fixed-criteria-drawer-vs-the-all-filters-scope-picker)
rather than a plain name-only `MpModal`. Everything that defines the tab is set in
that **one drawer** — there's no separate "create empty tab, then configure it
later" flow. (The drawer may still be multi-*step* internally — the pool drawer's
Describe → Build handoff, [`ai-prompt-builder.md`](ai-prompt-builder.md) — but you
never leave it holding a half-defined tab.) On save, push the new tab into a local
`ref` array **right after the permanent first tab** and switch `activeTab` to it
immediately — the permanent first tab (e.g. "All talents") never moves and can't be
removed. The same drawer is reused for editing (`mode="edit"`, prefilled from the
tab's current name, scope and criteria), reached from the pencil on the tab's
"Showing …" summary strip ([`banner.md`](banner.md) — "Summary strip"), not from a
separate "Edit criteria" button in the filter row: the affordance belongs next to
the text describing what the tab shows.

### Unconfigured tab vs. zero matches — two different treatments

These look similar and are constantly conflated. They are not the same state:

| State | Condition | Treatment |
|---|---|---|
| **Unconfigured** — the tab doesn't define anything yet | no scope *and* no criteria (`isPoolEmpty`) | Standard [empty state](empty-state.md): illustration + title + caption + `variant="secondary"` action reopening the drawer in edit mode, **replacing** the filter bar + table |
| **Configured, but nothing matches** | scope/criteria are set, they just select no rows | The table's own no-results row — filter bar and table **stay**, exactly like any other over-filtered list |

The second case keeps the table because the user needs the filter bar and "Edit
criteria" in place to widen the query; swapping in a full-page empty state would
hide the very controls that fix it. Don't invent a third "empty tab" treatment.

Note a scoped pool is *configured* even with zero criteria — a pool whose job
position is "Accountant" and whose criteria list is empty legitimately lists every
Accountant, so it must not show the unconfigured empty state.

## Rules

- Section/status switching on a list/scoped page → `#page-tabs` teleport + `tabItem`/`tabItemActive` (`text.link`).
- Long detail page navigation → scroll-spy inside the stage.
- Never reach for `MpTabs` or `.page-tab--active` — they aren't part of this codebase.
