<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpText,
  MpBadge,
  MpAvatar,
  MpTextlink,
  MpToggle,
  MpProgress,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalBody,
  MpModalFooter,
  MpModalCloseButton,
  MpFormControl,
  MpDatePicker,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpSkeleton,
  toast,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES } from '~/utils/employees'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' },
})

const route = useRoute()
const cycleName = computed(() => String(route.query.name || 'Probation Evaluation – Batch Jan 2026'))
const cyclePurpose = computed(() => String(route.query.purpose || 'evaluation'))

const purposeLabel: Record<string, string> = {
  performance: 'Performance review',
  competency: 'Competency review',
  evaluation: 'Evaluation review',
}

// ── Per-cycle scenario config (evaluation review) ──
// Each evaluation cycle pins one employment status + review-period shape + dataset.
interface CycleScenario {
  employmentStatus: string
  reviewPeriodValue: string
  reviewPeriodSubs: string[]
  datasetKey: string
}
const MULTI_SUBS = ['Review every 2 months', 'Review window 3 days']
const SINGLE_SUBS = ['Review start 7 days before end date']
// Today = 15 Jun 2026. Each cycle demonstrates a distinct, date-consistent state:
// a review can only be Completed/Expired once its window has passed, In progress while
// its window is open, and Not started/Upcoming while its window is still in the future.
const CYCLE_SCENARIOS: Record<string, CycleScenario> = {
  // Probation · multiple period · IN PROGRESS (early windows done, final still upcoming)
  'Probation Evaluation – Batch Jan 2026': {
    employmentStatus: 'Probation', reviewPeriodValue: 'Multiple review period', reviewPeriodSubs: MULTI_SUBS, datasetKey: 'probation-jan',
  },
  // Probation · multiple period · COMPLETED (all windows in the past, all submitted)
  'Probation Evaluation – Batch Sep 2025': {
    employmentStatus: 'Probation', reviewPeriodValue: 'Multiple review period', reviewPeriodSubs: MULTI_SUBS, datasetKey: 'probation-sep',
  },
  // Contract · single period · COMPLETED (window 5–10 Jun has closed: submitted or expired)
  'Contract Evaluation – Batch Mar 2026': {
    employmentStatus: 'Contract', reviewPeriodValue: 'Single review period', reviewPeriodSubs: SINGLE_SUBS, datasetKey: 'contract-mar',
  },
  // Contract · single period · UPCOMING (window 25–30 Sep is in the future → nothing started)
  'Contract Evaluation – Batch Jun 2026': {
    employmentStatus: 'Contract', reviewPeriodValue: 'Single review period', reviewPeriodSubs: SINGLE_SUBS, datasetKey: 'contract-jun',
  },
  // Part-timer · single period · EMPTY (no employees with this status yet → no timeframe)
  'Part-timer Evaluation – Batch Jun 2026': {
    employmentStatus: 'Part-timer', reviewPeriodValue: 'Single review period', reviewPeriodSubs: SINGLE_SUBS, datasetKey: 'none',
  },
  // Probation · multiple period · IN PROGRESS, 13 separate review timeframes (one per
  // monthly cohort) — demonstrates the "In progress" accordion's timeframe-group
  // pagination (TIMEFRAME_GROUP_PAGE_SIZE = 10) actually kicking in.
  'Probation Evaluation – Batch Apr 2026': {
    employmentStatus: 'Probation', reviewPeriodValue: 'Multiple review period', reviewPeriodSubs: MULTI_SUBS, datasetKey: 'probation-apr',
  },
}
const currentScenario = computed<CycleScenario>(() =>
  CYCLE_SCENARIOS[cycleName.value] || CYCLE_SCENARIOS['Probation Evaluation – Batch Jan 2026']
)
// Single employment status for evaluation (only 1 can be selected), driven by the cycle scenario.
const employmentStatus = computed(() => currentScenario.value.employmentStatus)
// Single-review cycles have exactly one period per employee → hide the Period column.
const isSinglePeriod = computed(() => currentScenario.value.reviewPeriodValue === 'Single review period')

// Mock: active review aspects (non-evaluation cycles still summarise by aspect)
const activeAspects = ['Goal', 'Attendance'] // can be [], ['Goal'], ['Goal','Attendance','Reprimand'], etc.

// Mock: Review methods configured on this Evaluation cycle (new Review methods form).
// Manager review resolves reviewers via "Who will review them?"; when 2+ methods
// are enabled and "Use weight" is on, each method contributes a weighted share.
const reviewMethods = ['Manager review', '360-degree review', 'Self review']
const managerReviewer = 'By approval line'
const useMethodWeight = true
const methodWeights: Record<string, number> = { 'Manager review': 50, '360-degree review': 30, 'Self review': 20 }

// Mock reviewers per method (each method can have several reviewers, each with
// its own weight summing to 100% within the method). Self review's reviewer is
// the reviewed member themselves, so it's resolved at open time. Others map to
// real people from the shared EMPLOYEES directory (photo/name/id/job/org).
const reviewersByMethod: Record<string, { empId: string, weight: number }[]> = {
  'Manager review': [{ empId: 'rio', weight: 70 }, { empId: 'rizal', weight: 30 }],
  '360-degree review': [
    { empId: 'ali', weight: 10 }, { empId: 'bayu', weight: 10 }, { empId: 'cinta', weight: 10 },
    { empId: 'andi', weight: 10 }, { empId: 'eka', weight: 10 }, { empId: 'daud', weight: 10 },
    { empId: 'jessie', weight: 10 }, { empId: 'christin', weight: 10 }, { empId: 'indah', weight: 5 },
    { empId: 'fajar', weight: 5 }, { empId: 'agung', weight: 5 }, { empId: 'linda', weight: 5 },
  ],
  'Team review': [{ empId: 'andi', weight: 50 }, { empId: 'eka', weight: 50 }],
}
// Integers render bare ("50"), fractions to 2dp — mirrors production formatWeight.
function formatWeight(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}
interface ReviewerRow { name: string, code: string, sub: string, photo?: string, weight: number }
const reviewerModalOpen = ref(false)
const reviewerModalMember = ref<{ name: string, id: string, jobTitle?: string, jobPosition?: string, organization?: string } | null>(null)
function memberSub(m: { id: string, jobTitle?: string, jobPosition?: string, organization?: string } | null) {
  return m ? [m.id, m.jobTitle ?? m.jobPosition, m.organization].filter(Boolean).join(' · ') : ''
}
const reviewerGroups = computed<{ name: string, weight: number, reviewers: ReviewerRow[] }[]>(() => {
  const member = reviewerModalMember.value
  return reviewMethods.map((method) => {
    let reviewers: ReviewerRow[]
    if (method === 'Self review') {
      reviewers = member
        ? [{ name: member.name, code: member.id, sub: memberSub(member), weight: 100 }]
        : []
    }
    else {
      reviewers = (reviewersByMethod[method] ?? []).map((r) => {
        const e = EMPLOYEES.find(x => x.id === r.empId)
        return {
          name: e?.name ?? r.empId,
          code: e?.code ?? '',
          sub: e ? [e.code, e.title, e.department].filter(Boolean).join(' · ') : '',
          photo: e?.photo,
          weight: r.weight,
        }
      })
    }
    return { name: method, weight: methodWeights[method] ?? 0, reviewers }
  })
})
function openReviewerList(member: { name: string, id: string, jobTitle?: string, jobPosition?: string, organization?: string }) {
  reviewerModalMember.value = member
  reviewerModalOpen.value = true
}
const publishScoreAfter = 'Complete review' // Complete review | Review period end | Both

const reviewMethodsText = computed(() =>
  reviewMethods.length === 0 ? 'None' : reviewMethods.join(', '),
)

// Mock: drives which table variant to render
const reincludeExtended = true

const cyclePeriodText = computed(() => {
  if (cyclePurpose.value !== 'evaluation') return cyclePurpose.value === 'performance' ? '90 days' : '60 days'
  const suffix = employmentStatus.value === 'Probation'
    ? 'before employees probation end'
    : 'before employees contract end'
  return `7 days ${suffix}`
})

const reviewAspectsText = computed(() =>
  activeAspects.length === 0 ? 'None' : activeAspects.join(', ')
)

interface InfoRow {
  label: string
  value: string
  indent?: boolean
  editable?: boolean
  boldValue?: boolean
  subValues?: string[]
  // When set, the value renders as gray status badges (one per entry) instead
  // of plain text — used for the configured Review methods.
  badges?: string[]
}

const infoRows = computed<InfoRow[]>(() => {
  const purpose = cyclePurpose.value
  const isEval = purpose === 'evaluation'
  const rows: InfoRow[] = [
    { label: 'Cycle name', value: cycleName.value, editable: true },
    { label: 'Purpose', value: purposeLabel[purpose] || 'Evaluation review' },
    { label: 'Employment status', value: isEval ? employmentStatus.value : (purpose === 'performance' ? 'Permanent' : 'All status') },
    { label: 'Review period', value: currentScenario.value.reviewPeriodValue, subValues: currentScenario.value.reviewPeriodSubs },
  ]
  if (isEval) {
    // New Review methods form: methods + per-method reviewer/weight, publish timing.
    rows.push({ label: 'Re-include extended employees', value: reincludeExtended ? 'Yes' : 'No' })
    rows.push({ label: 'Review methods', value: reviewMethodsText.value, badges: reviewMethods.length ? reviewMethods : undefined })
    rows.push({ label: 'Reviewer', value: managerReviewer })
    if (useMethodWeight && reviewMethods.length >= 2) {
      rows.push({ label: 'Score calculation', value: 'Weighted' })
      reviewMethods.forEach(m => rows.push({ label: m, value: `${methodWeights[m] ?? 0}%`, indent: true }))
    }
    rows.push({ label: 'Publish score after', value: publishScoreAfter })
    rows.push({ label: 'Score deduction', value: 'Yes' })
  } else {
    rows.push({ label: 'Publish score', value: 'After all reviewers submit' })
    rows.push({ label: 'Re-include extended employees', value: reincludeExtended ? 'Yes' : 'No' })
    rows.push({ label: 'Review aspects', value: reviewAspectsText.value })
    rows.push({ label: 'Score deduction', value: 'Yes' })
  }
  return rows
})

interface CyclePeriodRow {
  timeFrame: string
  reviewPeriod: string
  reviewDeadline: string
  employees: number
  reviewLabel: string
  reviewDone: number
  reviewTotal: number
  approval: boolean
  aiSummary: boolean
  status: 'Completed' | 'In progress' | 'Upcoming'
}

