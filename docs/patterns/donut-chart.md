# Donut chart card

A single share-of-total figure drawn as a ring with the percentage in its hole. Source:
Figma Dashboard v2.0 nodes `2641:59407` / `2641:59408`. Implementation:
`components/GoalsDashDonutCard.vue`, used twice on the Goals dashboard (Assigned
employees, Goals aligned).

Use it for **one** proportion of a whole. For a multi-series comparison across
categories use the stacked bar (`components/DashCycleOverview.vue`) instead — a donut
with more than two slices is not a pattern in this repo.

## Use `MpChart type="doughnut"` — do not hand-roll SVG

`@mekari/pixel3-chart` bundles `chart.js/auto`, so the doughnut controller is
registered and `type="doughnut"` works. It defaults to `cutout: '65%'`; options are
merged with lodash `merge`, so any override you pass wins.

### Mirror the Pixel docs' "Progress" doughnut

The upstream progress example (docs.mekari.design → Chart → Doughnut Chart → Progress)
puts `cutout` on the **dataset**, gives a two-entry `backgroundColor`, and sets nothing
else:

```ts
datasets: [{
  cutout: '82%',
  data: [percent, 100 - percent],
  backgroundColor: [arcColor, '#D0D6DD'],
}]
```

**Do not set `borderWidth: 0`.** Chart.js's default 2px white arc border is exactly what
draws the small **gap between the coloured arc and the grey remainder** — zeroing it
fuses the two arcs into one continuous ring. Verified against the upstream example: the
pixel at the arc boundary is pure white.

```vue
<MpChart
  :id="id"
  type="doughnut"
  height-chart="240px"
  width-chart="240px"
  :data="chartData"
  :options="chartOptions"
  :is-show-legend="false"
  :is-show-tooltip="false"
/>
```

```ts
const chartOptions = computed(() => ({
  cutout: '82%',                          // 240px outer + 22px ring = 196px hole
  hover: { mode: 'nearest', intersect: true },   // ← see the trap below
  plugins: { datalabels: { display: false } },
  onHover: (event, elements) => {
    const target = event?.native?.target
    if (target) target.style.cursor = elements.length ? 'pointer' : 'default'
  },
  onClick: (_e, elements) => {
    if (!elements.length) return
    emit('segment-click', elements[0].index === 0 ? 'filled' : 'remainder')
  },
}))
```

- **`:is-show-legend="false"` is required.** The centre label plus the hover popover
  already carry every number; a legend for a two-slice "value vs. remainder" ring is
  noise. Chart.js's own legend is off in the recipe already — `isShowLegend` controls
  Pixel's separate **HTML** legend, which is on by default.
