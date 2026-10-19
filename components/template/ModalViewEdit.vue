<!--
  Migrated from talenta-review (commit eca8e8d55):
    src/views/settings/template/component/ModalViewEdit.vue
  Component name preserved: ModalTemplateView. Props/events preserved: isOpen
  (+ update:isOpen), cycleUuid, reviewMethod.
  Opened from a review cycle's "Edit template" link: edits the cycle's PRIVATE
  copy of its template (not the shared one in Settings → Templates).

  Removed for the prototype (re-wire on backport):
  - $axios POST /private-templates/detail and /private-templates/edit-private-template
    → usePrivateTemplatesStore (hardcoded mock).
  - alertMixin.alertToast → Pixel toast. templateMixin validateCategories /
    validateForm / validateLegends → each child's exposed validate();
    checkWeight / checkLegend copied from TemplateForm.vue (same mixin source).
  - `cycleUuid === $route.params.id` fetch guard (the prototype route has no uuid).
  - ModalConfirmation → inline MpModal siblings (Pixel 3 crashes when a modal opens
    inside another modal's content — docs/patterns/avatar.md).

  Story 7 (PR-9665): the legends heading reads the saved legend label (" (%)" suffix
  for non-rating templates kept, O11). An edit icon 4px after it opens "Edit legend
  label" (ModalEditLegendLabel.vue), mounted as a SIBLING modal — its series-wide save
  is separate from "Save changes" here.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpButton, MpText, MpCheckbox, MpSpinner, MpTooltip,
  toast, css,
} from '@mekari/pixel3'
import {
  answerTypeName, LEGEND_NAME_DEFAULT, type TemplateLegend,
} from '~/utils/reviewTemplate'
import type { PrivateTemplateDetail } from '~/composables/usePrivateTemplatesStore'

defineOptions({ name: 'ModalTemplateView' })

const uid = useId()

const props = withDefaults(defineProps<{ isOpen?: boolean, cycleUuid?: string, reviewMethod?: string }>(), { isOpen: false, cycleUuid: '', reviewMethod: '' })
const emit = defineEmits<{ 'update:isOpen': [value: boolean] }>()

const { getPrivateTemplate, editPrivateTemplate } = usePrivateTemplatesStore()

const spinner = reactive({ isLoadingDetail: false, isLoadingSubmit: false })
const data = ref<PrivateTemplateDetail | null>(null)
const errors = ref<Record<string, string[] | string>>({})
const isModalDiscard = ref(false)
const isModalConfirm = ref(false)

const template = computed(() => data.value?.template)
const isRating = computed(() => template.value?.answer_type === 'rating')
const isPoint = computed(() => template.value?.answer_type === 'point')
const isLayered = computed(() => Boolean(template.value?.is_layered_scoring))
const isEachIndicator = computed(() => template.value?.is_indicator_rating === '1' || Boolean(data.value?.is_custom_points_enabled))
const ratingStartFrom = computed(() => (data.value?.ratings?.length ? Number(data.value.ratings[0]?.value) : 0))
const isGoalOnlyTemplate = computed(() => template.value?.is_apply_score_for_goal_only || false)

// Production: `Legends${!is_rating ? ' (%)' : ''}` — the saved label replaces "Legends" (O11).
const legendsTitle = computed(() => `${template.value?.legend_name?.trim() || LEGEND_NAME_DEFAULT}${!data.value?.is_rating ? ' (%)' : ''}`)

const isLegendModalOpen = ref(false)
// nextTick: the click that opened the modal must finish before it mounts (outside-click guard).
function onEditLegendLabel() { nextTick(() => { isLegendModalOpen.value = true }) }
// The label is saved on its own; mirror it here so the heading (and a later "Save changes") use it.
function onLegendLabelUpdated(name: string) { if (template.value) template.value.legend_name = name }

// ─── Fetch (MOCK of POST /private-templates/detail) ──────────────────────────────
function fetch() {
  if (spinner.isLoadingDetail) return
  spinner.isLoadingDetail = true
  try {
    data.value = getPrivateTemplate(props.cycleUuid, props.reviewMethod)
  }
  catch (e) {
    notify((e as Error)?.message || 'Failed to fetch template detail', 'error')
    close()
  }
  finally {
    spinner.isLoadingDetail = false
  }
}
watch(() => props.isOpen, (val) => {
  if (!val) return
  errors.value = {}
  fetch()
})

function onClose() { isModalDiscard.value = true }
function close() {
  isModalDiscard.value = false
  emit('update:isOpen', false)
}
function notify(title: string, variant: 'success' | 'error') {
  toast.notify({ id: `private-template-${variant}`, position: 'top-center', variant, title })
}

// ─── Validation (templateMixin, see header) ──────────────────────────────────────
const categoryForms = ref<{ validate: () => boolean }[]>([])
const ratingList = ref<{ validate: () => boolean } | null>(null)
const pointList = ref<{ validate: () => boolean } | null>(null)
const legendForm = ref<{ validate: () => boolean } | null>(null)

