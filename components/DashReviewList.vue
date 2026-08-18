<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dashboard — review list table ("Not submit reviews" / "Picked co-worker")
  Token mode: Pixel 2.4

  Faithful replica of talenta-review's NotSubmitReview.vue + PickedCoWorker.vue
  (one component, `variant` prop). Nested multi-select filter + search +
  column sort + bulk-select (header row REPLACED by a 52px action bar, same
  behaviour as the goal tables via useGoalBulkSelect + GoalBulkActionBar) +
  pagination. Per-row: count link opens pending-actions / pick-co-worker modal;
  email icon opens the reminder modal. Download all / selected + email flows
  toast. DEMO MOCK rows.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpAvatar,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpCheckbox,
  MpTooltip,
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
  MpDivider,
  toast,
  css,
} from '@mekari/pixel3'
import type { FilterDimension, ReviewRow } from '~/utils/dashboardTypes'

const props = defineProps<{
  variant: 'not-submit' | 'picked'
  rows: ReviewRow[]
  dimensions: FilterDimension[]
  appliedFilters?: { cycles?: string[], methods?: string[] }
}>()

const { teamReviewersOf, pendingByReviewer } = useReviewSubmissionsStore()
const storeFilter = computed(() => props.appliedFilters ?? {})

const isPicked = computed(() => props.variant === 'picked')
const countHeader = computed(() => (isPicked.value ? 'Total picked' : 'Pending action'))
const countUnit = computed<[string, string]>(() => (isPicked.value ? ['employee', 'employees'] : ['action', 'actions']))
const emailTemplate = computed(() => (isPicked.value
  ? 'You still have some pending actions for performance review submission.\n\nPlease take some time to pick co-workers to complete the submission below:'
  : 'You still have some pending actions for performance review submission.\n\nPlease take some time to submit all the pending actions below:'))

// ─── Filter ─────────────────────────────────────────────────────────────────
const filterModel = ref<Record<string, string[]>>({})
function matchesFilter(r: ReviewRow) {
  for (const [key, ids] of Object.entries(filterModel.value)) {
    if (!ids?.length) continue
    const rowVal = String((r as unknown as Record<string, unknown>)[key] ?? '')
    if (!ids.includes(rowVal)) return false
  }
  return true
}

// ─── Search ─────────────────────────────────────────────────────────────────
const search = ref('')

// ─── Column sort (behaviour from goal-cycles/index.vue's PxColumnSortMenu) ────
// sortKey '' = default order (source order after filter + search).
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = { name: 'text', count: 'number' }
function sortValue(r: ReviewRow, key: string): string | number {
  if (key === 'name') return r.name
  if (key === 'count') return r.count
  return ''
}

const processed = computed(() => {
  let list = props.rows.filter(matchesFilter)
  if (search.value) list = list.filter(r => r.name.toLowerCase().includes(search.value.toLowerCase()))
  if (sortKey.value) {
    const dir = sortDir.value === 'asc' ? 1 : -1
    list = [...list].sort((a, b) =>
      String(sortValue(a, sortKey.value)).localeCompare(
        String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
      ) * dir,
    )
  }
  return list
})

// ─── Pagination ─────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 20, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => processed.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => processed.value.slice(showingFrom.value - 1, showingTo.value))
watch([search, filterModel, rowsPerPage], () => { currentPage.value = 1 }, { deep: true })

// ─── Bulk select (same behaviour as the goal tables) ─────────────────────────
const { selectedIds, selectedCount, isSelected, toggleSelect, isAllSelected, toggleSelectAll, clearSelection } = useGoalBulkSelect()
const pageIds = computed(() => paged.value.map(r => r.id))
const allPageSelected = computed(() => isAllSelected(pageIds.value))
const somePageSelected = computed(() => selectedCount.value > 0 && !allPageSelected.value)
const totalCols = 3 // name (+checkbox) + count + email

function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && selectedCount.value > 0) clearSelection() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const selectedRows = computed(() => props.rows.filter(r => selectedIds.value.has(r.id)))

// ─── Actions ──────────────────────────────────────────────────────────────────
function download(scope: 'all' | 'selected') {
  toast.notify({ id: 'dash-download', position: 'top-center', variant: 'success', title: scope === 'all' ? 'Preparing download for all employees…' : 'Preparing download for selected employees…' })
}

// Email modal
const isEmailOpen = ref(false)
const emailMode = ref<'single' | 'bulk'>('single')
const emailEmployee = ref<ReviewRow | null>(null)
function openEmailSingle(row: ReviewRow) { emailMode.value = 'single'; emailEmployee.value = row; isEmailOpen.value = true }
function openEmailBulk() { emailMode.value = 'bulk'; isEmailOpen.value = true }
function onSendEmail() {
  toast.notify({ id: 'dash-remind', position: 'top-center', variant: 'success', title: 'Reminder email is sent' })
}

