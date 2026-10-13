<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/reviews/cycle/components/PointList.vue
  Component name preserved: PointList. Props/events preserved: title,
  pointsData, placeholder, prefix, isDisabled, errors, addable, isViewOnly;
  emits `updated`.
  vuelidate → local checks exposed as `validate()`. TextareaAutosize → MpTextarea.
  Like production, rows are edited in place on the parent-owned array.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpTextarea, MpButton, MpText, css } from '@mekari/pixel3'
import { formatInputScore, type TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'PointList' })

const uid = useId()

const MAX_RATING_DESC = 1000

const props = withDefaults(defineProps<{
  title?: string
  pointsData?: TemplateRating[]
  placeholder?: string
  prefix?: string
  isDisabled?: boolean
  errors?: Record<string, string[] | string>
  addable?: boolean
  isViewOnly?: boolean
}>(), { title: '', pointsData: () => [], placeholder: 'Write description...', prefix: '', isDisabled: false, errors: () => ({}), addable: false, isViewOnly: false })

const emit = defineEmits<{ updated: [points: TemplateRating[]] }>()

const points = computed(() => props.pointsData)
const touched = ref<Set<number>>(new Set())
const touchedAll = ref(false)
const isTouched = (idx: number) => touchedAll.value || touched.value.has(idx)
function touch(idx: number) { touched.value = new Set(touched.value).add(idx) }

function rowError(p: TemplateRating) {
  if (String(p.value ?? '') === '') return 'This field is required'
  if (points.value.filter(e => String(e.value) === String(p.value)).length > 1) return 'Cannot use same value'
  if (!p.name?.trim()) return 'This field is required'
  if (p.name.length > MAX_RATING_DESC) return `Point description must have at most ${MAX_RATING_DESC} characters`
  return ''
}
const serverError = (idx: number) => {
  const e = props.errors[`${props.prefix}points.${idx}.name`]
  return Array.isArray(e) ? e.join(' ') : (e ?? '')
}

function updatePoint() { emit('updated', points.value) }
function addPoint() {
  touch(points.value.length - 1)
  points.value.push({ value: '', name: '' })
  updatePoint()
}
function removePoint(index: number) {
  points.value.splice(index, 1)
  updatePoint()
}

function validate() {
  touchedAll.value = true
  return points.value.every(p => !rowError(p))
}
defineExpose({ validate })

const titleClass = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default', marginBottom: '4' })
const list = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const row = css({ display: 'flex', gap: '2', alignItems: 'flex-start' })
const grow = css({ flex: '1', minWidth: '0' })
const valueCol = css({ width: '64px', flexShrink: '0', '& input': { width: '100%', minWidth: '0' } })
const descArea = css({ minHeight: '38px', height: '38px' })
const removeFirst = css({ marginTop: '28px' })
const viewOnly = css({ pointerEvents: 'none' })
const addBtn = css({ color: 'text.link', '& svg': { color: 'text.link' }, marginTop: '4' })
</script>

<template>
  <div>
    <MpText v-if="title" :class="titleClass">{{ title }}</MpText>

    <div :class="list">
      <div v-for="(point, idx) in points" :key="idx" :class="[row, isViewOnly && viewOnly]" :data-qa="`view-review-cycle-component-point-list-row-${idx}`">
        <MpFormControl :id="`${uid}-${prefix}point-${idx}`" :class="grow" :is-invalid="(isTouched(idx) && !!rowError(point)) || !!serverError(idx)" :is-disabled="isDisabled">
          <div :class="row">
            <div :class="valueCol">
              <MpFormLabel v-if="idx === 0">Points</MpFormLabel>
              <MpInput
                :model-value="String(point.value ?? '')"
                :is-disabled="isDisabled || !addable"
                inputmode="decimal"
                data-qa="point-list-input-value"
                @update:model-value="(v: string) => (point.value = formatInputScore(v))"
                @blur="touch(idx)"
              />
            </div>
            <div :class="grow">
              <MpFormLabel v-if="idx === 0">Description</MpFormLabel>
              <MpTextarea v-model="point.name" :class="descArea" :placeholder="placeholder" data-qa="point-list-textarea-description" @change="updatePoint" @blur="touch(idx)" />
            </div>
          </div>
          <MpFormErrorMessage>{{ (isTouched(idx) && rowError(point)) || serverError(idx) }}</MpFormErrorMessage>
        </MpFormControl>

        <MpButton
          v-if="addable && points.length > 1"
          variant="ghost"
          left-icon="minus-circular"
          :class="idx === 0 && removeFirst"
          :is-disabled="isDisabled"
          aria-label="Remove point"
          data-qa="point-list-btn-remove"
          @click="removePoint(idx)"
        />
      </div>
    </div>

    <MpButton v-if="addable" variant="ghost" left-icon="add-circular" :class="addBtn" :is-disabled="isDisabled || isViewOnly" data-qa="point-list-btn-add" @click="addPoint">Add point</MpButton>
  </div>
</template>
