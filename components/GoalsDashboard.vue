<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Dashboard › Goals tab
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2639:44801)
  Token mode: Pixel 2.4

  Renders inside the page stage of pages/dashboard.vue (which owns the tab bar
  and the header-action buttons). Sections, top to bottom: filter bar → cycle
  date/status row → summary cards → Needs update → Goals distribution →
  Awaiting approval.

  TWO MODES, one code path — driven by the `goals-new-interface` cookie that
  Goal settings toggles (see pages/goals/goal-settings.vue, AppSidebar.vue):
    - New UI → filter is a goal-cycle picker; scope = that one cycle; the
      status line counts down that cycle's remaining days.
    - Old UI → the old Goals experience has no cycle concept, so the filter is
      a DATE RANGE and the scope is every cycle overlapping it. Cycle names are
      never surfaced; the status line shows the chosen period instead.
  Data for both comes from the same cycle-based stores via useGoalsDashboard.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpFlex, MpText, MpButton, MpIcon, toast, css } from '@mekari/pixel3'
import { customRangeValue, type PeriodValue } from '~/utils/periodPicker'
import type { GoalStatus } from '~/composables/useGoalsStore'
import { DISTRIBUTION_PERCENT, isDemoSubmission } from '~/composables/useGoalsDashboardScenario'
import { approvalEmployeeRows, approvalGoalRows, type ApprovalRow } from '~/composables/useGoalsDashboard'
import { employeeById } from '~/utils/employees'

const props = defineProps<{ isNewInterface: boolean }>()

const router = useRouter()
const { cycles } = useGoalCyclesStore()
// Every submission, unscoped — openSubmission only needs to resolve an id back
// to its cycle, and the row it came from was already scope-filtered.
const { submissions: allSubmissions } = useGoalApprovalsStore()

// ─── Dev scenario (NOT product) ──────────────────────────────────────────────
// Everything that reads `scenario` exists so a demo can reach every layout
// variant without seed edits — see useGoalsDashboardScenario.ts. Declared up
// here because the status line below already depends on it.
const scenario = useGoalsDashboardScenario()

// "Needs update" is a final-week section; the constant is shared by the real
// visibility rule and by the scenario's countdown override.
const NEEDS_UPDATE_WINDOW_DAYS = 7

// ─── Clock ───────────────────────────────────────────────────────────────────
// `now` drives the date heading, the days-left countdown and every "N months
// ago" staleness label, so a refresh genuinely re-derives the page.
const now = ref(new Date())
const lastRefreshedAt = ref(new Date())
let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => { ticker = setInterval(() => { now.value = new Date() }, 60_000) })
onUnmounted(() => { if (ticker) clearInterval(ticker) })