// Count-link modals
const isPendingOpen = ref(false)
const isPickOpen = ref(false)
const activeRow = ref<ReviewRow | null>(null)
function openCount(row: ReviewRow) {
  activeRow.value = row
  if (isPicked.value) isPickOpen.value = true
  else isPendingOpen.value = true
}
function onPickSave() {
  toast.notify({ id: 'coworker-updated', position: 'top-center', variant: 'success', title: 'Co-worker is updated' })
}
// "Total picked: N" = the employee has already picked N co-workers, so the
// drawer opens with those N already in the Selected column — the actual team
// reviewers assigned to this reviewee in the review seed.
const pickPreselected = computed(() => {
  if (!activeRow.value) return []
  const revieweeId = activeRow.value.revieweeId ?? activeRow.value.id
  const cycles = activeRow.value.cycleValue ? [activeRow.value.cycleValue] : storeFilter.value.cycles
  return teamReviewersOf(revieweeId, { cycles })
})
const activeRevieweeId = computed(() => activeRow.value?.revieweeId ?? activeRow.value?.id ?? '')
// Pending-actions breakdown for the clicked reviewer (Not submit table).
const pendingBreakdown = computed(() => (activeRow.value ? pendingByReviewer(activeRow.value.id, storeFilter.value) : []))

