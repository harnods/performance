<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Add Goal drawer
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU)
    single-owner: node 4433:76331 · multi-owner: node 4811:47361
  Token mode: Pixel 2.4

  One shared form: filled out once regardless of how many owners were picked
  upstream. On Save, the SAME goal definition is what gets duplicated into
  each owner's row on the "New goals" page (pages/goals/goal-cycles/[id]/new.vue) —
  the only field that varies per owner is "Goal contributor", which is why
  that section alone renders one card per owner once there's more than one.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpIcon,
  MpAvatar,
  MpAvatarGroup,
  MpInput,
  MpTextarea,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpCheckbox,
  MpRadio,
  MpToggle,
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  MpButtonGroup,
  MpDatePicker,
  css,
} from '@mekari/pixel3'
import { type Employee, EMPLOYEES, employeeMeta } from '~/utils/employees'
import { CURRENCY_OPTIONS, type CurrencyCode, GOAL_CATEGORIES, GOAL_TYPE_OPTIONS, MEASUREMENT_UNIT_OPTIONS, type MeasurementUnit } from '~/utils/goalTaxonomy'
import { type DraftGoal, type DraftKeyResult, nextGoalCode } from '~/utils/goalDraft'
import { addDays, clampEndDate, computeRepeatPeriods, toDate, toISO } from '~/utils/goalSchedule'
import { type DeadlineRule, MAX_DEADLINE_RULES, validateDeadlineRules } from '~/utils/goalDeadline'
import { formatDateShort } from '~/utils/periodPicker'

const props = defineProps<{
  isOpen: boolean
  drawerId?: string
  owners: Employee[]
  alreadyUsedWeight: number
  // Optional per-owner breakdown — each owner's own existing weight total in
  // this cycle (excluding whatever's being drafted right now). Only meaningful
  // when owners.length > 1: with multiple owners who each already carry a
  // different total, a single blanket "remaining weight" number is
  // inaccurate for everyone except whichever owner it happened to be based
  // on. When provided with more than one entry, the weight helper text below
  // shows each owner's own remaining weight instead of one shared figure.
  alreadyUsedWeightByOwner?: { id: string, name: string, weight: number }[]
  cycleStartDate: string
  cycleEndDate: string
  editingDraft?: DraftGoal | null
}>()
const resolvedDrawerId = computed(() => props.drawerId ?? 'drawer-add-goal')
const emit = defineEmits<{
  'update:isOpen': [boolean]
  'save': [DraftGoal]
}>()

const isEditing = computed(() => !!props.editingDraft)
const drawerTitle = computed(() => (isEditing.value ? 'Edit goal' : 'Add goal'))
const saveButtonLabel = computed(() => (isEditing.value ? 'Save changes' : 'Save'))

const nameMax = 120
const descriptionMax = 1000

const name = ref('')
const description = ref('')
const goalType = ref('')
const category = ref('')
const subCategory = ref('')
const weight = ref<number | ''>('')
const repeat = ref(false)
const scheduleEnd = ref<Date | null>(null)
const measurementUnit = ref<MeasurementUnit>('percentage')
const currency = ref<CurrencyCode>('IDR')
const startValue = ref<number | ''>('')
const targetValue = ref<number | ''>('')
const useBaseline = ref(true)
const direction = ref<'higher' | 'lower'>('higher')
const deadlineDate = ref<Date | null>(null)
const deadlineRulesEnabled = ref(false)
const deadlineRules = ref<DeadlineRule[]>([])
const contributorsByOwner = reactive<Record<string, string[]>>({})
// How each owner's contributor list is chosen — 'all' keeps it in sync with
// viewerIds, 'selected' lets the owner's card pick a subset via the inline
// checklist. Not persisted itself; inferred from contributorsByOwner vs
// viewerIds when editing (see resetForm below).
const contributorMode = reactive<Record<string, 'all' | 'selected' | undefined>>({})
const viewerIds = ref<string[]>([])
const restrictedVisibility = ref(false)
const keyResults = ref<DraftKeyResult[]>([])

const showKeyResultForm = ref(false)
const keyResultTitle = ref('')
const keyResultTarget = ref('')

const errors = reactive({ name: false, goalType: false, category: false, weight: false, deadlineDate: false, startValue: false, targetValue: false })
const startValueErrorMessage = ref('')
const targetValueErrorMessage = ref('')
const deadlineDateErrorMessage = ref('')
watch(name, () => { errors.name = false })
watch(goalType, () => { errors.goalType = false })
watch(category, () => { errors.category = false })
watch(weight, () => { errors.weight = false })
watch(deadlineDate, () => { errors.deadlineDate = false })
watch([startValue, useBaseline], () => { errors.startValue = false })
watch([startValue, targetValue, direction, useBaseline], () => { errors.targetValue = false })

// Order-independent set equality — used to infer whether an existing
// goal's contributors were originally "all members" or a hand-picked subset.
function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every(id => setB.has(id))
}

