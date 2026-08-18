<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Dashboard (Performance Review analytics)
  Token mode: Pixel 2.4 · charts via Pixel 3 MpChart

  Replica of talenta-review's reviews/overview/Index.vue (route
  `review_overview`, sidebar "Dashboard", super-admin only). NOT the employee
  "Welcome back" home (that's pages/index.vue).

  Layout: filter bar → summary strip (KPIs + See all cycle) → Cycle overview
  stacked bar → Not submit reviews + Picked co-worker tables. Header actions:
  View insight + Create new cycle (→ purpose modal → review-cycle create).
  The two tables (DashReviewList) carry the full prod feature set: nested
  multi-select filter, search, column sort, header-replacement bulk-select
  (Remind via email / Download selected), pagination, per-row email + count
  modals. DEMO MOCK data (no review-submission analytics in the mini-DB).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpTextlink,
  MpIcon,
  toast,
  css,
} from '@mekari/pixel3'
import type { PeriodValue } from '~/utils/periodPicker'
import type { ReviewRow, FilterDimension } from '~/utils/dashboardTypes'

// NOT boxed: both tabs render inside the layout's single white stage panel,
// which supplies the 24px padding on all sides (layouts/default.vue).
definePageMeta({
  title: 'Dashboard',
  layout: 'default',
})

const router = useRouter()

// ─── Tabs ─────────────────────────────────────────────────────────────────────
// Two dashboards under one page title (which stays "Dashboard" on both).
// Type A tabs — see docs/patterns/tabs.md.
type Tab = 'review' | 'goals'
const activeTab = ref<Tab>('review')

// The Goals tab has two shapes depending on which Goals experience the company
// is on — the same cookie AppSidebar.vue and Goal settings read. It changes the
// filter control and the primary CTA; see components/GoalsDashboard.vue.
const goalsNewInterface = useCookie('goals-new-interface', { default: () => true })

const { cycles: goalCycles } = useGoalCyclesStore()
const activeGoalCycle = computed(() =>
  goalCycles.value.find(c => c.status === 'Active') ?? goalCycles.value[0],
)

function viewGoalsInsight() {
  toast.notify({ id: 'goals-dash-insight', position: 'top-center', variant: 'success', title: 'Opening goals insight…' })
}
// Goal cycles are created from a drawer on the goal-cycles list; goals are
// created on a cycle's "New goals" page. Neither has a standalone create route,
// so the CTA navigates to where that flow actually lives.
function createGoalCycle() { router.push('/goals/goal-cycles') }
function createGoal() {
  const cycle = activeGoalCycle.value
  if (cycle) router.push({ path: `/goals/goal-cycles/${cycle.id}/new`, query: { cycleName: cycle.name } })
  else router.push('/goals/goal-cycles')
}
const { stats, chartByOrg, notSubmitList, pickedList } = useReviewSubmissionsStore()

// ─── Filter bar ───────────────────────────────────────────────────────────────
const dateRange = ref<PeriodValue | null>(null)
const reviewCycle = ref<string[]>([])
const reviewMethod = ref<string[]>([])
const cycleOptions = REVIEW_CYCLES.map(c => ({ value: c.value, label: c.label }))
const methodOptions = REVIEW_METHODS.map(m => ({ value: m.value, label: m.label }))

// The applied filters drive every derived section below (KPIs, chart, tables).
// Selections only take effect on Apply filter, matching prod.
const appliedFilters = ref<{ cycles: string[], methods: string[] }>({ cycles: [], methods: [] })
function applyFilter() {
  appliedFilters.value = { cycles: [...reviewCycle.value], methods: [...reviewMethod.value] }
  toast.notify({ id: 'dash-apply-filter', position: 'top-center', variant: 'success', title: 'Filter applied' })
}

// ─── Header actions ────────────────────────────────────────────────────────────
const isPurposeOpen = ref(false)
function viewInsight() {
  toast.notify({ id: 'dash-insight', position: 'top-center', variant: 'information', title: 'Opening performance insight…' })
}
function createCycle() { isPurposeOpen.value = true }

// ─── Summary strip (DEMO MOCK, matches prod sample) ─────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const today = computed(() => {
  const d = new Date()
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
})
// KPIs, chart and tables all derive from the review-submissions seed, scoped
// by the applied filters.
const summary = computed(() => stats(appliedFilters.value))
const kpis = computed(() => [
  { label: 'Total reviewers', value: String(summary.value.totalReviewers) },
  { label: 'Total review tasks', value: String(summary.value.totalTasks) },
  { label: 'Reviews completed', value: `${summary.value.completedPct}%` },
  { label: 'Not submit reviews', value: `${summary.value.notSubmitPct}%` },
])

const cycleRows = computed(() => chartByOrg(appliedFilters.value))
const notSubmitRows = computed(() => notSubmitList(appliedFilters.value))
const pickedRows = computed(() => pickedList(appliedFilters.value))

function buildDims(rows: ReviewRow[], includeTotal: boolean): FilterDimension[] {
  const uniq = (key: keyof ReviewRow) => [...new Set(rows.map(r => String(r[key])))].sort().map(v => ({ id: v, name: v }))
  const dims: FilterDimension[] = [
    { key: 'org', label: 'Organization', options: uniq('org') },
    { key: 'branch', label: 'Branch', options: uniq('branch') },
    { key: 'jobPosition', label: 'Job Position', options: uniq('jobPosition') },
    { key: 'jobLevel', label: 'Job Level', options: uniq('jobLevel') },
  ]
  if (includeTotal) {
    dims.push({ key: 'count', label: 'Total Employee', options: [...new Set(rows.map(r => r.count))].sort((a, b) => a - b).map(c => ({ id: String(c), name: `${c} ${c === 1 ? 'employee' : 'employees'}` })) })
  }
  return dims
}
const notSubmitDims = computed(() => buildDims(notSubmitRows.value, false))
const pickedDims = computed(() => buildDims(pickedRows.value, true))

