<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Review goal submission

  Reached from the "Awaiting approval" tab's table (GoalApprovalQueue.vue).
  The actual review body (accordions, diffs, decision block) lives in
  components/GoalSubmissionReview.vue, shared with the Inbox's cross-cycle
  split-view page (pages/inbox/awaiting-approval/goals.vue) — this page just
  supplies the standalone-page chrome (breadcrumb, title) and redirects back
  to the goal cycle once approved.
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
const router = useRouter()
const cycleId = route.params.id as string
const submissionId = route.params.submissionId as string

const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === cycleId))

function onApproved() {
  router.push({ path: `/goals/goal-cycles/${cycleId}`, query: { name: cycle.value?.name } })
}

const pageWrap = css({ paddingBottom: '10' })
</script>

<template>
  <MpFlex direction="column" :class="pageWrap">
    <GoalSubmissionReview :cycle-id="cycleId" :submission-id="submissionId" :padded="false" @approved="onApproved" />
  </MpFlex>
</template>