const lastUpdatedLabel = computed(() => {
  const mins = Math.floor((now.value.getTime() - lastRefreshedAt.value.getTime()) / 60_000)
  if (mins < 1) return 'just now'
  return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`
})
function refresh() {
  now.value = new Date()
  lastRefreshedAt.value = new Date()
  toast.notify({ id: 'goals-dash-refresh', position: 'top-center', variant: 'success', title: 'Dashboard refreshed' })
}

// ─── Filter (mode-dependent) ─────────────────────────────────────────────────
// Selections only take effect on Apply filter, matching the Performance review
// tab and prod.
const cycleOptions = computed(() => cycles.value.map(c => ({ value: c.id, label: c.name })))
const defaultCycleId = computed(() =>
  cycles.value.find(c => c.status === 'Active')?.id ?? cycles.value[0]?.id ?? '',
)
const selectedCycleId = ref('')
const appliedCycleId = ref('')

const selectedRange = ref<PeriodValue | null>(null)
const appliedRange = ref<PeriodValue | null>(null)

// Seed both modes off the active cycle so the page is never blank on arrival,
// and so switching interface keeps the user looking at the same period.
watchEffect(() => {
  if (!selectedCycleId.value && defaultCycleId.value) {
    selectedCycleId.value = defaultCycleId.value
    appliedCycleId.value = defaultCycleId.value
  }
  if (!selectedRange.value) {
    const active = cycles.value.find(c => c.id === defaultCycleId.value)
    if (active) {
      // customRangeValue formats the label the same way every other date range
      // in the app reads ("1 Jul - 31 Dec 2026"), instead of raw ISO.
      const seeded = customRangeValue(new Date(active.startDate), new Date(active.endDate))
      selectedRange.value = seeded
      appliedRange.value = seeded
    }
  }
})

function applyFilter() {
  appliedCycleId.value = selectedCycleId.value
  appliedRange.value = selectedRange.value
  toast.notify({ id: 'goals-dash-apply-filter', position: 'top-center', variant: 'success', title: 'Filter applied' })
}

// New UI → the one picked cycle. Old UI → every cycle overlapping the range
// (the cycle is still the storage unit; only its name is detached from the UI).
const scopeCycleIds = computed(() => {
  if (props.isNewInterface) return appliedCycleId.value ? [appliedCycleId.value] : []
  const range = appliedRange.value
  if (!range) return []
  return cycles.value
    .filter(c => c.startDate <= range.endDate && c.endDate >= range.startDate)
    .map(c => c.id)
})

const appliedCycle = computed(() => cycles.value.find(c => c.id === appliedCycleId.value))

// ─── Status line ─────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const todayLabel = computed(() => {
  const d = now.value
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
})
function formatIso(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// New UI counts down the cycle. Old UI has no cycle to count down, so it states
// the period being looked at instead.
const statusCaption = computed(() => {
  if (!props.isNewInterface) {
    const range = appliedRange.value
    return range ? `Showing goals from ${formatIso(range.startDate)} to ${formatIso(range.endDate)}` : 'Select a date range to see goals'
  }
  const cycle = appliedCycle.value
  if (!cycle) return ''
  // Dev scenario: "Needs update" is a final-week-only section, so forcing it on
  // must move the countdown into that window too — otherwise the page claims
  // 137 days remain while showing a section that only exists in the last 7.
  if (scenario.needsUpdate.value) {
    return `${NEEDS_UPDATE_WINDOW_DAYS} days left in this goal cycle`
  }
  const daysLeft = Math.ceil((new Date(cycle.endDate).getTime() - now.value.getTime()) / 86_400_000)
  if (daysLeft < 0) return 'This goal cycle has ended'
  if (daysLeft === 0) return 'Last day of this goal cycle'
  return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in this goal cycle`
})

// ─── Data ────────────────────────────────────────────────────────────────────
const {
  onTrack, offTrack, notStarted,
  needsUpdate,
  assignedEmployees, unassignedEmployees, assignedEmployeePct,
  alignedGoalCount, notAlignedGoalCount, alignedGoalPct,
  creationSubmissions, progressSubmissions, editSubmissions,
} = useGoalsDashboard(scopeCycleIds, now)

// ─── Needs update visibility ─────────────────────────────────────────────────
// Chasing stale goals is only useful at the END of a cycle, so the section
// appears solely in the final week — and only when something is actually stale.
// Outside that window the section is absent entirely (no empty state): a
// permanent "all up to date" panel is noise for most of the cycle.
const periodEndDate = computed(() => {
  // New UI counts down the selected cycle; old UI has no cycle, so the applied
  // range's end date is the equivalent "last day".
  if (props.isNewInterface) return appliedCycle.value?.endDate
  return appliedRange.value?.endDate
})
const isFinalWeek = computed(() => {
  const end = periodEndDate.value
  if (!end) return false
  const daysLeft = Math.ceil((new Date(end).getTime() - now.value.getTime()) / 86_400_000)
  return daysLeft <= NEEDS_UPDATE_WINDOW_DAYS
})
// Product rule: final week AND something stale. The scenario toggle overrides
// it outright so the section can be shown/hidden on demand during a demo.
const showNeedsUpdate = computed(() =>
  scenario.needsUpdate.value
    ? needsUpdate.value.length > 0
    : false,
)
// Kept so the real rule stays visible in code even while the scenario drives
// the UI — restore this as `showNeedsUpdate` when the control is removed.
const _productShowNeedsUpdate = computed(() => isFinalWeek.value && needsUpdate.value.length > 0)

