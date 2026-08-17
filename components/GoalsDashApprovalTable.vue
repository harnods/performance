<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goals dashboard — "Awaiting approval" table (rendered twice: goal creation
  and goal progress update)
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2641:53291)
  Token mode: Pixel 2.4

  One row = one submission (a batch of 1+ goal actions from a direct report).
  The row action is "View details", matching components/GoalApprovalQueue.vue —
  a batch is approved or rejected as a whole after reading it, never decided
  blind from a list. Bulk select therefore offers Approve only; rejecting needs
  a reason, so it stays on the detail page.
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
import type { Submission } from '~/composables/useGoalApprovalsStore'

const props = defineProps<{
  title: string
  submissions: Submission[]
}>()
const emit = defineEmits<{ (e: 'open', submission: Submission): void }>()

const { approveSubmission } = useGoalApprovalsStore()

// ─── Pagination ──────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => props.submissions.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const pagedRows = computed(() => props.submissions.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
watch([rowsPerPage, () => props.submissions], () => { currentPage.value = 1 })

// ─── Selection + bulk approve ────────────────────────────────────────────────
const selected = ref<Set<string>>(new Set())
const selectedCount = computed(() => selected.value.size)
const pageIds = computed(() => pagedRows.value.map(s => s.id))
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

function approveSelected() {
  const count = selectedCount.value
  selected.value.forEach(id => approveSubmission(id))
  clearSelection()
  toast.notify({
    id: 'goals-dash-approve',
    position: 'top-center',
    variant: 'success',
    title: count === 1 ? 'Request approved' : `${count} requests approved`,
  })
}

function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && selectedCount.value) clearSelection() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

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
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '1%', whiteSpace: 'nowrap' })
const noCellPadding = css({ padding: '0' })
const bulkBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4', background: 'gray.25' })
const captionText = css({ color: 'text.secondary' })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const dateValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', whiteSpace: 'nowrap' })
const paginationBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })
</script>

<template>
  <div :class="card">
    <div :class="sectionHeader">
      <span :class="sectionTitle">{{ title }}</span>
      <MpText size="label" :class="captionText">Total: {{ submissions.length }} {{ submissions.length === 1 ? 'request' : 'requests' }}</MpText>
    </div>

    <!-- No empty state: the parent only renders this card when it has rows. -->
    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow v-if="selectedCount > 0">
              <MpTableCell as="th" :colspan="3" :class="noCellPadding">
                <div :class="bulkBar">
                  <MpFlex align="center" gap="4">
                    <MpFlex align="center" gap="2">
                      <MpCheckbox
                        :is-checked="isAllSelected"
                        :is-indeterminate="!isAllSelected"
                        aria-label="Select all"
                        @update:is-checked="toggleSelectAll"
                      />
                      <MpText size="label" weight="semiBold">{{ selectedCount }} {{ selectedCount === 1 ? 'request' : 'requests' }} selected</MpText>
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
                  <MpCheckbox :is-checked="isAllSelected" aria-label="Select all requests" @update:is-checked="toggleSelectAll" />
                  <span>Employee</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="th" :class="headCell">Date</MpTableCell>
              <MpTableCell as="th" :class="[headCell, actionHead]" />
            </MpTableRow>
          </MpTableHead>

          <MpTableBody>
            <MpTableRow v-for="submission in pagedRows" :key="submission.id">
              <MpTableCell as="td" :class="tightCell">
                <MpFlex align="center" gap="2">
                  <MpCheckbox
                    :is-checked="selected.has(submission.id)"
                    :aria-label="`Select request from ${employeeById(submission.ownerId)?.name ?? submission.ownerId}`"
                    @update:is-checked="toggleSelect(submission.id)"
                  />
                  <MpAvatar
                    :id="submission.ownerId"
                    :name="employeeById(submission.ownerId)?.name ?? submission.ownerId"
                    :src="employeeById(submission.ownerId)?.photo"
                    size="lg"
                    variant-color="gray"
                  />
                  <MpFlex direction="column" gap="0">
                    <span :class="personName">{{ employeeById(submission.ownerId)?.name ?? submission.ownerId }}</span>
                    <span :class="personMeta">{{ employeeById(submission.ownerId) ? employeeMeta(employeeById(submission.ownerId)!) : '' }}</span>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>

              <MpTableCell as="td" :class="tightCell">
                <span :class="dateValue">{{ formatDate(submission.submittedAt) }}</span>
              </MpTableCell>

              <MpTableCell as="td" :class="actionCell">
                <MpButton variant="secondary" @click="emit('open', submission)">View details</MpButton>
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
