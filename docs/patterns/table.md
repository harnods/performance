# Table — the #1 pattern (read every time)

Tables are the most frequent source of mistakes. Read this before touching **any** table.
Authoritative golden rules also live in [`../table-design.md`](../table-design.md) and `CLAUDE.md`;
this doc adds the real, code-grounded skeletons and the Default-vs-Custom split.

## There are TWO table types — pick the right one first

Almost every rule below branches on this. Identify which you're building **before** writing markup.

| | **Default table** | **Custom table** |
|---|---|---|
| What | the ordinary list table | goal cycle **details** & review cycle **details** |
| Wrapper | bare `MpTableContainer`, **no outer border** | rounded **outer border** `<div>` around `MpTableContainer` |
| Layout | auto | `table-layout: fixed` + `<colgroup>`, `minWidth` ~1264–1448px |
| Vertical align | **middle** | **top** (owner cell stacks 4 lines) |
| Column dividers | none (bottom row border only) | every column gets a right divider (`colDivider`) |
| Split rows (rowspan) | no | **yes** — some columns merge/split across an owner's rows |
| Sticky columns | none, or `has-shadow` | first/last sticky via `useTableHorizontalScroll` |
| Examples | `goal-cycles/index.vue`, `talent-directory/index.vue`, `competencies/index.vue`, `goal-categories/index.vue` | `goal-cycles/[id]/*` goal tables, `reviews/review-cycles/[id]/index.vue`, `GoalSubmissionReview.vue` |

## Default table skeleton (the common case)

`pages/goals/goal-cycles/index.vue:346-362`:

```vue
<MpFlex direction="column">              <!-- table + 52px pagination footer, no gap -->
  <MpTableContainer>
    <MpTable :is-hoverable="false">
      <MpTableHead>
        <MpTableRow>
          <MpTableCell as="th" :class="headCell">Goal cycle name</MpTableCell>
          <MpTableCell as="th" :class="actionHead" />   <!-- trailing action col, empty header -->
        </MpTableRow>
      </MpTableHead>
      <MpTableBody>
        <MpTableRow v-for="cycle in pagedCycles" :key="cycle.id">
          <MpTableCell as="td" :class="tightCell">…</MpTableCell>
          <MpTableCell as="td" :class="actionCell" @click.stop>…</MpTableCell>
        </MpTableRow>
      </MpTableBody>
    </MpTable>
  </MpTableContainer>
</MpFlex>
```

Invariants: `as="th"`/`as="td"` always set; trailing empty-header action column; `MpTableContainer` is the direct scroll host; pagination footer shares the same `MpFlex direction="column"` (no gap) — see [`pagination.md`](pagination.md).

## Custom table skeleton (fixed / horizontally scrollable)

The outer border **must** be on a separate wrapper `<div>`, not on `MpTableContainer` (the component already sets `overflow-x:auto`; putting `overflow:hidden` on the same element kills scrolling). `pages/goals/goal-cycles/[id]/index.vue:545-573`:

```vue
<div ref="wrapperRef" :class="tableOuterBorder">
  <MpTableContainer>
    <MpTable :is-hoverable="false" :class="fixedTable">
      <colgroup>
        <col :class="colOwner">
        <col v-if="visibleColumns.category" :class="colCategory">
      </colgroup>
      <MpTableHead>…</MpTableHead>
      <MpTableBody>…</MpTableBody>
    </MpTable>
  </MpTableContainer>
</div>
```

```ts
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1448px' })
const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
```

> The rounded outer border is a **deliberate exception** to the "no outer border" golden rule — it frames the horizontal scroll region. Use it ONLY for Custom table. Default table stays flat.

## Cell styles (GOLDEN RULES)

Define styles once per file (module-level `const`s) and reuse on every cell. The recurring names are `tightCell` (body), `headCell` (header), `actionCell`/`actionHead` (trailing action col) — not literally `cell`.

