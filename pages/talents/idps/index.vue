<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Individual development plan (list)
  Replicated from production (talenta-performance:
    src/views/talent-management/individual-development/Index.vue).
  Filter bar (column display + employee + search), a Default table with a
  progress column, and the standard 52px pagination footer.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpCheckbox, MpTooltip, MpTextlink, MpProgress, css,
} from '@mekari/pixel3'
import { TALENTS } from '~/utils/talents'
import { planProgress, focusLabel, focusPosition, type IdpPlan } from '~/utils/idp'

definePageMeta({ title: 'Individual development plan', layout: 'default' })

const router = useRouter()
const { plans } = useIdpStore()

const talentById = (id: string) => TALENTS.find(t => t.id === id)

const search = ref('')
const employee = ref('')
const employeeOptions = computed(() =>
  TALENTS.map(t => ({ value: t.id, label: t.name, description: t.jobPosition, photo: t.photo })),
)

// Optional columns, same set production hides behind its column-display button.
const optionalColumns = [
  { key: 'branch', label: 'Branch' },
  { key: 'organization', label: 'Organization' },
  { key: 'jobLevel', label: 'Job level' },
  { key: 'employmentType', label: 'Employment status' },
] as const
const visible = ref<Record<string, boolean>>({ branch: false, organization: false, jobLevel: false, employmentType: false })
const allColumnsVisible = computed(() => optionalColumns.every(c => visible.value[c.key]))
function toggleAllColumns() {
  const next = !allColumnsVisible.value
  optionalColumns.forEach((c) => { visible.value[c.key] = next })
}

// Default order is newest-first (most recently created on top). A manual column
// sort overrides this (see sorted below).
const rows = computed(() => [...plans.value].reverse().filter((p) => {
  const t = talentById(p.employeeId)
  if (!t) return false
  if (employee.value && t.id !== employee.value) return false
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return p.name.toLowerCase().includes(q) || p.objective.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
}))

// ─── Column sort ─────────────────────────────────────────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number'> = {
  name: 'text', objective: 'text', employee: 'text',
  branch: 'text', organization: 'text', jobLevel: 'text', employmentType: 'text', progress: 'number',
}
function sortValue(p: IdpPlan, key: string): string | number {
  const t = talentById(p.employeeId)
  if (key === 'name') return p.name
  if (key === 'objective') return p.objective
  if (key === 'employee') return t?.name ?? ''
  if (key === 'branch') return t?.branch ?? ''
  if (key === 'organization') return t?.organization ?? ''
  if (key === 'jobLevel') return t?.jobLevel ?? ''
  if (key === 'employmentType') return t?.employmentType ?? ''
  if (key === 'progress') return planProgress(p).percent
  return ''
}
const sorted = computed(() => {
  if (!sortKey.value) return rows.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' }) * dir,
  )
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => rows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sorted.value.slice(showingFrom.value - 1, showingTo.value))
watch([search, employee], () => { currentPage.value = 1 })

const colCount = computed(() => 5 + optionalColumns.filter(c => visible.value[c.key]).length)

