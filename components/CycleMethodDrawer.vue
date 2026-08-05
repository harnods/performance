<script setup lang="ts">
// ─────────────────────────────────────────────────────────────────────────────
// Review-method configuration drawer for Performance / Competency cycles
// (production parity: GeneralForm's drawer-review-method slots). Dedicated to the
// General form so the Evaluation form's ReviewMethodDrawer stays untouched.
//
// Tabs: General / Goals / Attendance / Reprimand / Weight.
//  · Competency → only General (goals/attendance/reprimand/weight hidden).
//  · Attendance & Reprimand → Manager review only.
//  · Weight → appears once a scoring aspect (goals/attendance/reprimand) is on.
// ─────────────────────────────────────────────────────────────────────────────
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpText, MpButton, MpCheckbox, MpRadio, MpFormControl, MpFormLabel, MpFormErrorMessage,
  MpBanner, MpBannerIcon, MpBannerDescription, MpFlex, MpInputGroup, MpInput, MpInputRightAddon,
  MpDatePicker, MpBadge, MpIcon, MpTooltip, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  toast, css,
} from '@mekari/pixel3'
import type { Employee } from '~/utils/employees'
import {
  TEMPLATE_OPTIONS, SCORING_TEMPLATE_TYPES, templateType, GOAL_TYPE_OPTIONS, REPRIMAND_TYPES,
  LAYER_REVIEW_ORDER_OPTIONS, PREFILL_SOURCE_OPTIONS,
} from '~/utils/reviewMethod'
import type { MethodForm, MethodKey } from '~/utils/reviewMethod'

const props = defineProps<{
  isOpen: boolean
  methodKey: MethodKey
  title: string
  isCompetency?: boolean
  managerActive?: boolean
  config: MethodForm
  members?: Employee[]
}>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'saved': [MethodForm] }>()

const isManager = computed(() => props.methodKey === 'manager_review')
const isSelf = computed(() => props.methodKey === 'self_review')
const isTeam = computed(() => props.methodKey === 'peer_to_peer')
const is360 = computed(() => props.methodKey === 'threesixty_review')
const drawerTitle = computed(() => `${props.title} method`)

// Deep clone the incoming config so Cancel discards edits. Manual clone (not
// structuredClone) — avoids choking on Vue reactive proxies and preserves the
// Date objects the range pickers need.
function clone(c: MethodForm): MethodForm {
  const raw = toRaw(c)
  return {
    ...raw,
    goal_types: [...raw.goal_types],
    goal_achievement_ratings: raw.goal_achievement_ratings.map(x => ({ ...x })),
    attendance_advance_scoring: raw.attendance_advance_scoring.map(x => ({ ...x })),
    reprimand_advance_scoring: raw.reprimand_advance_scoring.map(x => ({ ...x, type_id: [...x.type_id] })),
    custom_weight_implementation: raw.custom_weight_implementation.map(x => ({ ...x })),
    pick_goals_period: [...raw.pick_goals_period],
    manage_goals_period: [...raw.manage_goals_period],
    pick_coworker_period: [...raw.pick_coworker_period],
    manage_coworker_period: [...raw.manage_coworker_period],
  }
}
const form = reactive<MethodForm>(clone(props.config))

const tpl = computed(() => templateType(form.template_uuid))
const isTemplateScoring = computed(() => SCORING_TEMPLATE_TYPES.includes(tpl.value))
const isTemplateRating = computed(() => tpl.value === 'rating')
const isTemplatePercentOrPoint = computed(() => tpl.value === 'percentage' || tpl.value === 'point')

const generalDescription = computed(() => {
  if (isManager.value) return 'Please define indicators and other configurations to design the manager review method.'
  if (is360.value) return "Review from an employee's subordinates, colleagues, and managers."
  if (isTeam.value) return 'Employees review people in their team.'
  return 'Employees review themselves.'
})

// ─── Tabs ────────────────────────────────────────────────────────────────────────
type TabKey = 'general' | 'goals' | 'attendance' | 'reprimand' | 'weight'
const allTabs: { key: TabKey, label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'goals', label: 'Goals' },
  { key: 'attendance', label: 'Attendance performance' },
  { key: 'reprimand', label: 'Reprimand' },
  { key: 'weight', label: 'Weight' },
]
const hasInputWeight = computed(() =>
  form.include_goals || (isManager.value && (form.is_attendance_advance_scoring || form.is_reprimand_use_score)))
