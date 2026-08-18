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
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalBody,
  MpModalFooter,
  MpModalCloseButton,
  MpFormControl,
  MpFormLabel,
  css,
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

definePageMeta({ title: 'Talent directory', layout: 'default' })

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
  return TALENTS.filter((t) => {
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
}
function sortValue(t: TalentEmployee, key: string): string {
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
// name + action + visible optional columns → colspan for the empty-state row.
const colCount = computed(() => 2 + COLS.filter(c => visible.value[c.key]).length)

// ─── Pagination ───────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => sortedRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sortedRows.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
watch([branch, organization, advFilters, search], () => { currentPage.value = 1 }, { deep: true })

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

// Filter-bar select trigger — matches the competencies list look.
const filterSelectWidth = '200px'
</script>

<template>
  <MpFlex direction="column" gap="5">
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
            <MpTableRow>
              <MpTableCell as="th" class="tdir-sort-th" :class="stickyNameHead">
                <span :class="thInner"><span>Employee name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
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
                  <PxAvatar :id="`talent-${t.id}`" :name="t.name" :src="t.photo" size="lg" variant-color="gray" />
                  <div :class="nameWrap">
                    <span :class="nameText">{{ t.name }}</span>
                    <span :class="codeText">{{ t.code }}</span>
                  </div>
                </MpFlex>
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
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered `visibility: hidden` on specificity (a Panda css()
   @layer utility rule would lose to that unlayered base). */
.tdir-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
