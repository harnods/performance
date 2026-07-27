<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — My requests

  Renders in place of the goals table on every goal-level page's "My
  requests" tab — same filter-bar-then-table index shape as
  GoalApprovalQueue.vue, but scoped to the current viewer's OWN submissions
  (every status, not just open ones, so approved/rejected history stays
  visible) instead of everyone's.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpTextlink,
  MpButton,
  MpBadge,
  MpSelect,
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
  css,
} from '@mekari/pixel3'
import type { Submission } from '~/composables/useGoalApprovalsStore'

const props = defineProps<{ cycleId: string }>()
const router = useRouter()

const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === props.cycleId))
const { submissions } = useGoalApprovalsStore(props.cycleId)
const { currentUserId } = useCurrentUser()

const TYPE_OPTIONS = ['Goal creation', 'Goal progress update', 'Goal update'] as const

function typeLabelFor(submission: Submission): string {
  return submission.items.some(i => i.type === 'create') ? 'Goal creation' : 'Goal update'
}

const myRequests = computed(() => submissions.value.filter(s => s.ownerId === currentUserId.value))

const typeFilter = ref('')
const filteredRequests = computed(() => {
  let result = myRequests.value
  if (typeFilter.value) result = result.filter(s => typeLabelFor(s) === typeFilter.value)
  return result.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function openSubmission(id: string) {
  router.push({ path: `/goals/goal-cycles/${props.cycleId}/awaiting-approval/${id}`, query: { cycleName: cycle.value?.name } })
}

// ─── Styles — mirrors GoalApprovalQueue.vue's own filter-bar + table classes.
const wrap = css({ display: 'flex', flexDirection: 'column', gap: '6' })
const typeFieldClass = css({ width: '200px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
// Matches MpTable's own default (non-narrow) th/td padding (paddingY: '4')
// — a flatter '2' reads as the narrow/dense table variant and made
// single-line rows look too short.
const tightCell = css({ paddingTop: '4', paddingBottom: '4' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
// A button already carries its own vertical padding (md size ≈ 36px tall
// including it) — stacking the full 16px text-cell padding on top of that
// made the row noticeably taller than its plain-text siblings. 8px here
// instead brings the button cell's total height back in line with theirs.
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const emptyStateWrap = css({ paddingY: '16', textAlign: 'center' })

function statusLabel(status: Submission['status']) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Awaiting approval'
}
// "Awaiting approval" always reads as the warning/yellow tone — it's a
// pending decision, not a settled/good or settled/bad one — so it's kept
// separate from the approved/rejected outcomes it's neither of.
function statusType(status: Submission['status']) {
  if (status === 'approved') return 'completed'
  if (status === 'rejected') return 'critical'
  return 'warning'
}
</script>

<template>
  <div :class="wrap">
    <!-- Filter bar -->
    <MpFlex align="center" gap="4">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="typeFieldClass">
            <MpSelect v-model="typeFilter" placeholder="Type" is-clearable tabindex="-1" aria-hidden="true">
              <option v-for="opt in TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem v-for="opt in TYPE_OPTIONS" :key="opt" :is-active="opt === typeFilter" @click="typeFilter = opt">
              {{ opt }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
    </MpFlex>

    <!-- Table -->
    <MpTableContainer>
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th">Type</MpTableCell>
            <MpTableCell as="th">Date</MpTableCell>
            <MpTableCell as="th">Status</MpTableCell>
            <MpTableCell as="th" :class="actionHead" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-if="filteredRequests.length === 0">
            <MpTableCell as="td" colspan="4" :class="[tightCell, emptyStateWrap]">
              <MpText size="label" :class="captionText">You haven't submitted any requests for this cycle yet.</MpText>
            </MpTableCell>
          </MpTableRow>
          <MpTableRow v-for="request in filteredRequests" :key="request.id">
            <MpTableCell as="td" :class="tightCell">
              <MpTextlink as="button" @click="openSubmission(request.id)">{{ typeLabelFor(request) }}</MpTextlink>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <MpText size="label" :class="valueText">{{ formatDate(request.submittedAt) }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <MpBadge for="tableStatus" :type="statusType(request.status)">{{ statusLabel(request.status) }}</MpBadge>
            </MpTableCell>
            <MpTableCell as="td" :class="actionCell">
              <MpButton variant="secondary" @click="openSubmission(request.id)">View details</MpButton>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>
  </div>
</template>
