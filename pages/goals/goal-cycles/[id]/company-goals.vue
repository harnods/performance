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

const { companyGoals } = useGoalsStore()

const rows = computed(() => withRowSpans(sortByCategory(companyGoals.value, { groupByOwner: false }), { groupByOwner: false }).map(g => ({
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
  owner: ownerOf(g.ownerId),
  status: g.status,
  unit: g.unit,
  value: g.value,
  pill: g.pill,
  min: g.min,
  max: g.max,
})))

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
// edge instead of it stretching along with everything else.
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
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
    <div :class="tableOuterBorder">
      <div :class="accordionHeader">
        <MpText size="label" weight="semiBold" :class="valueText">Company-wide goals</MpText>
      </div>
      <MpTableContainer>
        <MpTable :is-hoverable="false" :class="fixedTable">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell v-if="visibleColumns.category" as="th" :class="[colDivider, colCategory]"><span :class="headerLabel">Category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.subCategory" as="th" :class="[colDivider, colSubCategory]"><span :class="headerLabel">Sub-category <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell as="th" :class="colDivider"><span :class="headerLabel">Goal <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.owner" as="th" :class="[colDivider, colOwner]"><span :class="headerLabel">Owner <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.progress" as="th" :class="[colDivider, colProgress]"><span :class="headerLabel">Progress <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell v-if="visibleColumns.status" as="th" :class="[colDivider, colStatus]"><span :class="headerLabel">Status <MpIcon name="sort-default" size="sm" /></span></MpTableCell>
              <MpTableCell as="th" is-fixed :class="[actionHead, fixedRightCol]" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="row in rows" :key="row.id">
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
                    <MpText size="label" :class="valueText">{{ row.value }}{{ row.unit === 'percent' ? '%' : '' }}</MpText>
                    <span :class="pillGreen">{{ row.pill }}%</span>
                  </MpFlex>
                  <div :class="progressTrack">
                    <div :class="[progressFill, row.status === 'green' ? fillGreen : fillOrange]" :style="{ width: `${row.pill}%` }" />
                  </div>
                  <MpFlex justify="space-between">
                    <span :class="css({ fontSize: '10px', lineHeight: '12px', color: 'text.secondary' })">{{ row.min }}{{ row.unit === 'percent' ? '%' : '' }}</span>
                    <span :class="css({ fontSize: '10px', lineHeight: '12px', color: 'text.default' })">{{ row.max }}{{ row.unit === 'percent' ? '%' : '' }}</span>
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
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
    </div>
  </MpFlex>

  <!-- Goal cycle info -->
  <GoalCycleInfoPanel v-else />

  <!-- Select employee(s) for the new goal(s) -->
  <SelectEmployeesDrawer v-model:is-open="isSelectEmployeeOpen" @continue="continueToNewGoals" />
</template>
