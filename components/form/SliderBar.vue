<!--
  Migrated from talenta-review (commit 010875214aba): src/components/form/SliderBar.vue
  Component name preserved: SliderBar. Props/events preserved: min, max, labels,
  selected; emits `changed`.
  vue-slider-component → Pixel 3 MpSlider.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpSlider, MpText, css } from '@mekari/pixel3'

defineOptions({ name: 'SliderBar' })

const props = withDefaults(defineProps<{
  min?: number
  max?: number
  labels?: { min?: string, max?: string }
  selected?: number | string
}>(), { min: 0, max: 100, labels: () => ({ min: '0%', max: '100%' }), selected: 0 })

const emit = defineEmits<{ changed: [value: number] }>()

const sliderVal = computed(() => {
  const v = Number(props.selected)
  return v < props.min || v > props.max ? props.min : v || props.min
})

const row = css({ display: 'flex', alignItems: 'center', gap: '8px', height: '38px' })
const caption = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const grow = css({ flex: '1' })
</script>

<template>
  <div :class="row">
    <MpText v-if="labels.min" :class="caption">{{ labels.min }}</MpText>
    <div :class="grow">
      <MpSlider :value="sliderVal" :min="min" :max="max" :step="0.01" @input="(v: number | string) => emit('changed', Number(v))">
        <template #label><span /></template>
        <template #value><span /></template>
        <template #min><span /></template>
        <template #max><span /></template>
      </MpSlider>
    </div>
    <MpText v-if="labels.max" :class="caption">{{ labels.max }}</MpText>
  </div>
</template>
