<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/CategoryForm.vue
  Component name preserved: CategoryForm. Props/events preserved: dragable, data,
  index, isFreetext, showActionIcons, isViewEdit, answerType, isDisabled,
  isUsingWeight, isIndicatorRating, startRatingFrom, errors,
  isShowRequireComment, isLayeredScoring, isViewOnly; emits `remove-category`,
  `data-update`, `start`, `end`.
  vuedraggable → native drag & drop (same idiom as competencies/create.vue).
  vuelidate → local checks exposed as `validate()`.
  Like production, the category is edited in place on the parent-owned object.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpInputGroup, MpInputRightAddon,
  MpTextarea, MpButton, MpCheckbox, MpIcon, MpText, css,
} from '@mekari/pixel3'
import {
  CUSTOM_INDICATOR_TYPES, answerTypeName, formatInputScore,
  type AnswerType, type TemplateCategory, type TemplateIndicator,
} from '~/utils/reviewTemplate'

defineOptions({ name: 'CategoryForm' })

const uid = useId()

const props = withDefaults(defineProps<{
  dragable?: boolean
  data: TemplateCategory
  index?: number
  isFreetext?: boolean
  showActionIcons?: boolean
  isViewEdit?: boolean
  answerType?: AnswerType
  isDisabled?: boolean
  isUsingWeight?: boolean
  isIndicatorRating?: boolean
  startRatingFrom?: number
  errors?: Record<string, string[] | string>
  isShowRequireComment?: boolean
  isLayeredScoring?: boolean
  isViewOnly?: boolean
}>(), { dragable: false, index: 0, isFreetext: false, showActionIcons: false, isViewEdit: false, answerType: 'free-text', isDisabled: false, isUsingWeight: false, isIndicatorRating: false, startRatingFrom: 0, errors: () => ({}), isShowRequireComment: false, isLayeredScoring: false, isViewOnly: false })

const emit = defineEmits<{ 'remove-category': [id: string | number | undefined], 'data-update': [data: TemplateCategory], 'start': [e: DragEvent], 'end': [] }>()

const isCustom = computed(() => props.answerType === 'custom')
const startRatingPointVal = computed(() => (props.answerType === 'point' ? '' : props.startRatingFrom))
const defaultIndicator = (): TemplateIndicator => ({ name: '', weight: 0, answer_type: props.isFreetext ? 'free-text' : null })

// assignDefaultData: a category always has at least one indicator.
watch(() => props.data, (d) => {
  if (!d.indicators?.length) {
    d.indicators = props.isIndicatorRating
      ? [{ id: 1, name: '', weight: 0, answer_type: null, ratings: [{ value: startRatingPointVal.value, name: '' }] }]
      : [{ ...defaultIndicator(), id: 1 }]
  }
  if (d.description == null) d.description = ''
}, { immediate: true })
watch(() => props.data, d => emit('data-update', d), { deep: true })

watch(() => props.isIndicatorRating, (val) => {
  props.data.indicators.forEach((i) => {
    if (val) i.ratings = [{ value: startRatingPointVal.value, name: '' }]
    else delete i.ratings
  })
})

function addIndicator() {
  const id = props.data.indicators.length + 1
  props.data.indicators.push(props.isIndicatorRating
    ? { id, name: '', weight: 0, answer_type: null, ratings: [{ value: startRatingPointVal.value, name: '' }] }
    : { ...defaultIndicator(), id })
}
function removeIndicator(idx: number) { props.data.indicators.splice(idx, 1) }

// ─── Indicator drag & drop ───────────────────────────────────────────────────────
const dragIdx = ref<number | null>(null)
const overIdx = ref<number | null>(null)
function onIndDragStart(i: number, e: DragEvent) {
  dragIdx.value = i
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }
  e.stopPropagation()
}
function onIndDragEnter(i: number) { if (dragIdx.value !== null) overIdx.value = i }
function resetIndDrag() { dragIdx.value = null; overIdx.value = null }
function onIndDrop(i: number, e: DragEvent) {
  const from = dragIdx.value
  resetIndDrag()
  if (from === null) return
  e.stopPropagation()
  if (from === i) return
  const arr = props.data.indicators
  arr.splice(i, 0, arr.splice(from, 1)[0])
}

