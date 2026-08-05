<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycles (new Goals experience)
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4400:29219)
                        Drawer / New Goal Cycle (node 4400:21633)
  Token mode: Pixel 2.4
  Patterns used: filter bar + table + pagination, mirrors
  pages/reviews/review-cycles/index.vue exactly (MpSelect+Popover filter,
  MpTable, Actions popover, pagination footer). Drawer form mirrors
  pages/reviews/review-cycles/create.vue field conventions.

  DATA is persisted client-side only via composables/useGoalCyclesStore.ts
  (localStorage "mini DB", seeded with one dummy cycle) — this is a demo
  prototype, not a real backend.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpButtonGroup,
  MpSelect,
  MpInputGroup,
  MpInputLeftAddon,
  MpInput,
  MpIcon,
  MpText,
  MpTextlink,
  MpBadge,
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
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpRadio,
  MpCheckbox,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  toast,
  css,
} from '@mekari/pixel3'
import type { GoalCycle, GoalCycleStatus, ProgressUpdateMethod } from '~/composables/useGoalCyclesStore'
import type { PeriodValue } from '~/utils/periodPicker'

definePageMeta({ title: 'Goal cycles' })

const router = useRouter()
const { cycles, addCycle, updateCycle, deleteCycle } = useGoalCyclesStore()
const { deleteGoalsByCycle, goals: allGoals } = useGoalsStore()
// A goal cycle can only be deleted while it's empty — any goal (draft included)
// blocks deletion.
function cycleHasGoals(id: string) { return allGoals.value.some(g => g.cycleId === id) }

const statusBadgeType: Record<GoalCycleStatus, 'completed' | 'announcement'> = {
  Active: 'completed',
  Inactive: 'announcement',
}

// Filtering + search
const statusOptions: GoalCycleStatus[] = ['Active', 'Inactive']
const statusFilter = ref('')
const search = ref('')

const statusFieldClass = css({
  width: '160px',
  cursor: 'pointer',
  '& select': { pointerEvents: 'none' },
})

const filteredCycles = computed(() => {
  let result = cycles.value
  if (statusFilter.value)
    result = result.filter(c => c.status === statusFilter.value)
  if (search.value)
    result = result.filter(c => c.name.toLowerCase().includes(search.value.toLowerCase()))
  return result
})

// ─── Column sort (behaviour from dona/erp-app's ErpColumnSortMenu) ───────────
// sortKey '' = default order (the store already sorts by period, latest first).
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  name: 'text',
  period: 'date', // sort chronologically by the cycle's start date
  status: 'text',
}
function sortValue(c: GoalCycle, key: string): string {
  if (key === 'name') return c.name
  if (key === 'period') return c.startDate
  if (key === 'status') return c.status
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
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))

const pagedCycles = computed(() => sortedCycles.value.slice(showingFrom.value - 1, showingTo.value))

watch([statusFilter, search], () => { currentPage.value = 1 })

// ─── New / edit goal cycle drawer ───────────────────────────────────────────
const isDrawerOpen = ref(false)
const editingCycleId = ref<string | null>(null)
const drawerTitle = computed(() => (editingCycleId.value ? 'Edit goal cycle' : 'New goal cycle'))
const nameMax = 60
const cycleName = ref('')
const cyclePeriod = ref<PeriodValue | null>(null)
const progressMethod = ref<ProgressUpdateMethod>('manual')
const weightMandatory = ref(true)
const errors = reactive({ name: false, period: false })
watch(cycleName, () => { errors.name = false })
watch(cyclePeriod, () => { errors.period = false })

function openHelp() {
  toast.notify({
    id: 'goal-cycles-help',
    position: 'top-center',
    variant: 'info',
    title: 'Goal cycles help',
    description: 'A goal cycle defines the period your team sets and tracks goals in. Create one, then add goals under it.',
  })
}

function openDrawer() {
  editingCycleId.value = null
  cycleName.value = ''
  cyclePeriod.value = null
  progressMethod.value = 'manual'
  weightMandatory.value = true
  errors.name = false
  errors.period = false
  isDrawerOpen.value = true
}