// ─── Distribution drill-downs ────────────────────────────────────────────────
const isUnassignedDrawerOpen = ref(false)

function onAssignedSegment(segment: 'filled' | 'remainder') {
  // Grey = employees with no goal → open the list so they can be chased.
  // Deferred to nextTick so the click that opened the drawer isn't still
  // propagating when the drawer mounts — otherwise its outside-click handler
  // sees that same click and closes it instantly (same guard as the Manage
  // button in CycleGeneralForm.vue; see docs/patterns/page-form.md).
  if (segment === 'remainder') {
    nextTick(() => { isUnassignedDrawerOpen.value = true })
    return
  }
  // Green = employees who do have goals → the goals index.
  goToGoalsIndex()
}
// Both arcs answer "how does this goal relate to a parent?", which is what the
// hierarchy view shows — so either side lands on the same tab.
function onAlignedSegment() { goToGoalHierarchy() }

// ─── Awaiting approval visibility ────────────────────────────────────────────
// The section is absent when nothing is outstanding; each card is absent when
// its own bucket is empty. Every card spans the full width — two of the three
// list per GOAL, which needs room for a goal title AND its owner, so the old
// two-up grid squeezed them (see docs/patterns/dashboard-section.md).
// Each card is gated by its scenario toggle. When a toggle is on but the scope
// holds no real request of that type, demo rows stand in — otherwise the
// progress-update card could never be shown at all (no seeded submission
// produces one).
const scenarioCycleId = computed(() => scopeCycleIds.value[0] ?? 'seed-26-h1')
const creationSource = computed(() => {
  if (!scenario.goalCreation.value) return []
  return creationSubmissions.value.length
    ? creationSubmissions.value
    : scenario.demoSubmissions('create', scenarioCycleId.value, 6)
})
const progressSource = computed(() => {
  if (!scenario.progressUpdate.value) return []
  return progressSubmissions.value.length
    ? progressSubmissions.value
    : scenario.demoSubmissions('progress', scenarioCycleId.value, 4)
})
const editSource = computed(() => {
  if (!scenario.goalEdit.value) return []
  return editSubmissions.value.length
    ? editSubmissions.value
    : scenario.demoSubmissions('edit', scenarioCycleId.value, 5)
})

// Goal creation is per employee (a bundle is decided as one unit, and several
// bundles from one person merge into their single row); the other two are per
// goal. Both shapes normalise to ApprovalRow in useGoalsDashboard.
const creationRows = computed(() => approvalEmployeeRows(creationSource.value))
const progressRows = computed(() => approvalGoalRows(progressSource.value))
const editRows = computed(() => approvalGoalRows(editSource.value))

const showAwaitingApproval = computed(() =>
  creationRows.value.length > 0 || progressRows.value.length > 0 || editRows.value.length > 0,
)

// ─── Distribution overrides ──────────────────────────────────────────────────
const assignedPct = computed(() => (
  scenario.distribution.value === 'default'
    ? assignedEmployeePct.value
    : DISTRIBUTION_PERCENT[scenario.distribution.value]
))
const alignedPct = computed(() => (
  scenario.distribution.value === 'default'
    ? alignedGoalPct.value
    : DISTRIBUTION_PERCENT[scenario.distribution.value]
))

