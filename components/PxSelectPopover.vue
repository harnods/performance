<script setup lang="ts">
import {
  MpFlex,
  MpSelect,
  MpInput,
  MpInputGroup,
  MpInputRightAddon,
  MpIcon,
  MpText,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'

interface Option { value: string; label: string; description?: string; trailing?: string; group?: string; photo?: string }

const props = defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
  isClearable?: boolean
  isDisabled?: boolean
  width?: string
  searchable?: boolean
  searchPlaceholder?: string
  // Type directly into the closed field itself instead of opening the popover
  // to a separate embedded search box — the field becomes a real text input
  // that filters the list live as you type (no popover-internal search bar).
  // Opt-in only: every other existing `searchable` usage keeps the
  // popover-embedded search box unchanged. See docs/patterns/form.md.
  searchOnField?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const fieldClass = css({
  cursor: 'pointer',
  '& select': { pointerEvents: 'none' },
  // Hide clear (×) button by default, reveal on hover only
  '& .mp-select__root button': { opacity: '0', pointerEvents: 'none', transition: 'opacity 0.15s' },
  '&:hover .mp-select__root button': { opacity: '1', pointerEvents: 'auto' },
})
// Apply an explicit width inline only when the `width` prop is given. When it is
// omitted, leave the wrapper at its natural block width (100% of parent) so a
// responsive width class can be passed in from the parent via fallthrough.
const wrapperStyle = computed(() => (props.width ? { width: props.width } : undefined))

const searchTerm = ref('')

// ─── searchOnField mode — the field is the search box ───────────────────────
// The popover's own open/close (click trigger, click-outside, close-on-select)
// is untouched — MpPopoverTrigger opens on click same as it did wrapping the
// old disabled-look MpSelect, and stays open while typing since nothing here
// blurs the field. Only the *displayed text* needs managing: cleared on focus
// so typing starts fresh, and reverted to the current selection's label on
// blur so an abandoned, unselected search doesn't stick around.
const selectedLabel = computed(() => props.options.find(o => o.value === props.modelValue)?.label ?? '')
const fieldText = ref(selectedLabel.value)
const isEditingField = ref(false)
watch(selectedLabel, (label) => { if (!isEditingField.value) fieldText.value = label })
function onFieldFocus() {
  isEditingField.value = true
  fieldText.value = ''
}
function onFieldBlur() {
  isEditingField.value = false
  fieldText.value = selectedLabel.value
}
// MpPopoverTrigger toggles open/closed on every click of whatever it wraps —
// fine for the old inert MpSelect (you'd never "click again" on it while
// typing since it can't be typed into), but a real text input very much gets
// re-clicked mid-search (fixing a typo, moving the cursor) and each of those
// would otherwise slam the popover shut. Only the click that *first* focuses
// the field should be allowed through to the trigger's toggle; any click
// while it's already focused is a normal text-editing click, not a
// re-open/close request, so stop it from bubbling to the toggle. Read at
// mousedown (fires *before* focus changes) so it reflects focus state going
// into this click, not the focus onFieldFocus is about to set.
let wasAlreadyFocused = false
function onFieldMouseDown(e: MouseEvent) {
  wasAlreadyFocused = document.activeElement === e.currentTarget
}
function onFieldClick(e: MouseEvent) {
  if (wasAlreadyFocused) e.stopPropagation()
}

const activeSearchTerm = computed(() => (props.searchOnField ? fieldText.value : searchTerm.value))
const filteredOptions = computed(() =>
  !(props.searchable || props.searchOnField) || !activeSearchTerm.value
    ? props.options
    : props.options.filter(o =>
        o.label.toLowerCase().includes(activeSearchTerm.value.toLowerCase()) ||
        o.description?.toLowerCase().includes(activeSearchTerm.value.toLowerCase()) ||
        o.trailing?.toLowerCase().includes(activeSearchTerm.value.toLowerCase()),
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
// For a short right-aligned value (e.g. a currency symbol next to its code)
// rather than description's longer explanatory caption stacked below.
const itemRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '3' })

function set(v: string) {
  emit('update:modelValue', v)
  searchTerm.value = ''
  fieldText.value = props.options.find(o => o.value === v)?.label ?? ''
}

// searchOnField's trigger swaps MpSelect for a real MpInputGroup/MpInput field
// (same chevrons-down-addon look as DashMultiSelectSearch.vue's own select-like
// search trigger) — clicking it opens the popover exactly like clicking the
// old disabled select did, no extra wiring needed for that part.
const fieldGroupClass = css({ cursor: 'text' })
</script>

<template>
  <div :style="wrapperStyle">
    <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start" :is-disabled="isDisabled">
      <MpPopoverTrigger>
        <MpFlex v-if="searchOnField" :class="isDisabled ? undefined : fieldGroupClass">
          <MpInputGroup :class="css({ width: '100%' })">
            <MpInput
              v-model="fieldText"
              :placeholder="placeholder"
              :is-disabled="isDisabled"
              @focus="onFieldFocus"
              @blur="onFieldBlur"
              @mousedown="onFieldMouseDown"
              @click="onFieldClick"
            />
            <MpInputRightAddon><MpIcon name="chevrons-down" /></MpInputRightAddon>
          </MpInputGroup>
        </MpFlex>
        <MpFlex v-else :class="isDisabled ? undefined : fieldClass">
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
        <div v-if="searchable && !searchOnField" :class="searchBar" @click.stop>
          <div :class="searchWrap">
            <MpIcon name="search" :class="searchIcon" />
            <MpInput
              v-model="searchTerm"
              :placeholder="searchPlaceholder ?? 'Search'"
            />
          </div>
        </div>
        <!-- .prevent on mousedown (standard combobox technique) stops the
             browser's default focus-shift-to-the-clicked-item from blurring
             the searchOnField input mid-click. Without it: mousedown on a
             list item blurs the input → onFieldBlur synchronously clears
             fieldText → filteredOptions recomputes back to the full
             unfiltered list → the list re-renders/re-flows *before* the
             browser's mouseup/click land, so the click hits whatever option
             ended up under the cursor in the new layout instead of the one
             the user actually meant, or the popover reopens looking
             unchanged. Harmless for the non-searchOnField list (nothing
             there depends on focus). -->
        <div :class="listWrap" class="px-select-list" @mousedown.prevent>
        <MpPopoverList>
          <template v-for="(grp, gi) in groupedOptions" :key="`g-${gi}`">
            <div v-if="grp.group" :class="groupHeader">{{ grp.group }}</div>
            <MpPopoverListItem
              v-for="opt in grp.items"
              :key="opt.value"
              :is-active="opt.value === modelValue"
              @click="set(opt.value)"
            >
              <slot name="option" :option="opt">
                <div v-if="opt.description" :class="itemBody">
                  <MpText size="label" :class="itemLabel">{{ opt.label }}</MpText>
                  <MpText size="label-small" :class="itemCaption">{{ opt.description }}</MpText>
                </div>
                <div v-else-if="opt.trailing" :class="itemRow">
                  <MpText size="label">{{ opt.label }}</MpText>
                  <MpText size="label" :class="itemCaption">{{ opt.trailing }}</MpText>
                </div>
                <template v-else>{{ opt.label }}</template>
              </slot>
            </MpPopoverListItem>
          </template>
        </MpPopoverList>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
