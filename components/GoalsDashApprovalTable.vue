<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goals dashboard — "Awaiting approval" table (rendered three times: goal
  creation, goal progress update, goal edit)
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2641:53291)
  Token mode: Pixel 2.4

  TWO GRANULARITIES, one table — set by `unit` (docs/patterns/dashboard-section.md):
    - unit="employee" (Goal creation) → one row per EMPLOYEE, however many
      batches they sent. A create bundle's weights only sum to 100% together, so
      it is approved as one unit and splitting it per goal would offer a
      decision nobody can make; and a name appearing twice reads as a duplicate,
      so several batches merge into one row with their goal counts summed.
    - unit="goal" (Goal progress update, Goal edit) → one row per GOAL, with a
      leading Goal column. These are single, independent changes; a manager is
      triaging goals, and one employee can have several in flight.
  A row therefore carries submissionIds (1+), not one id. Bulk approve flattens
  and de-duplicates them, so a submission shared by two rows commits once.

  Progressive pagination (docs/patterns/pagination.md): "Load more" appends into
  a FIXED-HEIGHT scroll region, so the card never grows down the page. The
  header row (and the bulk bar that replaces it) sticks while the body scrolls.
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
import type { ApprovalRow } from '~/composables/useGoalsDashboard'

const props = defineProps<{
  title: string
  rows: ApprovalRow[]
  unit: 'employee' | 'goal'
}>()
// The whole row, not just an id — a row can cover several submissions, and the
// parent needs its owner to route a multi-batch row to a filtered list.
const emit = defineEmits<{ (e: 'open', row: ApprovalRow): void }>()

const { approveSubmission } = useGoalApprovalsStore()

const noun = computed(() => (props.unit === 'goal' ? 'goal' : 'employee'))
function countLabel(n: number) { return `${n} ${n === 1 ? noun.value : `${noun.value}s`}` }
// Both units run 4 columns — unit="goal" leads with Goal, unit="employee" swaps
// that for the Goals requested count — so the bulk bar always spans 4.
const COL_COUNT = 4

// ─── Progressive pagination ──────────────────────────────────────────────────
// Append-only: no rows-per-page control and no prev/next. The scroll region
// below is height-capped, so loading more scrolls rather than growing the card.
const PAGE = 10
const visibleCount = ref(PAGE)
const visibleRows = computed(() => props.rows.slice(0, visibleCount.value))
const remaining = computed(() => Math.max(0, props.rows.length - visibleCount.value))
function loadMore() { visibleCount.value += PAGE }
watch(() => props.rows, () => { visibleCount.value = PAGE })

// ─── Selection + bulk approve ────────────────────────────────────────────────
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

function approveSelected() {
  // A row can carry several submissions, and two goal rows can share one.
  // Flatten, then de-duplicate — approving the same batch twice re-runs the
  // commit. The toast counts SUBMISSIONS, since that's what actually happened.
  const submissionIds = new Set(props.rows.filter(r => selected.value.has(r.id)).flatMap(r => r.submissionIds))
  submissionIds.forEach(id => approveSubmission(id))
  const approved = submissionIds.size
  clearSelection()
  toast.notify({
    id: 'goals-dash-approve',
    position: 'top-center',
    variant: 'success',
    title: approved === 1 ? 'Request approved' : `${approved} requests approved`,
  })
}

function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && selectedCount.value) clearSelection() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function ownerName(id: string) { return employeeById(id)?.name ?? id }