const tabKeys = computed<TabKey[]>(() => {
  if (props.isCompetency) return ['general']
  const base: TabKey[] = isManager.value ? ['general', 'goals', 'attendance', 'reprimand'] : ['general', 'goals']
  return hasInputWeight.value ? [...base, 'weight'] : base
})
const tabs = computed(() => allTabs.filter(t => tabKeys.value.includes(t.key)))
const activeTab = ref<TabKey>('general')

// ─── Layering / prefill guard (disable-prefill confirm) ──────────────────────────
const disablePrefillOpen = ref(false)
let pendingIncludeGoals = false
function onToggleIncludeGoals(v: boolean) {
  // Turning include-goals ON while prefill is active forces prefill off — confirm first.
  if (v && form.is_prefill) { pendingIncludeGoals = true; disablePrefillOpen.value = true; return }
  form.include_goals = v
  if (!v) { form.goal_auto_score_enabled = false; form.can_reviewer_edit_goal_auto_score = false; form.use_9box_auto_generate = false }
}
function confirmDisablePrefill() {
  form.is_prefill = false; form.prefill_source = null
  if (pendingIncludeGoals) { form.include_goals = true; pendingIncludeGoals = false }
}
function cancelDisablePrefill() { pendingIncludeGoals = false }

watch(() => form.is_layering_review, (v) => { if (!v) { form.is_prefill = false; form.prefill_source = null } })
watch(() => form.is_prefill, (v) => { if (!v) form.prefill_source = null })
watch(() => form.is_pick_coworker, (v) => { if (!v) { form.pick_coworker_period = []; form.manage_coworker_period = [] } })
watch(() => form.is_pick_goals, (v) => { if (!v) { form.pick_goals_period = []; form.manage_goals_period = [] } })

// ─── Reprimand table ─────────────────────────────────────────────────────────────
function onToggleReprimandUseScore(v: boolean) {
  form.is_reprimand_use_score = v
  if (v && form.reprimand_advance_scoring.length === 0)
    form.reprimand_advance_scoring = seedReprimandRows()
}
function seedReprimandRows() {
  return isTemplateRating.value
    ? RATING_SCALE_LOCAL.map((r, i) => ({ name: r.name, score: 0, type_id: [] as number[], rating_id: `${r.value}-${i}` }))
    : [{ name: '', score: 0, type_id: [] as number[], rating_id: 'r0' }]
}
const RATING_SCALE_LOCAL = [
  { value: 'A', name: 'Exceeds expectation' },
  { value: 'B', name: 'Meets expectation' },
  { value: 'C', name: 'Below expectation' },
]
function reprimandTypesFor(idx: number) {
  const usedElsewhere = new Set(form.reprimand_advance_scoring.flatMap((r, i) => (i === idx ? [] : r.type_id)))
  return REPRIMAND_TYPES.filter(t => !usedElsewhere.has(t.id))
}
function toggleReprimandType(row: { type_id: number[] }, id: number) {
  row.type_id = row.type_id.includes(id) ? row.type_id.filter(x => x !== id) : [...row.type_id, id]
}
function addReprimandRow() {
  form.reprimand_advance_scoring.push({ name: '', score: 0, type_id: [], rating_id: `r${form.reprimand_advance_scoring.length}` })
}
function removeReprimandRow(i: number) { form.reprimand_advance_scoring.splice(i, 1) }

// ─── Attendance / goal-achievement rating tables (monotonic percentage) ──────────
function onAttendanceEdit(idx: number) {
  const rows = form.attendance_advance_scoring
  if (idx < rows.length - 1) rows[idx + 1].percentage_range_from = Number(rows[idx].percentage_range_to) + 0.01
}
function onGoalAchievementEdit(idx: number) {
  const rows = form.goal_achievement_ratings
  if (idx < rows.length - 1) rows[idx + 1].percentage_from = Number(rows[idx].percentage_to) + 0.01
}

// ─── Weight ──────────────────────────────────────────────────────────────────────
const weightAspects = computed(() => {
  const list: { key: string, label: string, field: keyof MethodForm }[] = [{ key: 'review', label: 'Review', field: 'review_weight' }]
  if (form.include_goals) list.push({ key: 'goal', label: 'Goal', field: 'goal_weight' })
  if (isManager.value && form.is_attendance_advance_scoring) list.push({ key: 'attendance', label: 'Attendance', field: 'advance_score_weight' })
  if (isManager.value && form.is_reprimand_use_score) list.push({ key: 'reprimand', label: 'Reprimand', field: 'reprimand_data_weight' })
  return list
})
const totalAllEmployeesWeight = computed(() =>
  weightAspects.value.reduce((s, a) => s + (form[a.field] === '' ? 0 : Number(form[a.field])), 0))

