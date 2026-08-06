<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle details / Individual goals
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4488:96367)
  Token mode: Pixel 2.4

  Department accordion (Accounting expanded; Front of house, HR, Kitchen,
  Management, Marketing, Sales collapsed), then Goal owner rowspan-grouped
  within — no Team layer here (owner IS the group, one level shallower than
  ../team-goals). Unlike the department level, an owner's own rows are never
  collapsed — every employee in an expanded department shows their goals
  directly. An owner with none (most of them, under this model) is left out
  of the list entirely, not shown as an empty placeholder row.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpIcon,
  MpTooltip,
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
  toast,
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
const goalsView = ref<GoalsViewKey>('individual')

const scopedRoutes: Partial<Record<GoalsViewKey, string>> = {
  company: 'company-goals',
  organization: 'organization-goals',
  team: 'team-goals',
}

function selectGoalsView(key: GoalsViewKey) {
  if (key === 'individual') {
    goalsView.value = key
    activeTab.value = 'all'
    return
  }
  const slug = scopedRoutes[key]
  router.push({ path: `/goals/goal-cycles/${route.params.id}${slug ? `/${slug}` : ''}`, query: route.query })
}

const statusFilter = ref('')
const search = ref('')

// "All filters" drawer — owner-attribute filters, draft-then-apply.
const allFiltersOpen = ref(false)
const appliedFilters = ref<Record<string, string[]>>({})
const appliedScopes = ref<string[]>([])
const activeFilterCount = computed(() => allFiltersCount(appliedFilters.value))
function onApplyAllFilters(p: { filters: Record<string, string[]>, scopes: string[] }) {
  appliedFilters.value = p.filters
  appliedScopes.value = p.scopes
}

// Column visibility — "Goal owner" is the anchor column (locked, always on,
// shown disabled in the popover); the rest are toggleable.
const columnOptions = [
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub-category' },
  { key: 'progress', label: 'Progress' },
  { key: 'status', label: 'Status' },
] as const
type ColumnKey = typeof columnOptions[number]['key']
const visibleColumns = reactive<Record<ColumnKey, boolean>>({
  category: true,
  subCategory: true,
  progress: true,
  status: true,
})

// ─── Live data — read from the goals mini-DB (useGoalsStore), grouped by
// department then by owner. Each owner's rows are their individual-level
// goals, sorted by category into rowspan groups. ──────────────────────────
type GoalStatus = 'green' | 'orange' | 'gray'

const DEPARTMENTS = ['Accounting', 'Front of House', 'HR', 'Kitchen', 'Management', 'Marketing', 'Sales'] as const

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const { individualGoals, goals, updateGoal } = useGoalsStore(route.params.id as string)
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

// Align goal — pick a higher-level parent goal for this individual goal.
const alignModalOpen = ref(false)
const aligningGoal = ref<(typeof goals.value)[number] | null>(null)
function openAlign(row: { id: string }) {
  aligningGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (aligningGoal.value) alignModalOpen.value = true
}
function onAligned(parentId: string, krId?: string) {
  if (!aligningGoal.value) return
  updateGoal(aligningGoal.value.id, { alignedToId: parentId, alignedToKrId: krId })
  toast.notify({ id: 'goal-aligned', position: 'top-center', variant: 'success', title: 'Goal aligned' })
}

// Update progress — shared drawer, opened in place from the row action.
const isUpdateProgressOpen = ref(false)
const updatingGoal = ref<(typeof goals.value)[number] | null>(null)
function openUpdateProgress(row: { id: string }) {
  updatingGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (updatingGoal.value) isUpdateProgressOpen.value = true
}

// Bulk select — Select is always the first column; every row here is a
// real goal (no aligned-row nesting on this page, unlike the other 4). One
// shared selection set across every department's table; each table's own
// "select all" only touches the rows currently visible in that department
// (collapsed owners contribute none).
const { selectedIds, selectedCount, isSelected, toggleSelect, isAllSelected, toggleSelectAll, clearSelection } = useGoalBulkSelect()
function selectableIdsForDept(dept: { owners: { rows: { id: string }[] }[] }) {
  return dept.owners.flatMap(o => o.rows.map(r => r.id))
}
// Select + Goal owner + Goal + Actions are always rendered; the rest follow visibleColumns.
const totalCols = computed(() => 3 + Object.values(visibleColumns).filter(Boolean).length)
function goToImport(mode: 'edit-goals' | 'update-progress' | 'close-goals') {
  router.push({ path: `/goals/goal-cycles/${route.params.id}/import`, query: { mode, ids: [...selectedIds.value].join(',') } })
}
const { isBulkDeleteModalOpen, confirmBulkDelete } = useGoalBulkDeleter()

