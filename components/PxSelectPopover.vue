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
  // Search always happens in the field itself: `searchable` and
  // `searchOnField` are synonyms that turn the closed field into a text input
  // that filters the list as you type. There is no search bar inside the
  // popover. See docs/patterns/form.md.
  searchable?: boolean
  /** @deprecated No popover search bar any more; the field uses `placeholder`. */
  searchPlaceholder?: string
  searchOnField?: boolean
  // Creatable (implies field search): when the typed text matches no option,
  // the list offers a centred `Add “<text>”` row. Picking it sets the
  // value. Nothing is committed per keystroke. Used for open vocabularies
  // (IDP objective, action-plan category). See docs/patterns/form.md.
  allowCustomValue?: boolean
  // Source list is empty (nothing to search): centred message + divider + blue
  // link row, same shape as the "Results not found" + Add row. The link opens
  // `emptyActionHref` in a new tab. See docs/patterns/form.md.
  emptyText?: string
  emptyActionLabel?: string
  emptyActionHref?: string
  /** @deprecated The Add row no longer names the type. */
  customValueLabel?: string
  // Character cap for the `searchOnField` input, so a free-text field can carry
  // the same limit its character counter advertises.
  maxlength?: number
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

// ⚠️ MpSelect writes the native <select>'s value during its own setup, before
// this component's <option> children exist in the DOM — so the browser drops a
// value that was already known at mount time and the field renders its
// placeholder instead. It only looks fine when the value arrives from a later
// user interaction (options exist by then), which is why every *create* form
// works and a pre-seeded *edit* form does not.
// Re-apply the value ourselves once the options have rendered.
const rootEl = ref<HTMLElement | null>(null)
const onField = computed(() => !!(props.searchable || props.searchOnField || props.allowCustomValue))
function syncNativeSelect() {
  if (!import.meta.client || onField.value) return
  const el = rootEl.value?.querySelector('select')
  if (el && el.value !== (props.modelValue ?? '')) el.value = props.modelValue ?? ''
}
onMounted(() => nextTick(syncNativeSelect))
watch(() => [props.modelValue, props.options.length], () => nextTick(syncNativeSelect))

// `is-adaptive-width` on MpPopover only sets the popover's *min-width* to the
// trigger's width — the panel still sizes to `max-content`, so a long option
// label/description (like a competency's description) pushes it wider than
// the field. Measure the trigger ourselves and pass an explicit `width` to
// MpPopoverContent (merged in *after* MpPopover's own style, so it wins) to
// cap the panel at exactly the field's width.
const triggerWidth = ref(0)
let triggerObserver: ResizeObserver | undefined
function observeTriggerWidth() {
  if (!import.meta.client || !rootEl.value) return
  triggerWidth.value = rootEl.value.getBoundingClientRect().width
  triggerObserver = new ResizeObserver(([entry]) => {
    if (entry) triggerWidth.value = entry.contentRect.width
  })
  triggerObserver.observe(rootEl.value)
}
onMounted(() => nextTick(observeTriggerWidth))
onBeforeUnmount(() => triggerObserver?.disconnect())
const popoverContentStyle = computed(() => (triggerWidth.value ? { width: `${triggerWidth.value}px` } : undefined))

