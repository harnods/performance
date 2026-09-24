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

> A Default table inside a **dashboard section card** swaps that paged footer for a
> progressive "Load more" bar and caps `MpTableContainer` at `maxHeight: 400px` with
> `<MpTableHead is-fixed>`, so the card can't grow down the page. Everything else here
> still applies. All three Goals-dashboard tables do this
> (`GoalsDashNeedsUpdate.vue`, `GoalsDashApprovalTable.vue` ×3). See
> [`pagination.md`](pagination.md#in-a-table-append-into-a-height-capped-scroll-region).

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

> **Not an exception:** a Default table sitting inside a dashboard **section card** (the
> Goals dashboard's Needs update / Awaiting approval panels). The border there belongs to
> the card, not the table — the table is still bare and borderless. Don't reach for
> `tableOuterBorder`. See [`dashboard-section.md`](dashboard-section.md).

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

## `MpTableHead` props

There is **no `MpTableHeader` component** — the `thead` wrapper is `MpTableHead`, and it
carries three boolean props. Reach for these before writing CSS that does the same job:

| Prop | Renders | Effect |
|---|---|---|
| `is-fixed` | `data-table-head-fixed` | **Sticky header**: `position: sticky; top: 0; z-index: sticky` + a `0 2px gray.100` shadow. Use it whenever the table body scrolls in a capped region — never hand-roll `position: sticky` on your own `headCell` class. |
| `is-bordered` (default **true**) | `data-table-head-bordered` | The header's bottom border. |
| `is-narrowed` (default **true**) | `data-table-head-narrowed` | The compact header row height. |

```vue
<MpTableContainer :class="scrollRegion">   <!-- maxHeight + overflowY: auto -->
  <MpTable :is-hoverable="false">
    <MpTableHead is-fixed>…</MpTableHead>
```

`MpTableCell` likewise has `is-fixed` (→ `data-table-cell-fixed`, the sticky first/last
**column**) — that's the one `useTableHorizontalScroll` drives on Custom tables.

## Header (`th`) styling

Do **not** put explicit background/border/font on `th` — the Pixel `MpTable` recipe handles it (th = `background.surface` light-gray; td = `background.neutral` white + hovered on hover; both opaque so sticky columns cover scrolling content). The only additions authors make: padding, `whiteSpace: 'nowrap'`, per-column `width`, and an inline-flex label wrapper so a sort icon can sit beside the text:

```ts
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
```

⚠️ **Confirmed live mistake, not hypothetical** — `talents/succession-plans/{index,[id]}.vue` and (until fixed) `talents/idps/{index,[id]/index}.vue` + `components/IdpPlanForm.vue` all hardcoded `fontSize: '12px', fontWeight: '600', color: 'text.secondary', textAlign: 'left'` onto `headCell`. The recipe's actual default is **14px / weight 600 / `text.default`** (dark, verified via `getComputedStyle` against `goal-cycles/index.vue`) — the hardcoded version renders visibly smaller and grayer, a real regression in visual hierarchy, not a no-op. The correct `headCell` is just:

```ts
// ✅ dominant convention — 20+ files across goals/competencies/reviews
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })

// 🚫 don't reintroduce this — renders smaller/grayer than every other table's header
const headCell = css({ paddingTop: '2', paddingBottom: '2', fontSize: '12px', fontWeight: '600', color: 'text.secondary', textAlign: 'left', verticalAlign: 'middle' })
```

If a table genuinely needs a different header look, that's a sign to check with the live Pixel MCP/design first — don't hand-tune font properties on a hunch.

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

> ⚠️ The Custom goal tables render a **static, non-functional** `<MpIcon name="sort-default" size="sm" />` that does nothing. When you build a sortable table, wire `PxColumnSortMenu` properly — don't copy the decorative icon. Working references: `goal-cycles/index.vue`, `talents/idps/index.vue`, `talents/idps/[id]/index.vue`, `talent-directory/[id].vue`.

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

### Grouping rows under a shared owner: all-or-per-row, never partial

When rows are grouped by one entity (e.g. every unassigned employee under the same
direct report, `GoalsDashUnassignedDrawer.vue`), the grouping column spans the whole
group. A **secondary** column that often — but not always — repeats within that group
(Organization) must merge over **exactly the same span or not at all**:

```ts
const sameOrg = members.every(m => m.department === members[0].department)
members.forEach((employee, i) => out.push({
  employee,
  showManager: i === 0,     managerRowspan: members.length,
  showOrg: sameOrg ? i === 0 : true,
  orgRowspan: sameOrg ? members.length : 1,
}))
```

Both spans derive from the same group boundary, so they can only ever be `n`/`n` or
`1`/`1` — never a partial overlap that would shift later `<td>`s into the wrong column.
Resist "merge consecutive runs within the group": that's precisely how the spans diverge.

Rows must also be **ordered so each group is contiguous** — `rowspan` can only merge
adjacent rows, so a scattered group silently renders as separate one-row cells.

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

> Full pattern (FAB styling, panel shape, state, and the rules for fabricating rows)
> now lives in [`dev-scenario-control.md`](dev-scenario-control.md) — there are two of
> these controls in the repo. What follows is what this particular one does.

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

## Progress column — native `MpProgress`, bar + "N of M", never a bare percentage

A column reporting completion (IDP development plans, review-cycle publish
status, etc.) is a bar **plus** the raw counts beside it — the bar alone can't
tell 1-of-2 from 50-of-100, and a lone "50%" hides how much work the row
actually represents.

**Use the native `MpProgress` component for the bar — don't hand-roll
track/fill `<div>`s.** This was the dominant convention already
(`review-cycles/index.vue`, `CycleDetailGeneral.vue`, the timeframe/instance
review pages — 4+ table usages) before `talents/idps/index.vue` was fixed to
match it; the hand-rolled version is a mistake to avoid repeating, not a
second valid option.

```ts
const progressWrap = css({ display: 'flex', alignItems: 'center', gap: '3', minWidth: '200px' })
const progressBar  = css({ flex: '1' })   // MpProgress fills its container's width
const progressCount = css({ fontSize: '12px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' })
// MpProgress's built-in `color` prop only offers a handful of named tones
// (stone/violet, etc.) — none of them are the "on track" green/teal a plain
// done/total ratio wants, so override the fill with a scoped class targeting
// the recipe's own element. Same override in review-cycles/index.vue and
// CycleDetailGeneral.vue — don't re-pick a colour per surface.
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'teal.400' } })
```

```vue
<div :class="progressWrap">
  <MpProgress variant="linear" size="sm" :class="[progressBar, tealProgress]" :value="pct" />
  <span :class="progressCount">
    <span :class="css({ color: done >= total && total > 0 ? 'text.default' : 'text.secondary' })">{{ done }}</span>
    <span :class="captionText"> of </span>
    <span :class="css({ fontWeight: '600' })">{{ total }}</span>
  </span>
</div>
```

- **`:value` takes the percentage directly (0–100), no inline `style` needed**
  — that's the whole point of using the component instead of a hand-rolled
  `<div :style="{ width: pct+'%' }">`.
- The done count goes `text.default` only once the row is **complete**, staying
  `text.secondary` otherwise, so a finished row reads as finished at a glance.
- Counts are `tabular-nums` like any numeric cell (below), and the cell carries a
  `minWidth` so the bar doesn't collapse in a narrow column.
- `variant="linear" size="sm"` on every table usage — don't reach for other
  sizes/variants without checking the live component first.

### When a hand-rolled bar is still the right call

`UpdateProgressDrawer.vue`'s own bar (not a table — a drawer body) stays
hand-rolled `<div>` track/fill, because it needs a **per-row status colour**
(`statusFillClass`, red/amber/green driven by the goal's own status) that
`MpProgress`'s fixed `color` prop can't express row-by-row without a lot of
extra wiring. A plain single-colour done/total ratio in a table cell has no
such need — reach for `MpProgress` there.

Reference: `pages/talents/idps/index.vue`, `pages/reviews/review-cycles/index.vue` (Progress/Published columns).

## Non-link name cell when a row already has its own detail button

Most Default tables pair a link-styled name (see "Clickable name cell" above)
**with** a redundant `View details` button in the trailing column — clicking
either one navigates (`talents/succession-plans/index.vue`, goal-cycles'
whole-row-clickable variant). That's the default; keep doing it for new
tables.

`talents/idps/index.vue` is a deliberate exception: the name renders as
**plain text** (no `nameLink` class, no `@click`, no cursor change) and
`View detail` is the row's **only** navigation affordance. Reach for this only
when there's an explicit reason two navigation targets on the same row would
be redundant/confusing for that specific screen — don't drop the name-link by
default just because a detail button already exists, since the paired version
is what every other list page does. When you do drop it, drop it all the way:
a plain `<span>` with a leftover `@click`/cursor-pointer that no longer looks
like a link is worse than either consistent state.

`talents/idps/[id]/index.vue`'s **Action plan** table is the same exception
one level down: the action plan's name used to be a `nameLink` that opened the
view modal (`viewing = a`) on click, but the row's own **Actions** menu already
offers **Update**, which opens that exact same modal — a second click target
doing the identical thing. The name is now plain text (`{{ a.name }}`, no
class, no `@click`); Actions → Update is the row's only way in. `Actions` →
`Edit`/`Delete` are unrelated actions (they open the add/edit drawer and the
delete confirmation, not the view modal) and stay exactly as they were.

## Two-line cell: primary value + a type/kind caption below it

When a column's value is itself typed (this competency vs. that one — the
*kind* of thing, not a per-row detail like a job title), stack the value over
a small caption naming its type, and fall back to a plain **`-`** when the row
has no value at all — never an empty cell, and never render the caption alone:

```vue
<MpTableCell as="td" :class="cell">
  <MpFlex v-if="a.relatedTo === 'competency' && a.relatedCompetency" direction="column" gap="0">
    <span :class="subText">Competency</span>
    <span>{{ a.relatedCompetency }}</span>
  </MpFlex>
  <span v-else>-</span>
</MpTableCell>
```

- **`MpFlex direction="column" gap="0"`, two plain `<span>`s** — same shape as
  every other stacked name+subtext cell in this repo (Employee, Focus), not a
  one-off. Order here is flipped from that convention on purpose: the **type**
  comes first (`subText`, `text.secondary`/12px) and the **value** second —
  since a competency and a future goal read the same ("Leadership") without
  the type labelling it, the type reads better leading than trailing. The two
  spans keep the same text styles either way (`subText` small/secondary on
  the type, plain/default on the value) — only the order swapped, not which
  line gets which style.
- **`-` replaces the whole cell**, not just the value — an empty top line with
  a dangling "Competency" caption underneath would be worse than either state.
- Reference: the **Relation** column in both `components/IdpPlanForm.vue`
  (the create/edit plan form's own action-plan table) and
  `talents/idps/[id]/index.vue` (the plan detail page's action-plan table) —
  same column, same cell markup, kept identical across both tables on purpose
  since they show the same underlying `ActionPlan.relatedTo` /
  `relatedCompetency` fields. If a second relation kind (Goal) ships for real,
  the caption becomes whichever kind applies (`'competency'` → "Competency",
  `'goal'` → "Goal") rather than a hardcoded string.

## Numeric columns — right-align + tabular-nums

```ts
const numCellBase = { paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } as const
```

Header is `textAlign: 'right'` + `width: '1%'` + `nowrap`.

## Trailing action column — `width: '1%'`, never bare `headCell`/`cell`

⚠️ **Easy to miss because it isn't a numeric column** — it's easy to reach for the
same plain `headCell`/`cell` classes every other `th`/`td` uses and stop there. Without
`width: '1%'`, the browser gives the action column an even share of whatever width
is left over, so the button/popover trigger sits in a column far wider than it
needs, floating in the extra space instead of hugging the row's right edge.

```ts
// pages/goals/goal-cycles/index.vue:269-270 — the canonical pair, reused for
// every trailing action column, not just numeric ones
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle', textAlign: 'right' })
```

```vue
<MpTableCell as="th" :class="actionHead" />          <!-- empty header, trailing column -->
…
<MpTableCell as="td" :class="actionCell">
  <MpButton variant="secondary" @click="…">View detail</MpButton>
</MpTableCell>
```

Applies to any trailing column holding a button, a popover trigger, or an
Edit/Remove icon pair — not only literal numeric data. Same idiom the numeric
columns above use (`width: '1%'` + `nowrap`); give it its own named pair rather
than reusing `numCellBase`, since an action column has no number to align.

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
- [ ] no explicit `th` bg/border/font (let the recipe do it — the real default is 14px/600/`text.default`, not a smaller gray label)
- [ ] body scrolls in a capped region? → `<MpTableHead is-fixed>`, not custom sticky CSS
- [ ] `:is-hoverable="false"` unless the row is interactive
- [ ] name cell = plain `<span>` styled as a link
- [ ] numeric cols right-aligned + `tabular-nums`
- [ ] trailing action column (button/popover/icon pair) → `width: '1%'` + `nowrap`, not bare `headCell`/`cell`
- [ ] Default table = no outer border; Custom table = `tableOuterBorder` + `useTableHorizontalScroll`
- [ ] empty state: full replacement (no data) vs in-table row (filtered-to-zero)
- [ ] pending/background-job rows merge into the real row list (never a separate table), skeleton only the not-yet-known columns, excluded from any "N goals" count, and gated behind `isMounted` if their source is client-only
