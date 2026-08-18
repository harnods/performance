# Dashboard section

How a dashboard composes its parts. A dashboard is **not** a list page: its sections are
peers on one scrollable surface, none of them "the" page content. That changes three
things the list-page docs specify differently — the card shell, the empty state, and the
freshness control.

Applies to `pages/dashboard.vue` (both tabs) and `components/GoalsDash*.vue`. For the
tinted figure cards see [`stat-card.md`](stat-card.md); for the rings see
[`donut-chart.md`](donut-chart.md).

## The section card shell

Each self-contained section is a white card:

```ts
const card = css({
  display: 'flex', flexDirection: 'column', gap: '4',
  padding: '6', background: 'white',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'lg',
})
```

Its own heading lives **inside** the card (H2 20/32 + a `text.secondary` 14px total/caption
line). A heading that labels *several* cards — "Goals distribution", "Awaiting approval" —
sits **outside**, above the row, same H2 size, with `gap: '4'` to the cards below.

Two-up rows use **`minmax(0, 1fr)`** columns, `gap: '6'`:

```ts
const pairGrid = css({ display: 'grid', gridTemplateColumns: { base: 'minmax(0, 1fr)', xl: 'repeat(2, minmax(0, 1fr))' }, gap: '6' })
```

> ⚠️ **Not a bare `1fr`.** `1fr` is shorthand for `minmax(auto, 1fr)`, so a card whose
> content has a large min-content width (any table) pushes its column past half and the
> pair renders lopsided — measured at 624px vs 589px before this fix. `minmax(0, 1fr)`
> lets the column shrink below its content and the halves stay equal (495.5px each).
> This applies to every side-by-side dashboard row, charts included.

A card's heading block is the title with its total/description line **directly under it,
no gap** — one unit, not two stacked items:

```ts
const sectionHeader = css({ display: 'flex', flexDirection: 'column' })
```

All three card types on the Goals dashboard (needs-update, distribution, approval) use
this same gapless header — keep it that way.

### A pair of cards collapses to one full-width card

When a two-up row can have either side empty, don't render an empty half — drop the
empty card and let the survivor span the row:

```ts
const singleGrid = css({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '6' })

const hasCreation = computed(() => creationSubmissions.value.length > 0)
const hasProgress = computed(() => progressSubmissions.value.length > 0)
const showAwaitingApproval = computed(() => hasCreation.value || hasProgress.value)
const approvalGrid = computed(() => (hasCreation.value && hasProgress.value ? pairGrid : singleGrid))
```

```vue
<div v-if="showAwaitingApproval" :class="sectionBlock">
  <span :class="sectionTitle">Awaiting approval</span>
  <div :class="approvalGrid">
    <GoalsDashApprovalTable v-if="hasCreation" … />
    <GoalsDashApprovalTable v-if="hasProgress" … />
  </div>
</div>
```

Both cards empty → the whole section (heading included) is omitted, same reasoning as
time-boxed sections below.

### ⚠️ This does not violate table.md's "no outer border"

[`table.md`](table.md) says a Default table carries **no outer border**, and that stays
true: the border belongs to the **section card**, not to `MpTableContainer`. The table
inside is still a bare Default table — no `tableOuterBorder`, no `colgroup`, no sticky
columns. Do not add a second border around the table itself, and do not use the Custom
table's `tableOuterBorder` here — that one exists to frame a horizontal scroll region.

## Time-boxed sections — absent, not empty

Some sections are only meaningful in part of the cycle. Those are **omitted entirely**
outside their window rather than shown with an empty state — a permanent "nothing to do"
panel trains people to skip that region of the page.

"Needs update" is the case in point: chasing stale goals only matters at the end of a
cycle, so it renders solely in the **final week**, and only when something is actually
stale. Both conditions, gated in the parent:

```ts
const NEEDS_UPDATE_WINDOW_DAYS = 7
const periodEndDate = computed(() =>
  props.isNewInterface ? appliedCycle.value?.endDate : appliedRange.value?.endDate)
const isFinalWeek = computed(() => {
  const end = periodEndDate.value
  if (!end) return false
  return Math.ceil((new Date(end).getTime() - now.value.getTime()) / 86_400_000) <= NEEDS_UPDATE_WINDOW_DAYS
})
const showNeedsUpdate = computed(() => isFinalWeek.value && needsUpdate.value.length > 0)
```

```vue
<GoalsDashNeedsUpdate v-if="showNeedsUpdate" :rows="needsUpdate" />
```

> **Live-code note:** `GoalsDashboard.vue` currently routes this gate through the dev
> scenario flag so a demo can show/hide the section on demand; the product rule above is
> kept beside it as `_productShowNeedsUpdate` and restores as `showNeedsUpdate` when the
> control is removed. See [`dev-scenario-control.md`](dev-scenario-control.md).

- Gate in the **parent**, and let the section component assume it has rows — don't ship a
  dead empty branch inside it.
