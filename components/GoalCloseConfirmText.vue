<!--
  Body copy of the single "Close goal?" confirm modal (Goal Detail, cycle index
  and the four type pages). Variants (docs/ux-writing-review-goal-close-locked.md):
  - aligned goals → the effects as bullets (this goal is locked; aligned goals can no
    longer update progress). If the close needs manager approval an intro line comes
    first, because nothing locks until the manager approves;
  - no aligned goals → the original sentence.
  Bullet list = the same plain <ul> + css() as the banner's multi-point list.
-->
<script setup lang="ts">
import { MpText, css } from '@mekari/pixel3'
import type { Goal } from '~/composables/useGoalsStore'

const props = defineProps<{ goal: Goal | null, alignedCount: number }>()
const text = css({ color: 'text.default' })
const list = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingLeft: '5', listStyleType: 'disc', fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const listAfterIntro = css({ marginTop: '2' })
const requiresApproval = computed(() => !!props.goal && needsApproval(props.goal.ownerId))
</script>

<template>
  <template v-if="alignedCount > 0">
    <MpText v-if="requiresApproval" size="label" :class="text">Closing this goal needs the manager's approval. Once approved:</MpText>
    <ul :class="[list, requiresApproval && listAfterIntro]">
      <li>This goal will be locked and can't be reopened.</li>
      <li>{{ alignedCount }} aligned goal{{ alignedCount === 1 ? '' : 's' }} can no longer update {{ alignedCount === 1 ? 'its' : 'their' }} progress.</li>
    </ul>
  </template>
  <MpText v-else size="label" :class="text">
    Once a goal has closed, {{ goal?.title }} can no longer submit progress or be edited.<template v-if="requiresApproval"> This close will be sent to the manager for approval before it takes effect.</template>
  </MpText>
</template>
