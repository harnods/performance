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

withDefaults(defineProps<{ hideUpdateProgress?: boolean, hideCloseGoals?: boolean }>(), {
  hideUpdateProgress: false,
  hideCloseGoals: false,
})
defineEmits<{ 'edit-goals': [], 'update-progress': [], 'close-goals': [], 'delete-goals': [] }>()

const dangerText = css({ color: 'text.danger' })
</script>

<template>
  <MpPopover is-close-on-select use-portal placement="bottom-start">
    <MpPopoverTrigger>
      <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
    </MpPopoverTrigger>
    <MpPopoverContent>
      <MpPopoverList>
        <MpPopoverListItem v-if="!hideUpdateProgress" @click="$emit('update-progress')">Update selected goals</MpPopoverListItem>
        <MpPopoverListItem @click="$emit('edit-goals')">Edit selected goals</MpPopoverListItem>
        <MpPopoverListItem v-if="!hideCloseGoals" @click="$emit('close-goals')">Close selected goals</MpPopoverListItem>
        <MpDivider />
        <MpPopoverListItem @click="$emit('delete-goals')">
          <span :class="dangerText">Delete selected goals</span>
        </MpPopoverListItem>
      </MpPopoverList>
    </MpPopoverContent>
  </MpPopover>
</template>
