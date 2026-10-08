<script setup lang="ts">
/**
 * PxColumnSortToggle — production's column-header sort (talenta-review sortMixin):
 * the header label with an always-visible sort icon right after it. Clicking the
 * label sorts ascending; clicking the same column again flips asc ↔ desc (it never
 * clears). Icon: `sort-default` when the column isn't sorted, `sort-ascending` /
 * `sort-descending` when it is. See docs/patterns/table.md › Column sort.
 */
import { MpIcon, css } from '@mekari/pixel3'

const props = defineProps<{
  label: string
  colKey: string
  sortKey: string
  sortDir: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  sortChange: [key: string, dir: 'asc' | 'desc']
}>()

const isActive = computed(() => props.sortKey === props.colKey)
const icon = computed(() => (isActive.value ? (props.sortDir === 'desc' ? 'sort-descending' : 'sort-ascending') : 'sort-default'))

function toggle() {
  emit('sortChange', props.colKey, isActive.value && props.sortDir === 'asc' ? 'desc' : 'asc')
}

const btn = css({
  display: 'inline-flex', alignItems: 'center', gap: '1',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  font: 'inherit', color: 'inherit', textAlign: 'left',
  _focusVisible: { outline: 'none', boxShadow: '0 0 0 3px var(--mp-colors-border-brand)', borderRadius: 'sm' },
})
</script>

<template>
  <button type="button" :class="btn" :aria-label="`Sort by ${label}`" @click="toggle">
    <span>{{ label }}</span>
    <MpIcon :name="icon" size="sm" :color="isActive ? 'icon.default' : 'icon.secondary'" />
  </button>
</template>
