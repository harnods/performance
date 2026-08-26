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
const approvalGrid = computed(() => (hasA.value && hasB.value ? pairGrid : singleGrid))
```

Every card in the row empty → the whole section (heading included) is omitted, same
reasoning as time-boxed sections below.

### …but a row of TABLE cards goes full-width once the tables get wide

Two-up is a budget of ~526px of table per card at 1440px. That fits identity + date +
action, and nothing wider. **Awaiting approval** outgrew it: its two per-goal cards carry
a goal title *and* an owner *and* a date *and* an action, and 4 columns do not fit.

> ⚠️ **This was tried, measured, and reverted — don't re-litigate it from a mockup.**
> Building the 2-up produced **857px of table in a 526px card**. Every fix made it worse
> somewhere else:
>
> | Attempt | Result |
> |---|---|
> | as-is | 857px — "View details" off-screen |
> | let title + meta wrap | 677px, rows grew 55px → **97px** (3-line titles) |
> | also drop avatar + job-title line | 544px — *still* 18px over |
> | floor the Goal column at `minWidth: 260px` | 801px, and the action cell rendered at x=1526 against a container edge of 1391 with `scrollWidth === clientWidth`, i.e. **clipped and unreachable even by scrolling** |
>
> The furniture alone is fixed: Date 110px + action button 140px = 250px, leaving 276px to
> share between a free-text title and a person. There is no setting that fits.

So the section stacks full-width cards (`singleGrid` for all three) instead — where each
table measures 1125px into a 1125px container, no overflow, action always visible:

```vue
<div v-if="showAwaitingApproval" :class="sectionBlock">
  <span :class="sectionTitle">Awaiting approval</span>
  <div :class="singleGrid">
    <GoalsDashApprovalTable v-if="creationRows.length" title="Goal creation"        unit="employee" :rows="creationRows" @open="openApprovalRow" />
    <GoalsDashApprovalTable v-if="progressRows.length" title="Goal progress update" unit="goal"     :rows="progressRows" @open="openApprovalRow" />
    <GoalsDashApprovalTable v-if="editRows.length"     title="Goal edit"            unit="goal"     :rows="editRows"     @open="openApprovalRow" />
  </div>
</div>
```

Full-width doesn't make the section taller, because each card's table is height-capped
and scrolls — see the progressive-pagination section in
[`pagination.md`](pagination.md). The donut pair, whose cards hold charts rather than
tables, stays two-up.

**Every table in a dashboard section uses that treatment**, not just these three:
"Needs progress update" does too. A dashboard has no single "the" table, so none of them
may own the page's vertical space — a paged 52px footer on one card while another grows
freely reads as two different components.

Rule of thumb: **≥3 columns in the card's table, or a free-text column (a goal/record
title), → full width.** Identity + date + action still fits a half.

### Per-record vs per-person rows in a summary card

A card that lists things awaiting a decision must be granular at whatever level the
decision is actually made — otherwise rows either offer a choice nobody can make, or
hide records behind the first one for that person.

| Card | Row = | Why |
|---|---|---|
| Goal creation | one **employee** (all their batches) | A create bundle's weights only sum to 100% together, so it is approved or rejected as one unit. Splitting it per goal would offer a per-goal decision the store can't honour. |
| Goal progress update | one **goal** | Independent single changes. One employee can have several in flight; per-employee rows would show only the first. |
| Goal edit | one **goal** | Same. |

### A per-person row is per PERSON — one name, one row

A person can send up several batches. The employee card still shows them **once**: a
repeated name reads as a duplicated row, not as two requests, and the card's question is
"who is waiting on me". `approvalEmployeeRows()` groups by `ownerId` and:

- **sums** `items.length` across their batches into `goalCount`;
- takes the **most recent** `submittedAt` as the row's date, then re-sorts newest-first
  (grouping loses the caller's ordering, and [`table.md`](table.md)'s default order rule
  still applies);
- keeps **every** batch id in `submissionIds`.

**The row discloses when it aggregates.** A summed figure beside a single date otherwise
reads as one request, so a merged row adds a `text.secondary` caption under the count:

```
Goals requested
             9
