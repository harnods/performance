<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goals dashboard — "Needs update" table
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2639:41115)
  Token mode: Pixel 2.4

  Default table (docs/patterns/table.md): no outer border, middle-aligned (the
  tallest cell stacks 2 lines), 8px cell padding, row-select checkbox inside the
  first content cell, progressive "Load more" into a height-capped scroll region
  (docs/patterns/pagination.md) — same as the Awaiting approval cards.

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
  MpTextlink,
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

// ─── Progressive pagination ──────────────────────────────────────────────────
// Append-only "Load more" into a height-capped scroll region, same as the
// Awaiting approval cards — a dashboard section must not grow down the page
// when you reveal more rows (docs/patterns/pagination.md).
const PAGE = 10
const visibleCount = ref(PAGE)
const visibleRows = computed(() => sortedRows.value.slice(0, visibleCount.value))
const remaining = computed(() => Math.max(0, sortedRows.value.length - visibleCount.value))
function loadMore() { visibleCount.value += PAGE }
watch(() => props.rows, () => { visibleCount.value = PAGE })

// ─── Selection + bulk reminder ───────────────────────────────────────────────
const selected = ref<Set<string>>(new Set())
const selectedCount = computed(() => selected.value.size)
const visibleIds = computed(() => visibleRows.value.map(r => r.id))
const isAllSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every(id => selected.value.has(id)))

function toggleSelect(id: string) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
function toggleSelectAll() {
  const next = new Set(selected.value)
  if (isAllSelected.value) visibleIds.value.forEach(id => next.delete(id))
  else visibleIds.value.forEach(id => next.add(id))
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
// Sticky-on-scroll is NOT set here — `<MpTableHead is-fixed>` owns it.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '1%', whiteSpace: 'nowrap' })
// Keeps the cell's own horizontal padding so the bar's select-all checkbox
// lines up with the row checkboxes below — see company-goals.vue's
// `noCellPadding` and docs/patterns/checkbox.md.
const bulkBarCell = css({ paddingBlock: '1' })
const scrollRegion = css({ maxHeight: '400px', overflowY: 'auto' })

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
// paddingInline: 0 — the host <th> supplies the inset, and its own background
// covers the full row width. Same contract as components/GoalBulkActionBar.vue.
const bulkBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '40px', paddingInline: '0' })
// Sits OUTSIDE the scroll region so it stays reachable however far you scroll.
const loadMoreBar = css({ display: 'flex', alignItems: 'center', gap: '1', height: '52px', paddingInline: '4' })
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
      <MpTableContainer :class="scrollRegion">
        <MpTable :is-hoverable="false">
          <!-- is-fixed = Pixel's own sticky header. Don't hand-roll it on the th. -->
          <MpTableHead is-fixed>
            <!-- 1+ selected → the whole header row becomes the bulk bar -->
            <MpTableRow v-if="selectedCount > 0">
              <MpTableCell as="th" :colspan="4" :class="bulkBarCell">
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
            <MpTableRow v-for="row in visibleRows" :key="row.id">
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

      <!-- Progressive "Load more" — count caption always beside the link -->
      <div v-if="remaining > 0" :class="loadMoreBar">
        <MpText size="label" :class="captionText">Showing {{ visibleRows.length }} of {{ rows.length }} goals.</MpText>
        <MpTextlink as="button" size="label" @click="loadMore">Load {{ Math.min(PAGE, remaining) }} more.</MpTextlink>
      </div>
    </MpFlex>
  </div>
</template>

<style scoped>
/* Unlayered rule so it beats PxColumnSortMenu's own visibility:hidden. */
.gnu-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