const rows = ref<CyclePeriodRow[]>([
  {
    timeFrame: '1 Oct – 13 Nov 2024',
    reviewPeriod: '15 Sept – 13 Nov 2024',
    reviewDeadline: '26 Nov 2024',
    employees: 18,
    reviewLabel: 'Submitted',
    reviewDone: 18,
    reviewTotal: 18,
    approval: false,
    aiSummary: true,
    status: 'Completed',
  },
  {
    timeFrame: '1 Nov – 31 Dec 2024',
    reviewPeriod: '15 Oct – 31 Dec 2024',
    reviewDeadline: '10 Jan 2025',
    employees: 24,
    reviewLabel: 'Submitted',
    reviewDone: 14,
    reviewTotal: 24,
    approval: true,
    aiSummary: false,
    status: 'In progress',
  },
  {
    timeFrame: '1 Jan – 28 Feb 2025',
    reviewPeriod: '15 Dec 2024 – 28 Feb 2025',
    reviewDeadline: '14 Mar 2025',
    employees: 11,
    reviewLabel: 'Submitted',
    reviewDone: 0,
    reviewTotal: 11,
    approval: false,
    aiSummary: false,
    status: 'Upcoming',
  },
])

const tableSearch = ref('')
const filteredRows = computed(() => {
  if (!tableSearch.value) return rows.value
  const q = tableSearch.value.toLowerCase()
  return rows.value.filter(r =>
    r.timeFrame.toLowerCase().includes(q) ||
    r.reviewPeriod.toLowerCase().includes(q) ||
    r.status.toLowerCase().includes(q),
  )
})

const labelText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap' })
const extThCell = css({ bg: 'background.neutral.hovered' })
const noHoverRow = css({ _hover: { bg: 'transparent' } })
// Progress fill forced to green.700 (overrides the default brand-blue fill)
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'teal.400' } })
// Employee cell: right border groups multi-period rowspans. Single-period tables drop it.
const empCellBorder = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', verticalAlign: 'top' })
const empCellPlain = css({ verticalAlign: 'top' })

const statusBadgeColor: Record<CyclePeriodRow['status'], string> = {
  Completed: 'completed',
  'In progress': 'information',
  Upcoming: 'announcement',
}

interface Employee {
  name: string
  id: string
  jobPosition: string
  organization: string
  status: 'Submitted' | 'In review' | 'Pending'
}

const employeesByTimeFrame: Record<number, Employee[]> = {
  0: [
    { name: 'Agung Setiawarman', id: 'EMP-0012', jobPosition: 'Software Engineer', organization: 'Engineering', status: 'Submitted' },
    { name: 'Rizal Candra', id: 'EMP-0034', jobPosition: 'Product Designer', organization: 'Product', status: 'Submitted' },
    { name: 'Gita Yeni Chalia', id: 'EMP-0087', jobPosition: 'HR Business Partner', organization: 'Human Resources', status: 'Submitted' },
    { name: 'Dian Pratiwi', id: 'EMP-0091', jobPosition: 'QA Engineer', organization: 'Engineering', status: 'Submitted' },
    { name: 'Budi Santoso', id: 'EMP-0103', jobPosition: 'Data Analyst', organization: 'Analytics', status: 'Submitted' },
  ],
  1: [
    { name: 'Feri Anwar', id: 'EMP-0110', jobPosition: 'Backend Engineer', organization: 'Engineering', status: 'Submitted' },
    { name: 'Sari Wulandari', id: 'EMP-0122', jobPosition: 'Frontend Engineer', organization: 'Engineering', status: 'In review' },
    { name: 'Hendri Gunawan', id: 'EMP-0145', jobPosition: 'DevOps Engineer', organization: 'Infrastructure', status: 'Pending' },
    { name: 'Maya Indah', id: 'EMP-0156', jobPosition: 'Customer Success', organization: 'Operations', status: 'In review' },
    { name: 'Arif Budiman', id: 'EMP-0167', jobPosition: 'Sales Executive', organization: 'Sales', status: 'Pending' },
  ],
  2: [
    { name: 'Nia Ramadhani', id: 'EMP-0201', jobPosition: 'Marketing Specialist', organization: 'Marketing', status: 'Pending' },
    { name: 'Fajar Maulana', id: 'EMP-0213', jobPosition: 'Finance Analyst', organization: 'Finance', status: 'Pending' },
    { name: 'Dewi Kusuma', id: 'EMP-0225', jobPosition: 'Operations Manager', organization: 'Operations', status: 'Pending' },
  ],
}

const employeeStatusColor: Record<Employee['status'], string> = {
  Submitted: 'completed',
  'In review': 'information',
  Pending: 'announcement',
}

const employeeModalOpen = ref(false)
const selectedRowIndex = ref(0)

function openEmployeeModal(index: number) {
  selectedRowIndex.value = index
  employeeModalOpen.value = true
}

const modalEmployees = computed(() => employeesByTimeFrame[selectedRowIndex.value] ?? [])

// ── Extended table (re-include extended employees variant) ──────────────────

interface ExtPeriodRow {
  label: string
  reviewPeriod: string
  progressLabel: string
  progressDone: number
  progressTotal: number
  status: 'Completed' | 'Expired' | 'In progress' | 'Upcoming'
}

interface ExtEmployee {
  name: string
  id: string
  jobTitle: string
  periods: ExtPeriodRow[]
  extended?: boolean
}

interface TimeframeGroup {
  timeframe: string
  groupStatus: 'In progress' | 'Completed' | 'Upcoming'
  employees: ExtEmployee[]
}