function resetForm() {
  errors.name = false
  errors.goalType = false
  errors.category = false
  errors.weight = false
  errors.deadlineDate = false
  errors.startValue = false
  errors.targetValue = false
  startValueErrorMessage.value = ''
  targetValueErrorMessage.value = ''
  deadlineDateErrorMessage.value = ''

  const d = props.editingDraft
  if (d) {
    name.value = d.name
    description.value = d.description
    goalType.value = GOAL_TYPE_OPTIONS.find(t => t.label === d.goalType)?.value ?? ''
    category.value = GOAL_CATEGORIES.find(c => c.label === d.category)?.value ?? ''
    weight.value = d.weight
    repeat.value = d.repeat
    scheduleEnd.value = d.endDate ? toDate(d.endDate) : (props.cycleEndDate ? toDate(props.cycleEndDate) : null)
    measurementUnit.value = d.measurementUnit
    currency.value = d.currency
    startValue.value = d.startValue
    targetValue.value = d.targetValue
    useBaseline.value = d.useBaseline
    direction.value = d.direction
    deadlineDate.value = d.deadlineDate ? toDate(d.deadlineDate) : null
    deadlineRulesEnabled.value = (d.deadlineRules?.length ?? 0) > 0
    deadlineRules.value = d.deadlineRules ? [...d.deadlineRules] : []
    for (const key of Object.keys(contributorsByOwner)) delete contributorsByOwner[key]
    for (const key of Object.keys(contributorMode)) delete contributorMode[key]
    for (const owner of props.owners) {
      const ids = [...(d.contributorsByOwner[owner.id] ?? [])]
      contributorsByOwner[owner.id] = ids
      contributorMode[owner.id] = ids.length === 0 ? undefined : (sameIdSet(ids, d.viewerIds) ? 'all' : 'selected')
    }
    viewerIds.value = [...d.viewerIds]
    restrictedVisibility.value = d.restrictedVisibility ?? false
    keyResults.value = d.keyResults.map(kr => ({ ...kr }))
    // subCategory depends on category — the watcher below resets it to ''
    // the moment `category.value` changes, so it must be set *after* that
    // watcher has flushed, not in the same synchronous pass.
    nextTick(() => {
      const cat = GOAL_CATEGORIES.find(c => c.label === d.category)
      subCategory.value = cat?.subCategories.find(s => s.label === d.subCategory)?.value ?? ''
    })
  }
  else {
    name.value = ''
    description.value = ''
    goalType.value = ''
    category.value = ''
    subCategory.value = ''
    weight.value = ''
    repeat.value = false
    scheduleEnd.value = props.cycleEndDate ? toDate(props.cycleEndDate) : null
    measurementUnit.value = 'percentage'
    currency.value = 'IDR'
    startValue.value = ''
    targetValue.value = ''
    useBaseline.value = true
    direction.value = 'higher'
    deadlineDate.value = null
    deadlineRulesEnabled.value = false
    deadlineRules.value = []
    for (const key of Object.keys(contributorsByOwner)) delete contributorsByOwner[key]
    for (const key of Object.keys(contributorMode)) delete contributorMode[key]
    for (const owner of props.owners) { contributorsByOwner[owner.id] = []; contributorMode[owner.id] = undefined }
    viewerIds.value = []
    restrictedVisibility.value = false
    keyResults.value = []
  }
  deadlineRuleErrors.value = []
  viewerDrawerOpen.value = false
  showKeyResultForm.value = false
  keyResultTitle.value = ''
  keyResultTarget.value = ''
}

watch(() => props.isOpen, (open) => { if (open) resetForm() })

const categoryOptions = computed(() => GOAL_CATEGORIES.map(c => ({ value: c.value, label: c.label })))
const subCategoryOptions = computed(() => {
  const cat = GOAL_CATEGORIES.find(c => c.value === category.value)
  return cat ? cat.subCategories.map(s => ({ value: s.value, label: s.label })) : []
})
watch(category, () => { subCategory.value = '' })

const remainingWeight = computed(() => {
  const current = weight.value === '' ? 0 : Number(weight.value)
  return 100 - props.alreadyUsedWeight - current
})
// Only rendered when there's more than one owner with different existing
// totals (see alreadyUsedWeightByOwner prop doc) — each owner's own
// remaining weight, not one number borrowed from whichever owner it came from.
const remainingWeightByOwner = computed(() => {
  if (!props.alreadyUsedWeightByOwner || props.alreadyUsedWeightByOwner.length <= 1) return null
  const current = weight.value === '' ? 0 : Number(weight.value)
  return props.alreadyUsedWeightByOwner.map(o => ({ id: o.id, name: o.name, remaining: 100 - o.weight - current }))
})

function formatThousands(v: number | ''): string {
  return v === '' ? '' : Number(v).toLocaleString('en-US')
}
function parseThousands(str: string): number | '' {
  const digits = str.replace(/[^\d]/g, '')
  return digits === '' ? '' : Number(digits)
}
const startValueAmountDisplay = computed({
  get: () => formatThousands(startValue.value),
  set: (v: string) => { startValue.value = parseThousands(v) },
})
const targetValueAmountDisplay = computed({
  get: () => formatThousands(targetValue.value),
  set: (v: string) => { targetValue.value = parseThousands(v) },
})
const currencySymbol = computed(() => CURRENCY_OPTIONS.find(c => c.value === currency.value)?.symbol ?? '')

const isDeadlineUnit = computed(() => measurementUnit.value === 'deadline')