function seedCustomRows() {
  form.custom_weight_implementation = (props.members ?? []).map(m => ({ id: m.id, name: m.name, review: '', goal: '', attendance: '', reprimand: '' }))
}
watch(() => form.weight_implementation, (v) => {
  if (v === 'custom' && form.custom_weight_implementation.length === 0) seedCustomRows()
})
function rowTotal(row: { [k: string]: number | '' | string }) {
  return weightAspects.value.reduce((s, a) => s + (row[a.key] === '' ? 0 : Number(row[a.key])), 0)
}
const bulk = reactive<Record<string, number | ''>>({ review: '', goal: '', attendance: '', reprimand: '' })
function applyBulk() {
  form.custom_weight_implementation.forEach((row) => {
    weightAspects.value.forEach((a) => { (row as Record<string, number | ''>)[a.key] = bulk[a.key] })
  })
}

// ─── Validation ──────────────────────────────────────────────────────────────────
const submitted = ref(false)
const templateInvalid = computed(() => submitted.value && !props.isCompetency && !form.template_uuid)
const reviewOrderInvalid = computed(() => submitted.value && form.is_layering_review && !form.review_order)
const prefillSourceInvalid = computed(() => submitted.value && form.is_prefill && !form.prefill_source)
const allEmpWeightInvalid = computed(() =>
  submitted.value && hasInputWeight.value && form.is_simple_sum === 'false' && form.weight_implementation === 'all-employees'
  && totalAllEmployeesWeight.value !== 100)
const customWeightInvalid = computed(() =>
  submitted.value && hasInputWeight.value && form.is_simple_sum === 'false' && form.weight_implementation === 'custom'
  && form.custom_weight_implementation.some(r => rowTotal(r as Record<string, number | ''>) !== 100))

watch(() => props.isOpen, (open) => {
  if (open) { Object.assign(form, clone(props.config)); activeTab.value = 'general'; submitted.value = false }
})
watch(tabs, (list) => { if (!list.some(t => t.key === activeTab.value)) activeTab.value = 'general' })

function close() { emit('update:isOpen', false) }
function onSave() {
  submitted.value = true
  if (templateInvalid.value) { activeTab.value = 'general'; return }
  if (reviewOrderInvalid.value || prefillSourceInvalid.value) { activeTab.value = 'general'; return }
  if (allEmpWeightInvalid.value || customWeightInvalid.value) { activeTab.value = 'weight'; return }
  emit('saved', clone(form))
  toast.notify({ id: 'review-method-saved', position: 'top-center', variant: 'success', title: 'Review method saved' })
  close()
}

