<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Talent directory (entry point to Talent profile)
  Token mode: Pixel 2.4
  Patterns used: layout-shell, index-view (filter bar + wide table + pagination),
  sticky first/last columns on horizontal scroll, column settings, all-filters modal.

  As a manager, this lists the people who report to you. Each row opens that
  person's Talent profile via the sticky "View talent profile" action.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpIcon,
  MpAvatar,
  MpTag,
  MpTooltip,
  MpInputGroup,
  MpInputLeftAddon,
  MpInput,
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
  MpCheckbox,
  MpBadge,
  css,
  toast,
} from '@mekari/pixel3'
import {
  TALENTS,
  BRANCHES,
  ORGANIZATIONS,
  JOB_LEVELS,
  JOB_GRADES,
  JOB_CLASSES,
  EMPLOYMENT_TYPES,
  aging,
  formatJoinDate,
  type TalentEmployee,
} from '~/utils/talents'
import { emptyCriteria, hasAnyCriteria, matchesCriteria, summarizeCriteria, type TalentCriteria } from '~/utils/talentCriteria'
import { computeMatchScore } from '~/utils/matchScore'
import { TALENT_POOLS_ENABLED } from '~/utils/featureFlags'

definePageMeta({ title: 'Talent directory', layout: 'default' })

// ─── Pool tabs (#page-tabs, Type A — docs/patterns/tabs.md) ─────────────────
// 🔒 Currently hidden behind TALENT_POOLS_ENABLED (utils/featureFlags.ts). The
// tab bar isn't rendered while it's off, so `activeTab` stays 'all' and every
// `activeTab !== 'all'` branch below is unreachable — no second flag check
// needed on the match-score column, checkboxes, summary strip or empty state.
// "All talents" is the permanent first tab (current list). "+ Add pool" opens
// PxAddPoolDrawer directly — a pool's name, scope and criteria are all set in
// that one drawer, never "create empty, configure later".
// A pool is scoped to a job position (required) and optionally a branch, then
// narrowed further by its talent criteria.
type PoolScope = { jobPosition: string, branch: string }
type PoolTab = { id: string, label: string }
const pools = ref<PoolTab[]>([])
const activeTab = ref<string>('all')
let poolSeq = 0

const poolCriteria = ref<Record<string, TalentCriteria>>({})
const poolScopes = ref<Record<string, PoolScope>>({})
const poolDrawerOpen = ref(false)
const poolDrawerMode = ref<'create' | 'edit'>('create')
function openAddPool() {
  poolDrawerMode.value = 'create'
  poolDrawerOpen.value = true
}
function openEditPool() {
  poolDrawerMode.value = 'edit'
  poolDrawerOpen.value = true
}
const poolDrawerName = computed(() => (poolDrawerMode.value === 'edit' ? (pools.value.find(p => p.id === activeTab.value)?.label ?? '') : ''))
const activeCriteria = computed(() => poolCriteria.value[activeTab.value] ?? emptyCriteria())
const activeScope = computed<PoolScope>(() => poolScopes.value[activeTab.value] ?? { jobPosition: '', branch: '' })
const poolDrawerCriteria = computed(() => (poolDrawerMode.value === 'edit' ? activeCriteria.value : emptyCriteria()))
const poolDrawerScope = computed<PoolScope>(() => (poolDrawerMode.value === 'edit' ? activeScope.value : { jobPosition: '', branch: '' }))

function onSavePool({ name, jobPosition, branch, criteria }: { name: string, jobPosition: string, branch: string, criteria: TalentCriteria }) {
  const id = poolDrawerMode.value === 'create' ? `pool-${(poolSeq += 1)}` : activeTab.value
  if (poolDrawerMode.value === 'create') {
    pools.value.push({ id, label: name })
    activeTab.value = id
  }
  else {
    const idx = pools.value.findIndex(p => p.id === id)
    if (idx !== -1) pools.value[idx] = { ...pools.value[idx], label: name }
  }
  poolCriteria.value = { ...poolCriteria.value, [id]: criteria }
  poolScopes.value = { ...poolScopes.value, [id]: { jobPosition, branch } }
  poolDrawerOpen.value = false
}

