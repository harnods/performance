<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dashboard — nested multi-select filter
  Token mode: Pixel 2.4

  Replica of talenta-review's NestedMultiSelect.vue. Trigger reads
  "Select filter" → "Filter (n)". The panel is two columns: a dimension list
  (Organization / Branch / Job Position / Job Level [+ Total Employee]) with a
  "Reset all filter" link and a `>` on each row, and — to the right — the
  hovered dimension's panel: a search box, a "Reset filter" link, and a
  checkbox list. Emits selections live.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputRightAddon,
  MpCheckbox,
  MpTextlink,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  css,
} from '@mekari/pixel3'
import type { FilterDimension } from '~/utils/dashboardTypes'

const props = defineProps<{ dimensions: FilterDimension[], modelValue: Record<string, string[]> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string[]>] }>()

const totalSelected = computed(() => Object.values(props.modelValue).reduce((s, arr) => s + (arr?.length ?? 0), 0))
const triggerLabel = computed(() => (totalSelected.value > 0 ? `Filter (${totalSelected.value})` : ''))

const activeKey = ref(props.dimensions[0]?.key ?? '')
const activeDim = computed(() => props.dimensions.find(d => d.key === activeKey.value) ?? props.dimensions[0])
const searchByKey = reactive<Record<string, string>>({})

function toggle(key: string, id: string) {
  const current = props.modelValue[key] ?? []
  const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
  emit('update:modelValue', { ...props.modelValue, [key]: next })
}
function isChecked(key: string, id: string) { return (props.modelValue[key] ?? []).includes(id) }
function countFor(key: string) { return (props.modelValue[key] ?? []).length }
function resetDimension(key: string) { emit('update:modelValue', { ...props.modelValue, [key]: [] }) }
function resetAll() {
  const cleared: Record<string, string[]> = {}
  for (const d of props.dimensions) cleared[d.key] = []
  emit('update:modelValue', cleared)
}
function filteredOptions(d: FilterDimension) {
  const q = (searchByKey[d.key] ?? '').trim().toLowerCase()
  return q ? d.options.filter(o => o.name.toLowerCase().includes(q)) : d.options
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const triggerWidth = css({ width: '200px', cursor: 'pointer', '& input': { cursor: 'pointer' } })
const panel = css({ display: 'flex', alignItems: 'stretch' })
const listCol = css({ width: '220px', flexShrink: '0', borderRight: '1px solid', borderRightColor: 'border.default', display: 'flex', flexDirection: 'column' })
const listHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '3', borderBottom: '1px solid', borderBottomColor: 'gray.50' })
const dimRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '3', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' })
const dimRowActive = css({ background: 'blue.50' })
const dimLabel = css({ fontSize: '14px', color: 'text.default' })
const dimCount = css({ fontSize: '12px', color: 'text.link' })
const panelCol = css({ width: '240px', flexShrink: '0', display: 'flex', flexDirection: 'column', maxHeight: '320px' })
const searchPad = css({ padding: '3', paddingBottom: '2' })
const searchBox = css({ position: 'relative', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'icon.secondary', zIndex: '1', pointerEvents: 'none' })
const resetPad = css({ paddingInline: '3', paddingBottom: '2' })
const optList = css({ overflowY: 'auto', paddingInline: '2', paddingBottom: '2', display: 'flex', flexDirection: 'column' })
// Padded, clickable row wrapping the checkbox (checkbox's own class doesn't add
// outer padding). Row click toggles; checkbox is display-only.
const optionRow = css({ display: 'flex', alignItems: 'center', paddingBlock: '2', paddingInline: '1', borderRadius: 'sm', cursor: 'pointer', _hover: { background: 'background.neutral.subtle' } })
const cbNoPointer = css({ pointerEvents: 'none' })
</script>

<template>
  <MpPopover use-portal placement="bottom-start" :class="css({ display: 'inline-block' })">
    <MpPopoverTrigger>
      <MpFlex :class="triggerWidth">
        <MpInputGroup>
          <MpInput :model-value="triggerLabel" placeholder="Select filter" readonly tabindex="-1" />
          <MpInputRightAddon><MpIcon name="chevrons-down" /></MpInputRightAddon>
        </MpInputGroup>
      </MpFlex>
    </MpPopoverTrigger>
    <MpPopoverContent :class="css({ padding: '0' })">
      <div :class="panel">
        <!-- Dimension list -->
        <div :class="listCol">
          <div :class="listHeader">
            <MpTextlink as="a" :is-disabled="totalSelected === 0" @click="resetAll">Reset all filter</MpTextlink>
          </div>
          <button
            v-for="d in dimensions"
            :key="d.key"
            type="button"
            :class="[dimRow, activeKey === d.key && dimRowActive]"
            @mouseenter="activeKey = d.key"
            @click="activeKey = d.key"
          >
            <span :class="dimLabel">{{ d.label }}</span>
            <MpFlex align="center" gap="2">
              <span v-if="countFor(d.key)" :class="dimCount">{{ countFor(d.key) }}</span>
              <MpIcon name="caret-right" size="sm" />
            </MpFlex>
          </button>
        </div>

        <!-- Active dimension panel -->
        <div v-if="activeDim" :class="panelCol">
          <div :class="searchPad">
            <div :class="searchBox">
              <MpIcon name="search" size="sm" :class="searchIcon" />
              <MpInput v-model="searchByKey[activeDim.key]" placeholder="Search..." />
            </div>
          </div>
          <div :class="resetPad">
            <MpTextlink as="a" :is-disabled="countFor(activeDim.key) === 0" @click="resetDimension(activeDim.key)">Reset filter</MpTextlink>
          </div>
          <div :class="optList">
            <div
              v-for="opt in filteredOptions(activeDim)"
              :key="opt.id"
              :class="optionRow"
              @click="toggle(activeDim.key, opt.id)"
            >
              <MpCheckbox :id="`filter-${activeDim.key}-${opt.id}`" :class="cbNoPointer" :is-checked="isChecked(activeDim.key, opt.id)">
                {{ opt.name }}
              </MpCheckbox>
            </div>
          </div>
        </div>
      </div>
    </MpPopoverContent>
  </MpPopover>
</template>