function checkWeight() {
  let totalCategoryWeight = 0
  data.value!.categories.filter(c => !c.is_use_freetext_indicator).forEach((category) => {
    totalCategoryWeight += Number.parseFloat(String(category.weight || 0))
    const totalIndicatorWeight = category.indicators.reduce((a, b) => (a + Number.parseFloat(String(b?.weight || 0))), 0)
    if (Number(totalIndicatorWeight.toFixed(2)) !== 100) throw new Error(`Total indicator weight in ${category.name} category must be 100%`)
  })
  if (!(totalCategoryWeight > 99.99 && totalCategoryWeight <= 100)) throw new Error('Total category weight must be 100%')
}
function checkLegend(list: TemplateLegend[], unlimitedValue = false) {
  const lastLegend = list[list.length - 1]
  if (!lastLegend) return
  const value = Number.parseFloat(String(lastLegend.to || 0))
  let maxValueLegend = unlimitedValue ? 999.99 : 100
  let errVal = `${maxValueLegend}%`
  if (isRating.value) {
    const last = data.value!.ratings[data.value!.ratings.length - 1]
    maxValueLegend = Number.parseInt(String(isLayered.value ? last?.to : last?.value), 10)
    errVal = `${maxValueLegend} (max rating)`
  }
  if (value !== maxValueLegend && !unlimitedValue) {
    lastLegend.to = maxValueLegend
    throw new Error(`The maximum value of legend must be ${errVal}`)
  }
}

function handleSubmit() {
  if (!data.value) return
  try {
    const isCategoriesError = isGoalOnlyTemplate.value ? false : !categoryForms.value.map(f => f.validate()).every(Boolean)
    const isRatingsError = isRating.value && ratingList.value ? !ratingList.value.validate() : false
    const isPointsError = isPoint.value && !isEachIndicator.value && pointList.value ? !pointList.value.validate() : false
    const isLegendsError = data.value.is_legend && legendForm.value ? !legendForm.value.validate() : false
    if (isCategoriesError || isRatingsError || isPointsError || isLegendsError) {
      notify('Please check the form\'s error', 'error')
      return
    }
    if (template.value?.calculate_type === 'weight') checkWeight()
    if (data.value.is_legend) checkLegend(data.value.legends, isPoint.value)
    isModalConfirm.value = true
  }
  catch (err) {
    notify((err as Error).message, 'error')
  }
}