// A pool tab is empty until it defines *something* — a job position/branch scope
// or any criteria. Job position is required when saving, so a pool created
// through the drawer is always configured; this covers the unscoped fallback.
const isPoolEmpty = computed(() => activeTab.value !== 'all'
  && !activeScope.value.jobPosition && !activeScope.value.branch
  && !hasAnyCriteria(activeCriteria.value))
// What the "Showing …" strip reads back — the criteria as selected, not the
// prompt as typed, so it stays true after they're edited by hand.
const poolSummary = computed(() => summarizeCriteria(activeScope.value, activeCriteria.value))
// Source rows: the full directory for "All talents", or — for a pool tab — the
// members inside its scope that also match its criteria.
const sourceRows = computed<TalentEmployee[]>(() => {
  if (activeTab.value === 'all') return TALENTS
  const criteria = poolCriteria.value[activeTab.value]
  if (!criteria) return []
  const scope = activeScope.value
  return TALENTS.filter(t =>
    (!scope.jobPosition || t.jobPosition === scope.jobPosition)
    && (!scope.branch || t.branch === scope.branch)
    && matchesCriteria(t, criteria),
  )
})

// ─── Filters ───────────────────────────────────────────────────────────────
const toOptions = (vals: string[]) => vals.map(v => ({ value: v, label: v }))
const branchOptions = toOptions(BRANCHES)
const orgOptions = toOptions(ORGANIZATIONS)
const levelOptions = toOptions(JOB_LEVELS)
const gradeOptions = toOptions(JOB_GRADES)
const classOptions = toOptions(JOB_CLASSES)
const typeOptions = toOptions(EMPLOYMENT_TYPES)
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'resigned', label: 'Resigned' },
]

// Applied filters (drive the table).
const branch = ref('')
const organization = ref('')
const search = ref('')

// "All filters" drawer (production pattern) — advanced filters are multi-select
// scopes; branch/organization stay inline. Draft-then-apply lives in the drawer.
const filtersOpen = ref(false)
const advFilters = ref<Record<string, string[]>>({})
const advScopes = ref<string[]>([])
const talentScopes = [
  { key: 'jobLevel', label: 'Job level', items: levelOptions.map(o => ({ id: o.value, name: o.label })) },
  { key: 'jobGrade', label: 'Job grade', items: gradeOptions.map(o => ({ id: o.value, name: o.label })) },
  { key: 'jobClass', label: 'Job class', items: classOptions.map(o => ({ id: o.value, name: o.label })) },
  { key: 'employmentType', label: 'Employment type', items: typeOptions.map(o => ({ id: o.value, name: o.label })) },
  { key: 'status', label: 'Employee status', items: statusOptions.map(o => ({ id: o.value, name: o.label })) },
]
function onApplyAdv(p: { filters: Record<string, string[]>, scopes: string[] }) {
  advFilters.value = p.filters
  advScopes.value = p.scopes
}

// Count of "advanced" filters active — badge on the All filters button.
const advancedCount = computed(() => allFiltersCount(advFilters.value))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return sourceRows.value.filter((t) => {
    if (branch.value && t.branch !== branch.value) return false
    if (organization.value && t.organization !== organization.value) return false
    const adv = advFilters.value
    if (adv.jobLevel?.length && !adv.jobLevel.includes(t.jobLevel)) return false
    if (adv.jobGrade?.length && !adv.jobGrade.includes(t.jobGrade)) return false
    if (adv.jobClass?.length && !adv.jobClass.includes(t.jobClass)) return false
    if (adv.employmentType?.length && !adv.employmentType.includes(t.employmentType)) return false
    if (adv.status?.length && !adv.status.includes(t.status)) return false
    if (q && !(t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.jobPosition.toLowerCase().includes(q))) return false
    return true
  })
})

// ─── Bulk select (pool tabs only — docs/patterns/checkbox.md §3, single flat
// table = the "Company goals" case: the table header swaps to a bulk bar) ───
const selectedIds = ref<Set<string>>(new Set())
const selectedCount = computed(() => selectedIds.value.size)
const filteredIds = computed(() => filtered.value.map(t => t.id))
const isAllSelected = computed(() => filteredIds.value.length > 0 && filteredIds.value.every(id => selectedIds.value.has(id)))
function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
function toggleSelectAll() {
  selectedIds.value = isAllSelected.value ? new Set() : new Set(filteredIds.value)
}
function clearSelection() { selectedIds.value = new Set() }
// Selection is scoped to whichever pool tab is active — switching tabs (or
// leaving the pool view entirely) starts fresh, same as any other view-scoped state.
watch(activeTab, () => clearSelection())

