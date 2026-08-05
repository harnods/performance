<script setup lang="ts">
/**
 * PxColumnSortMenu — column-header sort affordance (hover icon → popover).
 * Behaviour taken verbatim from dona/erp-app's ErpColumnSortMenu, but built on
 * this repo's Pixel3 components and WITHOUT the "Hide column" option.
 *
 * Behaviour:
 *   • Icon is hidden until the header is hovered (parent styles the reveal via
 *     `&:hover .px-sort-btn`) and stays visible while its column is active sort.
 *   • Options depend on sortType: text = A–Z / Z–A, number = Low→High /
 *     High→Low, date = Oldest / Newest first.
 *   • Clicking the already-active direction clears the sort (emits key '').
 */
import {
  MpIcon, MpTooltip, MpPopover, MpPopoverTrigger, MpPopoverContent,
  MpPopoverList, MpPopoverListItem, css,
} from '@mekari/pixel3'

const props = defineProps<{
  colKey: string
  sortType: 'text' | 'number' | 'date'
  sortKey: string
  sortDir: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  sortChange: [key: string, dir: 'asc' | 'desc']
}>()

// Picking the already-active direction clears the sort (back to default order);
// otherwise apply the chosen direction. Empty key = unsorted.
function onSortOpt(dir: 'asc' | 'desc') {
  if (props.sortKey === props.colKey && props.sortDir === dir) emit('sortChange', '', 'asc')
  else emit('sortChange', props.colKey, dir)
}
</script>

<template>
  <MpPopover
    :id="`px-sort-${colKey}`"
    is-close-on-select use-portal :is-keep-alive="false" placement="bottom-start"
  >
    <MpPopoverTrigger>
      <button
        class="px-sort-btn"
        :class="{ 'px-sort-btn--active': sortKey === colKey }"
        aria-label="Sort column" @click.stop
      >
        <MpIcon name="sort-default" size="16px" />
      </button>
    </MpPopoverTrigger>
    <MpPopoverContent :class="css({ minWidth: '184px', width: 'max-content', whiteSpace: 'nowrap' })">
      <MpPopoverList>
        <template v-if="sortType === 'number'">
          <MpPopoverListItem @click="onSortOpt('asc')"><span class="px-sort-opt"><MpIcon name="arrows-up" size="sm" />Low to high<MpTooltip v-if="sortKey === colKey && sortDir === 'asc'" :id="`px-sort-reset-${colKey}-a`" label="Click to reset sort" placement="top" use-portal class="px-sort-check-tt"><MpIcon name="check" size="sm" class="px-sort-check" /></MpTooltip></span></MpPopoverListItem>
          <MpPopoverListItem @click="onSortOpt('desc')"><span class="px-sort-opt"><MpIcon name="arrows-down" size="sm" />High to low<MpTooltip v-if="sortKey === colKey && sortDir === 'desc'" :id="`px-sort-reset-${colKey}-d`" label="Click to reset sort" placement="top" use-portal class="px-sort-check-tt"><MpIcon name="check" size="sm" class="px-sort-check" /></MpTooltip></span></MpPopoverListItem>
        </template>
        <template v-else-if="sortType === 'date'">
          <MpPopoverListItem @click="onSortOpt('asc')"><span class="px-sort-opt"><MpIcon name="arrows-up" size="sm" />Oldest first<MpTooltip v-if="sortKey === colKey && sortDir === 'asc'" :id="`px-sort-reset-${colKey}-a`" label="Click to reset sort" placement="top" use-portal class="px-sort-check-tt"><MpIcon name="check" size="sm" class="px-sort-check" /></MpTooltip></span></MpPopoverListItem>
          <MpPopoverListItem @click="onSortOpt('desc')"><span class="px-sort-opt"><MpIcon name="arrows-down" size="sm" />Newest first<MpTooltip v-if="sortKey === colKey && sortDir === 'desc'" :id="`px-sort-reset-${colKey}-d`" label="Click to reset sort" placement="top" use-portal class="px-sort-check-tt"><MpIcon name="check" size="sm" class="px-sort-check" /></MpTooltip></span></MpPopoverListItem>
        </template>
        <template v-else>
          <MpPopoverListItem @click="onSortOpt('asc')"><span class="px-sort-opt"><MpIcon name="arrows-up" size="sm" />A - Z<MpTooltip v-if="sortKey === colKey && sortDir === 'asc'" :id="`px-sort-reset-${colKey}-a`" label="Click to reset sort" placement="top" use-portal class="px-sort-check-tt"><MpIcon name="check" size="sm" class="px-sort-check" /></MpTooltip></span></MpPopoverListItem>
          <MpPopoverListItem @click="onSortOpt('desc')"><span class="px-sort-opt"><MpIcon name="arrows-down" size="sm" />Z - A<MpTooltip v-if="sortKey === colKey && sortDir === 'desc'" :id="`px-sort-reset-${colKey}-d`" label="Click to reset sort" placement="top" use-portal class="px-sort-check-tt"><MpIcon name="check" size="sm" class="px-sort-check" /></MpTooltip></span></MpPopoverListItem>
        </template>
      </MpPopoverList>
    </MpPopoverContent>
  </MpPopover>
</template>

<style scoped>
/* icon button revealed on header hover (parent selector) ; stays visible while active */
.px-sort-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; flex-shrink: 0;
  border: none; background: none; cursor: pointer; border-radius: var(--mp-radii-sm);
  color: var(--mp-icon-default, var(--mp-text-secondary));
  visibility: hidden;
}
.px-sort-btn--active { visibility: visible; color: var(--mp-text-selected, var(--mp-text-default)); }
.px-sort-btn:hover { background: var(--mp-background-neutral-hovered); }
/* popover option row: icon + label */
.px-sort-opt { display: inline-flex; align-items: center; gap: var(--mp-spacing-2); text-transform: none; width: 100%; }
.px-sort-check-tt { margin-left: auto; display: inline-flex; }
.px-sort-check { color: var(--mp-text-selected); }
</style>
