# Pagination

One canonical footer copied across all 6 list pages: a fixed **52px** bar, `paddingInline: '4'`, sitting inside the same `MpFlex direction="column"` as the table container (no gap → reads as an attached table footer). Left = rows-per-page + "Showing" count; right = "Page x of y" + prev/next ghost icon buttons.

## Markup (`pages/reviews/review-cycles/index.vue:368-418`)

```vue
<div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
  <MpFlex align="center" gap="3">
    <MpText size="label" :class="captionText">Rows per page</MpText>
    <MpPopover is-close-on-select use-portal placement="bottom-start">
      <MpPopoverTrigger>
        <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <MpPopoverList>
          <MpPopoverListItem v-for="opt in rowsPerPageOptions" :key="opt" :is-active="opt === rowsPerPage"
            @click="rowsPerPage = opt; currentPage = 1">{{ opt }}</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
    <MpText size="label" :class="captionText">Showing {{ showingFrom }}–{{ showingTo }} of {{ totalRows }}</MpText>
  </MpFlex>

  <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
    <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
    <MpTooltip label="Prev page" use-portal>
      <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
    </MpTooltip>
    <MpTooltip label="Next page" use-portal>
      <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
    </MpTooltip>
  </div>
</div>
```

## Backing script (`pages/talents/competencies/index.vue:109-116`)

```ts
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => filtered.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
```

## Rules

- Default `rowsPerPage = 10`; options `[10, 25, 50, 100]`.
- **Always** guard `totalPages` with `Math.max(1, Math.ceil(...))` (avoids "Page 1 of 0" — the bug in review-cycles' bare `Math.ceil`).
- Render the table from `paged`, not `filtered`.
- Prev/next = ghost `size="sm"` icon buttons, `:is-disabled` at first/last page; wrap in `MpTooltip` (prev/next label).
- Reset `currentPage = 1` when rows-per-page or any filter changes.
- Footer attaches to the table container (same column, no gap), `height: 52px`, `paddingInline: '4'`.
