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

- The select-all checkbox lives inside the **first header cell** the same way.
- Align the checkbox to the top of the cell content (`align="flex-start"`) since the first
  cell usually stacks multiple lines.
- Don't add a narrow standalone `colCheckbox` column.

- `company-goals.vue` follows this — the checkbox is inside the Goal (first) cell, no
  `colCheckbox` column.
- **Team / Organization / Individual goal tables** keep a **dedicated leading `colCheckbox`
  column** (48px) instead — an accepted exception for those grouped-by-department tables.
  There, when bulk mode replaces the header with the bulk bar, the bulk-action header cell uses
  **`paddingInline: 0` + 4px top/bottom** so the bar's checkbox lines up with the body checkbox
  column and the taller bulk row has breathing room.

## 3. Bulk action bar — replaces the table header, never shifts the body

When 1+ rows are selected, a bulk-action bar appears **in place of the table's column-header
row** (`thead`) — it is **not** an extra bar added above the table, and the filter bar above
stays untouched. Source: `components/GoalBulkActionBar.vue` (Figma Goals node `4831:33085`).

### Anatomy (`GoalBulkActionBar.vue`)

- Container: `MpFlex align="center" justify="space-between"`, **fixed 52px height**,
  `paddingInline: '4'`, `background: 'gray.25'`, 1px `border.default` bottom border — flush
  with the table, matching the header row it replaces.
- **Left cluster** (`gap="4"`):
  - a select-all checkbox — `:is-checked="isAllSelected"` `:is-indeterminate="!isAllSelected"`,
    `aria-label="Select all"` (no visible label; `gap="2"` to the count text);
  - `<MpText size="label" weight="semiBold">{{ n }} goal(s) selected</MpText>`;
  - an **Actions** button — `<MpButton variant="primary" right-icon="caret-down">` opening an
    `MpPopover` → `MpPopoverList`: Update / Edit / Close, an `MpDivider`, then **Delete**
    (danger, `color: text.danger`).
- **Right cluster**: `<MpText size="label" color="text.secondary">Press esc to deselect</MpText>`.
- Behaviour: `Escape` emits `clear` (deselect all); events `clear`, `edit-goals`,
  `update-progress`, `close-goals`, `delete-goals`, `toggle-select-all`.

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

- The bulk-bar cell spans **all** columns (`:colspan="headerColCount"`) and zeroes its padding
  (`noCellPadding`) so the bar's own 52px is the only height.
- **The body must not shift.** Because column widths are locked by a `<colgroup>` (Custom
  table — see [`table.md`](table.md)) and only the *header row* is swapped, the body columns
  and rows stay exactly in place when selection toggles on/off. Never implement bulk mode as a
  floating bar that pushes the table down or re-flows columns.

## Rules

- Label in the default slot; caption in `#description`. Never wrap checkbox + separate label in
  a gapped `MpFlex` (→ 24px bug). No external gap when the slot is used.
- Multiline label → box aligns top.
- Table row-select checkbox = inside the first content cell, not its own column.
- Bulk action bar = replaces the header row (`colspan`), 52px, `gray.25`, bottom border; Actions
  = primary `caret-down` popover; Delete is danger. Body never shifts (widths locked by
  `colgroup`; only the header row swaps).
