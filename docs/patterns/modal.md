# Modal (MpModal)

## Golden rule — position

Every `MpModal` aligns **top-center**, with a fixed **80px** gap between the viewport top
and the modal card — never vertically centered (`is-centered`), never the component's
own default 60px (`3.75rem`) offset.

- Do **not** pass `is-centered` — top alignment is the default positioning, we just need
  to widen its default top offset from 60px to 80px.
- `MpModal`'s own render skips Vue's scoped-style injection on its root (manual
  `mergeProps()` + `Teleport`), so a plain `scoped` selector never matches at runtime.
  Pass a unique `class` to `MpModal` and override with `:global()` + `!important`
  (beats the component's inline `margin-top: 3.75rem`):

```vue
<MpModal :is-open="isOpen" class="my-modal" @close="...">
  ...
</MpModal>

<style scoped>
:global(.my-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
```

Reference: [`components/TooManyEmployeesModal.vue`](../../components/TooManyEmployeesModal.vue),
[`pages/goals/goal-cycles/[id]/new.vue:906-917`](../../pages/goals/goal-cycles/%5Bid%5D/new.vue)
(`owner-list-modal`).

## Confirmation / gate modals — validate on the triggering action, not later

When a modal exists to gate a follow-on action (e.g. block/warn before navigating,
before saving), run the check **at the moment the user commits the input** — the
click of the button that would otherwise proceed (a drawer's "Continue"/"Save",
a form's "Submit") — not after they've already landed on the next screen and taken a
further action there. Surfacing the warning late means the user did the work twice.

Example: `TooManyEmployeesModal` (bulk goal owners) is shown the instant "Continue" is
clicked in `SelectEmployeesDrawer` — see [`composables/useBulkOwnerGate.ts`](../../composables/useBulkOwnerGate.ts) —
not after landing on the "New goals" page and clicking "Add goal".

## Reusing a gate modal across multiple entry points

If several pages share the same "select something → continue" flow and the same
limit/warning, put the gating logic in a composable (state + navigation) and the
UI in one shared modal component, rather than duplicating both per page. See
`useBulkOwnerGate` + `TooManyEmployeesModal`, used from `[id]/index.vue`,
`individual-goals.vue`, `team-goals.vue`, `organization-goals.vue`, `company-goals.vue`.