// ─── Styles (match ReviewMethodDrawer) ───────────────────────────────────────────
const tabBarWrap = css({ display: 'flex', gap: '5', borderBottom: '1px solid', borderBottomColor: 'border.default', marginBottom: '6', overflowX: 'auto' })
const tabItemBase = { display: 'inline-flex', alignItems: 'center', gap: '2', paddingBlock: '3', paddingInline: '1', whiteSpace: 'nowrap', fontSize: '14px', lineHeight: '20px', fontWeight: '400', color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent', marginBottom: '-1px' } as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionHead = css({ display: 'flex', flexDirection: 'column', gap: '1', marginBottom: '4' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const subLabel = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', marginTop: '5', marginBottom: '2' })
const selectWidth = css({ width: { base: '100%', lg: '60%' } })
const indent = css({ marginLeft: '8', display: 'flex', flexDirection: 'column', gap: '4' })
const weightRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBlock: '3', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const errorText = css({ color: 'text.danger', fontSize: '12px', lineHeight: '16px' })
const tableWrap = css({ border: '1px solid', borderColor: 'border.default', borderRadius: 'md', overflow: 'hidden' })
const trow = css({ display: 'grid', alignItems: 'center', gap: '3', paddingInline: '3', paddingBlock: '2', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const cellInput = css({ width: '96px' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-cycle-method" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ drawerTitle }}
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>

        <MpDrawerBody :class="css({ display: 'flex', flexDirection: 'column', minHeight: '0' })">
          <div :class="tabBarWrap">
            <button v-for="t in tabs" :key="t.key" type="button" :class="activeTab === t.key ? tabItemActive : tabItem" @click="activeTab = t.key">{{ t.label }}</button>
          </div>

          <!-- ══ General ══ -->
          <template v-if="activeTab === 'general'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">{{ title }}</MpText>
              <MpText size="label" color="text.secondary">{{ generalDescription }}</MpText>
            </div>
            <div :class="fields">
              <MpFormControl id="method-template" :is-invalid="templateInvalid">
                <MpFormLabel>Template</MpFormLabel>
                <PxSelectPopover
                  v-model="form.template_uuid"
                  :options="TEMPLATE_OPTIONS.map(t => ({ value: t.value, label: t.label, description: t.description }))"
                  :placeholder="isCompetency ? 'Optional' : 'Select template'"
                  :class="selectWidth"
                  searchable
                  :is-clearable="isCompetency"
                />
                <MpFormErrorMessage>You must select a template</MpFormErrorMessage>
              </MpFormControl>

              <!-- Manager review -->
              <template v-if="isManager">
                <MpCheckbox :is-checked="form.auto_assign_reviewer" @update:is-checked="(v) => (form.auto_assign_reviewer = v)">
                  Automatically assign the employee manager to each selected member
                </MpCheckbox>
                <MpCheckbox :is-checked="form.is_manager_display_result" @update:is-checked="(v) => (form.is_manager_display_result = v)">
                  Display review result in details
                </MpCheckbox>

                <!-- Layering review process (performance only, hidden for competency) -->
                <template v-if="!isCompetency">
                  <MpCheckbox :is-checked="form.is_layering_review" @update:is-checked="(v) => (form.is_layering_review = v)">
                    Layering review process
                    <template #description>Reviewers complete the review in a defined order.</template>
                  </MpCheckbox>
                  <div v-if="form.is_layering_review" :class="indent">
                    <MpFormControl id="review-order" :is-invalid="reviewOrderInvalid">
                      <MpFormLabel>Layered review order</MpFormLabel>
                      <PxSelectPopover v-model="form.review_order" :options="LAYER_REVIEW_ORDER_OPTIONS" placeholder="Select order" :class="selectWidth" />
                      <MpFormErrorMessage>You must select the review order</MpFormErrorMessage>
                    </MpFormControl>

                    <MpCheckbox :is-checked="form.is_prefill" @update:is-checked="(v) => (form.is_prefill = v)">
                      Prefill review answers
                      <template #description>The next reviewer's form is prefilled with the previous reviewer's answers.</template>
                    </MpCheckbox>
                    <div v-if="form.is_prefill" :class="indent">
                      <MpFormControl id="prefill-source" :is-invalid="prefillSourceInvalid">
                        <MpFormLabel>Prefill source</MpFormLabel>
                        <PxSelectPopover v-model="form.prefill_source" :options="PREFILL_SOURCE_OPTIONS" placeholder="Select source" :class="selectWidth" />
                        <MpFormErrorMessage>You must select the prefill source</MpFormErrorMessage>
                      </MpFormControl>
                    </div>
                  </div>
                </template>
              </template>

              <!-- Self review -->
              <template v-else-if="isSelf">
                <MpCheckbox v-if="!isCompetency" :is-checked="form.is_exclude_rating" @update:is-checked="(v) => (form.is_exclude_rating = v)">
                  Review using comment only
                  <template #description>Employees do not input scores; the review form is filled with comments only.</template>
                </MpCheckbox>
                <template v-if="managerActive">
                  <MpCheckbox :is-checked="form.is_display_self" @update:is-checked="(v) => (form.is_display_self = v)">
                    Show self review result on manager review form
                  </MpCheckbox>
                  <div v-if="form.is_display_self" :class="indent">
                    <MpRadio name="no-need-self" value="false" :is-checked="form.is_no_need_self === 'false'" @update:is-checked="form.is_no_need_self = 'false'">
                      Must submit the self review before the manager can continue
                    </MpRadio>
                    <MpRadio name="no-need-self" value="true" :is-checked="form.is_no_need_self === 'true'" @update:is-checked="form.is_no_need_self = 'true'">
                      No need to submit the self review to continue
                    </MpRadio>
                  </div>
                </template>
              </template>

              <!-- Team review -->
              <template v-else-if="isTeam">
                <MpCheckbox v-if="managerActive" :is-checked="form.is_display_team" @update:is-checked="(v) => (form.is_display_team = v)">
                  Display team review result for manager
                  <template #description>Managers can see the Team review result of their subordinate on the review form or pending action page.</template>
                </MpCheckbox>
              </template>

              <!-- 360-degree review -->
              <template v-else>
                <MpCheckbox v-if="managerActive" :is-checked="form.is_display_threesixty" @update:is-checked="(v) => (form.is_display_threesixty = v)">
                  Display 360-degree result for manager
                  <template #description>Managers can see the 360-degree result of their subordinate on the review form or pending action page.</template>
                </MpCheckbox>
                <MpCheckbox :is-checked="form.is_pick_coworker" @update:is-checked="(v) => (form.is_pick_coworker = v)">
                  Let members pick their own co-workers
                </MpCheckbox>
                <div v-if="form.is_pick_coworker" :class="indent">
                  <MpFormControl id="pick-coworker-period">
                    <MpFormLabel>Period of employee to pick co-worker</MpFormLabel>
                    <MpDatePicker v-model="form.pick_coworker_period" value-type="date" format="D MMM YYYY" placeholder="Start date - end date" is-range use-portal :is-show-shortcut="false" :class="selectWidth" />
                  </MpFormControl>
                  <MpFormControl v-if="managerActive" id="manage-coworker-period">
                    <MpFormLabel>Period of manager to manage co-worker</MpFormLabel>
                    <MpDatePicker v-model="form.manage_coworker_period" value-type="date" format="D MMM YYYY" placeholder="Start date - end date" is-range use-portal :is-show-shortcut="false" :class="selectWidth" />
                  </MpFormControl>
                </div>
                <MpCheckbox :is-checked="form.is_allow_reject" @update:is-checked="(v) => (form.is_allow_reject = v)">
                  Allow reviewers to reject review tasks
                  <template #description>Reviewers can reject during the review period.</template>
                </MpCheckbox>
              </template>
            </div>
          </template>

          <!-- ══ Goals ══ -->
          <template v-else-if="activeTab === 'goals'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">Goals</MpText>
              <MpText size="label" color="text.secondary">You can include the goals of each employee as a review indicator.</MpText>
            </div>
            <div :class="fields">
              <MpCheckbox :is-checked="form.include_goals" @update:is-checked="onToggleIncludeGoals">
                Include goals
                <template #description>Include the goals of each employee as a review indicator.</template>
              </MpCheckbox>

              <template v-if="form.include_goals">
                <!-- Goal types -->
                <MpFormControl id="goal-types">
                  <MpFormLabel>Goal to be included</MpFormLabel>
                  <MpPopover use-portal placement="bottom-start">
                    <MpPopoverTrigger>
                      <MpButton variant="secondary" right-icon="caret-down" :class="selectWidth">
                        {{ form.goal_types.map(t => GOAL_TYPE_OPTIONS.find(o => o.type === t)?.name).filter(Boolean).join(', ') || 'Select goals' }}
                      </MpButton>
                    </MpPopoverTrigger>
                    <MpPopoverContent>
                      <MpPopoverList>
                        <MpPopoverListItem v-for="g in GOAL_TYPE_OPTIONS" :key="g.type">
                          <MpCheckbox
                            :is-checked="form.goal_types.includes(g.type)"
                            :is-disabled="g.type === 1"
                            @update:is-checked="(v) => (v ? form.goal_types.push(g.type) : (form.goal_types = form.goal_types.filter(t => t !== g.type)))"
                          >
                            {{ g.name }} goal
                          </MpCheckbox>
                        </MpPopoverListItem>
                      </MpPopoverList>
                    </MpPopoverContent>
                  </MpPopover>
                </MpFormControl>

                <MpBanner v-if="!isTemplateScoring" variant="warning" is-inline>
                  <MpBannerIcon />
                  <MpBannerDescription>This option can be used if the template question type is rating, percentage, or point.</MpBannerDescription>
                </MpBanner>

                <!-- Employee pick goals (manager only) -->
                <template v-if="isManager">
                  <MpCheckbox :is-checked="form.is_pick_goals" @update:is-checked="(v) => (form.is_pick_goals = v)">
                    Let employees pick the goals to be reviewed
                  </MpCheckbox>
                  <div v-if="form.is_pick_goals" :class="indent">
                    <MpFormControl id="pick-goals-period">
                      <MpFormLabel>Period of employees to pick goals</MpFormLabel>
                      <MpDatePicker v-model="form.pick_goals_period" value-type="date" format="D MMM YYYY" placeholder="Start date - end date" is-range use-portal :is-show-shortcut="false" :class="selectWidth" />
                    </MpFormControl>
                    <MpFormControl id="manage-goals-period">
                      <MpFormLabel>Period of superior to manage goals</MpFormLabel>
                      <MpDatePicker v-model="form.manage_goals_period" value-type="date" format="D MMM YYYY" placeholder="Start date - end date" is-range use-portal :is-show-shortcut="false" :class="selectWidth" />
                    </MpFormControl>
                  </div>
                </template>

                <!-- Auto-score for goal -->
                <MpCheckbox :is-checked="form.goal_auto_score_enabled" @update:is-checked="(v) => (form.goal_auto_score_enabled = v)">
                  <MpFlex align="center" gap="2">Auto-score for goal on review form <MpBadge type="critical" size="sm">New</MpBadge></MpFlex>
                  <template #description>Goal score is automatically calculated by the system based on goal achievement.</template>
                </MpCheckbox>
                <div v-if="form.goal_auto_score_enabled" :class="indent">
                  <MpCheckbox :is-checked="form.can_reviewer_edit_goal_auto_score" @update:is-checked="(v) => (form.can_reviewer_edit_goal_auto_score = v)">
                    Allow reviewer to edit the auto-score from the system
                  </MpCheckbox>
                  <template v-if="isTemplateRating">
                    <MpText :class="subLabel">Define rating from achievement percentage</MpText>
                    <div :class="tableWrap">
                      <div :class="[trow, css({ gridTemplateColumns: '1fr 2fr', background: 'background.neutral.subtle' })]">
                        <MpText size="label-small" color="text.secondary">Rating name</MpText>
                        <MpText size="label-small" color="text.secondary">Percentage of goal achievement</MpText>
                      </div>
                      <div v-for="(g, i) in form.goal_achievement_ratings" :key="g.rating" :class="[trow, css({ gridTemplateColumns: '1fr 2fr' })]">
                        <MpFlex align="center" gap="2"><MpBadge size="sm">{{ g.rating }}</MpBadge><MpText size="label">{{ g.name }}</MpText></MpFlex>
                        <MpFlex align="center" gap="2">
                          <template v-if="i < form.goal_achievement_ratings.length - 1">
                            <MpInputGroup :class="cellInput"><MpInput :model-value="g.percentage_from" type="number" is-disabled /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                            <MpText size="label">–</MpText>
                            <MpInputGroup :class="cellInput"><MpInput v-model="g.percentage_to" type="number" @update:model-value="onGoalAchievementEdit(i)" /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                          </template>
                          <template v-else>
                            <MpText size="label">&gt; {{ form.goal_achievement_ratings[i - 1]?.percentage_to }}%</MpText>
                          </template>
                        </MpFlex>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- 9-box auto-generate (manager only) -->
                <MpCheckbox v-if="isManager" :is-checked="form.use_9box_auto_generate" @update:is-checked="(v) => (form.use_9box_auto_generate = v)">
                  <MpFlex align="center" gap="2">Use 9-box auto-generate <MpBadge type="critical" size="sm">New</MpBadge></MpFlex>
                  <template #description>Automatically place employees on the 9-box grid using this cycle's result.</template>
                </MpCheckbox>
              </template>
            </div>
          </template>

          <!-- ══ Attendance performance ══ -->
          <template v-else-if="activeTab === 'attendance'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">Attendance performance</MpText>
              <MpText size="label" color="text.secondary">Automatically calculate an employee's attendance score from their attendance data during this review period.</MpText>
            </div>
            <div :class="fields">
              <MpCheckbox :is-checked="form.is_attendance_advance_scoring" :is-disabled="!isTemplateScoring" @update:is-checked="(v) => (form.is_attendance_advance_scoring = v)">
                Include attendance data
                <template #description>Use attendance records to calculate this score automatically.</template>
              </MpCheckbox>
              <MpBanner v-if="form.is_attendance_advance_scoring" variant="info" is-inline>
                <MpBannerIcon />
                <MpBannerDescription>Attendance data is calculated based on the employee's active period during this cycle.</MpBannerDescription>
              </MpBanner>
              <template v-if="form.is_attendance_advance_scoring && isTemplateRating">
                <MpText :class="subLabel">Define rating from attendance percentage</MpText>
                <div :class="tableWrap">
                  <div :class="[trow, css({ gridTemplateColumns: '1fr 2fr', background: 'background.neutral.subtle' })]">
                    <MpText size="label-small" color="text.secondary">Rating name</MpText>
                    <MpText size="label-small" color="text.secondary">Percentage range</MpText>
                  </div>
                  <div v-for="(a, i) in form.attendance_advance_scoring" :key="a.value" :class="[trow, css({ gridTemplateColumns: '1fr 2fr' })]">
                    <MpFlex align="center" gap="2"><MpBadge size="sm">{{ a.value }}</MpBadge><MpText size="label">{{ a.name }}</MpText></MpFlex>
                    <MpFlex align="center" gap="2">
                      <template v-if="i < form.attendance_advance_scoring.length - 1">
                        <MpInputGroup :class="cellInput"><MpInput :model-value="a.percentage_range_from" type="number" is-disabled /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                        <MpText size="label">–</MpText>
                        <MpInputGroup :class="cellInput"><MpInput v-model="a.percentage_range_to" type="number" @update:model-value="onAttendanceEdit(i)" /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                      </template>
                      <template v-else>
                        <MpText size="label">&gt; {{ form.attendance_advance_scoring[i - 1]?.percentage_range_to }}%</MpText>
                      </template>
                    </MpFlex>
                  </div>
                </div>
              </template>
            </div>
          </template>

          <!-- ══ Reprimand ══ -->
          <template v-else-if="activeTab === 'reprimand'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">Reprimand</MpText>
              <MpText size="label" color="text.secondary">Include the reprimand history data as a review indicator, with a maximum range of one year.</MpText>
            </div>
            <div :class="fields">
              <MpCheckbox :is-checked="form.is_include_reprimand_data" :is-disabled="!isTemplateScoring" @update:is-checked="(v) => (form.is_include_reprimand_data = v)">
                Include reprimand data
                <template #description>The reprimand history is shown on the review form. Optionally define a score per reprimand type below.</template>
              </MpCheckbox>
              <div v-if="form.is_include_reprimand_data" :class="indent">
                <MpCheckbox :is-checked="form.is_reprimand_use_score" @update:is-checked="onToggleReprimandUseScore">
                  Define a score or rating for the reprimand
                </MpCheckbox>
                <template v-if="form.is_reprimand_use_score">
                  <div :class="tableWrap">
                    <div :class="[trow, css({ gridTemplateColumns: isTemplateRating ? '1fr 2fr 1fr' : '2fr 1fr auto', background: 'background.neutral.subtle' })]">
                      <MpText v-if="isTemplateRating" size="label-small" color="text.secondary">Rating name</MpText>
                      <MpText size="label-small" color="text.secondary">Reprimand type</MpText>
                      <MpText size="label-small" color="text.secondary">{{ isTemplateRating ? '' : 'Score' }}</MpText>
                      <span v-if="!isTemplateRating" />
                    </div>
                    <div v-for="(r, i) in form.reprimand_advance_scoring" :key="r.rating_id" :class="[trow, css({ gridTemplateColumns: isTemplateRating ? '1fr 2fr 1fr' : '2fr 1fr auto' })]">
                      <MpFlex v-if="isTemplateRating" align="center" gap="2"><MpText size="label">{{ r.name }}</MpText></MpFlex>
                      <MpPopover use-portal placement="bottom-start">
                        <MpPopoverTrigger>
                          <MpButton variant="secondary" right-icon="caret-down" size="sm">
                            {{ r.type_id.map(id => REPRIMAND_TYPES.find(t => t.id === id)?.type_name).filter(Boolean).join(', ') || 'Select type' }}
                          </MpButton>
                        </MpPopoverTrigger>
                        <MpPopoverContent>
                          <MpPopoverList>
                            <MpPopoverListItem v-for="t in reprimandTypesFor(i)" :key="t.id">
                              <MpCheckbox :is-checked="r.type_id.includes(t.id)" @update:is-checked="() => toggleReprimandType(r, t.id)">{{ t.type_name }}</MpCheckbox>
                            </MpPopoverListItem>
                          </MpPopoverList>
                        </MpPopoverContent>
                      </MpPopover>
                      <MpInputGroup v-if="!isTemplateRating" :class="cellInput"><MpInput v-model="r.score" type="number" /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                      <MpButton v-if="!isTemplateRating" variant="ghost" left-icon="minus-circular" :is-disabled="form.reprimand_advance_scoring.length === 1" @click="removeReprimandRow(i)" />
                    </div>
                  </div>
                  <MpButton v-if="isTemplatePercentOrPoint" variant="ghost" left-icon="add-circular" @click="addReprimandRow">Add reprimand type</MpButton>
                </template>
              </div>
            </div>
          </template>

          <!-- ══ Weight ══ -->
          <template v-else-if="activeTab === 'weight'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">Set aspects weight</MpText>
              <MpText size="label" color="text.secondary">The score of the review aspects is calculated once the review is finished.</MpText>
            </div>

            <MpText :class="subLabel">Final score calculation</MpText>
            <div :class="fields">
              <MpRadio name="final-score-calc" value="false" :is-checked="form.is_simple_sum === 'false'" @update:is-checked="form.is_simple_sum = 'false'">
                Use weight
                <template #description>Final score is calculated by the aspect score weight.</template>
              </MpRadio>
              <MpRadio name="final-score-calc" value="true" :is-checked="form.is_simple_sum === 'true'" @update:is-checked="form.is_simple_sum = 'true'">
                Simple sum
                <template #description>Final score is a sum of the aspect scores.</template>
              </MpRadio>
            </div>

            <template v-if="form.is_simple_sum === 'false'">
              <MpText :class="subLabel">Weight implementation</MpText>
              <div :class="fields">
                <MpRadio name="weight-impl" value="all-employees" :is-checked="form.weight_implementation === 'all-employees'" @update:is-checked="form.weight_implementation = 'all-employees'">
                  Same weight for all employees
                </MpRadio>
                <MpRadio name="weight-impl" value="custom" :is-checked="form.weight_implementation === 'custom'" @update:is-checked="form.weight_implementation = 'custom'">
                  Custom weight per employee
                </MpRadio>
              </div>

              <template v-if="form.weight_implementation === 'custom'">
                <MpText :class="subLabel">Group by</MpText>
                <div :class="fields">
                  <MpRadio name="weight-emp-type" value="by-job-level" :is-checked="form.weight_employment_type === 'by-job-level'" @update:is-checked="form.weight_employment_type = 'by-job-level'">By job level</MpRadio>
                  <MpRadio name="weight-emp-type" value="by-job-position" :is-checked="form.weight_employment_type === 'by-job-position'" @update:is-checked="form.weight_employment_type = 'by-job-position'">By job position</MpRadio>
                </div>
              </template>

              <!-- Aspects — all employees -->
              <template v-if="form.weight_implementation === 'all-employees'">
                <MpText :class="subLabel">Aspects</MpText>
                <div>
                  <div v-for="a in weightAspects" :key="a.key" :class="weightRow">
                    <MpText size="label" color="text.default">{{ a.label }} weight</MpText>
                    <MpInputGroup :class="css({ width: '104px' })"><MpInput v-model="form[a.field]" type="number" /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                  </div>
                  <MpFlex justify="flex-end" :class="css({ paddingTop: '2' })">
                    <MpText size="label" :class="allEmpWeightInvalid ? errorText : css({ color: 'text.secondary' })">{{ totalAllEmployeesWeight }}% of 100%</MpText>
                  </MpFlex>
                  <MpText v-if="allEmpWeightInvalid" :class="errorText">Total weight must be 100%</MpText>
                </div>
              </template>

              <!-- Aspects — custom per employee -->
              <template v-else>
                <MpText :class="subLabel">Weight per employee</MpText>
                <div v-if="!form.custom_weight_implementation.length">
                  <MpBanner variant="info" is-inline><MpBannerIcon /><MpBannerDescription>Select employees in the cycle first to configure custom weights.</MpBannerDescription></MpBanner>
                </div>
                <template v-else>
                  <!-- Bulk apply -->
                  <div :class="[trow, css({ gridTemplateColumns: `2fr repeat(${weightAspects.length}, 1fr) auto`, background: 'background.neutral.subtle' })]">
                    <MpText size="label-small" color="text.secondary">Apply to all</MpText>
                    <MpInputGroup v-for="a in weightAspects" :key="a.key" :class="cellInput"><MpInput v-model="bulk[a.key]" type="number" /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                    <MpButton variant="secondary" size="sm" @click="applyBulk">Apply</MpButton>
                  </div>
                  <div :class="[trow, css({ gridTemplateColumns: `2fr repeat(${weightAspects.length}, 1fr) auto` })]">
                    <MpText size="label-small" color="text.secondary">Employee</MpText>
                    <MpText v-for="a in weightAspects" :key="a.key" size="label-small" color="text.secondary">{{ a.label }}</MpText>
                    <MpText size="label-small" color="text.secondary">Total</MpText>
                  </div>
                  <div v-for="row in form.custom_weight_implementation" :key="row.id" :class="[trow, css({ gridTemplateColumns: `2fr repeat(${weightAspects.length}, 1fr) auto` })]">
                    <MpText size="label">{{ row.name }}</MpText>
                    <MpInputGroup v-for="a in weightAspects" :key="a.key" :class="cellInput"><MpInput v-model="(row as any)[a.key]" type="number" /><MpInputRightAddon>%</MpInputRightAddon></MpInputGroup>
                    <MpText size="label" :class="rowTotal(row as any) === 100 ? css({ color: 'text.secondary' }) : errorText">{{ rowTotal(row as any) }}%</MpText>
                  </div>
                  <MpText v-if="customWeightInvalid" :class="errorText">Each employee's total weight must be 100%</MpText>
                </template>
              </template>
            </template>
            <template v-else>
              <MpBanner variant="info" is-inline><MpBannerIcon /><MpBannerDescription>Final score will be calculated as the sum of the aspect scores.</MpBannerDescription></MpBanner>
            </template>
          </template>
        </MpDrawerBody>

        <MpDrawerFooter>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="onSave">Save</MpButton>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>

    <CycleDisablePrefillModal v-model:is-open="disablePrefillOpen" @confirm="confirmDisablePrefill" @cancel="cancelDisablePrefill" />
  </ClientOnly>
</template>
