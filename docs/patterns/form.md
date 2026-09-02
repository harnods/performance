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

Never raw `MpSelect` in a form (raw `MpSelect` appears only *inside* `PxSelectPopover.vue` as the hidden visual trigger, and only when `search-on-field` is off). Props (`PxSelectPopover.vue`): `modelValue`, `options: {value,label,description?,trailing?,group?,photo?}[]`, `placeholder`, `isClearable`, `isDisabled`, `width`, `searchable`, `searchPlaceholder`, `searchOnField`.

Width — two valid ways:
- `:width` prop (string): `width="100%"`, `:width="'240px'"`.
- `:class="selectWidth"` fallthrough (needed for responsive/media-query widths — `PxSelectPopover.vue:41` keeps wrapper 100% when `width` omitted).

⚠️ `selectWidth` value is inconsistent across files (`50%` / `264px` / `60%` / `320px` / grid `span3`). CLAUDE.md's intent: **50% of the form column (≈264px on the 3/12 grid)**. Default to that.

### `search-on-field` — typing directly into the field instead of a popover-embedded search box

Default `searchable` opens the popover to a *separate* search input at the top, above the option list (`competencies/create.vue`'s Job position, `CycleGeneralForm.vue`'s Timeframe — most existing usages). Pass the boolean `search-on-field` instead when the field itself should be the search box — no embedded search bar, the closed field is a real text input you type straight into (`talents/competencies/import-results.vue`'s Job position / Job level / the extra scope fields):

```vue
<PxSelectPopover
  v-model="jobPosition"
  :options="jobPositionOptions"
  placeholder="Select job position"
  width="100%"
  search-on-field
/>
```

Do not pass `searchable` + `search-on-field` together — pick one per field, same as the required-marker rule above.

Behavior (`PxSelectPopover.vue`'s `searchOnField` branch): the trigger becomes an `MpInputGroup`/`MpInput` with a trailing `chevrons-down` addon (same look as `DashMultiSelectSearch.vue`'s own select-styled search trigger), not the disabled-look `MpSelect`. Clicking it opens the popover exactly like clicking the old select did — nothing extra to wire for that. Focusing the field clears it so typing starts fresh; typing filters the list live; blurring without picking reverts the field back to the current selection's label, so an abandoned search never sticks. Selecting a `MpPopoverListItem` still closes the popover (`is-close-on-select`, unchanged).

**Gotcha:** `MpPopoverTrigger` toggles open/closed on *every* click of whatever it wraps. That's harmless for the old inert `MpSelect` (nothing to click twice), but a real text input gets re-clicked constantly while searching (fixing a typo, moving the cursor) — each of those re-clicks would otherwise slam the popover shut. Fixed with a mousedown/click pair on the input (`wasAlreadyFocused` in `PxSelectPopover.vue`) that only lets the click that *first* focuses the field reach the trigger's toggle; a click while it's already focused is stopped from bubbling.

## Grid & spacing (`CycleGeneralForm.vue:341-348`)

```ts
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({ gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' }, maxWidth: { lg: '656px' }, display: 'flex', flexDirection: 'column' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })   // 16px between fields
```

- Form column = 6/12 on `lg`, 12/12 below, capped 656px. `gap: '6'` between grid cells, `gap: '4'` between fields.
- `competencies/create.vue` is the alternate model — the form column *is* the 12-col grid and each field carries `span6`/`span3`/`span12` so fields share rows.

### Two-up inline fields (fields sharing a row)

Two fields that belong together (e.g. a date range) run inline in an `MpFlex`, each
`flex: '1'`, with the section's normal 16px field gap (`gap="4"`):

```vue
<!-- AddGoalDrawer.vue — Start date / End date -->
<MpFlex gap="4">
  <MpFormControl id="schedule-start" :class="css({ flex: '1' })">...</MpFormControl>
  <MpFormControl id="schedule-end" :class="css({ flex: '1' })">...</MpFormControl>
</MpFlex>
```

### Matching a stacked field's width to a sibling — reuse the width class, don't go inline

Tried inlining Goal type / Goal category / Goal sub-category (with Align to parent
goal nested under Goal type) in a 24px-gap row — reverted: the fields stay a normal
vertical stack, they just needed to visually *match Goal weight's width*, not sit
beside each other. The fix is narrower — reuse Goal weight's own width class on each
field that should match it, no `MpFlex` row involved:

```ts
// Matches Start/End date's width — those sit two-up in a gap-4 MpFlex, each
// flex:1, so each is 50% of the form column minus half the 16px gap.
const goalWeightWidth = css({ width: 'calc(50% - 8px)' })
```
```vue
<!-- AddGoalDrawer.vue — Goal type, Goal category, Goal sub-category, and the
     Align-to-parent-goal "selected" row (once a parent is picked) all carry
     goalWeightWidth, stacked normally, one per line — not two-up. -->
<MpFormControl id="goal-type" :class="goalWeightWidth">...</MpFormControl>
<MpFormControl id="align-to">
  <!-- unselected state (a button) is left at its natural width; only the
       selected-state row is width-matched, since a button isn't a field -->
  <div v-if="alignTo" :class="[alignedRow, goalWeightWidth]">...</div>
  <MpButton v-else variant="secondary">Select parent goal</MpButton>
</MpFormControl>
<MpFormControl id="goal-category" :class="goalWeightWidth">...</MpFormControl>
<MpFormControl v-if="category" id="goal-sub-category" :class="goalWeightWidth">...</MpFormControl>
<MpFormControl id="goal-weight" :class="goalWeightWidth">...</MpFormControl>
```

Multiple fields can share one width class like this even when they're not laid out
side-by-side — it's a visual-alignment tool, not a row-layout tool. Don't reach for
an inline `MpFlex` row just because two fields should look the same width.

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

- **Checking a box reveals more fields**: wrap the revealed content in a plain `<div>` with `marginLeft: '8'` (32px) — no border, no card, just indent — shown only `v-if` the box is checked, directly below the checkbox:

  ```vue
  <!-- CycleGeneralForm.vue:572-588 — "Use weight" reveals a per-method weight list -->
  <MpCheckbox :is-checked="isShowMethodWeight" @update:is-checked="(v) => (isShowMethodWeight = v)">
    Use weight
    <template #description>The score of your review will be calculated by the weight you set up.</template>
  </MpCheckbox>
  <div v-if="isShowMethodWeight" :class="css({ marginLeft: '8' })">
    <!-- revealed fields -->
  </div>
  ```

  Same shape for several independent checkboxes stacked vertically, each with its own reveal (`talents/competencies/import-results.vue`'s "Target job grade" / "Target job class" extra-scope checkboxes) — one `MpCheckbox` + conditional indented block per row, not one shared reveal area. That group's own container must be a **nested 12-col grid** (`gridTemplateColumns: 'repeat(12, 1fr)', columnGap: '6', rowGap: '4'` — mirrors the page's outer `formColumn`), *not* a `flex` column: a flex container's `align-items: stretch` default makes every child fill the full row width regardless of any `span3`/`span6` class on it, silently defeating the width match described below. Use `rowGap` (not `gap`) for the same reason `marginTop: '-2'` is layered on top — see next paragraph.

  ⚠️ **`MpCheckbox`'s `:class` lands on its hidden `<input>`, not the visible `<label>` that's the actual grid/flex item.** Passing a `span12`-style width/grid class straight to `<MpCheckbox :class="…">` does nothing visible — the checkbox silently falls back to grid auto-placement (one implicit column) and its label text wraps illegibly. Wrap the checkbox in a plain `<div :class="span12">` instead and put no class on `MpCheckbox` itself:

  ```vue
  <!-- import-results.vue — each row's checkbox spans the full grid width -->
  <div :class="span12">
    <MpCheckbox :id="`extra-scope-${t}`" :is-checked="extraScopeChecked[t]" @update:is-checked="…">
      {{ ctxLabel(SCOPE_ATTR_LABEL[t]) }}
    </MpCheckbox>
  </div>
  <MpFormControl v-if="extraScopeChecked[t]" :class="[span3, extraScopeIndent]">
    <PxSelectPopover v-model="extraScopeValue[t]" :width="'100%'" search-on-field />
  </MpFormControl>
  ```

  When the revealed field should read as **the same size** as another field elsewhere in the form (here: the primary scope field above it, also `span3`), give the revealed `MpFormControl` the *same* span class, not a wider one to "make room" for the indent. `marginLeft: '8'` (32px) — used both for the indent and to tighten the checkbox→field gap to 8px via `marginTop: '-2'` (`extraScopeIndent` in `import-results.vue`) — shrinks a grid item's *implicit* stretch width by the margin amount, but does **not** shrink an *explicit* `width: '100%'` on that same item (percentage widths resolve against the full grid track regardless of margin). So: keep the span class identical to the field it must match, add `width: '100%'` to the indent class, and the 32px margin becomes a pure visual offset — the field renders at the exact same width as its unindented sibling, just shifted right. (Do not "compensate" with `calc(100% + 32px)` — that double-counts, since the explicit `100%` already ignores the margin.)

  When the revealed block is a single `MpFormControl` whose own label would just repeat the checkbox's own text (checkbox reads "Target job grade", the field it reveals is *also* "Target job grade"), drop that field's `MpFormLabel` — the checkbox above it already labels the row, so the field only needs its `placeholder` (`talents/competencies/import-results.vue`'s extra-scope fields). Keep the label when the revealed content is a *list* of differently-labeled fields (the "Use weight" example above), since nothing else names those rows.

## Multi-select rendered as removable tags — `MpInputTag`

When a field picks several items from a pool and each pick should show as a removable chip inline (not a checklist + separate "selected" list below), use **`MpInputTag`** (`@mekari/pixel3`) — not a hand-rolled checkbox list with manual remove buttons.

No official docs exist for it in this repo — these gotchas came from reading its compiled source directly:

- **`:is-show-suggestions="true"` is required** — defaults to `false` (no dropdown at all without it).
- **`:is-enable-create-new-tag="false"`** if every tag must resolve to a real record — defaults to `true` (otherwise users can free-type arbitrary tags that don't match anything).
- `suggestions` is a list of `{ [key]: unknown }` objects (or plain strings); the searched/displayed text comes from `item[suggestionKey]` — default `suggestionKey` is `'label'`, so shape suggestions as `{ id, label }` to skip passing that prop.
- **A tag's own `id` is auto-generated as `` `tag-${text}` `` when added — never trust it to carry your real record id.** Carry the id inside the matched suggestion object instead, and read it back off `tag.value` (the *whole* matched suggestion), not `tag.id`.
- `@change` fires on every add/remove with the FULL current tag array — always resync your own state from the whole array; don't try to diff adds vs. removes.
- `data` (the initial tags) is read **once at mount** (no reactive re-sync from later prop changes) — fine as long as the component remounts (e.g. behind a `v-if`) whenever the initial selection should change from outside its own UI.
- **The suggestion dropdown can show more than a plain label** via the component's default scoped slot — `#default="suggestion"` receives the matched suggestion object itself (whatever shape you passed in `suggestions`, not just its label). Selection click-handling stays wired at the row level regardless of what the slot renders, so an avatar + description row works the same as the plain-text default. The already-picked **chips stay plain text either way** — the slot only affects the dropdown, not the tags themselves — so this only helps when telling candidates apart *before* picking needs more than a name (e.g. several employees sharing a name).

```vue
<MpInputTag
  placeholder="Search goal types…"
  :data="tagData(selectedValues)"
  :suggestions="goalSuggestions"
  :is-show-suggestions="true"
  :is-enable-create-new-tag="false"
  use-portal
  @change="onTagsChange"
>
  <!-- optional: richer suggestion rows instead of the plain-label default -->
  <template #default="suggestion">
    <MpFlex align="center" gap="3">
      <PxAvatar :id="suggestion.id" :name="suggestion.label" :src="suggestion.photo" size="lg" variant-color="gray" />
      <MpFlex direction="column" gap="0">
        <span>{{ suggestion.label }}</span>
        <span>{{ suggestion.meta }}</span>
      </MpFlex>
    </MpFlex>
  </template>
</MpInputTag>
```
```ts
const goalSuggestions = computed(() => pool.value.map(id => ({ id, label: employeeById(id)?.name ?? id })))
function tagData(selected: string[]) {
  return selected.map((id) => {
    const label = employeeById(id)?.name ?? id
    return { id, text: label, value: { id, label }, isInvalid: false, isReadOnly: false }
  })
}
function onTagsChange(items: unknown) {
  const ids = (Array.isArray(items) ? items as { value?: unknown }[] : [])
    .map(i => (i.value && typeof i.value === 'object' ? (i.value as { id?: string }).id : undefined))
    .filter((id): id is string => !!id)
  selectedValues.value = ids
}
```

Reference: `ReviewMethodDrawer.vue` — goal-type multi-select (plain-label suggestions). Also `AddGoalDrawer.vue`'s Team/Org "Selected goal members" contributor picker (`contributorTagData`/`contributorSuggestionsFor`/`onContributorTagsChange`) — pool scoped to `contributorIncludeIds` (the goal's own members + owner), owner pinned first via `withOwnerFirst` in `setContributorIds`, suggestion rows use the avatar + description slot above (`photo`/`meta` riding along on the suggestion object) since several employees can share similar names.

**Prefer the boxed add/remove list over a tag picker when removed items need their own identity row** (avatar + name + job, not just a name chip) — see [`pagination.md`](pagination.md)'s "Boxed list container": `AddGoalDrawer.vue`'s "Goal members" section and Goal contributor's Company/Individual list both use a bordered `memberBox` of avatar rows (each with its own remove button) + a "+Add …" link below, opened via `SelectEmployeesDrawer`, instead of `MpInputTag`. Team/Org's contributor radios use neither: "All goal members" shows no list at all below the radio (it's already the exact Goal members list shown above — restating it would be pure duplication), and "Selected goal members" picks from a small, already-scoped pool (the goal's own members) via `MpInputTag` — the **selected chips** stay plain name text (a full identity block still doesn't fit a chip), even though the slot above gives its suggestion dropdown the richer avatar + description row.

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

**Gotcha — addon overlaps the input text:** `MpInputLeftAddon`/`MpInputRightAddon` measure their own width via `getComputedStyle()` in `onMounted` to set `--mp-input-offset--{left,right}`, but inside a just-opened drawer that read can happen before layout settles, coming back empty — the var lands as literal `NaNpx`. The input's padding is `calc(var(--mp-input-offset--left) + 14px)` with no fallback, so the invalid var invalidates the whole `calc()` and padding collapses to `0`, letting the addon box sit on top of the input's own text. It's invisible on short single-char addons (`%`) and glaring on 2-char ones (`Rp`). Fix with a scoped `:deep()` override forcing fixed padding (see `AddGoalDrawer.vue`'s `<style scoped>` block):
```css
:deep(.mp-input-group__root[data-with-left-addon='true'] .mp-input__control) {
  padding-left: 46px !important;
}
:deep(.mp-input-group__root[data-with-right-addon='true'] .mp-input__control) {
  padding-right: 46px !important;
}
```

## Cross-field / cross-record validation blocking save

A field can be locally valid but still violate a rule that depends on state outside the form (e.g. `AddGoalDrawer.vue`'s weight field: 1–100 is locally fine, but a `weightMandatory` cycle also needs it to land the owner's total on exactly 100%). Validate this *inside* the form component itself, gated on a prop the caller passes in (`weightMandatory` + `alreadyUsedWeight`), not in the `@save` handler after the fact — a handler-level check runs too late: the drawer's own `save()` already emits `'update:isOpen', false` in the same breath as `'save'`, so by the time a parent-side check could reject it, the drawer has already closed. Fold the extra rule into the same `errors.*` + `MpFormErrorMessage` used for local validation, and block `emit('save', …)` from firing at all. Because the drawer can be long, also scroll the offending field into view (`document.getElementById(fieldId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })` inside `nextTick`) so an error on a field the user didn't touch (scrolled past, off the visible area) isn't silently invisible. Do **not** fall back to a `toast.notify()` for this — a toast next to a drawer that already closed reads as "it saved, but here's a warning," when what actually happened is it didn't save at all.

## Rules

- Field = `MpFormControl` + `MpFormLabel` (+ `MpFormErrorMessage`). Required via `:is-required`.
- Dropdowns = `PxSelectPopover`, width ≈50% of form column.
- Section headers hand-rolled (`h2Class`/`h3Class`), never `MpText size="h2"`.
- No cards / no divider lines between sections — spacing + row border-bottom.
- Toggle/checkbox/radio use built-in label + `#description` slots.
- See [`buttons.md`](buttons.md) for footer CTAs, [`page-form.md`](page-form.md) for page-vs-drawer.
