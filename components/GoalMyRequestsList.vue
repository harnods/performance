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
import { isCreateLikeItem, type Submission } from '~/composables/useGoalApprovalsStore'

const props = defineProps<{ cycleId: string }>()
const router = useRouter()

const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === props.cycleId))
const { submissions } = useGoalApprovalsStore(props.cycleId)
const { currentUserId } = useCurrentUser()

const TYPE_OPTIONS = ['Create goal', 'Edit goal', 'Update goal progress', 'Close goal', 'Delete goal'] as const
const TYPE_LABEL = { create: 'Create goal', edit: 'Edit goal', progress: 'Update goal progress', delete: 'Delete goal', close: 'Close goal' } as const

// A close is submitted as an edit that only flips isClosed → label it "Close goal".
function isCloseOnly(item: Submission['items'][number]): boolean {
  const b = item.before as Record<string, unknown> | undefined
  const a = item.after as Record<string, unknown> | undefined
  return item.type === 'edit' && !!a && !b?.isClosed && !!a.isClosed
}

// A progress-only edit touches just the goal's value/progress, not its
// definition — so it reads as "Update goal progress" rather than "Edit goal".
function isProgressOnly(item: Submission['items'][number]): boolean {
  const b = item.before as Record<string, unknown> | undefined
  const a = item.after as Record<string, unknown> | undefined
  if (item.type !== 'edit' || !b || !a) return false
  const defKeys = ['title', 'weight', 'category', 'subCategory', 'code', 'level', 'unit', 'min', 'max']
  const defSame = defKeys.every(k => b[k] === a[k])
  const progressChanged = b.value !== a.value || b.pill !== a.pill
  return defSame && progressChanged
}
function typeLabelFor(submission: Submission): string {
  // A published draft (an `edit` that just clears isDraft) counts as a
  // creation, same as a literal `create` item — see isCreateLikeItem.
  if (submission.items.some(isCreateLikeItem)) return TYPE_LABEL.create
  const types = submission.items.map(i => i.type)
  const edits = submission.items.filter(i => i.type === 'edit')
  if (edits.length && edits.every(isCloseOnly)) return TYPE_LABEL.close
  if (edits.length && edits.every(isProgressOnly)) return TYPE_LABEL.progress
  if (types.includes('edit')) return TYPE_LABEL.edit
  return TYPE_LABEL.delete
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

// ─── Column sort (PxColumnSortMenu). sortKey '' = default (submittedAt desc). ─
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = { type: 'text', date: 'date', status: 'text' }
function sortValue(s: Submission, key: string): string {
  if (key === 'type') return typeLabelFor(s)
  if (key === 'date') return s.submittedAt
  if (key === 'status') return statusLabel(s.status)
  return ''
}
const sortedRequests = computed(() => {
  if (!sortKey.value) return filteredRequests.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filteredRequests.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })

// ─── Styles — mirrors GoalApprovalQueue.vue's own filter-bar + table classes.
const wrap = css({ display: 'flex', flexDirection: 'column', gap: '6' })
const typeFieldClass = css({ width: '200px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
// Golden rule: 8px top/bottom on every cell. Every column here is a single line
// (Type / Date / Status badge / action button) → whole table verticalAlign middle.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '1%', whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const emptyStateWrap = css({ paddingY: '16', textAlign: 'center' })
// Full empty state (no requests at all) — follows docs/empty-state.md.
const emptyStateFull = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })

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
    <!-- Empty state: the viewer has no requests in this cycle at all -->
    <MpFlex v-if="myRequests.length === 0" direction="column" align="center" justify="center" gap="4" :class="emptyStateFull">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
        <MpText :class="emptyTitle">No requests yet</MpText>
        <MpText size="label" :class="captionText">Requests you submit — creating, editing, or updating goals — will appear here.</MpText>
      </MpFlex>
    </MpFlex>

    <template v-else>
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
            <MpTableCell as="th" class="gmr-sort-th" :class="headCell">
              <span :class="thInner"><span>Type</span><PxColumnSortMenu col-key="type" :sort-type="columnSortTypes.type" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="gmr-sort-th" :class="headCell">
              <span :class="thInner"><span>Date</span><PxColumnSortMenu col-key="date" :sort-type="columnSortTypes.date" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="gmr-sort-th" :class="headCell">
              <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" :class="[headCell, actionHead]" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-if="filteredRequests.length === 0">
            <MpTableCell as="td" colspan="4" :class="[tightCell, emptyStateWrap]">
              <MpText size="label" :class="captionText">No requests match this filter.</MpText>
            </MpTableCell>
          </MpTableRow>
          <MpTableRow v-for="request in sortedRequests" :key="request.id">
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
    </template>
  </div>
</template>

<style scoped>
/* Reveal the column sort icon on header hover — UNLAYERED (see goal-cycles/index.vue). */
.gmr-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
