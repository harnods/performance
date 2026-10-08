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

## Anchored confirm modal (no overlay)

A leave-the-page confirmation can hang off the button that asked for it instead of
sitting top-centre. This is the one allowed exception to the **80px top-centre** rule
above (first user: the IDP import step 2's Cancel, `components/StepImportPage.vue`).

- `MpModal` **without `MpModalOverlay`**: no dimming, the page stays visible. Don't pass
  `is-centered`; pass `:is-block-scroll-on-mount="false"` so the page can still scroll.
- No close button (`MpModalCloseButton` omitted): the footer's ghost **Cancel** is the
  way out. Esc and a click outside also close it (Pixel's wrapper handles both).
- Position the card yourself through `MpModalContent`'s `style`: `position: fixed`,
  `margin: 0`, `left` = the trigger's left edge, `bottom` = `innerHeight - trigger.top + 4`
  (**card bottom 4px above the trigger**), `top: auto`, `width: 400px`. Read the rect from
  a wrapper `<span ref>` around the button (a ref on `MpButton` is the component, not the
  element), when opening, and again on `scroll` (capture) and `resize` while open, so the
  card stays glued to the button.
- While it is open, **disable the page's other footer actions** (Back, Import) so the only
  choices are the modal's.
- Copy: title is the question ("Leave this page?"), body one sentence of what is lost,
  footer ghost **Cancel** + the verb button (**Leave**).
- **Pixel 3's `MpButton` has no `warning` variant** (primary, secondary, ghost, danger,
  tertiary, textLink, unstyled), so a warning-weight action uses `variant="danger"`.

## Production-matched full modal (competency item)

`components/competency-item/ModalForm.vue` (full-size `MpModal`) copies production's Pixel 1 look
instead of Pixel 3's grey header bar: `MpModalHeader` gets a white background with 14px / 16px
padding and a **24px / 600** title, the body starts 20px lower, and `MpModalFooter` gets a 1px
`border.default` top border with 20px / 24px padding. Use it only for screens migrated to match
production; other full modals keep the Pixel 3 defaults.

## Destructive confirmation modal

For a "delete this thing" confirmation (not a bulk multi-select delete — see the
Tables doc for that), keep it minimal: no icon, no illustration.

- `MpModalContent`: narrow — `:class="css({ width: '400px', maxWidth: '90vw' })"`.
  A one-line question + one-sentence body doesn't need the wider default modal width.
- `MpModalHeader`: the action as a question, e.g. `Delete review timeframe?`
- `MpModalBody`: one `MpText` (`:class="valueText"`, i.e. `color: 'text.default'`)
  stating what will happen — plain language, no jargon, name the blast radius if the
  action cascades (e.g. "This will permanently delete all employee reviews under this
  timeframe.")
- `MpModalFooter`: `MpButton variant="ghost"` **Cancel** + `MpButton variant="danger"`
  labeled with the action verb (**Delete** / **Remove**), `justifyContent: 'flex-end'`,
  `gap: '3'`

The menu item that opens it (in an `MpPopoverList`) is red, wrapped in a span rather
than a variant prop, and separated from non-destructive items with `MpDivider`:

```vue
<MpDivider />
<MpPopoverListItem @click.stop="askDelete(item)">
  <span :class="dangerText">Delete</span>
</MpPopoverListItem>
```
where `dangerText = css({ color: 'text.danger' })`.

Reference: [`pages/reviews/review-cycles/[id]/index.vue`](../../pages/reviews/review-cycles/%5Bid%5D/index.vue)
(`deleteTimeframeModalOpen` / `askDeleteTimeframe`), mirroring the existing
`removeEmployeeModalOpen` confirm modal in the same file and the `dangerText` popover
item in [`components/GoalBulkActionsMenu.vue`](../../components/GoalBulkActionsMenu.vue).

## Reusing a gate modal across multiple entry points

If several pages share the same "select something → continue" flow and the same
limit/warning, put the gating logic in a composable (state + navigation) and the
UI in one shared modal component, rather than duplicating both per page. See
`useBulkOwnerGate` + `TooManyEmployeesModal`, used from `[id]/index.vue`,
`individual-goals.vue`, `team-goals.vue`, `organization-goals.vue`, `company-goals.vue`.

## Read-only record modal (IDP action plan "Update" modal)

`components/IdpActionPlanViewModal.vue` replicates production's
`ModalViewActionPlan`. Its spacing was measured off production, so mirror it
for similar two-column "view one record" modals:

- **Padding:** the **header keeps Pixel's own `MpModalHeader` padding**
  (12px 16px, 55px tall). Never override the header. The body is
  `24px 24px 40px`, matching production, via the same scoped
  `:global(...) !important` rule as the 80px top margin.
- **Grid:** `1fr 280px`, with a 32px gap. Left column (description,
  attachments, activity) has 24px between sections. Right column has 20px
  between label/value groups.
- **Right-column groups:** the label is 14/20 `text.secondary`, 4px above the
  value. The value is 14/20 semibold.
- **Header** is the generic action, **"Update action plan"**, not the record's
  name.
- **Record title in the content:** the action plan's name opens the left
  column as a title, with its description directly under it. It uses the same
  pattern and sizes as the form's section header (`IdpPlanForm`): 20/600/32
  `text.default` title and 14/20 `text.secondary` description ("No
  description" when empty).
- **Activity rows:** `lg` avatar with 12px to the text, and 12px between rows.
  The timestamp sits **under the sentence as its description** (12/16
  `text.secondary`).
- **"Relates to" group** (`relatedTo === 'competency'`), three lines:
  "Competency item" (value style), then the competency item name (14/20
  `text.secondary`), then a **"View details"** link (`MpText as="button"
  size="label-small" color="text.link"`). The link emits `viewCompetency`. The
  page opens `CompetencyDetailDrawer`, which stacks over this modal without
  issue. Only a **modal opened inside this modal** crashes (see avatar.md);
  a drawer mounted by the parent page is fine.
- Explicit px for spacing, because tokens `5` and `6` render 20.8px and
  24.96px in this build.

## "Unable to delete" (blocked by usage)

Body: one sentence ("…because it is included in these group & IDP:"),
then the blocking records as a **real bullet list** (`<ul>` with `listStyleType: 'disc'`,
`paddingLeft: '5'`, gap `1`), never `indicator-circle` icons. When blocked by
more than one kind, group them under 14/600 labels ("Group:", "IDP:"); with a single kind the labels are omitted. Footer: one primary "OK, understand".
Succession plans do not block deletion. Reference: `pages/talents/competencies/items/index.vue`. A competency item counts
each IDP that links it from an action plan in **Applied**, and is blocked from
deletion while linked.
