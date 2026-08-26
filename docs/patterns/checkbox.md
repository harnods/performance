# Checkbox

Covers three recurring mistakes: the **gap** between box and label, checkbox **in tables**,
and the **bulk-action** bar that appears after selecting rows.

## 1. Label gap — use the built-in slot, never an external gap

`MpCheckbox` already renders the label via its **default slot** with the correct
**12px** box→label gap built in. Put the label text directly in the slot:

```vue
<!-- ✅ correct — 12px gap, provided by the component -->
<MpCheckbox :is-checked="v" @update:is-checked="v = $event">Enable lock edit for review</MpCheckbox>
```

Captions go in the `#description` slot (do NOT add a separate `<MpText>`):

```vue
<MpCheckbox :is-checked="v" @update:is-checked="v = $event">
  Enable lock edit for review
  <template #description>You won't be able to edit or reset the result unless requested.</template>
</MpCheckbox>
```

### 🚫 The 24px bug

```vue
<!-- BROKEN — the box→label gap becomes 24px -->
<MpFlex align="center" gap="3">
  <MpCheckbox :is-checked="v" @update:is-checked="v = $event" />
  <MpText>Enable lock edit for review</MpText>
</MpFlex>
```

Wrapping a checkbox + a separate label in an `MpFlex gap="3"` (12px) **stacks on top of**
the component's own built-in 12px → the label sits **24px** from the box. Always use the
default slot instead; there is then **no external gap to set**.

> The only time a checkbox sits next to sibling text with an intentional external gap is when
> the checkbox has **no label of its own** (`aria-label` only) and the adjacent text is a
> separate element — e.g. the bulk bar's `☑ + "N goals selected"` (`gap="2"` = 8px). That's a
> count label, not the checkbox's label.

### Multiline label → align top

When a checkbox label wraps to more than one line, the box aligns to the **top** of the label
(`alignItems: 'flex-start'`), not centered. Same for a checkbox row that also carries a Manage
button. (See [`form.md`](form.md).)

## 2. Checkbox in a table — inside the first cell, NOT a separate column

The row-select checkbox is part of the **first content column** — it lives **inside the first
cell**, together with that cell's content. There is **no dedicated checkbox-only column**.

```vue
<!-- ✅ checkbox lives inside the first (Goal) cell -->
<MpTableCell as="td" :class="[tightCell, colDivider]">
  <MpFlex align="flex-start" gap="2">
    <MpCheckbox v-if="row.kind === 'main'" :is-checked="isSelected(row.id)"
      @update:is-checked="toggleSelect(row.id)" :aria-label="`Select ${row.title}`" />
    <MpFlex direction="column" gap="0.5">
      <span :class="goalCode">{{ row.code }}</span>
      <span :class="goalNameLink" @click="goToGoal(row)">{{ row.title }}</span>
      <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
    </MpFlex>
  </MpFlex>
</MpTableCell>
```

- Align the checkbox to the top of the cell content (`align="flex-start"`) since the first
  cell usually stacks multiple lines.
- Don't add a narrow standalone `colCheckbox` column.
- **The select-all checkbox does NOT live in the table's column-header row** on the four
  goal-listing pages (Company/Organization/Team/Individual goals) — it lives in the
  accordion/group header **above** the table instead. See "Select-all in the group header"
  below. The column-header `th` for "Goal" is just the label + sort menu, no checkbox.

- `company-goals.vue` follows this — the checkbox is inside the Goal (first) cell, no
  `colCheckbox` column. Its bulk-action header cell (when the table header swaps to the bulk
  bar — section 3) uses **`paddingInline: 0` + 4px top/bottom** (`noCellPadding`) so the bar's
  checkbox lines up with the body checkbox column and the taller bulk row has breathing room.
- **Team / Organization / Individual goal tables** keep a **dedicated leading `colCheckbox`
  column** (48px) instead — an accepted exception for those grouped-by-department tables. Their
  table header never swaps to a bulk bar at all (see "Multi-group bulk actions" below), so
  `noCellPadding` doesn't apply there.

### Select-all in the group header, not the column header

On Company/Organization/Team/Individual goals, the "select all" checkbox for a group sits in
that group's **accordion/category header row** (the `gray.50` bar above the table, holding the
department or "Company-wide goals" name) — **immediately after the caret**, before the group
name. It is a permanent fixture of the header, visible whether 0 or 1+ rows are selected;
the column-header `th` never renders its own copy of it.

