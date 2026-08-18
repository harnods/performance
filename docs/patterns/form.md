# Form

## Field wrapper

Every field: `MpFormControl` (with `id`) + `MpFormLabel` + `MpFormErrorMessage`. `:is-invalid` on the control drives error styling.

```vue
<!-- CycleGeneralForm.vue:490-499 -->
<MpFormControl id="timeframe" :is-invalid="timeframeInvalid">
  <MpFormLabel>Time frame for this cycle</MpFormLabel>
  <PxSelectPopover v-model="timeframe" :options="..." placeholder="Select time frame" :class="selectWidth" />
  <MpFormErrorMessage>You must select a time frame</MpFormErrorMessage>
</MpFormControl>
```

### Required marker

⚠️ Two conventions coexist. **Preferred: `:is-required="true"` on `MpFormControl`** (built-in, `competencies/create.vue:477`). The drawers roll a manual red asterisk (`MpFlex align="center" gap="1"` + `<MpText :class="css({ color: 'text.danger' })">*</MpText>`, `AddGoalDrawer.vue:580-584`). Pick one per form; don't mix.

### Help text

Prefer built-in **`MpFormHelpText`** (`competencies/create.vue:506`). Field hints as ad-hoc `MpText`/`span` (`helperText = css({ fontSize:'12px', lineHeight:'16px', color:'text.secondary' })`) also exist.

### Character counter

`labelRow` flex (label left, `{{ count }} / {{ MAX }}` right): `labelRow = css({ display:'flex', alignItems:'center', justifyContent:'space-between' })`, count text `css({ fontSize:'12px', lineHeight:'16px', color:'text.secondary' })` (`GoalCategoryFormDrawer.vue:156-186`).

## Dropdowns — `PxSelectPopover` always

Never raw `MpSelect` in a form (raw `MpSelect` appears only *inside* `PxSelectPopover.vue` as the hidden visual trigger). Props (`PxSelectPopover.vue:18-27`): `modelValue`, `options: {value,label,description?,trailing?,group?}[]`, `placeholder`, `isClearable`, `isDisabled`, `width`, `searchable`, `searchPlaceholder`.

Width — two valid ways:
- `:width` prop (string): `width="100%"`, `:width="'240px'"`.
- `:class="selectWidth"` fallthrough (needed for responsive/media-query widths — `PxSelectPopover.vue:41` keeps wrapper 100% when `width` omitted).

⚠️ `selectWidth` value is inconsistent across files (`50%` / `264px` / `60%` / `320px` / grid `span3`). CLAUDE.md's intent: **50% of the form column (≈264px on the 3/12 grid)**. Default to that.

## Grid & spacing (`CycleGeneralForm.vue:341-348`)

```ts
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({ gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' }, maxWidth: { lg: '656px' }, display: 'flex', flexDirection: 'column' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })   // 16px between fields
```

- Form column = 6/12 on `lg`, 12/12 below, capped 656px. `gap: '6'` between grid cells, `gap: '4'` between fields.
- `competencies/create.vue` is the alternate model — the form column *is* the 12-col grid and each field carries `span6`/`span3`/`span12` so fields share rows.

### Section header / sub-header / description

```ts
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '10', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })  // H2
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })  // H3
```

- Section headers are **hand-rolled `MpText :class="h2Class"`** — never `MpText size="h2"` (recipe broken). Add `as="h2"`/`as="h3"` for semantics.
- Description under header: `<MpText size="label" color="text.secondary">`.
- Section separation = **spacing + per-row `border-bottom`, no cards, no divider lines** (`toggleRow`/`weightRow`/`memberRow` carry `borderBottom: '1px solid' border.default`). `marginTop: '10'` (40px) between sections is canonical.

## Toggle / Checkbox / Radio

Use the built-in default slot for the label + `#description` slot for the caption — do NOT wrap in an external `MpFlex`:

```vue
<!-- CycleGeneralForm.vue:545-548 -->
<MpCheckbox :is-checked="enableLockReview" @update:is-checked="(v) => (enableLockReview = v)">
  Enable lock edit for review
  <template #description>You will not be able to edit or reset the review result unless requested.</template>
</MpCheckbox>
```

