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
| `warning` | "Extended" pills |
| `success` | 9-box / positive extended tag |
| `critical` | "New" feature flags — always `size="sm"` |

## API 2 — `variant="tableStatus"` + `:variantColor=` + `size="md"`

Used only in `pages/reviews/review-cycles/[id]/index.vue` with colour maps like `{ Completed: 'completed', 'In progress': 'information', Upcoming: 'announcement', Expired: 'warning' }`. Don't spread this API to new pages.

## Rules

- Draft / "New" badges → `size="sm"`. Table-status badges → default (md).
- Map status → type/colour in a `Record`, never inline per row.
- Prefer API 1 (`for="tableStatus"` + `type`).