// ─── searchOnField mode — the field is the search box ───────────────────────
// The popover's own open/close (click trigger, click-outside, close-on-select)
// is untouched — MpPopoverTrigger opens on click same as it did wrapping the
// old disabled-look MpSelect, and stays open while typing since nothing here
// blurs the field. Only the *displayed text* needs managing: cleared on focus
// so typing starts fresh, and reverted to the current selection's label on
// blur so an abandoned, unselected search doesn't stick around.
// A custom (created) value has no option, so it falls back to the raw value.
const selectedLabel = computed(() =>
  props.options.find(o => o.value === props.modelValue)?.label
  ?? (props.allowCustomValue ? (props.modelValue ?? '') : ''),
)
const fieldText = ref(selectedLabel.value)
const isEditingField = ref(false)
// Did the user type during this focus? Only then may an emptied field clear.
const hasTyped = ref(false)
watch(selectedLabel, (label) => { if (!isEditingField.value) fieldText.value = label })
function onFieldFocus() {
  isEditingField.value = true
  hasTyped.value = false
  fieldText.value = ''
}
function onFieldBlur() {
  isEditingField.value = false
  if (hasTyped.value && !fieldText.value.trim() && props.isClearable) emit('update:modelValue', '')
  fieldText.value = selectedLabel.value
}
function onFieldInput() {
  hasTyped.value = true
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

const activeSearchTerm = computed(() => (onField.value && isEditingField.value ? fieldText.value.trim() : ''))
const filteredOptions = computed(() =>
  !activeSearchTerm.value
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
  fieldText.value = props.options.find(o => o.value === v)?.label ?? v
}

// Creatable: offer `Add "<text>" as a <label>` unless the text already matches
// an option label exactly (case-insensitive).
const createCandidate = computed(() => {
  if (!props.allowCustomValue) return ''
  const t = activeSearchTerm.value
  if (!t || props.options.some(o => o.label.toLowerCase() === t.toLowerCase())) return ''
  return t
})
// The popover stays open while typing, so an empty result needs a message
// rather than an empty bordered box.
// Same box as MpPopoverListItem (8px 12px, 14/20), so it lines up with options.
const noResults = css({ padding: '8px 12px', fontSize: '14px', lineHeight: '20px', color: 'text.secondary', textAlign: 'left', width: '100%' })
const createItem = css({ justifyContent: 'center', paddingBlock: '16px' })
const createItemDivider = css({ borderTop: '1px solid', borderTopColor: 'border.default' })
// The list's own 8px bottom padding sits under the link row; drop it so the link row ends flush.
const emptyList = css({ paddingBottom: '0 !important' })
const emptyCentered = css({ textAlign: 'center', paddingBlock: '16px' })
const emptyLink = css({ display: 'block', width: '100%', textAlign: 'center', paddingBlock: '16px', fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.link', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const createText = css({ width: '100%', textAlign: 'center', color: 'text.link' })

// searchOnField's trigger swaps MpSelect for a real MpInputGroup/MpInput field
// (same chevrons-down-addon look as DashMultiSelectSearch.vue's own select-like
// search trigger) — clicking it opens the popover exactly like clicking the
// old disabled select did, no extra wiring needed for that part.
const fieldGroupClass = css({ cursor: 'text' })
</script>

<template>
  <div ref="rootEl" :style="wrapperStyle">
    <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start" :is-disabled="isDisabled">
      <MpPopoverTrigger>
        <MpFlex v-if="onField" :class="isDisabled ? undefined : fieldGroupClass">
          <MpInputGroup :class="css({ width: '100%' })">
            <MpInput
              v-model="fieldText"
              :placeholder="placeholder"
              :is-disabled="isDisabled"
              :maxlength="maxlength"
              autocomplete="off"
              @update:model-value="onFieldInput"
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
      <MpPopoverContent :style="popoverContentStyle">
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
        <MpPopoverList :class="!options.length && emptyText ? emptyList : undefined">
          <!-- Non-interactive row, padded exactly like MpPopoverListItem.
               Creatable selects skip it: the "Add" link is the whole answer. -->
          <template v-if="!options.length && emptyText">
            <div :class="[noResults, emptyCentered]">{{ emptyText }}</div>
            <a v-if="emptyActionLabel && emptyActionHref" :href="emptyActionHref" target="_blank" rel="noopener" :class="[emptyLink, createItemDivider]">+ {{ emptyActionLabel }}</a>
          </template>
          <div v-else-if="!filteredOptions.length && !createCandidate" :class="noResults">No results found</div>
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
          <!-- Creatable: a centred link-coloured "Add “text”" row. When options
               match it sits under them, split off by a default top border. -->
          <MpPopoverListItem v-if="createCandidate" :class="[createItem, filteredOptions.length && createItemDivider]" @click="set(createCandidate)">
            <span :class="createText">Add “{{ createCandidate }}”</span>
          </MpPopoverListItem>
        </MpPopoverList>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
