<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/LegendListForm.vue
  Component name preserved: LegendListForm. Props/events preserved: title,
  legendsData, isRating, ratings, isDisabled, errors, unlimitedPercentage,
  isLayeredScoring, isNotAddable, isViewOnly, legendHeader; emits `updated`.
  vue-swatches → Pixel 3 MpColorPicker (same 16-colour preset).
  vuelidate → local check exposed as `validate()`.
  Like production, rows are edited in place on the parent-owned array.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormErrorMessage, MpInput, MpInputGroup, MpInputRightAddon, MpButton, MpText, MpIcon, MpColorPicker, toast, css } from '@mekari/pixel3'
import { LEGEND_COLOR_PRESET, formatInputScore, type TemplateLegend, type TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'LegendListForm' })

const uid = useId()

const props = withDefaults(defineProps<{
  title?: string
  legendsData?: TemplateLegend[]
  isRating?: boolean
  isPercent?: boolean
  ratings?: TemplateRating[]
  isDisabled?: boolean
  errors?: Record<string, string[] | string>
  unlimitedPercentage?: boolean
  isLayeredScoring?: boolean
  isNotAddable?: boolean
  isViewOnly?: boolean
  legendHeader?: { range: string, description: string } | null
}>(), { title: '', legendsData: () => [], isRating: false, isPercent: false, ratings: () => [], isDisabled: false, errors: () => ({}), unlimitedPercentage: false, isLayeredScoring: false, isNotAddable: false, isViewOnly: false, legendHeader: null })

const emit = defineEmits<{ updated: [legends: TemplateLegend[]] }>()

const legends = computed(() => props.legendsData)
watch(legends, v => emit('updated', v), { deep: true, immediate: true })

// First legend always starts at the first rating (value, or `from` when layered).
watch(() => props.ratings, (val) => {
  if (val.length && legends.value[0]) legends.value[0].from = (props.isLayeredScoring ? val[0]?.from : val[0]?.value) ?? 0
}, { deep: true, immediate: true })

const lastValueLegend = computed(() => {
  if (props.isRating) {
    const last = props.ratings[props.ratings.length - 1]
    if (!last) return 0
    if (props.isLayeredScoring) return Number.parseFloat(String(last.to || last.from))
    return Number.parseInt(String(last.value), 10)
  }
  return props.unlimitedPercentage ? 999.99 : 100
})

const touched = ref<Set<number>>(new Set())
const touchedAll = ref(false)
const descError = (idx: number) => ((touchedAll.value || touched.value.has(idx)) && !legends.value[idx]?.description?.trim() ? 'This field is required' : '')
const serverError = (key: string) => {
  const e = props.errors[key]
  return Array.isArray(e) ? e.join(' ') : (e ?? '')
}
function touch(idx: number) { touched.value = new Set(touched.value).add(idx) }

function notifyError(title: string) {
  toast.notify({ id: 'template-legend-error', position: 'top-center', variant: 'error', title })
}

function addLegend() {
  const errVal = props.isRating ? `${lastValueLegend.value} (max ${props.isLayeredScoring ? 'point' : 'rating'})` : `${lastValueLegend.value}%`
  const last = legends.value[legends.value.length - 1]
  const lastTo = Number.parseFloat(String(last.to))
  const lastFrom = Number.parseFloat(String(last.from))
  if (lastTo >= lastValueLegend.value) {
    notifyError(`The maximum value of legend must be ${errVal}`)
  }
  else if ((lastTo >= 0 && lastTo < lastFrom) || (!lastTo && lastTo !== 0)) {
    if (!props.unlimitedPercentage && props.isRating) last.to = lastValueLegend.value
    notifyError('To value must be greater or equal to from value')
  }
  else {
    legends.value.push({
      from: (lastTo + 0.01).toFixed(2),
      to: props.unlimitedPercentage && !props.isRating ? null : Number.parseFloat(String(lastValueLegend.value)),
      description: '',
      color: '#00b662',
    })
  }
}
function removeLegend(idx: number) {
  let from: string | number = 0
  if (idx === 0 && props.isRating) from = (props.isLayeredScoring ? props.ratings[0]?.from : props.ratings[0]?.value) ?? 0
  else if (idx !== 0) from = Number.parseFloat(String(legends.value[idx - 1].to)) + 0.01
  const next = legends.value[idx + 1]
  if (next) next.from = from
  legends.value.splice(idx, 1)
}

function validate() {
  touchedAll.value = true
  return legends.value.every(l => Boolean(l.description?.trim()))
}
defineExpose({ validate })