function openEditDrawer(cycle: GoalCycle) {
  editingCycleId.value = cycle.id
  cycleName.value = cycle.name
  cyclePeriod.value = { mode: 'custom', label: cycle.period, startDate: cycle.startDate, endDate: cycle.endDate }
  progressMethod.value = cycle.progressUpdateMethod
  weightMandatory.value = cycle.weightMandatory
  errors.name = false
  errors.period = false
  isDrawerOpen.value = true
}

function saveCycle() {
  errors.name = !cycleName.value.trim()
  errors.period = !cyclePeriod.value
  if (errors.name || errors.period) return

  const input = {
    name: cycleName.value.trim(),
    period: cyclePeriod.value!.label,
    startDate: cyclePeriod.value!.startDate,
    endDate: cyclePeriod.value!.endDate,
    progressUpdateMethod: progressMethod.value,
    weightMandatory: weightMandatory.value,
  }

  if (editingCycleId.value) {
    updateCycle(editingCycleId.value, input)
    toast.notify({
      id: 'goal-cycle-updated',
      position: 'top-center',
      variant: 'success',
      title: 'Goal cycle updated',
    })
    isDrawerOpen.value = false
    return
  }

  const created = addCycle(input)
  toast.notify({
    id: 'goal-cycle-created',
    position: 'top-center',
    variant: 'success',
    title: 'Goal cycle created',
  })
  isDrawerOpen.value = false
  router.push({ path: `/goals/goal-cycles/${created.id}`, query: { name: created.name } })
}

// ─── Delete confirmation ─────────────────────────────────────────────────────
const deleteModalOpen = ref(false)
const cycleToDelete = ref<GoalCycle | null>(null)

function askDelete(cycle: GoalCycle) {
  // Block deletion while the cycle still has goals (drafts count too).
  if (cycleHasGoals(cycle.id)) {
    toast.notify({
      id: 'goal-cycle-has-goals',
      position: 'top-center',
      variant: 'error',
      title: 'Can’t delete this goal cycle',
      description: 'This goal cycle still has goals in it. Delete all its goals (including drafts) first.',
    })
    return
  }
  cycleToDelete.value = cycle
  deleteModalOpen.value = true
}

function confirmDelete() {
  if (!cycleToDelete.value) return
  deleteGoalsByCycle(cycleToDelete.value.id)
  deleteCycle(cycleToDelete.value.id)
  toast.notify({
    id: 'goal-cycle-deleted',
    position: 'top-center',
    variant: 'success',
    title: 'Goal cycle deleted',
  })
  deleteModalOpen.value = false
  cycleToDelete.value = null
}

// ─── Empty-state preview (demo FAB) ──────────────────────────────────────────
// A floating toggle to preview the "no goal cycle yet" scenario even when the
// mini-DB is seeded — purely a prototype affordance, not a real feature. The
// empty state also shows for real once every cycle has been deleted.
const previewEmpty = ref(false)
const showEmptyState = computed(() => previewEmpty.value || cycles.value.length === 0)

