# Page form vs drawer vs modal

When is a create/edit a full page, a drawer, or a modal? Established split:

- **Full page** (`pages/.../create.vue`, default layout + breadcrumb + page title): top-level create/edit of a **primary entity** — Review cycle, Competency assignment, Succession plan. Uses `definePageMeta({ title, layout: 'default', breadcrumb })`, the 12-col grid ([`form.md`](form.md)), and an in-form footer bar for the primary CTA.
- **Drawer** (`MpDrawer placement="right"`): a **nested/secondary** editor invoked from within a page — one review method, a goal, a goal category, employee picker. Opened **only via a "Manage" / "Select…" secondary button**, never automatically on a toggle.
- **Modal** (`MpModal`): confirmation and small single-purpose inputs (purpose selection, disable-prefill confirm, save-cascade confirm).

## Drawer must open via "Manage", never on toggle

Load-bearing rule (`CycleGeneralForm.vue:201-205` comment): a toggle only flips `is_active`; the drawer opens from the Manage button handler. Opening is deferred to `nextTick` so the triggering click isn't treated as an outside-click close.

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

## Rules

- Primary entity create/edit = full page. Nested editor = drawer (via Manage). Confirm/tiny input = modal.
- Drawers open via a button, never on toggle; always reset on open.
- Cancel = ghost; edit = "Save changes", create = "Save" (see [`buttons.md`](buttons.md)).
- Don't hand-roll radio "cards" with raw hex — use `MpRadio` (see [`tokens.md`](tokens.md)).
