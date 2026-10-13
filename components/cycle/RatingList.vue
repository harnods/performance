<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/reviews/cycle/components/RatingList.vue
  Component name preserved: RatingList. Props/events preserved: title,
  ratingsData, placeholder, prefix, isDisabled, errors, addable, startFrom,
  isLayeredScoring, isViewOnly; emits `updated`.
  vuelidate → local checks exposed as `validate()` (TemplateForm calls it on
  Save, like production's `$refs.ratingList.$v.$touch()`).
  TextareaAutosize (custom) → MpTextarea.
  Like production, rows are edited in place on the parent-owned array.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpTextarea, MpButton, MpText, css } from '@mekari/pixel3'
import { formatInputScore, type TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'RatingList' })

const uid = useId()

const MAX_RATING_DESC = 1000

const props = withDefaults(defineProps<{
  title?: string
  ratingsData?: TemplateRating[]
  placeholder?: string
  prefix?: string
  isDisabled?: boolean
  errors?: Record<string, string[] | string>
  addable?: boolean
  startFrom?: number
  isLayeredScoring?: boolean
  isViewOnly?: boolean
}>(), { title: '', ratingsData: () => [], placeholder: 'Rating description...', prefix: '', isDisabled: false, errors: () => ({}), addable: false, startFrom: 0, isLayeredScoring: false, isViewOnly: false })

const emit = defineEmits<{ updated: [ratings: TemplateRating[]] }>()

const ratings = computed(() => props.ratingsData)
const touched = ref<Set<number>>(new Set())
const touchedAll = ref(false)
const isTouched = (idx: number) => touchedAll.value || touched.value.has(idx)
function touch(idx: number) { touched.value = new Set(touched.value).add(idx) }

const nameError = (r: TemplateRating) => {
  if (!r.name?.trim()) return 'This field is required'
  if (r.name.length > MAX_RATING_DESC) return `Rating description must have at most ${MAX_RATING_DESC} characters.`
  return ''
}
const serverError = (idx: number) => {
  const e = props.errors[`${props.prefix}ratings.${idx}.name`]
  return Array.isArray(e) ? e.join(' ') : (e ?? '')
}
const invalidPoints = (r: TemplateRating) => Number.parseFloat(String(r.from)) >= Number.parseFloat(String(r.to))
const isValidPoints = computed(() => (props.isLayeredScoring
  ? ratings.value.every((r) => {
    const from = Number.parseFloat(String(r.from))
    const to = Number.parseFloat(String(r.to))
    return (from || from === 0) && to && to > from
  })
  : true))

const hasDecimalRating = computed(() => ratings.value.some(r => (typeof r.value === 'number' ? !Number.isInteger(r.value) : String(r.value).includes('.'))))
function updateStartValue() {
  ratings.value.forEach((r, idx) => { r.value = hasDecimalRating.value ? Number(r.value) : idx + Number(props.startFrom) })
}
watch(() => [props.ratingsData, props.ratingsData.length, props.startFrom], updateStartValue, { immediate: true })

function updateRating() { emit('updated', ratings.value) }
function addRating() {
  const lastIdx = ratings.value.length - 1
  const last = ratings.value[lastIdx]
  const lastTo = last?.to ? (Number.parseFloat(String(last.to)) + 0.01).toFixed(2) : null
  touch(lastIdx)
  ratings.value.push({ value: Number(last?.value ?? 0) + 1, name: '', from: lastTo, to: null })
  updateRating()
}
function removeRating(index: number) {
  ratings.value.splice(index, 1)
  updateStartValue()
  updateRating()
}
function onChangePointsTo(idx: number) {
  const point = ratings.value[idx].to || ratings.value[idx].from || 0
  const next = ratings.value[idx + 1]
  if (next) next.from = (Number.parseFloat(String(point)) + 0.01).toFixed(2)
}

function validate() {
  touchedAll.value = true
  return ratings.value.every(r => !nameError(r)) && isValidPoints.value
}
defineExpose({ validate })

