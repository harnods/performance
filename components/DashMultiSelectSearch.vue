<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dashboard — multi-select + search popover (filter bar)
  Token mode: Pixel 2.4

  Replica of talenta-review's MultipleSelectSearch (the review cycle / review
  method filters). Trigger shows the placeholder ("All review cycle") or
  "{n} selected"; the popover has a search box, an "All {field}" select-all,
  and a searchable checkbox list. Multi-select.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import {
  MpFlex,
  MpText,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputRightAddon,
  MpCheckbox,
  MpSpinner,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  css,
} from '@mekari/pixel3'

const props = defineProps<{
  modelValue: string[]
  options: { value: string, label: string }[]
  allLabel: string // e.g. "All review cycle"
  width?: string
  // When set, an empty selection shows this as a grey placeholder ("Select
  // organization") instead of reading as "All …". Unset = old behaviour.
  placeholder?: string
  // Trigger lists the picked labels ("Finance, Product +2") instead of "{n} selected".
  summarize?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
  // Server-paged lists (e.g. Job grade / Job class): infinite scroll, the same
  // as MpAutocomplete's `is-infinity-scroll` — reaching the end of the list
  // emits `load-more`, and a Spinner + "Loading" row shows while isLoadingMore.
  hasMore?: boolean
  isLoadingMore?: boolean
  // Server-searched list: typing emits `search` (debounced) and the parent swaps
  // `options` for the server's results, instead of filtering only the rows
  // loaded so far. The "All …" row is hidden — it could only tick loaded rows.
  remoteSearch?: boolean
  // Form mode (same idea as PxSelectPopover's `searchOnField`): the field itself
  // is the search box — no search bar inside the popover — and the popover is
  // exactly as wide as the field. Opt-in; the dashboard keeps the old picker.
  searchOnField?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [v: string[]], 'load-more': [], 'search': [q: string] }>()

// Labels of every option seen so far, so picked values keep their names in the
// trigger after a server search swaps `options` for a result list without them.
const knownLabels = new Map<string, string>()
watch(() => props.options, opts => opts.forEach(o => knownLabels.set(o.value, o.label)), { immediate: true })

// Up to 2 labels, then "+N".
const SUMMARY_MAX = 2
const summaryLabel = computed(() => {
  const labels = props.modelValue.map(v => knownLabels.get(v) ?? v)
  return labels.length > SUMMARY_MAX ? `${labels.slice(0, SUMMARY_MAX).join(', ')} +${labels.length - SUMMARY_MAX}` : labels.join(', ')
})

const search = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, q => {
  if (!props.remoteSearch) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', q.trim()), 300)
})
const triggerLabel = computed(() => {
  if (props.modelValue.length) return props.summarize ? summaryLabel.value : `${props.modelValue.length} selected`
  return props.placeholder ? '' : props.allLabel
})
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q && !props.remoteSearch ? props.options.filter(o => o.label.toLowerCase().includes(q)) : props.options
})
const allChecked = computed(() => props.options.length > 0 && props.modelValue.length === props.options.length)
const someChecked = computed(() => props.modelValue.length > 0 && !allChecked.value)
// "All …" only makes sense over the whole, unfiltered list.
const showAllRow = computed(() => !props.remoteSearch && !search.value.trim())

function toggle(value: string) {
  emit('update:modelValue', props.modelValue.includes(value) ? props.modelValue.filter(v => v !== value) : [...props.modelValue, value])
}
function toggleAll() {
  emit('update:modelValue', allChecked.value ? [] : props.options.map(o => o.value))
}

// ─── searchOnField: the field shows the picked labels until it's focused, then
// it's a search box. Mirrors PxSelectPopover's searchOnField handlers. ───────
const isEditingField = ref(false)
const fieldText = computed({
  get: () => (isEditingField.value ? search.value : triggerLabel.value),
  set: (v: string) => { search.value = v },
})
function onFieldFocus() {
  isEditingField.value = true
  search.value = ''
}
function onFieldBlur() {
  isEditingField.value = false
  search.value = ''
}
// MpPopoverTrigger toggles on every click; a click inside an already-focused
// field is text editing, not a request to close (same fix as PxSelectPopover).
let wasAlreadyFocused = false
function onFieldMouseDown(e: MouseEvent) { wasAlreadyFocused = document.activeElement === e.currentTarget }
function onFieldClick(e: MouseEvent) { if (wasAlreadyFocused) e.stopPropagation() }

// Popover exactly as wide as the field (PxSelectPopover measures it the same way:
// is-adaptive-width only sets a min-width).
const rootEl = ref<HTMLElement | null>(null)
const triggerWidth = ref(0)
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (!props.searchOnField || !rootEl.value) return
  triggerWidth.value = rootEl.value.getBoundingClientRect().width
  resizeObserver = new ResizeObserver(([entry]) => { if (entry) triggerWidth.value = entry.contentRect.width })
  resizeObserver.observe(rootEl.value)
})
const contentStyle = computed(() => (props.searchOnField && triggerWidth.value ? { width: `${triggerWidth.value}px` } : undefined))

