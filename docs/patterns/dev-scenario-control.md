# Dev scenario control (NOT a product pattern)

A floating control that forces a page into a state which would otherwise need
specific seed data — so a demo can reach every layout variant without hand-editing
`localStorage` or walking a long flow.

**Never reuse this treatment for a real feature.** A floating circular button anchored to
the viewport is deliberately reserved for dev affordances so it reads as "not part of the
product" at a glance. Real actions live in `#page-header-actions`, a filter bar, or a
table's action column — see [`header-bar.md`](header-bar.md) and [`buttons.md`](buttons.md).

Six exist today:

| Where | What it previews |
|---|---|
| `components/demo/IdpDevTools.vue` (IDP create/edit form + plan detail, via `DemoLayer`) | **Coachmarks**: pulses marking what the prototype changes vs production (see below). **Bottom-left**, not bottom-right. On the IDP import page it adds, **only while the wizard is on step 2** (`useIdpImportFlag().importStep`), a **Scenario** section (**Default** / **Loading state**, which keeps step 2 on the "Generating template..." loader via `useIdpImportFlag().importScenario`) and an **Error states** section (None / File is too large / File format is incorrect, forces the dropzone's inline error via `useIdpImportFlag().importError`). |
| `components/demo/IdpListDevTools.vue` (IDP list, via `DemoLayer`; replaces `IdpDevTools` there) | **Bottom-right** FAB with the coachmark controls only (the header **Import** button always shows, no toggle). |
| `components/demo/EvaluationCycleDevTools.vue` (Create new cycle + Edit cycle, `?purpose=evaluation`, via `DemoLayer`) | The **Coachmarks** group only. There's no scenario switch: Edit cycle is a real page (`/reviews/review-cycles/:id/edit`), so nothing is faked. Bottom-left, like IDP's. |
| `pages/goals/goal-cycles/[id]/index.vue` | One FAB, one axis at a time — which axis depends on the active tab: on **All goals** it's **Submission status** (Default vs Async, the bulk-approved-goal-creation banner + pending-row skeleton merge); on **Closed** it's **Default vs Empty** (forces the Closed tab's empty state even though the cycle already has closed goals). The two never show together since the tabs are mutually exclusive. |
| `components/GoalsDashScenarioControl.vue` | The Goals dashboard's section/layout variants (below) |
| `components/CompetencyItemScenarioControl.vue` | Competency items list: **Filled (Default)** (mock seed) vs **Empty state** (blank slate). One axis, flat list. State in `useCompetencyItemStore().scenario`. |
| `components/demo/ActionPlanDevTools.vue` (IDP → Add/Edit action plan drawer) | Small round `sliders` button **in the drawer header, left of the X** (not a FAB, since the drawer covers the corner). Forces the Competency item picker's source: Filled vs Empty (blank slate). Shares `useCompetencyItemStore().scenario`. |

## The FAB is fixed — copy it exactly

```ts
const scenarioFab = css({ position: 'fixed', right: '24px', bottom: '24px', zIndex: '100' })
const scenarioFabButton = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '48px', height: '48px', borderRadius: 'full',
  background: 'background.inverse',
  border: 'none', cursor: 'pointer', boxShadow: 'lg',
  _hover: { opacity: '0.9' },
  _focusVisible: { boxShadow: '0 0 0 3px var(--mp-colors-border-brand)' },
})
```

```vue
<div :class="scenarioFab">
  <MpPopover use-portal placement="top-end">
    <MpPopoverTrigger>
      <button type="button" :class="scenarioFabButton" aria-label="Scenario control">
        <MpIcon name="sliders" size="sm" color="icon.inverse" />
      </button>
    </MpPopoverTrigger>
    <MpPopoverContent> … </MpPopoverContent>
  </MpPopover>
</div>
```

`MpIcon` takes its colour from its own `color` prop, never an inherited class
([`icons.md`](icons.md)).

## Flat list vs grouped panel

- **One axis of state** → `MpPopoverList` of `MpPopoverListItem` with `:is-active`, and
  `is-close-on-select`. The goal-cycle detail control is this shape *twice over* — its
  `MpPopoverContent` swaps between two different flat lists depending on which tab is
  active (`v-if="activeTab === 'all'"` / `v-else`), rather than combining both axes into
  one panel, since a page can only ever be on one of those tabs at a time.
- **Several independent groups that can all be true at once** → a `css()` panel inside
  `MpPopoverContent`: a `Scenario` title + a `Reset` textlink, then one labelled group
  per axis. **Omit `is-close-on-select`** — flipping several toggles in a row shouldn't
  dismiss the panel each time. `GoalsDashScenarioControl.vue` is this shape, because its
  three axes (goals progress, distribution, awaiting approval) are all visible on the
  dashboard simultaneously.

Group labels are 12px/600 uppercase `text.secondary`; toggles follow
[`toggle.md`](toggle.md)'s label-before-switch form (bare `<MpToggle />`, label as a
preceding sibling in one `MpFlex`).

## State lives in a module-scope composable

Same singleton shape as the mini-DB stores, so the control and the page share state
without prop drilling (`composables/useGoalsDashboardScenario.ts`):

```ts
const needsUpdate = ref(true)
const distribution = ref<DistributionScenario>('default')
export function useGoalsDashboardScenario() { return { needsUpdate, distribution, reset, … } }
```

- Defaults should **approximate the real seed**, so an untouched page looks truthful.
- Always ship a **`Reset`**, and include a `'default'` option on any multi-choice axis
  meaning *use real data* — without it there's no way back from a forced state.

## Rules for the overrides themselves

- **Keep the product rule visible in code.** When a scenario flag replaces real logic,
  leave the real computation next to it rather than deleting it:
  ```ts
  const showNeedsUpdate = computed(() => (scenario.needsUpdate.value ? needsUpdate.value.length > 0 : false))
  // restore as showNeedsUpdate when the control is removed
  const _productShowNeedsUpdate = computed(() => isFinalWeek.value && needsUpdate.value.length > 0)
  ```
- **A forced state must stay internally consistent.** If a flag reveals something the
  product only shows under a precondition, the scenario has to fake the precondition too
  — otherwise the page contradicts itself on screen and the demo reads as a bug. Forcing
  "Needs update" on (a final-week-only section) also moves the countdown into that
  window:
  ```ts
  if (scenario.needsUpdate.value) return `${NEEDS_UPDATE_WINDOW_DAYS} days left in this goal cycle`
  ```
  Derive the faked value from the **same constant** the real rule uses, so the two can't
  drift apart.
- **Synthesize rows only as a fallback.** Use real records when the current scope has
  them; fabricate only when it doesn't (the seed produces no progress-update
  submissions, so that card could otherwise never be shown). Shape fabricated records
  like the real type so shared classifiers bucket them identically.