- **Padding — always `paddingTop: '2', paddingBottom: '2'` (8px) on every `th` and `td`.** No `'3'` (12px), no recipe default. This is 100% consistent across the repo — keep it that way.
- **Vertical align — per table, not per cell:**
  - Default table → `verticalAlign: 'middle'`.
  - Custom table → `verticalAlign: 'top'` (because at least one column stacks ≥3 lines).
  - Rule: if ANY column in the table stacks 3+ lines in one cell, the WHOLE table goes `top`; otherwise `middle`.

```ts
// Default table
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Custom table
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
```

## Header (`th`) styling

Do **not** put explicit background/border/font on `th` — the Pixel `MpTable` recipe handles it (th = `background.surface` light-gray; td = `background.neutral` white + hovered on hover; both opaque so sticky columns cover scrolling content). The only additions authors make: padding, `whiteSpace: 'nowrap'`, per-column `width`, and an inline-flex label wrapper so a sort icon can sit beside the text:

```ts
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
```

## Column sort — `PxColumnSortMenu`

`components/PxColumnSortMenu.vue` = hover-revealed header icon → popover. Props `colKey`, `sortType: 'text'|'number'|'date'`, `sortKey`, `sortDir`; emits `sortChange: [key, dir]`; clicking the active direction clears the sort. Wiring (`goal-cycles/index.vue:352`):

```vue
<MpTableCell as="th" class="gc-sort-th" :class="headCell">
  <span :class="thInner"><span>Goal cycle name</span>
    <PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name"
      :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
</MpTableCell>
```

Hover-reveal needs an **unlayered** scoped rule to beat the component's `visibility:hidden` (`:586-591`):

```css
.gc-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
```

> ⚠️ Only `goal-cycles/index.vue` actually wires sorting. The Custom goal tables render a **static, non-functional** `<MpIcon name="sort-default" size="sm" />` that does nothing. When you build a sortable table, wire `PxColumnSortMenu` properly — don't copy the decorative icon.

## Default row order — newest-first

Every data table's **default** order (no manual column sort active) is **newest-first**: the most recently added/updated row on top. A newly created record must never land at the bottom.

- Store/list that appends new rows → reverse the base for display: `[...rows].reverse()`, or sort by `updatedAt`/`createdAt`/`startDate` desc when such a field exists (e.g. `goal-cycles` sorts by start date desc).
- Only the no-sort default is affected — a manual `PxColumnSortMenu` sort still overrides.
- Exceptions: read-only reference tables with an intrinsic order (e.g. a competency-standard group list) and genuine chronological logs keep their own order.

```ts
// newest-first default; manual sort wins
const rows = computed(() => [...store.pools.value].reverse().filter(matchesFilters))
const sorted = computed(() => (sortKey.value ? [...rows.value].sort(byColumn) : rows.value))
```

## Clickable name cell — use a plain styled `<span>`

