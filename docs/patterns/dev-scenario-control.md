# Dev scenario control (NOT a product pattern)

A floating control that forces a page into a state which would otherwise need
specific seed data — so a demo can reach every layout variant without hand-editing
`localStorage` or walking a long flow.

**Never reuse this treatment for a real feature.** A floating circular button anchored to
the viewport is deliberately reserved for dev affordances so it reads as "not part of the
product" at a glance. Real actions live in `#page-header-actions`, a filter bar, or a
table's action column — see [`header-bar.md`](header-bar.md) and [`buttons.md`](buttons.md).

Two exist today:

| Where | What it previews |
|---|---|
| `pages/goals/goal-cycles/[id]/index.vue` | Default vs **Async** — the bulk-approved-goal-creation banner + pending-row skeleton merge |
| `components/GoalsDashScenarioControl.vue` | The Goals dashboard's section/layout variants (below) |

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
  `is-close-on-select` (the goal-cycle control).
- **Several independent groups** → a `css()` panel inside `MpPopoverContent`: a
  `Scenario` title + a `Reset` textlink, then one labelled group per axis. **Omit
  `is-close-on-select`** — flipping several toggles in a row shouldn't dismiss the panel
  each time.

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

## Rules

- Floating FAB = dev only. Never for product actions.
- Fixed bottom-right, 24px, 48px circle, `background.inverse`, `sliders` icon,
  popover `placement="top-end"`.
- Multi-group panel: no `is-close-on-select`; always a `Reset` + a `Default` choice.
- State in a module-scope composable; defaults mirror the real seed.
- A forced state fakes its own preconditions, reusing the real rule's constants.
- Fabricated data is tagged and cannot navigate to a detail page it doesn't have.