- **Fabricated rows must not pretend to be real.** Tag them by id prefix
  (`dev-scenario-sub-…`) and make actions that would open a detail page fail loudly:
  ```ts
  if (isDemoSubmission(submission)) { toast.notify({ …, variant: 'error', title: 'Demo row — no request to open' }); return }
  ```
- Scenario state is in-memory only — never persist it to `localStorage` beside real
  mini-DB data.

## Coachmarks: flag what's new vs production (`components/demo/`)

For demos and FE hand-off, a page can mark every element that differs from
production with a **pulse**. Clicking a pulse opens a **coachmark** that says
what's new.

### Demo code never lives in product files

**Everything demo-only lives in `components/demo/`. Product components and
pages contain zero demo code**, so a developer porting a page to
talenta-review copies nothing demo-related.

- `components/demo/coachmarks.ts` is the **registry**. Each entry has an `id`,
  a `route` regex, a `find()` that locates an element **already in the product
  markup** (an `MpFormLabel`'s `<controlId>-label` id, an exact own-text match
  on a `th`/title, or a scoped selector like `.idp-view-modal`), plus `title`,
  `description` and `placement`, and an optional `when(route)` for a query
  condition (the evaluation entries only show on `?purpose=evaluation`).
- `components/demo/DemoLayer.vue` is mounted **once in `app.vue`**. It
  filters the registry by route, watches the DOM (MutationObserver, one scan
  per frame, so tables, drawers and modals that mount later get their
  pulses), appends an **absolutely positioned** host `<span data-demo-coachmark>`
  inside each anchor, and teleports a `DevCoachmark` into it. It also renders the module's dev
  tools panel on any route that has coachmarks: `EvaluationCycleDevTools` under
  `/reviews/review-cycles`, `IdpDevTools` everywhere else. It rescans on
  `route.fullPath`, so a query change (e.g. a scenario flag) updates the pulses.
- **Off switch:** `runtimeConfig.public.demoMode` (default `true` in this
  prototype; `NUXT_PUBLIC_DEMO_MODE=false` hides everything).
- **Not auto-imported:** `nuxt.config.ts` registers components with
  `ignore: ['demo/**']`, so a product file can't use `<DevCoachmark>` by
  accident. Only `app.vue` imports `DemoLayer`, explicitly.
- Every demo file starts with a `DEMO ONLY — do not port` banner. **To port
  a page, ignore `components/demo/` and the `DemoLayer` line in `app.vue`.**
- Adding a coachmark is one registry entry. Don't add markup to the product
  component. If an anchor has no stable id or text, match on what's already
  rendered, scoped as tightly as you can.
- A pulse inside a `<label>` is safe: clicking a button inside a label doesn't
  trigger the label's control.
