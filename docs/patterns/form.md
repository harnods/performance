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
