# Table design — golden rules

Authoritative rules for **every** table in this project (all `MpTable` usages in
`pages/` and `components/`). These are golden rules: apply them to every table, no
exceptions, and to every new table going forward.

## 1. Cell padding — 8px top & bottom

Every table cell — both header (`as="th"`) and body (`as="td"`) — has **8px** top and
bottom padding.

```ts
const cell = css({ paddingTop: '2', paddingBottom: '2' /* 2 = 8px */ })
```

Do not use 12px (`'3'`) or the component default. Horizontal padding is unaffected by
this rule (keep whatever the layout needs, e.g. an explicit left inset on a first column).

## 2. Vertical alignment — middle by default, top only when a column has ≥3 lines

Table cell content is **`verticalAlign: 'middle'` by default.**

It becomes **`verticalAlign: 'top'` for the WHOLE table** — every cell — **only when at
least one column stacks 3 or more lines of content in a single cell.**

- 1 line (e.g. just a name) → middle
- 2 lines (e.g. name + employee code) → middle
- **3+ lines** (e.g. name + job title + organization) → **top, applied to the entire table**

### Example

A cell like this is 3 lines, so the whole table aligns top:

```
Nama
Jabatan
Organization
```

But a table whose tallest cell is only 1–2 lines stays middle.

### Why per-table (not per-cell)

Mixing middle and top within one table row looks misaligned. The tallest column dictates
the alignment for the whole table: if the tallest cell is ≥3 lines, top reads cleaner
(short cells hug the top next to the tall one); if ≤2 lines, middle reads cleaner.

## Applying it

Define one `cell` style per table and reuse it on every `MpTableCell`:

```ts
// Table with a ≥3-line column → top
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

// Table whose tallest cell is ≤2 lines → middle
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
```

Right-aligned numeric columns, hover-only-when-interactive, and the 1px bottom border rule
(see `CLAUDE.md` → Tables) still apply on top of this.
