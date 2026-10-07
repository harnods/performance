# Form

## Field wrapper

Every field: `MpFormControl` (with `id`) + `MpFormLabel` + `MpFormErrorMessage`. `:is-invalid` on the control drives error styling.

> ⚠️ **`MpFormLabel` outside an `MpFormControl` throws.** It calls
> `useFormControlContext()`, which has no fallback — a bare
> `<div><MpFormLabel>Attachment</MpFormLabel>…</div>` kills the render of
> everything around it, and inside a modal that means the modal silently renders
> **nothing at all** (no error boundary, no warning in the UI — you just get an
> empty `MpModal`). So wrap even a non-validated field, or use plain `MpText`.
> Hit for real on `IdpActionPlanModal.vue`'s Attachment field.

```vue
<!-- CycleGeneralForm.vue:490-499 -->
<MpFormControl id="timeframe" :is-invalid="timeframeInvalid">
  <MpFormLabel>Time frame for this cycle</MpFormLabel>
  <PxSelectPopover v-model="timeframe" :options="..." placeholder="Select time frame" :class="selectWidth" />
  <MpFormErrorMessage>You must select a time frame</MpFormErrorMessage>
</MpFormControl>
```

### Required marker

⚠️ Two conventions coexist. **Preferred: `:is-required="true"` on `MpFormControl`** (built-in, `competencies/create.vue:477`). The drawers roll a manual red asterisk (`MpFlex align="center" gap="0"` + `<MpText :class="css({ color: 'text.danger' })">*</MpText>`, `AddGoalDrawer.vue`). Pick one per form; don't mix. **Either way, there's no space between the label and the asterisk**: the manual wrapper is `gap="0"`, there's no whitespace before an inline `*`, and the built-in marker's 4px Pixel margin is zeroed in `main.css`.

### Help text

Prefer built-in **`MpFormHelpText`** (`competencies/create.vue:506`). Field hints as ad-hoc `MpText`/`span` (`helperText = css({ fontSize:'12px', lineHeight:'16px', color:'text.secondary' })`) also exist.

### Character counter

`labelRow` flex (label left, `{{ count }} / {{ MAX }}` right): `labelRow = css({ display:'flex', alignItems:'center', justifyContent:'space-between' })`, count text `css({ fontSize:'12px', lineHeight:'16px', color:'text.secondary' })` (`GoalCategoryFormDrawer.vue:156-186`).

## Dropdowns — `PxSelectPopover` always

Never raw `MpSelect` in a form (raw `MpSelect` appears only *inside* `PxSelectPopover.vue` as the hidden visual trigger, and only for a non-searchable select). Props (`PxSelectPopover.vue`): `modelValue`, `options: {value,label,description?,trailing?,group?,photo?}[]`, `placeholder`, `isClearable`, `isDisabled`, `width`, `searchable` / `searchOnField` (synonyms), `allowCustomValue`, `maxlength` (`customValueLabel` deprecated). `searchPlaceholder` is deprecated and ignored.

Width — two valid ways:
- `:width` prop (string): `width="100%"`, `:width="'240px'"`.
- `:class="selectWidth"` fallthrough (needed for responsive/media-query widths — `PxSelectPopover.vue:41` keeps wrapper 100% when `width` omitted).

⚠️ `selectWidth` value is inconsistent across files (`50%` / `264px` / `60%` / `320px` / grid `span3`). CLAUDE.md's intent: **50% of the form column (≈264px on the 3/12 grid)**. Default to that.

