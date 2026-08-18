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
  MpInput,
  MpRichTextEditor,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpFormHelpText,
  MpTextlink,
  MpCheckbox,
  MpRadio,
  MpToggle,
  MpTooltip,
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpBanner,
  MpBannerIcon,
  MpBannerDescription,
  MpDrawerFooter,
  MpDrawerOverlay,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpButtonGroup,
  MpDatePicker,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'
import { type Employee, EMPLOYEES, employeeMeta } from '~/utils/employees'
import { EMPLOYEE_MANAGER } from '~/composables/useGoalsStore'
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
  // The cycle these goals belong to — scopes the "Align to a goal" parent
  // options to goals in the same cycle. Omit to hide the alignment field.
  cycleId?: string
  editingDraft?: DraftGoal | null
}>()
const resolvedDrawerId = computed(() => props.drawerId ?? 'drawer-add-goal')
const emit = defineEmits<{
  'update:isOpen': [boolean]
  'save': [DraftGoal]
}>()

const isEditing = computed(() => !!props.editingDraft)
// A direct report's goal edit goes to approval — warn up front in the drawer.
const editNeedsApproval = computed(() => isEditing.value && props.owners.some(o => needsApproval(o.id)))
const approverName = computed(() => {
  const o = props.owners.find(x => needsApproval(x.id))
  return (o ? employeeById(EMPLOYEE_MANAGER[o.id]) : undefined)?.name ?? 'your manager'
})
const drawerTitle = computed(() => (isEditing.value ? 'Edit goal' : 'Add goal'))
const saveButtonLabel = computed(() => (isEditing.value ? 'Save changes' : 'Save'))

const nameMax = 120
const descriptionMax = 1000
// Limited toolbar per request: bold / italic / underline / strike, bullet &
// numbered lists, text alignment, and clear-formatting (for pasted styled text).
const descriptionEditorOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  ['bulletList', 'orderedList', 'align'],
  ['clear'],
]

const name = ref('')
const description = ref('')
// MpRichTextEditor reads `value` only on mount (Tiptap), so bump this key each
// time the drawer (re)opens to force a remount that picks up the loaded value.
const rteKey = ref(0)
const goalType = ref('')

// ─── Align to a goal (entry point inside create & edit) ───────────────────────
// Opens the same GoalAlignDrawer used from the goal lists, so the align
// experience is identical everywhere. We feed it a synthetic "goal" built from
// the current form state + all goals in the cycle as candidates.
const { goals: allGoalsForAlign } = useGoalsStore()
const alignTo = ref('')
const alignToKrId = ref('')
const alignDrawerOpen = ref(false)
const alignCandidates = computed(() => (props.cycleId ? allGoalsForAlign.value.filter(g => g.cycleId === props.cycleId) : []))
const alignedLabel = computed(() => {
  const p = allGoalsForAlign.value.find(g => g.id === alignTo.value)
  return p ? `${p.code} · ${p.title}` : ''
})
// A Goal-shaped stand-in so GoalAlignDrawer can resolve allowed parent levels
// + member gating from the in-progress form (no real goal exists yet on create).
const alignSyntheticGoal = computed<any>(() => ({
  id: props.editingDraft?.id ?? 'new-goal',
  ownerId: props.owners[0]?.id ?? '',
  level: goalType.value || 'individual',
  cycleId: props.cycleId ?? '',
  title: name.value,
  viewerIds: [],
  alignedToId: alignTo.value || undefined,
  alignedToKrId: alignToKrId.value || undefined,
}))
function openAlignDrawer() { alignDrawerOpen.value = true }
function onFormAligned(parentId: string, krId?: string) {
  alignTo.value = parentId
  alignToKrId.value = krId ?? ''
  alignDrawerOpen.value = false
}
function clearAlign() { alignTo.value = ''; alignToKrId.value = '' }
// Changing the goal type invalidates a parent chosen under the old level.
watch(goalType, () => { if (alignTo.value && !alignCandidates.value.some(g => g.id === alignTo.value)) clearAlign() })
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
// Owners can update their own goal's progress by default; turning this off
// hands that job to the goal contributors alone. Per-owner, same pattern as
// contributorsByOwner — one owner's toggle doesn't affect another's.
const ownerCanUpdateProgressByOwner = reactive<Record<string, boolean>>({})
const ownerCanUpdateProgressHint = "When off, only contributors from the option selected below can update this goal's progress."
const ownerCanUpdateProgressActivateHint = "When activated, goal owner can also update this goal's progress."
// Only Team & Organization goals have members (prod parity: isNeedMember =
// team/org). Company & Individual goals have NO member field — their
// contributors are picked from ALL employees instead of from members.
const isNeedMember = computed(() => goalType.value === 'team' || goalType.value === 'organization')
const contributorPool = computed(() => (isNeedMember.value ? viewerIds.value : EMPLOYEES.map(e => e.id)))
const contributorPoolWord = computed(() => (isNeedMember.value ? 'members' : 'employees'))
const keyResults = ref<DraftKeyResult[]>([])