function bulkAction(action: 'export' | 'create-idp' | 'create-assignment') {
  const n = selectedCount.value
  const label = { export: 'Export', 'create-idp': 'IDP creation', 'create-assignment': 'Assignment creation' }[action]
  toast.notify({ id: `pool-bulk-${action}`, position: 'top-center', variant: 'success', title: `${label} started for ${n} talent${n === 1 ? '' : 's'}` })
  clearSelection()
}
function onBulkKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && selectedCount.value > 0) clearSelection()
}
onMounted(() => window.addEventListener('keydown', onBulkKeydown))
onUnmounted(() => window.removeEventListener('keydown', onBulkKeydown))

// ─── Column sort (behaviour from goal-cycles reference) ──────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  name: 'text',
  branch: 'text',
  organization: 'text',
  jobPosition: 'text',
  jobLevel: 'text',
  jobGrade: 'text',
  jobClass: 'text',
  employmentType: 'text',
  joinDate: 'date', // sort chronologically by the ISO join date
  status: 'text',
  matchScore: 'number',
}
function sortValue(t: TalentEmployee, key: string): string {
  if (key === 'matchScore') return String(matchScoreFor(t).overall)
  if (key === 'name') return t.name
  if (key === 'branch') return t.branch
  if (key === 'organization') return t.organization
  if (key === 'jobPosition') return t.jobPosition
  if (key === 'jobLevel') return t.jobLevel
  if (key === 'jobGrade') return t.jobGrade
  if (key === 'jobClass') return t.jobClass
  if (key === 'employmentType') return t.employmentType
  if (key === 'joinDate') return t.joinDate
  if (key === 'status') return t.status
  return ''
}
const sortedRows = computed(() => {
  if (!sortKey.value) return filtered.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

function clearAll() {
  branch.value = ''
  organization.value = ''
  advFilters.value = {}
  advScopes.value = []
  search.value = ''
}

// ─── Column settings ─────────────────────────────────────────────────────────
// Name + action are always visible; the rest are toggleable.
const COLS = [
  { key: 'branch', label: 'Branch' },
  { key: 'organization', label: 'Organization' },
  { key: 'jobPosition', label: 'Job position' },
  { key: 'jobLevel', label: 'Job level' },
  { key: 'jobGrade', label: 'Job grade' },
  { key: 'jobClass', label: 'Job class' },
  { key: 'employmentType', label: 'Employment type' },
  { key: 'joinDate', label: 'Join date' },
  { key: 'status', label: 'Employee status' },
] as const
type ColKey = (typeof COLS)[number]['key']
const visible = ref<Record<ColKey, boolean>>({
  branch: true, organization: true, jobPosition: true, jobLevel: true,
  jobGrade: true, jobClass: true, employmentType: true, joinDate: true, status: true,
})
// name + action + visible optional columns (+ Match score on pool tabs) → colspan for the empty-state row.
const colCount = computed(() => 2 + COLS.filter(c => visible.value[c.key]).length + (activeTab.value !== 'all' ? 1 : 0))

// ─── Match score (pool tabs only) ────────────────────────────────────────────
const matchScoreOpen = ref(false)
const matchScoreTalent = ref<TalentEmployee | null>(null)
function openMatchScore(t: TalentEmployee) {
  matchScoreTalent.value = t
  matchScoreOpen.value = true
}
function matchScoreType(score: number): 'completed' | 'warning' | 'critical' {
  if (score >= 70) return 'completed'
  if (score >= 40) return 'warning'
  return 'critical'
}
function matchScoreFor(t: TalentEmployee) { return computeMatchScore(t, activeCriteria.value) }

// ─── Pagination ───────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => sortedRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sortedRows.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
watch([branch, organization, advFilters, search, activeTab, poolCriteria], () => { currentPage.value = 1 }, { deep: true })

// ─── Navigation ───────────────────────────────────────────────────────────────
function viewProfile(t: TalentEmployee) {
  navigateTo(`/talents/talent-directory/${t.id}`)
}

// ─── Styles ────────────────────────────────────────────────────────────────────
// Cell backgrounds come from Pixel's table recipe (per guideline): th =
// background.surface (light gray header), td = background.neutral (white) +
// background.neutral.hovered on hover. Both are opaque, so the sticky columns
// still cover the content scrolling underneath.
const headCell = css({ whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2' })
// Header label + sort menu inline (mirrors goal-cycles reference).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const bodyCell = css({
  paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', verticalAlign: 'middle',
})
const valueText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })

// Bulk-action bar (docs/patterns/checkbox.md §3) — the inset comes from the
// host `th` (paddingBlock only, horizontal stays the recipe default); the bar
// itself contributes no padding of its own, keeping its checkbox aligned with
// the row checkboxes below it.
const bulkBarCell = css({ paddingBlock: '1' })
const bulkBar = css({ height: '40px', paddingInline: '0' })

// Sticky column dividers: the border only shows on the OUTER edge — the side
// facing the scrolling content — and only while that column is actually pinned
// over scrolled content. MpTableContainer[has-shadow] flags this on the wrapper:
//   data-table-has-left-shadow  → content hidden to the left  → left column pinned
//   data-table-has-right-shadow → content hidden to the right → right column pinned
// So the name (left) column shows its right divider on has-left-shadow, and the
// action (right) column shows its left divider on has-right-shadow.

// Sticky first column (Employee name) — pinned left on horizontal scroll.
const stickyNameHead = css({
  whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2',
  position: 'sticky', left: '0', zIndex: '3',
  '[data-table-has-left-shadow] &': { borderRight: '1px solid', borderRightColor: 'border.default' },
})
const stickyNameCell = css({
  paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', verticalAlign: 'middle',
  position: 'sticky', left: '0', zIndex: '1', minWidth: '260px',
  '[data-table-has-left-shadow] &': { borderRight: '1px solid', borderRightColor: 'border.default' },
})
// Sticky last column (action) — pinned right so the button stays reachable.
const stickyActionHead = css({
  whiteSpace: 'nowrap', width: '1%', textAlign: 'right', paddingTop: '2', paddingBottom: '2',
  position: 'sticky', right: '0', zIndex: '3',
  '[data-table-has-right-shadow] &': { borderLeft: '1px solid', borderLeftColor: 'border.default' },
})
const stickyActionCell = css({
  paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', width: '1%', textAlign: 'right',
  position: 'sticky', right: '0', zIndex: '1',
  '[data-table-has-right-shadow] &': { borderLeft: '1px solid', borderLeftColor: 'border.default' },
})

const nameWrap = css({ display: 'flex', flexDirection: 'column', lineHeight: '1.2' })
const nameText = css({ color: 'text.default', fontWeight: 'semiBold' })
const codeText = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const joinWrap = css({ display: 'flex', flexDirection: 'column', lineHeight: '1.2' })
const numText = css({ color: 'text.default', fontVariantNumeric: 'tabular-nums' })

// Status pill — green dot for active, gray for resigned (full colour control).
const statusPill = css({ display: 'inline-flex', alignItems: 'center', gap: '2' })
const dotBase = css({ width: '8px', height: '8px', borderRadius: 'full', flexShrink: '0' })
const dotActive = css({ background: 'background.success.bold' })
const dotResigned = css({ background: 'background.neutral.bold' })

// Match score pill (pool tabs) — clickable, opens PxMatchScoreDrawer.
const matchScoreBadge = css({ cursor: 'pointer' })

// Filter-bar select trigger — matches the competencies list look.
const filterSelectWidth = '200px'

// Pool tabs — canonical Type A tab bar (docs/patterns/tabs.md).
const tabBar = css({ display: 'flex', alignItems: 'center', gap: '5', width: '100%' })
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
const addPoolTab = css({
  ...tabItemBase,
  color: 'text.secondary',
  _hover: { color: 'text.default' },
})

// "Showing …" summary strip above a pool's filter bar (docs/patterns/banner.md
// — summary strip). Neutral, not an MpBanner status variant: it reports what the
// pool selects, and its pencil reopens the drawer in edit mode.
const summaryBar = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3',
  padding: '3', borderRadius: 'lg', border: '1px solid',
  borderColor: 'border.default', background: 'background.neutral.subtle',
})
const summaryLabel = css({ display: 'block', color: 'text.secondary' })
const summaryText = css({ display: 'block', color: 'text.default', marginTop: '1' })

