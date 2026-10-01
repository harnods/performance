<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Development plan detail
  Replicated from production (talenta-performance:
    individual-development/Detail.vue).
  Plan summary (employee / objective / per-status totals), then the plan's
  action plans as a Default table with its own add / update / edit / delete.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon, MpBadge,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpTooltip, toast, css,
} from '@mekari/pixel3'
import { TALENTS } from '~/utils/talents'
import {
  ACTION_PLAN_STATUSES, STATUS_BY_ID, statusTotals, focusLabel, focusPosition,
  type ActionPlan, type ActionPlanDraft, type ActionPlanStatus,
} from '~/utils/idp'

definePageMeta({
  title: 'Development plan',
  layout: 'default',
  breadcrumb: { label: 'IDP', to: '/talents/idps' },
})

const route = useRoute()
const router = useRouter()
const { planById, addActionPlan, updateActionPlan, deleteActionPlan, setActionPlanStatus } = useIdpStore()
const { currentUserId } = useCurrentUser()

const planId = computed(() => String(route.params.id))
const plan = computed(() => planById(planId.value))
const employee = computed(() => TALENTS.find(t => t.id === plan.value?.employeeId))
const totals = computed(() => (plan.value ? statusTotals(plan.value) : { 0: 0, 1: 0, 2: 0 }))

// ─── Filters ─────────────────────────────────────────────────────────────────
const search = ref('')
const statusFilter = ref('')
const statusOptions = ACTION_PLAN_STATUSES.map(s => ({ value: String(s.id), label: s.title }))

const rows = computed(() => (plan.value?.actionPlans ?? []).filter((a) => {
  if (statusFilter.value !== '' && String(a.status) !== statusFilter.value) return false
  const q = search.value.trim().toLowerCase()
  return !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
}))

// Production's summary reads Completed → In progress → To do; the status list
// itself is defined ascending because the filter and badges want it that way.
const summaryStatuses = computed(() => [...ACTION_PLAN_STATUSES].reverse())

