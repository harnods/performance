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
  MpModalCloseButton,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Review Cycle', to: '/reviews/review-cycles' },
})

const route = useRoute()
const cycleName = computed(() => String(route.query.name || 'evaveavava'))
const cyclePurpose = computed(() => String(route.query.purpose || 'evaluation'))

const purposeLabel: Record<string, string> = {
  performance: 'Performance review',
  competency: 'Competency review',
  evaluation: 'Evaluation review',
}

// Mock: single employment status for evaluation (only 1 can be selected)
const employmentStatus = 'Probation' // 'Probation' | 'Contract'

// Mock: active review aspects
const activeAspects = ['Goal', 'Attendance'] // can be [], ['Goal'], ['Goal','Attendance','Reprimand'], etc.
const scoreCalc = 'weight' // 'weight' | 'sum'
const weights = { review: 60, goal: 30, attendance: 10, reprimand: 0 }

const cyclePeriodText = computed(() => {
  const purpose = cyclePurpose.value
  if (purpose !== 'evaluation') return purpose === 'performance' ? '90 days' : '60 days'
  const suffix = employmentStatus === 'Probation'
    ? "before employee's probation ends"
    : "before employee's contract ends"
  return `14 days ${suffix}`
})

const reviewAspectsText = computed(() =>
  activeAspects.length === 0 ? 'None' : activeAspects.join(', ')
)

interface InfoRow {
  label: string
  value: string
  bold?: boolean
  editable?: boolean
}

const infoRows = computed<InfoRow[]>(() => {
  const purpose = cyclePurpose.value
  const isEval = purpose === 'evaluation'
  const rows: InfoRow[] = [
    { label: 'Cycle name', value: cycleName.value, editable: true },
    { label: 'Purpose', value: purposeLabel[purpose] || 'Evaluation review' },
    { label: 'Publish score', value: 'Complete review' },
    { label: 'Cycle period', value: cyclePeriodText.value, bold: isEval },
    { label: 'Employment status', value: isEval ? employmentStatus : (purpose === 'performance' ? 'Permanent' : 'All status') },
    { label: 'Deduction score', value: 'On' },
    { label: 'Review aspects', value: reviewAspectsText.value },
  ]
  if (isEval && activeAspects.length > 0) {
    rows.push({ label: 'Final score calculation', value: scoreCalc === 'weight' ? 'Use weight' : 'Simple sum' })
    if (scoreCalc === 'weight') {
      rows.push({ label: 'Review weight', value: `${weights.review}%` })
      if (activeAspects.includes('Goal')) rows.push({ label: 'Goal weight', value: `${weights.goal}%` })
      if (activeAspects.includes('Attendance')) rows.push({ label: 'Attendance weight', value: `${weights.attendance}%` })
      if (activeAspects.includes('Reprimand')) rows.push({ label: 'Reprimand weight', value: `${weights.reprimand}%` })
    }
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

</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="secondary" right-icon="newtab">Approval settings</MpButton>
    <MpButton variant="secondary">Edit cycle</MpButton>
  </Teleport>

  <MpFlex v-if="cyclePurpose === 'evaluation'" direction="column" gap="6">
    <!-- Cycle info — no card, floats on neutral background -->
    <MpFlex direction="column" gap="4">
      <MpText as="h2" size="h2" weight="semiBold" :class="css({ fontSize: 'xl', color: 'text.default' })">
        Cycle info
      </MpText>

      <MpFlex direction="column" gap="3">
        <MpFlex
          v-for="row in infoRows"
          :key="row.label"
          align="center"
          gap="4"
        >
          <MpText
            size="label"
            :class="[labelText, css({ width: '200px', flexShrink: '0' })]"
          >
            {{ row.label }}
          </MpText>
          <MpText size="label" :class="valueText">
            <template v-if="row.bold">
              <strong>{{ row.value.split(' ').slice(0, 2).join(' ') }}</strong> {{ row.value.split(' ').slice(2).join(' ') }}
            </template>
            <template v-else>
              {{ row.value }}
            </template>
          </MpText>
          <MpButton
            v-if="row.editable"
            variant="ghost"
            size="sm"
            left-icon="edit"
            :class="css({ minWidth: 'auto', height: 'auto', padding: '0', lineHeight: '1' })"
          />
        </MpFlex>
      </MpFlex>
    </MpFlex>

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

    <!-- Period table -->
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
                    :value="Math.round((row.reviewDone / row.reviewTotal) * 100)"
                    :style="{ '--mp-progress-color': 'var(--mp-colors-teal-500)' }"
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
                  <MpPopoverContent>
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
  </MpFlex>

  <!-- Employee list modal -->
  <MpModal :is-open="employeeModalOpen" is-centered @close="employeeModalOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="css({ width: '640px', maxWidth: '90vw' })">
      <MpModalHeader>Employees</MpModalHeader>
      <MpModalCloseButton />
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
</template>
