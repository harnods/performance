<script setup lang="ts">
import { MpButton } from '@mekari/pixel3'

definePageMeta({
  title: 'Create new cycle',
  layout: 'default',
  breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' },
})

const route = useRoute()

// Cycle purpose drives which form renders (production Create.vue → EvaluationForm
// for probation, GeneralForm for performance/competency). Default 'performance'
// mirrors production; the Review Cycles list always passes an explicit purpose.
const purpose = ((route.query.purpose as string) || 'performance') as 'performance' | 'competency' | 'evaluation'
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="secondary" right-icon="caret-down">Help</MpButton>
  </Teleport>

  <!-- Performance / Competency review use the shared General form (production
       parity: Create.vue → GeneralForm). Evaluation has its own form, shared
       with Edit cycle. -->
  <EvaluationCycleForm
    v-if="purpose === 'evaluation'"
    :initial-name="(route.query.name as string) || ''"
  />
  <CycleGeneralForm
    v-else
    :purpose="purpose"
    :initial-name="(route.query.name as string) || ''"
  />
</template>
