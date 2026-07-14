<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle details / Individual goals
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4488:96367)
  Token mode: Pixel 2.4

  Department accordion (Accounting expanded; Front of house, HR, Kitchen,
  Management, Marketing, Sales collapsed), then Goal owner rowspan-grouped
  within — no Team layer here (owner IS the group, one level shallower than
  ../team-goals). Only Agung Setiawarman is expanded with row data (3 goals);
  the other 6 owners in Accounting are collapsed with no rows revealed, shown
  as a single "CODE | Title | Department" line exactly as in the frame.
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
// Goal owner + Goal + Actions are always rendered; the rest follow visibleColumns.
const totalCols = computed(() => 3 + Object.values(visibleColumns).filter(Boolean).length)

// ─── Live data — read from the goals mini-DB (useGoalsStore), grouped by
// department then by owner. Each owner's rows are their individual-level
// goals, sorted by category into rowspan groups. ──────────────────────────
type GoalStatus = 'green' | 'orange' | 'gray'

const DEPARTMENTS = ['Accounting', 'Front of House', 'HR', 'Kitchen', 'Management', 'Marketing', 'Sales'] as const

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const { individualGoals } = useGoalsStore()

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

const departments = computed(() => DEPARTMENTS
  .filter(deptName => departmentFilter.value.length === 0 || departmentFilter.value.includes(deptName))
  .map((deptName) => {
  const deptEmployees = EMPLOYEES.filter(e => e.department === deptName)
  const owners = deptEmployees.map((emp) => {
    const rows = withRowSpans(sortByCategory(individualGoals.value.filter(g =>
      g.ownerId === emp.id && (!statusFilter.value || g.status === STATUS_FILTER_TO_GOAL_STATUS[statusFilter.value]),
    ))).map(g => ({
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
      hasAligned: g.hasAligned,
      status: g.status,
      unit: g.unit,
      value: g.value,
      pill: g.pill,
      min: g.min,
      max: g.max,
    }))
    return { key: emp.id, name: emp.name, code: emp.code, title: emp.title, department: emp.department, rows }
  })
  return { key: slugify(deptName), name: deptName, owners }
}))

const expandedDepts = reactive<Record<string, boolean>>({ accounting: true })
const expandedOwners = reactive<Record<string, boolean>>({ agung: true })
function toggleDept(key: string) {
  expandedDepts[key] = !expandedDepts[key]
}
function toggleOwner(key: string) {
  expandedOwners[key] = !expandedOwners[key]
}
function collapseAll() {
  for (const d of departments.value) expandedDepts[d.key] = false
  for (const d of departments.value) for (const o of d.owners) expandedOwners[o.key] = false
}

// Selecting an Organization filter should surface its results immediately —
// expand every department the filter just matched, and every owner inside
// it, instead of leaving the user to manually open each level.
watch(departmentFilter, (selected) => {
  for (const dept of selected) {
    const deptKey = slugify(dept)
    expandedDepts[deptKey] = true
    const match = departments.value.find(d => d.key === deptKey)
    match?.owners.forEach(o => (expandedOwners[o.key] = true))
  }
})

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

// Owner header cell — expanded shows name + 3 stacked meta lines (matches the
// frame); collapsed shows name + one combined "CODE | Title | Dept" line.
const ownerHeaderCell = css({
  display: 'flex', alignItems: 'flex-start', gap: '2',
  paddingTop: '2', paddingBottom: '2', paddingLeft: '9', paddingRight: '4',
  cursor: 'pointer', border: 'none', background: 'white', width: '100%', textAlign: 'left',
})
const ownerLabel = css({ display: 'flex', flexDirection: 'column', minWidth: '0', overflowWrap: 'break-word' })