// Deadline achievement is a date, not a baseline/target scale — switching
// to it clears fields that only make sense for the other units (and vice
// versa) so stale values from a previous unit never get silently saved.
// Deadline goals also can't repeat (there's no "period length" to cascade).
watch(measurementUnit, (unit) => {
  if (unit === 'deadline') {
    startValue.value = ''
    targetValue.value = ''
    useBaseline.value = true
    direction.value = 'higher'
    repeat.value = false
  }
  else {
    deadlineDate.value = null
    deadlineRulesEnabled.value = false
    deadlineRules.value = []
  }
})

function addDeadlineRule() {
  if (deadlineRules.value.length >= MAX_DEADLINE_RULES) return
  deadlineRules.value = [...deadlineRules.value, { id: `deadline-rule-${deadlineRules.value.length}-${Date.now()}`, daysExceed: '', percentage: '' }]
}
function removeDeadlineRule(id: string) {
  deadlineRules.value = deadlineRules.value.filter(r => r.id !== id)
}

// Turning the toggle on should immediately give the user something to fill
// in rather than an empty box with just an "Add rule" link.
watch(deadlineRulesEnabled, (enabled) => {
  if (enabled && deadlineRules.value.length === 0) addDeadlineRule()
})

// Required-field errors ("Days exceeded and achievement % are required.")
// should only appear once the user tries to Save — not live while an empty
// row is just sitting there waiting to be filled in. save() populates this;
// any edit to the rules clears it so a fixed row's error disappears right away.
const deadlineRuleErrors = ref<{ index: number, message: string }[]>([])
watch(deadlineRules, () => { deadlineRuleErrors.value = [] }, { deep: true })

const cycleStartAsDate = computed(() => (props.cycleStartDate ? toDate(props.cycleStartDate) : null))
const cycleEndAsDate = computed(() => (props.cycleEndDate ? toDate(props.cycleEndDate) : null))
// The goal's end date must be at least one day after its start date — a
// same-day goal isn't a valid period.
const minScheduleEnd = computed(() => (cycleStartAsDate.value ? addDays(cycleStartAsDate.value, 1) : null))

function isEndDateDisabled(date: Date): boolean {
  if (minScheduleEnd.value && date < minScheduleEnd.value) return true
  if (cycleEndAsDate.value && date > cycleEndAsDate.value) return true
  return false
}

// The deadline itself must fall within the GOAL's own period (start date up
// to its own end date), not just the wider cycle — a goal that ends before
// the cycle does can't have a deadline sitting in that leftover cycle time.
function isDeadlineDateDisabled(date: Date): boolean {
  if (cycleStartAsDate.value && date < cycleStartAsDate.value) return true
  if (scheduleEnd.value && date > scheduleEnd.value) return true
  return false
}

// disabled-date only grays out invalid calendar cells — it doesn't stop a
// value arriving out of range some other way (typed input, a shortcut). Also
// re-clamp the actual ref so a goal's period can never end outside the
// cycle's bounds no matter how the value got set.
watch(scheduleEnd, (val) => {
  if (!val || !cycleStartAsDate.value || !cycleEndAsDate.value || !minScheduleEnd.value) return
  const clamped = clampEndDate(val, cycleStartAsDate.value, cycleEndAsDate.value, minScheduleEnd.value)
  if (clamped.getTime() !== val.getTime()) scheduleEnd.value = clamped
})

// Same defense for the deadline: re-clamp to the goal's own period no
// matter how the value got set, and re-clamp again if the goal's own end
// date later moves earlier than an already-picked deadline.
watch(deadlineDate, (val) => {
  if (!val || !cycleStartAsDate.value || !scheduleEnd.value) return
  const clamped = clampEndDate(val, cycleStartAsDate.value, scheduleEnd.value, cycleStartAsDate.value)
  if (clamped.getTime() !== val.getTime()) deadlineDate.value = clamped
})
watch(scheduleEnd, (val) => {
  if (!deadlineDate.value || !val || !cycleStartAsDate.value) return
  const clamped = clampEndDate(deadlineDate.value, cycleStartAsDate.value, val, cycleStartAsDate.value)
  if (clamped.getTime() !== deadlineDate.value.getTime()) deadlineDate.value = clamped
})

const repeatPreview = computed(() => {
  if (!repeat.value || !cycleStartAsDate.value || !scheduleEnd.value || !props.cycleEndDate) return []
  const periods = computeRepeatPeriods(props.cycleStartDate, toISO(scheduleEnd.value), props.cycleEndDate)
  return periods.map(p => `${formatDateShort(toDate(p.startDate))} - ${formatDateShort(toDate(p.endDate))}`)
})

function employeeById(id: string): Employee | undefined {
  return EMPLOYEES.find(e => e.id === id)
}