```vue
<!-- individual-goals.vue / organization-goals.vue / team-goals.vue -->
<div :class="accordionHeader" role="button" tabindex="0" :aria-expanded="expanded[dept.key]"
     @click="toggle(dept.key)" @keydown.enter="toggle(dept.key)">
  <!-- accordionLeftGroup (gap: '6' = 24px) groups the name block with the
       inline Actions button — keeps Actions close to the name it's scoped
       to, not pushed out to the header's far-right edge with Collapse all. -->
  <span :class="accordionLeftGroup">
    <span :class="accordionLeft">
      <MpIcon :name="expanded[dept.key] ? 'caret-down' : 'caret-right'" size="sm" />
      <span @click.stop>
        <MpCheckbox :is-checked="isAllSelected(selectableIdsFor(dept.rows))"
          :is-indeterminate="groupSelectedCount(dept.rows) > 0 && !isAllSelected(selectableIdsFor(dept.rows))"
          @update:is-checked="toggleSelectAll(selectableIdsFor(dept.rows))" aria-label="Select all" />
      </span>
      <MpText size="label" weight="semiBold" :class="valueText">{{ dept.name }}</MpText>
    </span>
    <!-- see "Multi-group bulk actions" below for soleSelectedDeptKey -->
    <span v-if="soleSelectedDeptKey === dept.key" @click.stop>
      <GoalBulkActionsMenu @edit-goals="…" @update-progress="…" @close-goals="…" @delete-goals="…" />
    </span>
  </span>
  <span v-if="di === 0" :class="collapseAllBtn" @click.stop="collapseAll">…Collapse all</span>
</div>
```

```vue
<!-- company-goals.vue — no caret (single flat group, not collapsible); Actions
     still lives in the table's own header-row swap, not here — see "Bulk
     action bar" below, since a single flat group has no multi-group case. -->
<div :class="accordionHeader">
  <span :class="accordionLeft">
    <MpCheckbox :is-checked="isAllSelected(selectableIds)" @update:is-checked="toggleSelectAll(selectableIds)" aria-label="Select all" />
    <MpText size="label" weight="semiBold" :class="valueText">Company-wide goals</MpText>
  </span>
</div>
```

- **Why not a `<button>` wrapping the whole header row (the old markup):** a real
  `MpCheckbox` renders a native `<input>`, and nesting interactive content inside a `<button>`
  is invalid HTML (same constraint noted elsewhere for accordion headers — see `table.md`'s
  accordion-header pattern and `AddGoalDrawer.vue`'s `personRowToggle`). The header row is a
  plain `<div>` with `role="button"` + `tabindex="0"` + a `keydown.enter` handler instead, and
  the checkbox is wrapped in `<span @click.stop>` so checking it doesn't also toggle the
  accordion.
- The department/category `<button>` used to be the toggle; it no longer exists as a discrete
  element — the whole header `<div>` (including the label) is the click target, `except` the
  checkbox (stopped), the inline Actions menu (stopped), and the "Collapse all" link (already
  `@click.stop`).
- `:is-indeterminate` is required on Organization/Team/Individual's group checkbox — unlike
  `GoalBulkActionBar`'s own checkbox (only ever rendered once 1+ is selected, so it's always
  either full or partial), this one is visible at **0** selected too, where indeterminate must
  stay off. Guard it with `groupSelectedCount(dept.rows) > 0 && !isAllSelected(...)`, not just
  `!isAllSelected(...)` alone.

## 3. Bulk action bar — replaces the table header, never shifts the body

