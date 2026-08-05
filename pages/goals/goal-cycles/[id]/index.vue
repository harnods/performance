<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle details / All goals
  Token mode: Pixel 2.4

  Reads every goal (all levels, all owners) from the goals mini-DB
  (useGoalsStore) — the one table on this scoped page that spans many
  different owners at once, so Owner is a normal per-row sticky-left column
  rather than the single rowspan header used on the scoped pages.
  "My goals" / "My direct reports" filter the same table down via
  goalsView, using the store's myGoals / myDirectReportsGoals.

  Selecting "Company goals" from the tab dropdown navigates to the sibling
  ./company-goals page (different table shape — see that file's header).
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
  MpSkeleton,
  MpTextlink,
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

// The Select and Actions columns only pin themselves (sticky + boundary
// shadow) once the table actually needs to scroll horizontally —
// otherwise they're just normal first/last columns.
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

// "All goals" tab dropdown — switches which scope of goals the table shows.
// Only "company" has a distinct Figma table design so far — it navigates to
// the sibling ./company-goals page. The rest just relabel this same table.
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
const goalsView = ref<GoalsViewKey>('all')
const goalsViewLabel = computed(() => goalsViewOptions.find(o => o.key === goalsView.value)?.label ?? 'All goals')

const scopedRoutes: Partial<Record<GoalsViewKey, string>> = {
  company: 'company-goals',
  organization: 'organization-goals',
  team: 'team-goals',
  individual: 'individual-goals',
}

function selectGoalsView(key: GoalsViewKey) {
  const slug = scopedRoutes[key]
  if (slug) {
    router.push({ path: `/goals/goal-cycles/${route.params.id}/${slug}`, query: route.query })
    return
  }
  goalsView.value = key
  activeTab.value = 'all'
}

// Column visibility — Goal owner is locked (always on, shown disabled in the
// popover for clarity); the rest are toggleable. "Goal ID" and "Aligned goals"
// toggle sub-parts of the Goal cell rather than being their own column.
const columnOptions = [
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub-category' },
  { key: 'goal', label: 'Goal' },
  { key: 'goalId', label: 'Goal ID' },
  { key: 'alignedGoals', label: 'Aligned goals' },
  { key: 'goalType', label: 'Goal type' },
  { key: 'progress', label: 'Progress' },
  { key: 'status', label: 'Status' },
] as const
type ColumnKey = typeof columnOptions[number]['key']
const visibleColumns = reactive<Record<ColumnKey, boolean>>({
  category: true,
  subCategory: true,
  goal: true,
  goalId: true,
  alignedGoals: true,
  goalType: true,
  progress: true,
  status: true,
})

const statusFilter = ref('')
const search = ref('')

// "All filters" drawer — owner-attribute filters (branch/org/job position/level/
// employment status), draft-then-apply. Count shown on the button.
const allFiltersOpen = ref(false)
const appliedFilters = ref<Record<string, string[]>>({})
const appliedScopes = ref<string[]>([])
const activeFilterCount = computed(() => allFiltersCount(appliedFilters.value))
function onApplyAllFilters(p: { filters: Record<string, string[]>, scopes: string[] }) {
  appliedFilters.value = p.filters
  appliedScopes.value = p.scopes
}

// ─── Live data — read from the goals mini-DB (useGoalsStore). Unlike the
// scoped Company/Organization/Team/Individual pages, this table spans many
// different owners at once, so there's no single rowspan-able owner column
// — Category/Sub-category are shown per-row (no merge) and Owner is a
// normal sticky-left column instead of one giant rowspan header. ─────────
type GoalStatus = 'green' | 'orange' | 'gray'
const GOAL_TYPE_LABEL: Record<string, string> = {
  company: 'Company goal',
  organization: 'Organization goal',
  team: 'Team goal',
  individual: 'Individual goal',
}

const { goals, myGoals, myDirectReportsGoals } = useGoalsStore(route.params.id as string)
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

const STATUS_FILTER_TO_GOAL_STATUS: Record<string, GoalStatus> = { ontrack: 'green', atrisk: 'orange' }

const sourceGoals = computed(() => {
  const base = goalsView.value === 'my'
    ? myGoals.value
    : goalsView.value === 'direct-reports' ? myDirectReportsGoals.value : goals.value
  return base.filter(g => (!statusFilter.value || g.status === STATUS_FILTER_TO_GOAL_STATUS[statusFilter.value]) && matchesSearch(g, search.value) && ownerMatchesAllFilters(g.ownerId, appliedFilters.value))
})

// ─── Column sort (sorts WITHIN each owner rowspan group; owner is the only
// merged column here, so a non-owner key reorders rows inside each owner
// block and owner reorders the blocks). sortKey '' = default owner-name order.
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  owner: 'text', category: 'text', subCategory: 'text', goal: 'text', goalType: 'text', progress: 'number', status: 'text',
}
function goalSortValue(r: { owner: { name: string }, category: string, subCategory: string, title: string, goalType: string, pill?: number, status: GoalStatus }, key: string): string | number {
  switch (key) {
    case 'owner': return r.owner.name
    case 'category': return r.category
    case 'subCategory': return r.subCategory
    case 'goal': return r.title
    case 'goalType': return r.goalType
    case 'progress': return r.pill ?? -1
    case 'status': return statusLabel[r.status]
    default: return ''
  }
}