function openDetail(id: string) { router.push(`/talents/idps/${id}`) }
function openCreate() { router.push('/talents/idps/create') }

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', flexWrap: 'wrap' })
// No explicit font/color here — the MpTable recipe supplies the th's own
// 14px/600/text.default styling. Only padding + alignment are ours to set
// (docs/patterns/table.md's "Header (th) styling" rule).
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
// Trailing action column shrinks to its content instead of stretching and
// eating whitespace next to the button (docs/patterns/table.md's numeric-cols
// idiom, reused here for the same reason).
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const nameText = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const subText = css({ fontSize: '12px', color: 'text.secondary' })
const captionText = css({ color: 'text.secondary' })
const progressWrap = css({ display: 'flex', alignItems: 'center', gap: '3', minWidth: '200px' })
// MpProgress fills its container's width, so the same flex:1 wrapper the
// hand-rolled track used still controls layout — only the bar itself is now
// the native component. Color override matches the repo's own teal convention
// for MpProgress (review-cycles/index.vue, CycleDetailGeneral.vue) rather than
// its built-in stone/violet options, which don't fit the "on track" green.
const progressBar = css({ flex: '1' })
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'teal.400' } })
const progressCount = css({ fontSize: '12px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' })
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
// Column-settings panel header — uppercase eyebrow label, matches the repo's
// existing small-caps convention (inbox/notifications.vue, GoalsDashScenarioControl.vue).
const columnPanelHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2' })
const columnPanelLabel = css({ fontSize: '12px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="primary" left-icon="add" @click="openCreate">Create program</MpButton>
  </Teleport>

  <!-- Nothing created yet → full empty state replaces the filter bar + table
       (docs/empty-state.md). A filtered-to-zero list keeps the shell instead. -->
  <MpFlex v-if="!plans.length" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
    <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
    <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
      <MpText :class="emptyTitle">No development plan yet</MpText>
      <MpText size="label" :class="captionText">Create a program to start developing your talents.</MpText>
    </MpFlex>
    <MpButton variant="secondary" left-icon="add" @click="openCreate">Create program</MpButton>
  </MpFlex>

  <div v-else :class="page">
    <!-- Filter bar -->
    <div :class="filterBar">
      <MpFlex align="center" gap="3" wrap="wrap">
        <!-- Column settings -->
        <MpPopover use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpTooltip label="Column settings" use-portal>
              <MpButton variant="secondary" left-icon="column-settings" right-icon="chevrons-down" aria-label="Column settings" />
            </MpTooltip>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <div :class="css({ padding: '3', minWidth: '220px' })">
              <div :class="columnPanelHeader">
                <span :class="columnPanelLabel">Column displayed</span>
                <MpTextlink as="button" size="label" @click="toggleAllColumns">
                  {{ allColumnsVisible ? 'Deselect all' : 'Select all' }}
                </MpTextlink>
              </div>
              <MpFlex direction="column" gap="2">
                <MpCheckbox v-for="c in optionalColumns" :key="c.key" :is-checked="visible[c.key]" @update:is-checked="(v: boolean) => (visible[c.key] = v)">
                  {{ c.label }}
                </MpCheckbox>
              </MpFlex>
            </div>
          </MpPopoverContent>
        </MpPopover>

        <PxSelectPopover v-model="employee" :options="employeeOptions" placeholder="All employee" :width="'220px'" searchable search-placeholder="Search employee..." is-clearable />
      </MpFlex>

      <MpInputGroup :class="css({ width: '260px' })">
        <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
        <MpInput v-model="search" placeholder="Search..." />
      </MpInputGroup>
    </div>

    <!-- Table + pagination grouped flush (gap 0) -->
    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Development plan</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Objective</span><PxColumnSortMenu col-key="objective" :sort-type="columnSortTypes.objective" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" :class="headCell">Focus</MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Employee</span><PxColumnSortMenu col-key="employee" :sort-type="columnSortTypes.employee" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell v-if="visible.branch" as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Branch</span><PxColumnSortMenu col-key="branch" :sort-type="columnSortTypes.branch" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell v-if="visible.organization" as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Organization</span><PxColumnSortMenu col-key="organization" :sort-type="columnSortTypes.organization" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell v-if="visible.jobLevel" as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Job level</span><PxColumnSortMenu col-key="jobLevel" :sort-type="columnSortTypes.jobLevel" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell v-if="visible.employmentType" as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Employment status</span><PxColumnSortMenu col-key="employmentType" :sort-type="columnSortTypes.employmentType" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Progress</span><PxColumnSortMenu col-key="progress" :sort-type="columnSortTypes.progress" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="p in paged" :key="p.id">
              <MpTableCell as="td" :class="cell">{{ p.name }}</MpTableCell>
              <MpTableCell as="td" :class="cell">{{ p.objective || '-' }}</MpTableCell>
              <MpTableCell as="td" :class="cell">
                <MpFlex direction="column" gap="0">
                  <span>{{ focusLabel(p) }}</span>
                  <span :class="subText">{{ focusPosition(p) || '-' }}</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">
                <MpFlex align="center" gap="2">
                  <PxAvatar :id="`idp-${p.id}`" :name="talentById(p.employeeId)?.name" :src="talentById(p.employeeId)?.photo" size="lg" variant-color="gray" />
                  <MpFlex direction="column" gap="0">
                    <span :class="nameText">{{ talentById(p.employeeId)?.name }}</span>
                    <span :class="subText">{{ talentById(p.employeeId)?.jobPosition }}</span>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>
              <MpTableCell v-if="visible.branch" as="td" :class="cell">{{ talentById(p.employeeId)?.branch || '-' }}</MpTableCell>
              <MpTableCell v-if="visible.organization" as="td" :class="cell">{{ talentById(p.employeeId)?.organization || '-' }}</MpTableCell>
              <MpTableCell v-if="visible.jobLevel" as="td" :class="cell">{{ talentById(p.employeeId)?.jobLevel || '-' }}</MpTableCell>
              <MpTableCell v-if="visible.employmentType" as="td" :class="cell">{{ talentById(p.employeeId)?.employmentType || '-' }}</MpTableCell>
              <MpTableCell as="td" :class="cell">
                <div :class="progressWrap">
                  <MpProgress variant="linear" size="sm" :class="[progressBar, tealProgress]" :value="planProgress(p).percent" />
                  <span :class="progressCount">
                    <span :class="css({ color: planProgress(p).done >= planProgress(p).total && planProgress(p).total > 0 ? 'text.default' : 'text.secondary' })">{{ planProgress(p).done }}</span>
                    <span :class="captionText"> of </span>
                    <span :class="css({ fontWeight: '600' })">{{ planProgress(p).total }}</span>
                  </span>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpButton variant="secondary" @click="openDetail(p.id)">View detail</MpButton>
              </MpTableCell>
            </MpTableRow>
            <!-- Filtered to zero → keep the shell, single centered row -->
            <MpTableRow v-if="!rows.length">
              <MpTableCell as="td" :colspan="colCount" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                No development plan matches your filters.
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer -->
      <div v-if="totalRows" :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
        <MpFlex align="center" gap="3">
          <MpText size="label" :class="captionText">Rows per page</MpText>
          <MpPopover is-close-on-select use-portal placement="bottom-start">
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem v-for="opt in rowsPerPageOptions" :key="opt" :is-active="opt === rowsPerPage" @click="rowsPerPage = opt; currentPage = 1">{{ opt }}</MpPopoverListItem>
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
  </div>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered scoped `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
