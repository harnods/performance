<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Linked goals table (goal category)
  Token mode: Pixel 2.4

  Lists every goal whose `category` matches this category's name (real data from
  the goals mini-DB via useGoalCategoriesStore.linkedGoalsOf), with a goal-type
  filter + name search. Clicking a goal name opens its detail.

  Visual: the "Custom table" style from goal cycle details (outer border,
  per-column dividers, valign top, progress bar, status pill) with an
  accordion group header per section — see docs/patterns/table.md. Read-only,
  so no bulk-select checkbox and no column-settings toggle.

  Grouping depends on the goal-type filter (mirrors goal cycle details):
    • All goal type   → accordion per GOAL OWNER (avatar header, like the
                        "All goals" table). Inside: Goal type + Sub-category
                        columns are rowspan-merged.
    • Organization /  → accordion per ORGANIZATION (owner.department). Inside:
      Team /            Goal owner + Sub-category columns are rowspan-merged.
      Individual
    • Company goal    → a single "Company-wide goals" section, Goal owner +
                        Sub-category rowspan-merged.
  Category is omitted on purpose — every row here shares this page's category.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpAvatar,
  MpSelect,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
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
  css,
} from '@mekari/pixel3'
import { ownerOf } from '~/utils/goalRows'

const props = defineProps<{ categoryName: string }>()

const router = useRouter()
const { linkedGoalsOf } = useGoalCategoriesStore()
const { cycles } = useGoalCyclesStore()

// Primary scope — one goal cycle at a time so goals from different cycles are
// never mixed. Options are the cycles that actually have a linked goal for this
// category (latest-first). Defaults to the Active cycle; the user can switch.
const cycleOptions = computed(() => {
  const ids = new Set(linkedGoalsOf(props.categoryName).map(g => g.cycleId))
  return cycles.value.filter(c => ids.has(c.id))
})
const defaultCycleId = computed(() => {
  const opts = cycleOptions.value
  return (opts.find(c => c.status === 'Active') ?? opts[0])?.id ?? ''
})
const selectedCycleId = ref('')
watchEffect(() => {
  // Keep the selection valid (initialise to, or fall back to, the default).
  if (!selectedCycleId.value || !cycleOptions.value.some(c => c.id === selectedCycleId.value)) {
    selectedCycleId.value = defaultCycleId.value
  }
})

const GOAL_TYPE_LABEL: Record<string, string> = {
  company: 'Company goal',
  organization: 'Organization goal',
  team: 'Team goal',
  individual: 'Individual goal',
}
const TYPE_ORDER: Record<string, number> = { company: 0, organization: 1, team: 2, individual: 3 }
const statusLabel: Record<string, string> = { green: 'On track', orange: 'Off track', gray: 'Not updated' }

const typeFilter = ref('')
const search = ref('')

const typeOptions = [
  { value: '', label: 'All goal type' },
  { value: 'company', label: 'Company goal' },
  { value: 'organization', label: 'Organization goal' },
  { value: 'team', label: 'Team goal' },
  { value: 'individual', label: 'Individual goal' },
]

const baseRows = computed(() => linkedGoalsOf(props.categoryName)
  .filter(g => g.cycleId === selectedCycleId.value)
  .filter(g => !typeFilter.value || g.level === typeFilter.value)
  .filter(g => !search.value || g.title.toLowerCase().includes(search.value.toLowerCase()))
  .map(g => ({
    id: g.id,
    cycleId: g.cycleId,
    code: g.code,
    title: g.title,
    level: g.level,
    subCategory: g.subCategory,
    weight: g.weight,
    status: g.status,
    unit: g.unit,
    value: g.value,
    pill: g.pill,
    min: g.min,
    max: g.max,
    owner: ownerOf(g.ownerId),
  })))

const hasFilter = computed(() => !!typeFilter.value || !!search.value)
const hasRows = computed(() => baseRows.value.length > 0)

// Grouping mode from the filter. 'owner' groups accordions by goal owner (All
// view); 'org' by organization (department) for org/team/individual; 'flat' is
// one section for company. When NOT grouping by owner, the secondary merged
// column ("A") is the owner; when grouping by owner, "A" is the goal type.
type Row = (typeof baseRows.value)[number]
const groupMode = computed<'owner' | 'org' | 'flat'>(() =>
  typeFilter.value === '' ? 'owner' : typeFilter.value === 'company' ? 'flat' : 'org')
const aIsOwner = computed(() => groupMode.value !== 'owner')

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

// ─── Build accordion groups, each with rowspan metadata for the two merged
//     columns (A ⊃ Sub-category). Rows are ordered A → sub-category → title so
//     the merges are contiguous & nested. ────────────────────────────────────
const aKeyOf = (r: Row) => (aIsOwner.value ? r.owner.id : String(r.level))
const aOrderOf = (r: Row) => (aIsOwner.value ? r.owner.name : String(TYPE_ORDER[r.level] ?? 9))
const subKeyOf = (r: Row) => `${aKeyOf(r)} | ${r.subCategory}`