// mekari-way table helpers
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Header label + sort menu inline (mirrors erp-app's .rcvg-th-inner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
// Goal cycle name — a textlink that navigates to the cycle detail; underlines
// on hover (the whole row is clickable too, so this stops propagation).
const nameLink = css({ color: 'text.link', cursor: 'pointer', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
// Whole row navigates to the cycle detail (matches the Actions → View details).
const clickableRow = css({ cursor: 'pointer', _hover: { background: 'background.neutral.subtle' } })

// Drawer form styles (DT 2.4)
const fields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const selectWidth = '100%'

// Empty state — mirrors the goal-cycle detail "No goals in this cycle yet"
// pattern (illustration + title + caption + primary action).
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
// Floating demo toggle (bottom-right) to preview the empty state — a round,
// black, icon-only FAB.
const fab = css({
  position: 'fixed', bottom: '24px', right: '24px', zIndex: '20',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '48px', height: '48px', borderRadius: 'full',
  background: 'gray.900', color: 'white', border: 'none',
  boxShadow: 'lg', cursor: 'pointer',
  _hover: { background: 'gray.800' },
})
</script>

<template>
  <MpFlex direction="column" gap="6">
    <!-- Page header actions (rendered in the layout title bar, right of H1) -->
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="secondary" @click="openHelp">Help</MpButton>
      <MpButton variant="primary" @click="openDrawer">New goal cycle</MpButton>
    </Teleport>

    <!-- Empty state: no goal cycle yet (real, or previewed via the demo FAB) -->
    <MpFlex v-if="showEmptyState" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
        <MpText :class="emptyTitle">No goal cycle yet</MpText>
        <MpText size="label" :class="captionText">Create a goal cycle to start setting goals for your team. Goal cycles you add will appear here.</MpText>
      </MpFlex>
      <MpButton variant="secondary" @click="openDrawer">New goal cycle</MpButton>
    </MpFlex>

    <template v-else>
    <!-- Filter bar -->
    <MpFlex align="center" justify="space-between" gap="4">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="statusFieldClass">
            <MpSelect
              v-model="statusFilter"
              placeholder="Status"
              is-clearable
              tabindex="-1"
              aria-hidden="true"
            >
              <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem
              v-for="opt in statusOptions"
              :key="opt"
              :is-active="opt === statusFilter"
              @click="statusFilter = opt"
            >
              {{ opt }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpFlex :class="css({ width: '200px' })">
        <MpInputGroup>
          <MpInputLeftAddon>
            <MpIcon name="search" />
          </MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search..." />
        </MpInputGroup>
      </MpFlex>
    </MpFlex>

    <!-- Table + pagination grouped (no gap; pagination is a 52px footer) -->
    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="gc-sort-th" :class="headCell">
                <span :class="thInner"><span>Goal cycle name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="gc-sort-th" :class="headCell">
                <span :class="thInner"><span>Goal period</span><PxColumnSortMenu col-key="period" :sort-type="columnSortTypes.period" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="gc-sort-th" :class="headCell">
                <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow
              v-for="cycle in pagedCycles"
              :key="cycle.id"
              :class="clickableRow"
              @click="router.push({ path: `/goals/goal-cycles/${cycle.id}`, query: { name: cycle.name } })"
            >
              <MpTableCell as="td" :class="tightCell" @click.stop>
                <MpTextlink
                  as="a"
                  :class="nameLink"
                  @click="router.push({ path: `/goals/goal-cycles/${cycle.id}`, query: { name: cycle.name } })"
                >
                  {{ cycle.name }}
                </MpTextlink>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ cycle.period }}</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpBadge for="tableStatus" :type="statusBadgeType[cycle.status]">{{ cycle.status }}</MpBadge>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell" @click.stop>
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent>
                    <MpPopoverList>
                      <MpPopoverListItem @click="router.push({ path: `/goals/goal-cycles/${cycle.id}`, query: { name: cycle.name } })">View details</MpPopoverListItem>
                      <MpPopoverListItem @click="openEditDrawer(cycle)">Edit</MpPopoverListItem>
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
          <MpButton
            variant="ghost"
            size="sm"
            left-icon="chevrons-left"
            :is-disabled="currentPage === 1"
            @click="currentPage--"
          />
          <MpButton
            variant="ghost"
            size="sm"
            left-icon="chevrons-right"
            :is-disabled="currentPage === totalPages"
            @click="currentPage++"
          />
        </div>
      </div>
    </MpFlex>
    </template>

    <!-- Demo-only FAB: round black icon button → scenario picker popover -->
    <MpPopover is-close-on-select use-portal placement="top-end">
      <MpPopoverTrigger>
        <button type="button" :class="fab" title="Preview scenario" aria-label="Preview scenario">
          <MpIcon name="burger" />
        </button>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <MpPopoverList>
          <MpPopoverListItem :is-active="!previewEmpty" @click="previewEmpty = false">Default</MpPopoverListItem>
          <MpPopoverListItem :is-active="previewEmpty" @click="previewEmpty = true">Empty state</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
  </MpFlex>

  <!-- New goal cycle drawer -->
  <!-- ClientOnly: Pixel's drawer slide-in transition is animejs-driven and only
       plays when the component mounts fresh on the client (matches the same
       pattern used for MpModal in mekari-account/components/AppHeader.vue). -->
  <ClientOnly>
  <MpDrawer id="drawer-new-goal-cycle" :is-open="isDrawerOpen" placement="right" size="lg" is-keep-alive @close="isDrawerOpen = false">
    <MpDrawerContent>
      <MpDrawerHeader>
        {{ drawerTitle }}
        <MpDrawerCloseButton />
      </MpDrawerHeader>
      <MpDrawerBody>
        <div :class="fields">
          <MpFormControl id="cycle-name" :is-invalid="errors.name">
            <MpFlex align="center" justify="space-between">
              <MpFlex align="center" gap="1">
                <MpFormLabel>Goal cycle name</MpFormLabel>
                <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
              </MpFlex>
              <span :class="charCount">{{ cycleName.length }} / {{ nameMax }}</span>
            </MpFlex>
            <MpInput v-model="cycleName" :maxlength="nameMax" />
            <MpFormErrorMessage>Goal cycle name is required.</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl id="cycle-period" :is-invalid="errors.period">
            <MpFlex align="center" gap="1">
              <MpFormLabel>Goal period</MpFormLabel>
              <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
            </MpFlex>
            <PxAdvancedDatePicker
              v-model="cyclePeriod"
              placeholder="Select goal period"
              :width="selectWidth"
            />
            <MpFormErrorMessage>Goal period is required.</MpFormErrorMessage>
          </MpFormControl>

          <div>
            <MpFlex align="center" gap="1" :class="css({ marginBottom: '2' })">
              <MpText :class="css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })">Progress update method</MpText>
              <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
            </MpFlex>
            <MpFlex direction="column" gap="2">
              <MpRadio
                name="progress-update-method"
                value="manual"
                :is-checked="progressMethod === 'manual'"
                @update:is-checked="progressMethod = 'manual'"
              >
                Manual entry
                <template #description>Update total progress manually by entering achievement values.</template>
              </MpRadio>
              <MpRadio
                name="progress-update-method"
                value="log-based"
                :is-checked="progressMethod === 'log-based'"
                @update:is-checked="progressMethod = 'log-based'"
              >
                Log-based
                <template #description>Achievement entries are automatically summed to update total progress.</template>
              </MpRadio>
            </MpFlex>
          </div>

          <div>
            <MpFlex align="center" gap="1" :class="css({ marginBottom: '2' })">
              <MpText :class="css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })">Goal weight</MpText>
              <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
            </MpFlex>
            <MpCheckbox id="weight-mandatory" v-model:is-checked="weightMandatory">
              Make goal weight mandatory
              <template #description>Require users to assign a weight when creating or editing goals.</template>
            </MpCheckbox>
          </div>
        </div>
      </MpDrawerBody>
      <MpDrawerFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="isDrawerOpen = false">Cancel</MpButton>
          <MpButton variant="primary" @click="saveCycle">{{ editingCycleId ? 'Save changes' : 'Save' }}</MpButton>
        </MpButtonGroup>
      </MpDrawerFooter>
    </MpDrawerContent>
    <MpDrawerOverlay />
  </MpDrawer>
  </ClientOnly>

  <!-- Delete confirmation -->
  <ClientOnly>
  <MpModal :is-open="deleteModalOpen" is-centered @close="deleteModalOpen = false">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>
        Delete goal cycle
        <MpModalCloseButton @click="deleteModalOpen = false" />
      </MpModalHeader>
      <MpModalBody>
        <MpText :class="valueText">
          Delete <strong>{{ cycleToDelete?.name }}</strong>? All goals under this goal cycle will also be deleted. This can't be undone.
        </MpText>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="deleteModalOpen = false">Cancel</MpButton>
          <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. Kept as an UNLAYERED scoped rule
   (not a Panda css() @layer utility) so it beats PxColumnSortMenu's unlayered
   scoped `visibility: hidden` on specificity — a layered rule would always lose
   to that unlayered base. Mirrors erp-app's `.rcvg-th:hover :deep(.erp-sort-btn)`. */
.gc-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
