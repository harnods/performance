# Status badges

`MpBadge` for status pills. ⚠️ Two APIs coexist — **prefer API 1** (`for="tableStatus"` + `type=`) for new work.

## API 1 — `for="tableStatus"` + `type=` (dominant)

Map status → badge type in a `Record`, then bind:

```ts
const statusBadgeType: Record<GoalCycleStatus, 'completed' | 'announcement'> = {
  Active: 'completed',
  Inactive: 'announcement',
}
```

`type` values in use:

| `type` | Meaning / usage |
|---|---|
| `completed` | Active / done / positive |
| `announcement` | Inactive / Draft / neutral tag (Draft pills use `type="announcement" size="sm"`) |
| `warning` | "Extended" pills; **"Awaiting approval"** (a pending decision is neither settled-good nor settled-bad) |
| `success` | 9-box / positive extended tag |
| `critical` | "New" feature flags — always `size="sm"` |

## Tiered percentage pill (e.g. AI "Match score")

When a numeric percentage itself carries a quality verdict (good/middling/poor —
distinct from [`stat-card.md`](stat-card.md)'s delta rule, which explicitly avoids
colouring magnitude *changes* as good/bad), tier it through the same API 1 `type`s,
reusing the donut-chart tiering thresholds ([`donut-chart.md`](donut-chart.md)) so a
score reads the same colour everywhere it appears:

```ts
function scoreType(score: number): 'completed' | 'warning' | 'critical' {
  if (score >= 70) return 'completed'   // healthy — same threshold as the donut's lime
  if (score >= 40) return 'warning'     // middling — donut's amber
  return 'critical'                     // poor — donut's red
}
```

```vue
<MpBadge for="tableStatus" :type="scoreType(row.matchScore)" @click="openDetails(row)">
  {{ row.matchScore }}%
</MpBadge>
```

Reference: Talent directory's pool "Match score" column
(`pages/talents/talent-directory/index.vue`) — an Airene AI score of how well a
talent fits a custom pool's criteria (`utils/matchScore.ts`), clickable to open
`components/PxMatchScoreDrawer.vue`'s score breakdown. The badge itself needs no
extra affordance beyond `cursor: pointer` — a coloured pill next to plain table
text already reads as interactive.

## Coverage badge (grey → green, with a leading icon)

A read-only "is this covered yet?" pill — `announcement` until the thing is
satisfied, then `completed`, with an `indicator-circle` → filled `done` icon in
the default slot. Used for the talent-pool prompt's criteria coverage; the full
pattern (including why the icon can't be a prop) is in
[`ai-prompt-builder.md`](ai-prompt-builder.md#coverage-badges--grey-until-the-prompt-mentions-it).

## API 2 — `variant="tableStatus"` + `:variantColor=` + `size="md"`

Used only in `pages/reviews/review-cycles/[id]/index.vue` with colour maps like `{ Completed: 'completed', 'In progress': 'information', Upcoming: 'announcement', Expired: 'warning' }`. Don't spread this API to new pages.

## Goal lifecycle badges (goal tables)

A goal row carries at most one lifecycle badge, in this precedence:

```vue
<MpBadge v-if="row.isAwaitingApproval" for="tableStatus" type="warning" size="sm">Awaiting approval</MpBadge>
<MpBadge v-else-if="row.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
<MpBadge v-if="row.isClosed" for="tableStatus" type="announcement">Closed</MpBadge>
```

`isAwaitingApproval` wins over `isDraft` because a submitted draft is still a draft
underneath (rejection sends it straight back to plain Draft) — but it must not read as
one, since it offers no draft actions while the decision is pending. Applied identically
across all five goal tables (`goal-cycles/[id]/{index,company,organization,team,individual}-goals.vue`).

## Goal-detail page title badge — default size, not `size="sm"`

The one exception to "Draft badges use `size="sm"`" below: `goal-cycles/[id]/goals/[goalId].vue`'s
own title row (`<span>{{ goal.title }}</span>` + badge) uses default size for its
`Draft` badge — it sits beside a page title (`nameText`, large type), not in a dense
table cell, so `sm` reads too small next to it. Table rows keep `size="sm"`.

```vue
<MpBadge v-if="goal.isDraft" for="tableStatus" type="announcement">Draft</MpBadge>
<span v-else :class="statusClass(goal.status)">{{ STATUS_LABEL[goal.status] }}</span>
```

## Rules

- Draft / "New" badges → `size="sm"` **in a table cell**; default size beside a page
  title (see goal-detail exception above). Table-status badges → default (md).
- Map status → type/colour in a `Record`, never inline per row.
- Prefer API 1 (`for="tableStatus"` + `type`).
