<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Import competency results — "Import history" tab.
  Replicates the production table (talenta-review: ImportHistorySection.vue):
  filter (status + search job position) → table (Date · Context · Job position ·
  Vendor · Employees · Status · Uploader · Download log) → empty state, with the
  standard rows-per-page pagination footer used across the module (mirrors
  pages/talents/competencies/index.vue). Built with Pixel 3 (DT 2.4).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpBadge,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
  MpIcon,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTooltip,
  MpTableContainer,
  MpTable,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  toast,
  css,
} from '@mekari/pixel3'
import { employeeById, employeeMeta } from '~/utils/employees'
import { seedCompetencyImports, type CompetencyImport, type ImportStatus } from '~/utils/competencyImports'

const rows = seedCompetencyImports()

// ─── Filters ─────────────────────────────────────────────────────────────────
const statusFilter = ref<'' | ImportStatus>('')
const statusOptions = [
  { value: '', label: 'All status' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]
const search = ref('')

const filtered = computed(() =>
  rows.filter((r) => {
    if (statusFilter.value && r.status !== statusFilter.value) return false
    if (search.value.trim() && !r.jobPosition.toLowerCase().includes(search.value.trim().toLowerCase())) return false
    return true
  }),
)
const isFiltering = computed(() => !!statusFilter.value || !!search.value.trim())
function resetSearch() { search.value = '' }

// ─── Pagination (standard footer — mirrors talents/competencies/index.vue) ────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => filtered.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
watch([statusFilter, search], () => { currentPage.value = 1 })

// ─── Status pill ─────────────────────────────────────────────────────────────
const statusBadgeType: Record<ImportStatus, 'completed' | 'critical'> = { completed: 'completed', failed: 'critical' }
const statusLabel: Record<ImportStatus, string> = { completed: 'Completed', failed: 'Failed' }

// Mock: a failed import exposes an error log to download. Success toast only —
// errors on this page are always inline, never a toast.
function downloadLog(row: CompetencyImport) {
  toast.notify({ id: `import-log-${row.id}`, position: 'top-center', variant: 'success', title: 'Error log downloaded' })
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const wrap = css({ display: 'flex', flexDirection: 'column', gap: '6' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', flexWrap: 'wrap' })
// Tallest body cell = Uploader (name + meta) = 2 lines → verticalAlign middle.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'nowrap', color: 'text.default' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const numHead = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap', color: 'text.default' })
const numCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '1%', whiteSpace: 'nowrap', textAlign: 'right' })
const valueText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const nowrap = css({ whiteSpace: 'nowrap' })
const uploaderName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', whiteSpace: 'nowrap' })
const uploaderMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const paginationBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })
const pageNav = css({ display: 'flex', alignItems: 'center', gap: '2' })
// Empty state (docs/empty-state.md).
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <div :class="wrap">
    <!-- Filter bar — status (left) + search job position (right) -->
    <div :class="filterBar">
      <PxSelectPopover
        v-model="statusFilter"
        :options="statusOptions"
        placeholder="All status"
        width="180px"
      />
      <MpInputGroup :class="css({ width: '260px' })">
        <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
        <MpInput v-model="search" placeholder="Search job position" />
        <MpInputRightAddon v-if="search">
          <MpIcon name="close" size="sm" :class="css({ cursor: 'pointer' })" @click="resetSearch" />
        </MpInputRightAddon>
      </MpInputGroup>
    </div>

    <!-- Table + pagination footer -->
    <MpFlex v-if="filtered.length" direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" :class="headCell">Date</MpTableCell>
              <MpTableCell as="th" :class="headCell">Context</MpTableCell>
              <MpTableCell as="th" :class="headCell">Job position</MpTableCell>
              <MpTableCell as="th" :class="headCell">Vendor</MpTableCell>
              <MpTableCell as="th" :class="numHead">Employees</MpTableCell>
              <MpTableCell as="th" :class="headCell">Status</MpTableCell>
              <MpTableCell as="th" :class="headCell">Uploader</MpTableCell>
              <MpTableCell as="th" :class="[headCell, actionHead]" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="row in paged" :key="row.id">
              <MpTableCell as="td" :class="tightCell"><span :class="[valueText, nowrap]">{{ row.date }}</span></MpTableCell>
              <MpTableCell as="td" :class="tightCell"><span :class="valueText">{{ row.context }}</span></MpTableCell>
              <MpTableCell as="td" :class="tightCell"><span :class="valueText">{{ row.jobPosition }}</span></MpTableCell>
              <MpTableCell as="td" :class="tightCell"><span :class="valueText">{{ row.vendor }}</span></MpTableCell>
              <MpTableCell as="td" :class="numCell"><span :class="valueText">{{ row.employees }}</span></MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpBadge for="tableStatus" :type="statusBadgeType[row.status]">{{ statusLabel[row.status] }}</MpBadge>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="0">
                  <span :class="uploaderName">{{ employeeById(row.uploaderId)?.name ?? row.uploaderId }}</span>
                  <span :class="uploaderMeta">{{ employeeById(row.uploaderId) ? employeeMeta(employeeById(row.uploaderId)!) : '' }}</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpButton v-if="row.status === 'failed'" variant="secondary" left-icon="download" @click="downloadLog(row)">Download log</MpButton>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer (standard — mirrors talents/competencies/index.vue) -->
      <div :class="paginationBar">
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

        <div :class="pageNav">
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

    <!-- Empty state — filtered-no-result vs nothing-yet (docs/empty-state.md) -->
    <div v-else :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <div :class="emptyTextWrap">
        <MpText :class="emptyTitle">{{ isFiltering ? 'No import history found' : 'No import history yet' }}</MpText>
        <MpText size="label" :class="captionText">
          {{ isFiltering
            ? 'Recheck the keyword or filter you have applied and try again.'
            : 'Imported competency results will appear here.' }}
        </MpText>
      </div>
    </div>
  </div>
</template>
