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
  css,
} from '@mekari/pixel3'

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

const TIMEFRAME_MAP: Record<string, TfEmployee[]> = {
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
}

const allEmployees = computed(() => {
  const slug = String(route.params.timeframeId)
  return TIMEFRAME_MAP[slug] ?? []
})

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
const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2' })
const thCell = css({ bg: 'background.neutral.hovered' })
const empCell = css({
  borderRightWidth: '1px',
  borderRightStyle: 'solid',
  borderRightColor: 'border.default',
  verticalAlign: 'top',
})
// Progress fill forced to green.700 (overrides the default brand-blue fill)
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'green.700' } })
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

  <!-- Tabs live outside the stage, teleported to #page-tabs in the layout -->
  <Teleport to="#page-tabs" defer>
    <MpFlex
      :class="css({
        paddingY: '3',
        paddingX: '1',
        borderBottomWidth: '2px',
        borderBottomStyle: 'solid',
        borderBottomColor: 'border.brand',
        marginBottom: '-1px',
      })"
    >
      <MpText size="label" :class="css({ color: 'text.brand' })">Manager review</MpText>
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

      <MpFlex align="center" :class="css({ paddingY: '2' })">
        <MpText size="label" :class="[labelText, css({ width: '160px', flexShrink: '0' })]">Review timeframe</MpText>
        <MpText size="label" :class="valueText">{{ route.query.timeframe || '6 Jan - 5 Jul 2026' }}</MpText>
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
            <MpTableCell as="th" :class="[thCell, css({ width: '14%' })]">
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
                <MpTextlink size="small">{{ period.reviewersCount }} Reviewers</MpTextlink>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="[valueText, css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '120px' })]">{{ period.reviewerWeight }}</MpText>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="1" :class="css({ width: '100%' })">
                  <MpFlex justify="space-between" align="center" gap="2">
                    <MpText size="label-small" :class="valueText">{{ period.progressLabel }}</MpText>
                    <MpText size="label-small" :class="[captionText, css({ flexShrink: '0' })]">
                      {{ period.progressDone }} of {{ period.progressTotal }}
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
                      <MpPopoverListItem>View reviewer</MpPopoverListItem>
                      <MpPopoverListItem>Set reviewer weight</MpPopoverListItem>
                      <MpPopoverListItem>Manage reviewer</MpPopoverListItem>
                      <MpPopoverListItem>Remove employee</MpPopoverListItem>
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
</template>
