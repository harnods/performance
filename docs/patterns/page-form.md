# Page form vs drawer vs modal

## Drawer width comes from `size` — CSS cannot override it

`MpModalContent` (which `MpDrawerContent` renders) writes `maxWidth: baseSizes[size]` as
an **inline style**, so no class — not even a higher-specificity descendant selector —
can widen a drawer. Pick the right step instead:

| `size` | width |
|--------|-------|
| `sm` | 330px |
| `md` | 448px (default) |
| `lg` | 684px |
| `xl` | 920px |
| `2xl` | 1152px |
| `full` | 100% |

A drawer holding a wide table should be sized so the table never scrolls horizontally —
e.g. an 816px table needs `xl`, not `lg` + a width hack.

> Also note the DOM id: `<MpDrawer id="drawer-x">` renders as **`#modal-drawer-x`**.

When is a create/edit a full page, a drawer, or a modal? Established split:

- **Full page** (`pages/.../create.vue`, default layout + breadcrumb + page title): top-level create/edit of a **primary entity** — Review cycle, Competency assignment, Succession plan. Uses `definePageMeta({ title, layout: 'default', breadcrumb })`, the 12-col grid ([`form.md`](form.md)), and an in-form footer bar for the primary CTA.
- **Drawer** (`MpDrawer placement="right"`): a **nested/secondary** editor invoked from within a page — one review method, a goal, a goal category, employee picker. Opened **only via a "Manage" / "Select…" secondary button**, never automatically on a toggle.
- **Modal** (`MpModal`): confirmation and small single-purpose inputs (purpose selection, disable-prefill confirm, save-cascade confirm).

## Drawer must open via "Manage", never on toggle

Load-bearing rule (`CycleGeneralForm.vue:201-205` comment): a toggle only flips `is_active`; the drawer opens from the Manage button handler. Opening is deferred to `nextTick` so the triggering click isn't treated as an outside-click close.

## Single-value picker field (opens a nested drawer)

A form field whose value is chosen via a nested drawer (e.g. "align to a parent goal") has two states — don't invent a different shape:

- **Empty**: `<MpButton variant="secondary" @click="openDrawer">Select …</MpButton>` (same Manage/Select rule as above).
- **Filled**: the picked value as plain text + two `MpTextlink as="button"` actions, `Change` (reopen the drawer) and `Remove` (clear it), all in one `MpFlex align="center" gap="3"`. No chip/badge wrapper — just text + links.

```vue
<MpFormControl v-if="condition" id="field-id">
  <MpFormLabel>Field label</MpFormLabel>
  <MpFlex v-if="value" align="center" gap="3">
    <span :class="valueText">{{ valueLabel }}</span>
    <MpTextlink as="button" @click="openDrawer">Change</MpTextlink>
    <MpTextlink as="button" @click="clearValue">Remove</MpTextlink>
  </MpFlex>
  <MpButton v-else variant="secondary" @click="openDrawer">Select …</MpButton>
  <MpFormHelpText>Optional helper copy.</MpFormHelpText>
</MpFormControl>
```

Reference: `AddGoalDrawer.vue:806-816` ("Align to a goal" field, opens `GoalAlignDrawer`).

## Drawer skeleton

```vue
<ClientOnly>
  <MpDrawer :is-open="isOpen" placement="right" size="md|lg" is-keep-alive @close="close">
    <MpDrawerContent>
      <MpDrawerHeader>{{ drawerTitle }}<MpDrawerCloseButton @click="close" /></MpDrawerHeader>
      <MpDrawerBody>…</MpDrawerBody>
      <MpDrawerFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="submit">{{ isEdit ? 'Save changes' : 'Save' }}</MpButton>
        </MpButtonGroup>
      </MpDrawerFooter>
    </MpDrawerContent>
    <MpDrawerOverlay />
  </MpDrawer>
</ClientOnly>
```