const rows = computed(() => {
  const base = sortByCategory(sourceGoals.value)
    .map(g => ({ ...g, owner: ownerOf(g.ownerId), goalType: GOAL_TYPE_LABEL[g.level], alignedGoals: alignedGoalsOf(g, goals.value) }))
    .sort((a, b) => a.owner.name.localeCompare(b.owner.name))
  return sortGoalRows(base, {
    sortKey: sortKey.value,
    sortDir: sortDir.value,
    sortType: (columnSortTypes[sortKey.value] as 'text' | 'number') ?? 'text',
    sortValue: r => goalSortValue(r, sortKey.value),
    groupLevels: ['owner'],
    ownerValue: r => r.owner.name,
  })
})

// "View aligned goals" inserts a real row per aligned goal right below its
// parent — Goal/Goal type/Progress/Status each get their own row, since
// those are per-goal values. An aligned child can belong to a different
// owner than its parent, so it always gets its own Owner cell rather than
// being folded into an ancestor's merged rowspan — see visibleRows below.
const expandedAligned = reactive<Record<string, boolean>>({})
function toggleAligned(id: string) {
  expandedAligned[id] = !expandedAligned[id]
}

// Progressive pagination — same pattern as
// pages/reviews/review-cycles/[id]/index.vue's "Load more" bars, but the
// PAGE_SIZE unit is OWNERS, not raw goal rows — "Load more" reveals the next
// PAGE_SIZE employees' full goal lists, never a group cut off mid-owner.
const PAGE_SIZE = 10
const visibleOwnerCount = ref(PAGE_SIZE)
const loadingMore = ref(false)
// `rows` is already sorted by owner name, so distinct owner ids appear in
// the same stable order the table renders them in.
const distinctOwnerIds = computed(() => {
  const seen = new Set<string>()
  for (const row of rows.value) seen.add(row.ownerId)
  return [...seen]
})

// Arriving from "New goals" (see new.vue's persistAndLeave) with a
// ?newOwners hint — expand the visible page far enough that whichever
// owner(s) just got a goal saved are guaranteed to be on-screen, instead of
// silently sitting behind a "Load more" the user has no reason to click.
const newOwnerIds = computed(() => {
  const raw = route.query.newOwners
  const list = Array.isArray(raw) ? raw[0] : raw
  return (list ?? '').split(',').filter(Boolean)
})
watch(distinctOwnerIds, (ids) => {
  if (!newOwnerIds.value.length) return
  const lastIndex = Math.max(...newOwnerIds.value.map(id => ids.indexOf(id)))
  if (lastIndex >= 0) visibleOwnerCount.value = Math.max(visibleOwnerCount.value, lastIndex + 1)
  router.replace({ query: { ...route.query, newOwners: undefined } })
}, { immediate: true })