- Derive the window end from whatever defines the period in the current mode (a cycle's
  `endDate`, or the date range's end when there is no cycle).
- A section's own total line then never needs qualifying: `Total: 10 goals`, not
  `Total: 10 goals not updated` — the heading already says what the list is.

## Empty state — compact, no illustration

[`empty-state.md`](empty-state.md)'s illustration + secondary-button treatment is for a
**page** whose entire collection is empty. A dashboard section is one panel among many,
and an empty section is usually *good news* ("every goal is up to date"), not a dead end
needing a call to action. Stacking 240px illustrations in four sections would also bury
the sections that do have data.

So inside a dashboard card, an empty section renders a centered **title + caption only**:

```vue
<MpFlex v-if="rows.length === 0" direction="column" align="center" gap="1" :class="emptyWrap">
  <MpText :class="emptyTitle">Every goal is up to date</MpText>
  <MpText size="label" :class="captionText">Goals with no progress update in the last 30 days will appear here.</MpText>
</MpFlex>
```

```ts
const emptyWrap  = css({ paddingBlock: '10', textAlign: 'center' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', color: 'text.default' })
```

- **No illustration, no action button.** The section keeps its own heading and total line
  above, so the user still knows which panel is empty.
- Title states the *condition* in plain words; caption says what would appear here.
- Precedent: `DashCycleOverview.vue`'s "No data to display yet" block, which predates this.
- The section card, its heading, and the filter bar all stay put — only the table body is
  replaced. (A list **page** still follows `empty-state.md` in full.)

## Freshness + refresh row

A dashboard shows a snapshot, so it must say how old the snapshot is and let the user
re-take it. One row under the filter bar, `justify: space-between`:

- **Left** — date heading (16px/600/lh24) + a status caption beneath it. The caption is
  `text.danger` when it carries urgency (days remaining in a cycle).
- **Right** — `Last updated: {relative}` as a `text.secondary` label, then a **Refresh**
  text button (`text.link`, `MpIcon name="refresh"` — *not* `reload`, which is not a
  Pixel icon name).

Refresh must genuinely re-derive the page. Hold `now` as a ref, drive every relative
label and countdown from it, and re-stamp it on click — a Refresh that only fires a toast
is a lie:

```ts
const now = ref(new Date())
const lastRefreshedAt = ref(new Date())
onMounted(() => { ticker = setInterval(() => { now.value = new Date() }, 60_000) })

function refresh() {
  now.value = new Date()
  lastRefreshedAt.value = new Date()
  toast.notify({ /* … */ variant: 'success', title: 'Dashboard refreshed' })
}
```

> `toast.notify`'s `variant` only accepts `'success' | 'error' | 'greeting'`.
> `'information'` type-errors and falls back at runtime — three pre-existing call sites
> still pass it; don't copy them.

The 60s ticker also keeps "N mins ago" honest without a user action. Always clear it in
`onUnmounted`.

## A dashboard card that mirrors another surface shares its logic

A dashboard panel is almost always a *summary of a page that already exists*. When both
show the same records, the filtering and bucketing rules must live in **one exported
function**, called by both — never re-derived per component, which is how the two
silently drift apart.

The Goals dashboard's approval cards and the goal-cycle **Awaiting approval** tab both
read `useGoalApprovalsStore`, so that store owns the rules:

```ts
// composables/useGoalApprovalsStore.ts — the single source of truth
export type SubmissionTypeLabel = 'Goal creation' | 'Goal progress update' | 'Goal update'
export function submissionTypeLabel(submission: Pick<Submission, 'items'>): SubmissionTypeLabel { … }
export function isAwaitingApproval(submission: Pick<Submission, 'status'>): boolean {
  return submission.status !== 'approved'
}
```

`GoalApprovalQueue.vue` and `useGoalsDashboard.ts` both import these. This is not
theoretical: the queue's own local copy could never return `'Goal progress update'`
(so that filter option matched nothing), while the dashboard's copy fell back to
`'creation'` — which filed every edit/close/delete batch under **Goal creation** and
inflated that card from 13 to 21.

**Drilling down works the same way**: a dashboard figure links to the source page with
that page's own filter pre-applied via a query param, rather than dumping the user on an
unfiltered list. The dashboard maps its own state to the destination's existing filter
keys; the destination validates the param and ignores unknown values. Worked example in
[`stat-card.md`](stat-card.md).

- Put the rule in the **store** that owns the records, not in either component.
- A category that no dashboard card represents (here `'Goal update'`) simply appears in
  neither card — that is correct, not a gap to paper over with a fallback bucket.

## Filter bar

Same left-filters / right-search shape as [`filter-bar.md`](filter-bar.md), but a
dashboard filter is usually **apply-on-demand**, not reactive: hold `selected*` and
`applied*` refs and copy across only in `applyFilter()`, so a heavy multi-section
re-derive happens once rather than per keystroke. Every section reads the `applied*`
scope.

## Rules

- Section = white card, `border.default`, `radius lg`, 24px padding; own heading inside,
  multi-card heading outside.
- A section that only matters in part of the cycle is omitted outside its window (gated
  in the parent), never shown as a permanent empty panel.
- Card heading = title + total/description with **no gap**.
- Side-by-side rows use `minmax(0, 1fr)` columns, never a bare `1fr`.
- A two-up row with one empty side renders one full-width card, not an empty half; both
  sides empty → omit the whole section.
- A card mirroring another surface imports that surface's filter/bucket rules from the
  owning store; never re-derive them locally.
- The card owns the border — the table inside stays a borderless Default table.
- Empty section = centered title + caption, no illustration, no button.
- Always pair a snapshot with "Last updated" + a Refresh that re-derives from a `now` ref.
- Filters apply on Apply, not reactively.