Conventions:
- Always wrapped in `<ClientOnly>`; `placement="right"`; `is-keep-alive`.
- **Form-bearing drawers guard against losing input:**
  - `:is-close-on-overlay-click="false"` — an outside click never closes (too easy to hit by accident).
  - Esc stays enabled, but every close path (Esc, close button, Cancel) routes through a `requestClose()` that runs a **dirty check** (snapshot of the form at open vs now). If the form changed, it opens a **"Leave without saving?"** confirm (Cancel / Discard) instead of closing; only Discard (or a clean form) actually closes. A successful Save closes directly (not "unsaved").
  - Both `AddGoalDrawer` and `AddKeyResultDrawer` implement this; the modal copy mirrors the page-level guard in `pages/goals/goal-cycles/[id]/new.vue`.
- Size `md` for simple forms, `lg` for complex/tabbed/two-column.
- Title = computed edit/add label (`isEdit ? 'Edit …' : 'Add …'`).
- Contract: `isOpen` prop + `update:isOpen` emit (parent uses `v-model:is-open`) + a domain emit (`save`/`saved`/`continue`).
- **Reset-on-open**: `watch(() => props.isOpen, open => { if (open) reset() })`. Deep-clone config if Cancel must discard edits.
- Body sections separated by spacing (`paddingBottom: '5'`), not border-bottom.
- Footer: Cancel (ghost) + primary, in `MpButtonGroup`. Panel box-shadow / header background fill are handled by Pixel's `MpDrawer*` — don't override.

## Modal skeleton

```vue
<ClientOnly>
  <MpModal :is-open="isOpen" is-centered @close="close">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>{{ title }}<MpModalCloseButton @click="close" /></MpModalHeader>
      <MpModalBody><MpText size="label" color="text.default">…</MpText></MpModalBody>
      <MpModalFooter>
        <MpButton variant="ghost" @click="close">Cancel</MpButton>
        <MpButton variant="primary" @click="submit">{{ verb }}</MpButton>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</ClientOnly>
```

- `<ClientOnly>` wrapped; `MpModalOverlay` first child.
- Confirm-only modals put buttons directly in the footer; form-bearing modals wrap in `MpButtonGroup`.
- Confirm verb is context-specific ("Update", "Confirm", "Create", "Continue").
- Reset-on-open watcher, same as drawers.
- **Save-cascade pattern**: a drawer's submit validates, and if a cascade is detected opens a confirm modal instead of saving; the modal's confirm calls the real `doSave()`.

## Read-only list modal (view-all, no footer action)

A modal that only *displays* a list (e.g. "every goal owner") has no footer at
all — the header's `MpModalCloseButton` (×) is the only dismiss action, don't
add a redundant "Close" `MpButton` in `MpModalFooter`. Rows get a 16px gap and
a 1px bottom border between them (not after the last row):

```ts
const list = css({ display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'auto' })
const row = css({ display: 'flex', alignItems: 'center', gap: '3', paddingTop: '4' })
const rowDivider = css({ paddingBottom: '4', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })
```
```vue
<div :class="list">
  <div v-for="(item, idx) in items" :key="item.id" :class="[row, idx < items.length - 1 && rowDivider]">…</div>
</div>
```

Reference: `goal-cycles/[id]/new.vue` — "Goal owners (N)" modal opened from the
avatar stack's "+N" overflow (see [`avatar.md`](avatar.md)).

## Overriding a modal's default top offset

`MpModal` positions `MpModalContent` with an inline `margin-top: 3.75rem`
(60px) by default (its `outside` scroll-behavior branch) — `position` is
`relative`, so a `top` override does nothing; you must override `margin-top`.
The class passed to `<MpModal class="…">` lands on `MpModal`'s own root node,
which — because it renders through a `Teleport` with a hand-rolled
`mergeProps()` — never receives this SFC's scoped-CSS id. A normal scoped
selector on that class therefore never matches at runtime; wrap the **whole**
selector in `:global(...)` and use `!important` to beat the inline style:

```vue
<MpModal :is-open="isOpen" class="my-modal" @close="close">…</MpModal>
```
```html
<style scoped>
:global(.my-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
```

Reference: `goal-cycles/[id]/new.vue` — the "Goal owners" modal above.

## Rules

- Primary entity create/edit = full page. Nested editor = drawer (via Manage). Confirm/tiny input = modal.
- Drawers open via a button, never on toggle; always reset on open.
- Cancel = ghost; edit = "Save changes", create = "Save" (see [`buttons.md`](buttons.md)).
- Don't hand-roll radio "cards" with raw hex — use `MpRadio` (see [`tokens.md`](tokens.md)).
