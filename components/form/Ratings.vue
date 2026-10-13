<!--
  Migrated from talenta-review (commit 010875214aba): src/components/form/Ratings.vue
  Component name preserved: Ratings. Props/events preserved: ratings, valueKey,
  labelKey, selectedVal, resultPoint, isLayered, preventValidation, isError,
  isDisabled; emits `updated`, `updated-point`.
  Pixel 2 MpAutocomplete → PxSelectPopover (docs/patterns/form.md).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormErrorMessage, MpInput, css } from '@mekari/pixel3'
import { formatInputScore, type TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'Ratings' })

const props = withDefaults(defineProps<{
  ratings: TemplateRating[]
  valueKey?: 'value'
  labelKey?: 'name'
  selectedVal?: string | number
  resultPoint?: string | number
  isLayered?: boolean
  preventValidation?: boolean
  isError?: boolean
  isDisabled?: boolean
}>(), { valueKey: 'value', labelKey: 'name', selectedVal: '', resultPoint: '', isLayered: false, preventValidation: false, isError: false, isDisabled: false })

const emit = defineEmits<{ 'updated': [value: string], 'updated-point': [value: string] }>()

const isValidationPoint = ref(false)

const options = computed(() => props.ratings.map(r => ({
  value: String(r[props.valueKey]),
  label: `${r[props.valueKey]} - ${r[props.labelKey] || 'No description'}`,
})))
const objSelectedVal = computed(() => props.ratings.find(r => Number(r[props.valueKey]) === Number(props.selectedVal) && props.selectedVal !== ''))
const selected = computed({
  get: () => (objSelectedVal.value ? String(objSelectedVal.value[props.valueKey]) : ''),
  set: (v: string) => { isValidationPoint.value = true; emit('updated', v) },
})
const pointPlaceholder = computed(() => (objSelectedVal.value ? `${objSelectedVal.value.from || 'XX'} - ${objSelectedVal.value.to || 'XX'}` : 'Input point'))
const isValidPoint = computed(() => {
  if (!isValidationPoint.value || props.preventValidation) return true
  if (props.resultPoint === '') return false
  const o = objSelectedVal.value
  return o ? Number(o.from) <= Number(props.resultPoint) && Number(props.resultPoint) <= Number(o.to) : true
})
const errorPointMessage = computed(() => {
  if (props.resultPoint === '') return 'This field is required'
  const o = objSelectedVal.value
  if (o && Number(props.resultPoint) < Number(o.from)) return `Min point is ${o.from}`
  if (o && Number(props.resultPoint) > Number(o.to)) return `Max point is ${o.to}`
  return 'Out of the point range'
})
function onPoint(v: string) {
  isValidationPoint.value = true
  emit('updated-point', formatInputScore(v))
}

const row = css({ display: 'flex', gap: '3' })
const grow = css({ flex: '1', minWidth: '0' })
const pointCol = css({ width: '100px', flexShrink: '0' })
</script>

<template>
  <div :class="row">
    <div :class="grow">
      <PxSelectPopover v-model="selected" :options="options" placeholder="Select rating" width="100%" :is-disabled="isDisabled" />
    </div>
    <div v-if="isLayered" :class="pointCol">
      <MpFormControl :is-invalid="!isValidPoint" :is-disabled="!objSelectedVal || isDisabled">
        <MpInput :model-value="String(resultPoint)" :placeholder="pointPlaceholder" inputmode="decimal" @update:model-value="onPoint" />
        <MpFormErrorMessage>{{ errorPointMessage }}</MpFormErrorMessage>
      </MpFormControl>
    </div>
  </div>
</template>