**Option row weight:** the default `label`+`description` option render (used whenever an option has `description`) bolds the title (`itemLabel`, `fontWeight: 'semiBold'`) — right when the title is an identity, e.g. an employee's name above their job title (`pages/talents/idps/index.vue`'s "All employee" filter, `IdpPlanForm.vue`'s assignee select). When the title is just a plain term and the description explains it rather than sitting below an identity — e.g. a competency name + its definition (`components/IdpActionPlanModal.vue`'s "Select competency") — bolding reads as more important than it is. Don't change the shared default for this (it's still correct for every identity-style select); override per-usage with the `#option="{ option }"` slot instead, replicating `itemBody`/`itemCaption` but dropping `fontWeight` on the label (see `IdpActionPlanModal.vue`'s `competencyOptionBody`/`competencyOptionLabel`/`competencyOptionCaption`).

**Long option descriptions clamp to 2 lines.** When an option's description can run long (competency item descriptions in `IdpActionPlanModal.vue`), cap the caption at **2 lines with an ellipsis** using the repo's clamp (same as `inbox/notifications.vue`): `display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden'`. Put the full text in `:title`, and give the option body `minWidth: '0'` so the clamp can work inside the panel's fixed width. The **label (the item name) stays on 1 line** with an ellipsis (`whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'`), also with its full text in `:title`.

### Pre-seeded values (edit forms) — the fix that makes them show up

`MpSelect` writes the native `<select>`'s value during **its own setup**, before
`PxSelectPopover`'s `<option>` children are in the DOM — so a value that is
already known at mount time gets dropped by the browser and the field renders
its **placeholder**, even though the model is correct (you can see the real
value in the element's `data-value`, and the clear `×` shows). A value that
arrives from a later user interaction is fine, because the options exist by then.

That's why every *create* form looked correct and the first *edit* form
(`IdpPlanForm` in edit mode) showed empty Employee / Job position fields.

`PxSelectPopover` now re-applies the value itself once the options have
rendered, so **this is already handled** — don't work around it by deferring
your form's seeding to `nextTick`:

```ts
const rootEl = ref<HTMLElement | null>(null)
function syncNativeSelect() {
  if (!import.meta.client || props.searchOnField) return
  const el = rootEl.value?.querySelector('select')
  if (el && el.value !== (props.modelValue ?? '')) el.value = props.modelValue ?? ''
}
onMounted(() => nextTick(syncNativeSelect))
watch(() => [props.modelValue, props.options.length], () => nextTick(syncNativeSelect))
```

If you build another select wrapper around `MpSelect`, it needs the same sync.

### Searchable selects: search in the field, never a search bar in the popover

**A select never has a search bar inside its popover.** When a select is
searchable, the **field itself** is the search box. `searchable` and
`search-on-field` are synonyms, and both render this:

```vue
<PxSelectPopover
  v-model="jobPosition"
  :options="jobPositionOptions"
  placeholder="Select job position"
  width="100%"
  searchable
/>
```

Behavior (`PxSelectPopover.vue`, `onField`):

- The trigger is an `MpInputGroup`/`MpInput` with a trailing `chevrons-down`
  addon, not the disabled-look `MpSelect`. Clicking it opens the popover.
- The input has `autocomplete="off"`, so Chrome's autofill bubble never
  covers the popover.
- Focusing clears the text so typing starts fresh, and typing filters the
  list live (label, description and trailing text).
- Blurring without picking reverts the field to the current selection's label.
- With `is-clearable`, deleting the text and blurring clears the value.
- No match shows "No results found" instead of an empty bordered box.
- `search-placeholder` is ignored. The field's `placeholder` is the only
  prompt, so phrase it to cover both (e.g. "Search or select employee").

**Gotcha:** `MpPopoverTrigger` toggles on *every* click of what it wraps, and
a real text input gets re-clicked while searching. A mousedown/click pair on
the input (`wasAlreadyFocused`) only lets the click that *first* focuses the
field reach the toggle.

**Gotcha: popover panel width.** `is-adaptive-width` only sets the panel's
*min-width*, so a long option pushes it wider than the field.
`PxSelectPopover.vue` measures the trigger with a `ResizeObserver` and passes
an explicit width to `MpPopoverContent`. This is automatic for every usage.

### Creatable selects: the centred "Add “…”" row

When the user may add a value that isn't in the list (an open vocabulary such
as an action plan's **Category** or a plan's **Objective**), pass
`allow-custom-value`. It implies field search:

```vue
<!-- IdpActionPlanModal.vue (Category); IdpPlanForm.vue (Objective) -->
<PxSelectPopover
  v-model="category"
  :options="categoryOptions"
  placeholder="Select or type a category"
  width="100%"
  allow-custom-value
  :maxlength="NAME_MAX"
/>
```

- When the typed text matches no option label exactly (case-insensitive), the
  list offers a single row: **`Add “<typed text>”`**, centred, in
  `text.link`, with 16px vertical padding. It has no icon, no type noun and no
  "No results found" line above it. The Add row is the whole answer.
- When some options **do** match, the same Add row sits under them with a 1px
  `border.default` top border.
- A **non-creatable** select with no match shows "No results found": a
  non-interactive row inside `MpPopoverList`, padded like an option
  (`8px 12px`, 14/20, `text.secondary`, left-aligned).
- **Nothing is committed per keystroke.** The value is set only by picking an
  option or the Add row. Blurring without picking reverts.
- A saved custom value has no option, so the field shows the raw value.
- `:maxlength` caps the typed text to match the field's character counter.
  The counter reads the **model**, so it updates once a value is picked.
- `custom-value-label` is deprecated and ignored.

## Repeatable filter rows ("Add filter")

When a form lets the user stack several **filter dimensions**, each with its own values
(evaluation cycle create's **Employee filter**, `components/EvaluationCycleForm.vue`,
built from PRD "Multiple Filters for Evaluation Cycle Employee Selection"), render one
row per filter inside the same `MpFormControl` + label.

**Logic (PRD D1/D5):** AND across rows, OR across the values picked within one row. Job
grade and Job class are independent: neither narrows the other's list.

### Layout
- **Each row is one inline line**, never wrapped: a **dimension** `PxSelectPopover`, then a
  **value** `DashMultiSelectSearch`, 12px apart (`filterSelect`: 264px on `lg`; below `lg`
  the two share the row). **Every field in a row is top-aligned** (`alignItems:
  'flex-start'` on `filterRow` and `filterValueRow`), so an error under one field never
  shifts the dimension select, the value field, or the remove button: their tops stay equal
  with or without errors. The rows container is `width: fit-content` on `lg`.
- **"and" divider between rows**: a solid 1px `border.default` line, **"and"**
  (`MpText size="label-small"`, color `gray.400`), then another line, 12px gaps. It goes
  between rows only, never above the first or after the last. **It stops at the value
  field's right edge, not under the remove button**: a trailing 50px spacer (`andTrailing`),
  plus the divider's own 12px gap, equals the 62px remove slot (24px gap + 38px button).
  The spacer is dropped on Edit, where there are no remove buttons.
- **One caption, always shown, always in the same place**: directly under the label,
  14/20 `text.secondary` (`EMPLOYEE_FILTER_CAPTION`). The copy is the same in every state
  (no filter, one filter, several, Edit), so nothing appears, disappears or moves as rows
  change:
  "Only employees who match these filters are included in this cycle". One sentence that
  says what the field does, nothing about the "no filter" case. Don't name the Employment
  status here: "all employees with Probation status are included" read as a promise about
  who the cycle covers, which was misleading.
  (uxw-mekari caption rule: no closing period.)
  Don't add state-specific helper lines or notes below the rows. Put the extra detail in the
  caption, or in a tooltip if only some people need it (see Edit).

### Values
- **The value starts empty.** Picking a dimension doesn't preselect "All …". The value
  field shows a grey **"Select {filter name}"** placeholder (`DashMultiSelectSearch`
  `placeholder`).
- The trigger **lists the picked labels** (`summarize`): up to 2 names, then "+N"
  ("Finance, Product +2"), never "{n} selected". Naming the values is how the UI says
  "any of these".
- **Search in the field, not in the popover** (`search-on-field`, same idea as
  `PxSelectPopover`'s): no search box inside the list. Focusing the field clears it so
  you can type, and the list filters as you type. Ticking options keeps the field focused
  (`@mousedown.prevent` on the list), so you can tick several matches. The field has
  `autocomplete="off"`. Without it, Chrome shows its own autofill bubble (e.g. "All job
  grade") under the field, on top of the Pixel popover.
- **Option rows toggle on `@click.prevent`.** The row wraps an `MpCheckbox`, whose
  `<label>` text is clickable. Without `.prevent`, a click on the text makes the browser
  fire a second click on the hidden input, which bubbles back to the row and toggles it
  twice, so nothing changes. Scripted `el.click()` doesn't reproduce this; test with a
  real mouse click. Leaving the field
  shows the picked names again. The "All …" row hides while a search is typed.
- **The popover is exactly as wide as the field** (measured, like `PxSelectPopover`).
- **Job grade / Job class** load from a live, paginated endpoint in production
  (`GET /external-assessments/job-grades`, `/job-classes`). They use **infinite scroll**,
  the same as `MpAutocomplete`'s `is-infinity-scroll`. An invisible marker after the last
  option fires `@load-more` when it scrolls into view. While the page loads, Pixel's loader
  row shows (`MpSpinner size="md"` + "Loading", `px 3 / py 2 / gap 3`). No "Load more"
  link. Props: `hasMore`, `isLoadingMore`, `@load-more`. The prototype mocks 30 grades in
  pages of 10. The other four types keep local lists.
- **Search on those two lists hits the server** (PRD W1: "paginated, searchable"), not just
  the pages loaded so far. "Grade 25" is found before it has scrolled in
  (`remote-search` + `@search`, mocked with a 400ms delay over the full list). Their
  **"All …" row is hidden**: with paging it could only tick the loaded rows. To include
  every grade, the user just doesn't add a Job grade filter.

### Adding, removing, resetting
- The **first row** keeps "No filter applied". Choosing it again removes the added rows.
- **"Add filter ▾" is a dropdown button**: `MpButton variant="secondary"
  right-icon="chevrons-down"` (no left icon) inside an `MpPopover is-close-on-select
  use-portal placement="bottom-start"`. The `MpPopoverList` lists **only the filter types
  not used yet** (`unusedDimensions`), and picking one adds a row already set to that type,
  with an empty value. This is the same button + popover pairing as the IDP column settings.
  The wrapper is `width: fit-content`, under the rows. The button shows only when every row
  has a type and some types are still unused. It's a deliberate dropdown, unlike buttons.md's
  ghost `add-circular` "add another row", because the user must choose *which* row to add.
- **No duplicates**: a dimension chosen in any row is removed from every other row's options.
- **Remove**: once there are **2+ rows, every row** (the top one included) has
  `MpButton variant="ghost" left-icon="minus-circular"` **24px** after its value field,
  wrapped in `MpTooltip label="Remove"`. Icon-only buttons always get a tooltip; keep
  `aria-label="Remove filter"` on the button. **At least one row always stays**: a lone row
  has no remove button (to clear it, pick "No filter applied"), and `removeFilter` refuses to
  drop the last row. When the top row is removed, the next row becomes the first and gains
  the "No filter applied" option.
- Dimensions: Organization, Branch, Job position, Job level, Job grade, Job class.

### Validation (on Save, Save never disabled)
- A turned-on filter with no value is an error. The **value trigger only** is marked
  invalid (`is-invalid`), with "You must select at least one {filter}" (uxw-mekari
  "select at least one" pattern) underneath (12/16
  `text.danger`, `errorText`), plus the "Please check the form's error" toast and a scroll
  to the section.
- **Don't wrap the value picker in an invalid `MpFormControl`.** Its invalid state flows
  into the popover's own search input and checkboxes (they turn red). Pass `is-invalid` to
  the picker and render the message yourself.

### Edit (PRD D4): read-only
Edit cycle is a real page, `pages/reviews/review-cycles/[id]/edit.vue` (the detail page's
"Edit cycle" button opens it). It renders the same `EvaluationCycleForm` as Create with
`mode="edit"`, pre-filled from the saved cycle. **Employment status and the whole Employee
filter section are locked**, and nothing else is.
- **Employment status:** the outer `MpFormControl :is-disabled` plus `is-disabled` on its
  `PxSelectPopover`. It shows the cycle's own status (saved, else its seeded scenario in
  `utils/evaluationCycleScenarios.ts`). A status outside the standard list (Part-timer) gets
  its own option so the locked field still reads right.
- **Employee filter:** the outer `MpFormControl :is-disabled`, plus
  `is-disabled` on every dimension and value field. The rows are the cycle's saved filters
  (a cycle saved without filters shows "No filter applied"). There's no "Add filter" and no
  remove buttons. The "and" dividers stay, so the saved logic is readable. On Edit the
  Job grade / Job class pickers get their full list, so a saved pick beyond the first page
  still shows its name.
- **No info note under the fields.** The reason goes in an `MpTooltip` shown when you
  hover any disabled field: "Employee filters can't be changed after the cycle is created"
  (`FILTER_LOCKED_TOOLTIP`) and "Employment status can't be changed after the cycle is
  created" (`STATUS_LOCKED_TOOLTIP`). Each field's wrapper `div` sits inside the tooltip,
  because a disabled input fires no mouse events itself. MpTooltip has no `is-disabled`, so
  it's switched off outside Edit with `:is-manual="!isEdit" :is-open="false"`. That keeps a
  single template for both modes.
- **Disabled fields look the same**, whether `PxSelectPopover` (a native `<select>`) or
  `DashMultiSelectSearch` (an `MpInput`): Pixel's `text.disabled` / `background.disabled` /
  `border.disabled`. The browser's own `select:disabled { opacity: 0.7 }` used to fade the
  select further. `assets/css/main.css` resets it (`.mp-select__control:disabled
  { opacity: 1 }`), app-wide.
- Title "Edit cycle", footer "Cancel" / **"Save changes"** (see [`buttons.md`](buttons.md)).
  Save shows the "Review cycle updated" toast and returns to the cycle's detail page, as
  does Cancel. A saved cycle already has its methods set up, so the default Manager review
  counts as configured and doesn't block Save.

## Grid & spacing (`CycleGeneralForm.vue:341-348`)

```ts
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({ gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' }, maxWidth: { lg: '656px' }, display: 'flex', flexDirection: 'column' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })   // 16px between fields
```

- Form column = 6/12 on `lg`, 12/12 below, capped 656px. `gap: '6'` between grid cells, `gap: '4'` between fields.
- `competencies/create.vue` is the alternate model — the form column *is* the 12-col grid and each field carries `span6`/`span3`/`span12` so fields share rows.

> ⚠️ **Not universal:** `IdpActionPlanModal.vue`'s drawer body uses `gap: '5'`
> (20px) between fields instead — an explicit, deliberate design spec for that
> screen, confirmed twice. Don't "correct" it back to `'4'` on sight; if you
> touch that file, keep 20px unless told otherwise.

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

### Two-up inline fields in a span-grid page (`create.vue`/`import-results.vue` style)

⚠️ On a page whose form column *is* the 12-col grid itself — every field carrying its
own `span6`/`span3`/`span12` class straight from `formColumn` (`competencies/create.vue`,
`talents/competencies/import-results.vue`) — **two fields with the same span class do
NOT sit side by side.** Every span class in this convention is pinned to an explicit
start at column 1 (`gridColumn: { base: '1 / -1', lg: '1 / span 3' }`), so a second
field with that same class can't occupy the same columns (already taken) and falls to
the next row instead — same-width fields end up stacked, not paired, even though the
width looks right at a glance.

Fix: give the *second* (and any later) field in the row a variant class that spans the
same column *count* but with no explicit start — plain `gridColumn: 'span 3'` instead
of `'1 / span 3'`. With no fixed start, the grid auto-places it into the next free
columns in that row (4–6) instead of re-claiming column 1; `formColumn`'s own
`columnGap: '6'` (24px) then falls out for free between the two fields — no wrapper
element needed:

```ts
// Vendor + Assessment date sit side by side, each the same width as Job
// position (span3, 262px on desktop) — plain 'span 3' (no explicit start)
// lets the grid auto-place into columns 4-6 instead of pinning back to
// column 1 like the standard span3 does.
const span3Auto = css({ gridColumn: { base: '1 / -1', lg: 'span 3' } })
```
```vue
<!-- import-results.vue — Vendor / Assessment date, each span3Auto,
     directly as grid-item siblings (no MpFlex/wrapper — the grid handles
     placement + gap on its own) -->
<MpFormControl id="vendor" :class="span3Auto">...</MpFormControl>
<MpFormControl id="assessment-date" :class="span3Auto">...</MpFormControl>
```

Reach for this (fixed width, matches another single field like Job position) over the
standard `MpFlex` two-up pattern above (equal-stretch, fills the whole row) when the
pair should read as two independent same-size fields rather than one row split evenly
in half — e.g. Vendor/Assessment date matching Job position's width, with the rest of
the row left empty, instead of stretching to fill all 12 columns.

### Read-only context table under a field

A field whose choice has **existing history the user should see before deciding** gets that
history as a plain Default table directly beneath it — not a drawer, not an accordion, not a
"view details" link. It's reference material for the decision, so it has to be visible while
the decision is being made.

```vue
<!-- IdpPlanForm.vue — the picked employee's informal education -->
<MpFormControl id="idp-employee" is-required :is-invalid="!!errors.employeeId">
  <MpFormLabel>Employee</MpFormLabel>
  <PxSelectPopover v-model="employeeId" … />
  <MpFormHelpText>The informal education from Talenta will be shown below.</MpFormHelpText>
  <MpFormErrorMessage>{{ errors.employeeId }}</MpFormErrorMessage>
</MpFormControl>

<div v-if="employeeId">
  <MpTableContainer>
    <MpTable :is-hoverable="false">…</MpTable>
  </MpTableContainer>
</div>
```

- **Sits outside the `MpFormControl`**, as its own sibling `<div>` — it isn't part of the
  field's own label/error structure, and nesting it there muddles what `:is-invalid` styles.
- **`v-if` on the field's value**, so it appears only once there's something to show. The
  `MpFormHelpText` announces it in advance so its arrival isn't a surprise.
- Ordinary Default table rules apply in full ([`table.md`](table.md)) — `:is-hoverable="false"`,
  8px cell padding, in-table empty row when the selection genuinely has no history.
- **Derive the rows from the same source the canonical screen uses**, never a second copy.
  `IdpPlanForm` calls `getProfile(employeeId)?.learning` — the exact list the talent profile
  page renders — so the two can't drift. (Same principle as
  [`filter-bar.md`](filter-bar.md#read-the-criterions-source-data-from-one-place).)
- Don't paginate it speculatively. Add the Load-more bar from
  [`pagination.md`](pagination.md) only once the data can actually exceed a page.

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
- Exception to "no external MpFlex": when a `MpBadge` sits inline with the label — a toggle, checkbox, or radio — wrap just the label content in an `MpFlex align="center" gap="2"` (or a plain `<span>` with the same `css()`; see the radio-group section below for a disabled "Coming soon" option).
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
- **Locked field → tooltip on the field, not a note below it**: when a field is disabled because it
  can't change (e.g. after creation), don't add an info note under it. Wrap the field's wrapper `div` in
  `MpTooltip` with the reason; a disabled input fires no mouse events itself. MpTooltip has no
  `is-disabled`, so turn it off while the field is editable with `:is-manual="!locked" :is-open="false"`.
  Reference: the Employee filter's Edit state ("Repeatable filter rows" above).

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

### A radio group with a disabled "coming soon" option reveals a field between the options

`IdpActionPlanModal.vue`'s "Relates to" field picks what this action plan
develops — Competency (live) or Goal (not built yet) — as a two-option
`MpRadio` group. Unlike the "reveal below the whole group" shape you might
default to, the competency picker nests **directly under the Competency radio
itself**, ahead of the Goal radio, since it's that option's own detail, not a
new step after the choice:

```vue
<MpFormControl id="ap-related-to">
  <MpFormLabel>Relates to</MpFormLabel>
  <div :class="radioRow">
    <div :class="competencyGroup">
      <MpRadio :is-checked="relatedTo === 'competency'" @click="onRelatedToCompetencyClick">
        Competency
      </MpRadio>
      <!-- No MpFormLabel — the radio right above it already names the field. -->
      <MpFormControl v-if="relatedTo === 'competency'" id="ap-related-competency" :class="competencyFieldIndent" :is-invalid="!!errors.relatedCompetency">
        <PxSelectPopover v-model="relatedCompetency" :options="competencyOptions" placeholder="Select competency" width="100%" search-on-field />
        <MpFormErrorMessage>{{ errors.relatedCompetency }}</MpFormErrorMessage>
      </MpFormControl>
    </div>
    <!-- Wrapper div, not :class on MpRadio — see the gotcha below. -->
    <div :class="relatedTo === 'competency' ? goalGapSelected : goalGapDefault">
      <MpRadio :is-checked="false" is-disabled>
        <MpFlex as="span" align="center" gap="1">
          Goal
          <MpBadge for="tableStatus" type="announcement" size="sm">Coming soon</MpBadge>
        </MpFlex>
      </MpRadio>
    </div>
  </div>
</MpFormControl>
```

```ts
// No shared `gap` on the outer row — the two pieces below it need different
// spacing (4px vs 20px), so each carries its own margin instead of one flex
// gap trying to fit both.
const radioRow = css({ display: 'flex', flexDirection: 'column' })
const competencyGroup = css({ display: 'flex', flexDirection: 'column', gap: '1' }) // 4px: radio → its revealed select
const competencyFieldIndent = css({ marginLeft: '8' }) // 32px indent under the Competency radio
const goalGapDefault = css({ marginTop: '2' })  // 8px — unchanged spacing when nothing is revealed
const goalGapSelected = css({ marginTop: '5' }) // 20px — extra room once the competency select is showing above it
```

- **The reveal sits between the two radios, indented 32px (`marginLeft: '8'`)
  from the Competency radio** — the same indent token the checkbox/toggle
  reveal above uses (`marginLeft: '8'`), just applied to a radio's own child
  reveal instead of a reveal after a checkbox. It reads as "here's the detail
  for the option you just picked," not a new step after the whole group.
  Contrast `IdpPlanForm.vue`'s Focus radios → "Select job position," which IS
  a plain, **unindented** `MpFormControl` *after* the full group: that field
  applies regardless of which radio is picked (both need a scope), where here
  the field only ever belongs to one specific option — the indent is what
  visually ties it to that one radio instead of the group as a whole.
  `width="100%"` on the inner `PxSelectPopover` still resolves correctly
  against the indented `MpFormControl`'s own (already-narrowed) width, same
  as the checkbox-reveal case — no `calc()` compensation needed since neither
  the radio's flex column nor the reveal itself carries an explicit
  percentage width of its own to fight the margin.
- **Uneven spacing around a conditional reveal is easier as per-item margins
  than one flex `gap`.** A single `gap` on the outer column can only be one
  number; here the radio-to-select gap (4px) and the select-to-next-radio gap
  (20px) are deliberately different, so `radioRow` drops its `gap` entirely
  and `competencyGroup` / the Goal wrapper each carry their own spacing instead.
- **No `MpFormLabel` on the revealed field** — the "Competency item" radio directly
  above it already names what the select is for; repeating "Competency item" as a
  field label would be pure duplication (same rule as the checkbox-reveal
  case above, where the revealed field's label would just repeat the box's
  own text).
- **Disabled option = `is-disabled` + an inline `MpBadge` "Coming soon"**, not
  left out of the group and not a `#description` caption — a badge sitting
  right next to the option name reads as "this choice exists, not yet," where
  a description line underneath reads more like ordinary explanatory text.
  Wrap the label + badge in `MpFlex as="span" align="center" gap="1"` (the
  inline-`MpBadge` exception noted above) — `gap="1"` is the 4px the badge
  sits from the label text. See `ActionPlanRelatedTo` in `utils/idp.ts`.
- **⚠️ `:class` on `MpRadio` lands on its hidden `<input>`, not the visible
  `<label>`** — the same gotcha `MpFormLabel`'s "Checking a box reveals more
  fields" section calls out for `MpCheckbox`. A margin meant to space the Goal
  radio from whatever's above it does nothing if put directly on `<MpRadio
  :class="…">`; wrap the radio in a plain `<div :class="…">` instead, as above.
- **Deselect a "checked" radio by listening on `@click`, not
  `@update:is-checked`/`@change`.** These two radios aren't a native
  mutually-exclusive group (no shared `name` — selection is driven entirely by
  the `relatedTo` ref, same as `IdpPlanForm.vue`'s Focus radios), and clicking
  an *already*-checked native radio input fires no `change` event — only
  `click` does. Since "no relation" is a valid state here (unlike Focus, which
  always has a value), the click handler toggles instead of only ever setting:
  ```ts
  function onRelatedToCompetencyClick() {
    relatedTo.value = relatedTo.value === 'competency' ? null : 'competency'
    if (relatedTo.value !== 'competency') relatedCompetency.value = ''
  }
  ```
  Clearing `relatedCompetency` on deselect is the same rule as any other
  reveal: a stale value surviving under a since-cleared relation is a real
  bug, not a cosmetic one.

(Two earlier revisions led here: first an `MpToggle` — "Relate action plan to
competency" — with the competency picker indented under it via a
control-measured `marginLeft`; then a two-radio group with Goal's "coming
soon" as a stacked `#description` line and the reveal sitting as its own
sibling *below the whole group*. Both were replaced piece by piece — toggle →
radios once Goal needed a visible, named slot in the choice; `#description` →
inline `MpBadge` once "coming soon" needed to read as a tag on the option
rather than caption text; reveal-after-the-group → reveal-under-Competency
once it became clear the field belongs to that one option, not to "having
made a choice" in general. If a similar field only ever has one real, always-
relevant follow-up regardless of which option is picked — like Focus's
future-job-position field — the after-the-group shape is still correct;
reach for the nested reveal only when the follow-up is specific to one option.)

**The revealed field searches in the field, like every searchable select.**
Don't pair it with `allow-custom-value` unless the field is a genuinely open
vocabulary like Category. A competency (or any closed catalog) should only
resolve to a real option.

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

## Permission matrix (parent/child checkbox table)

A role's permissions render as a 2-column `MpTable` (`:is-hoverable="false"`): **Access** (40%,
the parent `MpCheckbox`, `:is-indeterminate` when only some children are on) and **Permission**
(a `View` checkbox + one checkbox per child, each with its caption in `#description`, 16px apart).
A parent with no children shows just its description as `MpText size="label" color="text.secondary"`.
The Permission cell stacks 3+ lines, so the whole table is `verticalAlign: 'top'`. Checking a
child also checks the parent's View; unchecking View clears its children. Reference:
`components/manage-user/RolesForm.vue` (migrated from production's flex-row layout).

**Purpose-scoped permissions (Review cycle — PRD "Custom Role Improvement" S1).** The
scoped group renders as its own row ("Review cycle" checkbox, empty Permission cell)
followed by **one table sub-row per cycle purpose** — Performance, Competency, Evaluation —
not an accordion and no summary text. Each sub-row:
- **Access cell**: the purpose `MpCheckbox`, indented **32px** from the group checkbox
  (`paddingLeft: '40px'` = the cell's own 8px + 32px). Checked = every permission granted
  for that purpose; some = indeterminate. Clicking it grants/clears all of them.
- **Permission cell**: the group's normal View / Add / Edit / Delete checkboxes (Report is its own group — below),
  with the purpose spelled out in each `#description` ("View performance review cycles and
  their progress." — `SCOPED_PERMISSION_DESCRIPTIONS` in `utils/manageUser.ts`).
- **Evaluation only**: once any Evaluation permission is on, one `MpCheckbox` per employment
  status (Contract / Probation / Internship) appears **16px** below the Evaluation checkbox
  (`gap: '16px'` on the cell's flex column — explicit px, the spacing token renders slightly
  off), indented **32px** (the reveal indent), 12px apart. **No title** above them — the
  options read as Evaluation's children. It's a plain `div role="group"
  aria-label="Employment status"` (not `MpFormControl`, whose id would land on every
  checkbox). Granting Evaluation starts with every status ticked; **unticking the last
  status removes Evaluation** (evaluation access needs ≥1 status), which hides the group.
- **No line under the group row** ("Review cycle"): every cell of a row that has sub-rows
  below it gets `borderBottomColor: 'transparent'`. Dividers between purpose sub-rows start
  at the 32px indent: the Access cell's border goes transparent and a 1px `linear-gradient`
  background (`calc(100% - 40px)`, right-bottom) draws it. The last purpose row keeps the
  normal full-width row border.
- The table is `tableLayout: 'fixed'` so Access keeps its 40% (the status checkboxes live
  there), and cells get `whiteSpace: 'normal'` so descriptions wrap instead of clipping.
- Production's "child implies View" rule applies per purpose; unticking View for a purpose
  clears that purpose from every other permission.
- **Group checkbox**: fully checked → clears every purpose, permission and status; otherwise
  grants all. Compute the next value **once** before looping the nodes — re-reading
  "is everything on?" inside the loop flips after the first node changes and leaves the
  rest ticked.

**Report (PRD S2).** Its own group, below Review cycle — not a child of Review cycle. No
View row: the Permission cell holds **Standard report** (production's review-cycle report,
same id) and **9-Box report**. Below it, indented sub-rows like Review cycle's:
- **"Same scope as Review cycle"** `MpCheckbox` (a checkbox, not the PRD's switch, so the
  page keeps one control type), on by default. Its `#description` shows what it tracks —
  `scopeSummary()` of Review cycle's current purposes ("Performance, Evaluation (Contract,
  Internship)"; statuses only when not all) or "No Review cycle purpose selected yet".
- Unticking it starts a custom scope **from Review cycle's current one** and reveals one
  purpose sub-row each (purpose checkbox + the same Employment Status checkboxes under
  Evaluation). Permission cell empty — the scope applies to both report types.
- A granted Report with a custom scope and no purpose blocks Save
  ("Select at least one purpose for Report", toast).
- Stored on every Report grant as `scope` + `same_as_review_cycle`; migrated roles get all
  purposes/statuses and `same_as_review_cycle: true`, 9-Box unchecked (PRD S5).

**Dashboard (PRD S3).** One group checkbox, no scope picker. The Permission cell adds a
second `text.secondary` line under the description: "Scoped to Review cycle: …". With no
Review cycle purpose the checkbox is **`is-disabled`** and the line explains why
("Select a Review cycle purpose first…"); clearing Review cycle's last purpose also unticks
it (`watch`).

**Version 2 — one checkbox column per action (dev scenario, `rolesFormVersion`).** Same
rows and Access column, but the Permission column splits into **View / Create / Edit /
Delete** (`ACTION_COLUMNS`, 12% each; the Report column went away when Report became its
own section, header and checkbox centred via a
`display: flex; justifyContent: center` wrapper). Cells hold a **bare `MpCheckbox`** with an
`aria-label` ("Edit performance review cycle") — no label, no description; a cell with no
matching permission stays empty. Children map to columns by name (`Add` → Create, `Edit`,
`Delete`; the parent itself → View). The **Goals** module (renamed from Manage Goal, listed right after Review cycle) is plain View / Create / Edit / Delete. Children that aren't an action (Report's Review results / 9-Box) become indented Access-only sub-rows under
their group, with the same no-line-under-group rule; Report's scope rows follow them, action
cells empty. Dashboard's scope note moves into its Access checkbox's `#description` (no
description column in V2). In V2 an unscoped group checkbox reflects its whole row
(all → checked, some → indeterminate, click → all on / all off), unlike V1's production
rule. Switched by `components/manage-user/RolesFormScenarioControl.vue`
([`dev-scenario-control.md`](dev-scenario-control.md)).

Reference: `components/manage-user/RolesForm.vue`.
=======
### Saved Employee filters on the cycle detail page

Read-only view of the saved Employee filter (`pages/reviews/review-cycles/[id]/index.vue`, info rows). Shown as its own **Employee filter** row directly below **Employment status**: with 2+ filters, one bullet (`ul`, disc, `size="label"`) per filter as `Parameter: Value`, multiple values comma-separated; with a single filter, one plain line, no bullet. Cycles with no saved filter show the status only. Labels (not ids) are saved at create time.
>>>>>>> upstream/main

## Rules

- Field = `MpFormControl` + `MpFormLabel` (+ `MpFormErrorMessage`). Required via `:is-required`.
- **The required asterisk sits flush against the label, with no space** ("Objective*").
  Pixel's `_base` layer gives `.mp-form-control__required` a 4px `margin-left`;
  `assets/css/main.css` zeroes it globally with an unlayered rule. Don't add spacing back
  per field.
- Dropdowns = `PxSelectPopover`, width ≈50% of form column.
- Searchable select → `searchable` (search happens in the field, never a search bar in the popover). Open vocabulary (has a character counter) → `allow-custom-value` + `:maxlength` (centred "Add “…”" row).
- Section headers hand-rolled (`h2Class`/`h3Class`), never `MpText size="h2"`.
- No cards / no divider lines between sections — spacing + row border-bottom.
- Toggle/checkbox/radio use built-in label + `#description` slots.
- See [`buttons.md`](buttons.md) for footer CTAs, [`page-form.md`](page-form.md) for page-vs-drawer.

## Empty source list in `PxSelectPopover`

When the options list is empty (nothing to search), pass `empty-text`,
`empty-action-label` and `empty-action-href`. The popover shows the centred
`text.secondary` message, a divider, then a centred `text.link` row
`+ <label>` (same shape as the creatable "Add “…”" row) that opens the href in
a new tab, with no bottom padding under the link row (the list's 8px is dropped). Reference: Competency item select in `components/IdpActionPlanModal.vue`
("No competency items yet" / "Add competency item"). A radio that reveals a
select has **no label** on that select, a 4px gap under the radio and a 32px
indent (`marginLeft: '8'`); `IdpPlanForm.vue`'s future job position follows it.

### Role form: Save → Edit keeps the selection

The permission ids can't express everything the form shows (Version 2's tree cells and toggles, Report / Dashboard sub-row checkboxes, the "Same scope" toggles). The form therefore saves a `ui_state` blob with the role (`useManageUserStore`'s `RolePayload.ui_state`) and restores it on Edit. Version 2's `RolesPermissionTreeV2` takes it as a `v-model`, so the selection also survives switching between Version 1 and 2 while editing. Prototype only: production would persist these as real permissions.
