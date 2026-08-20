<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal floating bulk bar

  Shown on Organization/Team/Individual goals when the current selection
  spans MORE THAN ONE department — there's no single accordion header left
  to anchor an inline Actions button to (see GoalBulkActionsMenu, used
  inline in the accordion header for the single-department case), so the
  bulk action surface floats at the bottom of the viewport instead.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpFlex, MpText, css } from '@mekari/pixel3'

withDefaults(defineProps<{ selectedCount: number, hideUpdateProgress?: boolean, hideCloseGoals?: boolean }>(), {
  hideUpdateProgress: false,
  hideCloseGoals: false,
})
defineEmits<{ 'edit-goals': [], 'update-progress': [], 'close-goals': [], 'delete-goals': [] }>()

const bar = css({
  position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: '20',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10',
  background: 'background.neutral', padding: '3',
  borderWidth: '1px', borderStyle: 'solid', borderColor: 'gray.400', borderRadius: '12px',
  boxShadow: '0px 4px 16px rgba(16, 24, 40, 0.12)',
})
const valueText = css({ color: 'text.default', whiteSpace: 'nowrap' })
</script>

<template>
  <MpFlex :class="bar">
    <MpText size="label" weight="semiBold" :class="valueText">{{ selectedCount }} goal{{ selectedCount === 1 ? '' : 's' }} selected</MpText>
    <GoalBulkActionsMenu
      :hide-update-progress="hideUpdateProgress"
      :hide-close-goals="hideCloseGoals"
      @update-progress="$emit('update-progress')"
      @edit-goals="$emit('edit-goals')"
      @close-goals="$emit('close-goals')"
      @delete-goals="$emit('delete-goals')"
    />
  </MpFlex>
</template>