// Status filter (single-select) and Organization filter (multi-select) both
// narrow the same underlying rows — empty selection means "no filter, show
// everything" for both.
const STATUS_FILTER_TO_GOAL_STATUS: Record<string, GoalStatus> = { ontrack: 'green', atrisk: 'orange' }
const departmentFilter = ref<string[]>([])
function toggleDepartmentFilter(dept: string, checked: boolean) {
  departmentFilter.value = checked
    ? [...departmentFilter.value, dept]
    : departmentFilter.value.filter(d => d !== dept)
}

// ─── Column sort. Two grouping levels here: the Goal-owner rowspan block (one
// per employee) and, inside each, the Category → Sub-category rowspan runs.
// Category/Sub-category/Goal/Progress/Status sort the rows WITHIN each owner
// block (run BEFORE withRowSpans so the merged runs stay contiguous); Goal
// owner reorders the owner BLOCKS themselves (sort the owners array below,
// each block kept whole). sortKey '' = default order.
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  goal: 'text', owner: 'text', category: 'text', subCategory: 'text', progress: 'number', status: 'text',
}
function goalSortValue(g: { category: string, subCategory: string, title: string, pill?: number, status: GoalStatus }, key: string): string | number {
  switch (key) {
    case 'goal': return g.title
    case 'category': return g.category
    case 'subCategory': return g.subCategory
    case 'progress': return g.pill ?? -1
    case 'status': return statusLabel[g.status]
    default: return ''
  }
}

const departments = computed(() => DEPARTMENTS
  .filter(deptName => departmentFilter.value.length === 0 || departmentFilter.value.includes(deptName))
  .map((deptName) => {
  const deptEmployees = EMPLOYEES.filter(e => e.department === deptName)
  let owners = deptEmployees.map((emp) => {
    const ownerGoals = sortGoalRows(sortByCategory(individualGoals.value.filter(g =>
      g.ownerId === emp.id && (!statusFilter.value || g.status === STATUS_FILTER_TO_GOAL_STATUS[statusFilter.value])
      && matchesSearch(g, search.value) && ownerMatchesAllFilters(g.ownerId, appliedFilters.value),
    )), {
      sortKey: sortKey.value === 'owner' ? '' : sortKey.value,
      sortDir: sortDir.value,
      sortType: (columnSortTypes[sortKey.value] as 'text' | 'number') ?? 'text',
      sortValue: g => goalSortValue(g, sortKey.value),
      groupLevels: ['category', 'subCategory'],
    })
    const rows = withRowSpans(ownerGoals).map(g => ({
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
      status: g.status,
      unit: g.unit,
      value: g.value,
      pill: g.pill,
      min: g.min,
      max: g.max,
      isDraft: g.isDraft,
    }))
    return { key: emp.id, name: emp.name, code: emp.code, title: emp.title, department: emp.department, rows }
  }).filter(owner => owner.rows.length > 0)
  // Goal-owner sort reorders the owner blocks (each kept whole so its rowspan
  // stays intact); default (no owner sort) preserves the EMPLOYEES order.
  if (sortKey.value === 'owner') {
    const dir = sortDir.value === 'desc' ? -1 : 1
    owners = [...owners].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir)
  }
  return { key: slugify(deptName), name: deptName, owners }
}))

const expandedDepts = reactive<Record<string, boolean>>({ accounting: true })
function toggleDept(key: string) {
  expandedDepts[key] = !expandedDepts[key]
}
function collapseAll() {
  for (const d of departments.value) expandedDepts[d.key] = false
}

// Selecting an Organization filter should surface its results immediately —
// expand every department the filter just matched, instead of leaving the
// user to manually open each one (owners inside are never collapsed).
watch(departmentFilter, (selected) => {
  for (const dept of selected) {
    expandedDepts[slugify(dept)] = true
  }
})

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

