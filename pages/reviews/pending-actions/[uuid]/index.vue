<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Reviews / Pending actions — View task (review list)
  Token mode: Pixel 2.4

  Replica of talenta-review's pending-action/active/Detail.vue. Reached from
  the Pending actions list "View task". Shows the members the current reviewer
  must review in this cycle: a summary header (Company / Time frame / Review
  period + Submit/Save as draft/Not started counts), filters (review method /
  status / search), and a member table (avatar+name, review method, status,
  Start review). Bulk select mirrors the app pattern. "Start review" opens the
  scoring form. Data from useReviewSubmissionsStore (real seed, scoped to the
  logged-in reviewer).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpAvatar,
  MpIcon,
  MpSelect,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
  MpCheckbox,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  toast,
  css,
} from '@mekari/pixel3'
import { employeeById } from '~/utils/employees'
import { REVIEW_CYCLES, REVIEW_METHODS } from '~/composables/useReviewSubmissionsStore'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Pending actions', to: '/reviews/pending-actions' },
})

const route = useRoute()
const router = useRouter()
const cycleValue = computed(() => route.params.uuid as string)
const cycle = computed(() => REVIEW_CYCLES.find(c => c.value === cycleValue.value))

const { currentUserId } = useCurrentUser()
const { reviewMembers, reviewMemberCounts } = useReviewSubmissionsStore()

// Set the page title to the cycle name (layout reads route.meta.title / ?name).
watchEffect(() => { route.meta.title = (route.query.name as string) || (cycle.value ? `${cycle.value.label} Performance Review` : 'Review task') })

const counts = computed(() => reviewMemberCounts(currentUserId.value, cycleValue.value))
const statusInfo = computed(() => [
  { icon: 'task-done', title: 'Submit', value: counts.value.submitted },
  { icon: 'task-on-progress', title: 'Save as draft', value: counts.value.draft },
  { icon: 'task-todo', title: 'Not started', value: counts.value.notStarted },
])

// ─── Filters ────────────────────────────────────────────────────────────────
const methodOptions = [{ value: 'all', label: 'All review method' }, ...REVIEW_METHODS.map(m => ({ value: m.value, label: m.label }))]
const statusOptions = [
  { value: 'all', label: 'All status' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'draft', label: 'In progress' },
  { value: 'not_started', label: 'Not started' },
]
const methodFilter = ref('all')
const statusFilter = ref('all')
const search = ref('')

const STATUS_LABEL: Record<string, string> = { submitted: 'Submitted', draft: 'In progress', not_started: 'Not started' }
const STATUS_COLOR: Record<string, string> = { submitted: 'green.400', draft: 'orange.400', not_started: 'gray.300' }
const methodLabel = (k: string) => REVIEW_METHODS.find(m => m.value === k)?.label ?? k

const rows = computed(() => reviewMembers(currentUserId.value, cycleValue.value)
  .map(m => ({ ...m, name: employeeById(m.revieweeId)?.name ?? '', photo: employeeById(m.revieweeId)?.photo, code: employeeById(m.revieweeId)?.code ?? '' }))
  .filter(m => methodFilter.value === 'all' || m.method === methodFilter.value)
  .filter(m => statusFilter.value === 'all' || m.status === statusFilter.value)
  .filter(m => !search.value || m.name.toLowerCase().includes(search.value.toLowerCase()))
  .sort((a, b) => a.name.localeCompare(b.name)))

