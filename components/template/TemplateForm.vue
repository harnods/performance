<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/TemplateForm.vue (+ src/mixins/template.js)
  Component name preserved: TemplateForm. Props/events preserved: isViewOnly,
  isLoading, isDuplicate, uuid; emits `updated`, `is-submitting`.
  Exposed like production's refs: assignData, resetTemplate, preparePayload,
  handleSubmit, post — plus form / is_use_weight / currentLegendsData so the
  parent can mount the preview modal as a sibling (Pixel 3 can't open a modal
  inside another modal's content — docs/patterns/avatar.md).
  Removed: Vuex settings/* + API (→ useReviewTemplateStore), vuelidate (→ local
  checks + child validate()), vuedraggable (→ native drag & drop), the
  PR-alto-point-template Unleash flag (Point always shown).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpRadio, MpCheckbox,
  MpButton, MpText, MpTooltip, MpIcon, MpBadge, MpSpinner,
  MpBanner, MpBannerIcon, MpBannerDescription, toast, css,
} from '@mekari/pixel3'
import {
  ANSWER_TYPES, DEFAULT_LEGEND_COLOR, NAME_MAX, LEGEND_NAME_MAX, LEGEND_NAME_PATTERN, LEGEND_NAME_DEFAULT,
  type AnswerType, type TemplateCategory, type TemplateDetail, type TemplateLegend, type TemplateRating,
} from '~/utils/reviewTemplate'
import type { TemplateApiError, TemplatePayload } from '~/composables/useReviewTemplateStore'

defineOptions({ name: 'TemplateForm' })

const props = withDefaults(defineProps<{
  isViewOnly?: boolean
  isLoading?: boolean
  isDuplicate?: boolean
  uuid?: string
}>(), { isViewOnly: false, isLoading: false, isDuplicate: false, uuid: '' })

const emit = defineEmits<{ 'updated': [showPresetFeedback: boolean], 'is-submitting': [value: boolean] }>()

const uid = useId()
const { createUpdateTemplate, savedLegendNames, nextLegendName, saveLegendName, removeLegendName } = useReviewTemplateStore()

type LegendKey = 'rating' | 'percent' | 'point' | 'custom'
interface TemplateFormState {
  name: string
  required_summary: 'true' | 'false'
  answer_type: AnswerType
  is_indicator_rating: boolean
  is_custom_points_enabled: boolean
  is_allow_value: boolean
  is_start_from_0: boolean
  is_use_freetext_indicator: boolean
  is_use_negative_indicator: boolean
  is_apply_score_for_goal_only: boolean
  is_required_comment_goal: boolean
  is_layered_scoring: boolean
  categories: TemplateCategory[]
  category_freetext: TemplateCategory
  ratings: TemplateRating[]
  points: TemplateRating[]
  is_using_preset: boolean
  preset_name: string
  legend_name: string
  legend_apply_next: boolean
}

// A function declaration, not `<T>(v) =>`: Panda parses Vue scripts as TSX, where an arrow
// generic reads as a JSX tag and silently drops every css() call after it.
function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }
const defaultRating = (): TemplateRating => ({ value: 0, name: '', to: null, from: 0 })
const defaultPoints = (): TemplateRating => ({ value: '', name: '' })
const defaultTemplateForm = (): TemplateFormState => ({
  name: '',
  required_summary: 'false',
  answer_type: 'free-text',
  is_indicator_rating: false,
  is_custom_points_enabled: false,
  is_allow_value: false,
  is_start_from_0: false,
  is_use_freetext_indicator: false,
  is_use_negative_indicator: false,
  is_apply_score_for_goal_only: false,
  is_required_comment_goal: false,
  is_layered_scoring: false,
  categories: [{ id: '0', name: '', weight: 0, required_comment: false, description: '', indicators: [{ name: '', weight: 0, answer_type: 'free-text', id: 1 }] }],
  category_freetext: { id: 0, name: '', weight: 0, required_comment: false, description: '', indicators: [] },
  ratings: [defaultRating()],
  points: [defaultPoints()],
  is_using_preset: false,
  preset_name: '',
  legend_name: LEGEND_NAME_DEFAULT,
  legend_apply_next: false,
})
const defaultCategoryGoal = (): TemplateCategory[] => [{ id: 0, name: 'Default', weight: 0, description: '', required_comment: false, indicators: [{ name: 'Default', weight: 0, answer_type: null }] }]
const defaultLegends = (): Record<LegendKey, TemplateLegend[]> => ({
  rating: [{ from: 1, to: 1, description: '', color: DEFAULT_LEGEND_COLOR }],
  percent: [{ from: 0, to: 100, description: '', color: DEFAULT_LEGEND_COLOR }],
  point: [{ from: 0, to: 10, description: '', color: DEFAULT_LEGEND_COLOR }],
  custom: [{ from: 0, to: 100, description: '', color: DEFAULT_LEGEND_COLOR }],
})

const form = reactive<TemplateFormState>(defaultTemplateForm())
const is_use_weight = ref(false)
const legends = reactive<Record<LegendKey, TemplateLegend[]>>(defaultLegends())
const errors = ref<Record<string, string[] | string>>({})
const isAssigningData = ref(false)
const isLoadingSubmit = ref(false)
const nameTouched = ref(false)
const legendLabelTouched = ref(false)

// ─── Computed (production computed block) ────────────────────────────────────────
const isEdit = computed(() => Boolean(props.uuid))
const isRating = computed(() => form.answer_type === 'rating')
const isPoint = computed(() => form.answer_type === 'point')
const isCustomEachIndicator = computed(() => (isRating.value && form.is_indicator_rating) || (isPoint.value && form.is_custom_points_enabled))
const isLegend = computed(() => ['rating', 'percent', 'point'].includes(form.answer_type))
const calculateType = computed(() => (is_use_weight.value ? 'weight' : 'non-weight'))
const startRatingFrom = computed({
  get: () => (form.answer_type === 'custom' ? 1 : Number(!form.is_start_from_0)),
  set: (value: number | string) => { form.is_start_from_0 = !Number(value) },
})
const currentLegendsData = computed({
  get: () => (isLegend.value ? legends[form.answer_type as LegendKey] : legends.custom),
  set: (value: TemplateLegend[]) => {
    if (isLegend.value) legends[form.answer_type as LegendKey] = value
    else legends.custom = value
  },
})
const isShowOverallRating = computed(() => form.answer_type === 'custom' && form.categories.some(c => c.indicators?.some(i => i.answer_type === 'rating')))
const nameError = computed(() => {
  if (!nameTouched.value) return ''
  if (!form.name.trim()) return 'This field is required'
  const server = errors.value.name
  if (server) return Array.isArray(server) ? server.join(' ') : server
  return ''
})
const legendOptions = computed(() => [LEGEND_NAME_DEFAULT, ...savedLegendNames.value].map(n => ({ value: n, label: n })))
// "Legends" is the default until the user sets another one. The checkbox only exists while the selected label
// is NOT the default; once it is (or becomes) the default there is nothing left to set, so it is hidden.
const effectiveLegendDefault = computed(() => nextLegendName.value || LEGEND_NAME_DEFAULT)
const isDefaultLegendLabel = computed(() => form.legend_name.trim() === effectiveLegendDefault.value)
watch(() => form.legend_name, () => { form.legend_apply_next = isDefaultLegendLabel.value })
const legendLabelError = computed(() => {
  if (!legendLabelTouched.value || !isLegend.value) return ''
  const name = form.legend_name.trim()
  if (!name) return 'You must select legend label'
  if (!LEGEND_NAME_PATTERN.test(name)) return 'Legend label has invalid characters. Please use only letters, numbers, spaces and - ( ) & /'
  return ''
})
function onRemoveLegendLabel(name: string) {
  removeLegendName(name)
  if (form.legend_name === name) form.legend_name = ''
}
const legendTitle = computed(() => form.legend_name.trim() || LEGEND_NAME_DEFAULT)
const additionalTitle = computed(() => `Additional for ${form.answer_type === 'percent' ? 'percentage' : form.answer_type} type`)

// ─── Watchers (production watch block) ───────────────────────────────────────────
watch(() => form.name, () => {
  if (isAssigningData.value) return
  nameTouched.value = true
  if (errors.value.name) errors.value = { ...errors.value, name: '' }
})
watch(() => form.answer_type, (val) => {
  // Production calls updateLegends() for rating here, but it checks
  // `this.answer_type` (undefined), so it never runs — kept as a no-op.
  if (val !== 'rating' && val !== 'percent' && !isAssigningData.value) {
    is_use_weight.value = false
    form.is_use_negative_indicator = false
    form.is_apply_score_for_goal_only = false
    if (val !== 'point') form.is_use_freetext_indicator = false
  }
})
watch(isRating, (val) => {
  if (!val) {
    form.is_indicator_rating = false
    form.is_layered_scoring = false
  }
})
watch(isPoint, (val) => { if (!val) form.is_custom_points_enabled = false })
watch(() => form.is_start_from_0, (val) => {
  if (form.answer_type === 'rating' && !isAssigningData.value && !form.is_layered_scoring) {
    legends.rating = [{ from: Number(!val), to: Number(!val), description: '', color: DEFAULT_LEGEND_COLOR }]
  }
})
watch(() => form.is_apply_score_for_goal_only, (val) => {
  if (val) {
    is_use_weight.value = false
    form.is_indicator_rating = false
  }
})
watch(isLoadingSubmit, v => emit('is-submitting', v))

// ─── Methods ─────────────────────────────────────────────────────────────────────
function generateRandomKey() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function resetTemplate() {
  const currentName = form.name || ''
  isAssigningData.value = true
  Object.assign(form, defaultTemplateForm(), { name: currentName })
  form.legend_name = nextLegendName.value || LEGEND_NAME_DEFAULT
  form.legend_apply_next = false
  is_use_weight.value = false
  Object.assign(legends, defaultLegends())
  errors.value = {}
  nameTouched.value = false
  legendLabelTouched.value = false
  nextTick(() => { isAssigningData.value = false })
}

function assignData(data: TemplateDetail, isPreset = false) {
  isAssigningData.value = true
  form.is_using_preset = isPreset
  const currentName = form.name || ''

  const { template, ratings, legends: legendData } = clone(data)
  const categories = clone(data.categories)
  form.answer_type = template.answer_type
  form.name = props.isDuplicate ? `Copy ${template.name}` : template.name
  is_use_weight.value = template.calculate_type === 'weight'
  form.required_summary = String(template.required_summary) as 'true' | 'false'
  form.is_indicator_rating = Boolean(Number(template.is_indicator_rating))
  form.is_custom_points_enabled = template.is_custom_points_enabled || false
  form.is_allow_value = Boolean(Number(template.is_allow_value))
  form.is_use_freetext_indicator = Boolean(template.is_use_freetext_indicator)
  form.is_layered_scoring = Boolean(template.is_layered_scoring)
  form.is_use_negative_indicator = template.is_use_negative_indicator || false
  form.is_apply_score_for_goal_only = template.is_apply_score_for_goal_only || false
  form.is_required_comment_goal = template.is_required_comment_goal || false
  form.legend_name = template.legend_name || LEGEND_NAME_DEFAULT
  form.legend_apply_next = false

  if (form.is_use_freetext_indicator) form.category_freetext = categories.pop() as TemplateCategory
  form.categories = categories.map(c => ({ ...c, id: `cf-${generateRandomKey()}` }))

  if (template.answer_type === 'point') form.points = ratings?.length ? ratings : [defaultPoints()]
  else form.ratings = ratings?.length ? ratings : [defaultRating()]

  startRatingFrom.value = ratings?.length ? (ratings[0]?.value ?? '1') : '1'
  currentLegendsData.value = legendData?.length ? legendData : (isLegend.value ? defaultLegends()[form.answer_type as LegendKey] : legends.custom)

  if (isPreset) {
    form.name = currentName
    form.preset_name = template.name || ''
  }
  else {
    form.preset_name = ''
  }
  errors.value = {}
  nameTouched.value = false
  legendLabelTouched.value = false
  nextTick(() => { isAssigningData.value = false })
}

function preparePayload(): TemplatePayload {
  let inputType: TemplatePayload['input_type'] = isEdit.value ? 'edit' : 'new'
  if (props.isDuplicate) inputType = 'duplicate'
  const ratings = isRating.value || isShowOverallRating.value ? form.ratings : []
  const cat = form.is_apply_score_for_goal_only ? defaultCategoryGoal() : form.categories
  const overallPoints = form.is_custom_points_enabled ? [] : form.points
  return clone({
    name: form.name,
    required_summary: form.required_summary === 'true',
    categories: form.is_use_freetext_indicator ? [...cat, form.category_freetext] : cat,
    answer_type: form.answer_type,
    calculate_type: calculateType.value,
    input_type: inputType,
    is_rating: Number(isRating.value || isShowOverallRating.value || isPoint.value),
    is_legend: Number(isLegend.value),
    is_indicator_rating: form.answer_type === 'rating' ? Number(form.is_indicator_rating) : 0,
    is_custom_points_enabled: form.answer_type === 'point' ? form.is_custom_points_enabled : false,
    legends: isLegend.value ? currentLegendsData.value : '',
    ratings: isPoint.value ? overallPoints : ratings,
    is_allow_value: isLegend.value ? Number(form.is_allow_value) : 0,
    is_use_freetext_indicator: form.is_use_freetext_indicator,
    is_use_negative_indicator: form.is_use_negative_indicator,
    is_apply_score_for_goal_only: form.is_apply_score_for_goal_only,
    is_required_comment_goal: form.is_required_comment_goal,
    is_layered_scoring: form.is_layered_scoring,
    is_using_preset: form.is_using_preset,
    preset_name: form.preset_name,
    legend_name: form.legend_name.trim(),
  })
}

// src/mixins/template.js checkWeight / checkLegend (they throw the toast text).
function checkWeight() {
  let totalCategoryWeight = 0
  form.categories.forEach((category) => {
    totalCategoryWeight += Number.parseFloat(String(category.weight || 0))
    const totalIndicatorWeight = category.indicators.reduce((a, b) => (a + Number.parseFloat(String(b?.weight || 0))), 0)
    if (Number(totalIndicatorWeight.toFixed(2)) !== 100) {
      category.is_error_weight = true
      throw new Error(`Total indicator weight in ${category.name} category must be 100%`)
    }
    category.is_error_weight = false
  })
  if (!(totalCategoryWeight > 99.99 && totalCategoryWeight <= 100)) throw new Error('Total category weight must be 100%')
}
function checkLegend(list: TemplateLegend[], unlimitedValue = false, isLayered = false) {
  const lastLegend = list[list.length - 1]
  const value = Number.parseFloat(String(lastLegend.to || 0))
  let maxValueLegend = unlimitedValue ? 999.99 : 100
  let errVal = `${maxValueLegend}%`
  if (isRating.value) {
    const last = form.ratings[form.ratings.length - 1]
    maxValueLegend = Number.parseInt(String(isLayered ? last.to : last.value), 10)
    errVal = `${maxValueLegend} (max rating)`
  }
  if (value !== maxValueLegend && !unlimitedValue) {
    lastLegend.to = maxValueLegend
    throw new Error(`The maximum value of legend must be ${errVal}`)
  }
}

const categoryForms = ref<{ validate: () => boolean }[]>([])
const freetextIndicator = ref<{ validate: () => boolean } | null>(null)
const ratingList = ref<{ validate: () => boolean } | null>(null)
const pointList = ref<{ validate: () => boolean } | null>(null)
const legendForm = ref<{ validate: () => boolean } | null>(null)

function notifyError(title: string) {
  toast.notify({ id: 'template-form-error', position: 'top-center', variant: 'error', title })
}

function handleSubmit() {
  nameTouched.value = true
  legendLabelTouched.value = true
  const isNameInvalid = !form.name.trim() || form.name.length > NAME_MAX
  const isCategoriesError = form.is_apply_score_for_goal_only ? false : !categoryForms.value.map(f => f.validate()).every(Boolean)
  const isFreetextIndicatorError = freetextIndicator.value ? !freetextIndicator.value.validate() : false
  const isRatingsError = ratingList.value ? !ratingList.value.validate() : false
  const isPointsError = pointList.value ? !pointList.value.validate() : false
  const isLegendsError = isLegend.value && legendForm.value ? !legendForm.value.validate() : false

  const isLegendLabelError = Boolean(legendLabelError.value)

  if (isNameInvalid || isLegendLabelError || isCategoriesError || isFreetextIndicatorError || isRatingsError || isPointsError || isLegendsError) {
    // Inline field errors are the feedback; no toast for empty required fields.
    return
  }
  try {
    if (calculateType.value === 'weight') checkWeight()
    if (isLegend.value) checkLegend(currentLegendsData.value, isPoint.value ? true : form.is_allow_value, form.is_layered_scoring)
  }
  catch (err) {
    notifyError((err as Error).message)
    return
  }
  const payload = preparePayload()
  if (isEdit.value) payload.uuid = props.uuid || ''
  post(payload)
}

function post(payload: TemplatePayload) {
  isLoadingSubmit.value = true
  try {
    const { show_template_preset_feedback } = createUpdateTemplate(payload)
    const wasDefault = isDefaultLegendLabel.value
    if (!props.isDuplicate && form.legend_name.trim()) saveLegendName(form.legend_name, form.legend_apply_next)
    if (!props.isDuplicate && form.legend_apply_next && form.legend_name.trim() && !wasDefault) {
      toast.notify({ id: 'template-legend-name-saved', position: 'top-center', variant: 'success', title: 'Default legend label saved' })
    }
    const wording = isEdit.value ? 'updated' : 'created'
    toast.notify({ id: 'template-form-saved', position: 'top-center', variant: 'success', title: `Template ${props.isDuplicate ? 'duplicated' : wording}` })
    emit('updated', show_template_preset_feedback || false)
  }
  catch (e) {
    const err = e as TemplateApiError
    if (props.isDuplicate) {
      notifyError(err.errors?.name?.[0] || 'Error when duplicating template')
    }
    else {
      errors.value = err.errors ?? {}
      nameTouched.value = true
      notifyError(err.message || 'Please check form error')
    }
  }
  finally {
    isLoadingSubmit.value = false
  }
}

function addCategory() {
  form.categories.push({ name: '', id: `cf-${generateRandomKey()}`, description: '', weight: 0, required_comment: false, indicators: [] })
}
function removeCategory(id: string | number | undefined) {
  form.categories = form.categories.filter(c => c.id !== id)
}
function onChangeLayered(e: boolean) {
  form.is_layered_scoring = e
  legends.rating = [{
    from: e ? (form.ratings[0]?.from || 0) : Number(!form.is_start_from_0),
    to: e ? 0 : Number(!form.is_start_from_0),
    description: '',
    color: DEFAULT_LEGEND_COLOR,
  }]
}
function onUpdateRating() {
  if (form.is_layered_scoring && legends.rating[0]) legends.rating[0].from = form.ratings[0]?.from ?? 0
}

// ─── Category drag & drop ────────────────────────────────────────────────────────
const dragCatIdx = ref<number | null>(null)
const overCatIdx = ref<number | null>(null)
function onCatDragStart(i: number, e: DragEvent) {
  dragCatIdx.value = i
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }
}
function onCatDragEnter(i: number) { if (dragCatIdx.value !== null) overCatIdx.value = i }
function resetCatDrag() { dragCatIdx.value = null; overCatIdx.value = null }
function onCatDrop(i: number) {
  const from = dragCatIdx.value
  resetCatDrag()
  if (from === null || from === i) return
  const arr = form.categories.slice()
  arr.splice(i, 0, arr.splice(from, 1)[0])
  form.categories = arr
}

onMounted(() => { resetTemplate() })

defineExpose({ assignData, resetTemplate, preparePayload, handleSubmit, post, form, is_use_weight, currentLegendsData })

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
// Desktop: two panes side by side, each scrolling on its own. Below md the panes
// stack (canvas, then settings) and the body scrolls (production uses flex-wrap
// with auto heights below its desktop breakpoint).
const root = css({ display: 'flex', flexWrap: { base: 'wrap', md: 'nowrap' }, height: { base: 'auto', md: '100%' }, minHeight: '0', width: '100%' })
const loadingWrap = css({ marginY: '20', marginX: 'auto' })
const canvas = css({ flex: { base: '1 1 100%', md: '1' }, minWidth: '0', height: { base: 'auto', md: '100%' }, overflowY: { base: 'visible', md: 'auto' }, background: 'background.surface' })
const canvasInner = css({ maxWidth: '684px', marginX: 'auto', paddingY: '10', paddingX: '4' })
const sidePanel = css({ width: { base: '100%', md: '356px' }, flexShrink: '0', height: { base: 'auto', md: '100%' }, overflowY: { base: 'visible', md: 'auto' }, display: 'flex', flexDirection: 'column', gap: '6', borderLeftWidth: { base: '0', md: '1px' }, borderTopWidth: { base: '1px', md: '0' }, borderStyle: 'solid', borderLeftColor: 'border.default', borderTopColor: 'border.default', background: 'background.neutral', padding: '6' })
// Production frames these canvas sections as white cards (see Design System Debt).
const card = css({ background: 'background.neutral', border: '1px solid', borderColor: 'gray.100', borderRadius: 'md', padding: '4', marginY: '4' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const caption = css({ color: 'text.secondary' })
const categoryArea = css({ marginBottom: '10' })
const dimDrag = css({ opacity: '0.4' })
const dropRowLine = css({ boxShadow: '0 -3px 0 0 var(--mp-colors-border-brand)', borderRadius: 'md' })
const addCategoryBtn = css({ color: 'text.link', '& svg': { color: 'text.link' }, width: '100%' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const radioCol = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const optionsCol = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const savedNameRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' })
const savedNameLabel = css({ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' })
const savedNameText = css({ minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
const legendNameCheckbox = css({ marginTop: '8px' })
const optionsTitle = css({ fontWeight: '600' })
const inlineLabel = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
const inlineBadge = css({ display: 'inline-flex', alignItems: 'center', gap: '2' })
const viewOnly = css({ pointerEvents: 'none' })
const goalCheckbox = css({ marginTop: '4' })
</script>

<template>
  <div :class="root">
    <div v-if="isLoading" :class="loadingWrap"><MpSpinner /></div>
    <template v-else>
      <!-- Left side: categories, ratings, points, legends -->
      <div :class="canvas">
        <div :class="canvasInner">
          <MpBanner v-if="isViewOnly" variant="warning" :class="css({ marginBottom: '4' })">
            <MpBannerIcon />
            <MpBannerDescription>You can only view this template.</MpBannerDescription>
          </MpBanner>

          <!-- Score for goal only -->
          <div v-if="form.is_apply_score_for_goal_only" :class="card">
            <MpText as="h2" :class="h2Class">Score for goal only</MpText>
            <MpText size="label" :class="caption">Define the score to review the goal that has been created by the user. You can access the preview to see an example of scoring.</MpText>
            <div :class="[goalCheckbox, isViewOnly && viewOnly]">
              <MpCheckbox
                :id="`${uid}-template-required-comment-goal`"
                :is-checked="form.is_required_comment_goal"
                :is-disabled="isLoadingSubmit"
                @update:is-checked="(v: boolean) => (form.is_required_comment_goal = v)"
              >
                Required to fill out comments in each goals
              </MpCheckbox>
            </div>
          </div>

          <!-- Category area -->
          <div v-else :class="categoryArea">
            <div
              v-for="(category, catIdx) in form.categories"
              :key="category.id"
              :class="[catIdx === dragCatIdx && dimDrag, catIdx === overCatIdx && dropRowLine]"
              @dragenter.prevent="onCatDragEnter(catIdx)"
              @dragover.prevent
              @drop="onCatDrop(catIdx)"
            >
              <TemplateCategoryForm
                ref="categoryForms"
                :data-qa="`view-settings-template-form-category-${category.id}`"
                dragable
                :index="catIdx"
                :data="category"
                :answer-type="form.answer_type"
                :is-disabled="isLoadingSubmit"
                :is-using-weight="is_use_weight"
                :show-action-icons="form.categories.length > 1"
                :is-indicator-rating="isCustomEachIndicator"
                :start-rating-from="Number(!form.is_start_from_0)"
                is-show-require-comment
                :errors="errors"
                :is-layered-scoring="form.is_layered_scoring"
                :is-view-only="isViewOnly"
                @remove-category="removeCategory"
                @start="(e: DragEvent) => onCatDragStart(catIdx, e)"
                @end="resetCatDrag"
              />
            </div>

            <MpButton
              variant="secondary"
              left-icon="add-circular"
              :class="addCategoryBtn"
              :is-disabled="isLoadingSubmit || isViewOnly"
              data-qa="settings-template-form-btn-add-category"
              @click="addCategory"
            >
              Add category
            </MpButton>
          </div>

          <!-- Free text indicator category (rating, percentage, point) -->
          <TemplateCategoryForm
            v-if="isLegend && form.is_use_freetext_indicator"
            ref="freetextIndicator"
            is-freetext
            :index="form.categories.length"
            :data="form.category_freetext"
            :is-disabled="isLoadingSubmit"
            :is-layered-scoring="form.is_layered_scoring"
            :is-view-only="isViewOnly"
            :errors="errors"
          />

          <!-- Overall ratings -->
          <div v-if="isRating || isShowOverallRating" :class="card">
            <CycleRatingList
              ref="ratingList"
              title="Overall ratings"
              :ratings-data="form.ratings"
              :start-from="Number(startRatingFrom)"
              :is-disabled="isLoadingSubmit"
              :is-layered-scoring="form.is_layered_scoring"
              :is-view-only="isViewOnly"
              :errors="errors"
              addable
              @updated="onUpdateRating"
            />
          </div>

          <!-- Define points -->
          <div v-if="isPoint && !form.is_custom_points_enabled" :class="card">
            <CyclePointList
              ref="pointList"
              title="Define points"
              :points-data="form.points"
              :is-disabled="isLoadingSubmit"
              :is-view-only="isViewOnly"
              :errors="errors"
              addable
            />
          </div>

          <!-- Legends -->
          <div v-if="isLegend" :class="card">
            <TemplateLegendListForm
              ref="legendForm"
              :title="legendTitle"
              :legends-data="currentLegendsData"
              :is-rating="isRating"
              :is-percent="form.answer_type === 'percent'"
              :ratings="form.ratings"
              :is-disabled="isLoadingSubmit"
              :errors="errors"
              :unlimited-percentage="form.is_allow_value || isPoint"
              :is-layered-scoring="form.is_layered_scoring"
              :is-view-only="isViewOnly"
            />
          </div>
        </div>
      </div>

      <!-- Right side: template settings -->
      <div :class="[sidePanel, isViewOnly && viewOnly]">
        <!-- Name -->
        <MpFormControl :id="`${uid}-template-name`" is-required :is-invalid="!!nameError" :is-disabled="isViewOnly">
          <div :class="labelRow">
            <MpFormLabel>Template name</MpFormLabel>
            <span :class="charCount">{{ form.name.length }} / {{ NAME_MAX }}</span>
          </div>
          <MpInput v-model="form.name" :maxlength="NAME_MAX" placeholder="e.g Performance appraisal" data-qa="settings-template-form-input-name" @blur="nameTouched = true" />
          <MpFormErrorMessage>{{ nameError }}</MpFormErrorMessage>
        </MpFormControl>

        <!-- Summary -->
        <MpFormControl :id="`${uid}-template-required-summary`" :is-disabled="isViewOnly">
          <MpFormLabel>Fill out summary</MpFormLabel>
          <div :class="radioCol" data-qa="settings-template-form-radio-group-summary">
            <MpRadio :id="`${uid}-required_summary_true`" name="required_summary" value="true" :is-checked="form.required_summary === 'true'" @update:is-checked="() => (form.required_summary = 'true')">Yes</MpRadio>
            <MpRadio :id="`${uid}-required_summary_false`" name="required_summary" value="false" :is-checked="form.required_summary === 'false'" @update:is-checked="() => (form.required_summary = 'false')">No</MpRadio>
          </div>
        </MpFormControl>

        <!-- Question / answer type -->
        <MpFormControl :id="`${uid}-template-answer-type`" :is-disabled="isViewOnly">
          <MpFormLabel>Question type</MpFormLabel>
          <div :class="radioCol" data-qa="settings-template-form-radio-group-question-type">
            <MpRadio
              v-for="answer in ANSWER_TYPES"
              :id="`${uid}-answer_type_${answer.slug}`"
              :key="answer.slug"
              name="answer_type"
              :value="answer.slug"
              :is-checked="form.answer_type === answer.slug"
              :data-qa="`view-settings-template-form-answer-type-${answer.slug}`"
              @update:is-checked="() => (form.answer_type = answer.slug)"
            >
              {{ answer.name }}
            </MpRadio>
          </div>
        </MpFormControl>

        <!-- Optional settings for rating / percentage / point -->
        <div v-if="isLegend" :class="optionsCol">
          <MpText :class="optionsTitle">{{ additionalTitle }}</MpText>

          <MpCheckbox
            :id="`${uid}-template-use-weight`"
            :is-checked="is_use_weight"
            :is-disabled="form.is_apply_score_for_goal_only || isViewOnly"
            @update:is-checked="(v: boolean) => (is_use_weight = v)"
          >
            Use weight
          </MpCheckbox>

          <template v-if="isRating">
            <MpCheckbox
              :id="`${uid}-template-indicator-rating`"
              :is-checked="form.is_indicator_rating"
              :is-disabled="form.is_apply_score_for_goal_only || isViewOnly"
              @update:is-checked="(v: boolean) => (form.is_indicator_rating = v)"
            >
              Set rating for each indicator
            </MpCheckbox>
            <MpCheckbox :id="`${uid}-template-start-from-0`" :is-checked="form.is_start_from_0" :is-disabled="isViewOnly" @update:is-checked="(v: boolean) => (form.is_start_from_0 = v)">
              Select start rating number from 0
            </MpCheckbox>
          </template>

          <MpCheckbox
            v-if="form.answer_type === 'percent' || form.answer_type === 'point'"
            :id="`${uid}-template-allow-value`"
            :is-checked="form.is_allow_value"
            :is-disabled="isViewOnly"
            @update:is-checked="(v: boolean) => (form.is_allow_value = v)"
          >
            <span :class="inlineLabel">
              Allow value more than 100%
              <MpTooltip label="Reviewer can input the percentage value more than 100%" use-portal>
                <MpIcon name="info" size="sm" color="icon.secondary" />
              </MpTooltip>
            </span>
          </MpCheckbox>

          <MpCheckbox :id="`${uid}-template-freetext-indicator`" :is-checked="form.is_use_freetext_indicator" :is-disabled="isViewOnly" @update:is-checked="(v: boolean) => (form.is_use_freetext_indicator = v)">
            Use free text indicator
          </MpCheckbox>

          <MpCheckbox
            v-if="isPoint"
            :id="`${uid}-template-custom-points`"
            :is-checked="form.is_custom_points_enabled"
            :is-disabled="isViewOnly"
            @update:is-checked="(v: boolean) => (form.is_custom_points_enabled = v)"
          >
            <span :class="inlineLabel">
              Custom point for each indicators
              <MpTooltip label="Easily customize specific points for each indicator to match your preferences." placement="bottom" use-portal>
                <MpIcon name="info" size="sm" color="icon.secondary" />
              </MpTooltip>
            </span>
          </MpCheckbox>
          <template v-else>
            <MpCheckbox :id="`${uid}-template-negative-indicator`" :is-checked="form.is_use_negative_indicator" :is-disabled="isViewOnly" @update:is-checked="(v: boolean) => (form.is_use_negative_indicator = v)">
              Allow negative indicator on review
            </MpCheckbox>
            <MpCheckbox :id="`${uid}-template-goal-only`" :is-checked="form.is_apply_score_for_goal_only" :is-disabled="isViewOnly" @update:is-checked="(v: boolean) => (form.is_apply_score_for_goal_only = v)">
              Apply score for goal only
            </MpCheckbox>
          </template>

          <MpCheckbox v-if="isRating" :id="`${uid}-template-layered-scoring`" :is-checked="form.is_layered_scoring" :is-disabled="isViewOnly" @update:is-checked="onChangeLayered">
            <span :class="inlineBadge">Layered scoring <MpBadge for="tableStatus" type="critical" size="sm">New</MpBadge></span>
            <template #description>Using two scoring methods of rating and point.</template>
          </MpCheckbox>
        </div>

        <!-- Legend label: its own block, same 24px rhythm as the other settings groups -->
        <MpFormControl v-if="isLegend" :id="`${uid}-template-legend-name`" :is-invalid="!!legendLabelError" :is-disabled="isViewOnly">
          <div :class="labelRow">
            <MpFormLabel>Legend label</MpFormLabel>
            <span :class="charCount">{{ form.legend_name.length }} / {{ LEGEND_NAME_MAX }}</span>
          </div>
          <PxSelectPopover
            v-model="form.legend_name"
            :options="legendOptions"
            allow-custom-value
            keep-text-on-focus
            :maxlength="LEGEND_NAME_MAX"
            placeholder="Select or type legend label"
            width="100%"
            :is-disabled="isViewOnly"
          >
            <template #option="{ option }">
              <div :class="savedNameRow">
                <span :class="savedNameLabel">
                  <span :class="savedNameText">{{ option.label }}</span>
                  <MpBadge v-if="option.value === effectiveLegendDefault" for="tableStatus" type="announcement" size="sm">Default</MpBadge>
                </span>
                <MpTooltip v-if="option.value !== LEGEND_NAME_DEFAULT" label="Remove" use-portal>
                  <MpButton variant="ghost" size="sm" :aria-label="`Remove ${option.label}`" @click.stop="onRemoveLegendLabel(option.value)"><MpIcon name="minus-circular" size="sm" /></MpButton>
                </MpTooltip>
              </div>
            </template>
          </PxSelectPopover>
          <MpFormErrorMessage>{{ legendLabelError }}</MpFormErrorMessage>
          <div v-if="!isDefaultLegendLabel && form.legend_name.trim()" :class="legendNameCheckbox">
            <!-- Disabled checkboxes swallow hover, so the tooltip wraps a span. Editing never changes the default. -->
            <component :is="isEdit ? MpTooltip : 'div'" v-bind="isEdit ? { label: 'You can only set a default legend label when creating a template', showDelay: 0, usePortal: true } : {}">
              <span>
                <MpCheckbox
                  :id="`${uid}-legend-apply-next`"
                  :is-checked="form.legend_apply_next"
                  :is-disabled="isViewOnly || isEdit"
                  @update:is-checked="(v: boolean) => (form.legend_apply_next = v)"
                >
                  Set as default
                  <template #description>Applies to every template you create</template>
                </MpCheckbox>
              </span>
            </component>
          </div>
        </MpFormControl>
      </div>
    </template>
  </div>
</template>