// Clicking a goal name (or Actions → View details) opens its detail page.
// cycleName rides along so the detail page's breadcrumb reads "Goal cycles /
// <cycle name>" (see layouts/default.vue).
function goToGoal(id: string) {
  router.push({ path: `/goals/goal-cycles/${route.params.id}/goals/${id}`, query: { cycleName: cycle.value?.name } })
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
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2',
  height: '44px', paddingInline: '2', paddingBlock: '3',
  background: 'gray.50', borderBottom: '1px solid', borderBottomColor: 'border.default',
  cursor: 'pointer', border: 'none', width: '100%',
})
const accordionLeft = css({ display: 'flex', alignItems: 'center', gap: '2' })
const collapseAllBtn = css({
  display: 'inline-flex', alignItems: 'center', gap: '1',
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'text.secondary', fontSize: '12px', lineHeight: '16px',
})

// Owner header cell — name + 3 stacked meta lines, always shown open.
const ownerHeaderCell = css({
  display: 'flex', alignItems: 'flex-start', gap: '2',
  paddingTop: '2', paddingBottom: '2', paddingLeft: '9', paddingRight: '4',
  width: '100%', textAlign: 'left',
})

// Fixed table layout so toggling a department's expand/collapse never shifts
// the other columns (see team-goals.vue for the same fix and why it's
// needed). minWidth on the table is required here too: without it,
// table-layout:fixed squeezes Goal down to ~0 on a narrow viewport instead of
// overflowing into horizontal scroll, which breaks its text one character
// per line.
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1264px' })
const colOwner = css({ width: '184px' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
// Goal is intentionally the one column with no fixed width — in a
// table-layout:fixed table it absorbs all remaining space, pushing the
// 52px action column flush against the right edge instead of it stretching.
const colGoal = css({ minWidth: '300px' })
const colProgress = css({ width: '200px' })
const colStatus = css({ width: '136px' })

const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
// Header label + column-sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
// Action column is a hard 52px: 36px icon button + 8px padding each side.
const actionHead = css({ width: '52px', paddingLeft: '2', paddingRight: '2', paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', verticalAlign: 'top' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', paddingLeft: '2', paddingRight: '2', width: '52px', whiteSpace: 'nowrap', verticalAlign: 'top' })
// Sticky right column (Actions), matching ../index.vue and ../company-goals:
// `is-fixed` alone only tags the cell (data-table-cell-fixed) — position:
// sticky/z-index/background need setting explicitly. Border is a plain 1px
// like every other column divider, not a heavier "sticky" emphasis.
const fixedRightCol = css({ position: 'sticky', right: '0', zIndex: '1', boxShadow: 'inset 1px 0px var(--mp-colors-border-default)' })
const fixedBodyBg = css({ background: 'white' })
const colCheckbox = css({ width: '48px', paddingLeft: '4', paddingRight: '2' })
// Zeroes out the default th/td padding so GoalBulkActionBar's own 52px
// height/fill is exactly what renders — no extra cell padding stacking on top.
// Bulk-action header cell: no horizontal padding (the bar owns its own inset so
// its checkbox lines up with the body checkbox column), + 4px top/bottom.
const noCellPadding = css({ paddingInline: '0', paddingTop: '1', paddingBottom: '1' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

// Flex children default to min-width:auto, so long unbroken text refuses to
// shrink below its own intrinsic width and bleeds out of the fixed-width
// cell — min-width:0 lets the flex box shrink, break-word lets long text
// wrap. Applied to every cell's content wrapper, not just Goal.
const cellContent = css({ minWidth: '0', width: '100%', whiteSpace: 'normal', overflowWrap: 'break-word' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// Goal name — a textlink to the goal detail page; underlines on hover.
const goalNameLink = css({ display: 'inline', color: 'text.link', cursor: 'pointer', textAlign: 'left', minWidth: '0', whiteSpace: 'normal', overflowWrap: 'break-word', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const alignedLink = css({
  display: 'inline-flex', alignItems: 'center', gap: '1', marginTop: '1',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.default', fontSize: '14px', lineHeight: '20px',
})

const progressCellWidth = css({ width: '100%' })
const progressTrack = css({ width: '100%', height: '8px', borderRadius: 'full', background: 'border.default', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })
const fillGray = css({ background: 'gray.400' })

const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })
const pillRose = css({ ...pillBase, background: 'red.50', color: 'red.700' })
const pillGray = css({ ...pillBase, background: 'gray.100', color: 'gray.600' })
function pillClass(s: string) { return s === 'orange' ? pillRose : s === 'gray' ? pillGray : pillGreen }

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
const statusLabel: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not updated' }

const emptyState = css({ padding: '6', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })

// Cycle-level empty state — a brand-new goal cycle has no goals at all yet,
// so replace the filter bar + table entirely (same pattern as
// pages/reviews/review-cycles/[id]/index.vue's "No review timeframe yet").
// Distinct from `emptyState` above, which is the lighter per-department/
// per-person text used when the CYCLE has goals but this one group doesn't.
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <!-- Page header actions -->
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="secondary" @click="router.push({ path: `/goals/goal-cycles/${route.params.id}/import` })">Import goals</MpButton>
    <MpButton variant="primary" @click="openSelectEmployee">New goals</MpButton>
  </Teleport>

  <!-- Tabs -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <MpPopover is-close-on-select use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <button type="button" :class="activeTab === 'all' ? tabItemActive : tabItem" @click="activeTab = 'all'">
            Individual goals
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
    <!-- Empty state: brand-new goal cycle, no Individual-level goals yet -->
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

        <!-- Organization filter — same MpSelect + MpPopover trigger shape as
             Status above (decorative select, real interaction happens in
             the popover), but with an MpCheckbox list for multi-select. -->
        <MpPopover is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="statusFieldClass">
              <MpSelect
                :model-value="departmentFilter.length ? 'selected' : ''"
                placeholder="Organization"
                tabindex="-1"
                aria-hidden="true"
              >
                <option value="selected">Organization ({{ departmentFilter.length }})</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem v-for="dept in DEPARTMENTS" :key="dept">
                <MpCheckbox
                  :id="`dept-filter-${slugify(dept)}`"
                  :is-checked="departmentFilter.includes(dept)"
                  @update:is-checked="(checked) => toggleDepartmentFilter(dept, checked)"
                >
                  {{ dept }}
                </MpCheckbox>
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>

        <MpButton variant="secondary" @click="allFiltersOpen = true">All filters<template v-if="activeFilterCount"> ({{ activeFilterCount }})</template></MpButton>
      </MpFlex>

      <MpFlex align="center" gap="2">
        <MpPopover use-portal placement="bottom-end">
          <MpPopoverTrigger>
            <MpTooltip label="Column settings" placement="bottom" use-portal><MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" /></MpTooltip>
          </MpPopoverTrigger>
          <MpPopoverContent :class="css({ minWidth: '200px' })">
            <MpPopoverList>
              <MpPopoverListItem is-disabled>
                <MpCheckbox id="col-goal-owner" is-checked is-disabled>Goal owner</MpCheckbox>
              </MpPopoverListItem>
              <MpPopoverListItem v-for="col in columnOptions" :key="col.key">
                <MpCheckbox :id="`col-${col.key}`" v-model:is-checked="visibleColumns[col.key]">
                  {{ col.label }}
                </MpCheckbox>
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpTooltip label="Export" placement="bottom" use-portal><MpButton variant="ghost" left-icon="upload" aria-label="Export" /></MpTooltip>
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

    <!-- Individual goals — Department accordion, each containing an Owner
         rowspan-group (no Team layer, unlike ../team-goals) -->
    <div ref="wrapperRef" :class="tableOuterBorder">
      <div v-for="(dept, di) in departments" :key="dept.key">
        <button type="button" :class="accordionHeader" @click="toggleDept(dept.key)">
          <span :class="accordionLeft">
            <MpIcon :name="expandedDepts[dept.key] ? 'caret-down' : 'caret-right'" size="sm" />
            <MpText size="label" weight="semiBold" :class="valueText">{{ dept.name }}</MpText>
          </span>
          <span v-if="di === 0" :class="collapseAllBtn" @click.stop="collapseAll">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 2L8 6L12 2L4 2Z" fill="currentColor" />
              <path d="M12 14L8 10L4 14L12 14Z" fill="currentColor" />
            </svg>
            Collapse all
          </span>
        </button>

        <template v-if="expandedDepts[dept.key]">
          <MpFlex v-if="dept.owners.length === 0" :class="emptyState">No goals in this department yet.</MpFlex>

          <MpTableContainer v-else>
            <MpTable :is-hoverable="false" :class="fixedTable">
              <!-- table-layout:fixed derives column widths from the first row's
                   cells — when the header row collapses to a single colspan
                   cell (bulk-select summary), that row can no longer supply
                   per-column widths, so the body columns would shift. An
                   explicit colgroup fixes every column's width independent of
                   whichever header row is currently rendered. -->
              <colgroup>
                <col :class="colGoal">
                <col :class="colOwner">
                <col v-if="visibleColumns.category" :class="colCategory">
                <col v-if="visibleColumns.subCategory" :class="colSubCategory">
                <col v-if="visibleColumns.progress" :class="colProgress">
                <col v-if="visibleColumns.status" :class="colStatus">
                <col :class="actionHead">
              </colgroup>
              <MpTableHead>
                <!-- Selection summary replaces the column-header row entirely
                     (not a bar above the table) while 1+ rows are selected. -->
                <MpTableRow v-if="selectedCount > 0">
                  <MpTableCell as="th" :colspan="totalCols" :class="noCellPadding">
                    <GoalBulkActionBar
                      :selected-count="selectedCount"
                      :is-all-selected="isAllSelected(selectableIdsForDept(dept))"
                      @toggle-select-all="toggleSelectAll(selectableIdsForDept(dept))"
                      @clear="clearSelection"
                      @edit-goals="goToImport('edit-goals')"
                      @update-progress="goToImport('update-progress')"
                      @close-goals="goToImport('close-goals')"
                      @delete-goals="isBulkDeleteModalOpen = true"
                    />
                  </MpTableCell>
                </MpTableRow>
                <MpTableRow v-else>
                  <MpTableCell as="th" class="sort-th" :class="colDivider">
                    <MpFlex align="center" gap="2">
                      <MpCheckbox :is-checked="isAllSelected(selectableIdsForDept(dept))" @update:is-checked="toggleSelectAll(selectableIdsForDept(dept))" aria-label="Select all" />
                      <span :class="thInner"><span>Goal</span><PxColumnSortMenu col-key="goal" :sort-type="columnSortTypes.goal" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="th" class="sort-th" :class="[colDivider, colOwner]"><span :class="thInner"><span>Goal owner</span><PxColumnSortMenu col-key="owner" :sort-type="columnSortTypes.owner" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.category" as="th" class="sort-th" :class="[colDivider, colCategory]"><span :class="thInner"><span>Category</span><MpTooltip label="Category weight is the sum of its goals' weights — the category's share of the owner's 100% weight budget." use-portal placement="top"><MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary', cursor: 'help' })" /></MpTooltip><PxColumnSortMenu col-key="category" :sort-type="columnSortTypes.category" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.subCategory" as="th" class="sort-th" :class="[colDivider, colSubCategory]"><span :class="thInner"><span>Sub-category</span><PxColumnSortMenu col-key="subCategory" :sort-type="columnSortTypes.subCategory" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.progress" as="th" class="sort-th" :class="[colDivider, colProgress]"><span :class="thInner"><span>Progress</span><PxColumnSortMenu col-key="progress" :sort-type="columnSortTypes.progress" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.status" as="th" class="sort-th" :class="[colDivider, colStatus]"><span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell as="th" :is-fixed="hasOverflow" :class="[actionHead, hasOverflow && fixedRightCol]" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <!-- Owners with zero goals are filtered out of dept.owners
                     entirely (see `departments` computed) — every owner
                     rendered here always has rows. Owner cell rowspans
                     across all of them, exactly like Category does — NOT a
                     separate row, and never collapsed (see file header). -->
                <template v-for="owner in dept.owners" :key="owner.key">
                    <MpTableRow v-for="(row, ri) in owner.rows" :key="row.id">
                      <!-- Goal (per-row select checkbox merged into this first cell) -->
                      <MpTableCell as="td" :class="[tightCell, colDivider]">
                        <MpFlex align="flex-start" gap="2">
                          <MpCheckbox
                            :is-checked="isSelected(row.id)"
                            @update:is-checked="toggleSelect(row.id)"
                            :aria-label="`Select ${row.title}`"
                          />
                          <MpFlex direction="column" gap="0.5" :class="cellContent">
                            <span :class="goalCode">{{ row.code }}</span>
                            <MpFlex align="center" gap="2">
                              <span :class="goalNameLink" @click="goToGoal(row.id)">{{ row.title }}</span>
                              <MpBadge v-if="row.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
                            </MpFlex>
                            <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                            <button v-if="row.alignedGoals.length" type="button" :class="alignedLink">
                              <MpIcon name="caret-right" size="sm" />
                              View aligned goals ({{ row.alignedGoals.length }})
                            </button>
                          </MpFlex>
                        </MpFlex>
                      </MpTableCell>

                      <MpTableCell v-if="ri === 0" as="td" :rowspan="owner.rows.length" :class="[tightCell, colDivider, colOwner]">
                        <div :class="ownerHeaderCell">
                          <MpFlex direction="column" gap="0" :class="cellContent">
                            <MpText size="label" :class="[valueText, cellContent]">{{ owner.name }} - {{ owner.code }}</MpText>
                            <MpText size="label-small" :class="[captionText, cellContent]">{{ owner.title }} | {{ owner.department }}</MpText>
                          </MpFlex>
                        </div>
                      </MpTableCell>

                      <!-- Category -->
                      <MpTableCell v-if="visibleColumns.category && row.showCategory" as="td" :rowspan="row.categoryRowspan" :class="[tightCell, colDivider, colCategory]">
                        <MpFlex direction="column" gap="0" :class="cellContent">
                          <MpText size="label" :class="[valueText, cellContent]">{{ row.category }}</MpText>
                          <MpText size="label-small" :class="captionText">Weight: {{ row.categoryWeight }}%</MpText>
                        </MpFlex>
                      </MpTableCell>

                      <!-- Sub-category -->
                      <MpTableCell v-if="visibleColumns.subCategory && row.showSubCategory" as="td" :rowspan="row.subCategoryRowspan" :class="[tightCell, colDivider, colSubCategory]">
                        <MpText size="label" :class="[valueText, cellContent]">{{ row.subCategory }}</MpText>
                      </MpTableCell>

                      <!-- Progress -->
                      <MpTableCell v-if="visibleColumns.progress" as="td" :class="[tightCell, colDivider, colProgress]">
                        <MpFlex v-if="row.unit" direction="column" gap="1" :class="progressCellWidth">
                          <MpFlex align="center" gap="1">
                            <MpText size="label" :class="valueText">
                              {{ row.unit === 'currency' ? `Rp${formatNumber(row.value ?? 0)}` : `${row.value}${row.unit === 'percent' ? '%' : ''}` }}
                            </MpText>
                            <span :class="pillClass(row.status)">{{ row.pill }}%</span>
                          </MpFlex>
                          <div :class="progressTrack">
                            <div :class="[progressFill, row.status === 'green' ? fillGreen : row.status === 'orange' ? fillOrange : fillGray]" :style="{ width: `${row.pill}%` }" />
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
                              <MpPopoverListItem @click="goToGoal(row.id)">View details</MpPopoverListItem>
                              <MpPopoverListItem @click="openUpdateProgress(row)">Update goal progress</MpPopoverListItem>
                              <MpPopoverListItem @click="openAlign(row)">Align goal</MpPopoverListItem>
                              <MpPopoverListItem @click="editRow(row)">Edit</MpPopoverListItem>
                              <MpPopoverListItem @click="deleteRow(row)">
                                <span :class="css({ color: 'text.danger' })">Delete</span>
                              </MpPopoverListItem>
                            </MpPopoverList>
                          </MpPopoverContent>
                        </MpPopover>
                      </MpTableCell>
                    </MpTableRow>
                </template>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </template>
      </div>
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

  <!-- Align an individual goal to a higher-level parent goal (member-only) -->
  <GoalAlignDrawer
    :is-open="alignModalOpen"
    :goal="aligningGoal"
    :candidates="goals"
    @close="alignModalOpen = false"
    @aligned="onAligned"
  />

  <UpdateProgressDrawer :is-open="isUpdateProgressOpen" :goal="updatingGoal" @close="isUpdateProgressOpen = false" />

  <!-- Delete confirmation -->
  <ClientOnly>
  <MpModal :is-open="isDeleteModalOpen" @close="isDeleteModalOpen = false">
    <MpModalOverlay />
    <MpModalContent>
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
    <MpModalContent>
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
  <PxAllFiltersDrawer :is-open="allFiltersOpen" :applied-filters="appliedFilters" :applied-scopes="appliedScopes" @close="allFiltersOpen = false" @apply="onApplyAllFilters" />
</template>

<style scoped>
/* Reveal the column-sort icon on header hover. UNLAYERED scoped rule (not a
   Panda css() @layer utility) so it beats PxColumnSortMenu's unlayered scoped
   `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
