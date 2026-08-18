# Stat card (tinted summary card)

The tinted "headline number" card used on the Goals dashboard — On track / Off track /
Not started. Source: Figma Dashboard v2.0 node `2641:46007`. Implementation:
`components/GoalsDashSummaryCards.vue`.

Not to be confused with the **Performance review** dashboard's KPI strip
(`pages/dashboard.vue`, `kpiCell`) — that's a row of untinted label+value cells inside
one bordered card. Reach for a stat card only when each figure carries its own
status tone and its own breakdown.

## Anatomy

```
┌─ tinted surface + matching border, radius lg, padding 24px, gap 12px ─┐
│  Title (H2 20/32, text.default)                    [newtab 24px box]  │
│  1400  ▼40%          ← 40px/44, tracking -0.8, tabular-nums           │
│        vs. last cycle                                                 │
│  90% out of 900 employees      (14px REGULAR, text.default)           │
│ ─────────────────────────────  border-bottom, muted tint, pb 12px     │
│  Company                  90   ← label 14/20, value 14/20 semibold    │
│  Organization            310      each row pb 8px, last row pb 0      │
│  Teams                   400                                          │
│  Individual              500                                          │
└───────────────────────────────────────────────────────────────────────┘
```

The header block (title → figure → coverage line) is one `border-bottom` group; the
breakdown list sits under it. **No divider between breakdown rows.**

## The three tones

| Tone | Surface | Border | Divider | Figure | Breakdown label **+ value** |
|------|---------|--------|---------|--------|----------------------------|
| Positive (On track) | `green.50` | `green.400` | `#B4CCB8` | `green.700` | `#405244` |
| Warning (Off track) | `orange.50` | `orange.400` | `#D9D1B8` | `orange.700` | `#61533F` |
| Neutral (Not started) | `gray.25` | `border.default` | `gray.100` | `text.default` | `gray.600` label / `text.default` value |

**The divider is a muted tint of the card — NOT its border colour.** The border is
full-strength because it bounds the card from the outside; the same weight running
through the middle chops the card in two. Per tone, with `paddingBottom: '3'` (12px,
spacing/sm — not 8px):

```ts
const headerListBase = { display: 'flex', flexDirection: 'column', gap: '2', paddingBottom: '3', borderBottom: '1px solid' } as const
const headerListGreen  = css({ ...headerListBase, borderBottomColor: '#B4CCB8' })
const headerListOrange = css({ ...headerListBase, borderBottomColor: '#D9D1B8' })
const headerListGray   = css({ ...headerListBase, borderBottomColor: 'gray.100' })
```

On the **tinted** cards the breakdown label and its value share one desaturated ink —
only the weight differs (regular vs semibold). Only the neutral card splits them
(`gray.600` label, `text.default` value).

The **coverage line** ("90% out of 900 employees") is plain body text on every card —
**regular weight, `text.default`**, never semibold or tone-tinted. It sits directly under
a 40px figure and must not compete with it.

