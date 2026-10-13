<!--
  Migrated from talenta-review (commit 010875214aba): src/components/form/Points.vue
  Component name preserved: PointsInput. Props/events preserved: ratings,
  labelKey, selectedVal, isDisabled, isError; emits `updated`.
  Pixel 2 MpAutocomplete → PxSelectPopover (docs/patterns/form.md).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import type { TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'PointsInput' })

const props = withDefaults(defineProps<{
  ratings: TemplateRating[]
  labelKey?: 'name'
  selectedVal?: string | number
  isDisabled?: boolean
  isError?: boolean
}>(), { labelKey: 'name', selectedVal: '', isDisabled: false, isError: false })

const emit = defineEmits<{ updated: [value: string] }>()

const options = computed(() => props.ratings.map(r => ({ value: String(r.value), label: String(r[props.labelKey] || 'No description') })))
const selected = computed({
  get: () => (props.selectedVal === '' ? '' : String(props.selectedVal)),
  set: (v: string) => emit('updated', v),
})
</script>

<template>
  <PxSelectPopover v-model="selected" :options="options" placeholder="Select rating" width="100%" :is-disabled="isDisabled" />
</template>