const krDrawerOpen = ref(false)
const editingKr = ref<DraftKeyResult | null>(null)
// KRs that were already saved on the goal being edited. Prod parity: removing
// one of these needs a confirm modal; a brand-new KR (create mode, or added
// this session) is removed immediately without confirmation.
const savedKrIds = ref<Set<string>>(new Set())
const krToDelete = ref<DraftKeyResult | null>(null)
const isKrDeleteOpen = ref(false)

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

// True while resetForm() is populating fields — lets the measurementUnit
// watcher skip its interactive-only defaults so loaded/edit values aren't
// clobbered (the watcher flushes after resetForm's synchronous pass).
let hydrating = false
function resetForm() {
  hydrating = true
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
    for (const key of Object.keys(ownerCanUpdateProgressByOwner)) delete ownerCanUpdateProgressByOwner[key]
    for (const owner of props.owners) ownerCanUpdateProgressByOwner[owner.id] = d.ownerCanUpdateProgressByOwner[owner.id] ?? true
    keyResults.value = d.keyResults.map(kr => ({ ...kr }))
    savedKrIds.value = new Set(d.keyResults.map(kr => kr.id))
    alignTo.value = d.alignedToId ?? ''
    alignToKrId.value = d.alignedToKrId ?? ''
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
    // Percentage (the default unit) starts at 0 and targets 100%.
    startValue.value = 0
    targetValue.value = 100
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
    for (const key of Object.keys(ownerCanUpdateProgressByOwner)) delete ownerCanUpdateProgressByOwner[key]
    for (const owner of props.owners) ownerCanUpdateProgressByOwner[owner.id] = true
    keyResults.value = []
    savedKrIds.value = new Set()
    alignTo.value = ''
    alignToKrId.value = ''
  }
  alignDrawerOpen.value = false
  rteKey.value++ // remount the rich-text editor so it shows the loaded description
  deadlineRuleErrors.value = []
  viewerDrawerOpen.value = false
  contribDrawerOpen.value = false
  krDrawerOpen.value = false
  editingKr.value = null
  krToDelete.value = null
  isKrDeleteOpen.value = false
  isLeaveOpen.value = false
  nextTick(() => {
    hydrating = false
    initialSnapshot.value = snapshot()
  })
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
// Past 5 owners this hint list gets long — cap it and let a "View N more"
// link (reset per goal/owner-set change below) expand the rest in place.
const WEIGHT_HINT_CAP = 5
const weightHintExpanded = ref(false)
watch(remainingWeightByOwner, () => { weightHintExpanded.value = false })
const visibleRemainingWeightByOwner = computed(() => {
  if (!remainingWeightByOwner.value) return null
  return weightHintExpanded.value ? remainingWeightByOwner.value : remainingWeightByOwner.value.slice(0, WEIGHT_HINT_CAP)
})
const hiddenRemainingWeightCount = computed(() => Math.max(0, (remainingWeightByOwner.value?.length ?? 0) - WEIGHT_HINT_CAP))

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
// Prod parity: a goal that already has achievement can't change its measurement
// unit or direction on edit (the scale it's been measured against is fixed).
const lockMeasurement = computed(() => isEditing.value && !!props.editingDraft?.hasProgress)