// Probation review: 6-month probation, reviewed every 2 months (Period 1, Period 2, Final)
// Review window: 3 days each. Today = 12 Jun 2026.
//
// Cohort A – started 6 Jan 2026, probation ends 5 Jul 2026
//   Period 1: 4–6 Mar 2026 (PAST → Completed/Expired)
//   Period 2: 4–6 May 2026 (PAST → Completed/Expired)
//   Final:    3–5 Jul 2026 (UPCOMING)
//
// Cohort B – started 4 Nov 2025, probation ends 3 May 2026
//   Period 1: 2–4 Jan 2026 (PAST → Completed/Expired)
//   Period 2: 1–3 Mar 2026 (PAST → Completed/Expired)
//   Final:    1–3 May 2026 (PAST → Completed/Expired)
const PROBATION_GROUPS: TimeframeGroup[] = [
  {
    timeframe: '6 Jan - 5 Jul 2026',
    groupStatus: 'In progress',
    employees: [
      {
        name: 'Eka Setiawan', id: 'CP081', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Rina Kusumawati', id: 'CP082', jobTitle: 'Kasir | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Denny Pratama', id: 'CP083', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 1, progressTotal: 3, status: 'Expired' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Sari Dewi', id: 'CP084', jobTitle: 'Cook | Kitchen',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Ahmad Fauzi', id: 'CP085', jobTitle: 'Service Crew | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Mega Lestari', id: 'CP086', jobTitle: 'Kasir | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Riko Firmansyah', id: 'CP087', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Yuni Rahayu', id: 'CP088', jobTitle: 'Kitchen Staff | Kitchen',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 0, progressTotal: 3, status: 'Expired' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Bagas Wicaksono', id: 'CP089', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Fitri Handayani', id: 'CP090', jobTitle: 'Service Crew | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Galih Pratomo', id: 'CP092', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Hesti Wulandari', id: 'CP093', jobTitle: 'Kasir | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Indra Maulana', id: 'CP094', jobTitle: 'Cook | Kitchen',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Pending', progressDone: 1, progressTotal: 3, status: 'In progress' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Joko Santoso', id: 'CP095', jobTitle: 'Kitchen Staff | Kitchen',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
      {
        name: 'Kartika Sari', id: 'CP096', jobTitle: 'Service Crew | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' },
          { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '3 - 5 Jul 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' },
        ],
      },
    ],
  },
  {
    timeframe: '1 - 30 Jun 2026',
    groupStatus: 'In progress',
    employees: [
      {
        name: 'Bayu Nugroho', id: 'CP091', jobTitle: 'Cook | Kitchen', extended: true,
        periods: [
          { label: 'Final', reviewPeriod: '28 - 30 Jun 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 1, status: 'Upcoming' },
        ],
      },
    ],
  },
  {
    timeframe: '1 Dec 2025 - 31 May 2026',
    groupStatus: 'Completed',
    employees: [
      {
        name: 'Bayu Nugroho', id: 'CP091', jobTitle: 'Cook | Kitchen',
        periods: [
          { label: 'Period 1', reviewPeriod: '28 Jan - 1 Feb 2026', progressLabel: 'Submitted', progressDone: 1, progressTotal: 1, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Apr 2026', progressLabel: 'Submitted', progressDone: 1, progressTotal: 1, status: 'Completed' },
          { label: 'Final', reviewPeriod: '29 - 31 May 2026', progressLabel: 'Submitted', progressDone: 1, progressTotal: 1, status: 'Completed' },
        ],
      },
    ],
  },
  {
    timeframe: '4 Nov 2025 - 3 May 2026',
    groupStatus: 'Completed',
    employees: [
      {
        name: 'Agus Salim', id: 'CP071', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Dewi Puspita', id: 'CP072', jobTitle: 'Kitchen Staff | Kitchen',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Hendro Susanto', id: 'CP073', jobTitle: 'Kasir | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 1, progressTotal: 3, status: 'Expired' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Lina Marlina', id: 'CP074', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Wahyu Nugroho', id: 'CP075', jobTitle: 'Service Crew | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Tari Setyowati', id: 'CP076', jobTitle: 'Kasir | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Faisal Rahman', id: 'CP077', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Nita Anggraini', id: 'CP078', jobTitle: 'Cook | Kitchen',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' },
        ],
      },
      {
        name: 'Dodi Kurniawan', id: 'CP079', jobTitle: 'Barista | Bar',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
      {
        name: 'Putri Wulandari', id: 'CP080', jobTitle: 'Service Crew | Front of House',
        periods: [
          { label: 'Period 1', reviewPeriod: '2 - 4 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Period 2', reviewPeriod: '1 - 3 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
          { label: 'Final', reviewPeriod: '1 - 3 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' },
        ],
      },
    ],
  },
]

// Probation · COMPLETED: started 1 Sep 2025, probation ended 28 Feb 2026.
// All three windows are in the past (today = 15 Jun 2026) → reviewed (Completed) or missed (Expired).
const PROBATION_SEP_GROUPS: TimeframeGroup[] = [
  {
    timeframe: '1 Sep 2025 - 28 Feb 2026',
    groupStatus: 'Completed',
    employees: [
      { name: 'Galuh Pradana',   id: 'CP061', jobTitle: 'Barista | Bar',                 periods: [ { label: 'Period 1', reviewPeriod: '1 - 3 Nov 2025', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '1 - 3 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Final', reviewPeriod: '26 - 28 Feb 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' } ] },
      { name: 'Hana Pertiwi',    id: 'CP062', jobTitle: 'Kasir | Front of House',        periods: [ { label: 'Period 1', reviewPeriod: '1 - 3 Nov 2025', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '1 - 3 Jan 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' }, { label: 'Final', reviewPeriod: '26 - 28 Feb 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' } ] },
      { name: 'Irfan Hidayat',   id: 'CP063', jobTitle: 'Cook | Kitchen',                periods: [ { label: 'Period 1', reviewPeriod: '1 - 3 Nov 2025', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '1 - 3 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Final', reviewPeriod: '26 - 28 Feb 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' } ] },
      { name: 'Jelita Anggraini', id: 'CP064', jobTitle: 'Service Crew | Front of House', periods: [ { label: 'Period 1', reviewPeriod: '1 - 3 Nov 2025', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '1 - 3 Jan 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Final', reviewPeriod: '26 - 28 Feb 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' } ] },
    ],
  },
]

// Contract · COMPLETED: single review window 5–10 Jun 2026 has already closed (today = 15 Jun).
// Each employee is either Completed (submitted in time) or Expired (window passed unsubmitted).
const CONTRACT_MAR_GROUPS: TimeframeGroup[] = [
  {
    timeframe: '1 Mar - 10 Jun 2026',
    groupStatus: 'Completed',
    employees: [
      { name: 'Krisna Aditya',  id: 'CP111', jobTitle: 'Barista | Bar',                 periods: [{ label: 'Final review', reviewPeriod: '5 - 10 Jun 2026', progressLabel: 'Submitted',   progressDone: 3, progressTotal: 3, status: 'Completed' }] },
      { name: 'Laras Wening',   id: 'CP112', jobTitle: 'Kasir | Front of House',        periods: [{ label: 'Final review', reviewPeriod: '5 - 10 Jun 2026', progressLabel: 'Submitted',   progressDone: 3, progressTotal: 3, status: 'Completed' }] },
      { name: 'Made Sukarya',   id: 'CP113', jobTitle: 'Cook | Kitchen',                periods: [{ label: 'Final review', reviewPeriod: '5 - 10 Jun 2026', progressLabel: 'Submitted',   progressDone: 2, progressTotal: 3, status: 'Expired' }] },
      { name: 'Nadia Salsabila', id: 'CP114', jobTitle: 'Service Crew | Front of House', periods: [{ label: 'Final review', reviewPeriod: '5 - 10 Jun 2026', progressLabel: 'Submitted',   progressDone: 3, progressTotal: 3, status: 'Completed' }] },
      { name: 'Oka Mahendra',   id: 'CP115', jobTitle: 'Barista | Bar',                 periods: [{ label: 'Final review', reviewPeriod: '5 - 10 Jun 2026', progressLabel: 'Submitted',   progressDone: 1, progressTotal: 3, status: 'Expired' }] },
    ],
  },
]

// Contract · UPCOMING: single review window 25–30 Sep 2026 is still in the future.
// Nothing can be reviewed yet → every employee is Not started, 0 of 3.
const CONTRACT_JUN_GROUPS: TimeframeGroup[] = [
  {
    timeframe: '1 Jun - 30 Sep 2026',
    groupStatus: 'Upcoming',
    employees: [
      { name: 'Andi Saputra',   id: 'CP101', jobTitle: 'Barista | Bar',                 periods: [{ label: 'Final review', reviewPeriod: '25 - 30 Sep 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' }] },
      { name: 'Bunga Lestari',  id: 'CP102', jobTitle: 'Kasir | Front of House',        periods: [{ label: 'Final review', reviewPeriod: '25 - 30 Sep 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' }] },
      { name: 'Candra Wijaya',  id: 'CP103', jobTitle: 'Cook | Kitchen',                periods: [{ label: 'Final review', reviewPeriod: '25 - 30 Sep 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' }] },
      { name: 'Dina Maharani',  id: 'CP104', jobTitle: 'Service Crew | Front of House', periods: [{ label: 'Final review', reviewPeriod: '25 - 30 Sep 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' }] },
      { name: 'Eko Prasetyo',   id: 'CP105', jobTitle: 'Barista | Bar',                 periods: [{ label: 'Final review', reviewPeriod: '25 - 30 Sep 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' }] },
      { name: 'Fani Oktaviani', id: 'CP106', jobTitle: 'Kitchen Staff | Kitchen',       periods: [{ label: 'Final review', reviewPeriod: '25 - 30 Sep 2026', progressLabel: 'Not started', progressDone: 0, progressTotal: 3, status: 'Upcoming' }] },
    ],
  },
]

// Probation · 13 monthly cohorts, ALL "In progress" — a realistic case of the
// "In progress" accordion grouping far more than 10 review timeframes at
// once, so its group-level pagination (10 tables per load) has something
// real to page through instead of only being reachable via a dev hack.
const PROBATION_APR_GROUPS: TimeframeGroup[] = [
  { timeframe: '6 Jan - 5 Jul 2026', groupStatus: 'In progress', employees: [{ name: 'Wahyu Saputra',    id: 'CP201', jobTitle: 'Barista | Bar',                 periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Mar 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Pending', progressDone: 1, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Feb - 5 Aug 2026', groupStatus: 'In progress', employees: [{ name: 'Nurul Hidayah',    id: 'CP202', jobTitle: 'Kasir | Front of House',        periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Apr 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Jun 2026', progressLabel: 'Pending', progressDone: 2, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Mar - 5 Sep 2026', groupStatus: 'In progress', employees: [{ name: 'Bagus Kurniawan',  id: 'CP203', jobTitle: 'Cook | Kitchen',                periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 May 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Jul 2026', progressLabel: 'Pending', progressDone: 0, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Apr - 5 Oct 2026', groupStatus: 'In progress', employees: [{ name: 'Lestari Wulandari', id: 'CP204', jobTitle: 'Service Crew | Front of House', periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Jun 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Aug 2026', progressLabel: 'Pending', progressDone: 1, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 May - 5 Nov 2026', groupStatus: 'In progress', employees: [{ name: 'Dedi Setiadi',      id: 'CP205', jobTitle: 'Kitchen Staff | Kitchen',       periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Jul 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Sep 2026', progressLabel: 'Pending', progressDone: 2, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Jun - 5 Dec 2026', groupStatus: 'In progress', employees: [{ name: 'Ratna Puspita',     id: 'CP206', jobTitle: 'Barista | Bar',                 periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Aug 2026', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' }, { label: 'Period 2', reviewPeriod: '4 - 6 Oct 2026', progressLabel: 'Pending', progressDone: 0, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Jul - 5 Jan 2027', groupStatus: 'In progress', employees: [{ name: 'Andri Gunawan',     id: 'CP207', jobTitle: 'Kasir | Front of House',        periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Sep 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Nov 2026', progressLabel: 'Pending', progressDone: 1, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Aug - 5 Feb 2027', groupStatus: 'In progress', employees: [{ name: 'Sinta Marlina',     id: 'CP208', jobTitle: 'Cook | Kitchen',                periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Oct 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Dec 2026', progressLabel: 'Pending', progressDone: 2, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Sep - 5 Mar 2027', groupStatus: 'In progress', employees: [{ name: 'Tri Wibowo',        id: 'CP209', jobTitle: 'Service Crew | Front of House', periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Nov 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Jan 2027', progressLabel: 'Pending', progressDone: 0, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Oct - 5 Apr 2027', groupStatus: 'In progress', employees: [{ name: 'Diah Anggraini',    id: 'CP210', jobTitle: 'Barista | Bar',                 periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Dec 2026', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Feb 2027', progressLabel: 'Pending', progressDone: 1, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Nov - 5 May 2027', groupStatus: 'In progress', employees: [{ name: 'Rudi Hermawan',     id: 'CP211', jobTitle: 'Kitchen Staff | Kitchen',       periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Jan 2027', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 Mar 2027', progressLabel: 'Pending', progressDone: 2, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Dec - 5 Jun 2027', groupStatus: 'In progress', employees: [{ name: 'Wulan Safitri',     id: 'CP212', jobTitle: 'Kasir | Front of House',        periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Feb 2027', progressLabel: 'Submitted', progressDone: 2, progressTotal: 3, status: 'Expired' }, { label: 'Period 2', reviewPeriod: '4 - 6 Apr 2027', progressLabel: 'Pending', progressDone: 0, progressTotal: 3, status: 'In progress' }] }] },
  { timeframe: '6 Jan - 5 Jul 2027', groupStatus: 'In progress', employees: [{ name: 'Agus Priyanto',     id: 'CP213', jobTitle: 'Cook | Kitchen',                periods: [{ label: 'Period 1', reviewPeriod: '4 - 6 Mar 2027', progressLabel: 'Submitted', progressDone: 3, progressTotal: 3, status: 'Completed' }, { label: 'Period 2', reviewPeriod: '4 - 6 May 2027', progressLabel: 'Pending', progressDone: 1, progressTotal: 3, status: 'In progress' }] }] },
]

// Dataset selected by the cycle scenario. 'none' → empty state.
// reactive() so "Extend review period" edits to window dates/status reflect live in the table.
const DATASETS: Record<string, TimeframeGroup[]> = reactive({
  'probation-jan': PROBATION_GROUPS,
  'probation-sep': PROBATION_SEP_GROUPS,
  'contract-mar': CONTRACT_MAR_GROUPS,
  'contract-jun': CONTRACT_JUN_GROUPS,
  'probation-apr': PROBATION_APR_GROUPS,
})
const timeframeGroups = computed<TimeframeGroup[]>(() =>
  DATASETS[currentScenario.value.datasetKey] ?? []
)

// Accordion open state. Default: exactly one section auto-opens, prioritizing
// In progress, then Upcoming, then Completed — so there's always one section open
// (e.g. a Completed-only cycle still shows its table). Users can toggle freely after.
const groupOpen = ref<Record<string, boolean>>({})

// Each timeframe group's own table (In progress / Upcoming) is independently
// collapsible too — only the first group in a section starts open, every
// other group starts collapsed, until the user explicitly toggles one.
const timeframeTableOpen = ref<Record<string, boolean>>({})
function isTimeframeTableOpen(tg: TimeframeGroup, sg: StatusSection): boolean {
  const explicit = timeframeTableOpen.value[tg.timeframe]
  if (explicit !== undefined) return explicit
  return sg.groups[0]?.timeframe === tg.timeframe
}
function toggleTimeframeTable(tg: TimeframeGroup, sg: StatusSection) {
  timeframeTableOpen.value[tg.timeframe] = !isTimeframeTableOpen(tg, sg)
}

const EXT_PAGE_SIZE = 10
const groupVisibleCount = ref<Record<string, number>>({})
const groupLoading = ref<Record<string, boolean>>({})
const groupLoadingMore = ref<Record<string, boolean>>({})

onMounted(() => {
  timeframeGroups.value.forEach(g => {
    groupLoading.value[g.timeframe] = true
  })
  setTimeout(() => {
    timeframeGroups.value.forEach(g => {
      groupLoading.value[g.timeframe] = false
    })
  }, 1000)
})

function getVisibleEmployees(tg: TimeframeGroup): ExtEmployee[] {
  const count = groupVisibleCount.value[tg.timeframe] ?? EXT_PAGE_SIZE
  return tg.employees.slice(0, count)
}

function loadMoreEmployees(tg: TimeframeGroup) {
  if (groupLoadingMore.value[tg.timeframe]) return
  groupLoadingMore.value[tg.timeframe] = true
  setTimeout(() => {
    const current = groupVisibleCount.value[tg.timeframe] ?? EXT_PAGE_SIZE
    groupVisibleCount.value[tg.timeframe] = current + EXT_PAGE_SIZE
    groupLoadingMore.value[tg.timeframe] = false
  }, 800)
}

function hasMoreEmployees(tg: TimeframeGroup): boolean {
  const count = groupVisibleCount.value[tg.timeframe] ?? EXT_PAGE_SIZE
  return count < tg.employees.length
}

// ── Timeframe-group pagination (per status section, e.g. "In progress") ──
// A section can group many review timeframes at once — each its own bordered
// table above — so render only TIMEFRAME_GROUP_PAGE_SIZE of them at a time.
// Deliberately its own constant, independent from EXT_PAGE_SIZE (the
// employee-row pagination within one group's table, untouched above) — the
// two are unrelated page sizes and must never be coupled.
const TIMEFRAME_GROUP_PAGE_SIZE = 10
interface StatusSection { status: TimeframeGroup['groupStatus'], groups: TimeframeGroup[] }
const sectionVisibleGroups = ref<Record<string, number>>({})
const sectionGroupsLoadingMore = ref<Record<string, boolean>>({})

function visibleGroupsFor(sg: StatusSection): TimeframeGroup[] {
  const count = sectionVisibleGroups.value[sg.status] ?? TIMEFRAME_GROUP_PAGE_SIZE
  return sg.groups.slice(0, count)
}
function hasMoreGroups(sg: StatusSection): boolean {
  const count = sectionVisibleGroups.value[sg.status] ?? TIMEFRAME_GROUP_PAGE_SIZE
  return count < sg.groups.length
}
function loadMoreGroups(sg: StatusSection) {
  if (sectionGroupsLoadingMore.value[sg.status]) return
  sectionGroupsLoadingMore.value[sg.status] = true
  setTimeout(() => {
    const current = sectionVisibleGroups.value[sg.status] ?? TIMEFRAME_GROUP_PAGE_SIZE
    const next = current + TIMEFRAME_GROUP_PAGE_SIZE
    // Newly revealed groups get their own initial-load skeleton, same as
    // whatever was already visible got on page mount.
    const revealed = sg.groups.slice(current, next)
    revealed.forEach((g) => { groupLoading.value[g.timeframe] = true })
    sectionVisibleGroups.value[sg.status] = next
    sectionGroupsLoadingMore.value[sg.status] = false
    setTimeout(() => {
      revealed.forEach((g) => { groupLoading.value[g.timeframe] = false })
    }, 1000)
  }, 800)
}
watch(() => cycleName.value, () => { sectionVisibleGroups.value = {} })

// ── Completed section: single flattened list across all completed timeframes ──
interface CompletedRow { tg: TimeframeGroup, emp: ExtEmployee }
const completedRows = computed<CompletedRow[]>(() => {
  const sec = statusSections.value.find(s => s.status === 'Completed')
  if (!sec) return []
  const rows: CompletedRow[] = []
  sec.groups.forEach(tg => tg.employees.forEach(emp => rows.push({ tg, emp })))
  return rows
})
const completedVisible = ref(EXT_PAGE_SIZE)
const completedLoadingMore = ref(false)
const visibleCompletedRows = computed(() => completedRows.value.slice(0, completedVisible.value))
const completedHasMore = computed(() => completedVisible.value < completedRows.value.length)
function loadMoreCompleted() {
  if (completedLoadingMore.value) return
  completedLoadingMore.value = true
  setTimeout(() => {
    completedVisible.value += EXT_PAGE_SIZE
    completedLoadingMore.value = false
  }, 800)
}
watch(() => cycleName.value, () => { completedVisible.value = EXT_PAGE_SIZE })

const periodStatusColor: Record<ExtPeriodRow['status'], string> = {
  Completed: 'completed',
  Expired: 'warning',
  'In progress': 'information',
  Upcoming: 'announcement',
}

const filteredTimeframeGroups = computed(() => {
  if (!tableSearch.value) return timeframeGroups.value
  const q = tableSearch.value.toLowerCase()
  return timeframeGroups.value.map(g => ({
    ...g,
    employees: g.employees.filter(e =>
      e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
    ),
  })).filter(g => g.employees.length > 0)
})

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}
function parseEndDate(timeframe: string): number {
  const end = timeframe.split(' - ')[1]?.trim() ?? ''
  const [day, mon, year] = end.split(' ')
  const m = MONTHS[mon]
  if (m === undefined) return 0
  return new Date(Number(year), m, Number(day)).getTime()
}

const statusSections = computed(() => {
  const ORDER = ['In progress', 'Completed', 'Upcoming'] as const
  return ORDER.map(s => ({
    status: s,
    groups: filteredTimeframeGroups.value
      .filter(g => g.groupStatus === s)
      .slice()
      .sort((a, b) => parseEndDate(a.timeframe) - parseEndDate(b.timeframe)),
  })).filter(sg => sg.groups.length > 0)
})

// Auto-open exactly one section by priority so at least one accordion is always open.
const AUTO_OPEN_PRIORITY = ['In progress', 'Upcoming', 'Completed']
function applyAutoOpen() {
  const present = timeframeGroups.value.map(g => g.groupStatus)
  const open = AUTO_OPEN_PRIORITY.find(s => present.includes(s as TimeframeGroup['groupStatus']))
  const next: Record<string, boolean> = {}
  AUTO_OPEN_PRIORITY.forEach(s => { next[s] = s === open })
  groupOpen.value = next
}
watch(() => cycleName.value, applyAutoOpen, { immediate: true })

// Search: when the employee search box is active, results from the In progress and
// Completed tables are merged into a single result table (Completed-table format).
const isSearching = computed(() => tableSearch.value.trim().length > 0)
const searchResults = computed<CompletedRow[]>(() => {
  if (!isSearching.value) return []
  const rows: CompletedRow[] = []
  statusSections.value
    .filter(s => s.status === 'In progress' || s.status === 'Completed')
    .forEach(s => s.groups.forEach(tg => tg.employees.forEach(emp => rows.push({ tg, emp }))))
  return rows
})

// Empty state: a cycle exists but no review timeframe has been formed yet.
// The Part-timer cycle has no employees with that status yet (dataset: 'none').
// Based on the UNfiltered dataset so an empty search result doesn't trigger it.
const hasNoTimeframes = computed(() =>
  route.query.timeframes === 'empty' || timeframeGroups.value.length === 0
)

const router = useRouter()

function viewTimeframeDetails(tg: TimeframeGroup) {
  const slug = tg.timeframe.toLowerCase().replace(/\s+-\s+/g, '-').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const firstWindow = tg.employees[0]?.periods[0]?.reviewPeriod || ''
  router.push({
    path: `/reviews/review-cycles/${route.params.id}/timeframe/${slug}`,
    query: {
      cycleName: cycleName.value,
      timeframe: tg.timeframe,
      reviewWindow: firstWindow,
    },
  })
}

// ── Extend review period ──────────────────────────────────────────────
// Extends a period's review WINDOW (its end date) for ALL employees in the timeframe.
// The timeframe span itself is unchanged. Each period is extended independently;
// leaving a row blank skips it. Validation: new end date must not be earlier than current.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TODAY = new Date(2026, 5, 15) // 15 Jun 2026 — the mocked "now" used across the app

function parsePeriodEnd(window: string): Date | null {
  const end = window.split(' - ')[1]?.trim() ?? ''
  const [day, mon, year] = end.split(' ')
  const m = MONTHS[mon]
  if (m === undefined) return null
  return new Date(Number(year), m, Number(day))
}
function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

interface ExtendDraft {
  label: string
  currentWindow: string
  startPart: string
  currentEnd: Date | null
  newEnd: Date | null
}
const extendModalOpen = ref(false)
const extendTimeframe = ref<TimeframeGroup | null>(null)
const extendDrafts = ref<ExtendDraft[]>([])

function openExtend(tg: TimeframeGroup) {
  extendTimeframe.value = tg
  const periods = tg.employees[0]?.periods ?? []
  extendDrafts.value = periods.map((p) => {
    const currentEnd = parsePeriodEnd(p.reviewPeriod)
    return {
      label: p.label,
      currentWindow: p.reviewPeriod,
      startPart: p.reviewPeriod.split(' - ')[0] ?? '',
      currentEnd,
      newEnd: null,
    }
  })
  extendModalOpen.value = true
}

function draftError(d: ExtendDraft): string {
  if (!d.newEnd || !d.currentEnd) return ''
  if (d.newEnd.getTime() < d.currentEnd.getTime()) {
    return 'New end date cannot be earlier than the current end date'
  }
  return ''
}
// A period is actually extended only if its new end is strictly after the current end.
function isExtended(d: ExtendDraft): boolean {
  return !!d.newEnd && !!d.currentEnd && d.newEnd.getTime() > d.currentEnd.getTime()
}
const canExtend = computed(() =>
  extendDrafts.value.some(isExtended) && extendDrafts.value.every(d => !draftError(d)),
)

function confirmExtend() {
  if (!canExtend.value || !extendTimeframe.value) return
  const tg = extendTimeframe.value
  extendDrafts.value.forEach((d) => {
    if (!isExtended(d) || !d.newEnd) return
    const newWindow = `${d.startPart} - ${fmtDate(d.newEnd)}`
    const reopened = d.newEnd.getTime() >= TODAY.getTime()
    tg.employees.forEach((emp) => {
      const period = emp.periods.find(p => p.label === d.label)
      if (!period) return
      period.reviewPeriod = newWindow
      // Reopening an expired window lets the missed reviewers submit again.
      if (reopened && period.status === 'Expired') {
        period.status = 'In progress'
        period.progressLabel = period.progressDone === period.progressTotal
          ? 'Submitted'
          : period.progressDone === 0 ? 'Not started' : 'Pending'
      }
    })
  })
  extendModalOpen.value = false
}

// MpDatePicker has no prop to set the opening month while the field is empty, so when a
// picker opens with no value we drive its calendar panel to the period's current end month.
function jumpCalendarToMonth(target: Date, attempts = 0) {
  if (attempts > 48) return
  const panel = Array.from(document.querySelectorAll<HTMLElement>('.mp-datepicker__popoverContent'))
    .find(p => p.offsetParent !== null)
  const label = panel?.querySelector<HTMLElement>('.mp-tableDate__headerLabel')
  if (!panel || !label) return
  const [monStr, yearStr] = label.textContent!.trim().split(/\s+/)
  const dispMonth = MONTHS[monStr?.slice(0, 3)]
  const dispYear = Number(yearStr)
  if (dispMonth === undefined || !dispYear) return
  const dispKey = dispYear * 12 + dispMonth
  const targetKey = target.getFullYear() * 12 + target.getMonth()
  if (dispKey === targetKey) return // reached the target month
  const btns = Array.from(panel.querySelectorAll<HTMLElement>('button'))
  const li = btns.indexOf(label)
  const navBtn = dispKey < targetKey ? btns[li + 1] : btns[li - 1] // next / prev month
  if (!navBtn) return
  navBtn.click()
  requestAnimationFrame(() => jumpCalendarToMonth(target, attempts + 1))
}
function onPickerOpen(d: ExtendDraft) {
  if (d.newEnd || !d.currentEnd) return // only when empty; otherwise it opens on the value
  const target = d.currentEnd
  let tries = 0
  const waitForPanel = () => {
    const panel = Array.from(document.querySelectorAll<HTMLElement>('.mp-datepicker__popoverContent'))
      .find(p => p.offsetParent !== null)
    if (panel?.querySelector('.mp-tableDate__headerLabel')) {
      // Let the picker finish its own open-init (which resets the panel to today),
      // then drive the panel to the target month; re-assert once for safety.
      setTimeout(() => jumpCalendarToMonth(target), 130)
      setTimeout(() => jumpCalendarToMonth(target), 340)
    }
    else if (tries++ < 30) requestAnimationFrame(waitForPanel)
  }
  requestAnimationFrame(waitForPanel)
}

// ── Remove employee from a review timeframe ──────────────────────────────
// "Remove employee" on any one period row removes that employee from the
// WHOLE review timeframe (every period row they have in it), not just the
// row clicked — the confirmation modal spells this out so it isn't mistaken
// for removing just that one period.
const removeEmployeeModalOpen = ref(false)
const employeeToRemove = ref<{ tg: TimeframeGroup, emp: ExtEmployee } | null>(null)

function askRemoveEmployee(tg: TimeframeGroup, emp: ExtEmployee) {
  employeeToRemove.value = { tg, emp }
  removeEmployeeModalOpen.value = true
}
function cancelRemoveEmployee() {
  removeEmployeeModalOpen.value = false
  employeeToRemove.value = null
}
function confirmRemoveEmployee() {
  if (!employeeToRemove.value) return
  const { tg, emp } = employeeToRemove.value
  tg.employees = tg.employees.filter(e => e.id !== emp.id)
  removeEmployeeModalOpen.value = false
  employeeToRemove.value = null
  toast.notify({
    id: 'remove-employee-from-timeframe',
    position: 'top-center',
    variant: 'success',
    title: `${emp.name} removed from ${tg.timeframe}`,
  })
}

</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="secondary" right-icon="newtab">Approval settings</MpButton>
    <MpButton variant="secondary">Edit cycle</MpButton>
  </Teleport>

  <MpFlex v-if="cyclePurpose === 'evaluation'" direction="column" gap="6">
    <!-- Cycle info -->
    <MpFlex direction="column" gap="4">
        <MpFlex
          v-for="row in infoRows"
          :key="row.label"
          align="start"
          gap="4"
        >
          <!-- Label column: empty spacer for indent rows -->
          <MpText
            v-if="!row.indent"
            size="label"
            :class="[labelText, css({ width: '200px', flexShrink: '0' })]"
          >
            {{ row.label }}
          </MpText>
          <MpFlex v-else :class="css({ width: '200px', flexShrink: '0' })" />

          <!-- Value area -->
          <template v-if="row.indent">
            <!-- Sub-row: aspect name left, percentage right, constrained width -->
            <MpFlex justify="space-between" :class="css({ width: '160px' })">
              <MpText size="label" :class="[labelText]">{{ row.label }}</MpText>
              <MpText size="label" :class="valueText">{{ row.value }}</MpText>
            </MpFlex>
          </template>
          <template v-else>
            <MpFlex v-if="row.badges?.length" gap="1" wrap="wrap">
              <MpBadge v-for="b in row.badges" :key="b" for="tableStatus" type="announcement">{{ b }}</MpBadge>
            </MpFlex>
            <MpFlex v-else-if="row.subValues?.length" direction="column" :class="css({ gap: '0' })">
              <MpText size="label" :weight="row.boldValue ? 'semiBold' : undefined" :class="[valueText, css({ lineHeight: '20px' })]">{{ row.value }}</MpText>
              <MpText v-for="(sub, i) in row.subValues" :key="sub" size="label-small" :class="[captionText, css({ lineHeight: '24px', marginTop: i === 0 ? '1' : '0' })]">{{ sub }}</MpText>
            </MpFlex>
            <MpText v-else size="label" :weight="row.boldValue ? 'semiBold' : undefined" :class="valueText">{{ row.value }}</MpText>
            <MpButton
              v-if="row.editable"
              variant="ghost"
              left-icon="edit"
              :class="css({ minWidth: 'auto', height: 'auto', padding: '0', lineHeight: '1' })"
            />
          </template>
        </MpFlex>
    </MpFlex>

    <!-- Timeframes exist: filter bar + tables -->
    <template v-if="!hasNoTimeframes">
    <!-- Filter bar -->
    <MpFlex justify="flex-end">
      <MpFlex :class="css({ width: '280px' })">
        <MpInputGroup>
          <MpInputLeftAddon>
            <MpIcon name="search" />
          </MpInputLeftAddon>
          <MpInput v-model="tableSearch" placeholder="Search employee..." />
        </MpInputGroup>
      </MpFlex>
    </MpFlex>

    <!-- Non-extended: flat period table -->
    <template v-if="!reincludeExtended">
      <MpTableContainer>
        <MpTable>
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th">Time frame</MpTableCell>
              <MpTableCell as="th">Review period</MpTableCell>
              <MpTableCell as="th">Employee(s)</MpTableCell>
              <MpTableCell as="th">Review</MpTableCell>
              <MpTableCell as="th">Approval</MpTableCell>
              <MpTableCell as="th" />
              <MpTableCell as="th" />
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(row, i) in filteredRows" :key="i">
              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ row.timeFrame }}</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="0">
                  <MpText size="label" :class="valueText">{{ row.reviewPeriod }}</MpText>
                  <MpText size="label-small" :class="captionText">Due date: {{ row.reviewDeadline }}</MpText>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpTextlink as="button" size="small" @click="openEmployeeModal(i)">
                  {{ row.employees }}
                </MpTextlink>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="1" :class="css({ width: '220px' })">
                  <MpFlex justify="space-between" align="center">
                    <MpText size="label-small" :class="valueText">{{ row.reviewLabel }}</MpText>
                    <MpText size="label-small" :class="captionText">
                      {{ row.reviewDone }} of {{ row.reviewTotal }}
                    </MpText>
                  </MpFlex>
                  <MpProgress
                    variant="linear"
                    size="sm"
                    :class="tealProgress"
                    :value="Math.round((row.reviewDone / row.reviewTotal) * 100)"
                  />
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex align="center" gap="2">
                  <MpToggle v-model="row.approval" size="sm" />
                  <MpText size="label-small" :class="captionText">
                    {{ row.approval ? 'On' : 'Off' }}
                  </MpText>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex v-if="row.aiSummary" align="center" gap="1">
                  <MpIcon name="airene-brand" :class="css({ color: 'icon.brand', flexShrink: '0' })" />
                  <MpText size="label-small" :class="css({ color: 'text.brand' })">Summarized by AI</MpText>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpBadge variant="tableStatus" :variantColor="statusBadgeColor[row.status]" size="md">
                  {{ row.status }}
                </MpBadge>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem>View details</MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
    </template>

    <!-- Extended: grouped by status → timeframe → employee/period rows -->
    <template v-else>
      <!-- Search results: matches from In progress + Completed merged into one table (Completed format) -->
      <MpFlex v-if="isSearching" direction="column" gap="3">
        <MpText :class="css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })">
          Search results ({{ searchResults.length }})
        </MpText>
        <MpFlex
          v-if="searchResults.length > 0"
          direction="column"
          :class="css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '8px', overflow: 'hidden' })"
        >
          <MpFlex :class="css({ overflowX: 'auto' })">
            <MpTable :class="css({ width: '100%' })" :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" :class="[extThCell, css({ width: '260px' })]">Employee</MpTableCell>
                  <MpTableCell as="th" :class="[extThCell, css({ width: '170px' })]">Review timeframe</MpTableCell>
                  <MpTableCell as="th" :class="[extThCell, css({ width: '170px' })]">Review period</MpTableCell>
                  <MpTableCell as="th" :class="[extThCell, css({ width: '220px' })]">Progress</MpTableCell>
                  <MpTableCell as="th" :class="[extThCell, css({ width: '120px' })]">Status</MpTableCell>
                  <MpTableCell as="th" :class="[actionHead, extThCell]" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <template v-for="row in searchResults" :key="`search-${row.tg.timeframe}-${row.emp.id}`">
                  <MpTableRow v-for="(period, pi) in row.emp.periods" :key="`search-${row.emp.id}-${period.label}`" :class="noHoverRow">
                    <MpTableCell v-if="pi === 0" as="td" :rowspan="row.emp.periods.length" :class="[tightCell, isSinglePeriod ? empCellPlain : empCellBorder]">
                      <MpFlex align="start" gap="3">
                        <MpAvatar :name="row.emp.name" size="lg" />
                        <MpFlex direction="column" gap="1">
                          <MpText size="label" weight="semiBold" :class="valueText">{{ row.emp.name }}</MpText>
                          <MpText size="label-small" :class="captionText">{{ row.emp.id }} | {{ row.emp.jobTitle }}</MpText>
                          <MpBadge v-if="row.emp.extended" for="tableStatus" type="warning" :class="css({ alignSelf: 'start' })">Extended</MpBadge>
                        </MpFlex>
                      </MpFlex>
                    </MpTableCell>
                    <MpTableCell v-if="pi === 0" as="td" :rowspan="row.emp.periods.length" :class="[tightCell, isSinglePeriod ? empCellPlain : empCellBorder]">
                      <MpTextlink as="button" size="small" @click="viewTimeframeDetails(row.tg)">{{ row.tg.timeframe }}</MpTextlink>
                    </MpTableCell>
                    <MpTableCell as="td" :class="tightCell">
                      <MpFlex direction="column" gap="0">
                        <MpText size="label" :class="valueText">{{ period.reviewPeriod }}</MpText>
                        <MpText v-if="!isSinglePeriod" size="label-small" :class="captionText">{{ period.label }}</MpText>
                      </MpFlex>
                    </MpTableCell>
                    <MpTableCell as="td" :class="tightCell">
                      <MpFlex direction="column" gap="1" :class="css({ width: '180px' })">
                        <MpFlex justify="space-between" align="center">
                          <MpText size="label-small" :class="valueText">{{ period.progressLabel }}</MpText>
                          <MpText size="label-small" :class="captionText">{{ period.progressDone }} of {{ period.progressTotal }}</MpText>
                        </MpFlex>
                        <MpProgress
                          variant="linear"
                          size="sm"
                          :class="tealProgress"
                          :value="period.progressTotal > 0 ? Math.round((period.progressDone / period.progressTotal) * 100) : 0"
                        />
                      </MpFlex>
                    </MpTableCell>
                    <MpTableCell as="td" :class="tightCell">
                      <MpBadge variant="tableStatus" :variantColor="periodStatusColor[period.status]" size="md">{{ period.status }}</MpBadge>
                    </MpTableCell>
                    <MpTableCell as="td" :class="actionCell">
                      <MpPopover is-close-on-select use-portal placement="bottom-end">
                        <MpPopoverTrigger>
                          <MpButton variant="secondary" size="md" right-icon="caret-down">Actions</MpButton>
                        </MpPopoverTrigger>
                        <MpPopoverContent :class="css({ minWidth: '160px' })">
                          <MpPopoverList>
                            <MpPopoverListItem @click="openReviewerList(row.emp)">View reviewer</MpPopoverListItem>
                            <MpPopoverListItem @click="viewTimeframeDetails(row.tg)">View timeframe details</MpPopoverListItem>
                          </MpPopoverList>
                        </MpPopoverContent>
                      </MpPopover>
                    </MpTableCell>
                  </MpTableRow>
                </template>
              </MpTableBody>
            </MpTable>
          </MpFlex>
        </MpFlex>
        <!-- No search results -->
        <MpFlex v-else direction="column" align="center" justify="center" gap="2" :class="css({ paddingY: '16', textAlign: 'center' })">
          <MpText :class="css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })">No employee found</MpText>
          <MpText size="label" :class="captionText">Recheck the keywords you have typed and try searching again.</MpText>
        </MpFlex>
      </MpFlex>

      <MpFlex v-else direction="column" gap="4">
        <MpFlex v-for="sg in statusSections" :key="sg.status" direction="column" gap="3">
          <!-- Status section header (collapsible) -->
          <MpFlex
            align="center"
            gap="2"
            :class="css({ cursor: 'pointer' })"
            @click="groupOpen[sg.status] = !groupOpen[sg.status]"
          >
            <MpIcon
              :name="groupOpen[sg.status] ? 'caret-down' : 'caret-right'"
              :class="css({ color: 'text.default', flexShrink: '0' })"
            />
            <MpText :class="css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })">
              {{ sg.status }} ({{ sg.groups.length }})
            </MpText>
          </MpFlex>

          <!-- Completed: single flattened table. Employee + Review timeframe merged across
               an employee's period rows; period label shown as a caption under the review window. -->
          <MpFlex
            v-if="groupOpen[sg.status] && sg.status === 'Completed'"
            direction="column"
            :class="css({ marginLeft: '28px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '8px', overflow: 'hidden' })"
          >
            <MpFlex :class="css({ overflowX: 'auto' })">
              <MpTable :class="css({ width: '100%' })" :is-hoverable="false">
                <MpTableHead>
                  <MpTableRow>
                    <MpTableCell as="th" :class="[extThCell, css({ width: '260px' })]">Employee</MpTableCell>
                    <MpTableCell as="th" :class="[extThCell, css({ width: '170px' })]">Review timeframe</MpTableCell>
                    <MpTableCell as="th" :class="[extThCell, css({ width: '170px' })]">Review period</MpTableCell>
                    <MpTableCell as="th" :class="[extThCell, css({ width: '220px' })]">Progress</MpTableCell>
                    <MpTableCell as="th" :class="[extThCell, css({ width: '120px' })]">Status</MpTableCell>
                    <MpTableCell as="th" :class="[actionHead, extThCell]" />
                  </MpTableRow>
                </MpTableHead>
                <MpTableBody>
                  <template v-for="row in visibleCompletedRows" :key="`${row.tg.timeframe}-${row.emp.id}`">
                    <MpTableRow v-for="(period, pi) in row.emp.periods" :key="`${row.emp.id}-${period.label}`" :class="noHoverRow">
                      <!-- Employee (merged across periods) -->
                      <MpTableCell v-if="pi === 0" as="td" :rowspan="row.emp.periods.length" :class="[tightCell, isSinglePeriod ? empCellPlain : empCellBorder]">
                        <MpFlex align="start" gap="3">
                          <MpAvatar :name="row.emp.name" size="lg" />
                          <MpFlex direction="column" gap="1">
                            <MpText size="label" weight="semiBold" :class="valueText">{{ row.emp.name }}</MpText>
                            <MpText size="label-small" :class="captionText">{{ row.emp.id }} | {{ row.emp.jobTitle }}</MpText>
                            <MpBadge v-if="row.emp.extended" for="tableStatus" type="warning" :class="css({ alignSelf: 'start' })">Extended</MpBadge>
                          </MpFlex>
                        </MpFlex>
                      </MpTableCell>
                      <!-- Review timeframe (merged across periods) -->
                      <MpTableCell v-if="pi === 0" as="td" :rowspan="row.emp.periods.length" :class="[tightCell, isSinglePeriod ? empCellPlain : empCellBorder]">
                        <MpTextlink as="button" size="small" @click="viewTimeframeDetails(row.tg)">{{ row.tg.timeframe }}</MpTextlink>
                      </MpTableCell>
                      <!-- Review period: window date + period caption (multiple only) -->
                      <MpTableCell as="td" :class="tightCell">
                        <MpFlex direction="column" gap="0">
                          <MpText size="label" :class="valueText">{{ period.reviewPeriod }}</MpText>
                          <MpText v-if="!isSinglePeriod" size="label-small" :class="captionText">{{ period.label }}</MpText>
                        </MpFlex>
                      </MpTableCell>
                      <!-- Progress -->
                      <MpTableCell as="td" :class="tightCell">
                        <MpFlex direction="column" gap="1" :class="css({ width: '180px' })">
                          <MpFlex justify="space-between" align="center">
                            <MpText size="label-small" :class="valueText">{{ period.progressLabel }}</MpText>
                            <MpText size="label-small" :class="captionText">{{ period.progressDone }} of {{ period.progressTotal }}</MpText>
                          </MpFlex>
                          <MpProgress
                            variant="linear"
                            size="sm"
                            :class="tealProgress"
                            :value="period.progressTotal > 0 ? Math.round((period.progressDone / period.progressTotal) * 100) : 0"
                          />
                        </MpFlex>
                      </MpTableCell>
                      <!-- Status -->
                      <MpTableCell as="td" :class="tightCell">
                        <MpBadge variant="tableStatus" :variantColor="periodStatusColor[period.status]" size="md">{{ period.status }}</MpBadge>
                      </MpTableCell>
                      <!-- Actions -->
                      <MpTableCell as="td" :class="actionCell">
                        <MpPopover is-close-on-select use-portal placement="bottom-end">
                          <MpPopoverTrigger>
                            <MpButton variant="secondary" size="md" right-icon="caret-down">Actions</MpButton>
                          </MpPopoverTrigger>
                          <MpPopoverContent :class="css({ minWidth: '160px' })">
                            <MpPopoverList>
                              <MpPopoverListItem @click="openReviewerList(row.emp)">View reviewer</MpPopoverListItem>
                              <MpPopoverListItem @click="viewTimeframeDetails(row.tg)">View timeframe details</MpPopoverListItem>
                            </MpPopoverList>
                          </MpPopoverContent>
                        </MpPopover>
                      </MpTableCell>
                    </MpTableRow>
                  </template>

                  <!-- Skeleton rows while loading more -->
                  <template v-if="completedLoadingMore">
                    <MpTableRow v-for="i in 3" :key="`completed-skel-${i}`" :class="noHoverRow">
                      <MpTableCell as="td" :class="[tightCell, isSinglePeriod ? empCellPlain : empCellBorder]">
                        <MpFlex align="center" gap="3">
                          <MpSkeleton :class="css({ width: '40px', height: '40px', borderRadius: 'full', flexShrink: '0' })" />
                          <MpFlex direction="column" gap="1">
                            <MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" />
                            <MpSkeleton :class="css({ width: '80px', height: '12px', borderRadius: '4px' })" />
                          </MpFlex>
                        </MpFlex>
                      </MpTableCell>
                      <MpTableCell as="td" :class="[tightCell, isSinglePeriod ? empCellPlain : empCellBorder]"><MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                      <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                      <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '180px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                      <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '72px', height: '22px', borderRadius: '4px' })" /></MpTableCell>
                      <MpTableCell as="td" :class="actionCell"><MpSkeleton :class="css({ width: '100px', height: '32px', borderRadius: '6px' })" /></MpTableCell>
                    </MpTableRow>
                  </template>
                </MpTableBody>
              </MpTable>
            </MpFlex>
            <!-- Load more bar -->
            <MpFlex
              align="center"
              gap="1"
              :class="css({ paddingX: '4', paddingY: '3' })"
            >
              <MpText size="label" :class="captionText">
                Showing {{ Math.min(completedVisible, completedRows.length) }} of {{ completedRows.length }} employees.
              </MpText>
              <MpTextlink
                v-if="completedHasMore && !completedLoadingMore"
                size="label"
                @click="loadMoreCompleted"
              >
                Load {{ Math.min(EXT_PAGE_SIZE, completedRows.length - completedVisible) }} more.
              </MpTextlink>
            </MpFlex>
          </MpFlex>

          <!-- Timeframe groups — indented to align with section header text -->
          <MpFlex v-if="groupOpen[sg.status] && sg.status !== 'Completed'" direction="column" gap="3" :class="css({ marginLeft: '28px' })">
            <MpFlex
              v-for="tg in visibleGroupsFor(sg)"
              :key="tg.timeframe"
              direction="column"
              :class="css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '8px', overflow: 'hidden' })"
            >
              <!-- Timeframe group header — click anywhere on it to collapse/expand
                   this group's own table, independent of the other groups. -->
              <MpFlex
                align="center"
                justify="space-between"
                :class="css({
                  paddingX: '4', paddingY: '3', bg: 'background.neutral.subtle', cursor: 'pointer',
                  borderBottomWidth: isTimeframeTableOpen(tg, sg) ? '1px' : '0', borderBottomStyle: 'solid', borderBottomColor: 'border.default',
                })"
                @click="toggleTimeframeTable(tg, sg)"
              >
                <MpFlex align="center" gap="4" :class="css({ flexGrow: '1' })">
                  <MpIcon
                    :name="isTimeframeTableOpen(tg, sg) ? 'caret-down' : 'caret-right'"
                    :class="css({ color: 'text.default', flexShrink: '0' })"
                  />
                  <MpFlex align="center" gap="6">
                    <MpFlex direction="column" gap="0">
                      <MpText size="label" weight="semiBold" :class="valueText">{{ tg.timeframe }}</MpText>
                      <MpText size="label-small" :class="captionText">Review timeframe</MpText>
                    </MpFlex>
                    <MpFlex direction="column" gap="0">
                      <MpText size="label" weight="semiBold" :class="valueText">{{ tg.employees.length }}</MpText>
                      <MpText size="label-small" :class="captionText">Employees</MpText>
                    </MpFlex>
                  </MpFlex>
                </MpFlex>
                <MpPopover is-close-on-select use-portal placement="bottom-end" @click.stop>
                  <MpPopoverTrigger>
                    <MpButton variant="ghost" :class="css({ minWidth: 'auto', padding: '2' })" @click.stop>
                      <MpIcon name="menu-kebab" />
                    </MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })" @click.stop>
                    <MpPopoverList>
                      <MpPopoverListItem @click.stop="viewTimeframeDetails(tg)">View details</MpPopoverListItem>
                      <MpPopoverListItem @click.stop="openExtend(tg)">Extend review period</MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpFlex>

              <!-- Employee × period table — fixed height shows 5 employees, scrolls internally -->
              <MpFlex v-if="isTimeframeTableOpen(tg, sg)" :class="css({ overflowX: 'auto', overflowY: 'auto', maxHeight: '878px' })">
                <MpTable :class="css({ width: '100%' })" :is-hoverable="false">
                  <MpTableHead>
                    <MpTableRow>
                      <MpTableCell as="th" :class="[extThCell, css({ width: '280px' })]">Employee</MpTableCell>
                      <MpTableCell v-if="!isSinglePeriod" as="th" :class="[extThCell, css({ width: '80px' })]">Period</MpTableCell>
                      <MpTableCell as="th" :class="[extThCell, css({ width: '140px' })]">Review period</MpTableCell>
                      <MpTableCell as="th" :class="[extThCell, css({ width: '220px' })]">Progress</MpTableCell>
                      <MpTableCell as="th" :class="[extThCell, css({ width: '120px' })]">Status</MpTableCell>
                      <MpTableCell as="th" :class="[actionHead, extThCell]" />
                    </MpTableRow>
                  </MpTableHead>
                  <MpTableBody>
                    <!-- Skeleton rows: initial load -->
                    <template v-if="groupLoading[tg.timeframe]">
                      <MpTableRow v-for="i in 3" :key="`skel-init-${i}`" :class="noHoverRow">
                        <MpTableCell as="td" :class="[tightCell, css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })]">
                          <MpFlex align="center" gap="3">
                            <MpSkeleton :class="css({ width: '40px', height: '40px', borderRadius: 'full', flexShrink: '0' })" />
                            <MpFlex direction="column" gap="1">
                              <MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" />
                              <MpSkeleton :class="css({ width: '80px', height: '12px', borderRadius: '4px' })" />
                            </MpFlex>
                          </MpFlex>
                        </MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '56px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '140px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '180px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '72px', height: '22px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="actionCell"><MpSkeleton :class="css({ width: '100px', height: '32px', borderRadius: '6px' })" /></MpTableCell>
                      </MpTableRow>
                    </template>

                    <!-- Actual employee rows (always shown once loaded; also shown during load-more) -->
                    <template v-if="!groupLoading[tg.timeframe]">
                      <template v-for="emp in getVisibleEmployees(tg)" :key="emp.id">
                        <MpTableRow v-for="(period, pi) in emp.periods" :key="period.label" :class="noHoverRow">
                        <!-- Employee cell: rowspan across all period rows, right border for visual grouping -->
                        <MpTableCell
                          v-if="pi === 0"
                          as="td"
                          :rowspan="emp.periods.length"
                          :class="[tightCell, isSinglePeriod ? empCellPlain : empCellBorder]"
                        >
                          <MpFlex align="start" gap="3">
                            <MpAvatar :name="emp.name" size="lg" />
                            <MpFlex direction="column" gap="1">
                              <MpText size="label" weight="semiBold" :class="valueText">{{ emp.name }}</MpText>
                              <MpText size="label-small" :class="captionText">{{ emp.id }} | {{ emp.jobTitle }}</MpText>
                              <MpBadge v-if="emp.extended" for="tableStatus" type="warning" :class="css({ alignSelf: 'start' })">Extended</MpBadge>
                            </MpFlex>
                          </MpFlex>
                        </MpTableCell>
                        <MpTableCell v-if="!isSinglePeriod" as="td" :class="tightCell">
                          <MpText size="label" :class="valueText">{{ period.label }}</MpText>
                        </MpTableCell>
                        <MpTableCell as="td" :class="tightCell">
                          <MpText size="label" :class="valueText">{{ period.reviewPeriod }}</MpText>
                        </MpTableCell>
                        <MpTableCell as="td" :class="tightCell">
                          <MpFlex direction="column" gap="1" :class="css({ width: '180px' })">
                            <MpFlex justify="space-between" align="center">
                              <MpText size="label-small" :class="valueText">{{ period.progressLabel }}</MpText>
                              <MpText size="label-small" :class="captionText">
                                {{ period.progressDone }} of {{ period.progressTotal }}
                              </MpText>
                            </MpFlex>
                            <MpProgress
                              variant="linear"
                              size="sm"
                              :class="tealProgress"
                              :value="period.progressTotal > 0 ? Math.round((period.progressDone / period.progressTotal) * 100) : 0"
                            />
                          </MpFlex>
                        </MpTableCell>
                        <MpTableCell as="td" :class="tightCell">
                          <MpBadge variant="tableStatus" :variantColor="periodStatusColor[period.status]" size="md">
                            {{ period.status }}
                          </MpBadge>
                        </MpTableCell>
                        <MpTableCell as="td" :class="actionCell">
                          <MpPopover is-close-on-select use-portal placement="bottom-end">
                            <MpPopoverTrigger>
                              <MpButton variant="secondary" size="md" right-icon="caret-down">Actions</MpButton>
                            </MpPopoverTrigger>
                            <MpPopoverContent :class="css({ minWidth: '160px' })">
                              <MpPopoverList>
                                <MpPopoverListItem @click="openReviewerList(emp)">View reviewer</MpPopoverListItem>
                                <MpPopoverListItem>Set reviewer weight</MpPopoverListItem>
                                <MpPopoverListItem>Manage reviewer</MpPopoverListItem>
                                <MpPopoverListItem @click="askRemoveEmployee(tg, emp)">
                                  <span :class="css({ color: 'text.danger' })">Remove employee</span>
                                </MpPopoverListItem>
                              </MpPopoverList>
                            </MpPopoverContent>
                          </MpPopover>
                        </MpTableCell>
                      </MpTableRow>
                    </template>

                    <!-- Skeleton rows: progressive load-more (appended after existing rows) -->
                    <template v-if="groupLoadingMore[tg.timeframe]">
                      <MpTableRow v-for="i in 3" :key="`skel-more-${i}`" :class="noHoverRow">
                        <MpTableCell as="td" :class="[tightCell, css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })]">
                          <MpFlex align="center" gap="3">
                            <MpSkeleton :class="css({ width: '40px', height: '40px', borderRadius: 'full', flexShrink: '0' })" />
                            <MpFlex direction="column" gap="1">
                              <MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" />
                              <MpSkeleton :class="css({ width: '80px', height: '12px', borderRadius: '4px' })" />
                            </MpFlex>
                          </MpFlex>
                        </MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '56px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '140px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '180px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="tightCell"><MpSkeleton :class="css({ width: '72px', height: '22px', borderRadius: '4px' })" /></MpTableCell>
                        <MpTableCell as="td" :class="actionCell"><MpSkeleton :class="css({ width: '100px', height: '32px', borderRadius: '6px' })" /></MpTableCell>
                      </MpTableRow>
                    </template>
                    </template>
                  </MpTableBody>
                </MpTable>
              </MpFlex>
              <!-- Load more bar -->
              <MpFlex
                v-if="isTimeframeTableOpen(tg, sg)"
                align="center"
                gap="1"
                :class="css({ paddingX: '4', paddingY: '3' })"
              >
                <MpText size="label" :class="captionText">
                  Showing {{ Math.min(groupVisibleCount[tg.timeframe] ?? EXT_PAGE_SIZE, tg.employees.length) }} of {{ tg.employees.length }} employees.
                </MpText>
                <MpTextlink
                  v-if="hasMoreEmployees(tg) && !groupLoadingMore[tg.timeframe]"
                  size="label"
                  @click="loadMoreEmployees(tg)"
                >
                  Load {{ Math.min(EXT_PAGE_SIZE, tg.employees.length - (groupVisibleCount[tg.timeframe] ?? EXT_PAGE_SIZE)) }} more.
                </MpTextlink>
              </MpFlex>
            </MpFlex>

            <!-- Load more review timeframes — this section can group many at once -->
            <MpFlex v-if="hasMoreGroups(sg) || sectionGroupsLoadingMore[sg.status]" align="center" gap="1">
              <MpText size="label" :class="captionText">
                Showing {{ Math.min(sectionVisibleGroups[sg.status] ?? TIMEFRAME_GROUP_PAGE_SIZE, sg.groups.length) }} of {{ sg.groups.length }} review timeframes.
              </MpText>
              <MpTextlink
                v-if="hasMoreGroups(sg) && !sectionGroupsLoadingMore[sg.status]"
                size="label"
                @click="loadMoreGroups(sg)"
              >
                Load {{ Math.min(TIMEFRAME_GROUP_PAGE_SIZE, sg.groups.length - (sectionVisibleGroups[sg.status] ?? TIMEFRAME_GROUP_PAGE_SIZE)) }} more.
              </MpTextlink>
              <MpText v-else-if="sectionGroupsLoadingMore[sg.status]" size="label" :class="captionText">Loading…</MpText>
            </MpFlex>
          </MpFlex>
        </MpFlex>
      </MpFlex>
    </template>
    </template>

    <!-- Empty state: cycle exists but no review timeframe formed yet -->
    <template v-else>
      <MpFlex
        direction="column"
        align="center"
        justify="center"
        gap="4"
        :class="css({ paddingY: '20', textAlign: 'center' })"
      >
        <img
          :src="'/illustrations/empty-timeframe.png'"
          alt=""
          aria-hidden="true"
          :class="css({ height: '240px', width: 'auto' })"
        />
        <MpFlex direction="column" align="center" gap="1" :class="css({ maxWidth: '420px' })">
          <MpText :class="css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })">
            No review timeframe yet
          </MpText>
          <MpText size="label" :class="captionText">
            Review timeframes will appear here once employees are added to this cycle.
          </MpText>
        </MpFlex>
        <MpButton variant="primary" left-icon="add">Add employee</MpButton>
      </MpFlex>
    </template>
  </MpFlex>

  <!-- Employee list modal -->
  <!-- Reviewers modal: reviewers grouped per review method (method + weight),
       each reviewer with profile + own weight. -->
  <MpModal :is-open="reviewerModalOpen" is-centered @close="reviewerModalOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="css({ width: '560px', maxWidth: '90vw' })">
      <MpModalHeader>
        Reviewers
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody :class="css({ maxHeight: '70vh', overflowY: 'auto' })">
        <MpFlex
          v-if="reviewerModalMember"
          align="center"
          gap="3"
          :class="css({ paddingBottom: '4', marginBottom: '4', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })"
        >
          <MpAvatar :name="reviewerModalMember.name" size="lg" variant-color="gray" />
          <MpFlex direction="column" gap="0">
            <MpText size="label" weight="semiBold" :class="valueText">{{ reviewerModalMember.name }}</MpText>
            <MpText size="label-small" :class="captionText">{{ memberSub(reviewerModalMember) }}</MpText>
          </MpFlex>
        </MpFlex>

        <MpFlex direction="column" gap="6">
          <div v-for="g in reviewerGroups" :key="g.name">
            <MpText size="label" weight="semiBold" :class="[valueText, css({ display: 'block', marginBottom: '3' })]">
              {{ g.name }} ({{ formatWeight(g.weight) }}%)
            </MpText>
            <MpFlex direction="column" gap="3">
              <MpFlex
                v-for="(r, i) in g.reviewers"
                :key="`${g.name}-${i}`"
                align="center"
                justify="space-between"
                gap="4"
              >
                <MpFlex align="center" gap="3" :class="css({ minWidth: '0' })">
                  <MpAvatar :name="r.name" :src="r.photo" size="lg" variant-color="gray" />
                  <MpFlex direction="column" gap="0" :class="css({ minWidth: '0' })">
                    <MpText size="label" weight="semiBold" :class="valueText">{{ r.name }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ r.sub }}</MpText>
                  </MpFlex>
                </MpFlex>
                <MpText size="label" :class="[valueText, css({ flexShrink: '0', fontVariantNumeric: 'tabular-nums' })]">{{ formatWeight(r.weight) }}%</MpText>
              </MpFlex>
              <MpText v-if="!g.reviewers.length" size="label-small" :class="captionText">No reviewers assigned.</MpText>
            </MpFlex>
          </div>
        </MpFlex>
      </MpModalBody>
    </MpModalContent>
  </MpModal>

  <MpModal :is-open="employeeModalOpen" is-centered @close="employeeModalOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="css({ width: '640px', maxWidth: '90vw' })">
      <MpModalHeader>
        Employees
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody :class="css({ padding: '0' })">
        <MpTableContainer>
          <MpTable>
            <MpTableHead>
              <MpTableRow>
                <MpTableCell as="th">Employee</MpTableCell>
                <MpTableCell as="th" :class="actionHead">Status</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="emp in modalEmployees" :key="emp.id">
                <MpTableCell as="td" :class="tightCell">
                  <MpFlex align="center" gap="3">
                    <MpAvatar :name="emp.name" size="sm" />
                    <MpFlex direction="column" gap="0">
                      <MpText size="label" weight="semiBold" :class="valueText">{{ emp.name }}</MpText>
                      <MpText size="label-small" :class="captionText">
                        {{ emp.id }} · {{ emp.jobPosition }} · {{ emp.organization }}
                      </MpText>
                    </MpFlex>
                  </MpFlex>
                </MpTableCell>
                <MpTableCell as="td" :class="actionCell">
                  <MpBadge variant="tableStatus" :variantColor="employeeStatusColor[emp.status]" size="md">
                    {{ emp.status }}
                  </MpBadge>
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </MpModalBody>
    </MpModalContent>
  </MpModal>

  <!-- Extend review period modal -->
  <MpModal :is-open="extendModalOpen" is-centered @close="extendModalOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="css({ width: '600px', maxWidth: '90vw' })">
      <MpModalHeader>
        Extend review period
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <MpFlex direction="column" gap="5">
          <MpFlex direction="column" gap="1">
            <MpText size="label" weight="semiBold" :class="valueText">Review timeframe: {{ extendTimeframe?.timeframe }}</MpText>
            <MpText size="label-small" :class="captionText">
              Set a new end date for the period(s) you want to extend. Leave the rest unchanged. This applies to all {{ extendTimeframe?.employees.length }} employees in this timeframe.
            </MpText>
          </MpFlex>

          <MpFlex direction="column" gap="4">
            <MpFlex
              v-for="d in extendDrafts"
              :key="d.label"
              direction="column"
              gap="1"
            >
              <MpFlex align="start" gap="4">
                <MpFlex direction="column" gap="0" :class="css({ width: '150px', flexShrink: '0', paddingTop: '2' })">
                  <MpText size="label" weight="semiBold" :class="valueText">{{ d.label }}</MpText>
                  <MpText size="label-small" :class="captionText">{{ d.currentWindow }}</MpText>
                </MpFlex>
                <MpFormControl :id="`extend-${d.label}`" :is-invalid="!!draftError(d)" :class="css({ flex: '1' })">
                  <div @focusin="onPickerOpen(d)" @click.capture="onPickerOpen(d)">
                    <MpDatePicker
                      v-model="d.newEnd"
                      value-type="date"
                      format="D MMM YYYY"
                      placeholder="Select new end date"
                      use-portal
                      is-clearable
                      :is-show-shortcut="false"
                      :is-invalid="!!draftError(d)"
                      :disabled-date="(date: Date) => !!d.currentEnd && date < d.currentEnd"
                    />
                  </div>
                </MpFormControl>
              </MpFlex>
              <MpFlex :class="css({ paddingLeft: '170px' })">
                <MpText v-if="draftError(d)" size="label-small" :class="css({ color: 'text.critical' })">{{ draftError(d) }}</MpText>
                <MpText v-else-if="isExtended(d) && d.newEnd" size="label-small" :class="css({ color: 'text.success' })">New window: {{ d.startPart }} - {{ fmtDate(d.newEnd) }}</MpText>
              </MpFlex>
            </MpFlex>
          </MpFlex>
        </MpFlex>
      </MpModalBody>
      <MpModalFooter :class="css({ display: 'flex', gap: '3', justifyContent: 'flex-end' })">
        <MpButton variant="ghost" @click="extendModalOpen = false">Cancel</MpButton>
        <MpButton variant="primary" :is-disabled="!canExtend" @click="confirmExtend">Extend</MpButton>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>

  <!-- Remove employee confirmation -->
  <MpModal :is-open="removeEmployeeModalOpen" @close="cancelRemoveEmployee">
    <MpModalOverlay />
    <MpModalContent :class="css({ marginTop: '80px' })">
      <MpModalHeader>
        Remove employee?
        <MpModalCloseButton @click="cancelRemoveEmployee" />
      </MpModalHeader>
      <MpModalBody>
        <MpText :class="valueText">
          <strong>{{ employeeToRemove?.emp.name }}</strong> will be removed from the entire <strong>{{ employeeToRemove?.tg.timeframe }}</strong> review timeframe — including all of their review periods in it, not just this one.
        </MpText>
      </MpModalBody>
      <MpModalFooter :class="css({ display: 'flex', gap: '3', justifyContent: 'flex-end' })">
        <MpButton variant="ghost" @click="cancelRemoveEmployee">Cancel</MpButton>
        <MpButton variant="danger" @click="confirmRemoveEmployee">Remove</MpButton>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>