// ─── Styles ──────────────────────────────────────────────────────────────────
const card = css({
  display: 'flex', flexDirection: 'column', gap: '4',
  padding: '6', background: 'white',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'lg',
})
// No gap between title and total line — same header rhythm as the distribution
// donut cards (GoalsDashDonutCard.vue).
const sectionHeader = css({ display: 'flex', flexDirection: 'column' })
const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
// Tallest body cell = Employee (name + meta) = 2 lines → verticalAlign middle.
// Sticky-on-scroll is NOT set here — `<MpTableHead is-fixed>` owns it.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '1%', whiteSpace: 'nowrap' })
// Goals requested — numeric column: right-aligned, tabular-nums, shrink-to-fit
// (docs/patterns/table.md).
const numHead = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', textAlign: 'right', width: '1%', whiteSpace: 'nowrap' })
const numCell = css({
  paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle',
  textAlign: 'right', width: '1%', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
})
// Qualifies the summed figure above it on a row that merges several batches.
// The column is right-aligned, so the flex column needs to be too.
const numCaption = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', whiteSpace: 'nowrap', textAlign: 'right' })
// Bulk-bar host cell. Keeps the cell's OWN horizontal padding (the recipe's
// 8px) and only trims the vertical — the bar then starts exactly where a body
// cell's content does, so its select-all checkbox lines up with the column of
// row checkboxes beneath it. Mirrors company-goals.vue's `noCellPadding`.
const bulkBarCell = css({ paddingBlock: '1' })
// Caps the table at ~7 rows. `maxHeight`, not `height`: a card with three rows
// shouldn't sit in 400px of dead space — the point is that the card stops
// growing once "Load more" is pressed, not that it is always this tall.
// Goes ON MpTableContainer, not a wrapper div: the component is already the
// scrollport (it sets overflow-x: auto), and `position: sticky` on the header
// resolves against that same element. A wrapper would scroll while the header
// stayed pinned to a scrollport that never moves.
const scrollRegion = css({ maxHeight: '400px', overflowY: 'auto' })
// paddingInline: 0 — the host <th> already supplies the inset (see bulkBarCell).
// Background and bottom border are the th's too, so the fill still covers the
// full row width instead of stopping at the bar. Same contract as
// components/GoalBulkActionBar.vue.
const bulkBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '40px', paddingInline: '0' })
const captionText = css({ color: 'text.secondary' })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// Clickable name cell — the canonical plain-span link from docs/patterns/table.md
// (not MpTextlink: no button padding, and it composes with the row's own
// controls). Opens the same request "View details" does.
const goalNameLink = css({
  display: 'inline', color: 'text.link', cursor: 'pointer', textAlign: 'left',
  minWidth: '0', whiteSpace: 'normal', overflowWrap: 'break-word',
  textDecoration: 'none', _hover: { textDecoration: 'underline' },
})
const cellValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', whiteSpace: 'nowrap' })
// Sits outside the scroll region, so it stays reachable however far you scroll.
const loadMoreBar = css({ display: 'flex', alignItems: 'center', gap: '1', height: '52px', paddingInline: '4' })
</script>

