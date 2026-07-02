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
const jobLevel = ref('')
const jobGrade = ref('')
const jobClass = ref('')
const employmentType = ref('')
const status = ref('')
const search = ref('')

// Count of "advanced" filters active — badge on the All filters button.
const advancedCount = computed(() =>
  [jobLevel, jobGrade, jobClass, employmentType, status].filter(f => f.value).length,
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return TALENTS.filter((t) => {
    if (branch.value && t.branch !== branch.value) return false
    if (organization.value && t.organization !== organization.value) return false
    if (jobLevel.value && t.jobLevel !== jobLevel.value) return false
    if (jobGrade.value && t.jobGrade !== jobGrade.value) return false
    if (jobClass.value && t.jobClass !== jobClass.value) return false
    if (employmentType.value && t.employmentType !== employmentType.value) return false
    if (status.value && t.status !== status.value) return false
    if (q && !(t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.jobPosition.toLowerCase().includes(q))) return false
    return true
  })
})

// ─── All filters modal ───────────────────────────────────────────────────────
const filtersOpen = ref(false)
// Draft copies so Cancel discards and Apply commits.
const draft = ref({ jobLevel: '', jobGrade: '', jobClass: '', employmentType: '', status: '' })
function openFilters() {
  draft.value = {
    jobLevel: jobLevel.value,
    jobGrade: jobGrade.value,
    jobClass: jobClass.value,
    employmentType: employmentType.value,
    status: status.value,
  }
  filtersOpen.value = true
}
function applyFilters() {
  jobLevel.value = draft.value.jobLevel
  jobGrade.value = draft.value.jobGrade
  jobClass.value = draft.value.jobClass
  employmentType.value = draft.value.employmentType
  status.value = draft.value.status
  filtersOpen.value = false
}
function resetDraft() {
  draft.value = { jobLevel: '', jobGrade: '', jobClass: '', employmentType: '', status: '' }
}
function clearAll() {
  branch.value = ''
  organization.value = ''
  jobLevel.value = ''
  jobGrade.value = ''
  jobClass.value = ''
  employmentType.value = ''
  status.value = ''
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
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => filtered.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
watch([branch, organization, jobLevel, jobGrade, jobClass, employmentType, status, search], () => { currentPage.value = 1 })

// ─── Navigation ───────────────────────────────────────────────────────────────
function viewProfile(t: TalentEmployee) {
  navigateTo(`/talents/talent-directory/${t.id}`)
}

// ─── Styles ────────────────────────────────────────────────────────────────────
// Cell backgrounds come from Pixel's table recipe (per guideline): th =
// background.surface (light gray header), td = background.neutral (white) +
// background.neutral.hovered on hover. Both are opaque, so the sticky columns
// still cover the content scrolling underneath.
const headCell = css({ whiteSpace: 'nowrap' })
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
  whiteSpace: 'nowrap',
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
  whiteSpace: 'nowrap', width: '1%', textAlign: 'right',
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
        <MpButton variant="secondary" left-icon="filter" @click="openFilters">
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
              <MpTableCell as="th" :class="stickyNameHead">Employee name</MpTableCell>
              <MpTableCell v-if="visible.branch" as="th" :class="headCell">Branch</MpTableCell>
              <MpTableCell v-if="visible.organization" as="th" :class="headCell">Organization</MpTableCell>
              <MpTableCell v-if="visible.jobPosition" as="th" :class="headCell">Job position</MpTableCell>
              <MpTableCell v-if="visible.jobLevel" as="th" :class="headCell">Job level</MpTableCell>
              <MpTableCell v-if="visible.jobGrade" as="th" :class="headCell">Job grade</MpTableCell>
              <MpTableCell v-if="visible.jobClass" as="th" :class="headCell">Job class</MpTableCell>
              <MpTableCell v-if="visible.employmentType" as="th" :class="headCell">Employment type</MpTableCell>
              <MpTableCell v-if="visible.joinDate" as="th" :class="headCell">Join date</MpTableCell>
              <MpTableCell v-if="visible.status" as="th" :class="headCell">Employee status</MpTableCell>
              <MpTableCell as="th" :class="stickyActionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="t in paged" :key="t.id">
              <!-- Employee name (sticky) -->
              <MpTableCell as="td" :class="stickyNameCell">
                <MpFlex align="center" gap="3">
                  <MpAvatar :id="`talent-${t.id}`" :name="t.name" :src="t.photo" size="lg" variant-color="gray" />
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

  <!-- ═════ All filters modal ═════ -->
  <MpModal :is-open="filtersOpen" is-centered @close="filtersOpen = false">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>All filters</MpModalHeader>
      <MpModalCloseButton @click="filtersOpen = false" />
      <MpModalBody>
        <MpFlex direction="column" gap="4">
          <MpFormControl>
            <MpFormLabel>Job level</MpFormLabel>
            <PxSelectPopover v-model="draft.jobLevel" :options="levelOptions" placeholder="All job levels" is-clearable />
          </MpFormControl>
          <MpFormControl>
            <MpFormLabel>Job grade</MpFormLabel>
            <PxSelectPopover v-model="draft.jobGrade" :options="gradeOptions" placeholder="All job grades" is-clearable />
          </MpFormControl>
          <MpFormControl>
            <MpFormLabel>Job class</MpFormLabel>
            <PxSelectPopover v-model="draft.jobClass" :options="classOptions" placeholder="All job classes" is-clearable />
          </MpFormControl>
          <MpFormControl>
            <MpFormLabel>Employment type</MpFormLabel>
            <PxSelectPopover v-model="draft.employmentType" :options="typeOptions" placeholder="All employment types" is-clearable />
          </MpFormControl>
          <MpFormControl>
            <MpFormLabel>Employee status</MpFormLabel>
            <PxSelectPopover v-model="draft.status" :options="statusOptions" placeholder="All statuses" is-clearable />
          </MpFormControl>
        </MpFlex>
      </MpModalBody>
      <MpModalFooter>
        <MpFlex gap="2" justify="space-between" :class="css({ width: '100%' })">
          <MpButton variant="ghost" @click="resetDraft">Reset</MpButton>
          <MpFlex gap="2">
            <MpButton variant="secondary" @click="filtersOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="applyFilters">Apply filters</MpButton>
          </MpFlex>
        </MpFlex>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>