const titleClass = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default', marginBottom: '4' })
const list = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const row = css({ display: 'flex', gap: '2', alignItems: 'flex-start' })
const grow = css({ flex: '1', minWidth: '0' })
const nameRow = css({ display: 'flex', gap: '2' })
const valueBox = css({ width: '36px', height: '36px', flexShrink: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'background.neutral.subtle', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', fontWeight: '600' })
const errorIndent = css({ paddingLeft: '44px' })
const pointsRow = css({ display: 'flex', alignItems: 'flex-end', gap: '2' })
const pointsWrap = css({ flexShrink: '0' })
const nameArea = css({ minHeight: '36px', height: '36px' })
const pointInput = css({ width: '70px', flexShrink: '0', '& input': { width: '100%', minWidth: '0' } })
const dash = css({ width: '8px', height: '2px', background: 'border.bold', marginInline: '2', marginBottom: '17px', flexShrink: '0' })
const errorText = css({ color: 'text.danger', fontSize: '12px', lineHeight: '16px', marginTop: '1' })
const removeFirst = css({ marginTop: '28px' })
const viewOnly = css({ pointerEvents: 'none' })
const addBtn = css({ color: 'text.link', '& svg': { color: 'text.link' }, marginTop: '4' })
</script>

<template>
  <div>
    <MpText v-if="title" :class="titleClass">{{ title }}</MpText>

    <div :class="list">
      <div
        v-for="(rating, idx) in ratings"
        :key="idx"
        :class="[row, isViewOnly && viewOnly]"
        :data-qa="`view-review-cycle-component-rating-list-row-${idx}`"
      >
        <!-- Rating name -->
        <MpFormControl :id="`${uid}-${prefix}rating-${idx}`" :class="grow" :is-invalid="(isTouched(idx) && !!nameError(rating)) || !!serverError(idx)" :is-disabled="isDisabled">
          <MpFormLabel v-if="idx === 0">Rating</MpFormLabel>
          <div :class="nameRow">
            <span :class="valueBox">{{ rating.value }}</span>
            <div :class="grow">
              <MpTextarea v-model="rating.name" :class="nameArea" :placeholder="placeholder" data-qa="rating-list-textarea-name" @change="updateRating" @blur="touch(idx)" />
            </div>
          </div>
          <div :class="errorIndent">
            <MpFormErrorMessage>{{ (isTouched(idx) && nameError(rating)) || serverError(idx) }}</MpFormErrorMessage>
          </div>
        </MpFormControl>

        <!-- Layered scoring: point range -->
        <div v-if="isLayeredScoring" :class="pointsWrap">
          <div :class="pointsRow">
            <MpFormControl :id="`${uid}-${prefix}rating-${idx}-from`" :class="pointInput" :is-invalid="invalidPoints(rating)" :is-disabled="idx > 0 || !addable" data-qa="rating-list-input-points-from">
              <MpFormLabel v-if="idx === 0">Points</MpFormLabel>
              <MpInput :model-value="rating.from == null ? '' : String(rating.from)" @update:model-value="(v: string) => (rating.from = formatInputScore(v))" />
            </MpFormControl>
            <span :class="dash" />
            <MpFormControl :id="`${uid}-${prefix}rating-${idx}-to`" :class="pointInput" :is-invalid="invalidPoints(rating)" :is-disabled="!addable" data-qa="rating-list-input-points-to">
              <MpFormLabel v-if="idx === 0">&nbsp;</MpFormLabel>
              <MpInput :model-value="rating.to == null ? '' : String(rating.to)" @update:model-value="(v: string) => (rating.to = formatInputScore(v))" @blur="onChangePointsTo(idx)" />
            </MpFormControl>
          </div>
          <div v-if="invalidPoints(rating)" :class="errorText">Invalid input</div>
        </div>

        <!-- Remove rating -->
        <MpButton
          v-if="addable && ratings.length > 1"
          variant="ghost"
          left-icon="minus-circular"
          :class="idx === 0 && removeFirst"
          :is-disabled="isDisabled"
          aria-label="Remove rating"
          data-qa="rating-list-btn-remove"
          @click="removeRating(idx)"
        />
      </div>
    </div>

    <MpButton v-if="addable" variant="ghost" left-icon="add-circular" :class="addBtn" :is-disabled="isDisabled || isViewOnly" @click="addRating">Add rating</MpButton>
  </div>
</template>
