<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpSelect,
  MpTextlink,
  MpInputGroup,
  MpInputLeftAddon,
  MpInput,
  MpIcon,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpProgress,
  MpText,
  MpTooltip,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalBody,
  MpModalFooter,
  MpModalCloseButton,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'

definePageMeta({ title: 'Review Cycle' })

// No "All" option — the empty/placeholder state already means "show all", and the
// clear (×) resets to it.
const purposeOptions = [
  { value: 'performance', label: 'Performance review' },
  { value: 'competency', label: 'Competency review' },
  { value: 'evaluation', label: 'Evaluation review' },
]
const purposeFilter = ref('')

// MpSelect is the popover trigger: the native dropdown is suppressed (options come
// from the Pixel popover list below). It is NOT a button — no brand-selected fill;
// the built-in clear (x) stays interactive to reset back to "show all".
const purposeFieldClass = css({
  width: '220px',
  cursor: 'pointer',
  '& select': { pointerEvents: 'none' },
})

const search = ref('')

type CyclePurpose = 'performance' | 'competency' | 'evaluation'

interface Cycle {
  name: string
  purpose: CyclePurpose
  repeat: string
  nextStart: string | null
  repeatCaption: string | null
  total: number
  done: number
}

const purposeIcon: Record<CyclePurpose, string> = {
  performance: 'performance',
  competency: 'competencies',
  evaluation: 'evaluation',
}

const purposeLabel: Record<CyclePurpose, string> = {
  performance: 'Performance review',
  competency: 'Competency review',
  evaluation: 'Evaluation review',
}

