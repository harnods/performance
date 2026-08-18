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