// Deadline achievement is a date, not a baseline/target scale — switching
// to it clears fields that only make sense for the other units (and vice
// versa) so stale values from a previous unit never get silently saved.
// Deadline goals also can't repeat (there's no "period length" to cascade).
watch(measurementUnit, (unit) => {
  if (hydrating) return // loading/reset sets these explicitly — don't override
  if (unit === 'deadline') {
    startValue.value = ''
    targetValue.value = ''
    useBaseline.value = true
    direction.value = 'higher'
    repeat.value = false
    return
  }
  deadlineDate.value = null
  deadlineRulesEnabled.value = false
  deadlineRules.value = []
  // Percentage defaults to 0 → 100%; other scales start blank for the user.
  startValue.value = unit === 'percentage' ? 0 : ''
  targetValue.value = unit === 'percentage' ? 100 : ''
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

// MpAvatarGroup's `max` doesn't cap a v-for'd slot in this build — it renders
// every avatar unbounded and never shows the excess bubble (confirmed live
// with 26 owners). Hand-roll the same 5-avatar cap used elsewhere
// (goal-cycles/[id]/new.vue) instead of trusting the component's own prop.
// Unlike new.vue's page-level bar, this compact drawer field has no room for
// a "+N" counter avatar — the overflow is folded into the "N more" text
// instead (see the template), which opens allOwnersModalOpen.
const OWNER_AVATAR_CAP = 5
const visibleOwners = computed(() => props.owners.slice(0, OWNER_AVATAR_CAP))
const allOwnersModalOpen = ref(false)

const viewerDrawerOpen = ref(false)

function removeViewer(employeeId: string) {
  viewerIds.value = viewerIds.value.filter(id => id !== employeeId)
}

// Company & Individual goals draw contributors from ALL employees — far too
// many to list inline — so "Selected employees" opens the same employee-picker
// drawer as Goal members, scoped to one owner at a time. Team & Organization
// goals keep the inline checklist: their pool is just the handful of goal
// members, so a drawer would be overkill there.
const contribDrawerOpen = ref(false)
const contribDrawerOwnerId = ref('')
function openContribDrawer(ownerId: string) {
  contribDrawerOwnerId.value = ownerId
  contribDrawerOpen.value = true
}
function setContributorIds(ownerId: string, ids: string[]) {
  contributorsByOwner[ownerId] = [...ids]
}

// A contributor can never be someone who isn't also a goal member — picking
// "All members" locks the owner's contributor list to the current member
// list; picking "Selected members" reveals a checklist scoped to members only.
function setContributorMode(ownerId: string, mode: 'all' | 'selected') {
  contributorMode[ownerId] = mode
  if (mode === 'all') contributorsByOwner[ownerId] = [...contributorPool.value]
}
function toggleContributor(ownerId: string, employeeId: string, checked: boolean) {
  const current = contributorsByOwner[ownerId] ?? []
  contributorsByOwner[ownerId] = checked ? [...current, employeeId] : current.filter(id => id !== employeeId)
}
// Keeps the invariant true even if members change after contributors were
// picked: "all"-mode owners stay synced to the current member list, and any
// owner's contributor list gets stripped of anyone no longer a member.
watch(viewerIds, (ids) => {
  // Only meaningful when contributors are scoped to members (team/org). For
  // company/individual the pool is all employees, so members don't gate them.
  if (!isNeedMember.value) return
  for (const owner of props.owners) {
    contributorsByOwner[owner.id] = contributorMode[owner.id] === 'all'
      ? [...ids]
      : (contributorsByOwner[owner.id] ?? []).filter(id => ids.includes(id))
  }
}, { deep: true })

// A restricted-visibility toggle only makes sense for Organization goals —
// clear it if the type changes away so a stale "on" can't silently carry
// over to a different goal type.
watch(goalType, (type) => {
  if (type !== 'organization') restrictedVisibility.value = false
  // Company & Individual goals have no members — drop any carried over from a
  // previous team/org selection so they aren't saved.
  if (type !== 'team' && type !== 'organization') viewerIds.value = []
})

function openAddKr() {
  editingKr.value = null
  krDrawerOpen.value = true
}
function openEditKr(kr: DraftKeyResult) {
  editingKr.value = kr
  krDrawerOpen.value = true
}
function onKrSave(kr: DraftKeyResult) {
  const exists = keyResults.value.some(k => k.id === kr.id)
  keyResults.value = exists
    ? keyResults.value.map(k => (k.id === kr.id ? kr : k))
    : [...keyResults.value, kr]
}
// Prod parity: confirm only when removing a KR that was already saved on an
// existing goal; new KRs delete straight away.
function askRemoveKr(kr: DraftKeyResult) {
  if (isEditing.value && savedKrIds.value.has(kr.id)) {
    krToDelete.value = kr
    isKrDeleteOpen.value = true
  } else {
    doRemoveKr(kr.id)
  }
}
function doRemoveKr(id: string) {
  keyResults.value = keyResults.value.filter(kr => kr.id !== id)
  savedKrIds.value.delete(id)
}
function confirmRemoveKr() {
  if (krToDelete.value) doRemoveKr(krToDelete.value.id)
  isKrDeleteOpen.value = false
  krToDelete.value = null
}

// Unsaved-changes guard: Esc / close button / Cancel route through
// requestClose — if the form differs from its opened state, confirm before
// discarding. (Overlay-click stays disabled entirely.)
const isLeaveOpen = ref(false)
function snapshot() {
  return JSON.stringify({
    name: name.value, description: description.value.replace(/<p>\s*<\/p>/g, '').trim(), goalType: goalType.value,
    category: category.value, subCategory: subCategory.value, weight: weight.value,
    repeat: repeat.value, scheduleEnd: scheduleEnd.value,
    measurementUnit: measurementUnit.value, currency: currency.value,
    startValue: startValue.value, targetValue: targetValue.value, useBaseline: useBaseline.value,
    direction: direction.value, deadlineDate: deadlineDate.value,
    deadlineRulesEnabled: deadlineRulesEnabled.value, deadlineRules: deadlineRules.value,
    viewerIds: viewerIds.value, restrictedVisibility: restrictedVisibility.value,
    ownerCanUpdateProgressByOwner,
    keyResults: keyResults.value, contributorsByOwner, contributorMode,
  })
}
const initialSnapshot = ref('')
function isDirty() { return snapshot() !== initialSnapshot.value }
function doClose() {
  emit('update:isOpen', false)
}
// The "Leave without saving?" alert fires ONLY on Esc, and only when the form
// is dirty. Cancel, the close (×) button, and overlay just close directly.
function requestClose() { if (isDirty()) isLeaveOpen.value = true; else doClose() }
function cancelLeave() { isLeaveOpen.value = false }
function discardAndClose() { isLeaveOpen.value = false; doClose() }
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) { e.preventDefault(); requestClose() }
}
onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

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
    ownerCanUpdateProgressByOwner: JSON.parse(JSON.stringify(ownerCanUpdateProgressByOwner)),
    // Whoever this drawer instance is scoped to via `owners` — the full page
    // selection when adding, or just one owner when detach-editing their row.
    ownerIds: props.owners.map(o => o.id),
    alignedToId: alignTo.value || undefined,
    alignedToKrId: alignToKrId.value || undefined,
  }
  emit('save', draft)
  emit('update:isOpen', false)
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const fields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const alignedValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
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
const weightHintMoreLink = css({
  background: 'transparent', border: 'none', padding: '0', marginTop: '1',
  cursor: 'pointer', textAlign: 'left', color: 'text.link', textDecoration: 'underline',
})
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
})