**Company goals only** (the one page with a single, non-collapsible group — see "Multi-group
bulk actions" below for why Organization/Team/Individual do it differently). When 1+ rows are
selected, a bulk-action bar appears **in place of the table's column-header row** (`thead`) — it
is **not** an extra bar added above the table, and the filter bar above stays untouched. Source:
`components/GoalBulkActionBar.vue` (Figma Goals node `4831:33085`).

### Anatomy (`GoalBulkActionBar.vue`)

- Container: `MpFlex align="center" justify="space-between"`, **fixed 52px height**,
  `paddingInline: '4'`, `background: 'gray.25'`, 1px `border.default` bottom border — flush
  with the table, matching the header row it replaces.
- **Left cluster** (`gap="4"`):
  - a select-all checkbox — `:is-checked="isAllSelected"` `:is-indeterminate="!isAllSelected"`,
    `aria-label="Select all"` (no visible label; `gap="2"` to the count text);
  - `<MpText size="label" weight="semiBold">{{ n }} goal(s) selected</MpText>`;
  - an **Actions** button — `<GoalBulkActionsMenu>` (`components/GoalBulkActionsMenu.vue`),
    the shared trigger + `MpPopoverList`: Update / Edit / Close, an `MpDivider`, then **Delete**
    (danger, `color: text.danger`). Also reused by the inline group-header Actions and
    `GoalFloatingBulkBar` — see "Multi-group bulk actions" below. Don't re-inline this popover
    markup anywhere; always reach for the shared component.
- **Right cluster**: `<MpText size="label" color="text.secondary">Press esc to deselect</MpText>`.
- Behaviour: `Escape` emits `clear` (deselect all); events `clear`, `edit-goals`,
  `update-progress`, `close-goals`, `delete-goals`, `toggle-select-all`.
- **Per-page opt-out**: `hide-update-progress` / `hide-close-goals` props on both
  `GoalBulkActionBar` and `GoalBulkActionsMenu` (both default `false`) hide just that one
  `MpPopoverListItem` — Edit and Delete always stay. Company goals sets both (bulk
  progress-update and bulk-close don't apply at that level; the row-level "Update goal
  progress" / "Close goal" actions are unaffected).

### Wiring — swap the header row via `colspan`

```vue
<MpTableHead>
  <!-- 1+ selected → the whole header row becomes the bulk bar -->
  <MpTableRow v-if="selectedCount > 0">
    <MpTableCell as="th" :colspan="headerColCount" :class="noCellPadding">
      <GoalBulkActionBar :selected-count="selectedCount" :is-all-selected="isAllSelected(ids)"
        @toggle-select-all="toggleSelectAll(ids)" @clear="clearSelection" … />
    </MpTableCell>
  </MpTableRow>
  <!-- else → the normal column-header row -->
  <MpTableRow v-else> … normal th cells … </MpTableRow>
</MpTableHead>
```

- The bulk-bar cell spans **all** columns (`:colspan="headerColCount"`).

### ⚠️ The 8px misalignment — where the bar's padding goes

The bar's select-all checkbox must land in the **same column as the row checkboxes below
it**. That works out only if exactly one element supplies the horizontal inset:

```ts
// ✅ the host <th> keeps its own horizontal padding (the recipe's 8px) and only
//    trims the vertical; the bar contributes none
const bulkBarCell = css({ paddingBlock: '1' })                    // 4px top/bottom, 8px sides
const bulkBar     = css({ height: '40px', paddingInline: '0' })   // no inset of its own
```

```ts
// 🚫 both supply one → the bar's checkbox sits 8px right of every row checkbox
const noCellPadding = css({ padding: '0' })
const bulkBar = css({ height: '52px', paddingInline: '4' })       // 16px vs the cell's 8px
```

Measured on the Goals dashboard before the fix: bar checkbox at x=282, row checkboxes at
x=274. It reads as a wobble in the left edge the moment you select a row.

- **Background and bottom border belong to the `th`, not the bar.** If the bar paints its
  own `gray.25` while sitting inside the cell's padding, the fill stops short of the row's
  edges and the header goes two-tone. The `MpTable` recipe already gives `th` an opaque
  `background.surface` — let it show.
- Keep the bar's own height (40px) close to the normal header row's so selecting rows
  doesn't visibly grow the header.
- Applies to every bulk bar: `GoalBulkActionBar.vue`, `GoalsDashApprovalTable.vue`,
  `GoalsDashNeedsUpdate.vue`.
- **The body must not shift.** Because column widths are locked by a `<colgroup>` (Custom
  table — see [`table.md`](table.md)) and only the *header row* is swapped, the body columns
  and rows stay exactly in place when selection toggles on/off. On Company goals specifically,
  never implement bulk mode as a floating bar that pushes the table down or re-flows columns —
  that's the header-swap approach's whole point. (Organization/Team/Individual goals *do* use a
  floating bar, but only because they have no single header row left to swap once selection can
  span multiple department tables at once — see "Multi-group bulk actions" below.)
- **All four goal-listing pages render one "select all" checkbox per category/department
  group**, each calling `toggleSelectAll(idsForThatGroup)` from the same shared
  `useGoalBulkSelect()` instance. `toggleSelectAll` **merges** into the existing `selectedIds`
  set (adds the group's ids, or removes them if the group is already fully selected) rather
  than replacing the set outright — selecting one group's checkbox must never clear another
  group's already-checked rows. See `composables/useGoalBulkSelect.ts`.

## 4. Multi-group bulk actions — inline Actions vs a floating bar

Organization/Team/Individual goals group rows into **multiple independent department
accordions**, and selection can span any combination of them (see rule above — selecting one
group never clears another). That means the single "swap the table header" trick `GoalBulkActionBar`
uses (section 3) doesn't generalize: with 2+ departments selected there's no longer one header
row to swap. Company goals doesn't have this problem (exactly one group, always), so it keeps
the section 3 behavior unchanged.

Instead, these three pages track **how many departments currently have 1+ selected rows** and
place the Actions trigger accordingly:

```ts
// organization-goals.vue / team-goals.vue / individual-goals.vue
const selectedDeptKeys = computed(() => departments.value.filter(d => groupSelectedCount(d.rows) > 0).map(d => d.key))
const soleSelectedDeptKey = computed(() => (selectedDeptKeys.value.length === 1 ? selectedDeptKeys.value[0] : null))
const isMultiDeptSelected = computed(() => selectedDeptKeys.value.length > 1)
```

- **Exactly one department selected** → `GoalBulkActionsMenu` (just the Actions button + its
  popover, no checkbox/count/esc-hint) renders **inline in that department's own accordion
  header**, sitting **24px after the department name** — grouped with the name+checkbox in a
  shared `accordionLeftGroup` wrapper (`gap: '6'`), *not* pushed flush to the header's right
  edge and not grouped with "Collapse all" (that stays independently pinned right via the
  header's own `justify-content: space-between`). See "Select-all in the group header" above
  for the full `accordionLeftGroup` / `accordionLeft` markup. The table's column-header row
  stays completely normal — it never swaps to a bulk bar on these three pages.
- **Two or more departments selected** → nothing renders inline in any header; instead a single
  `GoalFloatingBulkBar` (`components/GoalFloatingBulkBar.vue`) appears, fixed to the bottom of
  the viewport:
  ```vue
  <GoalFloatingBulkBar v-if="isMultiDeptSelected" :selected-count="selectedCount"
    @edit-goals="…" @update-progress="…" @close-goals="…" @delete-goals="…" />
  ```
  - `position: fixed`, `bottom: 32px`, horizontally centered (`left: 50%` +
    `transform: translateX(-50%)`), `zIndex: 20`.
  - `background: 'background.neutral'`, `padding: '3'` (12px all sides), 1px border in
    **`gray.400`** (a raw palette step, not `border.default` — deliberately more visible since
    the bar floats over arbitrary page content), `borderRadius: '12px'` (literal px, not the
    `md` token), drop shadow for elevation (reuses the same floating-card recipe as
    `succession-plans/index.vue`'s `coachFloat`).
  - Content: `<MpText size="label" weight="semiBold">{{ n }} goal(s) selected</MpText>` on the
    left, `<GoalBulkActionsMenu>` on the right, **`gap: '10'` (40px)** between them — nothing
    else (no checkbox, no esc-hint; the department checkboxes above already show selection
    state).
- Both surfaces emit the same four events (`edit-goals`, `update-progress`, `close-goals`,
  `delete-goals`) wired to the same page-level handlers (`goToImport(...)`, `onBulkClose`,
  `isBulkDeleteModalOpen = true`) regardless of whether 1 or 2+ departments are selected — the
  underlying action always operates on the full cross-department `selectedIds` set.
- `GoalBulkActionsMenu` (`components/GoalBulkActionsMenu.vue`) is the extracted Actions
  popover — just the trigger button + `MpPopoverList`, no checkbox/count/container. Both
  `GoalBulkActionBar` (section 3) and `GoalFloatingBulkBar` render it internally; the inline
  group-header case renders it directly. One source of truth for the four menu items.

## Rules

- Label in the default slot; caption in `#description`. Never wrap checkbox + separate label in
  a gapped `MpFlex` (→ 24px bug). No external gap when the slot is used.
- Multiline label → box aligns top.
- Table row-select checkbox = inside the first content cell, not its own column.
- Select-all checkbox = in the accordion/category header (after the caret), not the
  column-header `th`; needs `:is-indeterminate` since it's visible at 0 selected too.
- Company goals: bulk action bar replaces the header row (`colspan`); Actions = primary
  `caret-down` popover; Delete is danger. Body never shifts (widths locked by `colgroup`;
  only the header row swaps).
- Bulk-bar inset comes from the **host `th`** (`paddingBlock: '1'`, keep the horizontal),
  never from the bar (`paddingInline: '0'`) — otherwise the select-all checkbox sits 8px
  off the row-checkbox column. Background + bottom border are the `th`'s too.
- Organization/Team/Individual goals: Actions never swaps the table header. Exactly one
  department selected → `GoalBulkActionsMenu` inline in that department's own accordion header.
  2+ departments selected → `GoalFloatingBulkBar`, fixed to the bottom of the viewport.
- `GoalBulkActionsMenu` is the one shared Actions popover — never re-inline its markup.
