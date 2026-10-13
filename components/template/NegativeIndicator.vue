<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/NegativeIndicator.vue
  Component name preserved: NegativeIndicator. Props/events preserved: isBulk,
  answerType, data, errors; emits `updated` ({ value, is_invalid }).
  vuelidate → local checks. inputNumericalMixin currency formatting →
  formatInputScore (digits + 2 decimals).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpInputGroup, MpInputRightAddon,
  MpTextarea, MpButton, MpText, css,
} from '@mekari/pixel3'
import { formatInputScore } from '~/utils/reviewTemplate'

defineOptions({ name: 'NegativeIndicator' })

const uid = useId()

interface NegativeIndicatorRow { id?: number, name: string, score: string, comment: string }

const props = withDefaults(defineProps<{
  isBulk?: boolean
  answerType?: string
  data?: NegativeIndicatorRow[]
  errors?: Record<string, string[]>
}>(), { isBulk: false, answerType: '', data: () => [], errors: () => ({}) })

const emit = defineEmits<{ updated: [payload: { value: NegativeIndicatorRow[], is_invalid: boolean }] }>()

const defaultIndicator = (): NegativeIndicatorRow => ({ name: '', score: '', comment: '' })
const indicators = ref<NegativeIndicatorRow[]>(props.data.length ? props.data : [defaultIndicator()])
watch(() => props.data, (val) => { indicators.value = val.length ? val : [defaultIndicator()] }, { deep: true })

// name required when score is set, score required when name is set.
const nameError = (i: NegativeIndicatorRow) => {
  if (i.name.length > 255) return 'Indicator can only have 255 characters'
  if (i.score && !i.name.trim()) return 'This field is required'
  return ''
}
const scoreError = (i: NegativeIndicatorRow) => (i.name && !i.score ? 'This field is required' : '')
const isInvalid = computed(() => indicators.value.some(i => nameError(i) || scoreError(i)))
watch(indicators, value => emit('updated', { value, is_invalid: isInvalid.value }), { deep: true })

function addIndicator() { indicators.value.push({ ...defaultIndicator(), id: indicators.value.length + 1 }) }
function removeIndicator(idx: number) { indicators.value.splice(idx, 1) }

const wrap = css({ display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '6px' })
const framed = css({ border: '1px solid', borderColor: 'gray.100', background: 'background.neutral', padding: '16px' })
const title = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const caption = css({ color: 'text.secondary' })
const list = css({ display: 'flex', flexDirection: 'column', gap: '16px' })
const itemBox = css({ border: '1px solid', borderColor: 'gray.100', padding: '16px', borderRadius: '6px' })
const itemSubtle = css({ background: 'gray.25' })
const itemWhite = css({ background: 'background.neutral' })
const row = css({ display: 'flex', gap: '2', alignItems: 'flex-start', paddingY: '2' })
const grow = css({ flex: '1', minWidth: '0' })
const scoreCol = css({ width: '120px', flexShrink: '0' })
const removeBtn = css({ marginTop: '28px' })
const commentGap = css({ marginTop: '2' })
const addBtn = css({ color: 'text.link', '& svg': { color: 'text.link' }, alignSelf: 'flex-start', height: '34px' })
</script>

<template>
  <div :class="[wrap, !isBulk && framed]">
    <div v-if="!isBulk">
      <MpText :class="title">Negative indicator</MpText>
      <MpText :class="caption">Define the indicators that can be considered as evaluators of employee work performance.</MpText>
    </div>

    <div :class="list">
      <div v-for="(indicator, idx) in indicators" :key="`indform-${idx}`" :class="[itemBox, isBulk ? itemWhite : itemSubtle]" :data-qa="`view-settings-template-negative-indicator-${idx}`">
        <div :class="row">
          <MpFormControl :id="`${uid}-negative-indicator-${idx}-name`" :class="grow" :is-invalid="!!nameError(indicator) || Boolean(errors[`negative_indicator.${idx}.name`])">
            <MpFormLabel>Indicator</MpFormLabel>
            <MpInput v-model="indicator.name" placeholder="Input indicator" />
            <MpFormErrorMessage>{{ nameError(indicator) }}</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl :id="`${uid}-negative-indicator-${idx}-score`" :class="scoreCol" :is-invalid="!!scoreError(indicator) || Boolean(errors[`negative_indicator.${idx}.score`])">
            <MpFormLabel>Score</MpFormLabel>
            <MpInputGroup>
              <MpInput :model-value="indicator.score" placeholder="e.g 0,5" @update:model-value="(v: string) => (indicator.score = formatInputScore(v))" />
              <MpInputRightAddon v-if="answerType === 'percent'">%</MpInputRightAddon>
            </MpInputGroup>
            <MpFormErrorMessage>{{ scoreError(indicator) }}</MpFormErrorMessage>
          </MpFormControl>

          <MpButton
            v-if="indicators.length > 1"
            variant="ghost"
            left-icon="minus-circular"
            :class="removeBtn"
            aria-label="Remove negative indicator"
            :data-qa="`settings-template-negative-indicator-btn-remove-${idx}`"
            @click="removeIndicator(idx)"
          />
        </div>

        <MpFormControl :id="`${uid}-negative-indicator-${idx}-comment`" :class="commentGap">
          <MpFormLabel>Comment</MpFormLabel>
          <MpTextarea v-model="indicator.comment" placeholder="Optional" />
        </MpFormControl>
      </div>

      <MpButton variant="ghost" left-icon="add-circular" :class="addBtn" data-qa="settings-template-negative-indicator-btn-add" @click="addIndicator">Add indicator</MpButton>
    </div>
  </div>
</template>