- Binding: prefer `:is-checked` + `@update:is-checked`; `v-model:is-checked` shorthand also exists.
- Exception to "no external MpFlex": when a `MpBadge` sits inline with the label, wrap just the label content in an `MpFlex align="center" gap="2"`.
- **Multiline label → align top**: rows with a toggle+description + a Manage button use `alignItems: 'flex-start'` (`toggleRowPlain`). Same for checkbox labels >1 line.
- **Explanation as a tooltip instead of `#description`**: when the caption only matters to someone unsure why a toggle is disabled/relevant (not everyone, every time), drop the `#description` slot and put an info icon + `MpTooltip` inline with the label instead — same `MpFlex as="span"` exception as the badge case, and the same icon+tooltip pairing already used for section headers ([`table.md`](table.md) has no equivalent; see `CycleGeneralForm.vue:456-459` for the section-header form):

```vue
<!-- AddGoalDrawer.vue — "Let the goal owner update their own progress" -->
<MpToggle :id="id" :is-checked="checked" @update:is-checked="onChange">
  <MpFlex as="span" align="center" gap="1">
    Let {{ owner.name.split(' ')[0] }} update their own progress
    <MpTooltip :label="hintText" use-portal>
      <MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary' })" />
    </MpTooltip>
  </MpFlex>
</MpToggle>
```

  Use this instead of `#description` when the row already reads as busy (e.g. one toggle per person in a per-owner list) and the explanation is genuinely secondary — don't reach for it as a default over `#description`, which stays the norm for a caption everyone should read.

## Multi-select rendered as removable tags — `MpInputTag`

When a field picks several items from a pool and each pick should show as a removable chip inline (not a checklist + separate "selected" list below), use **`MpInputTag`** (`@mekari/pixel3`) — not a hand-rolled checkbox list with manual remove buttons.

No official docs exist for it in this repo — these gotchas came from reading its compiled source directly:

