# Pagination

One canonical footer copied across all 6 list pages: a fixed **52px** bar, `paddingInline: '4'`, sitting inside the same `MpFlex direction="column"` as the table container (no gap → reads as an attached table footer). Left = rows-per-page + "Showing" count; right = "Page x of y" + prev/next ghost icon buttons.

## Markup (`pages/reviews/review-cycles/index.vue:368-418`)

```vue
<div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
  <MpFlex align="center" gap="3">
    <MpText size="label" :class="captionText">Rows per page</MpText>
    <MpPopover is-close-on-select use-portal placement="bottom-start">
      <MpPopoverTrigger>
        <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <MpPopoverList>
          <MpPopoverListItem v-for="opt in rowsPerPageOptions" :key="opt" :is-active="opt === rowsPerPage"
            @click="rowsPerPage = opt; currentPage = 1">{{ opt }}</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
    <MpText size="label" :class="captionText">Showing {{ showingFrom }}–{{ showingTo }} of {{ totalRows }}</MpText>
  </MpFlex>

  <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
    <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
    <MpTooltip label="Prev page" use-portal>
      <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
    </MpTooltip>
    <MpTooltip label="Next page" use-portal>
      <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
    </MpTooltip>
  </div>
</div>
```

## Backing script (`pages/talents/competencies/index.vue:109-116`)

```ts
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => filtered.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
```

## Rules