// ─── Navigation ──────────────────────────────────────────────────────────────
// The goals index. Old UI has no cycle detail page — it lists goals by level.
// `status` (optional) pre-applies that status filter on arrival.
function goToGoalsIndex(status?: string) {
  if (!props.isNewInterface) return router.push('/goals/individual-goals')
  const cycle = appliedCycle.value
  if (!cycle) return
  router.push({
    path: `/goals/goal-cycles/${cycle.id}`,
    query: { name: cycle.name, ...(status ? { status } : {}) },
  })
}
// Goal hierarchy now lives in the Goals sidebar submenu (global, not
// cycle-scoped) rather than as a tab on the cycle detail page.
function goToGoalHierarchy() { router.push('/goals/goal-hierarchy') }
// Each summary card opens the goals index already filtered to its own status.
// Keys match STATUS_FILTER_TO_GOAL_STATUS on the goal-cycle detail page.
const STATUS_TO_FILTER_KEY: Record<GoalStatus, string> = {
  green: 'ontrack',
  orange: 'atrisk',
  gray: 'notstarted',
}
function openStatus(status: GoalStatus) { goToGoalsIndex(STATUS_TO_FILTER_KEY[status]) }
// A row carries submissionIds, not one Submission — an employee row can merge
// several batches. One batch → open its review page. Several → there is no
// single page to open, so hand off to the cycle's own Awaiting approval tab
// with that employee and type pre-filtered, which lists each batch separately
// (the drill-down rule in docs/patterns/dashboard-section.md).
function openApprovalRow(row: ApprovalRow) {
  if (row.submissionIds.length > 1) return goToApprovalQueue(row.ownerId)
  openSubmission(row.submissionIds[0])
}

function goToApprovalQueue(ownerId: string) {
  const cycle = appliedCycle.value
  if (!cycle) return
  router.push({
    path: `/goals/goal-cycles/${cycle.id}`,
    // `q` and `type` are read by GoalApprovalQueue; `tab` by the cycle page.
    query: { name: cycle.name, tab: 'awaiting', q: employeeById(ownerId)?.name ?? '', type: 'Goal creation' },
  })
}