function goToCycleList() { router.push('/reviews/review-cycles') }

// ─── Styles (DT 2.4) ───────────────────────────────────────────────────────────
// No own padding — the stage already supplies 24px on all sides.
const outer = css({ display: 'flex', flexDirection: 'column', gap: '6', width: '100%' })
const card = css({ background: 'white', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', padding: '6', overflow: 'hidden' })
const filterCard = css({ background: 'white', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', padding: '4' })
const filterRow = css({ display: 'flex', alignItems: 'flex-end', gap: '3', flexWrap: 'wrap' })
const filterField = css({ display: 'flex', flexDirection: 'column', gap: '1' })
const dateWidth = css({ width: '260px' })
const selectWidth = '200px'

const strip = css({ display: 'flex', alignItems: 'center', gap: '6', flexWrap: 'wrap' })
const dateBlock = css({ flex: '1', minWidth: '200px' })
const dateHeading = css({ fontSize: '18px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const dateSub = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const kpiCell = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingInline: '4', borderLeft: '1px solid', borderLeftColor: 'border.default', minWidth: '130px' })
const kpiLabel = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const kpiValue = css({ fontSize: '20px', fontWeight: '600', lineHeight: '28px', color: 'text.default', fontVariantNumeric: 'tabular-nums' })
const seeAll = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
const tablesRow = css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: '1fr 1fr' }, gap: '6' })

// Tab bar — canonical Type A styles (docs/patterns/tabs.md).
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2',
  paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400',
  color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })
</script>

<template>
  <div :class="outer">
    <!-- Tabs: two dashboards, one page title -->
    <Teleport to="#page-tabs" defer>
      <div :class="tabBar">
        <button type="button" :class="activeTab === 'review' ? tabItemActive : tabItem" @click="activeTab = 'review'">
          Reviews
        </button>
        <button type="button" :class="activeTab === 'goals' ? tabItemActive : tabItem" @click="activeTab = 'goals'">
          Goals
        </button>
      </div>
    </Teleport>

    <!-- Header actions — each tab owns its own pair -->
    <Teleport to="#page-header-actions" defer>
      <template v-if="activeTab === 'review'">
        <MpButton variant="ghost" left-icon="newtab" @click="viewInsight">View insight</MpButton>
        <MpButton variant="primary" @click="createCycle">Create new cycle</MpButton>
      </template>
      <template v-else>
        <MpButton variant="ghost" left-icon="newtab" @click="viewGoalsInsight">View insights</MpButton>
        <MpButton v-if="goalsNewInterface" variant="primary" @click="createGoalCycle">Create goal cycle</MpButton>
        <MpButton v-else variant="primary" @click="createGoal">Create goal</MpButton>
      </template>
    </Teleport>

    <!-- ── Goals tab ─────────────────────────────────────────────────────── -->
    <GoalsDashboard v-if="activeTab === 'goals'" :is-new-interface="goalsNewInterface" />

    <!-- ── Performance review tab ────────────────────────────────────────── -->
    <template v-else>
    <!-- Filter bar -->
    <div :class="filterRow">
      <div :class="dateWidth">
        <PxAdvancedDatePicker v-model="dateRange" placeholder="Start date - End date" :width="'260px'" />
      </div>
      <DashMultiSelectSearch v-model="reviewCycle" :options="cycleOptions" all-label="All review cycle" :width="selectWidth" />
      <DashMultiSelectSearch v-model="reviewMethod" :options="methodOptions" all-label="All review method" :width="selectWidth" />
      <MpButton variant="secondary" @click="applyFilter">Apply filter</MpButton>
    </div>

    <!-- Summary strip -->
    <div :class="card">
      <div :class="strip">
        <div :class="dateBlock">
          <div :class="dateHeading">{{ today }}</div>
          <div :class="dateSub">This shows daily data in real-time</div>
        </div>
        <div v-for="k in kpis" :key="k.label" :class="kpiCell">
          <span :class="kpiLabel">{{ k.label }}</span>
          <span :class="kpiValue">{{ k.value }}</span>
        </div>
        <div :class="kpiCell">
          <MpTextlink as="a" @click="goToCycleList">
            <span :class="seeAll">See all cycle <MpIcon name="arrows-right" size="sm" /></span>
          </MpTextlink>
        </div>
      </div>
    </div>

    <!-- Cycle overview -->
    <div :class="card"><DashCycleOverview :rows="cycleRows" /></div>

    <!-- Not submit reviews + Picked co-worker -->
    <div :class="tablesRow">
      <div :class="card">
        <DashReviewList variant="not-submit" :rows="notSubmitRows" :dimensions="notSubmitDims" :applied-filters="appliedFilters" />
      </div>
      <div :class="card">
        <DashReviewList variant="picked" :rows="pickedRows" :dimensions="pickedDims" :applied-filters="appliedFilters" />
      </div>
    </div>

    <!-- Create cycle purpose modal -->
    <DashCyclePurposeModal v-model:is-open="isPurposeOpen" />
    </template>
  </div>
</template>