const titleClass = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default', marginBottom: '4' })
const titleRow = css({ display: 'flex', alignItems: 'center', gap: '1', marginBottom: '4' })
const titleText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const list = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const row = css({ display: 'flex', gap: '2', alignItems: 'flex-start' })
const col = css({ display: 'flex', flexDirection: 'column', gap: '1' })
const grow = css({ flex: '1', minWidth: '0' })
const headerCell = css({ height: '24px', fontWeight: '600' })
const rangeRow = css({ display: 'flex', alignItems: 'flex-start' })
const rangeInputPercent = css({ width: '96px', flexShrink: '0', '& input': { width: '100%', minWidth: '0' } })
const rangeInput = css({ width: '70px', flexShrink: '0', '& input': { width: '100%', minWidth: '0' } })
const dash = css({ width: '8px', height: '2px', background: 'border.bold', marginInline: '2', marginTop: '17px', flexShrink: '0' })
const errorText = css({ color: 'text.danger', fontSize: '12px', lineHeight: '16px', marginTop: '1' })
const swatchBtn = css({ width: '36px', height: '36px', borderRadius: 'md', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })
const viewOnly = css({ pointerEvents: 'none' })
const addBtn = css({ color: 'text.link', '& svg': { color: 'text.link' }, marginTop: '4' })
</script>

<template>
  <div>
    <!-- #title-action: optional control 4px after the title (Story 7 "Edit legend label" in ModalViewEdit). -->
    <div v-if="title && $slots['title-action']" :class="titleRow">
      <MpText :class="titleText">{{ title }}</MpText>
      <slot name="title-action" />
    </div>
    <MpText v-else-if="title" :class="titleClass">{{ title }}</MpText>

    <div :class="list">
      <div v-for="(legend, idx) in legends" :key="idx" :class="[row, isViewOnly && viewOnly]" :data-qa="`view-settings-template-legend-${idx}`">
        <!-- Legend range -->
        <div :class="col">
          <div v-if="legendHeader && idx === 0" :class="headerCell">{{ legendHeader.range }}</div>
          <div :class="rangeRow">
            <MpFormControl :id="`${uid}-legend-${idx}-from`" :class="isPercent ? rangeInputPercent : rangeInput" is-disabled>
              <MpInputGroup v-if="isPercent">
                <MpInput :model-value="String(legend.from ?? '')" />
                <MpInputRightAddon>%</MpInputRightAddon>
              </MpInputGroup>
              <MpInput v-else :model-value="String(legend.from ?? '')" />
            </MpFormControl>
            <span :class="dash" />
            <MpFormControl
              :id="`${uid}-legend-${idx}-to`"
              :class="isPercent ? rangeInputPercent : rangeInput"
              :is-invalid="!!serverError(`legends.${idx}.to`)"
              :is-disabled="idx < legends.length - 1 || isDisabled || isNotAddable"
            >
              <MpInputGroup v-if="isPercent">
                <MpInput :model-value="legend.to == null ? '' : String(legend.to)" @update:model-value="(v: string) => (legend.to = formatInputScore(v))" />
                <MpInputRightAddon>%</MpInputRightAddon>
              </MpInputGroup>
              <MpInput v-else :model-value="legend.to == null ? '' : String(legend.to)" @update:model-value="(v: string) => (legend.to = formatInputScore(v))" />
            </MpFormControl>
          </div>
          <div v-if="serverError(`legends.${idx}.to`)" :class="errorText">{{ serverError(`legends.${idx}.to`) }}</div>
        </div>

        <!-- Legend description -->
        <div :class="[col, grow]">
          <div v-if="legendHeader && idx === 0" :class="headerCell">{{ legendHeader.description }}</div>
          <MpFormControl :id="`${uid}-legend-${idx}-description`" :is-invalid="!!descError(idx) || !!serverError(`legends.${idx}.description`)" :is-disabled="isDisabled">
            <MpInput v-model="legend.description" placeholder="Legend description..." autocomplete="off" @blur="touch(idx)" />
            <MpFormErrorMessage>{{ descError(idx) || serverError(`legends.${idx}.description`) }}</MpFormErrorMessage>
          </MpFormControl>
        </div>

        <!-- Legend colour -->
        <div :class="col">
          <div v-if="legendHeader && idx === 0" :class="headerCell" />
          <MpColorPicker
            :id="`${uid}-legend-color-${idx}`"
            :value="legend.color"
            :preset="LEGEND_COLOR_PRESET"
            variant="basic"
            placement="bottom-end"
            is-show-preset
            is-show-input
            use-portal
            :is-disabled="isDisabled || isViewOnly"
            @change="(c: { hex: string }) => (legend.color = c.hex)"
          >
            <!-- Legend colour is user-picked data, so it's a dynamic style. -->
            <span :class="swatchBtn" :style="{ backgroundColor: legend.color }" :aria-label="`Legend ${idx + 1} colour`">
              <MpIcon name="paint-bucket" color="icon.inverse" />
            </span>
          </MpColorPicker>
        </div>

        <!-- Remove legend -->
        <div :class="col">
          <div v-if="legendHeader && idx === 0" :class="headerCell" />
          <MpButton
            v-if="legends.length > 1 && !isNotAddable"
            variant="ghost"
            left-icon="minus-circular"
            :is-disabled="isDisabled"
            aria-label="Remove legend"
            @click="removeLegend(idx)"
          />
        </div>
      </div>
    </div>

    <MpButton
      v-if="!isNotAddable"
      variant="ghost"
      left-icon="add-circular"
      :class="addBtn"
      :is-disabled="isDisabled || isViewOnly"
      data-qa="settings-template-legend-btn-add"
      @click="addLegend"
    >
      Add legend
    </MpButton>
  </div>
</template>