Preferred (avoids MpTextlink's button padding, works with row-level `@click.stop`):

```vue
<span :class="goalNameLink" @click="goToGoal(row)">{{ row.title }}</span>
```
```ts
const goalNameLink = css({ display: 'inline', color: 'text.link', cursor: 'pointer', textAlign: 'left', minWidth: '0', whiteSpace: 'normal', overflowWrap: 'break-word', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
```

> This CSS is copy-pasted under 4 names (`goalNameLink`/`nameLink`/`linkText`/`linkReset`) and the element type varies (`span` vs `MpTextlink as="a"` vs `as="button"`). **Standardize on the plain `<span>` form** for table cells.

## Row hover — only when interactive

- Read-only/display tables: `:is-hoverable="false"` (26 of 28 tables do this).
- Row navigates on click: `is-hoverable` (only `talent-directory/index.vue` — rows open a profile).
- Custom clickable row without the recipe hover: `:is-hoverable="false"` + a `clickableRow` class + row `@click`, and `@click.stop` on cells with their own controls:
  ```ts
  const clickableRow = css({ cursor: 'pointer', _hover: { background: 'background.neutral.subtle' } })
  ```
- **Accordion / expand:** clicking anywhere on the row (or a group header bar) toggles; caret-right → caret-down; kebab/controls inside use `@click.stop`.

## Row action menu (kebab) — branch on row state with `<template>`

The trailing action cell is a `MpPopover` + `MpPopoverList` of `MpPopoverListItem`s.
When a row's **lifecycle state** changes which actions make sense, split the list into
`<template v-if="…">` / `<template v-else>` blocks rather than hanging a `v-if` on every
single item — the reader should be able to see each state's whole menu at a glance.

```vue
<MpPopoverList>
  <template v-if="row.isDraft">
    <MpPopoverListItem v-if="!row.isAwaitingApproval" @click="submitRowForApproval(row)">Submit for approval</MpPopoverListItem>
    <MpPopoverListItem @click="openActivityLog(row)">Activity log</MpPopoverListItem>
    <MpPopoverListItem v-if="!row.isAwaitingApproval" @click="editRow(row)">Edit</MpPopoverListItem>
    <MpPopoverListItem @click="deleteRow(row)"><span :class="css({ color: 'text.danger' })">Delete</span></MpPopoverListItem>
  </template>
  <template v-else> … the live-goal menu … </template>
</MpPopoverList>
```

- Destructive item last, wrapped in `<span :class="css({ color: 'text.danger' })">`.
- Never offer an action the row's state can't honour (no "Update progress"/"Close goal"
  on a draft — it isn't live yet).
- Keep the branches identical across sibling tables. The goal tables carry the same
  draft branch in all five files.

## In-cell accordion (expand within a cell, not a new row)

Secondary detail that belongs to one cell expands **inside that cell**, under a caret
toggle — no extra `MpTableRow`, so rowspan/merged cells are unaffected (the cell just
grows taller). Use this only for detail with no values of its own in the *other*
columns. The moment an expanded entry needs its own Progress/Status/etc., switch to
**real inserted rows** instead (below) — a repeating goal's past occurrences look like
an in-cell list at first glance but each one has its own achievement, so they don't
qualify.

```vue
<MpFlex v-if="expanded[row.id]" direction="column" gap="1">…plain text per entry, same values as the row above…</MpFlex>
```

## Real inserted rows that stay "attached" to their parent

Two goal-table accordions insert real `MpTableRow`s below the row that owns them —
**"View aligned goals"** (a different goal, e.g. built for `alignedToId`) and
**"View previous goals"** (the SAME goal, an earlier finished period). Both merge
their rows into the parent's Category/Sub-category/Goal type cells (`rowspan` spans
parent + all its inserted rows) instead of repeating identical text on every row —
only Progress/Status differ per row. The actual **expanded aligned goals** are the one
exception: each is a genuinely different goal (can even have a different owner), so
it always gets its **own**, un-merged Category/Sub-category/Goal type cell.

```ts
// blue left border marks a real inserted row as a child of the one above it
const alignedGoalCell = css({ borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: 'border.brand' })
```

**The "View aligned goals" trigger's position depends on whether the OTHER
accordion is expanded** — it is normally just the parent row's own last line
(simplest, most common case: nothing else on the row). But once past-occurrence
rows are inserted below the parent, the trigger moves to become its own row,
placed *after* them, so the reading order stays fixed: parent → past occurrences →
aligned-goals trigger → aligned goals. Leaving it fixed inside the parent row would
make it look like it sits "above" content inserted below it, even though its own
expand state never changed.

```vue
<!-- Parent row's own last line — ONLY when there's nothing expanded below to push it out. -->
<button v-if="visibleColumns.alignedGoals && row.alignedGoals.length && !expandedRepeat[row.id]" type="button" :class="alignedLink" @click="toggleAligned(row.id)">
  <MpIcon :name="expandedAligned[row.id] ? 'caret-down' : 'caret-right'" size="sm" />
  View aligned goals ({{ row.alignedGoals.length }})
</button>
```

```js
// ownerRows(): the trigger becomes its own 'aligned-trigger' row ONLY when
// repeat is expanded — otherwise it stays inline in the main row above.
if (row.alignedGoals.length && expandedRepeat[row.id]) {
  flat.push({ kind: 'aligned-trigger', /* … */ parentGoalId: row.id })
}
```

### ⚠️ The #1 way to break column alignment for the REST of the table

Every `rowspan` on a merged cell (Category/Sub-category/Goal type) MUST agree on
exactly how many physical rows it covers — **Category, Sub-category, and Goal type
rowspans must never disagree**, or two cells end up claiming the same physical row,
and the browser silently shifts every `<td>` after that point into the wrong column
for the rest of the table (invisible in a plain text dump — you only see it by
inspecting rendered `rowspan` attributes or looking at the actual pixels).

This bit us for real: the pre-existing "two sibling `'main'` rows sharing a category
merge their cell" behavior (via a plain consecutive-scan) doesn't know about a
`'main'` row's OWN repeat/trigger children. A goal with an expanded repeat block
followed by a sibling `'main'` goal in the same category produced Category
`rowspan=10` (reaching through the repeat block into the sibling) while Sub-category/
Goal type stopped at `rowspan=9` (correctly not reaching the sibling, since its
subcategory/type differ) — a real, live bug, not hypothetical.

**The fix:** a `'main'` row's sibling-merge chain must stop dead the moment ANY row
in the chain has its own repeat/trigger children (`unitSize() > 1`) — never reach
*past* an expanded block into a following sibling, even when categories match:

```js
function mergeSpan(matches) {
  let span = 0, j = i
  while (j < flat.length && flat[j].kind === 'main' && matches(flat[j])) {
    const size = unitSize(j)
    span += size
    j += size
    if (size > 1) break // this row had its own repeat/trigger children — stop here
  }
  return span
}
const categoryRowspan = newCategory ? mergeSpan(r => r.category === row.category) : 0
const subCategoryRowspan = newSub ? mergeSpan(r => r.category === row.category && r.subCategory === row.subCategory) : 0
```

Whenever you add a new row-merging concept to a Custom table, **grep for every place
that computes a `rowspan` on the same column set and verify they can never diverge**
for the same physical span — that's the actual invariant, not "does this look right
in one screenshot."

Reference: `goal-cycles/[id]/index.vue` — `ownerRows()`'s `unitSize()` + `mergeSpan()`
helpers, and the `'main' | 'aligned' | 'repeat' | 'aligned-trigger'` `FlatRow.kind`
union.

## Records being created asynchronously by a background job

When a batch of records is being created asynchronously (e.g. goals approved
in bulk, materialized by a background job rather than immediately — see
`useGoalRequestBatchStore`), **don't render placeholder/skeleton rows for
them mixed into the real table.** A still-creating owner simply has none of
that batch's records in the list yet. Instead:

- Show an `MpBanner variant="info"` above the table area explaining that
  goals are being created (with a "Refresh page" `MpTextlink` — no close
  button, since it's reporting real in-progress state and disappears on its
  own once the job resolves).
- The table's own **empty state also covers "nothing to show while a batch
  is creating,"** not just the true zero-records case — widen its trigger
  condition to `totalRecords === 0 || activeBatch` (see
  [`empty-state.md`](empty-state.md)). The banner sits above BOTH branches
  (empty state and the real table), not nested inside either, so it still
  shows on a cycle whose only records so far are the ones the batch is
  creating.
- Hide the empty state's own secondary action button while a batch is
  active — a second "create more" action doesn't make sense mid-flight.

Reference: `goal-cycles/[id]/index.vue` — `activeRequestBatch` gates the
banner; `goals.length === 0 || activeRequestBatch` gates the empty state.

*(Earlier revision of this page rendered pending rows inline with
`MpSkeleton` cells for the columns the job hadn't written yet — that
approach was dropped in favor of the empty-state-covers-it treatment above;
don't resurrect the skeleton-row merge.)*

### ⚠️ SSR/hydration gotcha for client-only batch state

If the "is a batch active" signal depends on client-only state (e.g.
`localStorage`, as `useGoalRequestBatchStore` does), **gate it behind an
`isMounted` flag**:

```ts
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })
const activeRequestBatch = computed(() => (isMounted.value ? activeBatchFor(cycleId, currentUserId) : undefined))
```

Without this, SSR renders as if no batch is active (server has no
`localStorage`), while the client's very first computed pass may already see
one — a genuine content mismatch between server and client render. Vue logs
"Hydration completed but contains mismatches" for this. Gating on
`isMounted` makes the SSR pass and the client's first pass agree, and the
real state is then applied by a normal **post-mount reactive patch**, not a
hydration attempt.

### Dev-only scenario toggle (not a product pattern)

`goal-cycles/[id]/index.vue` has a floating circular button, fixed bottom-right
(24px margin), that switches between "Default" and "Async (goals being
submitted)" to preview the banner/empty-state combo above without running a
real bulk-approval flow. It's explicitly **not** a product UI pattern — don't
reuse this floating-button treatment for a real feature. It exists purely so
the async-creation behavior can be inspected without manually seeding
`localStorage`; see the "Dev scenario control" comment block in that file for
what it does (`createSubmission` + `approveSubmission` through the real code
path, run for all 12 batch owners — not just one — each targeting an
employee with zero goals in the cycle so the preview weight never conflicts
with anyone's real 100% budget; the primary owner gets 3 non-uniform-weight
preview goals, the other 11 get 1 each, so every owner in the batch shows a
real creating→created job instead of just padding the banner's employee count).
The simulated per-owner job latency is 3-5s (deliberately slow enough to read
as a real background job on screen).

## Bulk action embedded in an accordion group header

A group-level bulk action (e.g. "Publish N goals" for an owner's unsubmitted
drafts) goes in the accordion header's trailing slot, as a plain `<span>`
styled to look like a textlink with `@click.stop` — **not** `MpTextlink` or a
real `<button>` — because the header itself is already a `<button>`
(`@click="toggleOwner(...)"`), and a real interactive element can't nest
inside another one. `@click.stop` keeps the action from also toggling the
accordion open/closed. Mirrors `organization-goals.vue`'s `collapseAllBtn`
(same nested-interactive constraint, same `<span>` + `@click.stop` fix).

```vue
<button type="button" :class="accordionHeader" @click="toggleOwner(grp.id)">
  <span :class="accordionLeft">…</span>
  <span v-if="grp.draftCount > 0" :class="publishDraftsLink" @click.stop="publishOwnerDrafts(grp.id)">
    Publish {{ grp.draftCount }} {{ grp.draftCount === 1 ? 'goal' : 'goals' }}
  </span>
  <MpText v-else size="label-small" :class="captionText">{{ grp.total }} goals</MpText>
</button>
```

When the bulk-action textlink is showing, drop the plain "N goals" count
next to it instead of showing both — two counts side by side reads as
redundant/confusing, even when they happen to differ.

Reference: `goal-cycles/[id]/index.vue` (`publishDraftsLink`,
`publishOwnerDrafts`), `organization-goals.vue` (`collapseAllBtn`).

## Row selection & bulk actions

- The row-select checkbox goes **inside the first content cell**, not a separate checkbox
  column. The select-all checkbox goes inside the first header cell.
- When 1+ rows are selected, the **column-header row is replaced** (via `colspan`) by the bulk
  action bar — never a floating bar above the table. Column widths are locked by `<colgroup>`
  so the body does **not** shift when selection toggles.
- Full anatomy + wiring: **[`checkbox.md`](checkbox.md)**.

## Numeric columns — right-align + tabular-nums

```ts
const numCellBase = { paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } as const
```

Header is `textAlign: 'right'` + `width: '1%'` + `nowrap`. The trailing action column reuses the same right-align + `width: '1%'` + `nowrap` idiom.

## Merged / rowspan cells (Custom table)

Every column carries a right divider; on a merged (rowspan) owner cell, use `colDivider` when not scrolling and swap to the sticky `fixedLeftCol` (inset boundary shadow, not a heavier border) when scrolling:

```ts
const colDivider   = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const fixedLeftCol = css({ position: 'sticky', left: '0', zIndex: '1', boxShadow: 'inset -1px 0px var(--mp-colors-border-default)', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const fixedBodyBg  = css({ background: 'white' })  // opaque so pinned col covers scrolling content
```

```vue
<MpTableCell v-if="row.showOwner" as="td" :rowspan="row.ownerRowspan" :is-fixed="hasOverflow"
  :class="[hasOverflow ? fixedLeftCol : colDivider, fixedBodyBg, ownerCell, colOwner]">
```

Child/aligned rows leave the owner cell out (`v-if="row.showOwner"`).

## Horizontal scroll — `useTableHorizontalScroll`

```ts
const { wrapperRef, hasOverflow } = useTableHorizontalScroll()
```

Attach `wrapperRef` to the outer border div. `hasOverflow` (true only when the table actually overflows) gates sticky columns: `:is-fixed="hasOverflow"` + `hasOverflow ? fixedLeftCol : colDivider`. A fitting table doesn't get "stuck" columns.

> A second mechanism exists (`<MpTableContainer has-shadow>` + `[data-table-has-left-shadow]` attr selectors, `talent-directory/index.vue`). Prefer the composable for new Custom tables; either is acceptable if you mirror one file end-to-end.

## Empty table — two conventions

- **(a) Full empty-state replacement** — no data at all → replace filter bar + table with a centered illustration + title + caption + `variant="secondary"` button (`goal-categories/index.vue:233-243`, `goal-cycles/index.vue:294-302`). See [`empty-state.md`](empty-state.md). This is the preferred "no records" state.
- **(b) In-table empty row** — filter/search yields nothing but the shell should stay → a single centered `colspan` row:
  ```vue
  <MpTableCell as="td" :colspan="colCount" :class="css({ textAlign: 'center', paddingBlock: '8' })">No employees match your filters.</MpTableCell>
  ```

Rule of thumb: genuinely empty dataset → (a); filtered-to-zero → (b).

## Not in this repo (don't invent)

- **Editable form-in-cell** (borderless input taking the cell's border, `focus-within` inset shadow, gray non-form columns, white thead) — **does NOT exist here.** No table is an editable data-grid. All tables are read-only/display or navigate-on-click. Do not add this pattern unless explicitly asked.
- **Zebra striping** — never used.

## Quick checklist

- [ ] Default or Custom table? (border/align/dividers/split-rows follow from that)
- [ ] `as="th"`/`as="td"` on every cell
- [ ] `paddingTop/Bottom: '2'` (8px) on every cell
- [ ] vertical align: middle (A) / top (B, or any table with a ≥3-line column)
- [ ] no explicit `th` bg/border (let the recipe do it)
- [ ] `:is-hoverable="false"` unless the row is interactive
- [ ] name cell = plain `<span>` styled as a link
- [ ] numeric cols right-aligned + `tabular-nums`
- [ ] Default table = no outer border; Custom table = `tableOuterBorder` + `useTableHorizontalScroll`
- [ ] empty state: full replacement (no data) vs in-table row (filtered-to-zero)
- [ ] pending/background-job rows merge into the real row list (never a separate table), skeleton only the not-yet-known columns, excluded from any "N goals" count, and gated behind `isMounted` if their source is client-only