// "Name, Name and N more" — mirrors the 2-avatar-then-"+N" cap on the
// avatar group above so the text and the avatars always agree on count.
const ownerNamesSummary = computed(() => {
  const names = props.owners.map(o => o.name)
  if (names.length <= 2) return names.join(' and ')
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`
})

const viewerDrawerOpen = ref(false)

function removeViewer(employeeId: string) {
  viewerIds.value = viewerIds.value.filter(id => id !== employeeId)
}

// A contributor can never be someone who isn't also a goal member — picking
// "All members" locks the owner's contributor list to the current member
// list; picking "Selected members" reveals a checklist scoped to members only.
function setContributorMode(ownerId: string, mode: 'all' | 'selected') {
  contributorMode[ownerId] = mode
  if (mode === 'all') contributorsByOwner[ownerId] = [...viewerIds.value]
}
function toggleContributor(ownerId: string, employeeId: string, checked: boolean) {
  const current = contributorsByOwner[ownerId] ?? []
  contributorsByOwner[ownerId] = checked ? [...current, employeeId] : current.filter(id => id !== employeeId)
}
// Keeps the invariant true even if members change after contributors were
// picked: "all"-mode owners stay synced to the current member list, and any
// owner's contributor list gets stripped of anyone no longer a member.
watch(viewerIds, (ids) => {
  for (const owner of props.owners) {
    contributorsByOwner[owner.id] = contributorMode[owner.id] === 'all'
      ? [...ids]
      : (contributorsByOwner[owner.id] ?? []).filter(id => ids.includes(id))
  }
}, { deep: true })

// A restricted-visibility toggle only makes sense for Organization goals —
// clear it if the type changes away so a stale "on" can't silently carry
// over to a different goal type.
watch(goalType, (type) => { if (type !== 'organization') restrictedVisibility.value = false })

function addKeyResult() {
  if (!keyResultTitle.value.trim()) return
  keyResults.value = [...keyResults.value, { id: `kr-${keyResults.value.length}-${Date.now()}`, title: keyResultTitle.value.trim(), target: keyResultTarget.value.trim() }]
  keyResultTitle.value = ''
  keyResultTarget.value = ''
  showKeyResultForm.value = false
}
function removeKeyResult(id: string) {
  keyResults.value = keyResults.value.filter(kr => kr.id !== id)
}

function close() {
  emit('update:isOpen', false)
}

function save() {
  errors.name = !name.value.trim()
  errors.goalType = !goalType.value
  errors.category = !category.value
  errors.weight = weight.value === '' || Number(weight.value) <= 0 || Number(weight.value) > 100
  errors.deadlineDate = false
  errors.startValue = false
  errors.targetValue = false
  startValueErrorMessage.value = ''
  targetValueErrorMessage.value = ''

  deadlineRuleErrors.value = []
  deadlineDateErrorMessage.value = ''
  if (isDeadlineUnit.value) {
    if (!deadlineDate.value) {
      errors.deadlineDate = true
      deadlineDateErrorMessage.value = 'Deadline date is required.'
    }
    else if ((cycleStartAsDate.value && deadlineDate.value < cycleStartAsDate.value) || (scheduleEnd.value && deadlineDate.value > scheduleEnd.value)) {
      errors.deadlineDate = true
      deadlineDateErrorMessage.value = 'Deadline must not be later than the goal period.'
    }
    if (deadlineRulesEnabled.value) deadlineRuleErrors.value = validateDeadlineRules(deadlineRules.value)
  }
  else {
    const startNum = startValue.value === '' ? null : Number(startValue.value)
    const targetNum = targetValue.value === '' ? null : Number(targetValue.value)
    if (useBaseline.value && startNum === null) {
      errors.startValue = true
      startValueErrorMessage.value = 'Start value is required.'
    }
    if (targetNum === null) {
      errors.targetValue = true
      targetValueErrorMessage.value = 'Target value is required.'
    }
    else if (!useBaseline.value && targetNum === 0) {
      errors.targetValue = true
      targetValueErrorMessage.value = 'Target value cannot be 0 when there is no baseline.'
    }
    else if (useBaseline.value && startNum !== null) {
      if (direction.value === 'higher' && startNum >= targetNum) {
        errors.targetValue = true
        targetValueErrorMessage.value = 'Target value must be greater than the start value for "Higher is better".'
      }
      else if (direction.value === 'lower' && startNum <= targetNum) {
        errors.targetValue = true
        targetValueErrorMessage.value = 'Target value must be lower than the start value for "Lower is better".'
      }
    }
  }

  if (errors.name || errors.goalType || errors.category || errors.weight || errors.deadlineDate || errors.startValue || errors.targetValue || deadlineRuleErrors.value.length) return
  const categoryLabel = GOAL_CATEGORIES.find(c => c.value === category.value)?.label ?? category.value
  const subCategoryLabel = subCategoryOptions.value.find(s => s.value === subCategory.value)?.label ?? ''
  const goalTypeLabel = GOAL_TYPE_OPTIONS.find(t => t.value === goalType.value)?.label ?? goalType.value

  let finalEnd = scheduleEnd.value
  if (finalEnd && cycleStartAsDate.value && cycleEndAsDate.value && minScheduleEnd.value)
    finalEnd = clampEndDate(finalEnd, cycleStartAsDate.value, cycleEndAsDate.value, minScheduleEnd.value)

  const draft: DraftGoal = {
    id: props.editingDraft?.id ?? `goal-${Date.now()}`,
    code: props.editingDraft?.code ?? nextGoalCode(),
    category: categoryLabel,
    subCategory: subCategoryLabel,
    name: name.value.trim(),
    description: description.value.trim(),
    goalType: goalTypeLabel,
    weight: Number(weight.value),
    repeat: repeat.value,
    startDate: props.cycleStartDate,
    endDate: finalEnd ? toISO(finalEnd) : props.cycleEndDate,
    measurementUnit: measurementUnit.value,
    currency: currency.value,
    startValue: startValue.value === '' ? 0 : Number(startValue.value),
    targetValue: targetValue.value === '' ? 0 : Number(targetValue.value),
    useBaseline: useBaseline.value,
    baselineValue: startValue.value === '' ? 0 : Number(startValue.value),
    direction: direction.value,
    deadlineDate: deadlineDate.value ? toISO(deadlineDate.value) : '',
    deadlineRules: deadlineRulesEnabled.value ? [...deadlineRules.value] : [],
    contributorsByOwner: JSON.parse(JSON.stringify(contributorsByOwner)),
    viewerIds: [...viewerIds.value],
    keyResults: [...keyResults.value],
    restrictedVisibility: restrictedVisibility.value,
    // Whoever this drawer instance is scoped to via `owners` — the full page
    // selection when adding, or just one owner when detach-editing their row.
    ownerIds: props.owners.map(o => o.id),
  }
  emit('save', draft)
  emit('update:isOpen', false)
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const fields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const section = css({ display: 'flex', flexDirection: 'column', gap: '4', paddingBottom: '5' })
const sectionLast = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1' })
const sectionTitle = css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionDesc = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const requiredMark = css({ color: 'text.danger' })
const radioIndent = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingLeft: '8' })
const noSpinner = css({
  appearance: 'none',
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { display: 'none', margin: '0' },
})
const helperText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const weightHintWrap = css({ marginTop: '2' })
const warningText = css({ color: 'text.warning' })
const repeatPreviewBox = css({
  display: 'flex', flexDirection: 'column', gap: '1',
  padding: '3', borderRadius: '6px', background: 'background.neutral.subtle',
})
const deadlineRulesBox = css({
  display: 'flex', flexDirection: 'column', gap: '3',
  padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default',
})
const deadlineRuleRow = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
const deadlineRuleRemoveWrap = css({ display: 'flex', alignItems: 'center', height: '36px' })
const deadlineRuleError = css({ fontSize: '12px', lineHeight: '16px', color: 'text.danger' })

const ownerBox = css({
  display: 'flex', alignItems: 'center', gap: '2',
  padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default',
  background: 'background.neutral.subtle',
})

const addLink = css({
  display: 'inline-flex', alignItems: 'center', gap: '2',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.link', fontSize: '14px', lineHeight: '20px',
})
const personCard = css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default' })
const personRow = css({ display: 'flex', alignItems: 'center', gap: '3' })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const removeBtn = css({ background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', color: 'icon.secondary', display: 'flex' })

const krRow = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
const krForm = css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :id="resolvedDrawerId" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ drawerTitle }}
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div :class="fields">
            <!-- Goal details -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal details</span>
                <span :class="sectionDesc">What this goal is and where it fits.</span>
              </div>

              <MpFormControl id="goal-owner">
                <MpFormLabel>Goal owner</MpFormLabel>
                <div :class="ownerBox">
                  <MpAvatarGroup v-if="owners.length > 1" id="goal-owner-avatars" size="lg" :max="2">
                    <MpAvatar v-for="o in owners" :key="o.id" :id="o.id" :name="o.name" :src="o.photo" variant-color="gray" />
                  </MpAvatarGroup>
                  <MpAvatar v-else-if="owners[0]" :id="owners[0].id" :name="owners[0].name" :src="owners[0].photo" size="sm" variant-color="gray" />
                  <MpText size="label" :class="css({ color: owners.length ? 'text.default' : 'text.secondary' })">
                    <template v-if="owners.length === 1">{{ owners[0].name }} ({{ owners[0].code }})</template>
                    <template v-else>{{ ownerNamesSummary }}</template>
                  </MpText>
                </div>
              </MpFormControl>

              <MpFormControl id="goal-name" :is-invalid="errors.name">
                <MpFlex align="center" justify="space-between">
                  <MpFlex align="center" gap="1">
                    <MpFormLabel>Goal name</MpFormLabel>
                    <MpText size="label" :class="requiredMark">*</MpText>
                  </MpFlex>
                  <span :class="charCount">{{ name.length }} / {{ nameMax }}</span>
                </MpFlex>
                <MpInput v-model="name" :maxlength="nameMax" />
                <MpFormErrorMessage>Goal name is required.</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl id="goal-description">
                <MpFlex align="center" justify="space-between">
                  <MpFormLabel>Description</MpFormLabel>
                  <span :class="charCount">{{ description.length }} / {{ descriptionMax }}</span>
                </MpFlex>
                <MpTextarea v-model="description" :maxlength="descriptionMax" />
              </MpFormControl>

              <MpFormControl id="goal-type" :is-invalid="errors.goalType">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal type</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <PxSelectPopover v-model="goalType" :options="GOAL_TYPE_OPTIONS" placeholder="Select goal type" width="100%" />
                <MpFormErrorMessage>Goal type is required.</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl id="goal-category" :is-invalid="errors.category">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal category</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <PxSelectPopover v-model="category" :options="categoryOptions" placeholder="Select goal category" width="100%" />
                <MpFormErrorMessage>Goal category is required.</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl v-if="category" id="goal-sub-category">
                <MpFormLabel>Goal sub-category</MpFormLabel>
                <PxSelectPopover v-model="subCategory" :options="subCategoryOptions" placeholder="Select goal sub-category" width="100%" />
              </MpFormControl>

              <MpFormControl id="goal-weight" :is-invalid="errors.weight">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal weight</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <MpInputGroup>
                  <MpInput v-model="weight" type="number" min="0" max="100" />
                  <MpInputRightAddon>%</MpInputRightAddon>
                </MpInputGroup>
                <MpFormErrorMessage>Goal weight is required and must be between 1 and 100.</MpFormErrorMessage>
                <MpFlex v-if="!errors.weight && remainingWeightByOwner" direction="column" gap="0" :class="weightHintWrap">
                  <span v-for="o in remainingWeightByOwner" :key="o.id" :class="[helperText, o.remaining < 0 && warningText]">{{ o.name }}: {{ o.remaining }}% remaining</span>
                </MpFlex>
                <span v-else-if="!errors.weight" :class="[helperText, weightHintWrap, remainingWeight < 0 && warningText]">{{ remainingWeight }}% remaining from total weight</span>
              </MpFormControl>
            </div>

            <!-- Goal schedule -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal schedule</span>
                <span :class="sectionDesc">Define when this goal is active within the goal cycle.</span>
              </div>
              <MpFlex gap="4">
                <MpFormControl id="schedule-start" :class="css({ flex: '1' })">
                  <MpFormLabel>Start date</MpFormLabel>
                  <MpInput :model-value="cycleStartAsDate ? formatDateShort(cycleStartAsDate) : ''" is-disabled />
                </MpFormControl>
                <MpFormControl id="schedule-end" :class="css({ flex: '1' })">
                  <MpFormLabel>End date</MpFormLabel>
                  <MpDatePicker
                    v-model="scheduleEnd"
                    value-type="date"
                    format="D MMM YYYY"
                    placeholder="Select end date"
                    use-portal
                    :is-show-shortcut="false"
                    :disabled-date="isEndDateDisabled"
                  />
                </MpFormControl>
              </MpFlex>

              <MpCheckbox id="repeat-goal" v-model:is-checked="repeat" :is-disabled="isDeadlineUnit">Repeat this goal</MpCheckbox>
              <span v-if="isDeadlineUnit" :class="helperText">Repeat isn't available for Deadline-measured goals.</span>
              <div v-if="repeat && repeatPreview.length > 1" :class="repeatPreviewBox">
                <span :class="helperText">This goal will automatically repeat within the goal cycle:</span>
                <span v-for="(label, i) in repeatPreview" :key="label" :class="helperText">{{ i + 1 }}. {{ label }}</span>
              </div>
            </div>

            <!-- Goal measurement -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal measurement</span>
                <span :class="sectionDesc">How progress is tracked and what success looks like.</span>
              </div>

              <MpFormControl id="measurement-unit">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Measurement unit</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <MpFlex direction="column" gap="2">
                  <template v-for="opt in MEASUREMENT_UNIT_OPTIONS" :key="opt.value">
                    <MpRadio
                      name="measurement-unit"
                      :value="opt.value"
                      :is-checked="measurementUnit === opt.value"
                      @update:is-checked="measurementUnit = opt.value"
                    >
                      {{ opt.label }}
                    </MpRadio>
                    <div v-if="measurementUnit === opt.value" :class="radioIndent">
                      <!-- Deadline: a single date + optional graduated achievement rules, no baseline/target/direction -->
                      <template v-if="opt.value === 'deadline'">
                        <MpFlex gap="4">
                          <MpFormControl id="deadline-date" :class="css({ flex: '1' })" :is-invalid="errors.deadlineDate">
                            <MpFormLabel>Deadline date</MpFormLabel>
                            <MpDatePicker
                              v-model="deadlineDate"
                              value-type="date"
                              format="D MMM YYYY"
                              placeholder="Select deadline date"
                              use-portal
                              :is-show-shortcut="false"
                              :disabled-date="isDeadlineDateDisabled"
                            />
                            <MpFormErrorMessage>{{ deadlineDateErrorMessage }}</MpFormErrorMessage>
                            <span v-if="!errors.deadlineDate" :class="helperText">Achievement is 100% if updated on or before the deadline, 0% if updated after — unless deadline rules below are set.</span>
                          </MpFormControl>
                          <div :class="css({ flex: '1' })" />
                        </MpFlex>

                        <MpCheckbox id="deadline-rules-enabled" v-model:is-checked="deadlineRulesEnabled">Set deadline rules</MpCheckbox>
                        <div v-if="deadlineRulesEnabled" :class="deadlineRulesBox">
                          <div v-for="(rule, index) in deadlineRules" :key="rule.id">
                            <div :class="deadlineRuleRow">
                              <MpFormControl :id="`deadline-rule-days-${rule.id}`" :class="css({ flex: '1' })">
                                <MpFormLabel>Days exceeded</MpFormLabel>
                                <MpInputGroup>
                                  <MpInput v-model="rule.daysExceed" type="number" min="0" :class="noSpinner" />
                                  <MpInputRightAddon>days</MpInputRightAddon>
                                </MpInputGroup>
                              </MpFormControl>
                              <MpFormControl :id="`deadline-rule-pct-${rule.id}`" :class="css({ flex: '1' })">
                                <MpFormLabel>Achievement</MpFormLabel>
                                <MpInputGroup>
                                  <MpInput v-model="rule.percentage" type="number" min="0" max="100" :class="noSpinner" />
                                  <MpInputRightAddon>%</MpInputRightAddon>
                                </MpInputGroup>
                              </MpFormControl>
                              <MpFormControl :class="css({ flexShrink: '0' })">
                                <MpFormLabel :class="css({ visibility: 'hidden' })">&nbsp;</MpFormLabel>
                                <div :class="deadlineRuleRemoveWrap">
                                  <button type="button" :class="removeBtn" aria-label="Remove deadline rule" @click="removeDeadlineRule(rule.id)">
                                    <MpIcon name="minus-circular" size="sm" />
                                  </button>
                                </div>
                              </MpFormControl>
                            </div>
                            <span v-for="err in deadlineRuleErrors.filter(e => e.index === index)" :key="err.message" :class="deadlineRuleError">{{ err.message }}</span>
                          </div>
                          <button type="button" :class="addLink" :disabled="deadlineRules.length >= MAX_DEADLINE_RULES" @click="addDeadlineRule">
                            <MpIcon name="add" size="sm" />
                            Add rule
                          </button>
                          <span v-if="deadlineRules.length >= MAX_DEADLINE_RULES" :class="helperText">Maximum {{ MAX_DEADLINE_RULES }} rules.</span>
                        </div>
                      </template>

                      <!-- Percentage / Number / Amount: baseline + target on a numeric scale -->
                      <template v-else>
                        <MpCheckbox id="use-baseline" v-model:is-checked="useBaseline">Use baseline</MpCheckbox>
                        <MpFlex gap="4">
                          <MpFormControl v-if="opt.value === 'amount'" id="goal-currency" :class="css({ flex: '1' })">
                            <MpFormLabel>Currency</MpFormLabel>
                            <PxSelectPopover v-model="currency" :options="CURRENCY_OPTIONS" width="100%" />
                          </MpFormControl>
                          <MpFormControl v-if="useBaseline" id="start-value" :class="css({ flex: '1' })" :is-invalid="errors.startValue">
                            <MpFormLabel>Start value</MpFormLabel>
                            <MpInputGroup v-if="opt.value === 'amount'">
                              <MpInputLeftAddon>{{ currencySymbol }}</MpInputLeftAddon>
                              <MpInput v-model="startValueAmountDisplay" type="text" inputmode="numeric" />
                            </MpInputGroup>
                            <MpInputGroup v-else>
                              <MpInput v-model="startValue" type="number" :class="noSpinner" />
                              <MpInputRightAddon>{{ opt.value === 'percentage' ? '%' : '#' }}</MpInputRightAddon>
                            </MpInputGroup>
                            <MpFormErrorMessage>{{ startValueErrorMessage }}</MpFormErrorMessage>
                          </MpFormControl>
                          <MpFormControl id="target-value" :class="css({ flex: '1' })" :is-invalid="errors.targetValue">
                            <MpFormLabel>Target value</MpFormLabel>
                            <MpInputGroup v-if="opt.value === 'amount'">
                              <MpInputLeftAddon>{{ currencySymbol }}</MpInputLeftAddon>
                              <MpInput v-model="targetValueAmountDisplay" type="text" inputmode="numeric" />
                            </MpInputGroup>
                            <MpInputGroup v-else>
                              <MpInput v-model="targetValue" type="number" :class="noSpinner" />
                              <MpInputRightAddon>{{ opt.value === 'percentage' ? '%' : '#' }}</MpInputRightAddon>
                            </MpInputGroup>
                            <MpFormErrorMessage>{{ targetValueErrorMessage }}</MpFormErrorMessage>
                          </MpFormControl>
                        </MpFlex>
                      </template>
                    </div>
                  </template>
                </MpFlex>
              </MpFormControl>

              <MpFormControl v-if="!isDeadlineUnit" id="goal-direction">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal direction</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <MpFlex direction="column" gap="2">
                  <MpRadio name="goal-direction" value="higher" :is-checked="direction === 'higher'" @update:is-checked="direction = 'higher'">
                    Higher is better
                    <template #description>Achievement increases as the value goes up — e.g. revenue, satisfaction score.</template>
                  </MpRadio>
                  <MpRadio name="goal-direction" value="lower" :is-checked="direction === 'lower'" @update:is-checked="direction = 'lower'">
                    Lower is better
                    <template #description>Achievement increases as the value goes down — e.g. cost, defect rate, response time.</template>
                  </MpRadio>
                </MpFlex>
              </MpFormControl>
            </div>

            <!-- Goal members (moved before Goal contributor — a contributor
                 can only ever be picked from a goal's own members below). -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal members <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">People who can view this goal and align their goals to it.</span>
              </div>
              <MpFlex v-for="id in viewerIds" :key="id" :class="personRow">
                <MpAvatar :id="id" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" size="md" variant-color="gray" />
                <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                  <span :class="personName">{{ employeeById(id)?.name }}</span>
                  <span :class="personMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                </MpFlex>
                <button type="button" :class="removeBtn" aria-label="Remove member" @click="removeViewer(id)">
                  <MpIcon name="minus-circular" size="sm" />
                </button>
              </MpFlex>
              <button type="button" :class="addLink" @click="viewerDrawerOpen = true">
                <MpIcon name="add" size="sm" />
                Add goal members
              </button>

              <!-- Organization goals only: restrict viewing to owner + members -->
              <MpToggle v-if="goalType === 'organization'" id="restrict-visibility" v-model:is-checked="restrictedVisibility">
                Limit who can view this goal
                <template #description>When on, only the goal owner and goal members above can view this goal.</template>
              </MpToggle>
            </div>

            <!-- Goal contributor — works the same for every goal type,
                 including Team goal. A contributor can only ever be chosen
                 from the goal's own members (see Goal members above). -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal contributor <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">People who contribute to this goal's progress — chosen from the goal's members above.</span>
              </div>

              <MpText v-if="viewerIds.length === 0" size="label" :class="helperText">Add goal members first to choose contributors from them.</MpText>

              <!-- Single owner: one radio + inline checklist -->
              <template v-else-if="owners.length === 1">
                <MpFlex direction="column" gap="2">
                  <MpRadio name="contrib-mode-single" :is-checked="contributorMode[owners[0].id] === 'all'" @update:is-checked="setContributorMode(owners[0].id, 'all')">All members</MpRadio>
                  <MpRadio name="contrib-mode-single" :is-checked="contributorMode[owners[0].id] === 'selected'" @update:is-checked="setContributorMode(owners[0].id, 'selected')">Selected members</MpRadio>
                </MpFlex>
                <div v-if="contributorMode[owners[0].id] === 'selected'" :class="radioIndent">
                  <MpCheckbox
                    v-for="id in viewerIds"
                    :key="id"
                    :id="`contributor-${owners[0].id}-${id}`"
                    :is-checked="(contributorsByOwner[owners[0].id] ?? []).includes(id)"
                    @update:is-checked="(checked) => toggleContributor(owners[0].id, id, checked)"
                  >
                    {{ employeeById(id)?.name }}
                  </MpCheckbox>
                </div>
              </template>

              <!-- Multiple owners: one card per owner, mode picked per owner -->
              <template v-else>
                <div v-for="owner in owners" :key="owner.id" :class="personCard">
                  <div :class="personRow">
                    <MpAvatar :id="owner.id" :name="owner.name" :src="owner.photo" size="md" variant-color="gray" />
                    <MpFlex direction="column" gap="0">
                      <span :class="personName">{{ owner.name }}</span>
                      <span :class="personMeta">{{ employeeMeta(owner) }}</span>
                    </MpFlex>
                  </div>

                  <MpFlex direction="column" gap="2">
                    <MpRadio :name="`contrib-mode-${owner.id}`" :is-checked="contributorMode[owner.id] === 'all'" @update:is-checked="setContributorMode(owner.id, 'all')">All members</MpRadio>
                    <MpRadio :name="`contrib-mode-${owner.id}`" :is-checked="contributorMode[owner.id] === 'selected'" @update:is-checked="setContributorMode(owner.id, 'selected')">Selected members</MpRadio>
                  </MpFlex>
                  <div v-if="contributorMode[owner.id] === 'selected'" :class="radioIndent">
                    <MpCheckbox
                      v-for="id in viewerIds"
                      :key="id"
                      :id="`contributor-${owner.id}-${id}`"
                      :is-checked="(contributorsByOwner[owner.id] ?? []).includes(id)"
                      @update:is-checked="(checked) => toggleContributor(owner.id, id, checked)"
                    >
                      {{ employeeById(id)?.name }}
                    </MpCheckbox>
                  </div>
                </div>
              </template>
            </div>

            <!-- Key results -->
            <div :class="sectionLast">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Key results <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">Specific outcomes that automatically update goal progress.</span>
              </div>
              <div v-for="kr in keyResults" :key="kr.id" :class="krRow">
                <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                  <span :class="personName">{{ kr.title }}</span>
                  <span v-if="kr.target" :class="personMeta">Target: {{ kr.target }}</span>
                </MpFlex>
                <button type="button" :class="removeBtn" aria-label="Remove key result" @click="removeKeyResult(kr.id)">
                  <MpIcon name="minus-circular" size="sm" />
                </button>
              </div>
              <div v-if="showKeyResultForm" :class="krForm">
                <MpFormControl id="kr-title">
                  <MpFormLabel>Key result title</MpFormLabel>
                  <MpInput v-model="keyResultTitle" />
                </MpFormControl>
                <MpFormControl id="kr-target">
                  <MpFormLabel>Target</MpFormLabel>
                  <MpInput v-model="keyResultTarget" />
                </MpFormControl>
                <MpButtonGroup>
                  <MpButton variant="ghost" @click="showKeyResultForm = false">Cancel</MpButton>
                  <MpButton variant="primary" @click="addKeyResult">Add</MpButton>
                </MpButtonGroup>
              </div>
              <button v-else type="button" :class="addLink" @click="showKeyResultForm = true">
                <MpIcon name="add" size="sm" />
                Add key result
              </button>
            </div>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="save">{{ saveButtonLabel }}</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>

  <SelectEmployeesDrawer
    drawer-id="drawer-select-viewers"
    :is-open="viewerDrawerOpen"
    title="Select goal members"
    description="People who can view this goal and align their goals to it."
    :initial-selected="viewerIds"
    :exclude-ids="owners.map(o => o.id)"
    :is-required="false"
    @update:is-open="viewerDrawerOpen = $event"
    @continue="(ids) => { viewerIds = ids }"
  />
</template>
