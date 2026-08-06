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
  toast,
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

import type { CyclePurpose, ReviewCycle } from '~/composables/useReviewCyclesStore'

type Cycle = ReviewCycle

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

const { cycles, deleteCycle } = useReviewCyclesStore()

// Filtering + search
const filteredCycles = computed(() => {
  let result = [...cycles.value].reverse()
  if (purposeFilter.value)
    result = result.filter((c) => c.purpose === purposeFilter.value)
  if (search.value)
    result = result.filter((c) => c.name.toLowerCase().includes(search.value.toLowerCase()))
  return result
})

// ─── Column sort (behaviour from PxColumnSortMenu) ───────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  name: 'text',
  purpose: 'text',
  repeat: 'text',
  progress: 'number',
}
function sortValue(c: Cycle, key: string): string | number {
  if (key === 'name') return c.name
  if (key === 'purpose') return purposeLabel[c.purpose]
  if (key === 'repeat') return c.repeat
  if (key === 'progress') return c.total > 0 ? c.done / c.total : 0
  return ''
}
const sortedCycles = computed(() => {
  if (!sortKey.value) return filteredCycles.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filteredCycles.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// Pagination
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => sortedCycles.value.length)
const totalPages = computed(() => Math.ceil(totalRows.value / rowsPerPage.value))
const currentPage = ref(1)
const showingFrom = computed(() => (currentPage.value - 1) * rowsPerPage.value + 1)
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))

const pagedCycles = computed(() =>
  sortedCycles.value.slice(showingFrom.value - 1, showingTo.value),
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
    deleteCycle(cycleToDelete.value.id)
  deleteModalOpen.value = false
  cycleToDelete.value = null
}

// ── Row actions: lock/unlock, update repeat, start/stop automatic ────────────────
// Session-only demo state (locked cycles, stopped automatic cycles).
const lockedIds = ref<Set<string>>(new Set())
const stoppedIds = ref<Set<string>>(new Set())
function isLocked(c: Cycle) { return lockedIds.value.has(c.id) }
function isStopped(c: Cycle) { return stoppedIds.value.has(c.id) }
// Lock/Unlock is only offered when the cycle was configured with lock-review;
// created cycles carry the real flag, seeded perf/competency default to enabled.
function lockEnabled(c: Cycle) { return c.config ? !!c.config.enable_lock_review : c.purpose !== 'evaluation' }

// Update repeat date modal
const updateRepeatOpen = ref(false)
const updateTarget = ref<Cycle | null>(null)
function openUpdateRepeat(c: Cycle) { updateTarget.value = c; updateRepeatOpen.value = true }
function onUpdateRepeatSubmit() {
  toast.notify({ id: 'repeat-updated', position: 'top-center', variant: 'success', title: 'Repeat date cycle updated' })
}

// Lock/Unlock modal
const lockOpen = ref(false)
const lockTarget = ref<Cycle | null>(null)
const lockToLock = ref(true)
function openLock(c: Cycle, toLock: boolean) { lockTarget.value = c; lockToLock.value = toLock; lockOpen.value = true }
function onLockSubmit() {
  if (lockTarget.value) {
    const next = new Set(lockedIds.value)
    if (lockToLock.value) next.add(lockTarget.value.id)
    else next.delete(lockTarget.value.id)
    lockedIds.value = next
    toast.notify({ id: 'lock-toggled', position: 'top-center', variant: 'success', title: `Review cycle ${lockToLock.value ? 'locked' : 'unlocked'}` })
  }
  lockOpen.value = false
}

// Evaluation start/stop automatic cycle
function toggleAuto(c: Cycle, stop: boolean) {
  const next = new Set(stoppedIds.value)
  if (stop) next.add(c.id)
  else next.delete(c.id)
  stoppedIds.value = next
  toast.notify({ id: 'auto-toggled', position: 'top-center', variant: 'success', title: `Automatic cycle ${stop ? 'stopped' : 'started'}` })
}

const employmentTypeLabel = (cycle: Cycle): string | null => {
  if (!cycle.repeatCaption) return null
  if (cycle.repeatCaption.includes('probation')) return 'Probation'
  if (cycle.repeatCaption.includes('contract')) return 'Contract'
  return null
}

// mekari-way table helpers
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'top' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'top' })
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
            <MpPopoverListItem
              as="a"
              href="https://help-center.talenta.co/hc/id/articles/11428359433241-Bagaimana-Cara-Membuat-Cycle-Performance-Review-Baru"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MpFlex direction="column" gap="0">
                <MpText size="label">Guidebook</MpText>
                <MpText size="label-small" :class="css({ color: 'text.secondary' })">Complete information about the feature</MpText>
              </MpFlex>
            </MpPopoverListItem>
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
              <MpTableCell as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Cycle name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Purpose</span><PxColumnSortMenu col-key="purpose" :sort-type="columnSortTypes.purpose" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Repeat cycle</span><PxColumnSortMenu col-key="repeat" :sort-type="columnSortTypes.repeat" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Progress</span><PxColumnSortMenu col-key="progress" :sort-type="columnSortTypes.progress" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
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
                    :color="cycle.purpose === 'evaluation' && cycle.repeat !== 'Repeats automatically' ? 'stone' : 'violet'"
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

                      <!-- Evaluation (automatic) → start/stop; Performance/Competency → update repeat date -->
                      <template v-if="cycle.purpose === 'evaluation'">
                        <MpPopoverListItem v-if="isStopped(cycle)" @click="toggleAuto(cycle, false)">Start automatic cycle</MpPopoverListItem>
                        <MpPopoverListItem v-else @click="toggleAuto(cycle, true)">Stop automatic cycle</MpPopoverListItem>
                      </template>
                      <MpPopoverListItem v-else @click="openUpdateRepeat(cycle)">Update repeat date cycle</MpPopoverListItem>

                      <!-- Lock/Unlock — only when the cycle has lock-review enabled -->
                      <template v-if="lockEnabled(cycle)">
                        <MpPopoverListItem v-if="isLocked(cycle)" @click="openLock(cycle, false)">Unlock review result</MpPopoverListItem>
                        <MpPopoverListItem v-else @click="openLock(cycle, true)">Lock review result</MpPopoverListItem>
                      </template>

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
  <MpModal :is-open="createModalOpen" @close="createModalOpen = false">
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
  <MpModal :is-open="deleteModalOpen" @close="deleteModalOpen = false">
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

  <!-- Update repeat date cycle (performance/competency) -->
  <CycleUpdateRepeatModal
    v-model:is-open="updateRepeatOpen"
    :cycle="updateTarget"
    @submit="onUpdateRepeatSubmit"
  />

  <!-- Lock / Unlock review result -->
  <CycleLockReviewModal
    v-model:is-open="lockOpen"
    :to-lock="lockToLock"
    @submit="onLockSubmit"
  />
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered scoped `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
