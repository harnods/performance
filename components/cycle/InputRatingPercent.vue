<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/reviews/cycle/components/InputRatingPercent.vue
  Component name preserved: InputRatingPercent. Props/events preserved: template,
  value, isDisabled, ratings, errors; emits `updated`.
  Rating MpSelect → PxSelectPopover (docs/patterns/form.md).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormErrorMessage, MpInput, MpInputGroup, MpInputRightAddon } from '@mekari/pixel3'
import { formatInputScore, type TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'InputRatingPercent' })

const props = withDefaults(defineProps<{
  template?: { answer_type?: string, is_allow_value?: number | boolean }
  value?: string | number
  isDisabled?: boolean
  ratings?: TemplateRating[]
  errors?: string[]
}>(), { template: () => ({}), value: '', isDisabled: false, ratings: () => [], errors: () => [] })

const emit = defineEmits<{ updated: [value: string] }>()

const score = ref(props.value ? String(Number.parseFloat(String(props.value))) : '')
watch(() => props.value, (v) => { if (v) score.value = String(v) })
watch(score, v => emit('updated', v))

const answerType = computed(() => props.template?.answer_type)
const isInputPercentage = computed(() => answerType.value === 'percent' || answerType.value === 'point')
const ratingOptions = computed(() => props.ratings.map(r => ({ value: String(r.value), label: `${r.value} - ${r.name}` })))
</script>

<template>
  <MpFormControl :is-disabled="isDisabled" :is-invalid="Boolean(errors.length)">
    <MpInputGroup v-if="isInputPercentage">
      <MpInput :model-value="score" @update:model-value="(v: string) => (score = formatInputScore(v))" />
      <MpInputRightAddon>%</MpInputRightAddon>
    </MpInputGroup>
    <PxSelectPopover v-if="answerType === 'rating'" v-model="score" :options="ratingOptions" placeholder="Select rating" width="100%" data-qa="input-rating-percent-select-rating" />
    <MpFormErrorMessage>
      <div v-for="(error, errIdx) in errors" :key="errIdx">{{ error }}</div>
    </MpFormErrorMessage>
  </MpFormControl>
</template>
