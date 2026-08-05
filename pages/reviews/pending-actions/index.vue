<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Reviews / Pending actions
  Token mode: Pixel 2.4

  Replica of talenta-review's performance-review/pending-action list
  (active/List.vue + archive/List.vue). Two tabs:
    Active  — cycles with review tasks still to submit (status filter +
              company + search; columns Cycle name / Time frame / Review period
              / Pending task / View task).
    History — closed cycles (company + search; columns Cycle name / Time frame /
              Review period[Closed]; actions Co-worker list / Goal list /
              Review list → modals / review list).
  Rows come from the review-submissions seed scoped to the current reviewer
  (useReviewSubmissionsStore.pendingActionTasks). "View task" opens the review
  task detail.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpBadge,
  MpIcon,
  MpSelect,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
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
import type { PendingActionRow } from '~/composables/useReviewSubmissionsStore'

definePageMeta({ title: 'Pending actions' })

const router = useRouter()
const { currentUserId } = useCurrentUser()
const { pendingActionTasks } = useReviewSubmissionsStore()

type Tab = 'active' | 'history'
const activeTab = ref<Tab>('active')

// ─── Filters ────────────────────────────────────────────────────────────────
const statusOptions = [
  { id: 'all', name: 'All type' },
  { id: 'started', name: 'Started' },
  { id: 'not-started', name: 'Not started' },
]
const statusFilter = ref('all')
const companyOptions = [{ value: 'central-perk', label: 'PT Central Perk Indonesia' }]
const companyFilter = ref('central-perk')
const search = ref('')

watch(activeTab, () => { statusFilter.value = 'all'; search.value = ''; currentPage.value = 1 })

// ─── Rows (from the review seed, scoped to the current reviewer) ──────────────
const allRows = computed(() => pendingActionTasks(currentUserId.value, activeTab.value))
const filtered = computed(() => {
  let list = allRows.value
  if (activeTab.value === 'active' && statusFilter.value !== 'all') {
    list = list.filter(r => (statusFilter.value === 'started' ? r.started : !r.started))
  }
  if (search.value) list = list.filter(r => r.name.toLowerCase().includes(search.value.toLowerCase()))
  return list
})

// ─── Column sort (PxColumnSortMenu) ───────────────────────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  name: 'text',
  timeFrame: 'date',
  reviewPeriod: 'date',
  pending: 'number',
}
function sortValue(r: PendingActionRow, key: string): string | number {
  if (key === 'name') return r.name
  if (key === 'timeFrame') return r.start
  if (key === 'reviewPeriod') return r.reviewStart
  if (key === 'pending') return r.totalNotSubmitted
  return ''
}
const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// ─── Pagination ───────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sorted.value.slice(showingFrom.value - 1, showingTo.value))
watch([statusFilter, search, rowsPerPage], () => { currentPage.value = 1 })
const isEmpty = computed(() => filtered.value.length === 0)

// ─── Date formatting ──────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmt(iso: string) { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
function fmtRange(a: string, b: string) {
  const da = new Date(a); const db = new Date(b)
  if (da.getFullYear() === db.getFullYear()) return `${da.getDate()} ${MONTHS[da.getMonth()]} - ${db.getDate()} ${MONTHS[db.getMonth()]} ${db.getFullYear()}`
  return `${fmt(a)} - ${fmt(b)}`
}
function fmtMonthYear(iso: string) { const d = new Date(iso); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }

// ─── Actions ──────────────────────────────────────────────────────────────────
function viewTaskDisabled(row: PendingActionRow) { return !row.started }
function viewTask(row: PendingActionRow) {
  router.push({ path: `/reviews/pending-actions/${row.uuid}`, query: { name: row.name } })
}
function reviewList(row: PendingActionRow) {
  router.push({ path: `/reviews/pending-actions/${row.uuid}`, query: { name: row.name } })
}

const isGoalOpen = ref(false)
const isCoworkerOpen = ref(false)
const activeCycleName = ref('')
function openGoalList(row: PendingActionRow) { activeCycleName.value = row.name; isGoalOpen.value = true }
function openCoworkerList(row: PendingActionRow) { activeCycleName.value = row.name; isCoworkerOpen.value = true }

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2', paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400', color: 'text.secondary',
  background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })

const filterRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', marginBottom: '5', flexWrap: 'wrap' })
const filterLeft = css({ display: 'flex', alignItems: 'center', gap: '2', flexWrap: 'wrap' })
const selectField = css({ width: '176px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
const searchWidth = css({ width: '224px' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const headCell = css({ paddingTop: '2', paddingBottom: '2' })
const cell = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
const subText = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const periodCell = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
const actionCell = css({ verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2' })
const actionsWrap = css({ display: 'inline-flex', gap: '2', justifyContent: 'flex-end' })
const captionText = css({ color: 'text.secondary' })
const dotGreen = css({ color: 'green.400' })
const dotGray = css({ color: 'gray.300' })
const emptyWrap = css({ paddingY: '16', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', color: 'text.default' })
const banner = css({ marginBottom: '5' })
</script>

<template>
  <!-- Tabs in the layout's page-tabs zone -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <button type="button" :class="activeTab === 'active' ? tabItemActive : tabItem" @click="activeTab = 'active'">Active</button>
      <button type="button" :class="activeTab === 'history' ? tabItemActive : tabItem" @click="activeTab = 'history'">History</button>
    </div>
  </Teleport>

  <MpFlex direction="column">
    <!-- Filter bar -->
    <div :class="filterRow">
      <div :class="filterLeft">
        <MpPopover v-if="activeTab === 'active'" is-close-on-select is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="selectField">
              <MpSelect :placeholder="statusOptions.find(o => o.id === statusFilter)?.name" tabindex="-1" aria-hidden="true">
                <option v-for="o in statusOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem v-for="o in statusOptions" :key="o.id" :is-active="o.id === statusFilter" @click="statusFilter = o.id">{{ o.name }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>

        <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="css({ width: '240px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })">
              <MpSelect :placeholder="companyOptions.find(o => o.value === companyFilter)?.label" tabindex="-1" aria-hidden="true">
                <option v-for="o in companyOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem v-for="o in companyOptions" :key="o.value" :is-active="o.value === companyFilter" @click="companyFilter = o.value">{{ o.label }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
      </div>

      <MpFlex :class="searchWidth">
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search cycle name..." />
          <MpInputRightAddon v-if="search"><MpIcon name="close" size="sm" :class="css({ cursor: 'pointer' })" @click="search = ''" /></MpInputRightAddon>
        </MpInputGroup>
      </MpFlex>
    </div>

    <template v-if="!isEmpty">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Cycle name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Time frame</span><PxColumnSortMenu col-key="timeFrame" :sort-type="columnSortTypes.timeFrame" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Review period</span><PxColumnSortMenu col-key="reviewPeriod" :sort-type="columnSortTypes.reviewPeriod" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="activeTab === 'active'" as="th" class="sort-th" :class="headCell">
                <span :class="thInner"><span>Pending task</span><PxColumnSortMenu col-key="pending" :sort-type="columnSortTypes.pending" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" :class="headCell" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="row in paged" :key="row.id">
              <MpTableCell as="td" :class="cell">{{ row.name }}</MpTableCell>
              <MpTableCell as="td" :class="cell">
                {{ row.timeFrame }}
                <div :class="subText">{{ fmtRange(row.start, row.end) }}</div>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">
                <div :class="periodCell">
                  <MpIcon name="indicator-circle" size="sm" :class="activeTab === 'history' || !row.started ? dotGray : dotGreen" />
                  <div>
                    {{ activeTab === 'history' ? 'Closed' : row.started ? 'Started' : 'Not started' }}
                    <div :class="subText">
                      {{ fmtRange(row.reviewStart, row.reviewEnd) }}
                      <MpBadge v-if="row.isExtend" for="tableStatus" type="completed" size="sm">{{ fmtMonthYear(row.extendDate) }}</MpBadge>
                    </div>
                  </div>
                </div>
              </MpTableCell>
              <MpTableCell v-if="activeTab === 'active'" as="td" :class="cell">{{ row.totalNotSubmitted }}</MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpButton v-if="activeTab === 'active'" variant="secondary" :is-disabled="viewTaskDisabled(row)" @click="viewTask(row)">View task</MpButton>
                <span v-else :class="actionsWrap">
                  <MpButton v-if="row.showCoworkerList" variant="secondary" @click="openCoworkerList(row)">Co-worker list</MpButton>
                  <MpButton v-if="row.showGoalList" variant="secondary" @click="openGoalList(row)">Goal list</MpButton>
                  <MpButton v-if="row.showReviewList" variant="secondary" @click="reviewList(row)">Review list</MpButton>
                </span>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer -->
      <div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '1' })">
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
    </template>

    <MpFlex v-else direction="column" :class="emptyWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="css({ height: '200px', width: 'auto' })">
      <MpText :class="emptyTitle">{{ activeTab === 'active' ? 'Current task review' : 'Review history' }}</MpText>
      <MpText size="label" :class="captionText">{{ activeTab === 'active' ? 'There is no task to review assigned to you.' : 'There is no history to view.' }}</MpText>
    </MpFlex>
  </MpFlex>

  <PendingGoalListModal v-model:is-open="isGoalOpen" :cycle-name="activeCycleName" />
  <PendingCoworkerListModal v-model:is-open="isCoworkerOpen" />
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered scoped `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