across 2 requests
```

Never merge rows without surfacing the merge — that's the difference between summarising
and hiding.

**On a per-goal card the goal title is a link**, styled with [`table.md`](table.md)'s
canonical plain-`<span>` name cell (`text.link`, underline on hover — not `MpTextlink`,
which brings button padding). It opens the same request the row's "View details" does, so
the row has two routes to one destination: the title for someone scanning goals, the
button for someone working the queue top-to-bottom. The employee cards' first column is a
person, not a record, so it stays plain text.

**A per-person row states how much it stands for.** One Goal creation row hides whole
batches, so it carries a **Goals requested** column — numeric, therefore right-aligned +
`tabular-nums` + `width: '1%'` per [`table.md`](table.md). The per-goal cards don't get
it: there it would read `1` on every row. That keeps both variants at four columns, so
the bulk bar's `colspan` is a constant rather than a per-unit branch.

Both shapes normalise to one `ApprovalRow` before they reach the table
(`useGoalsDashboard.ts` — `approvalEmployeeRows()` / `approvalGoalRows()`), and the table
switches on a `unit: 'employee' | 'goal'` prop: `'goal'` adds the leading Goal column, and
each unit re-nouns every count ("Total: 8 goals" / "Total: 13 employees", "1 goal
selected" / "1 employee selected"). Two components would have drifted; two row-builders
and one table do not.

### One row → many submissions: approving and opening

`ApprovalRow.submissionIds` is **always an array** (1+), never a single id — an employee
row can cover several batches, and several goal rows can point at one. So:

**Bulk approve flattens, then de-duplicates**, or a shared batch commits twice. The toast
counts *submissions*, since that is what actually happened — selection is by row, but
approval is by batch:

```ts
const submissionIds = new Set(props.rows.filter(r => selected.value.has(r.id)).flatMap(r => r.submissionIds))
submissionIds.forEach(id => approveSubmission(id))
```

**"View details" branches on the count.** One batch → its review page. Several → there is
no single page to open, so hand off to the source queue with that employee and type
pre-applied, which lists each batch with its own action (the drill-down rule above):

```ts
function openApprovalRow(row: ApprovalRow) {
  if (row.submissionIds.length > 1) return goToApprovalQueue(row.ownerId)
  openSubmission(row.submissionIds[0])
}
// → /goals/goal-cycles/{id}?name=…&tab=awaiting&q={employee name}&type=Goal creation
```

`GoalApprovalQueue.vue` initialises `search` from `?q` and `typeFilter` from `?type`
(ignoring an unknown `type` rather than filtering everything away); the cycle page already
reads `?tab`. Opening the newest batch and silently dropping the rest is the tempting
shortcut — don't: the row promised N requests and would deliver one.

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
export type SubmissionTypeLabel = 'Goal creation' | 'Goal progress update' | 'Goal edit'
export function submissionTypeLabel(submission: Pick<Submission, 'items'>): SubmissionTypeLabel { … }
export function isAwaitingApproval(submission: Pick<Submission, 'status'>): boolean {
  return submission.status !== 'approved'
}
```

These three strings are **user-visible on four surfaces** — the dashboard's card titles,
`GoalApprovalQueue.vue`'s and `pages/inbox/awaiting-approval/goals.vue`'s `TYPE_OPTIONS`
filters, and `GoalSubmissionReview.vue`'s `requestTitle`. Renaming one means renaming the
union and all four call sites in the same change; a card titled differently from the
filter option that selects it reads as two different things.

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
- All three categories now have a card, so nothing classifies into a bucket the dashboard
  drops. If you add a fourth category, either give it a card or leave it out of every
  card deliberately — never paper over it with a fallback bucket, which is how
  "Goal creation" once inflated from 13 to 21.

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
- A two-up row with one empty side renders one full-width card, not an empty half; every
  card empty → omit the whole section.
- A row of table cards goes full-width once a table needs ≥3 columns or carries a
  free-text title column; chart cards stay two-up.
- A decision card's row granularity matches the granularity of the decision — per goal
  when goals are decided one at a time, per employee when a batch is decided as a unit.
- A per-person row appears **once** per person, summing across their submissions, and says
  so ("across N requests") whenever it merged more than one.
- `submissionIds` is always an array: bulk approve flattens + de-duplicates, and a
  multi-batch row's action drills into the filtered source list rather than opening one
  batch and dropping the rest.
- A card mirroring another surface imports that surface's filter/bucket rules from the
  owning store; never re-derive them locally.
- The card owns the border — the table inside stays a borderless Default table.
- Empty section = centered title + caption, no illustration, no button.
- Always pair a snapshot with "Last updated" + a Refresh that re-derives from a `now` ref.
- Filters apply on Apply, not reactively.
- Every table in a section: progressive "Load more" into a `maxHeight: 400px`
  `MpTableContainer` with `<MpTableHead is-fixed>` — never a paged 52px footer.
