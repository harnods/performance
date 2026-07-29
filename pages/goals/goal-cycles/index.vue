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
const { deleteGoalsByCycle } = useGoalsStore()

const statusBadgeType: Record<GoalCycleStatus, 'completed' | 'announcement'> = {
  'Current goal': 'completed',
  'Inactive goals': 'announcement',
  'Past goal': 'announcement',
}

// Filtering + search
const statusOptions: GoalCycleStatus[] = ['Current goal', 'Inactive goals', 'Past goal']
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

// Pagination
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => filteredCycles.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))

const pagedCycles = computed(() => filteredCycles.value.slice(showingFrom.value - 1, showingTo.value))

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

// mekari-way table helpers
const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
// Whole row navigates to the cycle detail (matches the Actions → View details).
const clickableRow = css({ cursor: 'pointer', _hover: { background: 'background.neutral.subtle' } })

// Drawer form styles (DT 2.4)
const fields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const selectWidth = '100%'
</script>

<template>
  <MpFlex direction="column" gap="6">
    <!-- Page header actions (rendered in the layout title bar, right of H1) -->
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="primary" @click="openDrawer">New goal cycle</MpButton>
    </Teleport>

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
              <MpTableCell as="th">Goal cycle name</MpTableCell>
              <MpTableCell as="th">Goal period</MpTableCell>
              <MpTableCell as="th">Status</MpTableCell>
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
              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ cycle.name }}</MpText>
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
