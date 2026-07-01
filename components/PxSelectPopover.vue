<script setup lang="ts">
import {
  MpFlex,
  MpSelect,
  MpInput,
  MpIcon,
  MpText,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'

interface Option { value: string; label: string; description?: string; group?: string }

const props = defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
  isClearable?: boolean
  isDisabled?: boolean
  width?: string
  searchable?: boolean
  searchPlaceholder?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const fieldClass = css({
  cursor: 'pointer',
  '& select': { pointerEvents: 'none' },
  // Hide clear (×) button by default, reveal on hover only
  '& .mp-select__root button': { opacity: '0', pointerEvents: 'none', transition: 'opacity 0.15s' },
  '&:hover .mp-select__root button': { opacity: '1', pointerEvents: 'auto' },
})
const wrapperStyle = computed(() => ({ width: props.width ?? '100%' }))

const searchTerm = ref('')
const filteredOptions = computed(() =>
  !props.searchable || !searchTerm.value
    ? props.options
    : props.options.filter(o =>
        o.label.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        o.description?.toLowerCase().includes(searchTerm.value.toLowerCase()),
      ),
)

// Group options by their optional `group` label, preserving first-seen order.
// When no option has a group, render a single unlabeled group (existing behavior).
const groupedOptions = computed(() => {
  const hasGroups = filteredOptions.value.some(o => o.group)
  if (!hasGroups) return [{ group: '', items: filteredOptions.value }]
  const map = new Map<string, Option[]>()
  for (const o of filteredOptions.value) {
    const g = o.group ?? ''
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(o)
  }
  return Array.from(map, ([group, items]) => ({ group, items }))
})

// paddingInline matches the popover list item's left padding so group headers and
// option labels line up on the same vertical edge.
const groupHeader = css({
  paddingInline: '3', paddingTop: '2', paddingBottom: '1',
  fontSize: '12px', lineHeight: '16px', fontWeight: 'semiBold', color: 'text.secondary',
})

const searchBar = css({
  paddingInline: '3',
  paddingBlock: '2',
  borderBottom: '1px solid',
  borderBottomColor: 'border.default',
  flexShrink: '0',
  overflow: 'hidden',
})
// Search field: icon overlaid at left, inner input padded so text never collides.
const searchWrap = css({
  position: 'relative',
  width: '100%',
  '& input': { paddingLeft: '36px' },
})
const searchIcon = css({
  position: 'absolute', left: '3', top: '50%', transform: 'translateY(-50%)',
  color: 'icon.default', pointerEvents: 'none', zIndex: '1',
})
const listWrap = css({
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '280px',
  overflowY: 'auto',
})
const itemBody = css({ display: 'flex', flexDirection: 'column', gap: '0', paddingBlock: '1' })
const itemLabel = css({ color: 'text.default', fontWeight: 'semiBold' })
const itemCaption = css({ color: 'text.secondary' })

function set(v: string) {
  emit('update:modelValue', v)
  searchTerm.value = ''
}
</script>

<template>
  <div :style="wrapperStyle">
    <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start" :is-disabled="isDisabled">
      <MpPopoverTrigger>
        <MpFlex :class="isDisabled ? undefined : fieldClass">
          <MpSelect
            :model-value="modelValue"
            :placeholder="placeholder"
            :is-clearable="isClearable"
            :is-disabled="isDisabled"
            tabindex="-1"
            aria-hidden="true"
            @update:model-value="set"
          >
            <option v-for="opt in options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </MpSelect>
        </MpFlex>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <div v-if="searchable" :class="searchBar" @click.stop>
          <div :class="searchWrap">
            <MpIcon name="search" :class="searchIcon" />
            <MpInput
              v-model="searchTerm"
              :placeholder="searchPlaceholder ?? 'Search'"
            />
          </div>
        </div>
        <div :class="listWrap" class="px-select-list">
        <MpPopoverList>
          <template v-for="(grp, gi) in groupedOptions" :key="`g-${gi}`">
            <div v-if="grp.group" :class="groupHeader">{{ grp.group }}</div>
            <MpPopoverListItem
              v-for="opt in grp.items"
              :key="opt.value"
              :is-active="opt.value === modelValue"
              @click="set(opt.value)"
            >
              <div v-if="opt.description" :class="itemBody">
                <MpText size="label" :class="itemLabel">{{ opt.label }}</MpText>
                <MpText size="label-small" :class="itemCaption">{{ opt.description }}</MpText>
              </div>
              <template v-else>{{ opt.label }}</template>
            </MpPopoverListItem>
          </template>
        </MpPopoverList>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