// Hand-rolled cap for the owner avatar stack (see ownerNamesSummary above) —
// imitates MpAvatarGroup's own look: 2px white ring + spacing:-2 overlap.
// -12px overlap via flat marginLeft on every item (Pixel's runtime css() drops
// the `_notFirst` pseudo); container paddingLeft cancels the first item's pull.
const ownerAvatarStack = css({ display: 'flex', alignItems: 'center', paddingLeft: '12px' })
const ownerAvatarStackItem = css({ display: 'flex', marginLeft: '-12px' })
const ownerAvatarRing = css({ display: 'flex', borderRadius: 'full' })
// Hover coachmark for each owner avatar — mirrors the new-goals summary bar.
const ownerHoverCard = css({ display: 'flex', alignItems: 'center', gap: '3', padding: '3' })
const ownerHoverCardName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const ownerHoverCardMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const ownerMoreLink = css({
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.link', fontSize: '14px', lineHeight: '20px', textDecoration: 'underline',
})
const ownerList = css({ display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'auto' })
const ownerListRow = css({ display: 'flex', alignItems: 'center', gap: '3', paddingTop: '4' })
const ownerListRowDivider = css({ paddingBottom: '4', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })
const ownerListName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const ownerListMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })

const addLink = css({
  display: 'inline-flex', alignItems: 'center', gap: '2',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.link', fontSize: '14px', lineHeight: '20px',
})
const personCard = css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default' })
const personRow = css({ display: 'flex', alignItems: 'center', gap: '3' })
// Owner identity (left) + their self-update-progress toggle (right), same row.
const personRowBetween = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3' })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const removeBtn = css({ background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', color: 'icon.secondary', display: 'flex' })

