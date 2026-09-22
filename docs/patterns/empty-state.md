# Empty state

Authoritative rule also in [`../empty-state.md`](../empty-state.md). This is the repo-usage summary.

## Anatomy

When a list/collection has **no records**, replace the filter bar + table with a centered empty state — never an empty table shell:

1. **Illustration** from `public/illustrations/` — `height: 240px`, `alt="" aria-hidden`. Reuse existing art (`/illustrations/empty-timeframe.png` is the shared default); don't invent new illustrations.
2. **Title** — 16px / 600 / lh24, `color: text.default`.
3. **Caption** — `size="label"`, `color: text.secondary`.
4. **Action button** — **`variant="secondary"`**. The page's primary CTA stays in `#page-header-actions` (see [`header-bar.md`](header-bar.md)).

Reference: `pages/goals/goal-cycles/index.vue:296-301` (textbook).

```vue
<MpFlex v-if="totalRows === 0" :class="emptyStateWrap">
  <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden :class="emptyIllustration">
  <MpText :class="emptyTitle">{{ hasFilter ? 'No result found' : 'Items will appear here' }}</MpText>
  <MpText size="label" :class="captionText">…</MpText>
  <MpButton v-if="!hasFilter" variant="secondary">New goal cycle</MpButton>
</MpFlex>
```

## Empty vs filtered-to-zero

- **No data at all** → full empty state (above); show the action button.
- **Filter/search yields zero** → keep the table shell + a single centered `colspan` row, OR the empty state with `hasFilter`-aware copy and NO action button. See [`table.md`](table.md) §empty.

## Dashboard sections are the exception

Everything above describes a **page** whose collection is empty. Inside a **dashboard
section card**, an empty panel renders a centered **title + caption only** — no
illustration, no action button — because an empty section is often good news and four
stacked 240px illustrations would bury the sections that do have data. See
[`dashboard-section.md`](dashboard-section.md) for the exact markup and the reasoning.

## Restricted access (whole page, role-gated)

Same anatomy as above, minus the action button (there's nothing the viewer
can do here), used when an entire page is off-limits to the current role
rather than a collection being empty. The page's own title/breadcrumb stay in
the fixed header — only the body swaps to this state:

```vue
<MpFlex v-if="!canAccess" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
  <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
  <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
    <MpText :class="emptyTitle">You don't have access to this page</MpText>
    <MpText size="label" color="text.secondary">Goal settings can only be opened by a Super Admin.</MpText>
  </MpFlex>
</MpFlex>
<div v-else>...real page content...</div>
```

Reference: `pages/goals/goal-settings.vue` (`canAccess = computed(() =>
isSuperAdmin(currentUserId.value))`). Two things must both be true for a
role-gated page:

- **The route itself guards its content** (above) — this is the actual access
  control. A direct URL, or switching "View as" while already on the page,
  must never leave the real content reachable.
- **The nav entry pointing at it is hidden for the same role** — a
  convenience so the restricted page doesn't dangle in the menu, not a
  substitute for the guard above. See [`sidebar-menu.md`](sidebar-menu.md)'s
  "Role-gated nav entries".

## Inline notice (different construct)

`PxNoAssignmentNotice` is an inline `MpBanner variant="info"` (title + description) — used for "nothing assigned yet" contexts (`succession-plans/create.vue`), not the centered illustration state.

## Paired with a banner (async background creation)

When records are being created asynchronously and none exist to show yet
(see [`table.md`](table.md) §"Records being created asynchronously"), the
info banner sits ABOVE the empty state, not nested inside its `v-else`
branch — otherwise the banner never renders on a cycle whose only records
are the ones currently being created. Widen the empty-state trigger to
`totalRecords === 0 || activeBatch`, and hide the empty state's own action
button while the batch is active. Reference: `goal-cycles/[id]/index.vue`.

## Rules

- Empty-state action button = **secondary**, not primary (the one deviation to fix: `goal-categories/index.vue:241` uses primary).
- Reuse existing illustrations at 240px, `alt="" aria-hidden`.
- Never render an empty table with just headers.