function runFrom(list: Row[], i: number, key: (r: Row) => string): number {
  let n = 1
  for (let j = i + 1; j < list.length && key(list[j]) === key(list[i]); j++) n++
  return n
}

const groups = computed(() => {
  const buckets = new Map<string, Row[]>()
  for (const r of baseRows.value) {
    const gk = groupMode.value === 'owner' ? r.owner.id
      : groupMode.value === 'org' ? r.owner.department
        : 'company'
    if (!buckets.has(gk)) buckets.set(gk, [])
    buckets.get(gk)!.push(r)
  }
  const entries = [...buckets.entries()].sort((a, b) => {
    if (groupMode.value === 'owner') return a[1][0].owner.name.localeCompare(b[1][0].owner.name)
    if (groupMode.value === 'org') return a[0].localeCompare(b[0])
    return 0
  })
  return entries.map(([key, grpRows]) => {
    const sorted = [...grpRows].sort((x, y) =>
      String(aOrderOf(x)).localeCompare(String(aOrderOf(y)), undefined, { numeric: true, sensitivity: 'base' })
      || x.subCategory.localeCompare(y.subCategory)
      || x.title.localeCompare(y.title))
    const rows = sorted.map((r, i) => ({
      ...r,
      showA: i === 0 || aKeyOf(sorted[i - 1]) !== aKeyOf(r),
      aRowspan: runFrom(sorted, i, aKeyOf),
      showSub: i === 0 || subKeyOf(sorted[i - 1]) !== subKeyOf(r),
      subRowspan: runFrom(sorted, i, subKeyOf),
    }))
    return {
      key,
      owner: grpRows[0].owner,
      label: groupMode.value === 'org' ? key : 'Company-wide goals',
      total: grpRows.length,
      rows,
    }
  })
})

// Accordion open state — default open; toggling flips it.
const openGroups = reactive<Record<string, boolean>>({})
function isOpen(key: string) { return openGroups[key] !== false }
function toggle(key: string) { openGroups[key] = !isOpen(key) }