- Default `rowsPerPage = 10`; options `[10, 25, 50, 100]`.
- **Always** guard `totalPages` with `Math.max(1, Math.ceil(...))` (avoids "Page 1 of 0" — the bug in review-cycles' bare `Math.ceil`).
- Render the table from `paged`, not `filtered`.
- Prev/next = ghost `size="sm"` icon buttons, `:is-disabled` at first/last page; wrap in `MpTooltip` (prev/next label).
- Reset `currentPage = 1` when rows-per-page or any filter changes.
- Footer attaches to the table container (same column, no gap), `height: 52px`, `paddingInline: '4'`.

## Progressive "Load more" (lists, and dashboard tables)

Use progressive reveal instead of paged rows-per-page for a plain list inside a
card/drawer (not an `MpTable`) — e.g. a boxed list of people — **and for a table inside a
dashboard section card** (see the fixed-height section below) — all four of the Goals
dashboard's tables now do. A list **page**'s table keeps the 52px paged footer above;
don't convert those.

Seen in
`pages/goals/goal-cycles/[id]/index.vue` (owner rows), `components/ReviewerModals.vue`
(`loadMoreAdd`), `components/AddGoalDrawer.vue`'s "Goal members" box
(`components/AddGoalDrawer.vue:558-561` for the logic, `:1215-1240` for the markup), and
`components/PxFilterScope.vue`'s checkbox list inside the "All filters" drawer — opt in per
scope with a `paginated` prop (only the Goal owner scope sets it; every attribute-value scope
stays a plain unpaginated list since those are always short) and re-derive the "Showing X of Y
…" noun from an optional `selectAllLabel` prop instead of hardcoding it, since a filter list's
label doesn't always read naturally as the noun ("Goal owner" → "employees", not "goal owner").

```ts
const PAGE = 10
const visibleCount = ref(PAGE)
const visibleItems = computed(() => items.value.slice(0, visibleCount.value))
function loadMore() { visibleCount.value += PAGE }
```

```vue
<MpFlex v-if="items.length > visibleCount" align="center" gap="1" :class="loadMoreBar">
  <MpText size="label" :class="captionText">Showing {{ Math.min(visibleCount, items.length) }} of {{ items.length }} <thing>.</MpText>
  <MpTextlink as="button" size="label" @click="loadMore">Load {{ Math.min(PAGE, items.length - visibleCount) }} more.</MpTextlink>
</MpFlex>
```

- Default page size **10**, same as table pagination.
- No "rows per page" control and no prev/next — this is append-only, not paged.
- The "Showing X of Y" caption always sits directly beside (or above) the "Load more" link, never separated.
- Reset `visibleCount` back to `PAGE` whenever the underlying data or the host
  drawer/form resets — `watch(() => props.rows, () => { visibleCount.value = PAGE })`,
  the append-only counterpart of `currentPage = 1`.
- The bar disappears once everything is revealed (`v-if="remaining > 0"`); it never
  renders as a disabled "Load 0 more".

### In a table: append into a height-capped scroll region

A dashboard section card ([`dashboard-section.md`](dashboard-section.md)) is one panel
among several, so a card that grew by 10 rows per click would push every panel below it
off screen. **The table's scroll region is height-capped, so "Load more" scrolls instead
of growing the page.** Reference: `components/GoalsDashApprovalTable.vue`.

```ts
// Caps at ~7 rows. maxHeight, NOT height: a card with three rows shouldn't sit in
// 400px of dead space. The point is that the card stops growing, not that it is
// always this tall.
const scrollRegion = css({ maxHeight: '400px', overflowY: 'auto' })
```

```vue
<MpFlex direction="column">
  <MpTableContainer :class="scrollRegion">
    <MpTable :is-hoverable="false">
      <MpTableHead is-fixed>…</MpTableHead>   <!-- sticky header, Pixel's own -->
      <MpTableBody>…</MpTableBody>
    </MpTable>
  </MpTableContainer>

  <div v-if="remaining > 0" :class="loadMoreBar">
    <MpText size="label" :class="captionText">Showing {{ visibleRows.length }} of {{ countLabel(rows.length) }}.</MpText>
    <MpTextlink as="button" size="label" @click="loadMore">Load {{ Math.min(PAGE, remaining) }} more.</MpTextlink>
  </div>
</MpFlex>
```

- **`<MpTableHead is-fixed>` is the sticky header — do not hand-roll it.** The prop sets
  `data-table-head-fixed`, and the recipe supplies `position: sticky; top: 0; z-index:
  sticky` plus a `0 2px gray.100` shadow that separates the header from the rows sliding
  under it. Writing `position: sticky` onto your own `headCell` class reimplements it
  without the shadow and without the right z-index. See
  [`table.md`](table.md#mptablehead-props) for the component's other two props.
- **Put the cap ON `MpTableContainer`, not a wrapper `<div>`.** The component is already
  the scrollport (it sets `overflow-x: auto`), and sticky resolves against the nearest
  scrollport. A wrapper would scroll while the header stayed pinned to an inner
  scrollport that never moves — the header would just scroll away.
  *(This is not the `overflow: hidden` mistake [`table.md`](table.md) warns about;
  `overflow-y: auto` is exactly what that element is for.)*
- Don't give `th` a background of your own — the `MpTable` recipe already paints it
  opaque `background.surface`, which is what hides the rows passing beneath.
- The bulk-action bar replaces the header row inside the same `<thead>`, so it inherits
  the sticky behaviour for free — it stays reachable however far you've scrolled. Its
  padding contract is in [`checkbox.md`](checkbox.md#-the-8px-misalignment--where-the-bars-padding-goes).
- **The "Load more" bar sits OUTSIDE the scroll region**, as the card's last child, same
  52px height and `paddingInline: '4'` as the paged footer it replaces. Inside, it would
  scroll out of reach.
- Select-all covers the **revealed** rows (`visibleRows`), not the whole dataset — same
  rule as paged select-all covering the current page.

### Boxed list container

When the progressive list needs a visible boundary (vs. sitting flush in the
section), wrap it exactly like a table: one outer box, **not** per-row cards.

```ts
const box = css({
  display: 'flex', flexDirection: 'column',
  border: '1px solid', borderColor: 'border.default', borderRadius: '6px',
  overflow: 'hidden', // clips the last row's corners to the radius
})
const row = css({
  display: 'flex', alignItems: 'center', gap: '3',
  paddingX: '4', paddingTop: '3', paddingBottom: '3',
  borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default',
  _last: { borderBottomWidth: '0' }, // no double border against the box's own edge
})
```

- **6px rounded corners**, single 1px outer border — no per-row card borders/radius.
- Every row gets a bottom border except the last (`_last: { borderBottomWidth: '0' }`); the outer box supplies the final edge.
- The "Load more" bar (if present) is the box's last child and does **not** get its own top border — the row above it already supplies the separator.
- See `components/AddGoalDrawer.vue`'s `memberBox`/`memberBoxRow`/`memberLoadMoreBar` for the reference implementation, and `contribCardsWrap` for the same box treatment applied to a list of taller cards (12px left/right padding instead of a per-row box, since each "row" there is itself a multi-line card).
