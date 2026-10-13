<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/reviews/performance-review/pending-action/components/ReviewFormBlock.vue
  Component name preserved: ReviewFormBlock. Props/events preserved: answerType,
  indicator, template, value, point, errors, errorsPoint, isDisabled, ratingsKey,
  isGoal; emits `updated`, `updated-point`.
  Only the template-preview use is migrated (the review submission flow is not).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpTextarea, MpRadio, MpInput, MpInputGroup, MpInputRightAddon, css } from '@mekari/pixel3'
import { formatInputScore, type TemplateIndicator, type TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'ReviewFormBlock' })

interface PreviewTemplate {
  is_custom_points_enabled?: boolean
  is_indicator_rating?: boolean | string
  is_layered_scoring?: boolean
  is_allow_value?: boolean | number
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  answerType?: string
  indicator?: TemplateIndicator
  template: PreviewTemplate
  value?: string | number
  point?: string | number
  errors?: string[]
  errorsPoint?: string[]
  isDisabled?: boolean
  ratingsKey?: string
  isGoal?: boolean
}>(), { answerType: '', indicator: () => ({ name: '', weight: 0, answer_type: null }), value: '', point: '', errors: () => [], errorsPoint: () => [], isDisabled: false, ratingsKey: 'private_ratings', isGoal: false })

const emit = defineEmits<{ 'updated': [value: string | number], 'updated-point': [value: string | number] }>()

const defaultOpts = [{ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' }]
const dataVal = ref<string | number>(props.value)
const dataPoint = ref<string | number>(props.point)
watch(dataVal, v => emit('updated', v))
watch(dataPoint, v => emit('updated-point', v))
watch(() => props.value, (v) => { if (v !== undefined && v !== null) dataVal.value = v })
watch(() => props.point, (v) => { if (v !== undefined && v !== null) dataPoint.value = v })

const isUnlimitedPercentage = computed(() => Boolean(Number(props.template?.is_allow_value)))
const isErrorAPI = computed(() => props.errors.length > 0)
const templateRatings = computed(() => (props.template[props.ratingsKey] as TemplateRating[] | undefined) ?? [])
const isIndicatorRating = computed(() => Boolean(Number(props.template.is_indicator_rating)) || props.template.is_indicator_rating === true)

const radioRow = css({ display: 'flex', alignItems: 'center', gap: '40px', minHeight: '36px' })
const freeTextArea = css({ height: '89px', minHeight: '89px' })
const percentRow = css({ display: 'flex', alignItems: 'center', gap: '32px', height: '38px' })
const grow = css({ flex: '1' })
const percentCol = css({ width: '100px', flexShrink: '0' })
const errorText = css({ color: 'text.danger', fontSize: '12px', lineHeight: '16px', marginTop: '1' })
</script>

<template>
  <div>
    <!-- Point -->
    <template v-if="answerType === 'point'">
      <FormPoints
        :ratings="template.is_custom_points_enabled ? (indicator.ratings ?? []) : templateRatings"
        :selected-val="dataVal"
        :is-error="isErrorAPI"
        :is-disabled="isDisabled"
        @updated="(v) => (dataVal = v)"
      />
    </template>

    <!-- Rating -->
    <template v-if="answerType === 'rating'">
      <FormRatings
        :ratings="!isIndicatorRating || isGoal ? templateRatings : (indicator.ratings ?? [])"
        :selected-val="dataVal"
        :result-point="dataPoint"
        :is-layered="Boolean(template.is_layered_scoring)"
        :is-error="isErrorAPI"
        :is-disabled="isDisabled"
        @updated="(v) => (dataVal = v)"
        @updated-point="(v) => (dataPoint = v)"
      />
    </template>

    <!-- Free text -->
    <MpFormControl v-else-if="answerType === 'free-text'" :is-invalid="isErrorAPI" data-qa="review-form-block-textarea-free-text">
      <MpTextarea :class="freeTextArea" :model-value="String(dataVal)" @update:model-value="(v: string) => (dataVal = v)" />
    </MpFormControl>

    <!-- Yes/No -->
    <MpFormControl v-else-if="answerType === 'yes-no'" :is-invalid="isErrorAPI" data-qa="review-form-block-radio-group-yes-no">
      <div :class="radioRow">
        <MpRadio
          v-for="opt in defaultOpts"
          :key="opt.value"
          :value="opt.value"
          :is-checked="dataVal === opt.value"
          :data-qa="`view-review-form-block-option-${opt.value}`"
          @update:is-checked="() => (dataVal = opt.value)"
        >
          {{ opt.name }}
        </MpRadio>
      </div>
    </MpFormControl>

    <!-- Percentage -->
    <div v-else-if="answerType === 'percent'" :class="percentRow">
      <div v-if="!isUnlimitedPercentage" :class="grow">
        <FormSliderBar :selected="dataVal" @changed="(v) => (dataVal = v)" />
      </div>
      <MpFormControl :is-invalid="isErrorAPI" :class="percentCol" data-qa="review-form-block-input-percent">
        <MpInputGroup>
          <MpInput :model-value="String(dataVal)" @update:model-value="(v: string) => (dataVal = formatInputScore(v))" />
          <MpInputRightAddon>%</MpInputRightAddon>
        </MpInputGroup>
      </MpFormControl>
    </div>

    <template v-if="isErrorAPI">
      <div v-for="(error, errIdx) in errors" :key="errIdx" :class="errorText">{{ error.includes('required') ? 'This field is required' : error }}</div>
    </template>
  </div>
</template>