- **`:is-show-suggestions="true"` is required** — defaults to `false` (no dropdown at all without it).
- **`:is-enable-create-new-tag="false"`** if every tag must resolve to a real record — defaults to `true` (otherwise users can free-type arbitrary tags that don't match anything).
- `suggestions` is a list of `{ [key]: unknown }` objects (or plain strings); the searched/displayed text comes from `item[suggestionKey]` — default `suggestionKey` is `'label'`, so shape suggestions as `{ id, label }` to skip passing that prop.
- **A tag's own `id` is auto-generated as `` `tag-${text}` `` when added — never trust it to carry your real record id.** Carry the id inside the matched suggestion object instead, and read it back off `tag.value` (the *whole* matched suggestion), not `tag.id`.
- `@change` fires on every add/remove with the FULL current tag array — always resync your own state from the whole array; don't try to diff adds vs. removes.
- `data` (the initial tags) is read **once at mount** (no reactive re-sync from later prop changes) — fine as long as the component remounts (e.g. behind a `v-if`) whenever the initial selection should change from outside its own UI.

```vue
<MpInputTag
  placeholder="Search employees…"
  :data="contributorTagData(ownerId)"
  :suggestions="contributorSuggestions"
  :is-show-suggestions="true"
  :is-enable-create-new-tag="false"
  use-portal
  @change="(items) => onContributorTagsChange(ownerId, items)"
/>
```
```ts
const contributorSuggestions = computed(() => pool.value.map(id => ({ id, label: employeeById(id)?.name ?? id })))
function contributorTagData(ownerId: string) {
  return (selected[ownerId] ?? []).map((id) => {
    const label = employeeById(id)?.name ?? id
    return { id, text: label, value: { id, label }, isInvalid: false, isReadOnly: false }
  })
}
function onContributorTagsChange(ownerId: string, items: unknown) {
  const ids = (Array.isArray(items) ? items as { value?: unknown }[] : [])
    .map(i => (i.value && typeof i.value === 'object' ? (i.value as { id?: string }).id : undefined))
    .filter((id): id is string => !!id)
  selected[ownerId] = ids
}
```

Reference: `AddGoalDrawer.vue` — "Goal contributor" → Selected members/employees.

## Per-card accordion inside a form (collapse one repeated card's own body)

When a repeated per-person card (one per goal owner, etc.) carries enough content that several stacked get long, make the card's OWN body collapsible — open by default — rather than collapsing the whole page section. The card's identity row (avatar + name) becomes the toggle button; any OTHER real interactive control already in that row (a switch, etc.) must stay a **sibling** of that button, never nested inside it — nesting a real interactive control inside a `<button>` is invalid HTML (same constraint as [`table.md`](table.md)'s accordion-header bulk action).

```vue
<div :class="personRowBetween">
  <button type="button" :class="personRowToggle" :aria-expanded="isOpen(id)" @click="toggle(id)">
    <MpIcon :name="isOpen(id) ? 'caret-down' : 'caret-right'" size="sm" />
    <PxAvatar ... /><span>{{ name }}</span>
  </button>
  <MpToggle ... /> <!-- sibling of the button, not nested inside it -->
</div>
<template v-if="isOpen(id)">
  <!-- the card's collapsible body -->
</template>
```

- Default-open: `isOpen(id) => state[id] ?? true` — an unset entry reads as open, so nothing needs seeding.
- If a save-time validation error targets a field inside a collapsed card, force that card back open in the same validation pass so the error is actually visible.
- `personRowToggle` = `personRow`'s flex layout + button-chrome reset (`background: transparent, border: none, padding: 0, font: inherit, textAlign: left, cursor: pointer`).
- **Skip the accordion entirely when a card variant never has more than one thing to show.** AddGoalDrawer's Individual-goal contributor card has only a single field below the identity row (an employee tag picker) — not enough content to justify collapsing. Company shares the same flat tag-picker (no All/Selected mode split — there's no member pool to back that choice, and prod parity makes Company contributor always optional, never mandatory), so it gets the same non-accordion treatment. The two still differ in *when* the picker shows and whether it's required: Individual's is gated behind self-update being off and is required once shown (owner already covers progress while self-update is on, so nothing to pick); Company's is always visible regardless of self-update and never required (no `MpText` required-mark, no `is-invalid`, no error message — see `contributorModeErrors` in `save()`, forced `false` for Company). Both render the identity row as a plain `personRow` div (no button, no caret, no `isContribCardOpen` gating); every other goal type keeps the full toggle-button accordion above.

Reference: `AddGoalDrawer.vue` — "Goal contributor" cards (`personRowToggle`, `isContribCardOpen`/`toggleContribCard`; the non-accordion variant is gated on `isIndividual || isCompanyType`).

## Rich text (long descriptions)

A long free-text field that needs formatting uses **`MpRichTextEditor`** (not `MpTextarea`). Bind with `:value` + `@change` (it is NOT `v-model`), set `has-border` and `:maxlength`, and pass a **limited `:options`** toolbar — the house set is bold / italic / underline / strike, bullet & numbered lists, alignment, and clear-formatting (so pasted styled text can be stripped):

```ts
const descriptionEditorOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  ['bulletList', 'orderedList', 'align'],
  ['clear'],
]
```
```vue
<MpRichTextEditor id="goal-description-rte" :value="description" :maxlength="descriptionMax"
  has-border placeholder="Describe this goal…" :options="descriptionEditorOptions"
  @change="(v) => (description = v)" />
```

The value is HTML — render it back with `MpRTEStyleProvider`. Example: `AddGoalDrawer.vue` (goal description). Don't add heading/mention/image/undo unless asked.

## Input with unit suffix

`MpInputGroup` + `MpInputRightAddon` (unit) / `MpInputLeftAddon` (currency):

```vue
<MpInputGroup :class="css({ width: '104px' })">
  <MpInput v-model="m.weight" type="number" />
  <MpInputRightAddon>%</MpInputRightAddon>
</MpInputGroup>
```

`%` weight inputs = `width: '104px'`. Suppress number spinners with a `noSpinner` class when needed.

## Rules

- Field = `MpFormControl` + `MpFormLabel` (+ `MpFormErrorMessage`). Required via `:is-required`.
- Dropdowns = `PxSelectPopover`, width ≈50% of form column.
- Section headers hand-rolled (`h2Class`/`h3Class`), never `MpText size="h2"`.
- No cards / no divider lines between sections — spacing + row border-bottom.
- Toggle/checkbox/radio use built-in label + `#description` slots.
- See [`buttons.md`](buttons.md) for footer CTAs, [`page-form.md`](page-form.md) for page-vs-drawer.