// ─── Column sort (docs/patterns/table.md) ────────────────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  name: 'text', category: 'text', startDate: 'date', dueDate: 'date', status: 'number',
}
function sortValue(a: ActionPlan, key: string): string | number {
  if (key === 'name') return a.name
  if (key === 'category') return a.category
  if (key === 'startDate') return a.startDate
  if (key === 'dueDate') return a.dueDate
  if (key === 'status') return a.status
  return ''
}
const sorted = computed(() => {
  if (!sortKey.value) return rows.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((x, y) =>
    String(sortValue(x, sortKey.value)).localeCompare(String(sortValue(y, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' }) * dir,
  )
})

// ─── Pagination (docs/patterns/pagination.md) ────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => rows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sorted.value.slice(showingFrom.value - 1, showingTo.value))
watch([search, statusFilter], () => { currentPage.value = 1 })

// ─── Action plan CRUD ────────────────────────────────────────────────────────
const isFormOpen = ref(false)
const editingDraft = ref<ActionPlanDraft | null>(null)
const isDeleteOpen = ref(false)
const pendingDelete = ref<ActionPlan | null>(null)
const viewing = ref<ActionPlan | null>(null)

function openAdd() {
  editingDraft.value = null
  isFormOpen.value = true
}
function openEdit(a: ActionPlan) {
  editingDraft.value = {
    id: a.id, name: a.name, category: a.category, description: a.description,
    startDate: a.startDate, dueDate: a.dueDate,
    assignees: [...a.assignees], attachments: [...a.attachments],
    relatedTo: a.relatedTo, relatedCompetency: a.relatedCompetency,
  }
  isFormOpen.value = true
}
function onSaveActionPlan(draft: ActionPlanDraft) {
  const body = {
    name: draft.name, category: draft.category, description: draft.description,
    startDate: draft.startDate, dueDate: draft.dueDate,
    assignees: draft.assignees, attachments: draft.attachments,
    relatedTo: draft.relatedTo, relatedCompetency: draft.relatedCompetency,
  }
  if (draft.id) updateActionPlan(planId.value, draft.id, body)
  else addActionPlan(planId.value, body, currentUserId.value)
}
function openDelete(a: ActionPlan) {
  pendingDelete.value = a
  isDeleteOpen.value = true
}
function confirmDelete() {
  if (pendingDelete.value) deleteActionPlan(planId.value, pendingDelete.value.id)
  isDeleteOpen.value = false
  pendingDelete.value = null
  toast.notify({ id: 'idp-ap-deleted', position: 'top-center', variant: 'success', title: 'Action plan deleted' })
}
function changeStatus(a: ActionPlan, status: ActionPlanStatus) {
  setActionPlanStatus(planId.value, a.id, status, currentUserId.value)
  // Keep the open view modal showing the row it was opened on.
  if (viewing.value?.id === a.id) viewing.value = plan.value?.actionPlans.find(x => x.id === a.id) ?? null
}

function openEditPlan() { router.push(`/talents/idps/${planId.value}/edit`) }

// Date only — `DD Mon YYYY` (docs/patterns/date-format.md).
function formatDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
// 25 / 25 / 50, mirroring production's plan-detail header. Collapses to stacked
// rows below lg so the three status totals never squeeze.
const summaryRow = css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '1fr 1fr 2fr' }, gap: '0' })
const summaryCell = css({ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1', paddingInline: '4', paddingBlock: '2', borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', _first: { paddingLeft: '0' }, _last: { borderRightWidth: '0' } })
const summaryLabel = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// Overrides summaryCell's column direction — the three status totals sit in a row.
const statusGroup = css({ flexDirection: 'row', alignItems: 'center', gap: '8', paddingLeft: '4' })
const statusItem = css({ display: 'flex', alignItems: 'center', gap: '3' })
const statusTotal = css({ fontSize: '20px', fontWeight: '600', lineHeight: '28px', color: 'text.default', fontVariantNumeric: 'tabular-nums' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', flexWrap: 'wrap' })
// No explicit font/color here — the MpTable recipe supplies the th's own
// 14px/600/text.default styling. Only padding + alignment are ours to set
// (docs/patterns/table.md's "Header (th) styling" rule).
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Trailing action column shrinks to its content instead of stretching
// (docs/patterns/table.md's numeric-cols idiom).
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const nameText = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const subText = css({ fontSize: '12px', color: 'text.secondary' })
const captionText = css({ color: 'text.secondary' })
const emptyBlock = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1', paddingBlock: '16', textAlign: 'center' })
const notFound = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2', paddingBlock: '16', textAlign: 'center' })
</script>

<template>
  <template v-if="plan">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="secondary" @click="openEditPlan">Edit</MpButton>
      <MpButton variant="primary" left-icon="add" @click="openAdd">Add action plan</MpButton>
    </Teleport>

    <div :class="page">
      <!-- Plan summary -->
      <div :class="summaryRow">
        <div :class="summaryCell">
          <MpFlex align="center" gap="2">
            <PxAvatar :id="`idp-detail-${plan.id}`" :name="employee?.name" :src="employee?.photo" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <span :class="nameText">{{ employee?.name }}</span>
              <span :class="subText">{{ focusLabel(plan) }} · {{ focusPosition(plan) || '-' }}</span>
            </MpFlex>
          </MpFlex>
        </div>
        <div :class="summaryCell">
          <span :class="summaryLabel">Objective</span>
          <MpText>{{ plan.objective || '-' }}</MpText>
        </div>
        <div :class="[summaryCell, statusGroup]">
          <div v-for="s in summaryStatuses" :key="s.id" :class="statusItem">
            <MpIcon :name="s.icon" />
            <MpFlex direction="column" gap="0">
              <span :class="summaryLabel">{{ s.title }}</span>
              <span :class="statusTotal">{{ totals[s.id] }}</span>
            </MpFlex>
          </div>
        </div>
      </div>

      <!-- Filter bar -->
      <div :class="filterBar">
        <PxSelectPopover v-model="statusFilter" :options="statusOptions" placeholder="All status" :width="'200px'" is-clearable />
        <MpInputGroup :class="css({ width: '260px' })">
          <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search action plan..." />
        </MpInputGroup>
      </div>

      <!-- Action plans -->
      <MpFlex direction="column">
        <MpTableContainer>
          <MpTable :is-hoverable="false">
            <MpTableHead>
              <MpTableRow>
                <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Action plan</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Category</span><PxColumnSortMenu col-key="category" :sort-type="columnSortTypes.category" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                <MpTableCell as="th" :class="headCell">Relation</MpTableCell>
                <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Start date</span><PxColumnSortMenu col-key="startDate" :sort-type="columnSortTypes.startDate" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Due date</span><PxColumnSortMenu col-key="dueDate" :sort-type="columnSortTypes.dueDate" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                <MpTableCell as="th" :class="actionHead" />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="a in paged" :key="a.id">
                <MpTableCell as="td" :class="cell">{{ a.name }}</MpTableCell>
                <MpTableCell as="td" :class="cell">{{ a.category }}</MpTableCell>
                <MpTableCell as="td" :class="cell">
                  <MpFlex v-if="a.relatedTo === 'competency' && a.relatedCompetency" direction="column" gap="0">
                    <span :class="subText">Competency</span>
                    <span>{{ a.relatedCompetency }}</span>
                  </MpFlex>
                  <span v-else>-</span>
                </MpTableCell>
                <MpTableCell as="td" :class="cell">{{ formatDate(a.startDate) }}</MpTableCell>
                <MpTableCell as="td" :class="cell">{{ formatDate(a.dueDate) }}</MpTableCell>
                <MpTableCell as="td" :class="cell">
                  <MpBadge for="tableStatus" :type="STATUS_BY_ID[a.status].badge">{{ STATUS_BY_ID[a.status].title }}</MpBadge>
                </MpTableCell>
                <MpTableCell as="td" :class="actionCell">
                  <MpPopover is-close-on-select use-portal placement="bottom-end">
                    <MpPopoverTrigger>
                      <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                    </MpPopoverTrigger>
                    <MpPopoverContent :class="css({ minWidth: '180px' })">
                      <MpPopoverList>
                        <MpPopoverListItem @click="viewing = a">Update</MpPopoverListItem>
                        <MpPopoverListItem @click="openEdit(a)">Edit</MpPopoverListItem>
                        <MpPopoverListItem @click="openDelete(a)"><span :class="css({ color: 'text.danger' })">Delete</span></MpPopoverListItem>
                      </MpPopoverList>
                    </MpPopoverContent>
                  </MpPopover>
                </MpTableCell>
              </MpTableRow>
              <MpTableRow v-if="!rows.length && plan.actionPlans.length">
                <MpTableCell as="td" :colspan="7" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                  No action plan matches your filters.
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
          <div v-if="!plan.actionPlans.length" :class="emptyBlock">
            <MpIcon name="task-todo" size="lg" :class="css({ color: 'icon.secondary' })" />
            <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">No action plan yet</MpText>
            <MpText size="label" :class="captionText">Add an action plan to start making progress.</MpText>
          </div>
        </MpTableContainer>

        <!-- Pagination footer -->
        <div v-if="totalRows" :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
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
          <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
            <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
            <MpTooltip label="Prev page" use-portal>
              <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
            </MpTooltip>
            <MpTooltip label="Next page" use-portal>
              <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
            </MpTooltip>
          </div>
        </div>
      </MpFlex>
    </div>

    <IdpActionPlanModal
      :is-open="isFormOpen"
      :draft="editingDraft"
      :default-assignees="plan.employeeId ? [plan.employeeId] : []"
      @update:is-open="(v: boolean) => (isFormOpen = v)"
      @save="onSaveActionPlan"
    />

    <IdpActionPlanViewModal
      :is-open="!!viewing"
      :action-plan="viewing"
      @update:is-open="(v: boolean) => { if (!v) viewing = null }"
      @status-change="(s: ActionPlanStatus) => viewing && changeStatus(viewing, s)"
    />

    <IdpDeleteModal
      :is-open="isDeleteOpen"
      kind="action"
      :plan-name="pendingDelete?.name ?? ''"
      @update:is-open="(v: boolean) => (isDeleteOpen = v)"
      @confirm="confirmDelete"
    />
  </template>

  <MpFlex v-else :class="notFound">
    <MpText weight="semiBold">Development plan not found</MpText>
    <MpButton variant="secondary" @click="router.push('/talents/idps')">Back to IDPs</MpButton>
  </MpFlex>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered scoped `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
