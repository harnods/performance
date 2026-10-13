<script setup lang="ts">
import { MpButton } from '@mekari/pixel3'

// Edit cycle — Evaluation cycles. Same form as Create new cycle, pre-filled from
// the saved cycle, with Employment status and Employee filter locked (PRD D4).
// Like the detail page, the cycle is identified by `?name=`.
definePageMeta({
  title: 'Edit cycle',
  layout: 'default',
  breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' },
})

const route = useRoute()
const cycleName = computed(() => String(route.query.name || 'Probation Evaluation – Batch Jan 2026'))
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="secondary" right-icon="caret-down">Help</MpButton>
  </Teleport>

  <EvaluationCycleForm :key="cycleName" mode="edit" :initial-name="cycleName" />
</template>
