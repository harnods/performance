<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpIcon,
  MpAvatar,
  MpTextlink,
  MpProgress,
  MpBadge,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTooltip,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpFormControl,
  MpDatePicker,
  toast,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES } from '~/utils/employees'
import { methodHasReviewerWeights } from '~/composables/useReviewers'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' },
})

const route = useRoute()

interface TfPeriod {
  label: string
  reviewWindow: string
  reviewersCount: number
  reviewerWeight: string
  progressLabel: string
  progressDone: number
  progressTotal: number
}

interface TfEmployee {
  name: string
  id: string
  jobTitle: string
  organization: string
  extended?: boolean
  periods: TfPeriod[]
}

function p(label: string, reviewWindow: string, done: number, total: number, weight = 'Equal weight (default)'): TfPeriod {
  const progressLabel = done === total ? 'Submitted' : done === 0 ? 'Not started' : 'Pending'
  return { label, reviewWindow, reviewersCount: total, reviewerWeight: weight, progressDone: done, progressTotal: total, progressLabel }
}

// reactive() so "Extend review timeframe" edits to each period's window date reflect live in the table.
const TIMEFRAME_MAP: Record<string, TfEmployee[]> = reactive({
  '6-jan-5-jul-2026': [
    { name: 'Eka Setiawan',    id: 'CP081', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Rina Kusumawati', id: 'CP082', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Denny Pratama',   id: 'CP083', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 1, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Sari Dewi',       id: 'CP084', jobTitle: 'Cook',          organization: 'Kitchen',        periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Ahmad Fauzi',     id: 'CP085', jobTitle: 'Service Crew',  organization: 'Front of House', periods: [ p('Period 1', '4 - 6 Mar 2026', 2, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Mega Lestari',    id: 'CP086', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Riko Firmansyah', id: 'CP087', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Yuni Rahayu',     id: 'CP088', jobTitle: 'Kitchen Staff', organization: 'Kitchen',        periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 0, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Bagas Wicaksono', id: 'CP089', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Fitri Handayani', id: 'CP090', jobTitle: 'Service Crew',  organization: 'Front of House', periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Galih Pratomo',    id: 'CP092', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 2, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Hesti Wulandari',  id: 'CP093', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Indra Maulana',    id: 'CP094', jobTitle: 'Cook',          organization: 'Kitchen',        periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 1, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Joko Santoso',     id: 'CP095', jobTitle: 'Kitchen Staff', organization: 'Kitchen',        periods: [ p('Period 1', '4 - 6 Mar 2026', 3, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
    { name: 'Kartika Sari',     id: 'CP096', jobTitle: 'Service Crew',  organization: 'Front of House', periods: [ p('Period 1', '4 - 6 Mar 2026', 2, 3), p('Period 2', '4 - 6 May 2026', 3, 3), p('Final', '3 - 5 Jul 2026', 0, 3) ] },
  ],
  '1-30-jun-2026': [
    {
      name: 'Bayu Nugroho', id: 'CP091', jobTitle: 'Cook', organization: 'Kitchen', extended: true,
      periods: [
        p('Final', '28 - 30 Jun 2026', 0, 1),
      ],
    },
  ],
  '1-dec-2025-31-may-2026': [
    {
      name: 'Bayu Nugroho', id: 'CP091', jobTitle: 'Cook', organization: 'Kitchen',
      periods: [
        p('Period 1', '28 Jan - 1 Feb 2026', 1, 1),
        p('Period 2', '1 - 3 Apr 2026',      1, 1),
        p('Final',    '29 - 31 May 2026',    1, 1),
      ],
    },
  ],
  '4-nov-2025-3-may-2026': [
    { name: 'Agus Salim',      id: 'CP071', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Dewi Puspita',    id: 'CP072', jobTitle: 'Kitchen Staff', organization: 'Kitchen',        periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Hendro Susanto',  id: 'CP073', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 1, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Lina Marlina',    id: 'CP074', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Wahyu Nugroho',   id: 'CP075', jobTitle: 'Service Crew', organization: 'Front of House', periods: [ p('Period 1', '2 - 4 Jan 2026', 2, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Tari Setyowati',  id: 'CP076', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Faisal Rahman',   id: 'CP077', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Nita Anggraini',  id: 'CP078', jobTitle: 'Cook',          organization: 'Kitchen',        periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 2, 3) ] },
    { name: 'Dodi Kurniawan',  id: 'CP079', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
    { name: 'Putri Wulandari', id: 'CP080', jobTitle: 'Service Crew', organization: 'Front of House', periods: [ p('Period 1', '2 - 4 Jan 2026', 3, 3), p('Period 2', '1 - 3 Mar 2026', 3, 3), p('Final', '1 - 3 May 2026', 3, 3) ] },
  ],
  // Contract Evaluation – Batch Jun 2026: single review period, window 25–30 Sep 2026 (future).
  // Today = 15 Jun 2026 → window not open yet, so every reviewer is Not started (0 of 3).
  '1-jun-30-sep-2026': [
    { name: 'Andi Saputra',   id: 'CP101', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Final review', '25 - 30 Sep 2026', 0, 3) ] },
    { name: 'Bunga Lestari',  id: 'CP102', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Final review', '25 - 30 Sep 2026', 0, 3) ] },
    { name: 'Candra Wijaya',  id: 'CP103', jobTitle: 'Cook',          organization: 'Kitchen',        periods: [ p('Final review', '25 - 30 Sep 2026', 0, 3) ] },
    { name: 'Dina Maharani',  id: 'CP104', jobTitle: 'Service Crew',  organization: 'Front of House', periods: [ p('Final review', '25 - 30 Sep 2026', 0, 3) ] },
    { name: 'Eko Prasetyo',   id: 'CP105', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Final review', '25 - 30 Sep 2026', 0, 3) ] },
    { name: 'Fani Oktaviani', id: 'CP106', jobTitle: 'Kitchen Staff', organization: 'Kitchen',        periods: [ p('Final review', '25 - 30 Sep 2026', 0, 3) ] },
  ],
  // Contract Evaluation – Batch Mar 2026: single review window 5–10 Jun 2026 (closed).
  // Submitted = reviewed in time; partial = window passed unsubmitted (expired).
  '1-mar-10-jun-2026': [
    { name: 'Krisna Aditya',   id: 'CP111', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Final review', '5 - 10 Jun 2026', 3, 3) ] },
    { name: 'Laras Wening',    id: 'CP112', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Final review', '5 - 10 Jun 2026', 3, 3) ] },
    { name: 'Made Sukarya',    id: 'CP113', jobTitle: 'Cook',          organization: 'Kitchen',        periods: [ p('Final review', '5 - 10 Jun 2026', 2, 3) ] },
    { name: 'Nadia Salsabila', id: 'CP114', jobTitle: 'Service Crew',  organization: 'Front of House', periods: [ p('Final review', '5 - 10 Jun 2026', 3, 3) ] },
    { name: 'Oka Mahendra',    id: 'CP115', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Final review', '5 - 10 Jun 2026', 1, 3) ] },
  ],
  // Probation Evaluation – Batch Sep 2025: multiple period, all windows in the past → completed.
  '1-sep-2025-28-feb-2026': [
    { name: 'Galuh Pradana',    id: 'CP061', jobTitle: 'Barista',       organization: 'Bar',            periods: [ p('Period 1', '1 - 3 Nov 2025', 3, 3), p('Period 2', '1 - 3 Jan 2026', 3, 3), p('Final', '26 - 28 Feb 2026', 3, 3) ] },
    { name: 'Hana Pertiwi',     id: 'CP062', jobTitle: 'Kasir',         organization: 'Front of House', periods: [ p('Period 1', '1 - 3 Nov 2025', 3, 3), p('Period 2', '1 - 3 Jan 2026', 2, 3), p('Final', '26 - 28 Feb 2026', 3, 3) ] },
    { name: 'Irfan Hidayat',    id: 'CP063', jobTitle: 'Cook',          organization: 'Kitchen',        periods: [ p('Period 1', '1 - 3 Nov 2025', 3, 3), p('Period 2', '1 - 3 Jan 2026', 3, 3), p('Final', '26 - 28 Feb 2026', 3, 3) ] },
    { name: 'Jelita Anggraini', id: 'CP064', jobTitle: 'Service Crew',  organization: 'Front of House', periods: [ p('Period 1', '1 - 3 Nov 2025', 3, 3), p('Period 2', '1 - 3 Jan 2026', 3, 3), p('Final', '26 - 28 Feb 2026', 2, 3) ] },
  ],
})

const allEmployees = computed(() => {
  const slug = String(route.params.timeframeId)
  return TIMEFRAME_MAP[slug] ?? []
})

// ── Extend review timeframe ──────────────────────────────────────────────
// Extends a period's review WINDOW (its end date) for every employee on this
// timeframe. The timeframe span itself is unchanged. Each period is extended
// independently; leaving a row blank skips it. Same behavior as the "Extend
// review period" action on the review cycle details page.
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
const extendDrafts = ref<ExtendDraft[]>([])

function openExtend() {
  const periods = allEmployees.value[0]?.periods ?? []
  extendDrafts.value = periods.map((p) => {
    const currentEnd = parsePeriodEnd(p.reviewWindow)
    return {
      label: p.label,
      currentWindow: p.reviewWindow,
      startPart: p.reviewWindow.split(' - ')[0] ?? '',
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
  if (!canExtend.value) return
  extendDrafts.value.forEach((d) => {
    if (!isExtended(d) || !d.newEnd) return
    const newWindow = `${d.startPart} - ${fmtDate(d.newEnd)}`
    allEmployees.value.forEach((emp) => {
      const period = emp.periods.find(p => p.label === d.label)
      if (period) period.reviewWindow = newWindow
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

// Single-review timeframe: every employee has exactly one period → hide the Period column.
const isSinglePeriod = computed(() =>
  allEmployees.value.length > 0 && allEmployees.value.every(e => e.periods.length === 1)
)

const searchQuery = ref('')
const statusFilter = ref('')
const filteredEmployees = computed(() => {
  if (!searchQuery.value) return allEmployees.value
  const q = searchQuery.value.toLowerCase()
  return allEmployees.value.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.id.toLowerCase().includes(q) ||
    e.organization.toLowerCase().includes(q)
  )
})

const pageSize = ref('10')
const currentPage = ref(1)

const pageSizeNum = computed(() => Number(pageSize.value))
const totalEmployees = computed(() => filteredEmployees.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalEmployees.value / pageSizeNum.value)))

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSizeNum.value
  return filteredEmployees.value.slice(start, start + pageSizeNum.value)
})

const startItem = computed(() =>
  totalEmployees.value === 0 ? 0 : (currentPage.value - 1) * pageSizeNum.value + 1
)
const endItem = computed(() => Math.min(currentPage.value * pageSizeNum.value, totalEmployees.value))

function goToPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

watch([searchQuery, pageSize], () => { currentPage.value = 1 })

const valueText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const labelText = css({ color: 'text.secondary' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const thCell = css({ bg: 'background.neutral.hovered' })
const empCell = css({
  borderRightWidth: '1px',
  borderRightStyle: 'solid',
  borderRightColor: 'border.default',
  verticalAlign: 'top',
})
// Progress fill forced to green.700 (overrides the default brand-blue fill)
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'teal.400' } })

// Review methods configured on this cycle → one tab each (accurate to the
// cycle's Review methods). The active tab scopes the reviewer actions below.
const reviewMethods = ['Manager review', '360-degree review', 'Self review']
const activeMethod = ref(reviewMethods[0])
const tabBar = css({ display: 'flex', gap: '5', paddingInline: '1' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', marginBottom: '-1px', whiteSpace: 'nowrap',
} as const
const tabItem = css({ ...tabItemBase, color: 'text.secondary', borderBottomColor: 'transparent', _hover: { color: 'text.default' } })
const tabActive = css({ ...tabItemBase, color: 'text.brand', fontWeight: '600', borderBottomColor: 'border.brand' })

// Shared reviewer data layer — same store/generation as the cycle detail page,
// keyed by the cycle id in the path so weights/rosters are consistent. The
// table below is driven by the ACTIVE method tab.
const methodWeights: Record<string, number> = { 'Manager review': 50, '360-degree review': 30, 'Self review': 20 }
const { resolvedGroupsFor, groupFor, reviewerCountFor, memberKey, saveConfigs } = useReviewers({
  methods: reviewMethods,
  methodWeights,
  cycleKey: () => String(route.params.id),
})
const reviewerModalsRef = ref()
// Per-reviewer weight (hence the weight column + Set-weight action) only applies
// to Manager review; other tabs hide both.
const showWeightColumn = computed(() => methodHasReviewerWeights(activeMethod.value))
// Manage reviewer is N/A for Self review (the reviewer is the employee).
const canManageMethod = computed(() => activeMethod.value !== 'Self review')
function memberOf(emp: { id: string, name: string, jobTitle?: string, organization?: string }) {
  return { id: emp.id, name: emp.name, jobTitle: emp.jobTitle, organization: emp.organization }
}
// Reviewers for this employee under the active method tab (same across the
// timeframe's periods — reviewers are per timeframe, not per period).
function methodGroup(emp: { id: string, name: string, jobTitle?: string, organization?: string }) {
  return groupFor(memberOf(emp), activeMethod.value)
}
function methodReviewerCount(emp: { id: string, name: string, jobTitle?: string, organization?: string }) {
  return reviewerCountFor(memberOf(emp), activeMethod.value)
}
// Singular for a single reviewer (e.g. Self review) — "1 Reviewer" not "1 Reviewers".
function reviewerCountLabel(emp: { id: string, name: string, jobTitle?: string, organization?: string }) {
  const n = methodReviewerCount(emp)
  return `${n} ${n === 1 ? 'Reviewer' : 'Reviewers'}`
}
function weightLabel(emp: { id: string, name: string, jobTitle?: string, organization?: string }) {
  return methodGroup(emp)?.useCustom ? 'Custom weight' : 'Equal weight'
}
// Progress bar keeps the period's raw ratio; the count reflects this method's reviewers.
function methodDone(emp: { id: string, name: string, jobTitle?: string, organization?: string }, done: number, total: number) {
  const t = methodReviewerCount(emp)
  return total > 0 ? Math.round((done / total) * t) : 0
}
function openView(emp: { id: string, name: string, jobTitle?: string, organization?: string }) { reviewerModalsRef.value?.openView(memberOf(emp)) }
function openWeight(emp: { id: string, name: string, jobTitle?: string, organization?: string }) { reviewerModalsRef.value?.openWeight(memberOf(emp)) }

// ── Manage reviewer via the two-column SelectEmployeesDrawer (per active method,
//    persisted). Roster is stored as employee codes; the drawer works in employee
//    ids, so map both ways through EMPLOYEES.
const manageDrawerOpen = ref(false)
const manageDrawerMember = ref<ReturnType<typeof memberOf> | null>(null)
const manageInitialIds = ref<string[]>([])
const manageDrawerTitle = computed(() =>
  manageDrawerMember.value ? `Manage ${activeMethod.value.toLowerCase()} reviewers — ${manageDrawerMember.value.name}` : 'Manage reviewers')
const manageDrawerDesc = computed(() =>
  `Add or remove reviewers for ${activeMethod.value}. Changes reset this method's weights to an equal distribution.`)
function codeToId(code: string) { return EMPLOYEES.find(e => e.code === code)?.id }
function idToCode(id: string) { return EMPLOYEES.find(e => e.id === id)?.code }
function openManage(emp: { id: string, name: string, jobTitle?: string, organization?: string }) {
  const member = memberOf(emp)
  manageDrawerMember.value = member
  const roster = groupFor(member, activeMethod.value)?.reviewers ?? []
  manageInitialIds.value = roster.map(r => codeToId(r.code)).filter((v): v is string => Boolean(v))
  manageDrawerOpen.value = true
}
function onManageContinue(ids: string[]) {
  const member = manageDrawerMember.value
  if (!member) return
  const codes = ids.map(idToCode).filter((v): v is string => Boolean(v))
  // Save only the active method; the store merges so other methods stay intact.
  saveConfigs(memberKey(member), { [activeMethod.value]: { useCustom: false, weights: {}, roster: codes } })
  toast.notify({ id: 'reviewer-roster-saved', position: 'top-center', variant: 'success', title: 'Reviewers updated' })
}

// ── Remove employee from this timeframe (mirrors the cycle-details page). Mutates
//    the reactive TIMEFRAME_MAP entry so the table + counts update live.
const removeEmployeeModalOpen = ref(false)
const employeeToRemove = ref<TfEmployee | null>(null)
const timeframeLabel = computed(() => String(route.query.timeframe || '6 Jan - 5 Jul 2026'))
function askRemoveEmployee(emp: TfEmployee) {
  employeeToRemove.value = emp
  removeEmployeeModalOpen.value = true
}
function cancelRemoveEmployee() {
  removeEmployeeModalOpen.value = false
  employeeToRemove.value = null
}
function confirmRemoveEmployee() {
  const emp = employeeToRemove.value
  const slug = String(route.params.timeframeId)
  if (emp && TIMEFRAME_MAP[slug]) {
    TIMEFRAME_MAP[slug] = TIMEFRAME_MAP[slug].filter(e => e.id !== emp.id)
  }
  removeEmployeeModalOpen.value = false
  employeeToRemove.value = null
  toast.notify({ id: 'remove-employee-from-timeframe', position: 'top-center', variant: 'success', title: `${emp?.name} removed from this timeframe` })
}
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpPopover is-close-on-select use-portal placement="bottom-end">
      <MpPopoverTrigger>
        <MpButton variant="secondary" right-icon="caret-down">Import</MpButton>
      </MpPopoverTrigger>
      <MpPopoverContent :class="css({ minWidth: '200px' })">
        <MpPopoverList>
          <MpPopoverListItem>Import employees</MpPopoverListItem>
          <div :class="css({ width: '100%', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'border.default', marginY: '1' })" />
          <MpPopoverListItem>Import reviewers</MpPopoverListItem>
          <MpPopoverListItem>Import reviewer weight</MpPopoverListItem>
          <MpPopoverListItem>Import adjustment score</MpPopoverListItem>
          <MpPopoverListItem>Sync discipline data</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
    <MpButton variant="primary">Add employee</MpButton>
  </Teleport>

  <!-- Tabs live outside the stage, teleported to #page-tabs in the layout.
       One tab per review method configured on this cycle. -->
  <Teleport to="#page-tabs" defer>
    <MpFlex :class="tabBar">
      <button
        v-for="m in reviewMethods"
        :key="m"
        type="button"
        :class="activeMethod === m ? tabActive : tabItem"
        @click="activeMethod = m"
      >
        {{ m }}
      </button>
    </MpFlex>
  </Teleport>

  <MpFlex direction="column" gap="0">
    <!-- Header info rows -->
    <MpFlex direction="column" :class="css({ gap: '0', marginBottom: '6' })">
      <MpFlex align="center" :class="css({ paddingY: '2' })">
        <MpText size="label" :class="[labelText, css({ width: '160px', flexShrink: '0' })]">Template</MpText>
        <MpFlex align="center" gap="3">
          <MpText size="label" :class="valueText">Talenta template - Probation Evaluation</MpText>
          <MpFlex align="center" gap="1">
            <MpIcon name="edit" size="sm" :class="css({ color: 'icon.brand', flexShrink: '0' })" />
            <MpTextlink size="small">Edit template</MpTextlink>
          </MpFlex>
        </MpFlex>
      </MpFlex>

      <MpFlex align="start" :class="css({ paddingY: '2' })">
        <MpText size="label" :class="[labelText, css({ width: '160px', flexShrink: '0' })]">Review timeframe</MpText>
        <MpFlex direction="column" gap="1">
          <MpText size="label" :class="valueText">{{ route.query.timeframe || '6 Jan - 5 Jul 2026' }}</MpText>
          <MpTextlink size="small" @click="openExtend">Extend review timeframe</MpTextlink>
        </MpFlex>
      </MpFlex>

      <MpFlex align="center" :class="css({ paddingY: '2' })">
        <MpText size="label" :class="[labelText, css({ width: '160px', flexShrink: '0' })]">Review window</MpText>
        <MpText size="label" :class="valueText">{{ route.query.reviewWindow || '4 - 6 Mar 2026' }}</MpText>
      </MpFlex>
    </MpFlex>

    <!-- Filter bar -->
    <MpFlex align="center" justify="space-between" :class="css({ marginBottom: '4' })">
      <PxSelectPopover
        v-model="statusFilter"
        :options="[
          { value: 'submitted', label: 'Submitted' },
          { value: 'pending', label: 'Pending' },
          { value: 'not-started', label: 'Not started' },
        ]"
        placeholder="All status"
        width="200px"
        :is-clearable="true"
      />
      <MpFlex :class="css({ width: '240px' })">
        <MpInputGroup>
          <MpInputLeftAddon>
            <MpIcon name="search" />
          </MpInputLeftAddon>
          <MpInput v-model="searchQuery" placeholder="Search employee..." />
        </MpInputGroup>
      </MpFlex>
    </MpFlex>

    <!-- Table: fixed layout forces browser to respect column widths exactly -->
    <MpTableContainer>
      <MpTable :is-hoverable="false" :class="css({ tableLayout: 'fixed', width: '100%' })">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" :class="[thCell, css({ width: '22%' })]">Employee</MpTableCell>
            <MpTableCell v-if="!isSinglePeriod" as="th" :class="[thCell, css({ width: '7%' })]">Period</MpTableCell>
            <MpTableCell as="th" :class="[thCell, css({ width: '13%' })]">Review window</MpTableCell>
            <MpTableCell as="th" :class="[thCell, css({ width: '9%' })]">Reviewers</MpTableCell>
            <MpTableCell v-if="showWeightColumn" as="th" :class="[thCell, css({ width: '14%' })]">
              <MpFlex align="center" gap="1">
                <span>Reviewer weight</span>
                <MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary', flexShrink: '0' })" />
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="th" :class="[thCell, css({ width: '12%' })]">Status</MpTableCell>
            <MpTableCell as="th" :class="thCell" />
            <MpTableCell as="th" :class="[thCell, css({ width: '136px' })]" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <template v-for="emp in paginatedEmployees" :key="emp.id">
            <!-- Employee with no periods assigned -->
            <MpTableRow v-if="emp.periods.length === 0">
              <MpTableCell as="td" :class="[tightCell, empCell]">
                <MpFlex align="start" gap="3">
                  <MpAvatar :name="emp.name" size="lg" />
                  <MpFlex direction="column" gap="0">
                    <MpText size="label" weight="semiBold" :class="valueText">{{ emp.name }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ emp.id }} | {{ emp.jobTitle }} | {{ emp.organization }}</MpText>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" colspan="7" :class="tightCell">
                <MpText size="label-small" :class="captionText">No periods assigned</MpText>
              </MpTableCell>
            </MpTableRow>

            <!-- Employee with periods -->
            <MpTableRow
              v-else
              v-for="(period, pi) in emp.periods"
              :key="`${emp.id}-${period.label}`"
            >
              <!-- Employee cell: rowspan across all period rows, right border for visual grouping.
                   Single-period tables have no Period column, so the grouping border is dropped. -->
              <MpTableCell
                v-if="pi === 0"
                as="td"
                :rowspan="emp.periods.length"
                :class="[tightCell, isSinglePeriod ? '' : empCell]"
              >
                <MpFlex align="start" gap="3">
                  <MpAvatar :name="emp.name" size="lg" />
                  <MpFlex direction="column" gap="1">
                    <MpText size="label" weight="semiBold" :class="valueText">{{ emp.name }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ emp.id }} | {{ emp.jobTitle }} | {{ emp.organization }}</MpText>
                    <MpBadge v-if="emp.extended" for="tableStatus" type="warning" :class="css({ alignSelf: 'start' })">Extended</MpBadge>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>

              <MpTableCell v-if="!isSinglePeriod" as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ period.label }}</MpText>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ period.reviewWindow }}</MpText>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <MpTextlink size="small" as="button" @click="openView(emp)">{{ reviewerCountLabel(emp) }}</MpTextlink>
              </MpTableCell>

              <MpTableCell v-if="showWeightColumn" as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ weightLabel(emp) }}</MpText>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="1" :class="css({ width: '100%' })">
                  <MpFlex justify="space-between" align="center" gap="2">
                    <MpText size="label-small" :class="valueText">{{ period.progressLabel }}</MpText>
                    <MpText size="label-small" :class="[captionText, css({ flexShrink: '0' })]">
                      {{ methodDone(emp, period.progressDone, period.progressTotal) }} of {{ methodReviewerCount(emp) }}
                    </MpText>
                  </MpFlex>
                  <MpProgress
                    variant="linear"
                    size="sm"
                    :class="tealProgress"
                    :value="String(Math.round((period.progressDone / period.progressTotal) * 100))"
                  />
                </MpFlex>
              </MpTableCell>

              <MpTableCell as="td" />

              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem @click="openView(emp)">View reviewer</MpPopoverListItem>
                      <MpPopoverListItem v-if="showWeightColumn" @click="openWeight(emp)">Set reviewer weight</MpPopoverListItem>
                      <MpPopoverListItem v-if="canManageMethod" @click="openManage(emp)">Manage reviewer</MpPopoverListItem>
                      <MpPopoverListItem @click="askRemoveEmployee(emp)">
                        <span :class="css({ color: 'text.danger' })">Remove employee</span>
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </template>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <!-- Pagination -->
    <MpFlex justify="space-between" align="center" :class="css({ paddingX: '2', height: '52px', flexShrink: '0' })">
      <MpFlex align="center">
        <MpText :class="css({ pr: '1', pl: '1', color: 'text.secondary' })">Rows per page</MpText>
        <MpPopover is-close-on-select>
          <MpPopoverTrigger>
            <MpButton size="sm" variant="ghost" :class="css({ h: '7', display: 'inline-flex', pl: '3', pr: '2', py: '2' })">
              <MpText>{{ pageSize }}</MpText>
              <MpIcon name="chevrons-down" size="sm" />
            </MpButton>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem v-for="s in ['5', '10', '25', '50']" :key="s" :is-active="pageSize === s" @click="pageSize = s">{{ s }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpText :class="css({ pl: '5', py: '1', color: 'text.secondary' })">
          Showing {{ startItem }}-{{ endItem }} of {{ totalEmployees }}
        </MpText>
      </MpFlex>
      <MpFlex align="center">
        <MpTooltip label="Prev page" position="bottom">
          <MpButton variant="ghost" left-icon="chevrons-left" size="sm" :is-disabled="currentPage === 1" @click="goToPage(currentPage - 1)" />
        </MpTooltip>
        <MpText :class="css({ px: '2', color: 'text.secondary' })">{{ currentPage }} of {{ totalPages }} page</MpText>
        <MpTooltip label="Next page" position="bottom">
          <MpButton variant="ghost" left-icon="chevrons-right" size="sm" :is-disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)" />
        </MpTooltip>
      </MpFlex>
    </MpFlex>
  </MpFlex>

  <!-- Extend review timeframe modal -->
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
            <MpText size="label" weight="semiBold" :class="valueText">Review timeframe: {{ route.query.timeframe || '6 Jan - 5 Jul 2026' }}</MpText>
            <MpText size="label-small" :class="captionText">
              Set a new end date for the period(s) you want to extend. Leave the rest unchanged. This applies to all {{ allEmployees.length }} employees in this timeframe.
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
        <MpButton variant="secondary" @click="extendModalOpen = false">Cancel</MpButton>
        <MpButton variant="primary" :is-disabled="!canExtend" @click="confirmExtend">Extend</MpButton>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>

  <ReviewerModals
    ref="reviewerModalsRef"
    :method-weights="methodWeights"
    :methods="[activeMethod]"
    :cycle-key="String(route.params.id)"
  />

  <!-- Manage reviewer (per active method) — two-column select-employee drawer. -->
  <SelectEmployeesDrawer
    v-model:is-open="manageDrawerOpen"
    drawer-id="drawer-manage-reviewer"
    :title="manageDrawerTitle"
    :description="manageDrawerDesc"
    :initial-selected="manageInitialIds"
    :is-required="true"
    @continue="onManageContinue"
  />

  <!-- Remove employee confirmation (mirrors cycle-details page). -->
  <MpModal :is-open="removeEmployeeModalOpen" @close="cancelRemoveEmployee">
    <MpModalOverlay />
    <MpModalContent :class="css({ marginTop: '80px' })">
      <MpModalHeader>
        Remove employee?
        <MpModalCloseButton @click="cancelRemoveEmployee" />
      </MpModalHeader>
      <MpModalBody>
        <MpText :class="valueText">
          <strong>{{ employeeToRemove?.name }}</strong> will be removed from the entire <strong>{{ timeframeLabel }}</strong> review timeframe — including all of their review periods in it, not just this one.
        </MpText>
      </MpModalBody>
      <MpModalFooter :class="css({ display: 'flex', gap: '3', justifyContent: 'flex-end' })">
        <MpButton variant="ghost" @click="cancelRemoveEmployee">Cancel</MpButton>
        <MpButton variant="danger" @click="confirmRemoveEmployee">Remove</MpButton>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>
