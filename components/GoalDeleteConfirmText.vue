<!--
  Body copy of the single "Delete goal?" confirm modal. With aligned goals it
  lists the effects as bullets (same plain <ul> + css() as the banner/bulk-close
  lists); otherwise the original sentence. Copy: docs/ux-writing-review-goal-close-locked.md.
-->
<script setup lang="ts">
import { MpText, css } from '@mekari/pixel3'
import type { Goal } from '~/composables/useGoalsStore'

defineProps<{ goal: Goal | null, alignedCount: number }>()
const text = css({ color: 'text.default' })
const list = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingLeft: '5', listStyleType: 'disc', fontSize: '14px', lineHeight: '20px', color: 'text.default' })
</script>

<template>
  <ul v-if="alignedCount > 0" :class="list">
    <li><strong>{{ goal?.title }}</strong> will be permanently deleted and cannot be recovered.</li>
    <li>{{ alignedCount }} aligned goal{{ alignedCount === 1 ? '' : 's' }} will lose this alignment.</li>
    <li v-if="goal && needsApproval(goal.ownerId)">This delete will be sent to the manager for approval before it takes effect.</li>
  </ul>
  <MpText v-else :class="text">
    <strong>{{ goal?.title }}</strong> will be permanently deleted and cannot be recovered.<template v-if="goal && needsApproval(goal.ownerId)"> This delete will be sent to the manager for approval before it takes effect.</template>
  </MpText>
</template>