const visibleOwnerIds = computed(() => new Set(distinctOwnerIds.value.slice(0, visibleOwnerCount.value)))
const slicedRows = computed(() => rows.value.filter(row => visibleOwnerIds.value.has(row.ownerId)))
// Owner rowspan is computed on the sliced+expanded (currently visible) rows,
// not the full list — otherwise a rowspan computed against the full list
// would overshoot what's actually rendered. An inserted aligned row always
// breaks an owner merge in two (it gets its own cell, showing its own real
// owner), which is correct since it isn't necessarily that owner's goal.
const visibleRows = computed(() => {
  const sliced = slicedRows.value
  const flat: Array<{ kind: 'main' | 'aligned', id: string, ownerId: string, owner: ReturnType<typeof ownerOf>, category: string, subCategory: string, categoryWeight: number, code: string, title: string, weight: number, goalType: string, alignedGoals: ReturnType<typeof alignedGoalsOf>, status: (typeof sliced)[number]['status'], unit?: (typeof sliced)[number]['unit'], value?: number, pill?: number, min?: number, max?: number, isDraft?: boolean }> = []
  for (const row of sliced) {
    flat.push({ kind: 'main', ...row })
    if (expandedAligned[row.id]) {
      for (const ag of row.alignedGoals) {
        flat.push({
          kind: 'aligned',
          id: `${row.id}::${ag.id}`,
          ownerId: ag.ownerId,
          owner: ownerOf(ag.ownerId),
          category: ag.category,
          subCategory: ag.subCategory,
          categoryWeight: 0,
          code: ag.code,
          title: ag.title,
          weight: ag.weight,
          goalType: GOAL_TYPE_LABEL[ag.level],
          alignedGoals: [],
          status: ag.status,
          unit: ag.unit,
          value: ag.value,
          pill: ag.pill,
          min: ag.min,
          max: ag.max,
        })
      }
    }
  }
  return flat.map((row, i) => {
    if (row.kind === 'aligned') return { ...row, showOwner: true, ownerRowspan: 1, showCategory: true, categoryRowspan: 1, showSubCategory: true, subCategoryRowspan: 1 }
    const prev = flat[i - 1]
    // Owner / Category / Sub-category each rowspan-merge across consecutive rows
    // that match, nested: category only merges within the same owner, sub-category
    // only within the same owner+category. Rows are sorted owner→category→sub, so
    // matching rows are always contiguous.
    const newOwner = i === 0 || prev.kind !== 'main' || prev.ownerId !== row.ownerId
    const newCategory = newOwner || prev.category !== row.category
    const newSub = newCategory || prev.subCategory !== row.subCategory
    const sameCatBlock = (r: typeof row) => r.kind === 'main' && r.ownerId === row.ownerId && r.category === row.category
    // The merged Category cell shows the category's total weight = sum of its
    // goals' weights for this owner.
    let categoryWeight = row.categoryWeight
    if (newCategory) {
      categoryWeight = 0
      for (let j = i; j < flat.length && sameCatBlock(flat[j]); j++) categoryWeight += flat[j].weight || 0
    }
    return {
      ...row,
      showOwner: newOwner,
      ownerRowspan: newOwner ? countWhile(flat, i, r => r.kind === 'main' && r.ownerId === row.ownerId) : 0,
      showCategory: newCategory,
      categoryRowspan: newCategory ? countWhile(flat, i, sameCatBlock) : 0,
      categoryWeight,
      showSubCategory: newSub,
      subCategoryRowspan: newSub ? countWhile(flat, i, r => r.kind === 'main' && r.ownerId === row.ownerId && r.category === row.category && r.subCategory === row.subCategory) : 0,
    }
  })
})
const hasMore = computed(() => visibleOwnerCount.value < distinctOwnerIds.value.length)
function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  setTimeout(() => {
    visibleOwnerCount.value += PAGE_SIZE
    loadingMore.value = false
  }, 800)
}
watch(goalsView, () => { visibleOwnerCount.value = PAGE_SIZE })

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

