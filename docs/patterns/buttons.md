# Buttons

## Size

Default = **md** (no `size` prop). Use `size="sm"` only for dense icon controls (matrix add/remove, popover triggers) — never on primary CTAs unless explicitly requested.

## Variants

- **primary** — the submit/confirm action. Always the **rightmost** button.
- **secondary** — black border + black text on neutral fill. Used for in-form triggers ("Select employees", "Manage", "Select component"), select-styled popover triggers, and header utility buttons ("Help").
- **ghost** — Cancel/dismiss (**always ghost, no exceptions**), icon-only actions (edit, close, add/remove-circular), and export.

Cancel/dismiss = ghost is 100% consistent across every form, drawer footer, and modal footer.

> "Add another row" has two idioms in the repo: ghost `MpButton left-icon="add-circular"` (CycleGeneralForm, CycleMethodDrawer) vs a bare `<button>` text-link (`addLink = css({ color:'text.link', fontSize:'14px', lineHeight:'20px' })`). Prefer the **ghost `MpButton`** for consistency.

## Save vs Save changes

Computed label — **edit → "Save changes", create → "Save"**:

```ts
const saveButtonLabel = computed(() => (isEditing.value ? 'Save changes' : 'Save'))
```

(`AddGoalDrawer.vue:77`, `GoalCategoryFormDrawer.vue:222`, `competencies/create.vue:331`.) Modals use context verbs: "Update", "Confirm", "Create", "Continue".

## Hover-reveal icon button

An icon-only ghost button that only makes sense in the context of a specific
row/block (e.g. "add this employee", "change this owner") stays invisible
until the user hovers that row, rather than always showing:

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
`MpTooltip` when the icon alone doesn't say what it does (`SelectEmployeesDrawer.vue`'s `.add-employee-icon`, `goal-cycles/[id]/new.vue`'s edit-owner button).

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

## Rules

- Cancel/dismiss = ghost, always. Primary = rightmost.
- Edit forms say "Save changes"; create forms say "Save".
- Never disable the primary submit — validate + toast instead.
- Secondary = black border + black text on neutral.