// ─── Validation ──────────────────────────────────────────────────────────────────
const touchedAll = ref(false)
const touched = ref<Set<string>>(new Set())
const isTouched = (k: string) => touchedAll.value || touched.value.has(k)
function touch(k: string) { touched.value = new Set(touched.value).add(k) }

const nameError = computed(() => {
  if (!isTouched('name')) return ''
  if (!props.data.name?.trim()) return 'This field is required'
  if (props.data.name.length > 255) return 'Name can only have 255 characters'
  return ''
})
const indicatorNameError = (i: TemplateIndicator, idx: number) => (isTouched(`ind-${idx}`) && !i.name?.trim() ? 'This field is required' : '')
const indicatorTypeError = (i: TemplateIndicator) => (touchedAll.value && isCustom.value && !props.isFreetext && !i.answer_type ? 'This field is required' : '')

const ratingForms = ref<{ validate: () => boolean }[]>([])
function validate() {
  touchedAll.value = true
  const nameOk = Boolean(props.data.name?.trim()) && props.data.name.length <= 255
  const indicatorsOk = props.data.indicators.length > 0 && props.data.indicators.every(i => i.name?.trim() && (!isCustom.value || props.isFreetext || i.answer_type))
  const ratingsOk = props.isIndicatorRating && !props.isFreetext ? ratingForms.value.map(f => f.validate()).every(Boolean) : true
  return nameOk && indicatorsOk && ratingsOk
}
defineExpose({ validate })

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
// Production frames each category as a white card on the grey builder canvas,
// with a red 2px border when its indicator weights don't add up to 100%.
const card = css({ background: 'background.neutral', border: '1px solid', borderColor: 'gray.100', borderRadius: 'md', marginBottom: '4' })
const cardError = css({ borderWidth: '2px', borderColor: 'border.danger' })
const handleTop = css({ display: 'flex', justifyContent: 'center', paddingTop: '2', cursor: 'grab', color: 'icon.secondary', _active: { cursor: 'grabbing' } })
const handleIcon = css({ transform: 'rotate(90deg)' })
const body = css({ padding: '4', display: 'flex', flexDirection: 'column', gap: '3' })
const row = css({ display: 'flex', gap: '2', alignItems: 'flex-start' })
const grow = css({ flex: '1', minWidth: '0' })
const weightCol = css({ width: '104px', flexShrink: '0' })
const typeCol = css({ width: '160px', flexShrink: '0' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const caption = css({ color: 'text.secondary' })
const indicatorList = css({ display: 'flex', flexDirection: 'column', gap: '4', marginTop: '2' })
const indicatorBox = css({ background: 'gray.25', border: '1px solid', borderColor: 'gray.100', borderRadius: 'md', padding: '4', transition: 'opacity 0.15s ease, box-shadow 0.15s ease' })
const dragHandle = css({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '36px', flexShrink: '0', cursor: 'grab', color: 'icon.secondary', _active: { cursor: 'grabbing' } })
const dimDrag = css({ opacity: '0.4' })
const dropRowLine = css({ boxShadow: 'inset 0 3px 0 0 var(--mp-colors-border-brand)' })
const typeLine = css({ display: 'flex', gap: '1', marginTop: '3' })
const semi = css({ fontWeight: '600' })
const ratingsWrap = css({ marginTop: '2' })
const weightError = css({ color: 'text.danger', paddingTop: '2' })
const addBtn = css({ color: 'text.link', '& svg': { color: 'text.link' }, alignSelf: 'flex-start', marginTop: '2' })
const footer = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4', background: 'gray.25', borderTop: '1px solid', borderTopColor: 'gray.100', borderBottomRadius: 'md' })
const viewOnly = css({ pointerEvents: 'none' })
</script>

<template>
  <div :class="[card, data.is_error_weight && cardError]">
    <div
      v-if="dragable"
      :class="[handleTop, (isDisabled || isViewOnly) && viewOnly]"
      draggable="true"
      aria-label="Drag to reorder category"
      @dragstart="(e: DragEvent) => emit('start', e)"
      @dragend="emit('end')"
    >
      <MpIcon name="drag" size="sm" :class="handleIcon" />
    </div>

    <div :class="[body, isViewOnly && viewOnly]">
      <div :class="row">
        <!-- Category name -->
        <MpFormControl :id="`${uid}-category-${index}-name`" :class="grow" :is-invalid="!!nameError" :is-disabled="isDisabled">
          <MpFormLabel>Category name</MpFormLabel>
          <MpInput v-model="data.name" :maxlength="60" placeholder="e.g Communication and interpersonal skills" @blur="touch('name')" />
          <MpFormErrorMessage>{{ nameError }}</MpFormErrorMessage>
        </MpFormControl>

        <!-- Category weight -->
        <MpFormControl v-if="isUsingWeight && !isFreetext" :id="`${uid}-category-${index}-weight`" :class="weightCol" :is-disabled="isDisabled">
          <MpFormLabel>Weight</MpFormLabel>
          <MpInputGroup>
            <MpInput :model-value="String(data.weight ?? '')" @update:model-value="(v: string) => (data.weight = formatInputScore(v))" />
            <MpInputRightAddon>%</MpInputRightAddon>
          </MpInputGroup>
        </MpFormControl>
      </div>

      <!-- Description -->
      <MpFormControl :id="`${uid}-category-${index}-description`" :is-disabled="isDisabled">
        <MpFormLabel>Description</MpFormLabel>
        <MpTextarea v-model="data.description" placeholder="Optional" />
      </MpFormControl>

      <!-- Indicators -->
      <div>
        <MpText as="h3" :class="h3Class">Indicator</MpText>
        <MpText size="label" :class="caption">Set necessary details to this category.</MpText>

        <div :class="indicatorList">
          <div
            v-for="(indicator, idx) in data.indicators"
            :key="`indform-${idx}`"
            :class="[indicatorBox, idx === dragIdx && dimDrag, idx === overIdx && dropRowLine]"
            :data-qa="`view-settings-template-category-indicator-${idx}`"
            @dragenter.prevent="onIndDragEnter(idx)"
            @dragover.prevent
            @drop="onIndDrop(idx, $event)"
          >
            <div :class="row">
              <div
                v-if="data.indicators.length > 1 && !isViewEdit && !isViewOnly"
                :class="[dragHandle, isDisabled && viewOnly]"
                draggable="true"
                aria-label="Drag to reorder indicator"
                @dragstart="onIndDragStart(idx, $event)"
                @dragend="resetIndDrag"
              >
                <MpIcon name="drag" size="sm" />
              </div>

              <div :class="grow">
                <div :class="row">
                  <!-- Indicator name -->
                  <MpFormControl :id="`${uid}-category-${index}-indicator-${idx}-name`" :class="grow" :is-invalid="!!indicatorNameError(indicator, idx)" :is-disabled="isDisabled">
                    <MpTextarea v-model="indicator.name" placeholder="e.g Shows strong communication and interpersonal skills in teams" @blur="touch(`ind-${idx}`)" />
                    <MpFormErrorMessage>{{ indicatorNameError(indicator, idx) }}</MpFormErrorMessage>
                  </MpFormControl>

                  <!-- Indicator answer type (custom) -->
                  <MpFormControl v-if="isCustom && !isViewEdit && !isFreetext" :id="`${uid}-category-${index}-indicator-${idx}-type`" :class="typeCol" :is-invalid="!!indicatorTypeError(indicator)" :is-disabled="isDisabled">
                    <PxSelectPopover
                      :model-value="indicator.answer_type ?? ''"
                      :options="CUSTOM_INDICATOR_TYPES.map(t => ({ value: t.slug, label: t.name }))"
                      placeholder="Select type"
                      width="100%"
                      :is-disabled="isDisabled"
                      @update:model-value="(v: string) => (indicator.answer_type = (v || null) as AnswerType | null)"
                    />
                    <MpFormErrorMessage>{{ indicatorTypeError(indicator) }}</MpFormErrorMessage>
                  </MpFormControl>

                  <!-- Indicator weight -->
                  <MpInputGroup v-if="isUsingWeight && !isFreetext" :class="weightCol">
                    <MpInput
                      :model-value="String(indicator.weight ?? '')"
                      :is-disabled="isDisabled"
                      @update:model-value="(v: string) => { indicator.weight = formatInputScore(v); data.is_error_weight = false }"
                    />
                    <MpInputRightAddon>%</MpInputRightAddon>
                  </MpInputGroup>

                  <MpButton
                    v-if="data.indicators.length > 1 && !isViewEdit"
                    variant="ghost"
                    left-icon="minus-circular"
                    :is-disabled="isDisabled || isViewOnly"
                    aria-label="Remove indicator"
                    :data-qa="`settings-template-category-btn-remove-indicator-${idx}`"
                    @click="removeIndicator(idx)"
                  />
                </div>

                <div v-if="isCustom && isViewEdit" :class="typeLine">
                  <span :class="semi">Question type:</span>
                  <span>{{ answerTypeName(indicator.answer_type) }}</span>
                </div>

                <!-- Per-indicator ratings / points -->
                <div v-if="isIndicatorRating && !isFreetext && indicator.ratings" :class="ratingsWrap">
                  <CycleRatingList
                    v-if="answerType === 'rating'"
                    ref="ratingForms"
                    :ratings-data="indicator.ratings"
                    :start-from="startRatingFrom"
                    :errors="errors"
                    :prefix="`categories.${index}.indicators.${idx}.`"
                    :is-layered-scoring="isLayeredScoring"
                    :addable="!isViewEdit"
                    :is-view-only="isViewOnly"
                  />
                  <CyclePointList
                    v-if="answerType === 'point'"
                    ref="ratingForms"
                    :points-data="indicator.ratings"
                    :errors="errors"
                    :prefix="`categories.${index}.indicators.${idx}.`"
                    :addable="!isViewEdit"
                    :is-view-only="isViewOnly"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="data.is_error_weight" :class="weightError">Total indicator weight in this category must be 100%</div>

        <MpButton
          v-if="!isViewEdit"
          variant="ghost"
          left-icon="add-circular"
          :class="addBtn"
          :is-disabled="isDisabled || isViewOnly"
          data-qa="settings-template-category-btn-add-indicator"
          @click="addIndicator"
        >
          Add indicator
        </MpButton>
      </div>
    </div>

    <div v-if="(isShowRequireComment || showActionIcons) && !isFreetext" :class="[footer, isViewOnly && viewOnly]">
      <MpCheckbox
        v-if="isShowRequireComment"
        :id="`${uid}-category-${index}-required-comment`"
        :is-checked="Boolean(data.required_comment)"
        :is-disabled="isDisabled"
        @update:is-checked="(v: boolean) => (data.required_comment = v)"
      >
        Required to fill out comments in this category
      </MpCheckbox>
      <span v-else />

      <MpButton
        v-if="showActionIcons && !isViewEdit"
        variant="ghost"
        data-qa="settings-template-category-btn-delete"
        @click="emit('remove-category', data.id)"
      >
        Delete category
      </MpButton>
    </div>
  </div>
</template>
