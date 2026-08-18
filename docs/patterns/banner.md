# Banner — `MpBanner`

A page-level informational message sitting above the content it's reporting
on (e.g. above a table's filter bar) — not a toast (ephemeral, corner-
positioned) and not a per-field validation message. Use it for state that's
true for as long as the user is on the page, e.g. "your approved goals are
being created" while a background job runs (`goal-cycles/[id]/index.vue`).

First (and so far only) use in this repo: `pages/goals/goal-cycles/[id]/index.vue`.

## Composition — compound component, flat children

`MpBanner` is a compound component (`@mekari/pixel3-banner`): `MpBannerIcon`,
`MpBannerTitle`, `MpBannerDescription`, `MpBannerLink`, `MpBannerCloseButton`
are all **direct children of `MpBanner`**, not nested inside each other.

```vue
<MpBanner v-if="activeRequestBatch && !isBatchBannerDismissed" variant="info">
  <MpBannerIcon name="info" />
  <MpBannerTitle>Your approved goals are being created</MpBannerTitle>
  <MpBannerDescription>
    Goals for {{ activeRequestBatch.ownerIds.length }} employees are being set up. This may take a few minutes.
    <MpTextlink as="button" @click="refreshPage">Refresh page</MpTextlink>
  </MpBannerDescription>
  <MpBannerCloseButton @click="isBatchBannerDismissed = true" />
</MpBanner>
```

`variant`: `'info' | 'success' | 'danger' | 'warning'`. Dismissal is
caller-managed — `MpBannerCloseButton` only emits `click`; hide the banner
yourself via a local `ref` + `v-if`.

## 🚫 `MpBannerLink` does not work — use `MpTextlink` instead

`MpBannerLink` renders as a plain unstyled `<div>` in this Pixel version:
no color, `cursor: auto`, and **no click wiring at all** (its type doesn't
declare an `onClick`/`click` emit, unlike every other Banner subcomponent).
Verified live: `getComputedStyle` shows default text color and `cursor:
auto`, and a real click never fires the handler.

For an inline action inside `MpBannerDescription` (or anywhere else a
clickable text link is needed), use **`MpTextlink as="button"`** instead —
it's a real, already-proven component elsewhere in this codebase
(`AddGoalDrawer.vue:872`, `GoalMyRequestsList.vue:202`, `DashNestedFilter.vue:95`),
with a genuine `click` emit and correct link styling (brand-blue,
`cursor: pointer`), and it renders inline within running text just fine:

```vue
<MpBannerDescription>
  Goals for {{ n }} employees are being set up. This may take a few minutes.
  <MpTextlink as="button" @click="refreshPage">Refresh page</MpTextlink>
</MpBannerDescription>
```

## Multiple points — bullet list inside `MpBannerDescription`

`MpBannerDescription` has no built-in list affordance. When the banner needs
to call out more than one distinct point (rather than one flowing sentence),
put a plain `<ul>` directly inside it, styled via `css()` — not multiple
`MpBannerDescription`s, and not `<br>`-separated lines:

```vue
<MpBanner variant="info">
  <MpBannerIcon />
  <MpBannerTitle>Switching versions may affect some goals</MpBannerTitle>
  <MpBannerDescription>
    <ul :class="bannerList">
      <li>Goals that were saved as drafts will be hidden in the old UI until you switch back to new UI.</li>
      <li>Goals created or edited in the old UI won't move into a matching cycle you already created in the new UI even if the dates fall within that cycle's period.</li>
    </ul>
  </MpBannerDescription>
</MpBanner>
```

```ts
const bannerList = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingLeft: '5', listStyleType: 'disc' })
```

See `pages/goals/goal-settings.vue`.

## No built-in progress affordance

`MpBanner` has no progress-bar prop or slot. Don't bolt an `MpProgress` bar
onto it. If the thing the banner is reporting on has real per-item
progress to show (e.g. some rows done, some still pending), surface that
progress **in the content the banner is describing** instead — see
[`table.md`](table.md)'s "Pending (not-yet-created) rows from a background
job" section, which uses skeleton table cells rather than an aggregate
progress bar in the banner itself.

## Placement

Above the filter bar, inside the same stage `MpFlex direction="column"` as
the rest of the page content — not inside the table's own bordered wrapper,
since it's reporting on the page, not just the table:

```vue
<template v-else>
  <MpBanner v-if="…">…</MpBanner>

  <!-- Filter bar -->
  <MpFlex align="center" justify="space-between" gap="4" wrap="wrap">…</MpFlex>
  …
</template>
```
