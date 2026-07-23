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
const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const emptyStateWrap = css({ paddingY: '16', textAlign: 'center' })
const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '12px', lineHeight: '20px', width: 'fit-content' } as const
const statusPending = css({ ...statusPillBase, background: 'gray.100', color: 'text.secondary' })
const statusApproved = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusRejected = css({ ...statusPillBase, background: 'red.50', color: 'red.700' })

function statusLabel(status: Submission['status']) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Awaiting approval'
}
function statusClass(status: Submission['status']) {
  if (status === 'approved') return statusApproved
  if (status === 'rejected') return statusRejected
  return statusPending
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
              <MpText size="label" :class="valueText">{{ typeLabelFor(request) }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <MpText size="label" :class="valueText">{{ formatDate(request.submittedAt) }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <span :class="statusClass(request.status)">{{ statusLabel(request.status) }}</span>
            </MpTableCell>
            <MpTableCell as="td" :class="actionCell">
              <MpTextlink @click="openSubmission(request.id)">View details</MpTextlink>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>
  </div>
</template>
