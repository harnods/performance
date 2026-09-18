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

### Scrollable scope-picker panel (maxHeight + overflowY)

The scope-picker popover in `PxAllFiltersDrawer` (`Add filter` → search + `MpPopoverList` of
scope names) caps its height so a long scope list doesn't push the panel past the viewport:

```ts
const popPanel = css({ width: '240px', maxHeight: '300px', display: 'flex', flexDirection: 'column', overflowY: 'auto' })
```

`overflowY: 'auto'` on the same element that carries `maxHeight` is mandatory — without it the
list just overflows past the panel border instead of scrolling, clipping the last item(s). The
sticky search header (`position: 'sticky', top: '0'`) stays pinned because it scrolls with this
same container.

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

## Fixed-criteria drawer (vs the "All filters" scope picker)

`PxAllFiltersDrawer`'s "Add filter" popover lists an open-ended, growing set of
scopes. When a feature filters on a **small, fixed, known-in-advance** set of
attributes (e.g. the talent-pool criteria — competency score, performance score,
attendance, education level, years of service —
`components/PxAddPoolDrawer.vue`, opened from
`pages/talents/talent-directory/index.vue`), reuse the *same* add/remove-scope
mechanic (a popover of not-yet-added items → a removable row per added item), just
with the fixed list swapped in for the dynamic one:

> The criteria builder below is the drawer's **"Build" step**. The same drawer
> also has a **"Describe"** step (write the pool as a prompt) in front of it —
> see [`ai-prompt-builder.md`](ai-prompt-builder.md) for the segmented control,
> the prompt→criteria handoff, and the coverage badges. Everything in this
> section describes the Build half.

```vue
<MpDrawer :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="...">
  <MpDrawerContent>
    <MpDrawerHeader>{{ mode === 'create' ? 'Add pool' : 'Edit pool' }}<MpDrawerCloseButton /></MpDrawerHeader>
    <MpDrawerBody>
      <MpFormControl is-required>
        <MpFormLabel>Name</MpFormLabel>  <!-- + a `n / 60` char counter on the label row -->
        <MpInput v-model="name" :maxlength="NAME_MAX" placeholder="Enter pool name" />
      </MpFormControl>

      <!-- scope row: Job position (required) + Branch, two fixed columns -->

      <!-- section header: H2/20px pattern (CLAUDE.md) + one-line caption -->

      <!-- one MpAccordion section per added criterion — see accordion.md -->
      <MpAccordion is-allow-multiple is-allow-toggle>
        <MpAccordionItem v-for="key in addedCriteria" :key="key" is-default-open>
          <!-- header: label + "minus-circular" remove + caret (remove sits
               OUTSIDE MpAccordionHeader so it can't also collapse) -->
          <!-- panel: that criterion's own shape (see below) -->
        </MpAccordionItem>
      </MpAccordion>

      <MpPopover is-close-on-select use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <button type="button" :class="addBtn"><MpIcon name="add" size="sm" />Add criteria</button>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem v-for="d in availableCriteria" :key="d.key" @click="addCriteria(d.key)">{{ d.label }}</MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
    </MpDrawerBody>
    <MpDrawerFooter>
      <!-- Cancel / Save — NOT "Reset all / Cancel / Apply filter". This drawer
           creates/edits a named thing (a pool), it isn't applying a transient
           filter, so it takes the create/edit-drawer footer (docs/patterns/buttons.md),
           not PxAllFiltersDrawer's filter footer. -->
    </MpDrawerFooter>
  </MpDrawerContent>
  <MpDrawerOverlay />
</MpDrawer>
```

Key differences from `PxAllFiltersDrawer`, beyond the fixed item list:

- **The drawer also carries the entity's own fields** — a `name`, plus the pool's
  scope (job position, branch). Creating the tab/entity and defining its criteria
  happen in **one drawer**, never "create empty, configure later". Criteria stay
  optional: a pool scoped to a job position but with zero criteria is still a valid
  pool (it lists everyone in that position), which is why scope *and* criteria both
  feed [tabs.md](tabs.md#-add-tab-user-created-tabs)'s empty-state fallback.
- **`Save` is never disabled** — validate on click, show inline
  `MpFormErrorMessage`s and an error toast
  ([`buttons.md`](buttons.md#no-disabled-primary-cta)).
- **A fixed-width drawer ignores the page's responsive grid.** The scope row is a
  flat `gridTemplateColumns: '1fr 1fr'`, not `{ base: '1fr', lg: '1fr 1fr' }` —
  Panda's `lg` tracks the *viewport*, so a breakpoint would collapse the drawer's
  own two columns on a narrow window even though the drawer is the same width
  either way. Size the drawer to the content instead: two side-by-side selects
  need `size="lg"` (684px), not `md` (448px).
- **One drawer, two modes** (`mode: 'create' | 'edit'`) — reuse it for editing by
  seeding `name`/`form`/`addedCriteria` from the applied state instead of blank
  defaults, rather than building a second component.
- Footer is **Cancel / Save**, matching a create/edit drawer, not **Reset all /
  Cancel / Apply filter** (that footer is specific to a transient list-filter like
  `PxAllFiltersDrawer`). On the Describe step the primary becomes **Next** —
  see [`ai-prompt-builder.md`](ai-prompt-builder.md).
- A removed criteria section resets its own fields so re-adding it later starts
  clean, exactly like `PxAllFiltersDrawer.removeScope`.

### Give each criterion the shape its data actually has

The tempting shortcut is one generic "Min – Max" row for every criterion. Don't —
it forces unrelated things into a number range and makes the filter lie. The
talent-pool criteria are five different shapes, one per section
([`accordion.md`](accordion.md) for the section chrome):

| Criterion | Shape | Why not a range |
|---|---|---|
| Competency score | operator select + value, **per group** (DNA / Technical / Soft) | Three separate scores; one range can't say "DNA ≥ 4 but Technical ≥ 3" |
| Performance result | a result select **per review type** (Self / 360 / Team / Manager) | Ordinal labels, not numbers, and four independent reviewers |
| Education level | "Atleast" + one select | Ordinal ladder — a floor, not a span |
| Attendance | a checkbox per issue, revealing a "Days" cap | Three separate counters; ticking is the on/off |
| Year of service | "Atleast" + number + `Years` addon | Only ever a floor in practice |

Two rules hold across all of them:

- **Empty means "no bound", never `0`.** Coerce `''`/`null`/`undefined` before
  comparing (`toNum`) — a plain `<` / `>` against `''` doesn't fail the way you'd
  expect and silently lets unrelated rows through. A ticked attendance issue with
  an empty Days field is on-but-unbounded, not "0 days".
- **Units go in `MpInputRightAddon`** (`Days`, `Years`) — the same idiom as any
  unit-suffixed input (CLAUDE.md forms rule).

### Read the criterion's source data from one place

Each of those shapes needs per-talent data to compare against (group scores,
review results, issue counts). Derive it **once**, in a shared module, memoized —
`utils/talentAttributes.ts` reads it back out of `buildProfile` rather than
re-deriving it, so a pool that says "8 DNA competencies at least 4" selects the
same people the talent profile page shows a 4 for. Deriving the same number twice
is how two screens quietly start disagreeing.

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
