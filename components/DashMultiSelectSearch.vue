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
import {
  MpFlex,
  MpText,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputRightAddon,
  MpCheckbox,
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
}>()
const emit = defineEmits<{ 'update:modelValue': [v: string[]] }>()

const search = ref('')
const triggerLabel = computed(() => (props.modelValue.length ? `${props.modelValue.length} selected` : props.allLabel))
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? props.options.filter(o => o.label.toLowerCase().includes(q)) : props.options
})
const allChecked = computed(() => props.options.length > 0 && props.modelValue.length === props.options.length)
const someChecked = computed(() => props.modelValue.length > 0 && !allChecked.value)

function toggle(value: string) {
  emit('update:modelValue', props.modelValue.includes(value) ? props.modelValue.filter(v => v !== value) : [...props.modelValue, value])
}
function toggleAll() {
  emit('update:modelValue', allChecked.value ? [] : props.options.map(o => o.value))
}

const triggerWrap = css({ cursor: 'pointer', '& input': { cursor: 'pointer' } })
const panel = css({ width: '260px', maxHeight: '360px', display: 'flex', flexDirection: 'column' })
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
</script>

<template>
  <MpPopover use-portal placement="bottom-start" :class="css({ display: 'inline-block' })">
    <MpPopoverTrigger>
      <MpFlex :class="[triggerWrap, css({ width: width ?? '200px' })]">
        <MpInputGroup>
          <MpInput :model-value="triggerLabel" readonly tabindex="-1" />
          <MpInputRightAddon><MpIcon name="chevrons-down" /></MpInputRightAddon>
        </MpInputGroup>
      </MpFlex>
    </MpPopoverTrigger>
    <MpPopoverContent>
      <div :class="panel">
        <div :class="searchPad">
          <div :class="searchBox">
            <MpIcon name="search" size="sm" :class="searchIcon" />
            <MpInput v-model="search" placeholder="Search..." />
          </div>
        </div>
        <div :class="list">
          <div :class="allRow" @click="toggleAll">
            <MpCheckbox :id="`mss-all-${allLabel}`" :class="cbNoPointer" :is-checked="allChecked" :is-indeterminate="someChecked">{{ allLabel }}</MpCheckbox>
          </div>
          <div v-for="o in filtered" :key="o.value" :class="optionRow" @click="toggle(o.value)">
            <MpCheckbox :id="`mss-${allLabel}-${o.value}`" :class="cbNoPointer" :is-checked="modelValue.includes(o.value)">{{ o.label }}</MpCheckbox>
          </div>
          <MpText v-if="!filtered.length" size="label" :class="css({ color: 'text.secondary', padding: '2' })">No result</MpText>
        </div>
      </div>
    </MpPopoverContent>
  </MpPopover>
</template>
