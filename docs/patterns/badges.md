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

## API 2 — `variant="tableStatus"` + `:variantColor=` + `size="md"`

Used only in `pages/reviews/review-cycles/[id]/index.vue` with colour maps like `{ Completed: 'completed', 'In progress': 'information', Upcoming: 'announcement', Expired: 'warning' }`. Don't spread this API to new pages.

## Goal lifecycle badges (goal tables)

A goal row carries at most one lifecycle badge, in this precedence:

```vue
<MpBadge v-if="row.isAwaitingApproval" for="tableStatus" type="warning" size="sm">Awaiting approval</MpBadge>
<MpBadge v-else-if="row.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
<MpBadge v-if="row.isClosed" for="tableStatus" type="announcement">Closed</MpBadge>
```

**No "Progress locked" badge in table rows.** A goal whose parent is closed (progress locked — `utils/goalLock.ts`) gets no row badge; the lock shows as the disabled **Update progress** menu item (tooltip) and on its Detail page (banner). The lock is derived (`useGoalProgressLock().isLocked(id)`), never stored.

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

## Goal Detail › goal name row — "Closed" badge

A closed goal shows `<MpBadge for="tableStatus" type="announcement">Closed</MpBadge>` (default size, like the Draft badge) **right after the status pill**: `Name [Off track] [Closed]`. It stays in the content's name row — it is not teleported into the page header (`#page-title-badge`), which keeps the plain "Goal details" title. Reference: `pages/goals/goal-cycles/[id]/goals/[goalId].vue`.

## Goal Detail › Alignment card — "Closed" tag beside the level pill

The parent's **Closed** tag sits next to the level pill ("Organization goal"), so it is **not** an `MpBadge` (pill-shaped, 14px): it is a plain `<span>` styled like the level pill — `borderRadius: 'sm'`, `12px / 16px`, weight 500, `paddingInline: '2'`, `paddingBlock: '0.5'` — with the neutral gray of the Closed badge (`background.neutral.subtle`, `text.default`). Reference: `badgePill` / `badgePillClosed` in `pages/goals/goal-cycles/[id]/goals/[goalId].vue`.

## Rules

- Draft / "New" badges → `size="sm"` **in a table cell**; default size beside a page
  title (see goal-detail exception above). Table-status badges → default (md).
- Map status → type/colour in a `Record`, never inline per row.
- Prefer API 1 (`for="tableStatus"` + `type`).
