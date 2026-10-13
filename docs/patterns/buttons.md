# Buttons

## Size

Default = **md** (no `size` prop). Use `size="sm"` only for dense icon controls (matrix add/remove, popover triggers) — never on primary CTAs unless explicitly requested.

## Variants

- **primary** — the submit/confirm action. Always the **rightmost** button.
- **secondary** — black border + black text on neutral fill. Used for in-form triggers ("Select employees", "Manage", "Select component"), select-styled popover triggers, and header utility buttons ("Help").
- **ghost** — Cancel/dismiss (**always ghost, no exceptions**), icon-only actions (edit, close, add/remove-circular), and export.
- **danger** — also stands in for a "warning" action, since Pixel 3 has no `warning` variant (e.g. **Leave** in the anchored leave-page modal, [`modal.md`](modal.md)). The destructive confirm button in a delete modal's footer, paired with `Cancel` (ghost). Dominant, 20+ files (`goal-cycles/index.vue:600`, `talents/competencies/index.vue:349`, `components/IdpDeleteModal.vue`). Never the row-level trigger that *opens* the confirm (that stays a ghost icon button or a `MpPopoverListItem` styled `color: 'text.danger'`) — `danger` is reserved for the modal's own final "yes, delete" action.

Cancel/dismiss = ghost is 100% consistent across every form, drawer footer, and modal footer.

> "Add another row" has two idioms in the repo: ghost `MpButton left-icon="add-circular"` (CycleGeneralForm, CycleMethodDrawer) vs a bare `<button>` text-link (`addLink = css({ color:'text.link', fontSize:'14px', lineHeight:'20px' })`). Prefer the **ghost `MpButton`** for consistency. Exception: adding a whole **filter row** ("Add filter") is a `variant="secondary" right-icon="chevrons-down"` dropdown button whose popover lists the filter types left to add. See [form.md](form.md) "Repeatable filter rows".

## Save vs Save changes

Computed label — **edit → "Save changes", create → "Save"**:

```ts
const saveButtonLabel = computed(() => (isEditing.value ? 'Save changes' : 'Save'))
```

(`AddGoalDrawer.vue:77`, `GoalCategoryFormDrawer.vue:222`, `competencies/create.vue:331`.) Modals use context verbs: "Update", "Confirm", "Create", "Continue".

## Hover-reveal icon button

An icon-only ghost button that only makes sense in the context of a specific
row/block (e.g. "add this employee") stays invisible until the user hovers
that row, rather than always showing:

```ts
const row = css({
  display: 'flex', alignItems: 'center', gap: '3',
  '& .reveal-btn': { opacity: '0', transition: 'opacity 0.12s ease' },
  '&:hover .reveal-btn': { opacity: '1' },
})
```
```vue
<div :class="row">
  ...
  <MpButton variant="ghost" left-icon="edit" class="reveal-btn" aria-label="..." />
</div>
```

`opacity` (not `display`/`v-if`) so the button still occupies layout space —
nothing shifts when it appears. The plain `class="reveal-btn"` (alongside the
panda-generated `:class`) is what the `&:hover .reveal-btn` selector targets;
Panda's own atomic classes aren't stable enough to hook. Pair with
`MpTooltip` when the icon alone doesn't say what it does (`SelectEmployeesDrawer.vue`'s `.add-employee-icon`).

## No disabled primary CTA

The form/page **primary submit button is never disabled.** `onSave` sets a `submitted` flag, validates, and on failure shows inline errors and/or an error toast, then returns:

```ts
toast.notify({ id: 'cycle-form-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
```

> `:is-disabled` **is** allowed on *secondary/row* controls that gate a sub-flow — "Manage" disabled until its toggle is on, remove-row disabled at the last row. The no-disabled rule is specifically about the primary submit CTA.

⚠️ Invalid-submit feedback is inconsistent (toast vs silent inline vs danger banner). **Prefer the error toast** (`top-center`, `variant: 'error'`, unique `id`).

## Where the primary CTA lives

- **Create/edit forms** → an in-form right-aligned **footer bar**, not the header:
  ```ts
  const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2', paddingTop: '4' })
  ```
  The page header (`#page-header-actions`) holds only a secondary/utility button (e.g. "Help").
- **List pages** → the primary CTA lives in `#page-header-actions` (see [`header-bar.md`](header-bar.md)).
- **Drawers/modals** → footer, Cancel (ghost) + primary, usually in `MpButtonGroup`.

## "Create X" / "Add X" CTA carries `left-icon="add"`

A button whose whole job is creating or adding a new record — a list page's
header CTA (`Create program`), an empty state's own CTA, "Add action plan" —
gets `left-icon="add"`, in every variant it appears in (`primary` header
button and `secondary` empty-state button both, when the same action shows up
in both places, e.g. `talents/idps/index.vue`'s `Create program`). Keep every
instance of the same button in sync — this app's IDP list previously dropped
the icon from `Create program` in a redesign pass and later put it back; don't
let one variant carry the icon while a sibling instance of the identical
button/action doesn't.

**Exception — dropdown "Add X ▾":** when the button opens a menu to choose
*what* to add (the evaluation cycle's "Add filter", whose popover lists the
filter types left), it takes `right-icon="chevrons-down"` and **no** left
`add` icon. The chevron is the affordance, and two icons on one short label
read as clutter. See [form.md](form.md) "Repeatable filter rows".

## Rules

- Cancel/dismiss = ghost, always. Primary = rightmost.
- Edit forms say "Save changes"; create forms say "Save". A drawer that **adds an item into a list on the page** (not saved on its own) says "Add" on create and "Save changes" on edit (IDP Add / Edit action plan drawer, `IdpActionPlanModal.vue`); per the copy library, Add = include into an existing context.
- Never disable the primary submit — validate + toast instead. **Exceptions:** the IDP Add / Edit action plan drawer (`IdpActionPlanModal.vue`) and the competency item Create / Edit modal (`components/competency-item/ModalForm.vue`, matching production) show the inline field errors only, with **no** error toast, on an invalid save. The competency item modal's rating-table header edit icons are 20px ghost icon buttons (`size="sm"` capped to 20px with no padding, like production's `mp-button-icon size="sm" p="0"`), so the header row is as short as the body row.
- Secondary = black border + black text on neutral.
- A "Create X"/"Add X" CTA gets `left-icon="add"` — keep it consistent across every instance of the same action. Exception: a dropdown "Add X ▾" gets only `right-icon="chevrons-down"`.

## Disabled by permission: "Add role"

When the user can't create roles, the header "Add role" button (and the empty-state one) is `is-disabled` with a tooltip: "Contact your admin to get access to add roles". A disabled button fires no mouse events, so the `MpButton` sits inside a `div` inside an `MpTooltip` (`:is-manual="canManageRoles" :is-open="false"` turns it off for users who can). See [`checkbox.md`](checkbox.md) › Locked by permission.
