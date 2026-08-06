<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal bulk action bar
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4831:33085)

  Replaces the table's own header row (thead) on every goal-listing page
  (All/Company/Organization/Team/Individual goals) once 1+ rows are
  checkbox-selected — the filter bar above the table stays untouched. Fixed
  52px height per the source frame, light gray fill + bottom border, flush
  with the table like the column-header row it replaces.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpCheckbox,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpDivider,
  css,
} from '@mekari/pixel3'

defineProps<{ selectedCount: number, isAllSelected: boolean }>()
const emit = defineEmits<{ clear: [], 'edit-goals': [], 'update-progress': [], 'close-goals': [], 'delete-goals': [], 'toggle-select-all': [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('clear')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const bar = css({
  // Match the normal column-header row height so selecting rows doesn't make
  // the header grow taller. Background + bottom border are owned by the host
  // <th> so the bar can sit at the cell's own left padding — keeping its
  // select-all checkbox aligned with the body checkbox column — while the
  // fill still covers the full cell width (no two-tone header).
  height: '40px', paddingInline: '0',
})
const valueText = css({ color: 'text.default' })
const hintText = css({ color: 'text.secondary' })
const dangerText = css({ color: 'text.danger' })
</script>

<template>
  <MpFlex align="center" justify="space-between" :class="bar">
    <MpFlex align="center" gap="4">
      <MpFlex align="center" gap="2">
        <!-- Selection is always 1+ here (the bar only shows once something's
             selected), so this is either fully checked or partial — never
             unchecked. Clicking it selects everything in scope, same as the
             equivalent "select all" checkbox in the normal header row. -->
        <MpCheckbox
          :is-checked="isAllSelected"
          :is-indeterminate="!isAllSelected"
          aria-label="Select all"
          @update:is-checked="$emit('toggle-select-all')"
        />
        <MpText size="label" weight="semiBold" :class="valueText">{{ selectedCount }} goal{{ selectedCount === 1 ? '' : 's' }} selected</MpText>
      </MpFlex>
      <MpPopover is-close-on-select use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem @click="$emit('update-progress')">Update selected goals</MpPopoverListItem>
            <MpPopoverListItem @click="$emit('edit-goals')">Edit selected goals</MpPopoverListItem>
            <MpPopoverListItem @click="$emit('close-goals')">Close selected goals</MpPopoverListItem>
            <MpDivider />
            <MpPopoverListItem @click="$emit('delete-goals')">
              <span :class="dangerText">Delete selected goals</span>
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
    </MpFlex>
    <MpText size="label" :class="hintText">Press esc to deselect</MpText>
  </MpFlex>
</template>