> ⚠️ **Sanctioned raw-hex exception.** `#B4CCB8`, `#D9D1B8`, `#405244` and `#61533F` are
> specified values with no DT 2.4 equivalent. Everything that *does* map to a token uses
> one — `gray.100` (#D0D6DD) and `gray.600` (#626B79) are exact matches, so prefer them
> over re-typing the hex. Check for an exact token before adding a literal, and delete
> these if the tints ever land in the token set.
>
> **Heads up:** this Figma file's palette is a different generation from the app's DT 2.4
> runtime — Figma `green.400` #68BE79 vs runtime #7DC7A8, `green.700` #3C914D vs
> #1C8459, `red.400` #DA473F vs #EA7A72. Don't assume a Figma token name maps to the
> same value at runtime; verify with `getComputedStyle` before swapping a literal for a
> token.

## Delta ("vs. last cycle")

Two stacked lines, right of the figure, bottom-aligned with it:

- **caret + percentage** — 12px semibold, `caret-up` / `caret-down` by the sign of the change.
- **"vs. last cycle"** — 12px regular, `text.secondary`.

**The delta is purely directional — higher than last cycle is green, lower is red, on
every card.** It reports which way the number moved; it does not judge whether that
movement is good for the bucket. Off track rising therefore reads *green*, and that is
intended: one consistent reading rule across three cards beats three per-card meanings.

```ts
function isUp(deltaPct: number) { return deltaPct >= 0 }
```

Colour both the caret and the percentage with the **semantic** pair — `text.success`
(#186F4A) and `text.danger` (#A8352D). Do **not** reach for the end of the raw scale
(`green.1000` #0B3524 / `red.1000` #0B3524-dark): at 12px those read as near-black and
lose the success/danger signal entirely.

```ts
const deltaUp = css({ ...deltaBase, color: 'text.success' })
const deltaDown = css({ ...deltaBase, color: 'text.danger' })
```

`MpIcon` needs the same value on its own `color` prop (`color="text.success"`) — a class
won't override its inline `--mp-icon-color`. See [`icons.md`](icons.md).

**When there is no baseline, render nothing** — no caret, no "0%". `deltaPct` is
`number | null`, and the whole delta block is `v-if="deltaPct !== null"`. A fabricated
0% reads as "no change measured", which is a different (and false) claim.

## The `newtab` affordance — colour and destination

`MpIcon name="newtab"` at **`color="gray.600"`**, set via the component's own `color`
prop, never a wrapping class ([`icons.md`](icons.md)). Not `icon.secondary` — the card
sits on a tinted surface where the icon should read as the same ink as its own
breakdown labels.

**It opens the source list already filtered to that card's status** — a summary figure
should hand you the rows behind it, not a generic list you then have to filter yourself.
Map each card to the destination's existing filter key and pass it as a query param:

```ts
// keys must match STATUS_FILTER_TO_GOAL_STATUS on the destination page
const STATUS_TO_FILTER_KEY: Record<GoalStatus, string> = { green: 'ontrack', orange: 'atrisk', gray: 'notstarted' }
function openStatus(status: GoalStatus) { goToGoalsIndex(STATUS_TO_FILTER_KEY[status]) }
```

The destination initialises its filter from the query and **ignores unknown values**
rather than filtering everything away:

```ts
const STATUS_FILTER_KEYS = ['ontrack', 'atrisk', 'notstarted']
const statusFilter = ref(STATUS_FILTER_KEYS.includes(route.query.status as string) ? (route.query.status as string) : '')
```

> If a card has no corresponding filter on the destination, **add the filter** — don't
> drop the card's status on the floor and land on an unfiltered list. The Goals dashboard
> needed `notstarted` added to the goal-cycle detail page for exactly this reason.

## Related: dashboard triage tables opt out of newest-first

[`table.md`](table.md)'s default order rule is **newest-first**. The Goals dashboard's
**Needs update** table (`components/GoalsDashNeedsUpdate.vue`) deliberately defaults to
**most stale first** instead: it is a triage worklist, not a record list, so the row
most overdue for attention must lead. Nothing is ever "created" into this table, so the
rule newest-first exists to protect (a new record must not land at the bottom) does not
apply.

A manual `PxColumnSortMenu` sort on Last updated still overrides the default, exactly as
in every other table:

```ts
const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows   // rows arrive most-stale-first
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => (a.updatedAt.getTime() - b.updatedAt.getTime()) * dir)
})
```

If you add another dashboard worklist ordered by urgency, document it here rather than
silently diverging from `table.md`.

## Rules

- Tinted surface + matching border + `borderRadius: 'lg'` + 24px padding; never a plain
  white card for a status figure.
- Figure = 40px/44, `letterSpacing: '-0.8px'`, `fontVariantNumeric: 'tabular-nums'`.
- Header block carries the `border-bottom` in a **muted tint** (never the card's border
  colour), `paddingBottom: '3'`; breakdown rows carry none.
- Coverage line = regular weight, `text.default`, on every tone.
- `newtab` icon = `gray.600`, and it opens the source list pre-filtered to that card's
  status (add the filter on the destination if it's missing).
- Tinted cards: breakdown label and value share one ink; only the neutral card splits them.
- Delta colour = direction only: up → `text.success`, down → `text.danger`, on every
  card. No baseline → omit the delta entirely.
- Equal-width cards in a `grid` (`repeat(3, 1fr)` at `lg`, single column below).
