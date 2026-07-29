<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle details / Company goals
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4457:91146)
  Token mode: Pixel 2.4

  Different table shape from ../index.vue (All goals): each row has its own
  Owner (no single locked owner column), progress shows value + a green pill +
  bar + min–max range, and Status is its own colored pill column instead of a
  badge next to the value. All 7 rows/owners/weights/colors read directly off
  the frame; the pill next to the bold value is green on every row regardless
  of on-track/off-track (verified in the source — only the bar fill + Status
  column vary green/orange).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpIcon,
  MpSelect,
  MpInputGroup,
  MpInputLeftAddon,
  MpInput,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpCheckbox,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpBadge,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpButtonGroup,
  css,
} from '@mekari/pixel3'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
})

const route = useRoute()
const router = useRouter()

const { pendingItemsCount, submissions } = useGoalApprovalsStore(route.params.id as string)
const { currentUserId } = useCurrentUser()
const myPendingRequestsCount = computed(() => submissions.value.filter(s => s.ownerId === currentUserId.value && s.status === 'pending').length)

// The Actions column only pins itself (sticky + boundary shadow) once the
// table actually needs to scroll horizontally — otherwise it's just a
// normal last column.
const { wrapperRef, hasOverflow } = useTableHorizontalScroll()

// "New goals" entry point — pick one or more employees in the drawer, then
// continue to the bulk "New goals" page (./new) where every goal added
// applies to all of them.
const isSelectEmployeeOpen = ref(false)

function openSelectEmployee() {
  isSelectEmployeeOpen.value = true
}
function continueToNewGoals(employeeIds: string[]) {
  router.push({ path: `/goals/goal-cycles/${route.params.id}/new`, query: { employees: employeeIds.join(',') } })
}

type Tab = 'all' | 'requests' | 'awaiting' | 'info'
const activeTab = ref<Tab>('all')

// Switching "View as" persona can make the active tab invisible (e.g. an
// admin on "Awaiting approval" switches to a non-admin persona) — fall back
// to "All goals" rather than leaving stale, no-longer-permitted content on screen.
watch(currentUserId, () => {
  if (activeTab.value === 'awaiting' && !isSuperAdmin(currentUserId.value)) activeTab.value = 'all'
  if (activeTab.value === 'requests' && !hasManager(currentUserId.value)) activeTab.value = 'all'
})

const goalsViewOptions = [
  { key: 'all', label: 'All goals' },
  { key: 'my', label: 'My goals' },
  { key: 'direct-reports', label: 'My direct reports' },
  { key: 'company', label: 'Company goals' },
  { key: 'organization', label: 'Organization goals' },
  { key: 'team', label: 'Team goals' },
  { key: 'individual', label: 'Individual goals' },
] as const
type GoalsViewKey = typeof goalsViewOptions[number]['key']
const goalsView = ref<GoalsViewKey>('company')

const scopedRoutes: Partial<Record<GoalsViewKey, string>> = {
  organization: 'organization-goals',
  team: 'team-goals',
  individual: 'individual-goals',
}

function selectGoalsView(key: GoalsViewKey) {
  if (key === 'company') {
    goalsView.value = key
    activeTab.value = 'all'
    return
  }
  const slug = scopedRoutes[key]
  router.push({ path: `/goals/goal-cycles/${route.params.id}${slug ? `/${slug}` : ''}`, query: route.query })
}

const statusFilter = ref('')
const search = ref('')

// Column visibility — "Goal" is the anchor column (locked, always on, shown
// disabled in the popover); the rest are toggleable.
const columnOptions = [
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub-category' },
  { key: 'owner', label: 'Owner' },
  { key: 'progress', label: 'Progress' },
  { key: 'status', label: 'Status' },
] as const
type ColumnKey = typeof columnOptions[number]['key']
const visibleColumns = reactive<Record<ColumnKey, boolean>>({
  category: true,
  subCategory: true,
  owner: true,
  progress: true,
  status: true,
})

// ─── Live data — read from the goals mini-DB (useGoalsStore): every
// level:'company' goal, sorted by category into rowspan groups. Company
// goals are shared across department heads (several people can jointly own
// goals under the same category, e.g. Financial = Rizal + Evelyn), so the
// rowspan groups by category alone here — groupByOwner:false — unlike every
// other Goals page, where each owner's category weight is their own
// independent budget and must never merge with a colleague's row. ────────
type GoalStatus = 'green' | 'orange' | 'gray'