const krRow = css({ display: 'flex', alignItems: 'flex-start', gap: '2', paddingTop: '2', paddingBottom: '2', borderBottom: '1px solid', borderBottomColor: 'border.default' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :id="resolvedDrawerId" :is-open="isOpen" placement="right" size="lg" is-keep-alive :is-close-on-overlay-click="false" :is-close-on-esc="false" @close="doClose">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ drawerTitle }}
          <MpDrawerCloseButton @click="doClose" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <MpBanner v-if="editNeedsApproval" variant="info" is-inline :class="css({ marginBottom: '4' })">
            <MpBannerIcon />
            <MpBannerDescription>These changes will be sent to {{ approverName }} for approval before they take effect.</MpBannerDescription>
          </MpBanner>
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
                  <div v-if="owners.length > 1" id="goal-owner-avatars" :class="ownerAvatarStack">
                    <div v-for="o in visibleOwners" :key="o.id" :class="ownerAvatarStackItem">
                      <MpPopover trigger="hover" use-portal is-keep-alive placement="top">
                        <MpPopoverTrigger>
                          <PxAvatar :id="o.id" :name="o.name" :src="o.photo" size="lg" variant-color="gray" :class="ownerAvatarRing" />
                        </MpPopoverTrigger>
                        <MpPopoverContent>
                          <div :class="ownerHoverCard">
                            <PxAvatar :id="o.id" size="lg" :name="o.name" :src="o.photo" variant-color="gray" />
                            <MpFlex direction="column" gap="0">
                              <span :class="ownerHoverCardName">{{ o.name }}</span>
                              <span :class="ownerHoverCardMeta">{{ employeeMeta(o) }}</span>
                            </MpFlex>
                          </div>
                        </MpPopoverContent>
                      </MpPopover>
                    </div>
                  </div>
                  <PxAvatar v-else-if="owners[0]" :id="owners[0].id" :name="owners[0].name" :src="owners[0].photo" size="sm" variant-color="gray" />
                  <MpText size="label" :class="css({ color: owners.length ? 'text.default' : 'text.secondary' })">
                    <template v-if="owners.length === 0">No owner selected</template>
                    <template v-else-if="owners.length === 1">{{ owners[0].name }} ({{ owners[0].code }})</template>
                    <template v-else-if="owners.length === 2">{{ ownerNamesSummary }}</template>
                    <template v-else>
                      {{ owners[0].name }}, {{ owners[1].name }} and
                      <button type="button" :class="ownerMoreLink" @click="allOwnersModalOpen = true">{{ owners.length - 2 }} more</button>
                    </template>
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
                <MpFormLabel>Description</MpFormLabel>
                <MpRichTextEditor
                  :key="rteKey"
                  id="goal-description-rte"
                  class="goal-desc-rte"
                  :value="description"
                  :maxlength="descriptionMax"
                  has-border
                  placeholder="Describe this goal…"
                  :options="descriptionEditorOptions"
                  @change="(v) => (description = v)"
                />
              </MpFormControl>

              <MpFormControl id="goal-type" :is-invalid="errors.goalType">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal type</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <PxSelectPopover v-model="goalType" :options="GOAL_TYPE_OPTIONS" placeholder="Select goal type" width="100%" />
                <MpFormErrorMessage>Goal type is required.</MpFormErrorMessage>
              </MpFormControl>

              <!-- Align to a goal — opens the same GoalAlignDrawer as the goal lists -->
              <MpFormControl v-if="goalType && goalType !== 'company' && cycleId" id="align-to">
                <MpFormLabel>Align to parent goal</MpFormLabel>
                <MpFlex v-if="alignTo" align="center" gap="3">
                  <span :class="alignedValue">{{ alignedLabel }}</span>
                  <MpTextlink as="button" @click="openAlignDrawer">Change</MpTextlink>
                  <MpTextlink as="button" @click="clearAlign">Remove</MpTextlink>
                </MpFlex>
                <MpButton v-else variant="secondary" @click="openAlignDrawer">Select parent goal</MpButton>
                <MpFormHelpText>Link this goal to a higher-level goal it contributes to. Optional.</MpFormHelpText>
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
                <MpFlex v-if="!errors.weight && visibleRemainingWeightByOwner" direction="column" gap="0" :class="weightHintWrap">
                  <span v-for="o in visibleRemainingWeightByOwner" :key="o.id" :class="[helperText, o.remaining < 0 && warningText]">{{ o.name }}: {{ o.remaining }}% remaining</span>
                  <button v-if="hiddenRemainingWeightCount && !weightHintExpanded" type="button" :class="[helperText, weightHintMoreLink]" @click="weightHintExpanded = true">
                    View {{ hiddenRemainingWeightCount }} more
                  </button>
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
                <MpText v-if="lockMeasurement" size="label-small" :class="[css({ color: 'text.secondary', marginBottom: '1', display: 'block' })]">Can't be changed — this goal already has progress.</MpText>
                <MpFlex direction="column" gap="2">
                  <template v-for="opt in MEASUREMENT_UNIT_OPTIONS" :key="opt.value">
                    <MpRadio
                      name="measurement-unit"
                      :value="opt.value"
                      :is-checked="measurementUnit === opt.value"
                      :is-disabled="lockMeasurement"
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
                  <MpRadio name="goal-direction" value="higher" :is-checked="direction === 'higher'" :is-disabled="lockMeasurement" @update:is-checked="direction = 'higher'">
                    Higher is better
                    <template #description>Achievement increases as the value goes up — e.g. revenue, satisfaction score.</template>
                  </MpRadio>
                  <MpRadio name="goal-direction" value="lower" :is-checked="direction === 'lower'" :is-disabled="lockMeasurement" @update:is-checked="direction = 'lower'">
                    Lower is better
                    <template #description>Achievement increases as the value goes down — e.g. cost, defect rate, response time.</template>
                  </MpRadio>
                </MpFlex>
              </MpFormControl>
            </div>

            <!-- Goal members (moved before Goal contributor — a contributor
                 can only ever be picked from a goal's own members below).
                 Company & Individual goals have no members, so this whole
                 section is hidden for them. -->
            <div v-if="isNeedMember" :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal members <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">People who can view this goal and align their goals to it.</span>
              </div>
              <MpFlex v-for="id in viewerIds" :key="id" :class="personRow">
                <PxAvatar :id="id" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" size="lg" variant-color="gray" />
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

            <!-- Goal contributor — only appears once a goal type is chosen
                 (the contributor pool depends on it: members for Team/Org,
                 all employees for Company/Individual). -->
            <div v-if="goalType" :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal contributor <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">People who can update this goal's progress — chosen from the goal's {{ contributorPoolWord }}.</span>
              </div>

              <MpText v-if="isNeedMember && viewerIds.length === 0" size="label" :class="helperText">Add goal members first to choose contributors from them.</MpText>

              <!-- Single owner: same card + inline toggle as the multi-owner case below -->
              <template v-else-if="owners.length === 1">
                <div :class="personCard">
                  <div :class="personRowBetween">
                    <div :class="personRow">
                      <PxAvatar :id="owners[0].id" :name="owners[0].name" :src="owners[0].photo" size="lg" variant-color="gray" />
                      <MpFlex direction="column" gap="0">
                        <span :class="personName">{{ owners[0].name }}</span>
                        <span :class="personMeta">{{ employeeMeta(owners[0]) }}</span>
                      </MpFlex>
                    </div>
                    <!-- Contributors are the ones updating progress; this decides
                         whether the goal owner keeps that ability for their own
                         copy of the goal. -->
                    <MpTooltip :label="(ownerCanUpdateProgressByOwner[owners[0].id] ?? true) ? ownerCanUpdateProgressHint : ownerCanUpdateProgressActivateHint" :show-delay="0" use-portal>
                      <MpFlex as="span" align="center" gap="2">
                        <span>Allow self-update of goal progress</span>
                        <MpToggle
                          id="owner-can-update-progress"
                          :is-checked="ownerCanUpdateProgressByOwner[owners[0].id] ?? true"
                          @update:is-checked="(checked) => (ownerCanUpdateProgressByOwner[owners[0].id] = checked)"
                        />
                      </MpFlex>
                    </MpTooltip>
                  </div>

                  <MpFlex direction="column" gap="2">
                    <MpRadio name="contrib-mode-single" :is-checked="contributorMode[owners[0].id] === 'all'" @update:is-checked="setContributorMode(owners[0].id, 'all')">All {{ contributorPoolWord }}</MpRadio>
                    <MpRadio name="contrib-mode-single" :is-checked="contributorMode[owners[0].id] === 'selected'" @update:is-checked="setContributorMode(owners[0].id, 'selected')">Selected {{ contributorPoolWord }}</MpRadio>
                  </MpFlex>
                  <div v-if="contributorMode[owners[0].id] === 'selected'" :class="radioIndent">
                    <!-- Team/Org: inline checklist scoped to the (small) member pool -->
                    <template v-if="isNeedMember">
                      <MpCheckbox
                        v-for="id in contributorPool"
                        :key="id"
                        :id="`contributor-${owners[0].id}-${id}`"
                        :is-checked="(contributorsByOwner[owners[0].id] ?? []).includes(id)"
                        @update:is-checked="(checked) => toggleContributor(owners[0].id, id, checked)"
                      >
                        {{ employeeById(id)?.name }}
                      </MpCheckbox>
                    </template>
                    <!-- Company/Individual: pool is ALL employees — pick via drawer -->
                    <template v-else>
                      <MpFlex v-for="id in (contributorsByOwner[owners[0].id] ?? [])" :key="id" :class="personRow">
                        <PxAvatar :id="id" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" size="lg" variant-color="gray" />
                        <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                          <span :class="personName">{{ employeeById(id)?.name }}</span>
                          <span :class="personMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                        </MpFlex>
                        <button type="button" :class="removeBtn" aria-label="Remove contributor" @click="toggleContributor(owners[0].id, id, false)">
                          <MpIcon name="minus-circular" size="sm" />
                        </button>
                      </MpFlex>
                      <button type="button" :class="addLink" @click="openContribDrawer(owners[0].id)">
                        <MpIcon name="add" size="sm" />
                        Select employees
                      </button>
                    </template>
                  </div>
                </div>
              </template>

              <!-- Multiple owners: one card per owner, mode picked per owner -->
              <template v-else>
                <div v-for="owner in owners" :key="owner.id" :class="personCard">
                  <div :class="personRowBetween">
                    <div :class="personRow">
                      <PxAvatar :id="owner.id" :name="owner.name" :src="owner.photo" size="lg" variant-color="gray" />
                      <MpFlex direction="column" gap="0">
                        <span :class="personName">{{ owner.name }}</span>
                        <span :class="personMeta">{{ employeeMeta(owner) }}</span>
                      </MpFlex>
                    </div>
                    <!-- Contributors are the ones updating progress; this decides
                         whether THIS owner keeps that ability for their own copy
                         of the goal — independent per owner, e.g. on for one and
                         off for another. -->
                    <MpTooltip :label="(ownerCanUpdateProgressByOwner[owner.id] ?? true) ? ownerCanUpdateProgressHint : ownerCanUpdateProgressActivateHint" :show-delay="0" use-portal>
                      <MpFlex as="span" align="center" gap="2">
                        <span>Allow self-update of goal progress</span>
                        <MpToggle
                          :id="`owner-can-update-progress-${owner.id}`"
                          :is-checked="ownerCanUpdateProgressByOwner[owner.id] ?? true"
                          @update:is-checked="(checked) => (ownerCanUpdateProgressByOwner[owner.id] = checked)"
                        />
                      </MpFlex>
                    </MpTooltip>
                  </div>

                  <MpFlex direction="column" gap="2">
                    <MpRadio :name="`contrib-mode-${owner.id}`" :is-checked="contributorMode[owner.id] === 'all'" @update:is-checked="setContributorMode(owner.id, 'all')">All {{ contributorPoolWord }}</MpRadio>
                    <MpRadio :name="`contrib-mode-${owner.id}`" :is-checked="contributorMode[owner.id] === 'selected'" @update:is-checked="setContributorMode(owner.id, 'selected')">Selected {{ contributorPoolWord }}</MpRadio>
                  </MpFlex>
                  <div v-if="contributorMode[owner.id] === 'selected'" :class="radioIndent">
                    <!-- Team/Org: inline checklist scoped to the (small) member pool -->
                    <template v-if="isNeedMember">
                      <MpCheckbox
                        v-for="id in contributorPool"
                        :key="id"
                        :id="`contributor-${owner.id}-${id}`"
                        :is-checked="(contributorsByOwner[owner.id] ?? []).includes(id)"
                        @update:is-checked="(checked) => toggleContributor(owner.id, id, checked)"
                      >
                        {{ employeeById(id)?.name }}
                      </MpCheckbox>
                    </template>
                    <!-- Company/Individual: pool is ALL employees — pick via drawer -->
                    <template v-else>
                      <MpFlex v-for="id in (contributorsByOwner[owner.id] ?? [])" :key="id" :class="personRow">
                        <PxAvatar :id="id" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" size="lg" variant-color="gray" />
                        <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                          <span :class="personName">{{ employeeById(id)?.name }}</span>
                          <span :class="personMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                        </MpFlex>
                        <button type="button" :class="removeBtn" aria-label="Remove contributor" @click="toggleContributor(owner.id, id, false)">
                          <MpIcon name="minus-circular" size="sm" />
                        </button>
                      </MpFlex>
                      <button type="button" :class="addLink" @click="openContribDrawer(owner.id)">
                        <MpIcon name="add" size="sm" />
                        Select employees
                      </button>
                    </template>
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
              <!-- Rows carry their own top/bottom padding + divider, so no gap
                   between them — wrap in a plain block to opt out of the
                   section's flex gap. -->
              <div v-if="keyResults.length">
                <div v-for="kr in keyResults" :key="kr.id" :class="krRow">
                  <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                    <span :class="personName">{{ kr.title }}</span>
                    <span v-if="kr.target" :class="personMeta">{{ kr.target }}</span>
                  </MpFlex>
                  <MpFlex align="center" gap="0" :class="css({ flexShrink: '0' })">
                    <MpPopover is-close-on-select use-portal placement="bottom-end">
                      <MpPopoverTrigger>
                        <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Key result actions" />
                      </MpPopoverTrigger>
                      <MpPopoverContent :class="css({ minWidth: '160px' })">
                        <MpPopoverList>
                          <MpPopoverListItem @click="openEditKr(kr)">Edit key result</MpPopoverListItem>
                          <MpPopoverListItem @click="askRemoveKr(kr)">
                            <span :class="css({ color: 'text.danger' })">Delete key result</span>
                          </MpPopoverListItem>
                        </MpPopoverList>
                      </MpPopoverContent>
                    </MpPopover>
                  </MpFlex>
                </div>
              </div>
              <button type="button" :class="addLink" @click="openAddKr">
                <MpIcon name="add" size="sm" />
                Add key result
              </button>
            </div>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="doClose">Cancel</MpButton>
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

  <!-- Contributor picker (Company / Individual goals) — scoped to one owner -->
  <SelectEmployeesDrawer
    drawer-id="drawer-select-contributors"
    :is-open="contribDrawerOpen"
    title="Select goal contributors"
    description="People who can update this goal's progress."
    :initial-selected="contributorsByOwner[contribDrawerOwnerId] ?? []"
    :exclude-ids="[contribDrawerOwnerId]"
    :is-required="false"
    @update:is-open="contribDrawerOpen = $event"
    @continue="(ids) => setContributorIds(contribDrawerOwnerId, ids)"
  />

  <!-- Every goal owner — opened from the "N more" link in the Goal owner field -->
  <ClientOnly>
    <MpModal :is-open="allOwnersModalOpen" class="drawer-owner-list-modal" @close="allOwnersModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Goal owners ({{ owners.length }})
          <MpModalCloseButton @click="allOwnersModalOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <div :class="ownerList">
            <div v-for="(o, idx) in owners" :key="o.id" :class="[ownerListRow, idx < owners.length - 1 && ownerListRowDivider]">
              <PxAvatar :id="o.id" size="lg" :name="o.name" :src="o.photo" variant-color="gray" />
              <MpFlex direction="column" gap="0">
                <span :class="ownerListName">{{ o.name }}</span>
                <span :class="ownerListMeta">{{ employeeMeta(o) }}</span>
              </MpFlex>
            </div>
          </div>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Add / edit key result — sub-drawer opened on top of this drawer -->
  <AddKeyResultDrawer v-model:is-open="krDrawerOpen" :editing="editingKr" @save="onKrSave" />

  <!-- Delete key result confirmation (only for already-saved KRs on edit) -->
  <ClientOnly>
    <MpModal :is-open="isKrDeleteOpen" size="sm" @close="isKrDeleteOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Delete this key result?
          <MpModalCloseButton @click="isKrDeleteOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="css({ color: 'text.default' })">Deleting “{{ krToDelete?.title }}” removes it from this goal and affects the goal’s progress. This takes effect once you save the goal.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isKrDeleteOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmRemoveKr">Delete</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Unsaved-changes confirmation -->
  <ClientOnly>
    <MpModal :is-open="isLeaveOpen" @close="cancelLeave">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Leave without saving?
          <MpModalCloseButton @click="cancelLeave" />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="css({ color: 'text.default' })">The details you've entered haven't been saved and will be lost if you leave.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="cancelLeave">Cancel</MpButton>
            <MpButton variant="primary" @click="discardAndClose">Discard</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Align to a goal — same drawer used from the goal lists -->
  <GoalAlignDrawer
    :is-open="alignDrawerOpen"
    :goal="alignSyntheticGoal"
    :candidates="alignCandidates"
    @close="alignDrawerOpen = false"
    @aligned="onFormAligned"
  />
</template>

<style scoped>
/* Give the description editor room for ~10 lines instead of collapsing to one.
   MpRichTextEditor has no height prop, so grow its Tiptap editable area. */
.goal-desc-rte :deep(.ProseMirror),
.goal-desc-rte :deep([contenteditable='true']) {
  min-height: 240px;
}

/* The toolbar's button rows default to align-items: stretch, leaving the icons
   vertically off-centre. Match the toolbar defensively (its class prefix varies
   across Pixel builds) and force middle alignment. Unlayered scoped rules with
   !important beat Panda's atomic utilities regardless of @layer order. */
.goal-desc-rte :deep([class*='toolbar']) {
  align-items: center !important;
}
.goal-desc-rte :deep([class*='toolbar'] > div),
.goal-desc-rte :deep([class*='toolbar'] [class*='ai_']) {
  align-items: center !important;
}
.goal-desc-rte :deep([class*='toolbar'] button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* Date picker clear (×) must sit on the RIGHT (before the calendar icon), not the left. */
:deep(.mp-datepicker__root .mp-input__clear) {
  left: auto !important;
  right: 36px !important;
  inset-inline-start: auto !important;
  inset-inline-end: 36px !important;
}

/* MpModal's own root (where the `class` we pass lands) never gets this
   file's scope id — its manual mergeProps()/Teleport render skips Vue's
   usual scope-id injection — so a plain scoped selector never matches at
   runtime. Wrap the whole selector in :global() instead. Every MpModal in
   this app aligns top-center at 80px (see docs/patterns/modal.md). */
:global(.drawer-owner-list-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