// Empty-state styling (docs/empty-state.md) — shown for a pool tab until
// talent criteria are applied (isPoolEmpty is defined above, near poolCriteria).
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <Teleport v-if="TALENT_POOLS_ENABLED" to="#page-tabs" defer>
    <div :class="tabBar">
      <button type="button" :class="activeTab === 'all' ? tabItemActive : tabItem" @click="activeTab = 'all'">
        All talents
      </button>
      <button
        v-for="p in pools"
        :key="p.id"
        type="button"
        :class="activeTab === p.id ? tabItemActive : tabItem"
        @click="activeTab = p.id"
      >
        {{ p.label }}
      </button>
      <button type="button" :class="addPoolTab" @click="openAddPool">
        <MpIcon name="add" size="16px" />
        Add pool
      </button>
    </div>
  </Teleport>

  <!-- ═════ Empty state (freshly created pool) ═════ -->
  <MpFlex
    v-if="isPoolEmpty"
    direction="column"
    align="center"
    justify="center"
    gap="4"
    :class="emptyStateWrap"
  >
    <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
    <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
      <MpText :class="emptyTitle">Talents will appear here</MpText>
      <MpText size="label" :class="captionText">Add talent criteria to start this pool</MpText>
    </MpFlex>
    <MpButton variant="secondary" @click="openEditPool">Add talent criteria</MpButton>
  </MpFlex>

  <MpFlex v-else direction="column" gap="5">
    <!-- ═════ "Showing …" criteria summary (pool tabs only) ═════ -->
    <div v-if="activeTab !== 'all'" :class="summaryBar">
      <div>
        <MpText size="label" :class="summaryLabel">Showing</MpText>
        <MpText size="label" weight="semiBold" :class="summaryText">{{ poolSummary }}</MpText>
      </div>
      <MpTooltip label="Edit criteria" use-portal>
        <MpButton variant="ghost" left-icon="edit" aria-label="Edit criteria" @click="openEditPool" />
      </MpTooltip>
    </div>

    <!-- ═════ Filter bar ═════ -->
    <MpFlex align="center" justify="space-between" gap="4" wrap="wrap">
      <MpFlex align="center" gap="3" wrap="wrap">
        <PxSelectPopover
          v-model="branch"
          :options="branchOptions"
          placeholder="All branches"
          :width="filterSelectWidth"
          is-clearable
          searchable
          search-placeholder="Search branch..."
        />
        <PxSelectPopover
          v-model="organization"
          :options="orgOptions"
          placeholder="All organizations"
          :width="filterSelectWidth"
          is-clearable
          searchable
          search-placeholder="Search organization..."
        />
        <MpButton variant="secondary" left-icon="filter" @click="filtersOpen = true">
          All filters<template v-if="advancedCount"> ({{ advancedCount }})</template>
        </MpButton>
        <MpButton
          v-if="advancedCount || branch || organization || search"
          variant="ghost"
          @click="clearAll"
        >
          Clear
        </MpButton>
      </MpFlex>

      <MpFlex align="center" gap="3">
        <!-- Column settings -->
        <MpPopover use-portal placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" />
          </MpPopoverTrigger>
          <MpPopoverContent>
            <div :class="css({ padding: '3', minWidth: '220px' })">
              <MpText size="label" weight="semiBold" :class="css({ color: 'text.default', marginBottom: '2', display: 'block' })">
                Columns
              </MpText>
              <MpFlex direction="column" gap="2">
                <!-- Employee name is always shown — locked on, can't be hidden. -->
                <MpCheckbox is-checked is-disabled>Employee name</MpCheckbox>
                <MpCheckbox
                  v-for="c in COLS"
                  :key="c.key"
                  v-model:is-checked="visible[c.key]"
                >
                  {{ c.label }}
                </MpCheckbox>
              </MpFlex>
            </div>
          </MpPopoverContent>
        </MpPopover>

        <MpFlex :class="css({ width: '260px' })">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search name or ID..." />
          </MpInputGroup>
        </MpFlex>
      </MpFlex>
    </MpFlex>

    <!-- ═════ Table + pagination ═════ -->
    <MpFlex direction="column">
      <MpTableContainer has-shadow>
        <MpTable is-hoverable>
          <MpTableHead>
            <!-- Pool tab, 1+ selected → the whole header row becomes the bulk
                 bar (docs/patterns/checkbox.md §3 — single flat table, same
                 case as Company goals). -->
            <MpTableRow v-if="activeTab !== 'all' && selectedCount > 0">
              <MpTableCell as="th" :colspan="colCount" :class="bulkBarCell">
                <MpFlex align="center" justify="space-between" :class="bulkBar">
                  <MpFlex align="center" gap="4">
                    <MpFlex align="center" gap="2">
                      <MpCheckbox :is-checked="isAllSelected" :is-indeterminate="!isAllSelected" aria-label="Select all" @update:is-checked="toggleSelectAll" />
                      <MpText size="label" weight="semiBold" :class="valueText">{{ selectedCount }} talent{{ selectedCount === 1 ? '' : 's' }} selected</MpText>
                    </MpFlex>
                    <MpPopover is-close-on-select use-portal placement="bottom-start">
                      <MpPopoverTrigger>
                        <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
                      </MpPopoverTrigger>
                      <MpPopoverContent>
                        <MpPopoverList>
                          <MpPopoverListItem @click="bulkAction('export')">Export</MpPopoverListItem>
                          <MpPopoverListItem @click="bulkAction('create-idp')">Create IDP</MpPopoverListItem>
                          <MpPopoverListItem @click="bulkAction('create-assignment')">Create assignment</MpPopoverListItem>
                        </MpPopoverList>
                      </MpPopoverContent>
                    </MpPopover>
                  </MpFlex>
                  <MpText size="label" :class="captionText">Press esc to deselect</MpText>
                </MpFlex>
              </MpTableCell>
            </MpTableRow>
            <MpTableRow v-else>
              <MpTableCell as="th" class="tdir-sort-th" :class="stickyNameHead">
                <span :class="thInner">
                  <MpCheckbox v-if="activeTab !== 'all'" :is-checked="isAllSelected" aria-label="Select all" @update:is-checked="toggleSelectAll" />
                  <span>Employee name</span>
                  <PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" />
                </span>
              </MpTableCell>
              <MpTableCell v-if="activeTab !== 'all'" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner">
                  <span>Match score</span>
                  <MpTooltip label="Calculated by AI based on how well this talent fits the pool's criteria." use-portal>
                    <MpIcon name="airene-brand" size="sm" :class="css({ color: 'icon.brand', cursor: 'help' })" />
                  </MpTooltip>
                  <PxColumnSortMenu col-key="matchScore" :sort-type="columnSortTypes.matchScore" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" />
                </span>
              </MpTableCell>
              <MpTableCell v-if="visible.branch" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Branch</span><PxColumnSortMenu col-key="branch" :sort-type="columnSortTypes.branch" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.organization" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Organization</span><PxColumnSortMenu col-key="organization" :sort-type="columnSortTypes.organization" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.jobPosition" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Job position</span><PxColumnSortMenu col-key="jobPosition" :sort-type="columnSortTypes.jobPosition" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.jobLevel" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Job level</span><PxColumnSortMenu col-key="jobLevel" :sort-type="columnSortTypes.jobLevel" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.jobGrade" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Job grade</span><PxColumnSortMenu col-key="jobGrade" :sort-type="columnSortTypes.jobGrade" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.jobClass" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Job class</span><PxColumnSortMenu col-key="jobClass" :sort-type="columnSortTypes.jobClass" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.employmentType" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Employment type</span><PxColumnSortMenu col-key="employmentType" :sort-type="columnSortTypes.employmentType" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.joinDate" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Join date</span><PxColumnSortMenu col-key="joinDate" :sort-type="columnSortTypes.joinDate" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-if="visible.status" as="th" class="tdir-sort-th" :class="headCell">
                <span :class="thInner"><span>Employee status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" :class="stickyActionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="t in paged" :key="t.id">
              <!-- Employee name (sticky) -->
              <MpTableCell as="td" :class="stickyNameCell">
                <MpFlex align="center" gap="3">
                  <MpCheckbox v-if="activeTab !== 'all'" :is-checked="selectedIds.has(t.id)" :aria-label="`Select ${t.name}`" @update:is-checked="() => toggleSelect(t.id)" />
                  <PxAvatar :id="`talent-${t.id}`" :name="t.name" :src="t.photo" size="lg" variant-color="gray" />
                  <div :class="nameWrap">
                    <span :class="nameText">{{ t.name }}</span>
                    <span :class="codeText">{{ t.code }}</span>
                  </div>
                </MpFlex>
              </MpTableCell>

              <MpTableCell v-if="activeTab !== 'all'" as="td" :class="bodyCell">
                <MpBadge
                  for="tableStatus"
                  :type="matchScoreType(matchScoreFor(t).overall)"
                  :class="matchScoreBadge"
                  @click="openMatchScore(t)"
                >
                  {{ matchScoreFor(t).overall }}%
                </MpBadge>
              </MpTableCell>

              <MpTableCell v-if="visible.branch" as="td" :class="bodyCell">
                <MpText size="label" :class="valueText">{{ t.branch }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="visible.organization" as="td" :class="bodyCell">
                <MpText size="label" :class="valueText">{{ t.organization }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="visible.jobPosition" as="td" :class="bodyCell">
                <MpText size="label" :class="valueText">{{ t.jobPosition }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="visible.jobLevel" as="td" :class="bodyCell">
                <MpText size="label" :class="valueText">{{ t.jobLevel }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="visible.jobGrade" as="td" :class="bodyCell">
                <MpText size="label" :class="numText">{{ t.jobGrade }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="visible.jobClass" as="td" :class="bodyCell">
                <MpText size="label" :class="valueText">{{ t.jobClass }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="visible.employmentType" as="td" :class="bodyCell">
                <MpText size="label" :class="valueText">{{ t.employmentType }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="visible.joinDate" as="td" :class="bodyCell">
                <div :class="joinWrap">
                  <span :class="valueText">{{ formatJoinDate(t.joinDate) }}</span>
                  <span :class="codeText">{{ aging(t.joinDate) }}</span>
                </div>
              </MpTableCell>
              <MpTableCell v-if="visible.status" as="td" :class="bodyCell">
                <span :class="statusPill">
                  <span :class="[dotBase, t.status === 'active' ? dotActive : dotResigned]" />
                  <MpText size="label" :class="valueText">{{ t.status === 'active' ? 'Active' : 'Resigned' }}</MpText>
                </span>
              </MpTableCell>

              <!-- Action (sticky) -->
              <MpTableCell as="td" :class="stickyActionCell">
                <MpButton variant="secondary" @click="viewProfile(t)">View talent profile</MpButton>
              </MpTableCell>
            </MpTableRow>

            <MpTableRow v-if="paged.length === 0">
              <MpTableCell as="td" :colspan="colCount" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                <MpText size="label" :class="captionText">No employees match your filters.</MpText>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer -->
      <div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
        <MpFlex align="center" gap="3">
          <MpText size="label" :class="captionText">Rows per page</MpText>
          <MpPopover is-close-on-select use-portal placement="bottom-start">
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
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
  </MpFlex>

  <!-- ═════ All filters drawer ═════ -->
  <PxAllFiltersDrawer
    :is-open="filtersOpen"
    :scopes="talentScopes"
    :applied-filters="advFilters"
    :applied-scopes="advScopes"
    @close="filtersOpen = false"
    @apply="onApplyAdv"
  />

  <!-- ═════ Talent criteria drawer (pool tabs) ═════ -->
  <PxAddPoolDrawer
    v-if="TALENT_POOLS_ENABLED"
    :is-open="poolDrawerOpen"
    :mode="poolDrawerMode"
    :applied-name="poolDrawerName"
    :applied-job-position="poolDrawerScope.jobPosition"
    :applied-branch="poolDrawerScope.branch"
    :applied-criteria="poolDrawerCriteria"
    @close="poolDrawerOpen = false"
    @save="onSavePool"
  />

  <!-- ═════ Match score details drawer (pool tabs) ═════ -->
  <PxMatchScoreDrawer
    v-if="TALENT_POOLS_ENABLED"
    :is-open="matchScoreOpen"
    :talent="matchScoreTalent"
    :criteria="activeCriteria"
    @close="matchScoreOpen = false"
  />
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered `visibility: hidden` on specificity (a Panda css()
   @layer utility rule would lose to that unlayered base). */
.tdir-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
