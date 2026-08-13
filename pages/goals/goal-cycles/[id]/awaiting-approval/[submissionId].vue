<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Review goal submission

  Reached from the "Awaiting approval" tab's table (GoalApprovalQueue.vue).
  The actual review body (accordions, diffs, decision block) lives in
  components/GoalSubmissionReview.vue, shared with the Inbox's cross-cycle
  split-view page (pages/inbox/awaiting-approval/goals.vue) — this page just
  supplies the standalone-page chrome (breadcrumb, title).

  A decision does NOT navigate away: approving leaves the reviewer on this
  page, where the same review body re-renders into its approved state (and
  its own success toast fires). Rejecting already stayed put, so both
  outcomes now behave the same way.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpFlex, css } from '@mekari/pixel3'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
  title: 'Review submission',
})

const route = useRoute()
const cycleId = route.params.id as string
const submissionId = route.params.submissionId as string

const pageWrap = css({ paddingBottom: '10' })
</script>

<template>
  <MpFlex direction="column" :class="pageWrap">
    <GoalSubmissionReview :cycle-id="cycleId" :submission-id="submissionId" :padded="false" />
  </MpFlex>
</template>
