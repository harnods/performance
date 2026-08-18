<script setup lang="ts">
// ─────────────────────────────────────────────────────────────────────────────
// Create-cycle form for Performance Review & Competency Review (production parity
// with GeneralForm.vue). One form, two purposes — competency-only and
// performance-only sections are gated by `purpose`. Persists a full cycle record
// to the review-cycles mini-DB on save.
//
// STAGE 1 (this file): all main sections + persistence. The Review Method drawer
// reuses the existing ReviewMethodDrawer; full method-drawer fidelity
// (layering/prefill/custom weight) and the Deduction drawer are layered in next.
// ─────────────────────────────────────────────────────────────────────────────
import {
  MpFlex,
  MpButton,
  MpText,
  MpIcon,
  MpBadge,
  MpToggle,
  MpCheckbox,
  MpRadio,
  MpInput,
  MpInputGroup,
  MpInputRightAddon,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpTooltip,
  MpTextlink,
  MpAvatar,
  MpDatePicker,
  MpBanner,
  MpBannerIcon,
  MpBannerDescription,
  toast,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES, employeeById, employeeMeta } from '~/utils/employees'
import { useReviewCyclesStore } from '~/composables/useReviewCyclesStore'
import type { MethodConfig, ReviewCycleConfig } from '~/composables/useReviewCyclesStore'
import { makeMethodForm } from '~/utils/reviewMethod'
import type { MethodForm, MethodKey } from '~/utils/reviewMethod'
import { makeDeductionConfig } from '~/utils/deduction'
import type { DeductionConfig } from '~/utils/deduction'

const props = defineProps<{
  purpose: 'performance' | 'competency'
  initialName?: string
}>()

const router = useRouter()
const { addCycle } = useReviewCyclesStore()

const isCompetency = computed(() => props.purpose === 'competency')
const cycleTypeLabel = computed(() => (isCompetency.value ? 'Competency' : 'Performance'))

// ─── Cycle name (inline editable header, mirrors Evaluation form) ────────────────
const cycleName = ref(props.initialName || '')
const isEditingName = ref(false)
const nameInput = ref<InstanceType<typeof MpInput> | null>(null)
function startEditName() {
  isEditingName.value = true
  nextTick(() => {
    const el = (nameInput.value as unknown as { $el?: HTMLElement })?.$el
    el?.querySelector('input')?.focus()
  })
}

// ─── [C] Assessment objective + key position (succession plan) ───────────────────
const assessmentPurpose = ref(1)
const assessmentPurposeOptions = [
  { id: 1, name: 'Individual development' },
  { id: 2, name: 'Succession planning' },
]
const isSuccessionPlan = computed(() => isCompetency.value && Number(assessmentPurpose.value) === 2)
const keyPosition = ref('')
const keyPositions = [
  { id: 'kp-eng', job: 'Head of Engineering' },
  { id: 'kp-sales', job: 'Sales Director' },
  { id: 'kp-ops', job: 'Head of Operations' },
  { id: 'kp-fin', job: 'Head of Accounting' },
  { id: 'kp-mkt', job: 'Head of Marketing' },
]

// ─── [P] Duplicate from an existing cycle ────────────────────────────────────────
const isImport = ref('0') // '1' | '0'
const importFromId = ref('')
const { cycles: allCycles } = useReviewCyclesStore()
const importableOptions = computed(() =>
  allCycles.value
    .filter(c => c.purpose === props.purpose)
    .map(c => ({ value: c.id, label: c.name })))
const dupComponents = reactive({ member: false, reviewer: false, reviewMethod: false })
const dupModalOpen = ref(false)

// ─── [S] Who will be reviewed (members) ──────────────────────────────────────────
const memberIds = ref<string[]>([])
const memberDrawerOpen = ref(false)
const selectedMembers = computed(() => memberIds.value.map(id => employeeById(id)).filter(Boolean) as typeof EMPLOYEES)
const totalMember = computed(() => EMPLOYEES.length)
const isAllMembers = computed({
  get: () => memberIds.value.length === totalMember.value && totalMember.value > 0,
  set: (v: boolean) => { memberIds.value = v ? EMPLOYEES.map(e => e.id) : [] },
})
function onMembersContinue(ids: string[]) {
  memberIds.value = ids
  memberDrawerOpen.value = false
}
function removeMember(id: string) {
  memberIds.value = memberIds.value.filter(m => m !== id)
}

