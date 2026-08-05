# Date & timestamp formatting

⚠️ There is **no shared `utils/date.ts`** yet — formatting is re-implemented per file (~10 duplicates). The formats below are consistent; **prefer extracting a shared helper** when you touch this, but at minimum match the exact format for the context.

## Golden rule — format depends on context

| Context | Format | Example |
|---|---|---|
| **Inside a table** | `dd/mm/yyyy, HH:mm` (zero-padded) | `23/06/2026, 15:30` |
| **Non-table** (panels, detail, cards) | `D Mon YYYY, HH:mm` | `23 Jun 2026, 15:30` |
| **Date only** | `DD Mon YYYY` (en-GB) | `23 Jun 2026` |

## Table timestamp — `dd/mm/yyyy, HH:mm`

`pages/goals/goal-categories/index.vue:90-95`:

```ts
function formatModified(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
```

## Non-table timestamp — `D Mon YYYY, HH:mm`

`components/GoalCycleInfoPanel.vue:26-32` (canonical):

```ts
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function formatUpdatedAt(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}
```

## Date only — `DD Mon YYYY` (en-GB)

The most duplicated helper (`utils/talents.ts:101-103`, and 5+ others):

```ts
return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
```

## Numbers (adjacent convention)

Currency / large numbers use Indonesian locale: `n.toLocaleString('id-ID')`.

## Rules

- Table cell → `dd/mm/yyyy, HH:mm`. Everywhere else → `D Mon YYYY[, HH:mm]`.
- Missing value → `'—'` (em dash).
- If you add more than one date format, extract a shared `utils/date.ts` (`formatTableTimestamp` / `formatTimestamp` / `formatDate`) rather than copy-pasting.