function viewGoal(cycleId: string, id: string) {
  router.push({ path: `/goals/goal-cycles/${cycleId}/goals/${id}` })
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', marginBottom: '4', flexWrap: 'wrap' })
const filterLeft = css({ display: 'flex', alignItems: 'center', gap: '3', flexWrap: 'wrap' })
const cycleSelectWidth = css({ width: '200px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
const selectWidth = css({ width: '180px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
const searchWidth = css({ width: '260px' })

// Custom table (mirrors goal cycle details).
const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1000px' })
const accordionHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', minHeight: '44px', paddingInline: '3', paddingBlock: '2', background: 'gray.50', cursor: 'pointer', border: 'none', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default', width: '100%', textAlign: 'left' })
const accordionLeft = css({ display: 'flex', alignItems: 'center', gap: '2', minWidth: '0' })
const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })

const colGoal = css({ minWidth: '300px' })
const colGoalType = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
const colOwner = css({ width: '200px' })
const colProgress = css({ width: '200px' })
const colStatus = css({ width: '136px' })

const goalNameLink = css({ display: 'inline', color: 'text.link', cursor: 'pointer', textAlign: 'left', minWidth: '0', whiteSpace: 'normal', overflowWrap: 'break-word', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const cellContent = css({ minWidth: '0', width: '100%', whiteSpace: 'normal', overflowWrap: 'break-word' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

const progressCellWidth = css({ width: '100%' })
const progressTrack = css({ width: '100%', height: '8px', borderRadius: 'full', background: 'border.default', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })
const fillGray = css({ background: 'gray.400' })
const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
function statusClass(s: string) {
  return s === 'green' ? statusPillGreen : s === 'orange' ? statusPillOrange : statusPillGray
}

const emptyWrap = css({ paddingBlock: '10', textAlign: 'center' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <div>
    <div :class="filterBar">
      <div :class="filterLeft">
        <!-- Primary filter: goal cycle (default = Active). -->
        <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="cycleSelectWidth">
              <MpSelect v-model="selectedCycleId" tabindex="-1" aria-hidden="true">
                <option v-for="c in cycleOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem v-for="c in cycleOptions" :key="c.id" :is-active="c.id === selectedCycleId" @click="selectedCycleId = c.id">
                {{ c.name }}<template v-if="c.status === 'Active'"> · Active</template>
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>

        <!-- Secondary filter: goal type. -->
        <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="selectWidth">
              <MpSelect v-model="typeFilter" tabindex="-1" aria-hidden="true">
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem v-for="opt in typeOptions" :key="opt.value" :is-active="opt.value === typeFilter" @click="typeFilter = opt.value">
                {{ opt.label }}
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
      </div>

      <MpFlex :class="searchWidth">
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search goal name..." />
        </MpInputGroup>
      </MpFlex>
    </div>

    <div v-if="hasRows" :class="tableOuterBorder">
      <div v-for="g in groups" :key="g.key">
        <!-- Accordion group header: owner (avatar) for All view, else the
             organization / company-wide label. -->
        <button type="button" :class="accordionHeader" @click="toggle(g.key)">
          <span :class="accordionLeft">
            <MpIcon :name="isOpen(g.key) ? 'caret-down' : 'caret-right'" size="sm" />
            <template v-if="groupMode === 'owner'">
              <MpAvatar :name="g.owner.name" :src="g.owner.photo" size="lg" variant-color="gray" :class="css({ flexShrink: '0' })" />
              <MpFlex direction="column" gap="0" align="start" :class="css({ minWidth: '0' })">
                <MpText size="label" weight="semiBold" :class="valueText">{{ g.owner.name }}</MpText>
                <MpText size="label-small" :class="captionText">{{ g.owner.id }} · {{ g.owner.title }} · {{ g.owner.department }}</MpText>
              </MpFlex>
            </template>
            <MpText v-else size="label" weight="semiBold" :class="valueText">{{ g.label }}</MpText>
          </span>
          <MpText size="label-small" :class="captionText">{{ g.total }} {{ g.total === 1 ? 'goal' : 'goals' }}</MpText>
        </button>

        <template v-if="isOpen(g.key)">
          <MpTableContainer>
            <MpTable :is-hoverable="false" :class="fixedTable">
              <colgroup>
                <col :class="aIsOwner ? colOwner : colGoalType">
                <col :class="colSubCategory">
                <col :class="colGoal">
                <col :class="colProgress">
                <col :class="colStatus">
              </colgroup>
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" :class="[colDivider, aIsOwner ? colOwner : colGoalType]"><span :class="thInner">{{ aIsOwner ? 'Goal owner' : 'Goal type' }}</span></MpTableCell>
                  <MpTableCell as="th" :class="[colDivider, colSubCategory]"><span :class="thInner">Sub-category</span></MpTableCell>
                  <MpTableCell as="th" :class="colDivider"><span :class="thInner">Goal</span></MpTableCell>
                  <MpTableCell as="th" :class="[colDivider, colProgress]"><span :class="thInner">Progress</span></MpTableCell>
                  <MpTableCell as="th" :class="[colDivider, colStatus]"><span :class="thInner">Status</span></MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="row in g.rows" :key="row.id">
                  <!-- A column (merged): Goal owner (org/company) or Goal type (All) -->
                  <MpTableCell v-if="row.showA" as="td" :rowspan="row.aRowspan" :class="[tightCell, colDivider, aIsOwner ? colOwner : colGoalType]">
                    <MpFlex v-if="aIsOwner" direction="column" gap="0" :class="cellContent">
                      <MpText size="label" :class="[valueText, cellContent]">{{ row.owner.name }}</MpText>
                      <MpText size="label-small" :class="captionText">{{ row.owner.id }}</MpText>
                      <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.title }}</MpText>
                      <MpText size="label-small" :class="[captionText, cellContent]">{{ row.owner.department }}</MpText>
                    </MpFlex>
                    <MpText v-else size="label" :class="[valueText, cellContent]">{{ GOAL_TYPE_LABEL[row.level] }}</MpText>
                  </MpTableCell>
                  <!-- Sub-category (merged) -->
                  <MpTableCell v-if="row.showSub" as="td" :rowspan="row.subRowspan" :class="[tightCell, colDivider, colSubCategory]">
                    <MpText size="label" :class="[valueText, cellContent]">{{ row.subCategory }}</MpText>
                  </MpTableCell>
                  <!-- Goal (per row) -->
                  <MpTableCell as="td" :class="[tightCell, colDivider]">
                    <MpFlex direction="column" gap="0.5" :class="cellContent">
                      <span :class="goalCode">{{ row.code }}</span>
                      <span :class="goalNameLink" @click="viewGoal(row.cycleId, row.id)">{{ row.title }}</span>
                      <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                    </MpFlex>
                  </MpTableCell>
                  <!-- Progress (per row) -->
                  <MpTableCell as="td" :class="[tightCell, colDivider, colProgress]">
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
                  <!-- Status (per row) -->
                  <MpTableCell as="td" :class="[tightCell, colDivider, colStatus]">
                    <span :class="statusClass(row.status)">{{ statusLabel[row.status] }}</span>
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </template>
      </div>
    </div>

    <MpFlex v-else direction="column" align="center" gap="1" :class="emptyWrap">
      <MpText :class="emptyTitle">{{ hasFilter ? 'No goal found' : 'No linked goals yet' }}</MpText>
      <MpText size="label" :class="captionText">
        {{ hasFilter ? 'Check the keyword and try to search again.' : 'Linked goals will appear here.' }}
      </MpText>
    </MpFlex>
  </div>
</template>