- **Leave the tooltip ON** (don't pass `:is-show-tooltip="false"`) — it is what renders
  the hover popover, via the `#tooltip` slot.
- Ring thickness comes from `cutout`, not from border width.
- Options are merged `merge(basicOptions, props.options)`, so anything you pass wins.

### 🚨 Trap 1 — `hover: { mode: null }` silently kills every segment callback

MpChart's base options hard-set `hover: { mode: null }`. Chart.js's
`_getActiveElements()` resolves `Interaction.modes[null]` → `undefined` → **always an
empty array**, so `onHover`/`onClick` fire with `elements: []` and no segment is ever
identifiable. Clicks appear to do nothing at all.

The tooltip is unaffected because the tooltip plugin runs its **own** hit-test — which
produces the maddening symptom that **hovering shows a popover while clicking is dead**.
Any interactive Pixel chart must restore `hover: { mode: 'nearest', intersect: true }`.

### 🚨 Trap 2 — opening a drawer from a segment click needs `nextTick`

A click that opens a drawer/popover must defer with `nextTick`, or the very same click
is still propagating when the drawer mounts, its outside-click handler sees it, and the
drawer closes instantly:

```ts
if (segment === 'remainder') { nextTick(() => { isDrawerOpen.value = true }) ; return }
```

Same guard `CycleGeneralForm.vue` uses for its Manage button — see
[`page-form.md`](page-form.md).

> Debugging note: `MpDrawer id="drawer-x"` renders its DOM node as **`#modal-drawer-x`**.
> Querying `#drawer-x` finds nothing and looks exactly like "the drawer never opened".

## Hover popover (the `#tooltip` slot)

One rounded pill: segment label, then its **count** in semibold. Resolve the hovered arc
from `dataPoints[0].dataIndex` — never from the rounded percentage:

```vue
<template #tooltip="tooltip">
  <div :class="tip">
    <span :class="tipLabel">{{ tooltipRow(tooltip)?.label }}</span>
    <span :class="tipCount">{{ tooltipRow(tooltip)?.count }}</span>
  </div>
</template>
```

Pass **both** segments' real counts in as props (`filledCount` / `remainderCount`).
Deriving the grey arc's count from `100 - percent` re-introduces rounding error.

> Pixel only writes tooltip data when `tooltipCtx.opacity === 1`, so if the popover shows
> the right label for a segment, the hit-test is genuinely working.

## Clickable segments

Each arc is its own destination — emit a semantic key, never an index, so the parent
decides routing:

- **Assigned employees**: grey → open the unassigned-employees drawer; green → goals index.
- **Goals aligned**: both arcs → the goal-hierarchy tab (`?tab=hierarchy`).

Set `cursor: pointer` from `onHover` whenever `elements.length` — the ring must not look
inert.

## Centre label — overlay, don't fight the canvas

The card body is `position: relative`; the label is absolutely positioned over it with
`pointerEvents: 'none'` so it never eats chart hover.

```ts
const pieBlock = css({ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: '6' })
const chartBox = css({ width: '240px', height: '240px' })
const centreLabel = css({ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' })
```

Value = 40px/40, `letterSpacing: '-0.8px'`, `tabular-nums`, `text.default`.
Caption under it = 14px/20, `text.secondary`.

`MpChart` also exposes a default slot rendered inside its chart container, but pinning
the overlay to your own relative wrapper is what keeps the label centred on the ring
regardless of what the recipe does to its internals.

## Card shell

White surface, `border.default`, `borderRadius: 'lg'`, 24px padding, 24px gap. Header is
an H2 (20px/32, `text.default`) with a `text.secondary` 14px/20 description directly
under it — no gap between the two (they are one `Header list` block in the design).

## Chart colours are hex — the one sanctioned exception

Chart.js paints to a canvas and cannot read a Panda token, so series colours are real
hex values, matching the precedent already set by `DashCycleOverview.vue`:

```ts
const COLOR_LIME  = '#84CC16'   // Figma Chart/$lime-400
const COLOR_AMBER = '#F59E0B'   // Figma Chart/$amber-400
const COLOR_RED   = '#EF4444'   // Chart red, sibling of the two above
const COLOR_TRACK = '#D0D6DD'   // Figma Gray/$gray-100
```

### The arc colour is driven by the VALUE, not by the card

A progress ring re-colours by how healthy its own percentage is — the same card shows
green, amber or red on different data. Never hard-code one colour per card.

```ts
const arcColor = computed(() => {
  if (props.percent >= 70) return COLOR_LIME    // healthy
  if (props.percent >= 40) return COLOR_AMBER   // middling
  return COLOR_RED                              // poor
})
```

At **0%** Chart.js draws no arc at all, so the ring renders grey-only — which is the
correct reading (nothing achieved), not "a little bit red".

This is **only** for values handed to Chart.js. Every surrounding style (card, text,
border) still uses tokens — see [`tokens.md`](tokens.md). Always name the Figma chart
variable in a comment beside the hex.

## Rules

- One proportion → donut; many categories → stacked bar, not a multi-slice donut.
- `MpChart type="doughnut"`, `cutout` on the **dataset**; never hand-rolled SVG rings.
- Never `borderWidth: 0` — the default white arc border is the gap between the arcs.
- Arc colour follows the percentage (≥70 lime / ≥40 amber / else red), not the card.
- Legend off; tooltip **on** (it is the hover popover). Centre label is the headline.
- Interactive rings MUST restore `hover: { mode: 'nearest', intersect: true }`, or every
  `onClick`/`onHover` gets an empty `elements` array.
- Pass each segment's real count as a prop; never derive one from `100 - percent`.
- A segment click that opens a drawer must be wrapped in `nextTick`.
- Overlay the centre label on a `position: relative` wrapper with `pointerEvents: 'none'`.
- Hex is allowed for Chart.js series only, with the Figma variable named in a comment.