function openSubmission(submissionId: string) {
  // A scenario-invented row has no review page behind it.
  if (isDemoSubmission({ id: submissionId })) {
    toast.notify({ id: 'goals-dash-demo-submission', position: 'top-center', variant: 'error', title: 'Demo row — no request to open' })
    return
  }
  const submission = allSubmissions.value.find(s => s.id === submissionId)
  if (!submission) return
  const cycle = cycles.value.find(c => c.id === submission.cycleId)
  router.push({
    path: `/goals/goal-cycles/${submission.cycleId}/awaiting-approval/${submission.id}`,
    query: { cycleName: cycle?.name },
  })
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const stack = css({ display: 'flex', flexDirection: 'column', gap: '6' })
const filterRow = css({ display: 'flex', alignItems: 'center', gap: '3', flexWrap: 'wrap' })
const statusRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4', flexWrap: 'wrap' })
const statusHeading = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const statusSub = css({ fontSize: '12px', lineHeight: '16px', color: 'text.danger' })
const refreshRow = css({ display: 'flex', alignItems: 'center', gap: '3' })
const captionText = css({ color: 'text.secondary' })
const refreshBtn = css({
  display: 'inline-flex', alignItems: 'center', gap: '1',
  border: 'none', background: 'transparent', cursor: 'pointer',
  fontSize: '14px', lineHeight: '20px', color: 'text.link',
  _hover: { textDecoration: 'underline' },
})
const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
// minmax(0, 1fr), not 1fr: a bare `1fr` is minmax(auto, 1fr), so a wide table
// inside one card pushes its column past half and the pair renders lopsided.
const pairGrid = css({ display: 'grid', gridTemplateColumns: { base: 'minmax(0, 1fr)', xl: 'repeat(2, minmax(0, 1fr))' }, gap: '6' })
// Full-width rows, stacked. Used by Awaiting approval, whose tables are too
// wide for half a row, and by a lone card left standing in any pair row.
const singleGrid = css({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '6' })
const sectionBlock = css({ display: 'flex', flexDirection: 'column', gap: '4' })
</script>

<template>
  <div :class="stack">
    <!-- Filter bar — cycle picker (new UI) vs date range (old UI) -->
    <div :class="filterRow">
      <PxSelectPopover
        v-if="isNewInterface"
        v-model="selectedCycleId"
        :options="cycleOptions"
        placeholder="Select goal cycle"
        width="280px"
      />
      <PxAdvancedDatePicker
        v-else
        v-model="selectedRange"
        placeholder="Start date - End date"
        width="280px"
      />
      <MpButton variant="secondary" @click="applyFilter">Apply filter</MpButton>
    </div>

    <!-- Date + cycle status, with the refresh affordance on the right -->
    <div :class="statusRow">
      <MpFlex direction="column" gap="0">
        <span :class="statusHeading">{{ todayLabel }}</span>
        <span :class="statusSub">{{ statusCaption }}</span>
      </MpFlex>
      <div :class="refreshRow">
        <MpText size="label" :class="captionText">Last updated: {{ lastUpdatedLabel }}</MpText>
        <button type="button" :class="refreshBtn" @click="refresh">
          <MpIcon name="refresh" size="sm" color="icon.brand" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <GoalsDashSummaryCards
      :on-track="onTrack"
      :off-track="offTrack"
      :not-started="notStarted"
      @open="openStatus"
    />

    <!-- Needs update — final week of the cycle only, and only when stale goals exist -->
    <GoalsDashNeedsUpdate v-if="showNeedsUpdate" :rows="needsUpdate" />

    <!-- Goals distribution -->
    <div :class="sectionBlock">
      <span :class="sectionTitle">Goals distribution</span>
      <div :class="pairGrid">
        <GoalsDashDonutCard
          id="goals-assigned-employees"
          title="Assigned employees"
          description="Active employees with at least one goal set this cycle"
          caption="Employees"
          :percent="assignedPct"
          filled-label="Assigned employees"
          :filled-count="assignedEmployees.length"
          remainder-label="Unassigned employees"
          :remainder-count="unassignedEmployees.length"
          @segment-click="onAssignedSegment"
        />
        <GoalsDashDonutCard
          id="goals-aligned"
          title="Goals aligned"
          description="Goals aligned to an organization's or company's objective or key result"
          caption="Goals"
          :percent="alignedPct"
          filled-label="Aligned goals"
          :filled-count="alignedGoalCount"
          remainder-label="Goals not aligned"
          :remainder-count="notAlignedGoalCount"
          @segment-click="onAlignedSegment"
        />
      </div>
    </div>

    <!-- Awaiting approval — hidden entirely when nothing is outstanding; every
         card spans the full width, stacked (see docs/patterns/dashboard-section.md) -->
    <div v-if="showAwaitingApproval" :class="sectionBlock">
      <span :class="sectionTitle">Awaiting approval</span>
      <div :class="singleGrid">
        <GoalsDashApprovalTable
          v-if="creationRows.length"
          title="Goal creation"
          unit="employee"
          :rows="creationRows"
          @open="openApprovalRow"
        />
        <GoalsDashApprovalTable
          v-if="progressRows.length"
          title="Goal progress update"
          unit="goal"
          :rows="progressRows"
          @open="openApprovalRow"
        />
        <GoalsDashApprovalTable
          v-if="editRows.length"
          title="Goal edit"
          unit="goal"
          :rows="editRows"
          @open="openApprovalRow"
        />
      </div>
    </div>

    <!-- Dev scenario control — floating, bottom-right. Not a product control;
         previews every dashboard layout variant without seed edits. -->
    <GoalsDashScenarioControl />

    <!-- Opened from the grey arc of the Assigned employees donut -->
    <GoalsDashUnassignedDrawer
      v-model:is-open="isUnassignedDrawerOpen"
      :employees="unassignedEmployees"
      :total-employees="assignedEmployees.length + unassignedEmployees.length"
    />
  </div>
</template>