// ─── [S] Time frame + review period ──────────────────────────────────────────────
const timeframe = ref('')
const timeframeOptions = [
  { value: 'tf-h1-2026', label: 'H1 2026 (1 Jan - 30 Jun 2026)', start: '2026-01-01', end: '2026-06-30' },
  { value: 'tf-h2-2026', label: 'H2 2026 (1 Jul - 31 Dec 2026)', start: '2026-07-01', end: '2026-12-31' },
  { value: 'tf-q3-2026', label: 'Q3 2026 (1 Jul - 30 Sep 2026)', start: '2026-07-01', end: '2026-09-30' },
  { value: 'tf-fy-2026', label: 'FY 2026 (1 Jan - 31 Dec 2026)', start: '2026-01-01', end: '2026-12-31' },
]
const cyclePeriod = ref<Date[]>([])
const reviewPeriod = ref<Date[]>([])
watch(timeframe, (v) => {
  const tf = timeframeOptions.find(t => t.value === v)
  if (tf) cyclePeriod.value = [new Date(tf.start), new Date(tf.end)]
})

// ─── [S] Repeat cycle ────────────────────────────────────────────────────────────
const isRecursive = ref(false)

// ─── [S] Review methods ──────────────────────────────────────────────────────────
const enableLockReview = ref(false)

interface MethodState {
  key: MethodKey
  title: string
  link: string
  is_active: boolean
  configured: boolean
  weight: number | '' // cross-method weight (main-form "Use weight")
  form: MethodForm // full drawer config
}
function makeMethod(key: MethodKey, title: string, link: string, active = false): MethodState {
  return { key, title, link, is_active: active, configured: false, weight: '', form: makeMethodForm() }
}
const methods = reactive<Record<string, MethodState>>({
  manager_review: makeMethod('manager_review', 'Manager review', 'manager-review', true),
  threesixty_review: makeMethod('threesixty_review', '360-degree review', 'threesixty-review'),
  peer_to_peer: makeMethod('peer_to_peer', 'Team review', 'peer-to-peer'),
  self_review: makeMethod('self_review', 'Self review', 'self-review'),
})
const methodList = computed(() => Object.values(methods))
const activeMethods = computed(() => methodList.value.filter(m => m.is_active))
const isExcludeRating = computed(() => !!methods.self_review.is_active && !!methods.self_review.form.is_exclude_rating)
// A comment-only Self review doesn't score, so it isn't weightable.
const weightableMethods = computed(() =>
  activeMethods.value.filter(m => !(m.key === 'self_review' && m.form.is_exclude_rating)))
// Use weight becomes available at 2 scoring methods (3 if Self is comment-only).
const validWeightedFlag = computed(() => weightableMethods.value.length >= (isExcludeRating.value ? 3 : 2))
const isShowMethodWeight = ref(false)
watch(validWeightedFlag, (ok) => { if (!ok) isShowMethodWeight.value = false })
const totalMethodWeight = computed(() =>
  weightableMethods.value.reduce((s, m) => s + (m.weight === '' ? 0 : Number(m.weight)), 0))

// Review Method drawer
const methodDrawerOpen = ref(false)
const activeMethodKey = ref<MethodKey>('manager_review')
const activeMethod = computed(() => methods[activeMethodKey.value])
function openMethodDrawer(key: MethodKey) {
  activeMethodKey.value = key
  nextTick(() => { methodDrawerOpen.value = true })
}
function onMethodToggle(key: MethodKey, v: boolean) {
  // Toggling a method only enables/disables it — the drawer opens on "Manage",
  // never automatically on toggle.
  methods[key].is_active = v
}
function onMethodSaved(form: MethodForm) {
  const m = methods[activeMethodKey.value]
  m.form = form
  m.configured = true
}