// Rowspan-merged columns (Category/Sub-category) need a right border on every
// column so the grid stays readable — a merged cell leaves no natural row
// divider to lean on. Applied to all columns except the last (Actions), whose
// outer edge stays borderless — one border per boundary, no doubling.
const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
// Sticky first/last column (Select / Actions). `is-fixed` alone only
// tags the cell (data-table-cell-fixed) — the actual position:sticky/z-index/
// background need setting explicitly, otherwise the column doesn't visually
// separate from scrolling siblings until motion happens to reveal it. The
// boundary itself is a plain 1px border like every other column divider —
// on a wide screen the table isn't actually scrolled, so it shouldn't look
// any heavier than colDivider just because the column happens to be sticky.
const fixedLeftCol = css({ position: 'sticky', left: '0', zIndex: '1', boxShadow: 'inset -1px 0px var(--mp-colors-border-default)', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const fixedRightCol = css({ position: 'sticky', right: '0', zIndex: '1', boxShadow: 'inset 1px 0px var(--mp-colors-border-default)' })
const fixedBodyBg = css({ background: 'white' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

// Fixed table layout so every column keeps a stable width regardless of which
// optional columns are toggled on/off via Column settings. Goal is
// intentionally the one column with no fixed width — it absorbs all
// remaining space, pushing the 52px action column flush against the right
// edge instead of it stretching along with everything else.
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1448px' })
const colOwner = css({ width: '184px' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
const colGoalType = css({ width: '160px' })
const colProgress = css({ width: '224px' })
const colStatus = css({ width: '136px' })
// Action column is a hard 52px: 36px icon button + 8px padding each side.
const actionHead = css({ width: '52px', paddingLeft: '2', paddingRight: '2', paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', verticalAlign: 'top' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', paddingLeft: '2', paddingRight: '2', width: '52px', whiteSpace: 'nowrap', verticalAlign: 'top' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

// Header label + column-sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const ownerCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

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
const progressTrack = css({ width: '100%', height: '6px', borderRadius: 'full', background: 'gray.50', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })
// Not updated (but has progress) — dark gray, mirroring prod's progressColor
// ('gray' → gray.400). Distinct from the light gray.50 track.
const fillGray = css({ background: 'gray.400' })

const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
const statusLabel: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not updated' }

const awaitingBadge = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '20px', height: '20px', paddingInline: '1.5', borderRadius: 'full',
  background: 'orange.400', color: 'white', fontSize: '14px', lineHeight: '20px',
})

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
    <MpPopover is-close-on-select use-portal placement="bottom-end">
      <MpPopoverTrigger>
        <MpButton variant="secondary" right-icon="caret-down">Import</MpButton>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <MpPopoverList>
          <MpPopoverListItem>Import goals</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
    <MpButton variant="primary" @click="openSelectEmployee">New goals</MpButton>
  </Teleport>

  <!-- Tabs -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <MpPopover is-close-on-select use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <button type="button" :class="activeTab === 'all' ? tabItemActive : tabItem" @click="activeTab = 'all'">
            {{ goalsViewLabel }}
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
    <!-- Empty state: brand-new goal cycle, no goals at all yet -->
    <MpFlex v-if="goals.length === 0" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
        <MpText :class="emptyTitle">No goals in this cycle yet</MpText>
        <MpText size="label" :class="captionText">Goals you add to this cycle will appear here.</MpText>
      </MpFlex>
      <MpButton variant="secondary" @click="openSelectEmployee">New goals</MpButton>
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
        <MpButton variant="secondary" @click="allFiltersOpen = true">All filters<template v-if="activeFilterCount"> ({{ activeFilterCount }})</template></MpButton>
      </MpFlex>

      <MpFlex align="center" gap="2">
        <MpPopover use-portal placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" />
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

    <!-- Goal table. tableOuterBorder must live on a wrapper div, not on
         MpTableContainer itself — the component already sets its own
         overflow-x:auto for horizontal scroll, and putting overflow:hidden
         directly on the same element fights that and disables scrolling. -->
    <div ref="wrapperRef" :class="tableOuterBorder">
      <MpTableContainer>
        <MpTable :is-hoverable="false" :class="fixedTable">
        <!-- table-layout:fixed derives column widths from the first row's
             cells — an explicit colgroup fixes every column's width
             independent of which optional columns are toggled on/off via
             Column settings. -->
        <colgroup>
          <col :class="colOwner">
          <col v-if="visibleColumns.category" :class="colCategory">
          <col v-if="visibleColumns.subCategory" :class="colSubCategory">
          <col v-if="visibleColumns.goal">
          <col v-if="visibleColumns.goalType" :class="colGoalType">
          <col v-if="visibleColumns.progress" :class="colProgress">
          <col v-if="visibleColumns.status" :class="colStatus">
          <col :class="actionHead">
        </colgroup>
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" class="sort-th" :is-fixed="hasOverflow" :class="[hasOverflow ? fixedLeftCol : colDivider, colOwner]"><span :class="thInner"><span>Goal owner</span><PxColumnSortMenu col-key="owner" :sort-type="columnSortTypes.owner" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.category" as="th" class="sort-th" :class="[colDivider, colCategory]"><span :class="thInner"><span>Category</span><MpTooltip label="Category weight is the sum of its goals' weights — the category's share of the owner's 100% weight budget." use-portal placement="top"><MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary', cursor: 'help' })" /></MpTooltip><PxColumnSortMenu col-key="category" :sort-type="columnSortTypes.category" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.subCategory" as="th" class="sort-th" :class="[colDivider, colSubCategory]"><span :class="thInner"><span>Sub-category</span><PxColumnSortMenu col-key="subCategory" :sort-type="columnSortTypes.subCategory" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.goal" as="th" class="sort-th" :class="colDivider"><span :class="thInner"><span>Goal</span><PxColumnSortMenu col-key="goal" :sort-type="columnSortTypes.goal" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.goalType" as="th" class="sort-th" :class="[colDivider, colGoalType]"><span :class="thInner"><span>Goal type</span><PxColumnSortMenu col-key="goalType" :sort-type="columnSortTypes.goalType" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.progress" as="th" class="sort-th" :class="[colDivider, colProgress]"><span :class="thInner"><span>Progress</span><PxColumnSortMenu col-key="progress" :sort-type="columnSortTypes.progress" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.status" as="th" class="sort-th" :class="[colDivider, colStatus]"><span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" :is-fixed="hasOverflow" :class="[actionHead, hasOverflow && fixedRightCol]" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="row in visibleRows" :key="row.id">
            <!-- Goal owner: rowspan-merged across this owner's consecutive
                 goals (this table spans many owners at once). Aligned/child
                 rows leave this blank — their owner already shows inline in
                 the Goal cell ("Owner: X"), so repeating it here would be
                 redundant. Sticky-left so it stays visible while scrolling,
                 but only once the table actually scrolls. -->
            <MpTableCell v-if="row.showOwner" as="td" :rowspan="row.ownerRowspan" :is-fixed="hasOverflow" :class="[hasOverflow ? fixedLeftCol : colDivider, fixedBodyBg, ownerCell, colOwner]">
              <MpFlex v-if="row.kind === 'main'" direction="column" gap="0" :class="cellContent">
                <MpText size="label" :class="[valueText, cellContent]">{{ row.owner.name }}</MpText>
                <MpText size="label-small" :class="captionText">{{ row.owner.id }}</MpText>
                <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.title }}</MpText>
                <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.department }}</MpText>
              </MpFlex>
            </MpTableCell>

            <!-- Category: rowspan-merged across this owner's consecutive
                 same-category goals (weight shown = the category's total). -->
            <MpTableCell v-if="visibleColumns.category && row.showCategory" as="td" :rowspan="row.categoryRowspan" :class="[tightCell, colDivider, colCategory]">
              <MpFlex direction="column" gap="0" :class="cellContent">
                <MpText size="label" :class="[valueText, cellContent]">{{ row.category }}</MpText>
                <MpText v-if="row.kind === 'main'" size="label-small" :class="captionText">Weight: {{ row.categoryWeight }}%</MpText>
              </MpFlex>
            </MpTableCell>

            <!-- Sub-category: rowspan-merged within the same owner+category. -->
            <MpTableCell v-if="visibleColumns.subCategory && row.showSubCategory" as="td" :rowspan="row.subCategoryRowspan" :class="[tightCell, colDivider, colSubCategory]">
              <MpText size="label" :class="[valueText, cellContent]">{{ row.subCategory }}</MpText>
            </MpTableCell>

            <!-- Goal -->
            <MpTableCell v-if="visibleColumns.goal" as="td" :class="[tightCell, colDivider, row.kind === 'aligned' && alignedGoalCell]">
              <MpFlex direction="column" gap="0.5" :class="[cellContent, row.kind === 'aligned' && alignedGoalIndent]">
                <span v-if="visibleColumns.goalId" :class="goalCode">{{ row.code }}</span>
                <MpFlex align="center" gap="2">
                  <span :class="goalNameLink" @click="goToGoal(row)">{{ row.title }}</span>
                  <MpBadge v-if="row.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
                </MpFlex>
                <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                <MpFlex v-if="row.kind === 'aligned'" align="flex-start" gap="1" :class="css({ marginTop: '1' })">
                  <MpText size="label-small" :class="captionText">Owner:</MpText>
                  <MpFlex direction="column" gap="0">
                    <MpText size="label-small" :class="captionText">{{ row.owner.name }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ row.owner.id }} | {{ row.owner.title }} | {{ row.owner.department }}</MpText>
                  </MpFlex>
                </MpFlex>
                <button v-if="visibleColumns.alignedGoals && row.kind === 'main' && row.alignedGoals.length" type="button" :class="alignedLink" @click="toggleAligned(row.id)">
                  <MpIcon :name="expandedAligned[row.id] ? 'caret-down' : 'caret-right'" size="sm" />
                  View aligned goals ({{ row.alignedGoals.length }})
                </button>
              </MpFlex>
            </MpTableCell>

            <!-- Goal type -->
            <MpTableCell v-if="visibleColumns.goalType" as="td" :class="[tightCell, colDivider, colGoalType]">
              <MpText size="label" :class="[valueText, cellContent]">{{ row.goalType }}</MpText>
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
                    <MpPopoverListItem @click="goToGoal(row)">View details</MpPopoverListItem>
                    <MpPopoverListItem @click="goToGoal(row)">Update goal progress</MpPopoverListItem>
                    <MpPopoverListItem @click="editRow(row)">Edit</MpPopoverListItem>
                    <MpPopoverListItem @click="deleteRow(row)">
                      <span :class="css({ color: 'text.danger' })">Delete</span>
                    </MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </MpTableCell>
          </MpTableRow>

          <!-- Skeleton rows: progressive load-more (appended after existing rows) -->
          <template v-if="loadingMore">
            <MpTableRow v-for="i in Math.min(PAGE_SIZE, distinctOwnerIds.length - visibleOwnerCount)" :key="`skel-${i}`">
              <MpTableCell as="td" :is-fixed="hasOverflow" :class="[hasOverflow ? fixedLeftCol : colDivider, fixedBodyBg, ownerCell, colOwner]">
                <MpFlex direction="column" gap="1">
                  <MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" />
                  <MpSkeleton :class="css({ width: '80px', height: '12px', borderRadius: '4px' })" />
                </MpFlex>
              </MpTableCell>
              <MpTableCell v-if="visibleColumns.category" as="td" :class="[tightCell, colDivider, colCategory]"><MpSkeleton :class="css({ width: '100px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
              <MpTableCell v-if="visibleColumns.subCategory" as="td" :class="[tightCell, colDivider, colSubCategory]"><MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
              <MpTableCell v-if="visibleColumns.goal" as="td" :class="[tightCell, colDivider]"><MpSkeleton :class="css({ width: '220px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
              <MpTableCell v-if="visibleColumns.goalType" as="td" :class="[tightCell, colDivider, colGoalType]"><MpSkeleton :class="css({ width: '100px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
              <MpTableCell v-if="visibleColumns.progress" as="td" :class="[tightCell, colDivider, colProgress]"><MpSkeleton :class="css({ width: '160px', height: '14px', borderRadius: '4px' })" /></MpTableCell>
              <MpTableCell v-if="visibleColumns.status" as="td" :class="[tightCell, colDivider, colStatus]"><MpSkeleton :class="css({ width: '72px', height: '22px', borderRadius: '4px' })" /></MpTableCell>
              <MpTableCell as="td" :is-fixed="hasOverflow" :class="[actionCell, hasOverflow && fixedRightCol, fixedBodyBg]"><MpSkeleton :class="css({ width: '32px', height: '32px', borderRadius: '6px' })" /></MpTableCell>
            </MpTableRow>
          </template>
        </MpTableBody>
      </MpTable>
      </MpTableContainer>

      <!-- Load more bar -->
      <MpFlex
        align="center"
        gap="1"
        :class="css({ paddingX: '4', paddingY: '3', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'border.default' })"
      >
        <MpText size="label" :class="captionText">
          Showing {{ slicedRows.length }} of {{ rows.length }} goals ({{ Math.min(visibleOwnerCount, distinctOwnerIds.length) }} of {{ distinctOwnerIds.length }} employees).
        </MpText>
        <MpTextlink v-if="hasMore && !loadingMore" size="label" @click="loadMore">
          Load {{ Math.min(PAGE_SIZE, distinctOwnerIds.length - visibleOwnerCount) }} more employees.
        </MpTextlink>
      </MpFlex>
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

  <PxAllFiltersDrawer :is-open="allFiltersOpen" :applied-filters="appliedFilters" :applied-scopes="appliedScopes" @close="allFiltersOpen = false" @apply="onApplyAllFilters" />
</template>

<style scoped>
/* Reveal the column-sort icon on header hover. UNLAYERED scoped rule (not a
   Panda css() @layer utility) so it beats PxColumnSortMenu's unlayered scoped
   `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