const cycles = ref<Cycle[]>([
  { name: 'Mid Year Performance Review 2024', purpose: 'performance', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 1 },
  { name: 'Annual Performance Review 2024', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jul 2025', repeatCaption: null, total: 3, done: 3 },
  { name: 'Core Competency Assessment Q3', purpose: 'competency', repeat: 'Repeats quarterly', nextStart: 'Oct 2024', repeatCaption: null, total: 5, done: 1 },
  { name: 'Probation Evaluation - July 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 3, done: 1 },
  { name: 'Leadership Competency Review', purpose: 'competency', repeat: 'Repeats yearly', nextStart: 'Jan 2025', repeatCaption: null, total: 4, done: 2 },
  { name: 'Sales Performance Review Q2', purpose: 'performance', repeat: 'Repeats quarterly', nextStart: 'Oct 2024', repeatCaption: null, total: 8, done: 8 },
  { name: 'Manager Evaluation 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 1 },
  { name: 'New Joiner Probation Evaluation', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 3, done: 2 },
  { name: 'Technical Competency Mapping', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
  { name: 'End-of-Year Performance Review', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Dec 2025', repeatCaption: null, total: 4, done: 3 },
  { name: 'Engineering Competency Review H1', purpose: 'competency', repeat: 'Repeats yearly', nextStart: 'Jan 2025', repeatCaption: null, total: 3, done: 3 },
  { name: 'Product Team Performance Q1', purpose: 'performance', repeat: 'Repeats quarterly', nextStart: 'Apr 2025', repeatCaption: null, total: 6, done: 2 },
  { name: 'Internship Evaluation - Batch 3', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 3 },
  { name: 'Finance Competency Assessment', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
  { name: 'Customer Success Performance H2', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jan 2025', repeatCaption: null, total: 2, done: 1 },
  { name: 'Operations Evaluation Q3', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 1 },
  { name: 'HR Business Partner Review', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jul 2025', repeatCaption: null, total: 3, done: 3 },
  { name: 'Data Team Competency Check', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
  { name: 'Annual Manager Evaluation 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 1 },
  { name: 'Sales Competency Review Q4', purpose: 'competency', repeat: 'Repeats quarterly', nextStart: 'Jan 2025', repeatCaption: null, total: 4, done: 0 },
  { name: 'Design Team Performance Review', purpose: 'performance', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 1 },
  { name: 'Probation Evaluation - August 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 3, done: 1 },
  { name: 'Leadership Performance Assessment', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jul 2025', repeatCaption: null, total: 4, done: 2 },
  { name: 'Cross-functional Competency Audit', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
  { name: 'Probation Evaluation – Batch Jan 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 4, done: 2 },
  { name: 'Probation Evaluation – Batch Sep 2025', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 1, done: 1 },
  { name: 'Contract Evaluation – Batch Mar 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 1, done: 1 },
  { name: 'Contract Evaluation – Batch Jun 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: 'Sep 2026', repeatCaption: 'Based on contract duration', total: 1, done: 0 },
  { name: 'Part-timer Evaluation – Batch Jun 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 0, done: 0 },
  { name: 'Probation Evaluation – Batch Apr 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 13, done: 0 },
])

// Filtering + search
const filteredCycles = computed(() => {
  let result = [...cycles.value].reverse()
  if (purposeFilter.value)
    result = result.filter((c) => c.purpose === purposeFilter.value)
  if (search.value)
    result = result.filter((c) => c.name.toLowerCase().includes(search.value.toLowerCase()))
  return result
})

// Pagination
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => filteredCycles.value.length)
const totalPages = computed(() => Math.ceil(totalRows.value / rowsPerPage.value))
const currentPage = ref(1)
const showingFrom = computed(() => (currentPage.value - 1) * rowsPerPage.value + 1)
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))

const pagedCycles = computed(() =>
  filteredCycles.value.slice(showingFrom.value - 1, showingTo.value),
)

// Reset page when filter/search changes
watch([purposeFilter, search], () => { currentPage.value = 1 })

// Create cycle modal
const createModalOpen = ref(false)
const createPurpose = ref<CyclePurpose>('performance')
const createName = ref('')
const createNameMax = 60

const purposeCards = [
  { value: 'performance' as CyclePurpose, label: 'Performance review', icon: 'performance' },
  { value: 'competency' as CyclePurpose, label: 'Competency review', icon: 'competencies' },
  { value: 'evaluation' as CyclePurpose, label: 'Evaluation review', icon: 'evaluation' },
]

function openCreateModal() {
  createPurpose.value = 'performance'
  createName.value = ''
  createModalOpen.value = true
}

// Delete confirmation modal
const deleteModalOpen = ref(false)
const cycleToDelete = ref<Cycle | null>(null)

function askDelete(cycle: Cycle) {
  cycleToDelete.value = cycle
  deleteModalOpen.value = true
}
function confirmDelete() {
  if (cycleToDelete.value)
    cycles.value = cycles.value.filter((c) => c.name !== cycleToDelete.value!.name)
  deleteModalOpen.value = false
  cycleToDelete.value = null
}

const employmentTypeLabel = (cycle: Cycle): string | null => {
  if (!cycle.repeatCaption) return null
  if (cycle.repeatCaption.includes('probation')) return 'Probation'
  if (cycle.repeatCaption.includes('contract')) return 'Contract'
  return null
}

// mekari-way table helpers
const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const clickableRow = css({ cursor: 'pointer' })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <!-- Page header actions (rendered in the layout title bar, right of H1) -->
    <Teleport to="#page-header-actions" defer>
      <MpPopover is-close-on-select use-portal placement="bottom-end">
        <MpPopoverTrigger>
          <MpButton variant="secondary" right-icon="caret-down">Help</MpButton>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem>Help center</MpPopoverListItem>
            <MpPopoverListItem>Watch tutorial</MpPopoverListItem>
            <MpPopoverListItem>Contact support</MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpButton variant="secondary">Template settings</MpButton>
      <MpButton variant="primary" @click="openCreateModal">Create Cycle</MpButton>
    </Teleport>

    <!-- Filter bar -->
    <MpFlex align="center" justify="space-between" gap="4">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="purposeFieldClass">
            <MpSelect
              v-model="purposeFilter"
              placeholder="Cycle purpose"
              is-clearable
              tabindex="-1"
              aria-hidden="true"
            >
              <option v-for="opt in purposeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem
              v-for="opt in purposeOptions"
              :key="opt.value"
              :is-active="opt.value === purposeFilter"
              @click="purposeFilter = opt.value"
            >
              {{ opt.label }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpFlex align="center" gap="4">
        <MpTextlink as="button" left-icon="newtab">Open approval settings</MpTextlink>

        <MpFlex :class="css({ width: '280px' })">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search cycle name..." />
          </MpInputGroup>
        </MpFlex>
      </MpFlex>
    </MpFlex>

    <!-- Table + pagination grouped (no gap; pagination is a 52px footer) -->
    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable>
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th">Cycle name</MpTableCell>
              <MpTableCell as="th">Purpose</MpTableCell>
              <MpTableCell as="th">Repeat cycle</MpTableCell>
              <MpTableCell as="th">Progress</MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow
              v-for="cycle in pagedCycles"
              :key="cycle.name"
              :class="clickableRow"
              @click="navigateTo({ path: `/reviews/review-cycles/${encodeURIComponent(cycle.name)}`, query: { name: cycle.name, purpose: cycle.purpose } })"
            >
              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="valueText">
                  {{ cycle.name }}
                </MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex align="flex-start" gap="2">
                  <MpIcon :name="purposeIcon[cycle.purpose]" :class="captionText" :style="{ marginTop: '2px', flexShrink: 0 }" />
                  <MpFlex direction="column" gap="0">
                    <MpText size="label" :class="valueText">{{ purposeLabel[cycle.purpose] }}</MpText>
                    <MpText v-if="employmentTypeLabel(cycle)" size="label-small" :class="captionText">
                      Employment type: {{ employmentTypeLabel(cycle) }}
                    </MpText>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="0">
                  <MpText size="label" :class="valueText">{{ cycle.repeat }}</MpText>
                  <MpText v-if="cycle.nextStart" size="label-small" :class="captionText">
                    Next starts {{ cycle.nextStart }}
                  </MpText>
                  <MpText v-if="cycle.repeatCaption" size="label-small" :class="captionText">
                    {{ cycle.repeatCaption }}
                  </MpText>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="1" :class="css({ width: '240px' })">
                  <MpFlex justify="space-between" align="center">
                    <MpText size="label-small" :class="captionText">Published</MpText>
                    <MpText size="label-small" :class="css({ color: 'text.default', whiteSpace: 'nowrap' })">
                      {{ cycle.done }} of {{ cycle.total }}
                    </MpText>
                  </MpFlex>
                  <MpProgress
                    variant="linear"
                    size="sm"
                    :value="cycle.total > 0 ? Math.round((cycle.done / cycle.total) * 100) : 0"
                  />
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell" @click.stop>
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent>
                    <MpPopoverList>
                      <MpPopoverListItem @click="navigateTo({ path: `/reviews/review-cycles/${encodeURIComponent(cycle.name)}`, query: { name: cycle.name, purpose: cycle.purpose } })">View details</MpPopoverListItem>
                      <MpPopoverListItem v-if="cycle.repeat !== 'Does not repeat' && cycle.purpose !== 'evaluation'">
                        Disable auto-repeat
                      </MpPopoverListItem>
                      <MpPopoverListItem>Lock review result</MpPopoverListItem>
                      <MpPopoverListItem @click="askDelete(cycle)">
                        <span :class="css({ color: 'text.danger' })">Delete</span>
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer (52px, attached to table) -->
      <div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
        <!-- Left: rows per page + showing count -->
        <MpFlex align="center" gap="3">
          <MpText size="label" :class="captionText">Rows per page</MpText>
          <MpPopover is-close-on-select use-portal placement="bottom-start">
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">
                {{ rowsPerPage }}
              </MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem
                  v-for="opt in rowsPerPageOptions"
                  :key="opt"
                  :is-active="opt === rowsPerPage"
                  @click="rowsPerPage = opt; currentPage = 1"
                >
                  {{ opt }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
          <MpText size="label" :class="captionText">
            Showing {{ showingFrom }}–{{ showingTo }} of {{ totalRows }}
          </MpText>
        </MpFlex>

        <!-- Right: page indicator + prev/next -->
        <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
          <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
          <MpTooltip label="Prev page" use-portal>
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="chevrons-left"
              :is-disabled="currentPage === 1"
              @click="currentPage--"
            />
          </MpTooltip>
          <MpTooltip label="Next page" use-portal>
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="chevrons-right"
              :is-disabled="currentPage === totalPages"
              @click="currentPage++"
            />
          </MpTooltip>
        </div>
      </div>
    </MpFlex>
  </MpFlex>

  <!-- Create cycle modal -->
  <!-- 3 cards × 216px + 2 gaps × 16px + modal body padding 48px = 728px -->
  <MpModal :is-open="createModalOpen" is-centered @close="createModalOpen = false">
    <MpModalOverlay />
    <!-- width = 3×216px cards + 2×16px gaps + 2×40px body padding = 760px -->
    <MpModalContent class="mp-modal__content--create-cycle">
      <MpModalBody :style="{ padding: '40px' }">
        <MpFlex direction="column" gap="6">
          <!-- Title -->
          <MpText
            as="h2"
            :class="css({ fontSize: '2xl', fontWeight: 'bold', textAlign: 'center', color: 'text.default' })"
          >
            Create your cycle
          </MpText>

          <!-- Purpose selector -->
          <MpFlex direction="column" gap="3">
            <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">
              What is the purpose of your cycle?
            </MpText>
            <div :class="css({ display: 'flex', gap: '4' })">
              <button
                v-for="card in purposeCards"
                :key="card.value"
                :class="css({
                  width: '216px',
                  flexShrink: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3',
                  padding: '6',
                  border: '1px solid',
                  borderRadius: 'lg',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderColor: createPurpose === card.value ? 'border.brand' : 'border.default',
                  outline: 'none',
                  background: 'transparent',
                })"
                @click="createPurpose = card.value"
              >
                <div :class="css({ width: '56px', height: '56px', flexShrink: '0' })">
                  <MpIcon
                    :name="card.icon"
                    :class="css({
                      width: '56px',
                      height: '56px',
                      color: createPurpose === card.value ? 'icon.brand' : 'icon.default',
                    })"
                  />
                </div>
                <MpText
                  size="label"
                  :class="css({
                    color: 'text.default',
                    fontWeight: createPurpose === card.value ? 'semibold' : 'regular',
                  })"
                >
                  {{ card.label }}
                </MpText>
              </button>
            </div>
          </MpFlex>

          <!-- Cycle name -->
          <MpFlex direction="column" gap="2">
            <div :class="css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })">
              <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">
                Cycle name
              </MpText>
              <MpText size="label-small" :class="captionText">
                {{ createName.length }}/{{ createNameMax }}
              </MpText>
            </div>
            <MpInput
              v-model="createName"
              :maxlength="createNameMax"
              placeholder=""
            />
          </MpFlex>

          <!-- Actions — inside body to follow 40px padding -->
          <div :class="css({ display: 'flex', gap: '3', justifyContent: 'flex-end' })">
            <MpButton variant="secondary" @click="createModalOpen = false">Cancel</MpButton>
            <MpButton
              variant="primary"
              :is-disabled="!createName.trim()"
              @click="navigateTo({ path: '/reviews/review-cycles/create', query: { purpose: createPurpose, name: createName.trim() } })"
            >Create</MpButton>
          </div>
        </MpFlex>
      </MpModalBody>
    </MpModalContent>
  </MpModal>

  <!-- Delete confirmation modal -->
  <MpModal :is-open="deleteModalOpen" is-centered @close="deleteModalOpen = false">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>Delete review cycle?</MpModalHeader>
      <MpModalCloseButton />
      <MpModalBody>
        <MpText :class="css({ color: 'text.default' })">
          <strong>{{ cycleToDelete?.name }}</strong> will be permanently deleted and cannot be recovered.
        </MpText>
      </MpModalBody>
      <MpModalFooter>
        <MpFlex :class="css({ display: 'flex', gap: '3', justifyContent: 'flex-end' })">
          <MpButton variant="secondary" @click="deleteModalOpen = false">Cancel</MpButton>
          <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
        </MpFlex>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>
