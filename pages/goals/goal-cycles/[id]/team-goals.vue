<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle details / Team goals
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4488:94974)
  Token mode: Pixel 2.4

  Goals are grouped by department via an accordion, same as ../organization-
  goals — but unlike Organization (always exactly one dept-head owner) and
  Individual (one row-group per owner), a department's "Team" level goals
  are typically owned by SEVERAL different people at once (a dept head plus
  individual contributors, e.g. Sales: Ali, Daud, Jessie). The source has no
  named team entity or roster to hang that on, so it's modeled as: one flat
  table per department (rows sorted by owner then category — each owner's
  own Category/Sub-category/weight still never merges with a colleague's,
  same rule as everywhere else), with a leading "Team" column showing an
  avatar group of every distinct owner in that department's table, rowspan-
  merged across the whole thing — a visual stand-in for "this department's
  team", not a real roster. Each row's own Goal/Owner/Progress/Status still
  shows that specific goal's real owner. Only 4 of 7 departments have any
  Team-tagged goals in the source (Sales, Kitchen, Front of House,
  Accounting); Accounting (top of the list) is expanded by default anyway,
  same as ../organization-goals and ../individual-goals — consistent across
  all 3 pages even though it shows the empty state here.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpIcon,
  MpTooltip,
  MpAvatar,
  MpAvatarGroup,
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
import { MANUAL_CREATE_OWNER_LIMIT } from '~/composables/useBulkOwnerGate'

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
const { importSuggestionOpen, pendingEmployeeIds, continueToNewGoals, goToImport: goToImportBulkOwners } = useBulkOwnerGate(() => route.params.id as string)
function cancelBulkOwnerModal() {
  importSuggestionOpen.value = false
  isSelectEmployeeOpen.value = true
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
const goalsView = ref<GoalsViewKey>('team')

const scopedRoutes: Partial<Record<GoalsViewKey, string>> = {
  company: 'company-goals',
  organization: 'organization-goals',
  individual: 'individual-goals',
}

function selectGoalsView(key: GoalsViewKey) {
  if (key === 'team') {
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
  // The drawer's own Status scope supersedes the standalone quick-filter —
  // reset it so the two never show conflicting/redundant state.
  statusFilter.value = ''
  appliedFilters.value = p.filters
  appliedScopes.value = p.scopes
}

// Column visibility — "Team" is the anchor column (locked, always on, shown
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

// ─── Live data — read from the goals mini-DB (useGoalsStore), grouped by
// department. Each department's rows span every owner who has a Team-level
// goal there, sorted by owner then category (so each owner's own Category
// cells stay separate — never merged with a colleague's, same rule as
// every other Goals page). ────────────────────────────────────────────────
type GoalStatus = 'green' | 'orange' | 'gray'

const DEPARTMENTS = ['Accounting', 'Front of House', 'HR', 'Kitchen', 'Management', 'Marketing', 'Sales'] as const

function deptKey(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

const { teamGoals, goals, updateGoal } = useGoalsStore(route.params.id as string)
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
const { isCloseModalOpen, goalToClose, askCloseGoal, confirmCloseGoal, isBulkCloseModalOpen, goalsToClose, askBulkClose, confirmBulkClose } = useGoalCloser()
function onBulkClose() { askBulkClose(goals.value.filter(g => selectedIds.value.has(g.id))) }
function closeRow(row: { id: string }) {
  const g = goals.value.find(x => x.id === row.id)
  if (g) askCloseGoal(g)
}
const { submitDraftForApproval } = useGoalDraftSubmitter()
function submitRowForApproval(row: { id: string }) {
  const g = goals.value.find(x => x.id === row.id)
  if (g) submitDraftForApproval(g)
}

// Align goal — a team goal can align up to an organization/company parent.
const alignModalOpen = ref(false)
const aligningGoal = ref<(typeof goals.value)[number] | null>(null)
function openAlign(row: { id: string }) {
  aligningGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (aligningGoal.value) alignModalOpen.value = true
}
function onAligned(parentId: string, krId?: string) {
  if (!aligningGoal.value) return
  updateGoal(aligningGoal.value.id, { alignedToId: parentId, alignedToKrId: krId })
  useGoalActivityStore().logActivity(aligningGoal.value.id, { type: "event", wording: "aligned this goal to a parent goal." })
  toast.notify({ id: 'goal-aligned', position: 'top-center', variant: 'success', title: 'Goal aligned' })
}

// Update progress — shared drawer, opened in place from the row action.
const isUpdateProgressOpen = ref(false)
const updatingGoal = ref<(typeof goals.value)[number] | null>(null)
function openUpdateProgress(row: { id: string }) {
  updatingGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (updatingGoal.value) isUpdateProgressOpen.value = true
}

// Activity log — opens the history drawer for a goal.
const isActivityLogOpen = ref(false)
const activityGoal = ref<(typeof goals.value)[number] | null>(null)
function openActivityLog(row: { id: string }) {
  activityGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (activityGoal.value) isActivityLogOpen.value = true
}

// Bulk select — Select is always the first column; only real 'main' rows
// are selectable (aligned rows are a nested reference to a goal already
// listed under its own owner elsewhere). One shared selection set across
// every department's accordion table; each table's own "select all" only
// touches that department's rows.
const { selectedIds, selectedCount, isSelected, toggleSelect, isAllSelected, toggleSelectAll, clearSelection } = useGoalBulkSelect()
function selectableIdsFor(rows: { kind: string, id: string }[]) {
  return rows.filter(r => r.kind === 'main').map(r => r.id)
}
// Bulk selection scoped per group — its indeterminate/checked state only
// looks at that department's own rows.
function groupSelectedCount(rows: { kind: string, id: string }[]) {
  return selectableIdsFor(rows).filter(id => isSelected(id)).length
}
function goToImport(mode: 'edit-goals' | 'update-progress' | 'close-goals') {
  router.push({ path: `/goals/goal-cycles/${route.params.id}/import`, query: { mode, ids: [...selectedIds.value].join(',') } })
}
const { isBulkDeleteModalOpen, confirmBulkDelete } = useGoalBulkDeleter()
// Where the Actions menu lives depends on how many departments currently
// have 1+ selected rows: exactly one → inline in that department's own
// accordion header (GoalBulkActionsMenu); two or more → a single floating
// bar at the bottom of the page (GoalFloatingBulkBar).
const selectedDeptKeys = computed(() => departments.value.filter(d => groupSelectedCount(d.rows) > 0).map(d => d.key))
const soleSelectedDeptKey = computed(() => (selectedDeptKeys.value.length === 1 ? selectedDeptKeys.value[0] : null))
const isMultiDeptSelected = computed(() => selectedDeptKeys.value.length > 1)

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

// "View aligned goals" inserts a real row per aligned goal right below its
// parent — Category/Sub-category keep merging across them (rowspan
// extended in expandAlignedRows), while Goal/Owner/Progress/Status each get
// their own row for every aligned child, since those are per-goal values.
const expandedAligned = reactive<Record<string, boolean>>({})
function toggleAligned(id: string) {
  expandedAligned[id] = !expandedAligned[id]
}

// ─── Column sort. Owner → Category → Sub-category form the rowspan grouping
// within each department (the leading Team avatar cell always spans the whole
// department table, so row order never affects it). The sort runs BEFORE
// withRowSpans and keeps every run contiguous: an Owner/Category/Sub-category
// sort reorders whole blocks at that level, while Goal/Progress/Status reorder
// only rows inside the innermost sub-category block. sortKey '' = default order.
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  goal: 'text', category: 'text', subCategory: 'text', owner: 'text', progress: 'number', status: 'text',
}
function goalSortValue(g: { category: string, subCategory: string, ownerId: string, title: string, pill?: number, status: GoalStatus }, key: string): string | number {
  switch (key) {
    case 'goal': return g.title
    case 'category': return g.category
    case 'subCategory': return g.subCategory
    case 'owner': return ownerOf(g.ownerId).name
    case 'progress': return g.pill ?? -1
    case 'status': return statusLabel[g.status]
    default: return ''
  }
}

const departments = computed(() => DEPARTMENTS
  .filter(name => departmentFilter.value.length === 0 || departmentFilter.value.includes(name))
  .map((name) => {
    const filteredGoals = teamGoals.value.filter(g =>
      g.department === name && (!statusFilter.value || g.status === STATUS_FILTER_TO_GOAL_STATUS[statusFilter.value])
      && matchesSearch(g, search.value) && goalMatchesAllFilters(g, appliedFilters.value),
    )
    const sortedGoals = sortGoalRows(sortByCategory(filteredGoals), {
      sortKey: sortKey.value,
      sortDir: sortDir.value,
      sortType: (columnSortTypes[sortKey.value] as 'text' | 'number') ?? 'text',
      sortValue: g => goalSortValue(g, sortKey.value),
      groupLevels: ['owner', 'category', 'subCategory'],
      ownerValue: g => g.ownerId,
    })
    const rows = withRowSpans(sortedGoals).map(g => ({
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
      isAwaitingApproval: g.isAwaitingApproval,
    }))
    // Distinct owners across this department's (unfiltered-by-status/search)
    // Team goals — a decorative "who's on this team" avatar stack, not
    // affected by the Status/Search filters narrowing the rows below it.
    const avatarMembers = [...new Set(teamGoals.value.filter(g => g.department === name).map(g => g.ownerId))]
      .map(id => ownerOf(id))
    return {
      key: deptKey(name),
      name,
      avatarMembers,
      rows: expandAlignedRows(rows, expandedAligned),
    }
  }))

// Accounting (top of DEPARTMENTS) starts expanded, same as ../organization-
// goals and ../individual-goals — consistent across all 3 pages even though
// Accounting happens to have no Team-tagged goals (shows the empty state).
const expanded = reactive<Record<string, boolean>>({ accounting: true })
function toggle(key: string) {
  expanded[key] = !expanded[key]
}
function collapseAll() {
  for (const d of departments.value) expanded[d.key] = false
}

// Selecting an Organization filter should surface its results immediately —
// expand every department the filter just matched, instead of leaving the
// user to manually open each one.
watch(departmentFilter, (selected) => {
  for (const dept of selected) expanded[deptKey(dept)] = true
})

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

// Clicking a goal name (or Actions → View details) opens its detail page.
// Aligned child rows carry a composite `parent::child` id — the real goal id
// is the child half. cycleName rides along for the detail breadcrumb.
function goToGoal(row: { kind: string, id: string }) {
  const id = row.kind === 'aligned' ? row.id.split('::')[1] : row.id
  router.push({ path: `/goals/goal-cycles/${route.params.id}/goals/${id}`, query: { cycleName: cycle.value?.name } })
}
const goalNameLink = css({ display: 'inline', color: 'text.link', cursor: 'pointer', textAlign: 'left', minWidth: '0', whiteSpace: 'normal', overflowWrap: 'break-word', textDecoration: 'none', _hover: { textDecoration: 'underline' } })

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
// Wraps accordionLeft + the inline Actions button (when shown) — 24px gap
// between the department name and Actions, independent of accordionLeft's
// own 8px internal gap (caret/checkbox/name).
const accordionLeftGroup = css({ display: 'flex', alignItems: 'center', gap: '6' })
const collapseAllBtn = css({
  display: 'inline-flex', alignItems: 'center', gap: '1',
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'text.secondary', fontSize: '12px', lineHeight: '16px',
})

const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const headerLabel = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
// Header label + column-sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

// Team avatar-group cell — rowspans the whole department table.
const teamCell = css({
  display: 'flex', alignItems: 'center', paddingLeft: '9', paddingRight: '4',
})

// Fixed table layout so every column keeps a stable width regardless of which
// optional columns are toggled on/off via Column settings. Goal is
// intentionally the one column with no fixed width — it absorbs all
// remaining space, pushing the 52px action column flush against the right
// edge instead of it stretching along with everything else. minWidth on the
// table is required here: without it, table-layout:fixed squeezes Goal down
// to ~0 on a narrow viewport instead of overflowing into horizontal scroll,
// which breaks its text one character per line.
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1412px' })
const colTeam = css({ width: '132px' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
const colGoal = css({ minWidth: '300px' })
const colOwner = css({ width: '200px' })
const colProgress = css({ width: '200px' })
const colStatus = css({ width: '136px' })
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
const statusLabel: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not started' }

const emptyState = css({ padding: '6', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })

// Cycle-level empty state — a brand-new goal cycle has no goals at all yet,
// so replace the filter bar + table entirely (same pattern as
// pages/reviews/review-cycles/[id]/index.vue's "No review timeframe yet").
// Distinct from `emptyState` above, which is the lighter per-department text
// used when the CYCLE has goals but this one department doesn't.
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <!-- Page header actions — hidden on the archive cycle: it's a frozen,
       computed container for goals migrated from the old Goals UI, so
       nothing can be imported or newly created into it. -->
  <Teleport v-if="!cycle?.isArchive" to="#page-header-actions" defer>
    <MpButton variant="secondary" @click="router.push({ path: `/goals/goal-cycles/${route.params.id}/import` })">Import goals</MpButton>
    <MpButton variant="primary" @click="openSelectEmployee">New goals</MpButton>
  </Teleport>

  <!-- Tabs -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <MpPopover is-close-on-select use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <button type="button" :class="activeTab === 'all' ? tabItemActive : tabItem" @click="activeTab = 'all'">
            Team goals
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
    <!-- Empty state: brand-new goal cycle, no Team-level goals yet -->
    <MpFlex v-if="goals.length === 0" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
        <MpText :class="emptyTitle">No goals in this cycle yet</MpText>
        <MpText size="label" :class="captionText">Goals you add to this cycle will appear here.</MpText>
      </MpFlex>
      <MpButton v-if="!cycle?.isArchive" variant="primary" left-icon="add" @click="openSelectEmployee">New goals</MpButton>
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
                  :id="`dept-filter-${deptKey(dept)}`"
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
            <MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" title="Column settings" />
          </MpPopoverTrigger>
          <MpPopoverContent :class="css({ minWidth: '200px' })">
            <MpFlex direction="column" gap="2" :class="css({ padding: '2' })">
                <MpCheckbox v-for="col in columnOptions" :key="col.key" :id="`col-${col.key}`" v-model:is-checked="visibleColumns[col.key]">{{ col.label }}</MpCheckbox>
              </MpFlex>
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

    <!-- Team goals — one accordion group per department, with a leading
         Team avatar-group column spanning the whole table -->
    <div ref="wrapperRef" :class="tableOuterBorder">
      <div v-for="(dept, di) in departments" :key="dept.key">
        <div :class="accordionHeader" role="button" tabindex="0" :aria-expanded="expanded[dept.key]" @click="toggle(dept.key)" @keydown.enter="toggle(dept.key)">
          <span :class="accordionLeftGroup">
            <span :class="accordionLeft">
              <MpIcon :name="expanded[dept.key] ? 'caret-down' : 'caret-right'" size="sm" />
              <span @click.stop>
                <MpCheckbox
                  :is-checked="isAllSelected(selectableIdsFor(dept.rows))"
                  :is-indeterminate="groupSelectedCount(dept.rows) > 0 && !isAllSelected(selectableIdsFor(dept.rows))"
                  @update:is-checked="toggleSelectAll(selectableIdsFor(dept.rows))"
                  aria-label="Select all"
                />
              </span>
              <MpText size="label" weight="semiBold" :class="valueText">{{ dept.name }}</MpText>
            </span>
            <!-- Actions only appears inline here while THIS department is the
                 sole one with a selection — see soleSelectedDeptKey. 24px from
                 the department name, not flush to the header's right edge. -->
            <span v-if="soleSelectedDeptKey === dept.key" @click.stop>
              <GoalBulkActionsMenu
                @edit-goals="goToImport('edit-goals')"
                @update-progress="goToImport('update-progress')"
                @close-goals="onBulkClose"
                @delete-goals="isBulkDeleteModalOpen = true"
              />
            </span>
          </span>
          <span v-if="di === 0" :class="collapseAllBtn" @click.stop="collapseAll">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 2L8 6L12 2L4 2Z" fill="currentColor" />
              <path d="M12 14L8 10L4 14L12 14Z" fill="currentColor" />
            </svg>
            Collapse all
          </span>
        </div>

        <template v-if="expanded[dept.key]">
          <MpFlex v-if="dept.rows.length === 0" :class="emptyState">No goals in this department yet.</MpFlex>

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
                <col v-if="visibleColumns.category" :class="colCategory">
                <col v-if="visibleColumns.subCategory" :class="colSubCategory">
                <col v-if="visibleColumns.owner" :class="colOwner">
                <col v-if="visibleColumns.progress" :class="colProgress">
                <col v-if="visibleColumns.status" :class="colStatus">
                <col :class="actionHead">
              </colgroup>
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" class="sort-th" :class="colDivider"><span :class="thInner"><span>Goal</span><PxColumnSortMenu col-key="goal" :sort-type="columnSortTypes.goal" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.category" as="th" class="sort-th" :class="[colDivider, colCategory]"><span :class="thInner"><span>Category</span><MpTooltip label="Category weight is the sum of its goals' weights — the category's share of the owner's 100% weight budget." use-portal placement="top"><MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary', cursor: 'help' })" /></MpTooltip><PxColumnSortMenu col-key="category" :sort-type="columnSortTypes.category" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.subCategory" as="th" class="sort-th" :class="[colDivider, colSubCategory]"><span :class="thInner"><span>Sub-category</span><PxColumnSortMenu col-key="subCategory" :sort-type="columnSortTypes.subCategory" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.owner" as="th" class="sort-th" :class="[colDivider, colOwner]"><span :class="thInner"><span>Owner</span><PxColumnSortMenu col-key="owner" :sort-type="columnSortTypes.owner" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.progress" as="th" class="sort-th" :class="[colDivider, colProgress]"><span :class="thInner"><span>Progress</span><PxColumnSortMenu col-key="progress" :sort-type="columnSortTypes.progress" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.status" as="th" class="sort-th" :class="[colDivider, colStatus]"><span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
                  <MpTableCell as="th" :is-fixed="hasOverflow" :class="[actionHead, hasOverflow && fixedRightCol]" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="(row, ri) in dept.rows" :key="row.id">
                  <!-- Goal (per-row select checkbox merged into this first cell; only 'main' rows are selectable) -->
                  <MpTableCell as="td" :class="[tightCell, colDivider, row.kind === 'aligned' && alignedGoalCell]">
                    <MpFlex align="flex-start" gap="2">
                      <MpCheckbox
                        v-if="row.kind === 'main'"
                        :is-checked="isSelected(row.id)"
                        @update:is-checked="toggleSelect(row.id)"
                        :aria-label="`Select ${row.title}`"
                      />
                      <MpFlex direction="column" gap="0.5" :class="[cellContent, row.kind === 'aligned' && alignedGoalIndent]">
                        <span :class="goalCode">{{ row.code }}</span>
                        <MpFlex align="center" gap="2">
                          <span :class="goalNameLink" @click="goToGoal(row)">{{ row.title }}</span>
                          <MpBadge v-if="row.isAwaitingApproval" for="tableStatus" type="warning" size="sm">Awaiting approval</MpBadge>
                          <MpBadge v-else-if="row.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
                          <MpBadge v-if="row.isClosed" for="tableStatus" type="announcement">Closed</MpBadge>
                        </MpFlex>
                        <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                        <button v-if="row.kind === 'main' && row.alignedGoals.length" type="button" :class="alignedLink" @click="toggleAligned(row.id)">
                          <MpIcon :name="expandedAligned[row.id] ? 'caret-down' : 'caret-right'" size="sm" />
                          View aligned goals ({{ row.alignedGoals.length }})
                        </button>
                      </MpFlex>
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
                      <MpText size="label" :class="[valueText, cellContent]">{{ row.owner.name }} - {{ row.owner.id }}</MpText>
                      <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.title }} | {{ row.owner.department }}</MpText>
                    </MpFlex>
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
                    <div v-else :class="progressTrack" />
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
                          <!-- A draft isn't live yet, so progress/align/close make no sense on it —
                               its only forward move is going up for approval. -->
                          <template v-if="row.isDraft">
                            <MpPopoverListItem v-if="!row.isAwaitingApproval" @click="submitRowForApproval(row)">Submit for approval</MpPopoverListItem>
                            <MpPopoverListItem @click="openActivityLog(row)">Activity log</MpPopoverListItem>
                            <MpPopoverListItem v-if="!row.isAwaitingApproval" @click="editRow(row)">Edit</MpPopoverListItem>
                            <MpPopoverListItem @click="deleteRow(row)">
                              <span :class="css({ color: 'text.danger' })">Delete</span>
                            </MpPopoverListItem>
                          </template>
                          <template v-else>
                            <MpPopoverListItem @click="goToGoal(row)">View details</MpPopoverListItem>
                            <MpPopoverListItem v-if="!row.isClosed" @click="openUpdateProgress(row)">Update goal progress</MpPopoverListItem>
                            <MpPopoverListItem v-if="!row.isClosed && row.kind === 'main'" @click="openAlign(row)">Align goal</MpPopoverListItem>
                            <MpPopoverListItem @click="openActivityLog(row)">Activity log</MpPopoverListItem>
                            <MpPopoverListItem v-if="!row.isClosed" @click="editRow(row)">Edit</MpPopoverListItem>
                            <MpPopoverListItem v-if="!row.isClosed" @click="closeRow(row)">Close goal</MpPopoverListItem>
                            <MpPopoverListItem @click="deleteRow(row)">
                              <span :class="css({ color: 'text.danger' })">Delete</span>
                            </MpPopoverListItem>
                          </template>
                        </MpPopoverList>
                      </MpPopoverContent>
                    </MpPopover>
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </template>
      </div>
    </div>

    <!-- Selection spans 2+ departments — no single accordion header to
         anchor Actions to, so it floats at the bottom instead. -->
    <GoalFloatingBulkBar
      v-if="isMultiDeptSelected"
      :selected-count="selectedCount"
      @edit-goals="goToImport('edit-goals')"
      @update-progress="goToImport('update-progress')"
      @close-goals="onBulkClose"
      @delete-goals="isBulkDeleteModalOpen = true"
    />
    </template>
    </template>
  </MpFlex>

  <!-- Goal cycle info -->
  <GoalCycleInfoPanel v-else />

  <!-- Select employee(s) for the new goal(s) -->
  <SelectEmployeesDrawer
    v-model:is-open="isSelectEmployeeOpen"
    :exclude-ids="[...fullOwnerIds]"
    :initial-selected="pendingEmployeeIds"
    :max-selectable="MANUAL_CREATE_OWNER_LIMIT"
    exclude-note="Employees whose goals already total 100% aren't shown here. Add more goals for them from their existing goal list instead."
    @continue="continueToNewGoals"
  />
  <TooManyEmployeesModal
    :is-open="importSuggestionOpen"
    @cancel="cancelBulkOwnerModal"
    @import="goToImportBulkOwners"
  />

  <!-- Edit an existing goal -->
  <AddGoalDrawer
    drawer-id="drawer-add-goal-edit"
    v-model:is-open="isEditDrawerOpen"
    :owners="editingOwners"
    :already-used-weight="alreadyUsedWeightForEdit"
    :cycle-start-date="cycle?.startDate ?? ''"
    :cycle-id="cycle?.id"
    :cycle-end-date="cycle?.endDate ?? ''"
    :editing-draft="editingDraft"
    :weight-mandatory="cycle?.weightMandatory"
    @save="saveEdit"
  />

  <!-- Align a team goal up to an organization/company parent (member-only) -->
  <GoalAlignDrawer
    :is-open="alignModalOpen"
    :goal="aligningGoal"
    :candidates="goals"
    @close="alignModalOpen = false"
    @aligned="onAligned"
  />

  <UpdateProgressDrawer :is-open="isUpdateProgressOpen" :goal="updatingGoal" @close="isUpdateProgressOpen = false" />

  <GoalActivityLogDrawer :is-open="isActivityLogOpen" :goal="activityGoal" @close="isActivityLogOpen = false" />

  <ClientOnly>
    <MpModal :is-open="isCloseModalOpen" size="sm" @close="isCloseModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>Close goal?<MpModalCloseButton @click="isCloseModalOpen = false" /></MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="css({ color: 'text.default' })">Once a goal has closed, {{ goalToClose?.title }} can no longer submit progress or be edited.<template v-if="needsApproval(goalToClose?.ownerId)"> This close will be sent to the manager for approval before it takes effect.</template></MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isCloseModalOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmCloseGoal">Yes, close goal</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

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
          <strong>{{ goalToDelete?.title }}</strong> will be permanently deleted and cannot be recovered.<template v-if="needsApproval(goalToDelete?.ownerId)"> This delete will be sent to the manager for approval before it takes effect.</template>
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
  <ClientOnly>
    <MpModal :is-open="isBulkCloseModalOpen" size="sm" @close="isBulkCloseModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>Close {{ goalsToClose.length }} goal{{ goalsToClose.length === 1 ? '' : 's' }}?<MpModalCloseButton @click="isBulkCloseModalOpen = false" /></MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="css({ color: 'text.default' })">Once closed, these goals can no longer submit progress or be edited. Goals owned by direct reports are sent for approval first.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isBulkCloseModalOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmBulkClose(); clearSelection()">Yes, close goals</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

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