// ─── Styles ───────────────────────────────────────────────────────────────────
const headerRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4', flexWrap: 'wrap' })
const heading = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const subtitle = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const toolbar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', marginTop: '3', marginBottom: '6', flexWrap: 'wrap' })
const searchWidth = css({ width: '240px' })
const checkCol = css({ width: '44px' })
const headCell = css({ whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Header label + sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cell = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
// Explicit 16px left inset on the first (Employee name) column so its checkbox
// lines up with the bulk-action bar's checkbox (which sits at paddingInline 4).
const firstColPad = css({ paddingLeft: '4' })
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
const colCount = css({ width: '180px' })
const colAction = css({ width: '64px' })
const ownerCell = css({ display: 'flex', alignItems: 'center', gap: '2' })
const nameText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const idText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const linkText = css({ color: 'text.link', cursor: 'pointer', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const cycleText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const emptyWrap = css({ padding: '10', textAlign: 'center', color: 'text.secondary' })
const actionCol = css({ width: '56px', textAlign: 'right' })
const captionText = css({ color: 'text.secondary' })
// Bulk bar (mirrors GoalBulkActionBar): 52px, gray.25, replaces the header row.
const bulkBar = css({ height: '52px', paddingInline: '4', background: 'gray.25' })
const hintText = css({ color: 'text.secondary' })
const dangerNone = css({ color: 'text.secondary' })
</script>

<template>
  <div>
    <div :class="headerRow">
      <div>
        <MpText :class="heading">{{ isPicked ? 'Picked co-worker' : 'Not submit reviews' }}</MpText>
        <MpText :class="subtitle">Total: {{ rows.length }} {{ rows.length === 1 ? 'employee' : 'employees' }}</MpText>
      </div>
      <MpButton variant="secondary" left-icon="download" :is-disabled="rows.length === 0" @click="download('all')">Download all</MpButton>
    </div>

    <!-- Filter + search toolbar -->
    <div :class="toolbar">
      <DashNestedFilter v-model="filterModel" :dimensions="dimensions" />
      <MpFlex :class="searchWidth">
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search employee name" />
        </MpInputGroup>
      </MpFlex>
    </div>

    <MpTableContainer v-if="paged.length">
      <MpTable :is-hoverable="false" :class="fixedTable">
        <!-- Fixed layout + explicit column widths so the columns don't reflow
             when the header row collapses into the bulk-action bar. -->
        <colgroup>
          <col>
          <col :class="colCount">
          <col :class="colAction">
        </colgroup>
        <MpTableHead>
          <!-- Bulk action bar replaces the column header row when rows are selected -->
          <MpTableRow v-if="selectedCount > 0">
            <MpTableCell as="th" :colspan="totalCols" :class="css({ padding: '0' })">
              <MpFlex align="center" justify="space-between" :class="bulkBar">
                <MpFlex align="center" gap="4">
                  <MpFlex align="center" gap="2">
                    <MpCheckbox
                      :is-checked="allPageSelected"
                      :is-indeterminate="somePageSelected"
                      aria-label="Select all"
                      @update:is-checked="toggleSelectAll(pageIds)"
                    />
                    <MpText size="label" weight="semiBold">{{ selectedCount }} {{ selectedCount === 1 ? 'employee' : 'employees' }} selected</MpText>
                  </MpFlex>
                  <MpPopover is-close-on-select use-portal placement="bottom-start">
                    <MpPopoverTrigger>
                      <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
                    </MpPopoverTrigger>
                    <MpPopoverContent>
                      <MpPopoverList>
                        <MpPopoverListItem @click="openEmailBulk">Remind via email</MpPopoverListItem>
                        <MpPopoverListItem @click="download('selected')">Download selected (.xlsx)</MpPopoverListItem>
                      </MpPopoverList>
                    </MpPopoverContent>
                  </MpPopover>
                  <MpButton variant="ghost" @click="clearSelection">Cancel</MpButton>
                </MpFlex>
                <MpText size="label" :class="hintText">Press esc to deselect</MpText>
              </MpFlex>
            </MpTableCell>
          </MpTableRow>
          <MpTableRow v-else>
            <MpTableCell as="th" class="rl-sort-th" :class="[headCell, firstColPad]">
              <MpFlex align="center" gap="2">
                <MpCheckbox :is-checked="allPageSelected" :is-indeterminate="somePageSelected" aria-label="Select all" @update:is-checked="toggleSelectAll(pageIds)" />
                <span :class="thInner"><span>Employee name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="th" class="rl-sort-th" :class="headCell">
              <span :class="thInner"><span>{{ countHeader }}</span><PxColumnSortMenu col-key="count" :sort-type="columnSortTypes.count" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" :class="[headCell, actionCol]" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="row in paged" :key="row.id">
            <MpTableCell as="td" :class="[cell, firstColPad]">
              <div :class="ownerCell">
                <MpCheckbox :is-checked="isSelected(row.id)" @update:is-checked="toggleSelect(row.id)" :aria-label="`Select ${row.name}`" />
                <PxAvatar :id="`rl-${variant}-${row.id}`" :name="row.name" :src="row.photo" size="md" variant-color="gray" />
                <MpFlex direction="column" gap="0">
                  <span :class="nameText">{{ row.name }}</span>
                  <span :class="idText">{{ row.employeeId }}</span>
                </MpFlex>
              </div>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">
              <MpFlex direction="column" gap="0">
                <span :class="linkText" @click="openCount(row)">{{ row.count }} {{ row.count === 1 ? countUnit[0] : countUnit[1] }}</span>
                <span v-if="isPicked && row.cycleName" :class="cycleText">{{ row.cycleName }}</span>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="[cell, actionCol]">
              <MpTooltip label="Remind via email" placement="left">
                <MpButton variant="ghost" :left-icon="row.sentEmail ? 'email-sent' : 'envelope'" aria-label="Remind via email" @click="openEmailSingle(row)" />
              </MpTooltip>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <div v-else :class="emptyWrap">There is no data to display</div>

    <!-- Pagination footer -->
    <div v-if="paged.length" :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '1' })">
      <MpFlex align="center" gap="3">
        <MpText size="label" :class="captionText">Rows per page</MpText>
        <MpPopover is-close-on-select use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem v-for="opt in rowsPerPageOptions" :key="opt" :is-active="opt === rowsPerPage" @click="rowsPerPage = opt; currentPage = 1">{{ opt }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpText size="label" :class="captionText">Showing {{ showingFrom }}–{{ showingTo }} of {{ totalRows }}</MpText>
      </MpFlex>
      <MpFlex align="center" gap="2">
        <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
        <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
        <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
      </MpFlex>
    </div>

    <!-- Modals -->
    <DashEmailReminderModal
      v-model:is-open="isEmailOpen"
      :mode="emailMode"
      :employee="emailEmployee ? { id: emailEmployee.id, name: emailEmployee.name, employeeId: emailEmployee.employeeId, photo: emailEmployee.photo } : null"
      :employees="selectedRows.map(r => ({ id: r.id, name: r.name, employeeId: r.employeeId, photo: r.photo }))"
      :template="emailTemplate"
      @send="onSendEmail"
    />
    <DashPendingActionsModal
      v-if="!isPicked"
      v-model:is-open="isPendingOpen"
      :employee-name="activeRow?.name ?? ''"
      :cycles="pendingBreakdown"
    />
    <SelectEmployeesDrawer
      v-if="isPicked"
      v-model:is-open="isPickOpen"
      drawer-id="drawer-pick-coworker"
      title="Pick co-worker"
      :description="`Pick co-workers to review ${activeRow?.name ?? ''}.`"
      :initial-selected="pickPreselected"
      :exclude-ids="activeRevieweeId ? [activeRevieweeId] : []"
      exclude-note="An employee can't be picked as their own co-worker, so they won't appear in the list below."
      confirm-label="Save"
      :is-required="false"
      @continue="onPickSave"
    />
  </div>
</template>

<style scoped>
/* Reveal the column sort icon on header hover — UNLAYERED so it beats
   PxColumnSortMenu's own scoped `visibility: hidden` base (see goal-cycles/index.vue). */
.rl-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
