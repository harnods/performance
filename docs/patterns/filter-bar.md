# Filter bar

The row above a table. One `MpFlex align="center" justify="space-between"`: **left cluster = filters, right cluster = search** (+ optional column-settings / export on detail tables).

## Canonical shape

Simple pages (goal-cycles, review-cycles, competencies, goal-categories) — `pages/reviews/review-cycles/index.vue:225`:

```vue
<MpFlex align="center" justify="space-between" gap="4">
  <!-- left: filter(s) -->
  <MpPopover ...> … </MpPopover>

  <MpFlex align="center" gap="4">
    <MpFlex :class="css({ width: '280px' })">
      <MpInputGroup>
        <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
        <MpInput v-model="search" placeholder="Search cycle name..." />
      </MpInputGroup>
    </MpFlex>
  </MpFlex>
</MpFlex>
```

Many-filter pages add `wrap="wrap"` and nest a left `MpFlex gap="3"` cluster (talent-directory `:240`), which can hold `PxSelectPopover` filters + an `All filters (n)` button (`variant="secondary" left-icon="filter"`) that opens a draft/apply/cancel/reset modal, + a `Clear` ghost button.

## Search input

⚠️ **Recurring bug: the search icon overlapping the placeholder text.** There are TWO
correct idioms depending on context. Pick by whether you want the addon box.

### A. Filter-bar search (list pages) — `MpInputGroup` + left addon

The addon has a background and **reserves its own width**, so the input text never
overlaps the icon. Wrap in a width-pinned `MpFlex`:

```vue
<MpFlex :class="css({ width: '280px' })">
  <MpInputGroup>
    <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
    <MpInput v-model="search" placeholder="Search cycle name..." />
  </MpInputGroup>
</MpFlex>
```

### B. In-popover / panel search (borderless, no addon box) — relative wrapper + absolute icon

When the search sits inside a popover/panel and you want a clean borderless look (icon
floating inside the field), use the repo's canonical wrapper. This is the pattern in
`DashNestedFilter`, `DashMultiSelectSearch`, `PxSelectPopover`, `SelectEmployeesDrawer`,
`PxAllFiltersDrawer`, `PxFilterScope`:

```ts
const searchBox  = css({ position: 'relative', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'icon.secondary', zIndex: '1', pointerEvents: 'none' })
```
```vue
<div :class="searchBox">
  <MpIcon name="search" size="sm" :class="searchIcon" />
  <MpInput v-model="search" placeholder="Search" />
</div>
```

The `paddingLeft: 36px` on the input is what offsets the text past the absolutely-positioned
icon. **Both parts are mandatory** — the wrapper's `& input { paddingLeft: '36px' }` AND the
absolute icon. Omitting the padding is exactly what causes the overlap.

### 🚫 Never: `MpInputLeftAddon :with-background="false"`

```vue
<!-- BROKEN — placeholder overlaps the icon -->
<MpInputGroup>
  <MpInputLeftAddon :with-background="false"><MpIcon name="search" size="sm" /></MpInputLeftAddon>
  <MpInput v-model="search" placeholder="Search" />
</MpInputGroup>
```

With `:with-background="false"` the addon stops reserving width, so the input keeps no left
padding and the placeholder renders on top of the icon. If you want the no-box look, use
**idiom B**, not this. (Fixed in `PxAllFiltersDrawer.vue` and `PxFilterScope.vue`.)

### Notes

- No debounce anywhere — `v-model="search"` filters synchronously in a `computed`.
- Placeholder is context-specific ("Search cycle name…", "Search category name…", …).
- Clearable variant (only `pending-actions/index.vue:204-210`) adds `MpInputRightAddon` with a `close` icon → `@click="search = ''"`.

## Filter dropdown

Dominant pattern = a **decorative `MpSelect` wrapped in `MpPopover`** — the native select is suppressed (`tabindex="-1" aria-hidden="true"`, `& select { pointer-events: none }`) and the real choice happens in an `MpPopoverList`/`MpPopoverListItem` (`pages/reviews/review-cycles/index.vue:226-254`). The trigger width class pins the width, e.g. `css({ width: '220px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })`.

> `talent-directory` instead uses `PxSelectPopover` for its filters, which matches the CLAUDE.md dropdown rule. **Prefer `PxSelectPopover`** for new filters; the decorative-`MpSelect` pattern is legacy but widespread.

Multi-select filters use the same trigger with an `MpCheckbox` list inside the popover (label reads `Organization (n)`). Nested/dashboard-only helpers `DashNestedFilter` / `DashMultiSelectSearch` exist but are used only on the dashboard, not on list pages.

## Reactive filtering

Filters feed a `computed` that filters the source array; search is case-insensitive `.includes`. Always reset the page on filter change:

```ts
watch([...filters, search], () => { currentPage.value = 1 })
```

## Right-cluster icon buttons — column settings & export (MUST have a tooltip)

The right cluster holds two icon-only ghost buttons before the search input, in order
**column settings → export → search**. Both are icon-only, so both **must be wrapped in an
`MpTooltip`** (an `aria-label` alone is not enough — the user needs a visible tooltip on
hover). `use-portal` so the tooltip escapes the table's overflow clip:

```vue
<MpTooltip label="Column settings" use-portal>
  <MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" />
</MpTooltip>
<MpTooltip label="Export" use-portal>
  <MpButton variant="ghost" left-icon="upload" aria-label="Export" />
</MpTooltip>
```

> ⚠️ **Current divergence:** the goal-cycle-detail pages render these buttons with `aria-label`
> but **no `MpTooltip`** (`goal-cycles/[id]/{index,team-goals,company-goals,organization-goals,individual-goals}.vue`).
> Wrap them in `MpTooltip` — this is a required rule for icon-only buttons here.

## Export

**Not on the 6 top-level list pages.** Export exists only on goal-cycle **detail** sub-pages, as an icon-only ghost button in the right cluster (order: column-settings → export → search) — `pages/goals/goal-cycles/[id]/team-goals.vue:535-561`:

```vue
<MpButton variant="ghost" left-icon="upload" aria-label="Export" />
```

Export is **never** in the page title/header — primary CTAs go through `#page-header-actions` (see [`header-bar.md`](header-bar.md)).

## Rules

- Layout: `MpFlex justify="space-between"` — filters left, search right.
- New dropdown filters → `PxSelectPopover`.
- Reset `currentPage` to 1 on any filter/search change.
- Export (when present) = `variant="ghost" left-icon="upload"`, icon-only, right cluster — not the header.
- Column-settings & export icon buttons **must** be wrapped in `MpTooltip` (`use-portal`).

## Known inconsistencies (don't propagate)

- Search width varies 200/224/260/280px; filter trigger width 160–240px — no shared constant.
- `pending-actions` uses a bespoke `css()` `filterRow` instead of `MpFlex justify="space-between"`.
- Filter dropdown split between decorative `MpSelect` (most) and `PxSelectPopover` (talent-directory).