// ─── Column sort (PxColumnSortMenu) ───────────────────────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  name: 'text',
  method: 'text',
  status: 'text',
}
function memberSortValue(m: { name: string, method: string, status: string }, key: string): string {
  if (key === 'name') return m.name
  if (key === 'method') return methodLabel(m.method)
  if (key === 'status') return STATUS_LABEL[m.status] ?? m.status
  return ''
}
const sortedRows = computed(() => {
  if (!sortKey.value) return rows.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((a, b) =>
    memberSortValue(a, sortKey.value).localeCompare(
      memberSortValue(b, sortKey.value), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})
const isEmpty = computed(() => rows.value.length === 0)

// ─── Bulk select ──────────────────────────────────────────────────────────────
const { selectedIds, selectedCount, isSelected, toggleSelect, isAllSelected, toggleSelectAll, clearSelection } = useGoalBulkSelect()
const rowIds = computed(() => rows.value.map(r => r.id))
const allSelected = computed(() => isAllSelected(rowIds.value))
const someSelected = computed(() => selectedCount.value > 0 && !allSelected.value)
function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && selectedCount.value > 0) clearSelection() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function bulkReview() { toast.notify({ id: 'bulk-review', position: 'top-center', variant: 'information', title: 'Opening bulk review…' }) }
function bulkReset() { toast.notify({ id: 'bulk-reset', position: 'top-center', variant: 'success', title: 'Selected reviews reset' }) }

// ─── Actions ──────────────────────────────────────────────────────────────────
function actionLabel(status: string) { return status === 'not_started' ? 'Start review' : status === 'draft' ? 'Continue' : 'View' }
function startReview(member: { id: string, name: string }) {
  router.push({ path: `/reviews/pending-actions/${cycleValue.value}/review/${member.id}`, query: { name: member.name } })
}

// ─── Date range ─────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtRange(a?: string, b?: string) {
  if (!a || !b) return '-'
  const da = new Date(a); const db = new Date(b)
  return `${da.getDate()} ${MONTHS[da.getMonth()]} - ${db.getDate()} ${MONTHS[db.getMonth()]} ${db.getFullYear()}`
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const summary = css({ display: 'flex', gap: '0', marginBottom: '7', flexWrap: 'wrap' })
const summaryCell = css({ paddingInline: '4', borderRight: '1px solid', borderRightColor: 'border.default', display: 'flex', flexDirection: 'column', gap: '0.5' })
const summaryFirst = css({ paddingRight: '4', paddingLeft: '0', borderRight: '1px solid', borderRightColor: 'border.default', display: 'flex', flexDirection: 'column', gap: '0.5' })
const summaryLabel = css({ fontSize: '12px', color: 'text.secondary' })
const summaryValue = css({ fontSize: '16px', fontWeight: '600', color: 'text.default' })
const countsWrap = css({ display: 'flex', gap: '6', paddingLeft: '4' })
const countItem = css({ display: 'flex', alignItems: 'center', gap: '2' })
const countIcon = css({ color: 'icon.default' })

const filterRow = css({ display: 'flex', alignItems: 'center', gap: '3', marginBottom: '5', flexWrap: 'wrap' })
const selectField = css({ width: '200px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
const searchWidth = css({ width: '224px', marginLeft: 'auto' })

const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const checkCol = css({ width: '44px' })
const headCell = css({ paddingTop: '2', paddingBottom: '2' })
const cell = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
const nameCell = css({ display: 'inline-flex', alignItems: 'center', gap: '3' })
const nameText = css({ fontSize: '14px', color: 'text.default' })
const statusCell = css({ display: 'flex', alignItems: 'center', gap: '2' })
const actionCell = css({ textAlign: 'right', verticalAlign: 'middle' })
const bulkBar = css({ height: '52px', paddingInline: '4', background: 'gray.25' })
const hintText = css({ color: 'text.secondary' })
const emptyWrap = css({ paddingY: '16', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
function dotColor(status: string) { return css({ color: STATUS_COLOR[status] }) }
</script>

<template>
  <MpFlex direction="column">
    <!-- Summary header -->
    <div :class="summary">
      <div :class="summaryFirst">
        <span :class="summaryLabel">Company name</span>
        <span :class="summaryValue">PT Central Perk Indonesia</span>
      </div>
      <div :class="summaryCell">
        <span :class="summaryLabel">Time frame</span>
        <span :class="summaryValue">{{ cycle?.period ?? '-' }}</span>
      </div>
      <div :class="summaryCell">
        <span :class="summaryLabel">Review period</span>
        <span :class="summaryValue">{{ fmtRange(cycle?.reviewStart, cycle?.reviewEnd) }}</span>
      </div>
      <div :class="countsWrap">
        <div v-for="s in statusInfo" :key="s.icon" :class="countItem">
          <MpIcon :name="s.icon" :class="countIcon" />
          <div>
            <div :class="summaryLabel">{{ s.title }}</div>
            <div :class="summaryValue">{{ s.value }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div :class="filterRow">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="selectField">
            <MpSelect :placeholder="methodOptions.find(o => o.value === methodFilter)?.label" tabindex="-1" aria-hidden="true">
              <option v-for="o in methodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem v-for="o in methodOptions" :key="o.value" :is-active="o.value === methodFilter" @click="methodFilter = o.value">{{ o.label }}</MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="selectField">
            <MpSelect :placeholder="statusOptions.find(o => o.value === statusFilter)?.label" tabindex="-1" aria-hidden="true">
              <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem v-for="o in statusOptions" :key="o.value" :is-active="o.value === statusFilter" @click="statusFilter = o.value">{{ o.label }}</MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpFlex :class="searchWidth">
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search employee name..." />
          <MpInputRightAddon v-if="search"><MpIcon name="close" size="sm" :class="css({ cursor: 'pointer' })" @click="search = ''" /></MpInputRightAddon>
        </MpInputGroup>
      </MpFlex>
    </div>

    <MpTableContainer v-if="!isEmpty">
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow v-if="selectedCount > 0">
            <MpTableCell as="th" :colspan="4" :class="css({ padding: '0' })">
              <MpFlex align="center" justify="space-between" :class="bulkBar">
                <MpFlex align="center" gap="4">
                  <MpFlex align="center" gap="2">
                    <MpCheckbox :is-checked="allSelected" :is-indeterminate="someSelected" aria-label="Select all" @update:is-checked="toggleSelectAll(rowIds)" />
                    <MpText size="label" weight="semiBold">{{ selectedCount }} {{ selectedCount === 1 ? 'employee' : 'employees' }} selected</MpText>
                  </MpFlex>
                  <MpButton variant="primary" @click="bulkReview">Review</MpButton>
                  <MpButton variant="danger" @click="bulkReset">Reset review</MpButton>
                  <MpButton variant="ghost" @click="clearSelection">Cancel</MpButton>
                </MpFlex>
                <MpText size="label" :class="hintText">Press esc to deselect</MpText>
              </MpFlex>
            </MpTableCell>
          </MpTableRow>
          <MpTableRow v-else>
            <MpTableCell as="th" :class="[headCell, checkCol]">
              <MpCheckbox :is-checked="allSelected" :is-indeterminate="someSelected" aria-label="Select all" @update:is-checked="toggleSelectAll(rowIds)" />
            </MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Full name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Review method</span><PxColumnSortMenu col-key="method" :sort-type="columnSortTypes.method" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" :class="headCell" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="m in sortedRows" :key="m.id">
            <MpTableCell as="td" :class="[cell, checkCol]">
              <MpCheckbox :is-checked="isSelected(m.id)" @update:is-checked="toggleSelect(m.id)" :aria-label="`Select ${m.name}`" />
            </MpTableCell>
            <MpTableCell as="td" :class="cell">
              <span :class="nameCell">
                <PxAvatar :id="`rev-${m.id}`" :name="m.name" :src="m.photo" size="md" variant-color="gray" />
                <span :class="nameText">{{ m.name }}</span>
              </span>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">{{ methodLabel(m.method) }}</MpTableCell>
            <MpTableCell as="td" :class="cell">
              <span :class="statusCell">
                <MpIcon name="indicator-circle" size="sm" :class="dotColor(m.status)" />
                {{ STATUS_LABEL[m.status] }}
              </span>
            </MpTableCell>
            <MpTableCell as="td" :class="[cell, actionCell]">
              <MpButton variant="secondary" @click="startReview(m)">{{ actionLabel(m.status) }}</MpButton>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <MpFlex v-else direction="column" :class="emptyWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="css({ height: '180px', width: 'auto' })">
      <MpText :class="emptyTitle">No review task</MpText>
      <MpText size="label" :class="captionText">There is no one to review for this selection.</MpText>
    </MpFlex>
  </MpFlex>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered scoped `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
