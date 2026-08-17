<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goals dashboard — "Needs update" table
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2639:41115)
  Token mode: Pixel 2.4

  Default table (docs/patterns/table.md): no outer border, middle-aligned (the
  tallest cell stacks 2 lines), 8px cell padding, row-select checkbox inside the
  first content cell, 52px pagination footer attached below.

  Default order is MOST STALE FIRST, not newest-first — this is a triage
  worklist, so the goal most overdue for an update leads. A manual sort on Last
  updated still wins. See docs/patterns/stat-card.md.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpAvatar,
  MpCheckbox,
  MpTooltip,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
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
import type { NeedsUpdateRow } from '~/composables/useGoalsDashboard'

const props = defineProps<{ rows: NeedsUpdateRow[] }>()

// ─── Sort (PxColumnSortMenu). sortKey '' = default most-stale-first. ──────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = { updatedAt: 'date' }

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => (a.updatedAt.getTime() - b.updatedAt.getTime()) * dir)
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => sortedRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const pagedRows = computed(() => sortedRows.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
watch([rowsPerPage, () => props.rows], () => { currentPage.value = 1 })

// ─── Selection + bulk reminder ───────────────────────────────────────────────
const selected = ref<Set<string>>(new Set())
const selectedCount = computed(() => selected.value.size)
const pageIds = computed(() => pagedRows.value.map(r => r.id))
const isAllSelected = computed(() => pageIds.value.length > 0 && pageIds.value.every(id => selected.value.has(id)))

function toggleSelect(id: string) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
function toggleSelectAll() {
  const next = new Set(selected.value)
  if (isAllSelected.value) pageIds.value.forEach(id => next.delete(id))
  else pageIds.value.forEach(id => next.add(id))
  selected.value = next
}
function clearSelection() { selected.value = new Set() }

function sendReminder(count: number) {
  toast.notify({
    id: 'goals-dash-reminder',
    position: 'top-center',
    variant: 'success',
    title: count === 1 ? 'Reminder sent' : `Reminder sent to ${count} goal owners`,
  })
}
function remindRow() { sendReminder(1) }
function remindSelected() {
  sendReminder(selectedCount.value)
  clearSelection()
}

function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && selectedCount.value) clearSelection() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Styles ──────────────────────────────────────────────────────────────────
// Tallest body cell = Goal owner (name + meta) and Last updated (date + age),
// both 2 lines → whole table stays verticalAlign middle (docs/patterns/table.md).
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '1%', whiteSpace: 'nowrap' })
const noCellPadding = css({ padding: '0' })

// Exactly 20px between the section heading block and the table. NOT the `5`
// spacing token — Pixel's scale puts that at 1.3rem / 20.8px.
const card = css({
  display: 'flex', flexDirection: 'column', gap: '20px',
  padding: '6', background: 'white',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'lg',
})
// No gap between title and total line — same header rhythm as the distribution
// donut cards and the approval cards.
const sectionHeader = css({ display: 'flex', flexDirection: 'column' })
const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const dateValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', whiteSpace: 'nowrap' })
const dateAge = css({ fontSize: '12px', lineHeight: '16px', color: 'text.danger', whiteSpace: 'nowrap' })
const goalTitle = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
// Bulk bar — 52px / gray.25 / bottom border, replaces the header row
// (docs/patterns/checkbox.md).
const bulkBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4', background: 'gray.25' })
const paginationBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })
</script>

<template>
  <div :class="card">
    <div :class="sectionHeader">
      <span :class="sectionTitle">Needs progress update</span>
      <MpText size="label" :class="captionText">Total: {{ rows.length }} {{ rows.length === 1 ? 'goal' : 'goals' }}</MpText>
    </div>

    <!-- No empty state: the parent only renders this section when there is at
         least one stale goal AND the cycle is in its final week. -->
    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <!-- 1+ selected → the whole header row becomes the bulk bar -->
            <MpTableRow v-if="selectedCount > 0">
              <MpTableCell as="th" :colspan="4" :class="noCellPadding">
                <div :class="bulkBar">
                  <MpFlex align="center" gap="4">
                    <MpFlex align="center" gap="2">
                      <MpCheckbox
                        :is-checked="isAllSelected"
                        :is-indeterminate="!isAllSelected"
                        aria-label="Select all"
                        @update:is-checked="toggleSelectAll"
                      />
                      <MpText size="label" weight="semiBold">{{ selectedCount }} {{ selectedCount === 1 ? 'goal' : 'goals' }} selected</MpText>
                    </MpFlex>
                    <MpButton variant="primary" @click="remindSelected">Send reminder</MpButton>
                  </MpFlex>
                  <MpText size="label" color="text.secondary">Press esc to deselect</MpText>
                </div>
              </MpTableCell>
            </MpTableRow>

            <MpTableRow v-else>
              <MpTableCell as="th" :class="headCell">
                <MpFlex align="center" gap="2">
                  <MpCheckbox :is-checked="isAllSelected" aria-label="Select all goals" @update:is-checked="toggleSelectAll" />
                  <span>Goal</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="th" class="gnu-sort-th" :class="headCell">
                <span :class="thInner">
                  <span>Last updated</span>
                  <PxColumnSortMenu
                    col-key="updatedAt"
                    :sort-type="columnSortTypes.updatedAt"
                    :sort-key="sortKey"
                    :sort-dir="sortDir"
                    @sort-change="onSortChange"
                  />
                </span>
              </MpTableCell>
              <MpTableCell as="th" :class="headCell">Goal owner</MpTableCell>
              <MpTableCell as="th" :class="[headCell, actionHead]" />
            </MpTableRow>
          </MpTableHead>

          <MpTableBody>
            <MpTableRow v-for="row in pagedRows" :key="row.id">
              <MpTableCell as="td" :class="tightCell">
                <MpFlex align="center" gap="2">
                  <MpCheckbox
                    :is-checked="selected.has(row.id)"
                    :aria-label="`Select ${row.title}`"
                    @update:is-checked="toggleSelect(row.id)"
                  />
                  <span :class="goalTitle">{{ row.title }}</span>
                </MpFlex>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="0">
                  <span :class="dateValue">{{ formatDate(row.updatedAt) }}</span>
                  <span :class="dateAge">{{ row.age }}</span>
                </MpFlex>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <MpFlex align="center" gap="2">
                  <MpAvatar
                    :id="row.ownerId"
                    :name="employeeById(row.ownerId)?.name ?? row.ownerId"
                    :src="employeeById(row.ownerId)?.photo"
                    size="lg"
                    variant-color="gray"
                  />
                  <MpFlex direction="column" gap="0">
                    <span :class="personName">{{ employeeById(row.ownerId)?.name ?? row.ownerId }}</span>
                    <span :class="personMeta">{{ employeeById(row.ownerId) ? employeeMeta(employeeById(row.ownerId)!) : '' }}</span>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>

              <MpTableCell as="td" :class="actionCell">
                <MpButton variant="secondary" left-icon="envelope" @click="remindRow">Send reminder</MpButton>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

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

        <MpFlex align="center" gap="2">
          <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
          <MpTooltip label="Prev page" use-portal>
            <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
          </MpTooltip>
          <MpTooltip label="Next page" use-portal>
            <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
          </MpTooltip>
        </MpFlex>
      </div>
    </MpFlex>
  </div>
</template>

<style scoped>
/* Unlayered rule so it beats PxColumnSortMenu's own visibility:hidden. */
.gnu-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