// ─── [C] 9-box convert score ─────────────────────────────────────────────────────
const is9BoxConvertScore = ref(false)
interface Legend { from: number | '', to: number | '', description: string }
const nineBoxLegend = ref<Legend[]>([
  { from: 0, to: 40, description: 'Low' },
  { from: 41, to: 70, description: 'Medium' },
  { from: 71, to: 100, description: 'High' },
])
function addLegend() { nineBoxLegend.value.push({ from: '', to: '', description: '' }) }
function removeLegend(i: number) { if (nineBoxLegend.value.length > 1) nineBoxLegend.value.splice(i, 1) }

// ─── [P] Advanced scoring / Deduction ────────────────────────────────────────────
const isDeduction = ref(false)
const deductionConfig = reactive<DeductionConfig>(makeDeductionConfig())
const deductionDrawerOpen = ref(false)
const isDisabledDeduction = computed(() =>
  // > 1 method but weight off (nothing to attach the deduction to).
  (validWeightedFlag.value && !isShowMethodWeight.value))
function onDeductionToggle(v: boolean) {
  // Toggle only enables/disables — the drawer opens on "Manage", never on toggle.
  isDeduction.value = v
}
function openDeductionManage() { deductionDrawerOpen.value = true }
function onDeductionSaved(cfg: DeductionConfig) { Object.assign(deductionConfig, cfg) }

// ─── [S] Publish score after ─────────────────────────────────────────────────────
const publishScoreWhen = ref('after_review_complete')
const publishOptions = [
  { value: 'after_review_complete', name: 'Complete review' },
  { value: 'after_cycle_end', name: 'Review period end' },
  { value: 'both', name: 'Both' },
]

// ─── Validation (surfaces after save attempt) ────────────────────────────────────
const submitted = ref(false)
const nameInvalid = computed(() => submitted.value && !cycleName.value.trim())
const keyPositionInvalid = computed(() => submitted.value && isSuccessionPlan.value && !keyPosition.value)
const memberInvalid = computed(() => submitted.value && !dupComponents.member && memberIds.value.length === 0)
const timeframeInvalid = computed(() => submitted.value && !timeframe.value)
const cyclePeriodInvalid = computed(() => submitted.value && cyclePeriod.value.length < 2)
const reviewPeriodInvalid = computed(() => submitted.value && reviewPeriod.value.length < 2)
const noMethodSelected = computed(() => submitted.value && !dupComponents.reviewMethod && activeMethods.value.length === 0)
const unconfiguredMethods = computed(() =>
  submitted.value ? activeMethods.value.filter(m => !m.configured) : [])
const weightTotalInvalid = computed(() =>
  submitted.value && isShowMethodWeight.value && validWeightedFlag.value && totalMethodWeight.value !== 100)
const nineBoxInvalid = computed(() =>
  submitted.value && isCompetency.value && is9BoxConvertScore.value
  && nineBoxLegend.value.some(l => l.from === '' || l.to === '' || !l.description.trim()))

// ─── Save → build payload → persist ──────────────────────────────────────────────
function fmt(d?: Date): string {
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''
}
function buildMethod(m: MethodState): MethodConfig {
  const f = m.form
  return {
    is_active: m.is_active,
    template_uuid: f.template_uuid,
    include_goals: f.include_goals,
    goal_types: f.goal_types,
    goal_auto_score_enabled: f.goal_auto_score_enabled,
    can_reviewer_edit_goal_auto_score: f.can_reviewer_edit_goal_auto_score,
    goal_achievement_ratings: f.goal_auto_score_enabled ? f.goal_achievement_ratings : [],
    use_9box_auto_generate: f.use_9box_auto_generate,
    is_layering_review: f.is_layering_review,
    review_order: f.is_layering_review ? f.review_order : '',
    is_attendance_advance_scoring: f.is_attendance_advance_scoring,
    attendance_advance_scoring: f.is_attendance_advance_scoring ? f.attendance_advance_scoring : [],
    is_include_reprimand_data: f.is_include_reprimand_data,
    is_reprimand_use_score: f.is_reprimand_use_score,
    reprimand_advance_scoring: f.is_reprimand_use_score ? f.reprimand_advance_scoring : [],
    is_simple_sum: f.is_simple_sum,
    weight_implementation: f.weight_implementation,
    weight_employment_type: f.weight_employment_type,
    custom_weight_implementation: f.weight_implementation === 'custom' ? f.custom_weight_implementation : [],
    review_weight: f.review_weight,
    goal_weight: f.goal_weight,
    advance_score_weight: f.advance_score_weight,
    reprimand_data_weight: f.reprimand_data_weight,
    weight: isShowMethodWeight.value ? (m.weight || 0) : '',
  }
}