// Fixed table layout so toggling an owner's expand/collapse never shifts the
// other columns (see team-goals.vue for the same fix and why it's needed).
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
const colOwner = css({ width: '184px' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
// Goal is intentionally the one column with no fixed width — in a
// table-layout:fixed table it absorbs all remaining space, pushing the
// 52px action column flush against the right edge instead of it stretching.
const colProgress = css({ width: '200px' })
const colStatus = css({ width: '136px' })

const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const headerLabel = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const firstColCell = css({ paddingLeft: '9' })
// Action column is a hard 52px: 36px icon button + 8px padding each side.
const actionHead = css({ width: '52px', paddingLeft: '2', paddingRight: '2', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', paddingLeft: '2', paddingRight: '2', width: '52px', whiteSpace: 'nowrap', verticalAlign: 'top' })
// Sticky right column (Actions), matching ../index.vue and ../company-goals:
// `is-fixed` alone only tags the cell (data-table-cell-fixed) — position:
// sticky/z-index/background need setting explicitly. Border is a plain 1px
// like every other column divider, not a heavier "sticky" emphasis.
const fixedRightCol = css({ position: 'sticky', right: '0', zIndex: '1', boxShadow: 'inset 1px 0px var(--mp-colors-border-default)' })
const fixedBodyBg = css({ background: 'white' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

// Flex children default to min-width:auto, so long unbroken text refuses to
// shrink below its own intrinsic width and bleeds out of the fixed-width
// cell — min-width:0 lets the flex box shrink, break-word lets long text
// wrap. Applied to every cell's content wrapper, not just Goal.
const cellContent = css({ minWidth: '0', width: '100%', whiteSpace: 'normal', overflowWrap: 'break-word' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const alignedLink = css({
  display: 'inline-flex', alignItems: 'center', gap: '1', marginTop: '1',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.default', fontSize: '14px', lineHeight: '20px',
})

const progressCellWidth = css({ width: '100%' })
const progressTrack = css({ width: '100%', height: '8px', borderRadius: 'full', background: 'border.default', overflow: 'hidden' })
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

const emptyState = css({ padding: '6', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })
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
                :placeholder="departmentFilter.length ? `Organization (${departmentFilter.length})` : 'Organization'"
                tabindex="-1"
                aria-hidden="true"
              >
                <option v-for="dept in DEPARTMENTS" :key="dept" :value="dept">{{ dept }}</option>
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

        <MpButton variant="secondary">All filters</MpButton>
      </MpFlex>

      <MpFlex align="center" gap="2">
        <MpPopover use-portal placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" />
          </MpPopoverTrigger>
          <MpPopoverContent>
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

    <!-- Individual goals — Department accordion, each containing an Owner
         rowspan-group (no Team layer, unlike ../team-goals) -->
    <div :class="tableOuterBorder">
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
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" :class="[colDivider, firstColCell, colOwner]"><span :class="headerLabel">Goal owner <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.category" as="th" :class="[colDivider, colCategory]"><span :class="headerLabel">Category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.subCategory" as="th" :class="[colDivider, colSubCategory]"><span :class="headerLabel">Sub-category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
                  <MpTableCell as="th" :class="colDivider"><span :class="headerLabel">Goal <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.progress" as="th" :class="[colDivider, colProgress]"><span :class="headerLabel">Progress <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
                  <MpTableCell v-if="visibleColumns.status" as="th" :class="[colDivider, colStatus]"><span :class="headerLabel">Status <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
                  <MpTableCell as="th" is-fixed :class="[actionHead, fixedRightCol]" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <template v-for="owner in dept.owners" :key="owner.key">
                  <!-- Collapsed, or expanded with no rows yet: one full-width row -->
                  <MpTableRow v-if="!expandedOwners[owner.key] || owner.rows.length === 0">
                    <MpTableCell as="td" :colspan="totalCols" :class="tightCell">
                      <button type="button" :class="ownerHeaderCell" @click="toggleOwner(owner.key)">
                        <MpIcon :name="expandedOwners[owner.key] ? 'caret-down' : 'caret-right'" size="sm" />
                        <div :class="ownerLabel">
                          <MpText size="label" :class="valueText">{{ owner.name }}</MpText>
                          <MpText size="label-small" :class="captionText">{{ owner.code }} | {{ owner.title }} | {{ owner.department }}</MpText>
                        </div>
                      </button>
                      <MpText v-if="expandedOwners[owner.key]" size="label-small" :class="[captionText, css({ paddingLeft: '9', paddingTop: '2' })]">
                        No goals for this person yet.
                      </MpText>
                    </MpTableCell>
                  </MpTableRow>

                  <!-- Expanded owner with rows: owner cell rowspans across all of
                       them, exactly like Category does — NOT a separate row. -->
                  <template v-else>
                    <MpTableRow v-for="(row, ri) in owner.rows" :key="row.id">
                      <MpTableCell v-if="ri === 0" as="td" :rowspan="owner.rows.length" :class="[tightCell, colDivider, firstColCell, colOwner]">
                        <button type="button" :class="ownerHeaderCell" @click="toggleOwner(owner.key)">
                          <MpIcon name="caret-down" size="sm" />
                          <MpFlex direction="column" gap="0" :class="cellContent">
                            <MpText size="label" :class="[valueText, cellContent]">{{ owner.name }}</MpText>
                            <MpText size="label-small" :class="captionText">{{ owner.code }}</MpText>
                            <MpText size="label-small" :class="[captionText, cellContent]">{{ owner.title }}</MpText>
                            <MpText size="label-small" :class="[captionText, cellContent]">{{ owner.department }}</MpText>
                          </MpFlex>
                        </button>
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

                      <!-- Goal -->
                      <MpTableCell as="td" :class="[tightCell, colDivider]">
                        <MpFlex direction="column" gap="0" :class="cellContent">
                          <span :class="goalCode">{{ row.code }}</span>
                          <MpText size="label" :class="[valueText, cellContent]">{{ row.title }}</MpText>
                          <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                          <button v-if="row.hasAligned" type="button" :class="alignedLink">
                            <MpIcon name="caret-right" size="sm" />
                            View aligned goals
                          </button>
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
                  </template>
                </template>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </template>
      </div>
    </div>
  </MpFlex>

  <!-- Goal cycle info -->
  <GoalCycleInfoPanel v-else />

  <!-- Select employee(s) for the new goal(s) -->
  <SelectEmployeesDrawer v-model:is-open="isSelectEmployeeOpen" @continue="continueToNewGoals" />
</template>