// MOCK of POST /private-templates/edit-private-template
function submitTemplate() {
  if (!data.value) return
  isModalConfirm.value = false
  spinner.isLoadingSubmit = true
  try {
    editPrivateTemplate(props.cycleUuid, props.reviewMethod, data.value)
    notify('Template successfully edited', 'success')
    close()
  }
  catch (e) {
    notify((e as Error)?.message || 'Failed to edit template', 'error')
  }
  finally {
    spinner.isLoadingSubmit = false
  }
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
const contentClass = css({ display: 'flex', flexDirection: 'column', height: '100vh', background: 'background.surface' })
// White header, same as the Settings builder (ModalForm.vue) — Pixel's default is grey.
const headerWhite = css({ background: 'background.neutral' })
const headerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', width: 'calc(100% - 48px)' })
const titleText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
// Same as the builder modal (docs/patterns/builder-modal.md): the body clips, an inner pane scrolls.
const bodyClass = css({ padding: '0', flex: '1', minHeight: '0', overflow: 'hidden', display: 'flex' })
const scroller = css({ flex: '1', minWidth: '0', height: '100%', overflowY: 'auto' })
const loadingWrap = css({ display: 'flex', justifyContent: 'center', marginY: '20', width: '100%' })
const stickyHead = css({ position: 'sticky', top: '0', zIndex: '3', padding: '6', background: 'background.neutral', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const column = css({ width: '684px', maxWidth: '100%', marginX: 'auto' })
const content = css({ width: '684px', maxWidth: '100%', marginX: 'auto', marginY: '10', paddingX: '4', display: 'flex', flexDirection: 'column', gap: '5' })
const nameText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const metaText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const metaValue = css({ color: 'text.secondary' })
const card = css({ background: 'background.neutral', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', padding: '4' })
const cardTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default', marginBottom: '4' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
const bodyText = css({ color: 'text.default' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="full" :is-close-on-esc="false" @close="onClose">
      <MpModalOverlay />
      <MpModalContent :class="contentClass">
        <MpModalHeader :class="headerWhite">
          <div :class="headerRow">
            <MpText as="h1" :class="titleText">View / edit template</MpText>
            <MpButton
              data-qa="modal-view-edit-template-submit"
              :is-disabled="spinner.isLoadingDetail || spinner.isLoadingSubmit"
              :is-loading="spinner.isLoadingSubmit"
              @click="handleSubmit"
            >
              Save changes
            </MpButton>
          </div>
          <MpModalCloseButton :is-disabled="spinner.isLoadingDetail" @click="onClose" />
        </MpModalHeader>
        <MpModalBody :class="bodyClass">
          <div v-if="spinner.isLoadingDetail || !data || !template" :class="loadingWrap"><MpSpinner /></div>
          <div v-else :class="scroller">
            <!-- Header -->
            <div :class="stickyHead">
              <div :class="column">
                <MpText :class="nameText">{{ template.name || 'Unnamed' }}</MpText>
                <MpText :class="metaText">Question type: <span :class="metaValue">{{ answerTypeName(template.answer_type) }}</span></MpText>
                <MpText v-if="isPoint || isRating" :class="metaText">
                  {{ isPoint ? 'Custom point for' : 'Rating' }} each indicators: <span :class="metaValue">{{ isEachIndicator ? 'Yes' : 'No' }}</span>
                </MpText>
              </div>
            </div>

            <!-- Content -->
            <div :class="content">
              <!-- Summary -->
              <MpCheckbox
                :id="`${uid}-required-summary`"
                :is-checked="template.required_summary"
                data-qa="settings-template-modal-view-edit-checkbox-required-summary"
                @update:is-checked="(v: boolean) => (template!.required_summary = v)"
              >
                Required to fill out summary
              </MpCheckbox>

              <!-- Goal only -->
              <div v-if="isGoalOnlyTemplate" :class="card">
                <MpText :class="cardTitle">Score for goal only</MpText>
                <MpCheckbox :id="`${uid}-required-comment-goal`" :is-checked="template.is_required_comment_goal" @update:is-checked="(v: boolean) => (template!.is_required_comment_goal = v)">
                  Required to fill out comments in each goals
                </MpCheckbox>
              </div>

              <!-- Categories -->
              <div v-if="!isGoalOnlyTemplate">
                <template v-for="(category, catIdx) in data.categories" :key="catIdx">
                  <TemplateCategoryForm
                    v-if="category.is_use_freetext_indicator"
                    ref="categoryForms"
                    :data="category"
                    :is-disabled="spinner.isLoadingSubmit"
                    is-freetext
                    is-view-edit
                    :errors="errors"
                  />
                  <TemplateCategoryForm
                    v-else
                    ref="categoryForms"
                    :index="catIdx"
                    :data="category"
                    :answer-type="template.answer_type"
                    :is-disabled="spinner.isLoadingSubmit"
                    :is-using-weight="template.calculate_type === 'weight'"
                    :is-indicator-rating="Boolean((isRating || isPoint) && isEachIndicator)"
                    :start-rating-from="ratingStartFrom"
                    is-show-require-comment
                    is-view-edit
                    :is-layered-scoring="template.is_layered_scoring"
                    :errors="errors"
                  />
                </template>
              </div>

              <!-- Points -->
              <div v-if="isPoint && !isEachIndicator" :class="card">
                <CyclePointList ref="pointList" title="Define points" :points-data="data.ratings" :errors="errors" @updated="(val: any) => (data!.ratings = val)" />
              </div>

              <!-- Ratings -->
              <div v-if="isRating" :class="card">
                <CycleRatingList
                  ref="ratingList"
                  title="Overall ratings"
                  :ratings-data="data.ratings"
                  :start-from="ratingStartFrom"
                  :errors="errors"
                  :is-layered-scoring="template.is_layered_scoring"
                  @updated="(val: any) => (data!.ratings = val)"
                />
              </div>

              <!-- Legends (heading = saved legend label; edited from the cycle page, Story 7) -->
              <div v-if="data.is_legend" :class="card">
                <TemplateLegendListForm
                  ref="legendForm"
                  :title="legendsTitle"
                  :legends-data="data.legends"
                  :is-rating="isRating"
                  :ratings="data.ratings"
                  :errors="errors"
                  :is-layered-scoring="template.is_layered_scoring"
                  :is-not-addable="data.use_9box_auto_generate"
                  :unlimited-percentage="isPoint"
                  @updated="(val: TemplateLegend[]) => (data!.legends = val)"
                >
                  <template #title-action>
                    <MpTooltip label="Edit" :show-delay="0" use-portal>
                      <MpButton variant="ghost" size="sm" left-icon="edit" aria-label="Edit legend label" @click="onEditLegendLabel" />
                    </MpTooltip>
                  </template>
                </TemplateLegendListForm>
              </div>
            </div>
          </div>
        </MpModalBody>
      </MpModalContent>
    </MpModal>

    <!-- Edit legend label (Story 7) — sibling, never inside the modal content above -->
    <TemplateModalEditLegendLabel v-model:is-open="isLegendModalOpen" :cycle-uuid="cycleUuid" :review-method="reviewMethod" @updated="onLegendLabelUpdated" />

    <!-- Modal confirmation to cancel -->
    <MpModal :is-open="isModalDiscard" @close="isModalDiscard = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Cancel editing template?
          <MpModalCloseButton @click="isModalDiscard = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">Your changes will be deleted and you can't undo this action.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="isModalDiscard = false">Keep template</MpButton>
            <MpButton variant="danger" @click="close">Discard changes</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Modal confirmation to submit -->
    <MpModal :is-open="isModalConfirm" @close="isModalConfirm = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Edit template?
          <MpModalCloseButton @click="isModalConfirm = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">
            Changes you made will affect all cycle using this information.
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="isModalConfirm = false">Cancel</MpButton>
            <MpButton :is-loading="spinner.isLoadingSubmit" @click="submitTemplate">Yes, save it</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