function onSave() {
  submitted.value = true
  if (
    nameInvalid.value || keyPositionInvalid.value || memberInvalid.value
    || timeframeInvalid.value || cyclePeriodInvalid.value || reviewPeriodInvalid.value
    || noMethodSelected.value || unconfiguredMethods.value.length > 0
    || weightTotalInvalid.value || nineBoxInvalid.value
  ) {
    toast.notify({ id: 'cycle-form-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
    return
  }

  const tf = timeframeOptions.find(t => t.value === timeframe.value)
  const mgr = methods.manager_review.form
  const self = methods.self_review.form
  const t360 = methods.threesixty_review.form
  const team = methods.peer_to_peer.form
  const config: ReviewCycleConfig = {
    name: cycleName.value.trim(),
    slug: cycleName.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    cycle_purpose: props.purpose,
    assessment_purpose: Number(assessmentPurpose.value),
    key_position_id: isSuccessionPlan.value ? keyPosition.value : '',
    is_nine_box_convert_score: isCompetency.value && is9BoxConvertScore.value,
    competency_legends: (isCompetency.value && is9BoxConvertScore.value)
      ? nineBoxLegend.value.map(l => ({ from: Number(l.from).toFixed(2), to: Number(l.to).toFixed(2), label: l.description, description: l.description }))
      : null,
    is_import: Number(isImport.value),
    cycle_master_uuid: isImport.value === '1' ? importFromId.value : '',
    components: { ...dupComponents },
    cycle_members: memberIds.value,
    is_recursive: isRecursive.value,
    period_uuid: timeframe.value,
    start_date: fmt(cyclePeriod.value[0]) || (tf?.start ?? ''),
    end_date: fmt(cyclePeriod.value[1]) || (tf?.end ?? ''),
    start_date_review: fmt(reviewPeriod.value[0]),
    deadline_date: fmt(reviewPeriod.value[1]),
    manager_review: buildMethod(methods.manager_review),
    threesixty_review: buildMethod(methods.threesixty_review),
    peer_to_peer: buildMethod(methods.peer_to_peer),
    self_review: buildMethod(methods.self_review),
    use_weight: validWeightedFlag.value && isShowMethodWeight.value,
    auto_assign_reviewer: mgr.auto_assign_reviewer,
    is_manager_display_result: mgr.is_manager_display_result,
    is_display_threesixty: t360.is_display_threesixty,
    is_display_team_review: team.is_display_team,
    is_allow_reject_task: t360.is_allow_reject,
    enable_lock_review: enableLockReview.value,
    is_exclude_rating: isExcludeRating.value,
    is_sequence: self.is_display_self,
    is_no_need_self: self.is_display_self ? self.is_no_need_self === 'true' : false,
    is_prefill: mgr.is_prefill,
    prefill_source: mgr.is_prefill ? mgr.prefill_source : null,
    is_pick_coworker: t360.is_pick_coworker,
    start_date_pick_coworker: t360.is_pick_coworker ? fmt(t360.pick_coworker_period[0]) : null,
    end_date_pick_coworker: t360.is_pick_coworker ? fmt(t360.pick_coworker_period[1]) : null,
    start_date_manage_pick_coworker: (t360.is_pick_coworker && methods.manager_review.is_active) ? fmt(t360.manage_coworker_period[0]) : null,
    end_date_manage_pick_coworker: (t360.is_pick_coworker && methods.manager_review.is_active) ? fmt(t360.manage_coworker_period[1]) : null,
    is_pick_goals: mgr.is_pick_goals,
    start_date_employee_pick_goals: mgr.is_pick_goals ? fmt(mgr.pick_goals_period[0]) : null,
    end_date_employee_pick_goals: mgr.is_pick_goals ? fmt(mgr.pick_goals_period[1]) : null,
    start_date_superordinates_manage_goals: mgr.is_pick_goals ? fmt(mgr.manage_goals_period[0]) : null,
    end_date_superordinates_manage_goals: mgr.is_pick_goals ? fmt(mgr.manage_goals_period[1]) : null,
    publish_score_when: publishScoreWhen.value,
    deduction_score_system: { ...toRaw(deductionConfig), is_active: isDeduction.value },
  }

  addCycle(config)
  toast.notify({ id: 'review-cycle-created', position: 'top-center', variant: 'success', title: 'Review cycle created' })
  router.push('/reviews/review-cycles')
}
function onCancel() { router.push('/reviews/review-cycles') }

// ─── Styles (reuse Evaluation form conventions) ──────────────────────────────────
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({ gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' }, maxWidth: { lg: '656px' }, display: 'flex', flexDirection: 'column' })
const selectWidth = css({ width: { base: '100%', lg: '50%' } })
const errorText = css({ color: 'text.danger', fontSize: '12px', lineHeight: '16px' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '10', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
// Field-question label size (not a section header) — matches MpFormLabel.
const labelClass = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const toggleRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6', paddingTop: '2', paddingBottom: '4', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const toggleRowPlain = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6', paddingTop: '2', paddingBottom: '4' })
const weightRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBlock: '3', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2', paddingTop: '4' })
const memberRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', paddingBlock: '2', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const legendRow = css({ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '3', alignItems: 'center', paddingBlock: '2' })
</script>

<template>
  <div :class="gridArea">
    <div :class="formColumn">

      <!-- ── Cycle name & type ────────────────────────────────────────── -->
      <div :class="fields">
        <MpFlex direction="column" gap="0">
          <MpFlex align="center" gap="4">
            <template v-if="!isEditingName">
              <MpText :class="h2Class">{{ cycleName || 'Untitled cycle' }}</MpText>
              <MpTooltip label="Rename cycle" use-portal>
                <MpButton variant="ghost" left-icon="edit" @click="startEditName" />
              </MpTooltip>
            </template>
            <template v-else>
              <MpInput ref="nameInput" v-model="cycleName" :class="css({ width: '320px' })" @keydown.enter="isEditingName = false" />
              <MpButton variant="ghost" @click="isEditingName = false">Cancel</MpButton>
              <MpButton variant="primary" @click="isEditingName = false">Save changes</MpButton>
            </template>
          </MpFlex>
          <MpText v-if="nameInvalid" size="label" :class="css({ color: 'text.danger' })">You must fill in Cycle name</MpText>
          <MpText :class="h3Class">Cycle type: {{ cycleTypeLabel }}</MpText>
        </MpFlex>
      </div>

      <!-- ── [C] Assessment objective ─────────────────────────────────── -->
      <template v-if="isCompetency">
        <div :class="sectionHeader">
          <MpText :class="labelClass">Assessment objective</MpText>
          <MpText size="label" color="text.secondary">Choose what this competency cycle is for.</MpText>
        </div>
        <div :class="fields">
          <MpRadio
            v-for="opt in assessmentPurposeOptions"
            :key="opt.id"
            name="assessment-purpose"
            :value="String(opt.id)"
            :is-checked="Number(assessmentPurpose) === opt.id"
            @update:is-checked="assessmentPurpose = opt.id"
          >
            {{ opt.name }}
          </MpRadio>
        </div>

        <!-- Select key position — succession plan only -->
        <template v-if="isSuccessionPlan">
          <div :class="fields" :style="{ marginTop: '16px' }">
            <MpFormControl id="key-position" :is-invalid="keyPositionInvalid">
              <MpFormLabel>Key position</MpFormLabel>
              <PxSelectPopover
                v-model="keyPosition"
                :options="keyPositions.map(k => ({ value: k.id, label: k.job }))"
                placeholder="Select key position"
                :class="selectWidth"
              />
              <MpFormErrorMessage>You must select a key position</MpFormErrorMessage>
            </MpFormControl>
          </div>
        </template>
      </template>

      <!-- ── [P] Duplicate from an existing cycle ─────────────────────── -->
      <template v-if="!isCompetency">
        <div :class="sectionHeader">
          <MpText :class="labelClass">Duplicate from an existing cycle</MpText>
          <MpText size="label" color="text.secondary">Copy members, review methods, or reviewers from a past cycle.</MpText>
        </div>
        <div :class="fields">
          <MpRadio name="is-import" value="1" :is-checked="isImport === '1'" @update:is-checked="isImport = '1'">Yes</MpRadio>
          <MpRadio name="is-import" value="0" :is-checked="isImport === '0'" @update:is-checked="isImport = '0'">No</MpRadio>
          <template v-if="isImport === '1'">
            <div :class="css({ paddingLeft: '8', display: 'flex', flexDirection: 'column', gap: '3' })">
              <MpFormControl id="import-from">
                <MpFormLabel>Existing cycle</MpFormLabel>
                <PxSelectPopover
                  v-model="importFromId"
                  :options="importableOptions"
                  placeholder="Select a cycle"
                  :class="selectWidth"
                  searchable
                />
              </MpFormControl>
              <div>
                <MpButton variant="secondary" @click="dupModalOpen = true">Select component</MpButton>
                <MpText v-if="dupComponents.member || dupComponents.reviewMethod" size="label" :class="css({ color: 'text.secondary', marginTop: '2' })">
                  Duplicating:
                  {{ [dupComponents.member && 'Members', dupComponents.reviewMethod && 'Review method', dupComponents.reviewer && 'Reviewers'].filter(Boolean).join(', ') }}
                </MpText>
              </div>
            </div>
          </template>
        </div>
      </template>

      <!-- ── [S] Who will be reviewed ─────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpFlex align="center" gap="1">
          <MpText :class="labelClass">Who will be reviewed in this cycle?</MpText>
          <MpTooltip v-if="isCompetency" label="Only employees with competency assignment are available to be selected." use-portal>
            <MpIcon name="info" :class="css({ color: 'icon.secondary', width: '16px', height: '16px' })" />
          </MpTooltip>
        </MpFlex>
      </div>
      <div v-show="!dupComponents.member" :class="fields">
        <div>
          <MpButton variant="secondary" left-icon="add" @click="memberDrawerOpen = true">Select employees</MpButton>
        </div>
        <MpText v-if="memberInvalid" :class="errorText">You must select at least one employee</MpText>
        <MpCheckbox :is-checked="isAllMembers" @update:is-checked="(v) => (isAllMembers = v)">
          Select all employees ({{ totalMember }})
        </MpCheckbox>
        <div v-if="selectedMembers.length" :class="css({ marginTop: '2' })">
          <div v-for="m in selectedMembers" :key="m.id" :class="memberRow">
            <MpFlex align="center" gap="3">
              <PxAvatar :name="m.name" :src="m.photo" size="lg" />
              <MpFlex direction="column" gap="0">
                <MpText size="label" color="text.default">{{ m.name }}</MpText>
                <MpText size="label-small" color="text.secondary">{{ employeeMeta(m) }}</MpText>
              </MpFlex>
            </MpFlex>
            <MpButton variant="ghost" left-icon="close" @click="removeMember(m.id)" />
          </div>
        </div>
      </div>

      <!-- ── [S] Time frame + review period ───────────────────────────── -->
      <div :class="sectionHeader">
        <MpText :class="labelClass">Time frame</MpText>
        <MpText size="label" color="text.secondary">Set the cycle period and the review window for reviewers.</MpText>
      </div>
      <div :class="fields">
        <MpFormControl id="timeframe" :is-invalid="timeframeInvalid">
          <MpFormLabel>Time frame for this cycle</MpFormLabel>
          <PxSelectPopover
            v-model="timeframe"
            :options="timeframeOptions.map(t => ({ value: t.value, label: t.label }))"
            placeholder="Select time frame"
            :class="selectWidth"
          />
          <MpFormErrorMessage>You must select a time frame</MpFormErrorMessage>
        </MpFormControl>
        <MpFormControl id="cycle-period" :is-invalid="cyclePeriodInvalid">
          <MpFormLabel>Start cycle on</MpFormLabel>
          <MpDatePicker
            v-model="cyclePeriod"
            value-type="date"
            format="D MMM YYYY"
            placeholder="Start date - end date"
            is-range
            use-portal
            :is-show-shortcut="false"
            :class="selectWidth"
          />
          <MpFormErrorMessage>You must set the cycle period</MpFormErrorMessage>
        </MpFormControl>
        <MpFormControl id="review-period" :is-invalid="reviewPeriodInvalid">
          <MpFormLabel>Review period</MpFormLabel>
          <MpDatePicker
            v-model="reviewPeriod"
            value-type="date"
            format="D MMM YYYY"
            placeholder="Start date - end date"
            is-range
            use-portal
            :is-show-shortcut="false"
            :class="selectWidth"
          />
          <MpFormErrorMessage>You must set the review period</MpFormErrorMessage>
        </MpFormControl>
      </div>

      <!-- ── [S] Repeat cycle ─────────────────────────────────────────── -->
      <div :class="fields" :style="{ marginTop: '16px' }">
        <MpCheckbox :is-checked="isRecursive" @update:is-checked="(v) => (isRecursive = v)">
          Repeat cycle automatically after the cycle ends
        </MpCheckbox>
      </div>

      <!-- ── [S] Review methods ───────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Review methods</MpText>
        <MpText size="label" color="text.secondary">Select the review method that you want to provide to your employees.</MpText>
      </div>

      <!-- Enable lock edit for review -->
      <div :class="fields">
        <MpCheckbox :is-checked="enableLockReview" @update:is-checked="(v) => (enableLockReview = v)">
          Enable lock edit for review
          <template #description>You will not be able to edit or to reset the review result unless it is requested.</template>
        </MpCheckbox>
        <MpText size="label" color="text.secondary">
          Manage who can request an edit in
          <MpTextlink as="a" href="#" @click.prevent>approval setting</MpTextlink>.
        </MpText>
      </div>

      <!-- Method toggles -->
      <div :class="css({ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '4' })">
        <div v-for="m in methodList" :key="m.key">
          <div :class="toggleRow">
            <MpToggle :is-checked="m.is_active" @update:is-checked="(v) => onMethodToggle(m.key, v)">{{ m.title }}</MpToggle>
            <MpButton variant="secondary" :is-disabled="!m.is_active" @click="openMethodDrawer(m.key)">Manage</MpButton>
          </div>
          <MpText v-if="submitted && m.is_active && !m.configured" :class="[errorText, css({ paddingTop: '1', paddingBottom: '2' })]">
            You must fill the data
          </MpText>
        </div>
      </div>
      <MpText v-if="noMethodSelected" :class="[errorText, css({ paddingTop: '2' })]">Should choose at least one method</MpText>

      <!-- Use weight -->
      <template v-if="validWeightedFlag">
        <div :class="fields" :style="{ marginTop: '16px' }">
          <MpCheckbox :is-checked="isShowMethodWeight" @update:is-checked="(v) => (isShowMethodWeight = v)">
            Use weight
            <template #description>The score of your review will be calculated by the weight you set up.</template>
          </MpCheckbox>
          <div v-if="isShowMethodWeight" :class="css({ marginLeft: '8' })">
            <div v-for="m in weightableMethods" :key="m.key" :class="weightRow">
              <MpText size="label" color="text.default">{{ m.title }}</MpText>
              <MpInputGroup :class="css({ width: '104px' })">
                <MpInput v-model="m.weight" type="number" />
                <MpInputRightAddon>%</MpInputRightAddon>
              </MpInputGroup>
            </div>
            <MpFlex justify="flex-end" :class="css({ paddingTop: '2' })">
              <MpText size="label" :class="weightTotalInvalid ? errorText : css({ color: 'text.secondary' })">{{ totalMethodWeight }}% of 100%</MpText>
            </MpFlex>
            <MpText v-if="weightTotalInvalid" :class="errorText">Total weight must be 100%</MpText>
          </div>
        </div>
      </template>

      <!-- [C] 9-box convert score -->
      <template v-if="isCompetency">
        <div :class="fields" :style="{ marginTop: '16px' }">
          <MpCheckbox :is-checked="is9BoxConvertScore" @update:is-checked="(v) => (is9BoxConvertScore = v)">
            9 box convert score
            <template #description>You can set the legend for the final review score to convert it into the 9-box.</template>
          </MpCheckbox>
          <div v-if="is9BoxConvertScore">
            <div :class="legendRow">
              <MpText size="label-small" color="text.secondary">Score from</MpText>
              <MpText size="label-small" color="text.secondary">Score to</MpText>
              <MpText size="label-small" color="text.secondary">9-box legend</MpText>
              <span />
            </div>
            <div v-for="(l, i) in nineBoxLegend" :key="i" :class="legendRow">
              <MpInput v-model="l.from" type="number" placeholder="0" />
              <MpInput v-model="l.to" type="number" placeholder="100" />
              <MpInput v-model="l.description" placeholder="e.g. High performer" />
              <MpButton variant="ghost" left-icon="minus-circular" :is-disabled="nineBoxLegend.length === 1" @click="removeLegend(i)" />
            </div>
            <MpButton variant="ghost" left-icon="add-circular" @click="addLegend">Add legend</MpButton>
            <MpText v-if="nineBoxInvalid" :class="errorText">Complete every legend row (score range + label)</MpText>
          </div>
        </div>
      </template>

      <!-- ── [P] Advanced scoring / Deduction ─────────────────────────── -->
      <template v-if="!isCompetency">
        <div :class="sectionHeader">
          <MpFlex align="center" gap="2">
            <MpText as="h2" :class="h2Class">Advanced scoring</MpText>
            <MpBadge type="critical" size="sm">New</MpBadge>
          </MpFlex>
          <MpText size="label" color="text.secondary">
            The final score of the employee will be deducted based on the attendance data and their reprimand status, if any. If you use more than one
            review method, make sure to allow weight calculation to be able to use this scoring. You also need to use a rating or percentage template.
          </MpText>
        </div>
        <div :class="fields">
          <MpBanner v-if="isDisabledDeduction" variant="info" is-inline>
            <MpBannerIcon />
            <MpBannerDescription>Enable Use weight (with more than one review method) and a scoring template to use deduction scoring.</MpBannerDescription>
          </MpBanner>
          <div :class="toggleRowPlain">
            <MpToggle :is-checked="isDeduction" :is-disabled="isDisabledDeduction" @update:is-checked="onDeductionToggle">
              Deduction score system
              <template #description>The data used is data with a maximum cycle period of one year.</template>
            </MpToggle>
            <MpButton variant="secondary" :is-disabled="!isDeduction" @click="openDeductionManage">Manage</MpButton>
          </div>
        </div>
      </template>

      <!-- ── [S] Publish score after ──────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText :class="labelClass">Publish score after</MpText>
        <MpText size="label" color="text.secondary">Choose when the final review score becomes visible.</MpText>
      </div>
      <div :class="fields">
        <MpRadio
          v-for="opt in publishOptions"
          :key="opt.value"
          name="publish-score-when"
          :value="opt.value"
          :is-checked="publishScoreWhen === opt.value"
          @update:is-checked="publishScoreWhen = opt.value"
        >
          {{ opt.name }}
        </MpRadio>
      </div>

      <!-- ── Footer ───────────────────────────────────────────────────── -->
      <div :class="footerBar">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="primary" @click="onSave">Save</MpButton>
      </div>
    </div>

    <!-- ── Drawers & modals ───────────────────────────────────────────── -->
    <CycleMethodDrawer
      v-model:is-open="methodDrawerOpen"
      :method-key="activeMethodKey"
      :title="activeMethod.title"
      :is-competency="isCompetency"
      :manager-active="methods.manager_review.is_active"
      :config="activeMethod.form"
      :members="selectedMembers"
      @saved="onMethodSaved"
    />

    <SelectEmployeesDrawer
      v-model:is-open="memberDrawerOpen"
      drawer-id="drawer-cycle-members"
      title="Select employees"
      description="Select the employees to be reviewed in this cycle."
      :initial-selected="memberIds"
      @continue="onMembersContinue"
    />

    <CycleDuplicateComponentsModal
      v-model:is-open="dupModalOpen"
      :model-value="dupComponents"
      @update:model-value="(v) => Object.assign(dupComponents, v)"
    />

    <CycleDeductionDrawer
      v-model:is-open="deductionDrawerOpen"
      :config="deductionConfig"
      @saved="onDeductionSaved"
    />
  </div>
</template>