- **A coachmark never changes the size or layout of what it marks.** The host is
  always out of flow (`position: absolute`; the anchor gets `position: relative`
  if it's static), so there's nothing to widen a button, push a flex/grid sibling
  or add a gap slot (an inline pulse once pushed the filter row's remove button
  out, and grew the Import button). Two placements:
  - **Default**: just outside the anchor's last text, vertically centred (labels,
    column headers, titles, captions, hints). Measured from the text, so a
    full-width block still puts the pulse next to its words.
  - **`corner: true`**: overlaps the anchor's top-right corner (`top/right: -8px`).
    Use it for anything that is a box of its own: buttons, input fields.
  Verify with `host.style.display = 'none'` and compare the anchor's
  `getBoundingClientRect()`: it must not change.

### Look and behaviour

- `DevCoachmark` renders an 8px **orange** dot (`orange.500`) with an animated
  ring (`px-coachmark-pulse` in `main.css`).
- The coachmark is an `MpPopover` (`use-portal`), 280px wide, with a 14/600
  title, a 14px `text.secondary` description, and a right-aligned **Hide**
  button (`MpButton variant="secondary"`) that hides that one coachmark.
  There's no eyebrow label.
- **`IdpDevTools`** / **`EvaluationCycleDevTools`** are the FAB panels (one per
  module, picked by `DemoLayer` from the route). A module's own scenario switches
  go in a **Scenario** group above Coachmarks, using the same label-before-toggle
  row + 12px hint (e.g. the import page's Loading state). Every panel has a **Coachmarks** group with a
  **Show coachmarks** toggle, an "n hidden" count and a **Reset coachmarks**
  textlink. Reset shows every hidden coachmark again and turns them back on.
- State lives in `components/demo/useDevCoachmarks.ts`. It's module-scope and
  in-memory only, so a reload brings everything back.
- **Write the description as the delta:** what's new and when it appears.
  Ids are `<page>-<area>-<thing>`.
- **Behaviour changes need a visible anchor.** When the change is "X only
  appears after Y", anchor the pulse to what's always on screen (the field
  label or section title that triggers it), not inside X. In the
  description, say what production does instead.

Current IDP coachmarks:

| Where | Anchor | What it explains |
|---|---|---|
| Create/edit plan | Employee label | Informal education table only appears after an employee is selected (production shows it immediately as an empty state) |
| Create/edit plan | "Select focus" label | Current-position description on the Focus option |
| Create/edit plan | "Action plan" section title | Action plan table only appears after the first action plan is added (production shows it immediately as an empty state) |
| Create/edit plan | "Relates to" column header | New column |
| Add action plan drawer | "Relates to" label | New field |
| Plan detail | "Relates to" column header | New column; competency name opens the detail drawer |
| Update modal | Action plan title | "Update action plan" header, title + description in content, timestamps under each activity |
| Update modal | "Relates to" label | New Relates to info |
| IDP list | Import button (`corner: true`) | New; always shown in the page header |
| Import page | "Download the IDP template" step | New two-step import wizard |
| Import page, step 2 | Dropzone hint | Hint reads ".xlsx only with max size 10mb"; the limit is 10 MB (was 5 MB) |
| Competency items table | "Applied to" column header | Renamed from "Applied"; shows Competency group / IDP text instead of a count |
| Competency items table | "Description" column header | Capped at 240px so Applied to fits |

Current evaluation cycle coachmarks (Create new cycle → Employee filter):

| When | Anchor | What it explains |
|---|---|---|
| Always | "Employee filter" label | Several filter types instead of one; AND across filters, OR within; new Job grade / Job class |
| Always | The caption under the label | One fixed caption says who's included |
| Create, once a filter type is picked | First value field (`.mp-gap_24px [data-pixel-component="MpInputGroup"]`), `corner: true` | Search in the field, named values, popover as wide as the field, infinite scroll |
| After a failed Save | "You must select at least one …" | Empty filter blocks Save (PRD defers validation; PM to confirm) |
| Edit cycle page (`/reviews/review-cycles/:id/edit`) | "Employee filter" label | Locked fields (Employee filter, and Employment status) explain why on hover; production says nothing |

## Rules

- Floating FAB = dev only. Never for product actions.
- Fixed bottom-right, 24px, 48px circle, `background.inverse`, `sliders` icon,
  popover `placement="top-end"`. **Exception:** the demo-layer panels
  (`IdpDevTools`, `EvaluationCycleDevTools`) sit **bottom-left** (`left: 24px`, popover `placement="top-start"`), so it never
  collides with a page's own bottom-right scenario FAB.
- Multi-group panel: no `is-close-on-select`; always a `Reset` + a `Default` choice.
- State in a module-scope composable; defaults mirror the real seed.
- A forced state fakes its own preconditions, reusing the real rule's constants.
- Fabricated data is tagged and cannot navigate to a detail page it doesn't have.
- Inside a drawer/modal (which covers the page's FAB corner), use a 32px round
  `background.inverse` `sliders` button in the header, left of the X
  (`absolute`, `right: 56px`), with a `bottom-end` popover. Same dev-only rule.
