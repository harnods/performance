<!--
  Body copy of the bulk "Close N goals?" confirm modal. `parentCount` = how many
  of the selected goals have open aligned goals; with any, it lists three short
  points (UX-writing variant — docs/ux-writing-review-goal-close-locked.md).
  Bullet list = the same plain <ul> + css() as the banner's multi-point list.
-->
<script setup lang="ts">
import { MpText, css } from '@mekari/pixel3'

defineProps<{ parentCount: number }>()
const text = css({ color: 'text.default' })
const list = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingLeft: '5', listStyleType: 'disc', fontSize: '14px', lineHeight: '20px', color: 'text.default' })
</script>

<template>
  <ul v-if="parentCount > 0" :class="list">
    <li>Aligned goals of {{ parentCount }} selected goal{{ parentCount === 1 ? '' : 's' }} can no longer update their progress.</li>
    <li>Closed goals can't be reopened.</li>
    <li>Goals owned by direct reports are sent for approval first.</li>
  </ul>
  <MpText v-else size="label" :class="text">Once closed, these goals can no longer submit progress or be edited. Goals owned by direct reports are sent for approval first.</MpText>
</template>