const { companyGoals, goals } = useGoalsStore(route.params.id as string)
const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === route.params.id))

// Someone whose committed goals already total 100% has no weight left to
// give a new one — keep them out of the "New goals" picker entirely rather
// than letting them through only to hit the "must equal 100%" block at Save.
// Only matters when this cycle actually enforces the weight rule.
const fullOwnerIds = computed(() => (cycle.value?.weightMandatory ? fullyWeightedOwnerIds(goals.value) : new Set<string>()))

const { isEditDrawerOpen, editingDraft, editingOwners, alreadyUsedWeightForEdit, openEditGoal, saveEdit } = useGoalEditor()
function editRow(row: { id: string }) {
  const g = goals.value.find(x => x.id === row.id)
  if (g) openEditGoal(g)
}
const { isDeleteModalOpen, goalToDelete, askDeleteGoal, confirmDeleteGoal } = useGoalDeleter()
function deleteRow(row: { id: string }) {
  const g = goals.value.find(x => x.id === row.id)
  if (g) askDeleteGoal(g)
}

// Bulk select — Select is always the first column; only real 'main' rows
// are selectable (aligned rows are a nested reference to a goal already
// listed under its own owner elsewhere).
const { selectedIds, selectedCount, isSelected, toggleSelect, isAllSelected, toggleSelectAll, clearSelection } = useGoalBulkSelect()
function goToImport(mode: 'edit-goals' | 'update-progress' | 'close-goals') {
  router.push({ path: `/goals/goal-cycles/${route.params.id}/import`, query: { mode, ids: [...selectedIds.value].join(',') } })
}
const { isBulkDeleteModalOpen, confirmBulkDelete } = useGoalBulkDeleter()
// Select + Goal + Actions are always rendered; the rest follow visibleColumns.
// Used as the colspan for the single merged cell that replaces this header
// row's columns while 1+ rows are selected.
const headerColCount = computed(() => 3
  + [visibleColumns.category, visibleColumns.subCategory, visibleColumns.owner, visibleColumns.progress, visibleColumns.status].filter(Boolean).length)

const filteredGoals = computed(() => companyGoals.value.filter(g =>
  (!statusFilter.value || g.status === ({ ontrack: 'green', atrisk: 'orange' } as Record<string, GoalStatus>)[statusFilter.value])
  && matchesSearch(g, search.value),
))

const rows = computed(() => withRowSpans(sortByCategory(filteredGoals.value, { groupByOwner: false }), { groupByOwner: false }).map(g => ({
  id: g.id,
  showCategory: g.showCategory,
  categoryRowspan: g.categoryRowspan,
  category: g.category,
  categoryWeight: g.categoryWeight,
  showSubCategory: g.showSubCategory,
  subCategoryRowspan: g.subCategoryRowspan,
  subCategory: g.subCategory,
  code: g.code,
  title: g.title,
  weight: g.weight,
  alignedGoals: alignedGoalsOf(g, goals.value),
  owner: ownerOf(g.ownerId),
  status: g.status,
  unit: g.unit,
  value: g.value,
  pill: g.pill,
  min: g.min,
  max: g.max,
  isDraft: g.isDraft,
})))

// "View aligned goals" inserts a real row per aligned goal right below its
// parent — Category/Sub-category keep merging across them (rowspan
// extended in expandAlignedRows), while Goal/Owner/Progress/Status each get
// their own row for every aligned child, since those are per-goal values.
const expandedAligned = reactive<Record<string, boolean>>({})
function toggleAligned(id: string) {
  expandedAligned[id] = !expandedAligned[id]
}
const displayRows = computed(() => expandAlignedRows(rows.value, expandedAligned))
const selectableIds = computed(() => displayRows.value.filter(r => r.kind === 'main').map(r => r.id))

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2',
  paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400',
  color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })

const statusFieldClass = css({ width: '160px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })

const awaitingBadge = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '20px', height: '20px', paddingInline: '1.5', borderRadius: 'full',
  background: 'orange.400', color: 'white', fontSize: '14px', lineHeight: '20px',
})

const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
const accordionHeader = css({
  display: 'flex', alignItems: 'center', height: '44px', paddingInline: '2', paddingBlock: '3',
  background: 'gray.50', borderBottom: '1px solid', borderBottomColor: 'border.default',
})

const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const headerLabel = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

