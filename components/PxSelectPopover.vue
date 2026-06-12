<script setup lang="ts">
import {
  MpFlex,
  MpSelect,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpIcon,
  MpText,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'

interface Option { value: string; label: string; description?: string }

const props = defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
  isClearable?: boolean
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

const searchBar = css({
  paddingInline: '3',
  paddingBlock: '2',
  borderBottom: '1px solid',
  borderBottomColor: 'border.default',
  flexShrink: '0',
  overflow: 'hidden',
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
    <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
      <MpPopoverTrigger>
        <MpFlex :class="fieldClass">
          <MpSelect
            :model-value="modelValue"
            :placeholder="placeholder"
            :is-clearable="isClearable"
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
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" />
            </MpInputLeftAddon>
            <MpInput
              v-model="searchTerm"
              :placeholder="searchPlaceholder ?? 'Search'"
            />
          </MpInputGroup>
        </div>
        <div :class="listWrap">
        <MpPopoverList>
          <MpPopoverListItem
            v-for="opt in filteredOptions"
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
        </MpPopoverList>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
