# Date picker — `MpDatePicker`

For **display** formatting of dates already stored, see
[`date-format.md`](date-format.md). This page is about the input.

---

## `value-type` decides what your model holds — pick it from the store, not the UI

This is the prop that actually matters, and the repo uses two different answers
on purpose:

| `value-type` | `v-model` receives | Use when |
|---|---|---|
| `date` (most usages) | a **`Date` object** | The value is consumed as a date — compared, ranged, or fed to a formatter |
| `string` | a **string formatted per `format`** | The value is persisted as text; pair with `format="YYYY-MM-DD"` so the model is an ISO date |
| *(omitted)* | component default | ⚠️ Two files do this. Don't copy it — be explicit. |

```vue
<!-- Stored as ISO text (IdpActionPlanModal.vue): the store holds yyyy-mm-dd,
     so the picker hands back exactly that and no conversion is needed. -->
<MpDatePicker v-model="startDate" value-type="string" format="YYYY-MM-DD"
  placeholder="Select date" use-portal :is-show-shortcut="false" />

<!-- Worked with as a Date (CycleMethodDrawer.vue) -->
<MpDatePicker v-model="deadlineDate" value-type="date" format="D MMM YYYY"
  placeholder="Select deadline date" use-portal :is-show-shortcut="false" />
```

> `format` does **two** jobs: it's the text shown in the closed field, *and*
> — when `value-type="string"` — the shape of the model itself. Changing it to
> prettify the field silently changes your stored data. That's the trap.

## Always `use-portal` inside a modal or drawer

Without it the calendar is clipped by the dialog's own overflow. Every in-drawer
usage in the repo passes it; so does the IDP action-plan modal.

## `:is-show-shortcut="false"` unless shortcuts genuinely help

Every non-inline usage in the repo disables the shortcut rail. Keep it off by
default — turn it on only when relative jumps ("last 7 days") are actually
useful for that field.

## Ranges — one picker, not two

A start/end pair is `is-range` on a **single** picker bound to a two-element
model, with a `"Start date - end date"` placeholder:

```vue
<MpDatePicker v-model="form.pick_goals_period" value-type="date" format="D MMM YYYY"
  placeholder="Start date - end date" is-range use-portal :is-show-shortcut="false" :class="selectWidth" />
```

Use **two separate pickers** only when the two dates are independently labelled
fields the user reasons about separately — the IDP action plan's Start date /
End date, which sit in a `1fr 1fr` grid with their own labels and their own
`MpFormErrorMessage`s. Cross-field validation is then yours to write:

```ts
const endBeforeStart = computed(() => !!startDate.value && !!dueDate.value && dueDate.value < startDate.value)
```

(That string comparison is only safe because `value-type="string"` +
`format="YYYY-MM-DD"` makes the model lexicographically ordered — another reason
to pick the ISO format when you need to compare.)

## Inline month / week / year pickers

`type="month" | "week" | "year"` + `is-inline` renders the calendar in place
(no field, no popover) — used by the period picker's draft state, which commits
on `@update:model-value`. Don't use `is-inline` for an ordinary form field.

## Rules

- Always set `value-type` explicitly; choose it from how the value is **stored**.
- `value-type="string"` → `format="YYYY-MM-DD"`, so the model stays ISO and sortable.
- `use-portal` in any modal/drawer.
- `:is-show-shortcut="false"` by default.
- One `is-range` picker for a period; two pickers only for separately-labelled fields.
- Wrap each picker in `MpFormControl` + `MpFormLabel` like any other field
  ([`form.md`](form.md)).

Reference: `components/IdpActionPlanModal.vue` (two ISO-string fields),
`components/CycleMethodDrawer.vue` (ranges), `components/PxAdvancedDatePicker.vue` (inline month/week/year).