<template>
  <div :class="card">
    <div :class="sectionHeader">
      <span :class="sectionTitle">{{ title }}</span>
      <MpText size="label" :class="captionText">Total: {{ countLabel(rows.length) }}</MpText>
    </div>

    <!-- No empty state: the parent only renders this card when it has rows. -->
    <MpFlex direction="column">
      <MpTableContainer :class="scrollRegion">
        <MpTable :is-hoverable="false">
          <!-- is-fixed = Pixel's own sticky header (position: sticky + gray.100
               drop shadow). Don't hand-roll it on the th class. -->
          <MpTableHead is-fixed>
            <MpTableRow v-if="selectedCount > 0">
              <MpTableCell as="th" :colspan="COL_COUNT" :class="bulkBarCell">
                <div :class="bulkBar">
                  <MpFlex align="center" gap="4">
                    <MpFlex align="center" gap="2">
                      <MpCheckbox
                        :is-checked="isAllSelected"
                        :is-indeterminate="!isAllSelected"
                        aria-label="Select all"
                        @update:is-checked="toggleSelectAll"
                      />
                      <MpText size="label" weight="semiBold">{{ countLabel(selectedCount) }} selected</MpText>
                    </MpFlex>
                    <MpButton variant="primary" @click="approveSelected">Approve</MpButton>
                  </MpFlex>
                  <MpText size="label" color="text.secondary">Press esc to deselect</MpText>
                </div>
              </MpTableCell>
            </MpTableRow>

            <MpTableRow v-else>
              <MpTableCell as="th" :class="headCell">
                <MpFlex align="center" gap="2">
                  <MpCheckbox :is-checked="isAllSelected" :aria-label="`Select all ${noun}s`" @update:is-checked="toggleSelectAll" />
                  <span>{{ unit === 'goal' ? 'Goal' : 'Employee' }}</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell v-if="unit === 'goal'" as="th" :class="headCell">Employee</MpTableCell>
              <MpTableCell v-else as="th" :class="numHead">Goals requested</MpTableCell>
              <MpTableCell as="th" :class="headCell">Date</MpTableCell>
              <MpTableCell as="th" :class="[headCell, actionHead]" />
            </MpTableRow>
          </MpTableHead>

          <MpTableBody>
            <MpTableRow v-for="row in visibleRows" :key="row.id">
              <!-- First content cell owns the row-select checkbox (docs/patterns/checkbox.md) -->
              <MpTableCell as="td" :class="tightCell">
                <MpFlex align="center" gap="2">
                  <MpCheckbox
                    :is-checked="selected.has(row.id)"
                    :aria-label="unit === 'goal' ? `Select ${row.title}` : `Select request from ${ownerName(row.ownerId)}`"
                    @update:is-checked="toggleSelect(row.id)"
                  />
                  <span v-if="unit === 'goal'" :class="goalNameLink" @click="emit('open', row)">{{ row.title }}</span>
                  <template v-else>
                    <MpAvatar
                      :id="row.ownerId"
                      :name="ownerName(row.ownerId)"
                      :src="employeeById(row.ownerId)?.photo"
                      size="lg"
                      variant-color="gray"
                    />
                    <MpFlex direction="column" gap="0">
                      <span :class="personName">{{ ownerName(row.ownerId) }}</span>
                      <span :class="personMeta">{{ employeeById(row.ownerId) ? employeeMeta(employeeById(row.ownerId)!) : '' }}</span>
                    </MpFlex>
                  </template>
                </MpFlex>
              </MpTableCell>

              <MpTableCell v-if="unit === 'goal'" as="td" :class="tightCell">
                <MpFlex align="center" gap="2">
                  <MpAvatar
                    :id="row.ownerId"
                    :name="ownerName(row.ownerId)"
                    :src="employeeById(row.ownerId)?.photo"
                    size="lg"
                    variant-color="gray"
                  />
                  <MpFlex direction="column" gap="0">
                    <span :class="personName">{{ ownerName(row.ownerId) }}</span>
                    <span :class="personMeta">{{ employeeById(row.ownerId) ? employeeMeta(employeeById(row.ownerId)!) : '' }}</span>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>

              <!-- Goals this employee has asked for, across all their batches.
                   When it IS several batches the row says so — otherwise the
                   summed figure looks like one request and the Date column
                   (the most recent of them) looks like the only date. -->
              <MpTableCell v-else as="td" :class="numCell">
                <MpFlex direction="column" gap="0">
                  <span :class="cellValue">{{ row.goalCount }}</span>
                  <span v-if="row.submissionIds.length > 1" :class="numCaption">
                    across {{ row.submissionIds.length }} requests
                  </span>
                </MpFlex>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <span :class="cellValue">{{ formatDate(row.submittedAt) }}</span>
              </MpTableCell>

              <MpTableCell as="td" :class="actionCell">
                <MpButton variant="secondary" @click="emit('open', row)">View details</MpButton>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Progressive "Load more" — count caption always beside the link -->
      <div v-if="remaining > 0" :class="loadMoreBar">
        <MpText size="label" :class="captionText">Showing {{ visibleRows.length }} of {{ countLabel(rows.length) }}.</MpText>
        <MpTextlink as="button" size="label" @click="loadMore">Load {{ Math.min(PAGE, remaining) }} more.</MpTextlink>
      </div>
    </MpFlex>
  </div>
</template>