// ─── Infinite scroll (MpAutocomplete's pattern): an empty sentinel after the
// last option; when it scrolls into view, ask for the next page. ─────────────
let sentinelObserver: IntersectionObserver | undefined
function observeSentinel(el: Element | ComponentPublicInstance | null) {
  sentinelObserver?.disconnect()
  if (!(el instanceof Element)) return
  sentinelObserver = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && props.hasMore && !props.isLoadingMore) emit('load-more')
  })
  sentinelObserver.observe(el)
}
onBeforeUnmount(() => { resizeObserver?.disconnect(); sentinelObserver?.disconnect(); clearTimeout(searchTimer) })

const triggerWrap = css({ cursor: 'pointer', '& input': { cursor: 'pointer' } })
const fieldWrap = css({ cursor: 'text' })
const panel = css({ width: '260px', maxHeight: '360px', display: 'flex', flexDirection: 'column' })
const panelFull = css({ width: '100%', maxHeight: '360px', display: 'flex', flexDirection: 'column' })
const searchPad = css({ padding: '2', borderBottom: '1px solid', borderBottomColor: 'gray.50' })
const searchBox = css({ position: 'relative', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'icon.secondary', zIndex: '1', pointerEvents: 'none' })
const list = css({ overflowY: 'auto', padding: '1', display: 'flex', flexDirection: 'column' })
// Each option is a padded, clickable row wrapping the checkbox (the checkbox's
// own class doesn't add outer padding). Row click toggles; the checkbox is
// display-only (pointer-events none) so there's no double toggle.
const optionRow = css({ display: 'flex', alignItems: 'center', paddingBlock: '2', paddingInline: '2', borderRadius: 'sm', cursor: 'pointer', _hover: { background: 'background.neutral.subtle' } })
const allRow = css({ display: 'flex', alignItems: 'center', paddingBlock: '2', paddingInline: '2', borderRadius: 'sm', cursor: 'pointer', borderBottom: '1px solid', borderBottomColor: 'gray.50', marginBottom: '1', _hover: { background: 'background.neutral.subtle' } })
const cbNoPointer = css({ pointerEvents: 'none' })
// MpAutocomplete's contentLoading slot: px 3, py 2, flex, gap 3 (Spinner md + "Loading").
const loadingRow = css({ paddingInline: '3', paddingBlock: '2', display: 'flex', alignItems: 'center', gap: '3' })
const sentinel = css({ height: '1px', flexShrink: '0' })
</script>

<template>
  <div ref="rootEl" :class="css({ display: 'inline-block', width: width ?? '200px' })">
    <MpPopover use-portal placement="bottom-start" :is-disabled="isDisabled" :class="css({ display: 'block' })">
      <MpPopoverTrigger>
        <MpFlex v-if="searchOnField" :class="[isDisabled ? undefined : fieldWrap, css({ width: '100%' })]">
          <MpInputGroup :class="css({ width: '100%' })">
            <MpInput
              v-model="fieldText"
              :placeholder="placeholder"
              :is-disabled="isDisabled"
              :is-invalid="isInvalid"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
              @mousedown="onFieldMouseDown"
              @click="onFieldClick"
            />
            <MpInputRightAddon><MpIcon name="chevrons-down" /></MpInputRightAddon>
          </MpInputGroup>
        </MpFlex>
        <MpFlex v-else :class="[isDisabled ? undefined : triggerWrap, css({ width: '100%' })]">
          <MpInputGroup>
            <MpInput :model-value="triggerLabel" :placeholder="placeholder" :is-disabled="isDisabled" :is-invalid="isInvalid" readonly tabindex="-1" />
            <MpInputRightAddon><MpIcon name="chevrons-down" /></MpInputRightAddon>
          </MpInputGroup>
        </MpFlex>
      </MpPopoverTrigger>
      <MpPopoverContent :style="contentStyle">
        <div :class="searchOnField ? panelFull : panel">
          <div v-if="!searchOnField" :class="searchPad">
            <div :class="searchBox">
              <MpIcon name="search" size="sm" :class="searchIcon" />
              <MpInput v-model="search" placeholder="Search..." />
            </div>
          </div>
          <!-- mousedown.prevent keeps focus in the field while ticking options
               (PxSelectPopover does the same), so the typed search survives. -->
          <div :class="list" @mousedown.prevent>
            <div v-if="showAllRow" :class="allRow" @click="toggleAll">
              <MpCheckbox :id="`mss-all-${allLabel}`" :class="cbNoPointer" :is-checked="allChecked" :is-indeterminate="someChecked">{{ allLabel }}</MpCheckbox>
            </div>
            <div v-for="o in filtered" :key="o.value" :class="optionRow" @click="toggle(o.value)">
              <MpCheckbox :id="`mss-${allLabel}-${o.value}`" :class="cbNoPointer" :is-checked="modelValue.includes(o.value)">{{ o.label }}</MpCheckbox>
            </div>
            <MpText v-if="!filtered.length && !isLoadingMore" size="label" :class="css({ color: 'text.secondary', padding: '2' })">No result found</MpText>
            <div v-if="isLoadingMore" :class="loadingRow">
              <MpSpinner size="md" />
              <MpText>Loading</MpText>
            </div>
            <div v-if="hasMore" :ref="observeSentinel" :class="sentinel" aria-hidden="true" />
          </div>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
