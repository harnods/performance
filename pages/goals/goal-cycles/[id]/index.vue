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
  css,
} from '@mekari/pixel3'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
})

const route = useRoute()
const router = useRouter()

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

type Tab = 'all' | 'awaiting' | 'info'
const activeTab = ref<Tab>('all')

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

const { goals, myGoals, myDirectReportsGoals } = useGoalsStore()

const STATUS_FILTER_TO_GOAL_STATUS: Record<string, GoalStatus> = { ontrack: 'green', atrisk: 'orange' }

const sourceGoals = computed(() => {
  const base = goalsView.value === 'my'
    ? myGoals.value
    : goalsView.value === 'direct-reports' ? myDirectReportsGoals.value : goals.value
  return base.filter(g => (!statusFilter.value || g.status === STATUS_FILTER_TO_GOAL_STATUS[statusFilter.value]) && matchesSearch(g, search.value))
})

const rows = computed(() => sortByCategory(sourceGoals.value)
  .map(g => ({ ...g, owner: ownerOf(g.ownerId), goalType: GOAL_TYPE_LABEL[g.level], alignedGoals: alignedGoalsOf(g, goals.value) }))
  .sort((a, b) => a.owner.name.localeCompare(b.owner.name)))

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
const visibleOwnerIds = computed(() => new Set(distinctOwnerIds.value.slice(0, visibleOwnerCount.value)))
const slicedRows = computed(() => rows.value.filter(row => visibleOwnerIds.value.has(row.ownerId)))
// Owner rowspan is computed on the sliced+expanded (currently visible) rows,
// not the full list — otherwise a rowspan computed against the full list
// would overshoot what's actually rendered. An inserted aligned row always
// breaks an owner merge in two (it gets its own cell, showing its own real
// owner), which is correct since it isn't necessarily that owner's goal.
const visibleRows = computed(() => {
  const sliced = slicedRows.value
  const flat: Array<{ kind: 'main' | 'aligned', id: string, ownerId: string, owner: ReturnType<typeof ownerOf>, category: string, subCategory: string, categoryWeight: number, code: string, title: string, weight: number, goalType: string, alignedGoals: ReturnType<typeof alignedGoalsOf>, status: (typeof sliced)[number]['status'], unit?: (typeof sliced)[number]['unit'], value?: number, pill?: number, min?: number, max?: number }> = []
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
    if (row.kind === 'aligned') return { ...row, showOwner: true, ownerRowspan: 1 }
    const prev = flat[i - 1]
    const showOwner = i === 0 || prev.kind !== 'main' || prev.ownerId !== row.ownerId
    return {
      ...row,
      showOwner,
      ownerRowspan: showOwner ? countWhile(flat, i, r => r.kind === 'main' && r.ownerId === row.ownerId) : 0,
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
const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
// Sticky first/last column (Goal owner / Actions). `is-fixed` alone only
// tags the cell (data-table-cell-fixed) — the actual position:sticky/z-index/
// background need setting explicitly, otherwise the column doesn't visually
// separate from scrolling siblings until motion happens to reveal it. The
// boundary itself is a plain 1px border like every other column divider —
// on a wide screen the table isn't actually scrolled, so it shouldn't look
// any heavier than colDivider just because the column happens to be sticky.
const fixedLeftCol = css({ position: 'sticky', left: '0', zIndex: '1', boxShadow: 'inset -1px 0px var(--mp-colors-border-default)' })
const fixedRightCol = css({ position: 'sticky', right: '0', zIndex: '1', boxShadow: 'inset 1px 0px var(--mp-colors-border-default)' })
const fixedBodyBg = css({ background: 'white' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

// Fixed table layout so every column keeps a stable width regardless of which
// optional columns are toggled on/off via Column settings. Goal is
// intentionally the one column with no fixed width — it absorbs all
// remaining space, pushing the 52px action column flush against the right
// edge instead of it stretching along with everything else.
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1400px' })
const colOwner = css({ width: '184px' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
const colGoalType = css({ width: '160px' })
const colProgress = css({ width: '224px' })
const colStatus = css({ width: '136px' })
// Action column is a hard 52px: 36px icon button + 8px padding each side.
const actionHead = css({ width: '52px', paddingLeft: '2', paddingRight: '2', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', paddingLeft: '2', paddingRight: '2', width: '52px', whiteSpace: 'nowrap', verticalAlign: 'top' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

const headerLabel = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
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
const fillOrange = css({ background: 'orange.400' })

const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
const statusLabel: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not started' }

const awaitingBadge = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '20px', height: '20px', paddingInline: '1.5', borderRadius: 'full',
  background: 'orange.400', color: 'white', fontSize: '14px', lineHeight: '20px',
})
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
      <button type="button" :class="activeTab === 'awaiting' ? tabItemActive : tabItem" @click="activeTab = 'awaiting'">
        Awaiting approval
        <span :class="awaitingBadge">2</span>
      </button>
      <button type="button" :class="activeTab === 'info' ? tabItemActive : tabItem" @click="activeTab = 'info'">
        Goal cycle info
      </button>
    </div>
  </Teleport>

  <MpFlex v-if="activeTab !== 'info'" direction="column" gap="6">
    <!-- Filter bar -->
    <MpFlex align="center" justify="space-between" gap="4">
      <MpFlex align="center" gap="4">
        <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="statusFieldClass">
              <MpSelect v-model="statusFilter" placeholder="Status" is-clearable tabindex="-1" aria-hidden="true">
                <option value="ontrack">On track</option>
                <option value="atrisk">At risk</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem :is-active="statusFilter === 'ontrack'" @click="statusFilter = 'ontrack'">On track</MpPopoverListItem>
              <MpPopoverListItem :is-active="statusFilter === 'atrisk'" @click="statusFilter = 'atrisk'">At risk</MpPopoverListItem>
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
    <div :class="tableOuterBorder">
      <MpTableContainer>
        <MpTable :is-hoverable="false" :class="fixedTable">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" is-fixed :class="[fixedLeftCol, colOwner]"><span :class="headerLabel">Goal owner <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.category" as="th" :class="[colDivider, colCategory]"><span :class="headerLabel">Category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.subCategory" as="th" :class="[colDivider, colSubCategory]"><span :class="headerLabel">Sub-category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.goal" as="th" :class="colDivider"><span :class="headerLabel">Goal <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.goalType" as="th" :class="[colDivider, colGoalType]"><span :class="headerLabel">Goal type <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.progress" as="th" :class="[colDivider, colProgress]"><span :class="headerLabel">Progress <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.status" as="th" :class="[colDivider, colStatus]"><span :class="headerLabel">Status <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
            <MpTableCell as="th" is-fixed :class="[actionHead, fixedRightCol]" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="row in visibleRows" :key="row.id">
            <!-- Goal owner: rowspan-merged across this owner's consecutive
                 goals (this table spans many owners at once), sticky-left so
                 it stays visible while scrolling. Aligned/child rows leave
                 this blank — their owner already shows inline in the Goal
                 cell ("Owner: X"), so repeating it here would be redundant. -->
            <MpTableCell v-if="row.showOwner" as="td" :rowspan="row.ownerRowspan" is-fixed :class="[ownerCell, fixedLeftCol, fixedBodyBg, colOwner]">
              <MpFlex v-if="row.kind === 'main'" direction="column" gap="0" :class="cellContent">
                <MpText size="label" :class="[valueText, cellContent]">{{ row.owner.name }}</MpText>
                <MpText size="label-small" :class="captionText">{{ row.owner.id }}</MpText>
                <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.title }}</MpText>
                <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.department }}</MpText>
              </MpFlex>
            </MpTableCell>

            <!-- Category -->
            <MpTableCell v-if="visibleColumns.category" as="td" :class="[tightCell, colDivider, colCategory]">
              <MpFlex direction="column" gap="0" :class="cellContent">
                <MpText size="label" :class="[valueText, cellContent]">{{ row.category }}</MpText>
                <MpText v-if="row.kind === 'main'" size="label-small" :class="captionText">Weight: {{ row.categoryWeight }}%</MpText>
              </MpFlex>
            </MpTableCell>

            <!-- Sub-category -->
            <MpTableCell v-if="visibleColumns.subCategory" as="td" :class="[tightCell, colDivider, colSubCategory]">
              <MpText size="label" :class="[valueText, cellContent]">{{ row.subCategory }}</MpText>
            </MpTableCell>

            <!-- Goal -->
            <MpTableCell v-if="visibleColumns.goal" as="td" :class="[tightCell, colDivider, row.kind === 'aligned' && alignedGoalCell]">
              <MpFlex direction="column" gap="0" :class="[cellContent, row.kind === 'aligned' && alignedGoalIndent]">
                <span v-if="visibleColumns.goalId" :class="goalCode">{{ row.code }}</span>
                <MpText size="label" :class="[valueText, cellContent]">{{ row.title }}</MpText>
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
            <MpTableCell as="td" is-fixed :class="[actionCell, fixedRightCol, fixedBodyBg]">
              <MpPopover is-close-on-select use-portal placement="bottom-end">
                <MpPopoverTrigger>
                  <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Row actions" />
                </MpPopoverTrigger>
                <MpPopoverContent>
                  <MpPopoverList>
                    <MpPopoverListItem>View details</MpPopoverListItem>
                    <MpPopoverListItem>Update goal progress</MpPopoverListItem>
                    <MpPopoverListItem>Edit</MpPopoverListItem>
                    <MpPopoverListItem>Delete</MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </MpTableCell>
          </MpTableRow>

          <!-- Skeleton rows: progressive load-more (appended after existing rows) -->
          <template v-if="loadingMore">
            <MpTableRow v-for="i in Math.min(PAGE_SIZE, distinctOwnerIds.length - visibleOwnerCount)" :key="`skel-${i}`">
              <MpTableCell as="td" :class="[ownerCell, fixedLeftCol, fixedBodyBg, colOwner]">
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
              <MpTableCell as="td" is-fixed :class="[actionCell, fixedRightCol, fixedBodyBg]"><MpSkeleton :class="css({ width: '32px', height: '32px', borderRadius: '6px' })" /></MpTableCell>
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
  </MpFlex>

  <!-- Goal cycle info -->
  <GoalCycleInfoPanel v-else />

  <!-- Select employee(s) for the new goal(s) -->
  <SelectEmployeesDrawer v-model:is-open="isSelectEmployeeOpen" @continue="continueToNewGoals" />
</template>
