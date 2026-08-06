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