// Fixed table layout so every column keeps a stable width regardless of which
// optional columns are toggled on/off via Column settings. Goal is
// intentionally the one column with no fixed width — it absorbs all
// remaining space, pushing the 52px action column flush against the right
// edge instead of it stretching along with everything else. minWidth on the
// table is required here: without it, table-layout:fixed squeezes Goal down
// to ~0 on a narrow viewport instead of overflowing into horizontal scroll,
// which breaks its text one character per line.
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1280px' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
const colGoal = css({ minWidth: '300px' })
const colOwner = css({ width: '200px' })
const colProgress = css({ width: '200px' })
const colStatus = css({ width: '136px' })
// Action column is a hard 52px: 36px icon button + 8px padding each side.
const actionHead = css({ width: '52px', paddingLeft: '2', paddingRight: '2', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', paddingLeft: '2', paddingRight: '2', width: '52px', whiteSpace: 'nowrap', verticalAlign: 'top' })
// Sticky right column (Actions), matching ../index.vue: `is-fixed` alone
// only tags the cell (data-table-cell-fixed) — position:sticky/z-index/
// background need setting explicitly. Border is a plain 1px like every
// other column divider, not a heavier "sticky" emphasis.
const fixedRightCol = css({ position: 'sticky', right: '0', zIndex: '1', boxShadow: 'inset 1px 0px var(--mp-colors-border-default)' })
const fixedBodyBg = css({ background: 'white' })
const colCheckbox = css({ width: '48px', paddingLeft: '4', paddingRight: '2' })
// Zeroes out the default th/td padding so GoalBulkActionBar's own 52px
// height/fill is exactly what renders — no extra cell padding stacking on top.
const noCellPadding = css({ padding: '0' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

// Flex children default to min-width:auto, so long unbroken text refuses to
// shrink below its own intrinsic width and bleeds out of the cell —
// min-width:0 lets the flex box shrink, break-word lets long text wrap.
// Applied to every cell's content wrapper, not just Goal.
const cellContent = css({ minWidth: '0', width: '100%', whiteSpace: 'normal', overflowWrap: 'break-word' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const alignedLink = css({
  display: 'inline-flex', alignItems: 'center', gap: '1', marginTop: '1',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.default', fontSize: '14px', lineHeight: '20px',
})
// A real inserted row for one aligned child goal — no background tint (stays
// white), just a blue left border on the Goal cell to mark it as a child row.
const alignedGoalCell = css({ borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: 'border.brand' })
// Indent = the "View aligned goals" icon (size sm = 1.25rem) + its gap
// (spacing.1 = 0.25rem) — lines the child row's code/title/weight up with
// that button's text, not its icon.
const alignedGoalIndent = css({ paddingLeft: '1.5rem' })

const progressCellWidth = css({ width: '100%' })
const progressTrack = css({ width: '100%', height: '8px', borderRadius: 'full', background: 'border.default', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })

const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
const statusLabel: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not started' }

// Empty state — a brand-new goal cycle has no goals at all yet, so replace
// the filter bar + table entirely (same pattern as
// pages/reviews/review-cycles/[id]/index.vue's "No review timeframe yet").
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <!-- Page header actions -->
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="secondary" right-icon="caret-down">Import goals</MpButton>
    <MpButton variant="primary" @click="openSelectEmployee">New goals</MpButton>
  </Teleport>

  <!-- Tabs -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <MpPopover is-close-on-select use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <button type="button" :class="activeTab === 'all' ? tabItemActive : tabItem" @click="activeTab = 'all'">
            Company goals
            <MpIcon name="caret-down" size="sm" />
          </button>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem
              v-for="opt in goalsViewOptions"
              :key="opt.key"
              :is-active="opt.key === goalsView"
              @click="selectGoalsView(opt.key)"
            >
              {{ opt.label }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
      <button v-if="hasManager(currentUserId)" type="button" :class="activeTab === 'requests' ? tabItemActive : tabItem" @click="activeTab = 'requests'">
        My requests
        <span v-if="myPendingRequestsCount > 0" :class="awaitingBadge">{{ myPendingRequestsCount }}</span>
      </button>
      <button v-if="isSuperAdmin(currentUserId)" type="button" :class="activeTab === 'awaiting' ? tabItemActive : tabItem" @click="activeTab = 'awaiting'">
        Awaiting approval
        <span v-if="pendingItemsCount > 0" :class="awaitingBadge">{{ pendingItemsCount }}</span>
      </button>
      <button type="button" :class="activeTab === 'info' ? tabItemActive : tabItem" @click="activeTab = 'info'">
        Goal cycle info
      </button>
    </div>
  </Teleport>

  <MpFlex v-if="activeTab !== 'info'" direction="column" gap="6">
    <GoalMyRequestsList v-if="activeTab === 'requests'" :cycle-id="route.params.id as string" />
    <GoalApprovalQueue v-else-if="activeTab === 'awaiting'" :cycle-id="route.params.id as string" />
    <template v-else>
    <!-- Empty state: brand-new goal cycle, no Company-level goals yet -->
    <MpFlex v-if="goals.length === 0" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
        <MpText :class="emptyTitle">No goals in this cycle yet</MpText>
        <MpText size="label" :class="captionText">Goals you add to this cycle will appear here.</MpText>
      </MpFlex>
      <MpButton variant="primary" left-icon="add" @click="openSelectEmployee">New goals</MpButton>
    </MpFlex>

    <template v-else>
    <!-- Filter bar — always visible; the bulk-action summary replaces the
         table's own header row instead (see MpTableHead below), not this bar. -->
    <MpFlex align="center" justify="space-between" gap="4" wrap="wrap">
      <MpFlex align="center" gap="4" wrap="wrap">
        <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="statusFieldClass">
              <MpSelect v-model="statusFilter" placeholder="Status" is-clearable tabindex="-1" aria-hidden="true">
                <option value="ontrack">On track</option>
                <option value="atrisk">Off track</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem :is-active="statusFilter === 'ontrack'" @click="statusFilter = 'ontrack'">On track</MpPopoverListItem>
              <MpPopoverListItem :is-active="statusFilter === 'atrisk'" @click="statusFilter = 'atrisk'">Off track</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpButton variant="secondary">All filters</MpButton>
      </MpFlex>

      <MpFlex align="center" gap="2">
        <MpPopover use-portal placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" />
          </MpPopoverTrigger>
          <MpPopoverContent :class="css({ minWidth: '200px' })">
            <MpPopoverList>
              <MpPopoverListItem is-disabled>
                <MpCheckbox id="col-goal" is-checked is-disabled>Goal</MpCheckbox>
              </MpPopoverListItem>
              <MpPopoverListItem v-for="col in columnOptions" :key="col.key">
                <MpCheckbox :id="`col-${col.key}`" v-model:is-checked="visibleColumns[col.key]">
                  {{ col.label }}
                </MpCheckbox>
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpButton variant="ghost" left-icon="upload" aria-label="Export" />
        <MpFlex :class="css({ width: '200px' })">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search..." />
          </MpInputGroup>
        </MpFlex>
      </MpFlex>
    </MpFlex>

    <!-- Company goals table -->
    <div ref="wrapperRef" :class="tableOuterBorder">
      <div :class="accordionHeader">
        <MpText size="label" weight="semiBold" :class="valueText">Company-wide goals</MpText>
      </div>
      <MpTableContainer>
        <MpTable :is-hoverable="false" :class="fixedTable">
          <!-- table-layout:fixed derives column widths from the first row's
               cells — when the header row collapses to a single colspan
               cell (bulk-select summary), that row can no longer supply
               per-column widths, so the body columns would shift. An
               explicit colgroup fixes every column's width independent of
               whichever header row is currently rendered. -->
          <colgroup>
            <col :class="colCheckbox">
            <col :class="colGoal">
            <col v-if="visibleColumns.category" :class="colCategory">
            <col v-if="visibleColumns.subCategory" :class="colSubCategory">
            <col v-if="visibleColumns.owner" :class="colOwner">
            <col v-if="visibleColumns.progress" :class="colProgress">
            <col v-if="visibleColumns.status" :class="colStatus">
            <col :class="actionHead">
          </colgroup>
          <MpTableHead>
            <!-- Selection summary replaces the column-header row entirely
                 (not a bar above the table) while 1+ rows are selected. -->
            <MpTableRow v-if="selectedCount > 0">
              <MpTableCell as="th" :colspan="headerColCount" :class="noCellPadding">
                <GoalBulkActionBar
                  :selected-count="selectedCount"
                  :is-all-selected="isAllSelected(selectableIds)"
                  @toggle-select-all="toggleSelectAll(selectableIds)"
                  @clear="clearSelection"
                  @edit-goals="goToImport('edit-goals')"
                  @update-progress="goToImport('update-progress')"
                  @close-goals="goToImport('close-goals')"
                  @delete-goals="isBulkDeleteModalOpen = true"
                />
              </MpTableCell>
            </MpTableRow>
            <MpTableRow v-else>
              <MpTableCell as="th" :class="[colDivider, colCheckbox]">
                <MpCheckbox :is-checked="isAllSelected(selectableIds)" @update:is-checked="toggleSelectAll(selectableIds)" aria-label="Select all" />
              </MpTableCell>
              <MpTableCell as="th" :class="colDivider"><span :class="headerLabel">Goal <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.category" as="th" :class="[colDivider, colCategory]"><span :class="headerLabel">Category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.subCategory" as="th" :class="[colDivider, colSubCategory]"><span :class="headerLabel">Sub-category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.owner" as="th" :class="[colDivider, colOwner]"><span :class="headerLabel">Owner <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.progress" as="th" :class="[colDivider, colProgress]"><span :class="headerLabel">Progress <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.status" as="th" :class="[colDivider, colStatus]"><span :class="headerLabel">Status <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell as="th" :is-fixed="hasOverflow" :class="[actionHead, hasOverflow && fixedRightCol]" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="row in displayRows" :key="row.id">
              <!-- Select — only real goals (kind 'main') are selectable. -->
              <MpTableCell as="td" :class="[colDivider, colCheckbox]">
                <MpCheckbox
                  v-if="row.kind === 'main'"
                  :is-checked="isSelected(row.id)"
                  @update:is-checked="toggleSelect(row.id)"
                  :aria-label="`Select ${row.title}`"
                />
              </MpTableCell>

              <!-- Goal -->
              <MpTableCell as="td" :class="[tightCell, colDivider, row.kind === 'aligned' && alignedGoalCell]">
                <MpFlex direction="column" gap="0" :class="[cellContent, row.kind === 'aligned' && alignedGoalIndent]">
                  <span :class="goalCode">{{ row.code }}</span>
                  <MpFlex align="center" gap="2">
                    <MpText size="label" :class="[valueText, cellContent]">{{ row.title }}</MpText>
                    <MpBadge v-if="row.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
                  </MpFlex>
                  <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                  <button v-if="row.kind === 'main' && row.alignedGoals.length" type="button" :class="alignedLink" @click="toggleAligned(row.id)">
                    <MpIcon :name="expandedAligned[row.id] ? 'caret-down' : 'caret-right'" size="sm" />
                    View aligned goals ({{ row.alignedGoals.length }})
                  </button>
                </MpFlex>
              </MpTableCell>

              <!-- Category -->
              <MpTableCell v-if="visibleColumns.category && row.kind === 'main' && row.showCategory" as="td" :rowspan="row.categoryRowspan" :class="[tightCell, colDivider, colCategory]">
                <MpFlex direction="column" gap="0" :class="cellContent">
                  <MpText size="label" :class="[valueText, cellContent]">{{ row.category }}</MpText>
                  <MpText size="label-small" :class="captionText">Weight: {{ row.categoryWeight }}%</MpText>
                </MpFlex>
              </MpTableCell>

              <!-- Sub-category -->
              <MpTableCell v-if="visibleColumns.subCategory && row.kind === 'main' && row.showSubCategory" as="td" :rowspan="row.subCategoryRowspan" :class="[tightCell, colDivider, colSubCategory]">
                <MpText size="label" :class="[valueText, cellContent]">{{ row.subCategory }}</MpText>
              </MpTableCell>

              <!-- Owner -->
              <MpTableCell v-if="visibleColumns.owner" as="td" :class="[tightCell, colDivider, colOwner]">
                <MpFlex direction="column" gap="0" :class="cellContent">
                  <MpText size="label" :class="[valueText, cellContent]">{{ row.owner.name }}</MpText>
                  <MpText size="label-small" :class="captionText">{{ row.owner.id }}</MpText>
                  <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.title }}</MpText>
                  <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.department }}</MpText>
                </MpFlex>
              </MpTableCell>

              <!-- Progress -->
              <MpTableCell v-if="visibleColumns.progress" as="td" :class="[tightCell, colDivider, colProgress]">
                <MpFlex v-if="row.unit" direction="column" gap="1" :class="progressCellWidth">
                  <MpFlex align="center" gap="1">
                    <MpText size="label" :class="valueText">
                      {{ row.unit === 'currency' ? `Rp${formatNumber(row.value ?? 0)}` : `${row.value}${row.unit === 'percent' ? '%' : ''}` }}
                    </MpText>
                    <span :class="pillGreen">{{ row.pill }}%</span>
                  </MpFlex>
                  <div :class="progressTrack">
                    <div :class="[progressFill, row.status === 'green' ? fillGreen : fillOrange]" :style="{ width: `${row.pill}%` }" />
                  </div>
                  <MpFlex justify="space-between">
                    <span :class="css({ fontSize: '10px', lineHeight: '12px', color: 'text.secondary' })">
                      {{ row.unit === 'currency' ? `Rp${formatNumber(row.min ?? 0)}` : `${row.min}${row.unit === 'percent' ? '%' : ''}` }}
                    </span>
                    <span :class="css({ fontSize: '10px', lineHeight: '12px', color: 'text.default' })">
                      {{ row.unit === 'currency' ? `Rp${formatNumber(row.max ?? 0)}` : `${row.max}${row.unit === 'percent' ? '%' : ''}` }}
                    </span>
                  </MpFlex>
                </MpFlex>
                <span v-else :class="captionText">—</span>
              </MpTableCell>

              <!-- Status -->
              <MpTableCell v-if="visibleColumns.status" as="td" :class="[tightCell, colDivider, colStatus]">
                <span :class="row.status === 'green' ? statusPillGreen : row.status === 'orange' ? statusPillOrange : statusPillGray">{{ statusLabel[row.status] }}</span>
              </MpTableCell>

              <!-- Actions -->
              <MpTableCell as="td" :is-fixed="hasOverflow" :class="[actionCell, hasOverflow && fixedRightCol, fixedBodyBg]">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Row actions" />
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem>View details</MpPopoverListItem>
                      <MpPopoverListItem>Update goal progress</MpPopoverListItem>
                      <MpPopoverListItem @click="editRow(row)">Edit</MpPopoverListItem>
                      <MpPopoverListItem @click="deleteRow(row)">
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
    </div>
    </template>
    </template>
  </MpFlex>

  <!-- Goal cycle info -->
  <GoalCycleInfoPanel v-else />

  <!-- Select employee(s) for the new goal(s) -->
  <SelectEmployeesDrawer
    v-model:is-open="isSelectEmployeeOpen"
    :exclude-ids="[...fullOwnerIds]"
    exclude-note="Employees whose goals already total 100% aren't shown here. Add more goals for them from their existing goal list instead."
    @continue="continueToNewGoals"
  />

  <!-- Edit an existing goal -->
  <AddGoalDrawer
    drawer-id="drawer-add-goal-edit"
    v-model:is-open="isEditDrawerOpen"
    :owners="editingOwners"
    :already-used-weight="alreadyUsedWeightForEdit"
    :cycle-start-date="cycle?.startDate ?? ''"
    :cycle-end-date="cycle?.endDate ?? ''"
    :editing-draft="editingDraft"
    @save="saveEdit"
  />

  <!-- Delete confirmation -->
  <ClientOnly>
  <MpModal :is-open="isDeleteModalOpen" @close="isDeleteModalOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="css({ marginTop: '80px' })">
      <MpModalHeader>
        Delete goal?
        <MpModalCloseButton @click="isDeleteModalOpen = false" />
      </MpModalHeader>
      <MpModalBody>
        <MpText :class="valueText">
          <strong>{{ goalToDelete?.title }}</strong> will be permanently deleted and cannot be recovered.
        </MpText>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="isDeleteModalOpen = false">Cancel</MpButton>
          <MpButton variant="danger" @click="confirmDeleteGoal">Delete</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
  </ClientOnly>

  <!-- Bulk delete confirmation -->
  <ClientOnly>
  <MpModal :is-open="isBulkDeleteModalOpen" @close="isBulkDeleteModalOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="css({ marginTop: '80px' })">
      <MpModalHeader>
        Delete {{ selectedCount }} goal{{ selectedCount === 1 ? '' : 's' }}?
        <MpModalCloseButton @click="isBulkDeleteModalOpen = false" />
      </MpModalHeader>
      <MpModalBody>
        <MpText :class="valueText">
          {{ selectedCount }} selected goal{{ selectedCount === 1 ? '' : 's' }} will be permanently deleted and cannot be recovered.
        </MpText>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="isBulkDeleteModalOpen = false">Cancel</MpButton>
          <MpButton variant="danger" @click="confirmBulkDelete([...selectedIds]); clearSelection()">Delete</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
  </ClientOnly>
</template>
