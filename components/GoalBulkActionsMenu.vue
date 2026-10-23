<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal bulk actions menu
  Just the "Actions" popover trigger + its dropdown list (Update / Edit /
  Close / Delete selected goals) — the part shared between GoalBulkActionBar
  (the full table-header bar) and any other bulk-selection surface that only
  needs the button itself, e.g. an accordion header's inline Actions button
  or a floating bulk bar.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpButton,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpDivider,
  css,
} from '@mekari/pixel3'

const props = withDefaults(defineProps<{ hideUpdateProgress?: boolean, hideEditGoals?: boolean, hideCloseGoals?: boolean }>(), {
  hideUpdateProgress: false,
  hideEditGoals: false,
  hideCloseGoals: false,
})
// Closed tab: only Delete is left — the dropdown collapses to one button.
const hasItemsAboveDelete = computed(() => !props.hideUpdateProgress || !props.hideEditGoals || !props.hideCloseGoals)
defineEmits<{ 'edit-goals': [], 'update-progress': [], 'close-goals': [], 'delete-goals': [] }>()

const dangerText = css({ color: 'text.danger' })
</script>

<template>
  <!-- Closed goals tab: Delete is the only action left, so skip the one-item
       dropdown — a single "Delete goals" button takes the Actions slot. -->
  <MpButton v-if="!hasItemsAboveDelete" variant="primary" @click="$emit('delete-goals')">Delete goals</MpButton>
  <MpPopover v-else is-close-on-select use-portal placement="bottom-start">
    <MpPopoverTrigger>
      <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
    </MpPopoverTrigger>
    <MpPopoverContent>
      <MpPopoverList>
        <MpPopoverListItem v-if="!hideUpdateProgress" @click="$emit('update-progress')">Update selected goals</MpPopoverListItem>
        <MpPopoverListItem v-if="!hideEditGoals" @click="$emit('edit-goals')">Edit selected goals</MpPopoverListItem>
        <MpPopoverListItem v-if="!hideCloseGoals" @click="$emit('close-goals')">Close selected goals</MpPopoverListItem>
        <MpDivider />
        <MpPopoverListItem @click="$emit('delete-goals')">
          <span :class="dangerText">Delete selected goals</span>
        </MpPopoverListItem>
      </MpPopoverList>
    </MpPopoverContent>
  </MpPopover>
</template>
