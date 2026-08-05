<script setup lang="ts">
/**
 * PxFilterScope — one collapsible, removable multi-select inside the All-filters
 * drawer. Mirrors talenta-review's InputScope.vue (accordion header with label +
 * selected preview + remove; panel with search, "Select all", checkbox list).
 * Flat only (the production SBU nested variant is out of scope for the mock).
 */
import {
  MpFlex, MpText, MpIcon, MpTooltip, MpInput, MpCheckbox, css,
} from '@mekari/pixel3'

interface ScopeItem { id: string, name: string }

const props = withDefaults(defineProps<{
  label: string
  items: ScopeItem[]
  modelValue: string[]
  showRemove?: boolean
  defaultClosed?: boolean
}>(), { showRemove: true, defaultClosed: false })

const emit = defineEmits<{ 'update:modelValue': [v: string[]], 'remove': [] }>()

const open = ref(!props.defaultClosed)
const search = ref('')

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? props.items.filter(i => i.name.toLowerCase().includes(q)) : props.items
})
const allChecked = computed(() => props.items.length > 0 && props.modelValue.length === props.items.length)
const someChecked = computed(() => props.modelValue.length > 0 && !allChecked.value)
const selectedPreview = computed(() => {
  const n = props.modelValue.length
  const lower = props.label.toLowerCase()
  return n === 0 ? `No selected ${lower}` : `${n} selected ${lower}`
})

function isChecked(id: string) { return props.modelValue.includes(id) }
function toggle(id: string) {
  emit('update:modelValue', props.modelValue.includes(id) ? props.modelValue.filter(v => v !== id) : [...props.modelValue, id])
}
function toggleAll() {
  emit('update:modelValue', allChecked.value ? [] : props.items.map(i => i.id))
}

const wrap = css({ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })
const header = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', width: '100%', paddingBlock: '3', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' })
const labelText = css({ fontSize: '14px', color: 'text.default' })
const previewText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const headerActions = css({ display: 'inline-flex', alignItems: 'center', gap: '1', flexShrink: '0' })
const iconBtn = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: 'none', background: 'transparent', borderRadius: 'md', cursor: 'pointer', color: 'text.secondary', _hover: { background: 'background.neutral.hovered', color: 'text.default' } })
const panel = css({ display: 'flex', flexDirection: 'column', gap: '2', paddingBottom: '3' })
const searchBox = css({ position: 'relative', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'icon.secondary', zIndex: '1', pointerEvents: 'none' })
const list = css({ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column' })
const optionRow = css({ display: 'flex', alignItems: 'center', paddingBlock: '2', paddingInline: '1', borderRadius: 'sm', _hover: { background: 'background.neutral.subtle' } })
const chevron = css({ transition: 'transform 150ms ease' })
const chevronOpen = css({ transform: 'rotate(180deg)' })
</script>

<template>
  <div :class="wrap">
    <button type="button" :class="header" @click="open = !open">
      <div>
        <MpText :class="labelText">{{ label }}</MpText>
        <MpText :class="previewText">{{ selectedPreview }}</MpText>
      </div>
      <span :class="headerActions">
        <MpTooltip v-if="showRemove" label="Remove" use-portal>
          <span :class="iconBtn" role="button" aria-label="Remove filter" @click.stop="emit('remove')"><MpIcon name="minus-circular" size="sm" /></span>
        </MpTooltip>
        <span :class="[iconBtn]"><MpIcon name="chevrons-down" size="sm" :class="[chevron, open && chevronOpen]" /></span>
      </span>
    </button>

    <div v-if="open" :class="panel">
      <div :class="searchBox">
        <MpIcon name="search" size="sm" :class="searchIcon" />
        <MpInput v-model="search" placeholder="Search" />
      </div>
      <div :class="optionRow">
        <MpCheckbox :id="`scope-all-${label}`" :is-checked="allChecked" :is-indeterminate="someChecked" @update:is-checked="toggleAll">Select all {{ label.toLowerCase() }}</MpCheckbox>
      </div>
      <div :class="list">
        <div v-for="item in filteredItems" :key="item.id" :class="optionRow">
          <MpCheckbox :id="`scope-${label}-${item.id}`" :is-checked="isChecked(item.id)" @update:is-checked="() => toggle(item.id)">{{ item.name }}</MpCheckbox>
        </div>
        <MpText v-if="!filteredItems.length" :class="[previewText, css({ paddingBlock: '4', textAlign: 'center' })]">No items found</MpText>
      </div>
    </div>
  </div>
</template>
