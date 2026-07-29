<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Inbox / Awaiting approval / Goals

  Same page format as pages/inbox/notifications.vue, pixel-for-pixel: no page
  title (noPageHeader), stage flush to the top, resizable list column
  (384–576px) bordered on the right, identical row/empty-state styling. A
  scrollable, searchable list of requestors on the left; clicking one shows
  its full content on the right — no page navigation. Aggregates every
  pending goal submission across ALL goal cycles that the current persona is
  allowed to review (components/GoalApprovalQueue.vue stays cycle-scoped, on
  a single goal cycle's own "Awaiting approval" tab, and still navigates to
  the standalone review page — this Inbox view is the cross-cycle one).

  Reviewer scope: Super Admin sees every pending submission; a manager sees
  only their own direct reports' (EMPLOYEE_MANAGER) — same permission model
  as the submission review itself. The detail pane renders
  components/GoalSubmissionReview.vue, the exact same review body (one
  Approve/Not-approve decision for the whole batch, never goal-by-goal) used
  by the standalone page — no duplicate detail UI.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  css,
} from '@mekari/pixel3'
import { employeeById } from '~/utils/employees'
import type { Submission } from '~/composables/useGoalApprovalsStore'

definePageMeta({
  layout: 'default',
  boxed: true,
  noPageHeader: true,
})

const { currentUserId } = useCurrentUser()
const { cycles } = useGoalCyclesStore()
const { submissions } = useGoalApprovalsStore()

const cycleNameById = computed(() => new Map(cycles.value.map(c => [c.id, c.name])))

// "Goal progress update" has no real submissions yet — that feature isn't
// built anywhere in the app to produce one — but the filter already
// accounts for it so nothing here needs to change once it exists.
const TYPE_OPTIONS = ['Goal creation', 'Goal progress update', 'Goal update'] as const

function typeLabelFor(submission: Submission): string {
  return submission.items.some(i => i.type === 'create') ? 'Goal creation' : 'Goal update'
}

// "Awaiting approval" shows only what's genuinely pending the reviewer's
// decision — both approved and rejected batches drop off (a rejected one is
// now back with the employee to revise, no longer awaiting this reviewer), so
// the queue stays consistent rather than lingering rejected rows with no
// status. Scope to what this persona may act on: the Super Admin reviews
// everyone; a manager reviews only their direct reports.
const reviewableSubmissions = computed(() => submissions.value.filter((s) => {
  if (s.status !== 'pending') return false
  return isSuperAdmin(currentUserId.value) || EMPLOYEE_MANAGER[s.ownerId] === currentUserId.value
}))

const typeFilter = ref('')
const search = ref('')
const filteredSubmissions = computed(() => {
  let result = reviewableSubmissions.value
  if (typeFilter.value) result = result.filter(s => typeLabelFor(s) === typeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(s => (employeeById(s.ownerId)?.name ?? '').toLowerCase().includes(q))
  }
  return result.slice().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Selection — same pattern as pages/inbox/notifications.vue: auto-select
// the first row, and re-point at whatever's now first once the selected
// submission is approved and drops out of the list.
const selectedId = ref<string | null>(null)
watch(filteredSubmissions, (list) => {
  if (!list.some(s => s.id === selectedId.value)) selectedId.value = list[0]?.id ?? null
}, { immediate: true })

const selected = computed(() => filteredSubmissions.value.find(s => s.id === selectedId.value) ?? null)

function onApproved() {
  selectedId.value = filteredSubmissions.value.find(s => s.id !== selectedId.value)?.id ?? null
}

// ── Resizable list column — identical behavior to pages/inbox/notifications.vue:
// drag the right edge; min = default width (384px), max = +50% of that (576px).
const LIST_COLUMN_MIN_WIDTH = 384
const LIST_COLUMN_MAX_WIDTH = 576
const listColumnWidth = ref(LIST_COLUMN_MIN_WIDTH)
let resizeStartX = 0
let resizeStartWidth = 0
function onResizeMove(e: MouseEvent) {
  const next = resizeStartWidth + (e.clientX - resizeStartX)
  listColumnWidth.value = Math.min(LIST_COLUMN_MAX_WIDTH, Math.max(LIST_COLUMN_MIN_WIDTH, next))
}
function onResizeUp() {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeUp)
  document.body.style.removeProperty('cursor')
  document.body.style.removeProperty('user-select')
}
function onResizeDown(e: MouseEvent) {
  e.preventDefault()
  resizeStartX = e.clientX
  resizeStartWidth = listColumnWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeUp)
}

// ─── Styles — mirrors pages/inbox/notifications.vue's own classes exactly ───
const pageRoot = css({
  display: 'flex', flex: '1', minHeight: '0', width: '100%', background: 'background.neutral',
  borderLeftWidth: '1px', borderLeftStyle: 'solid', borderLeftColor: 'border.default',
})

const listColumn = css({ position: 'relative', flexShrink: '0', borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', minHeight: '0' })
const resizeHandle = css({
  position: 'absolute', top: '0', right: '-2px', bottom: '0', width: '4px',
  cursor: 'col-resize', zIndex: '1', background: 'transparent',
  _hover: { background: 'background.brand.bold' },
})
const listHeader = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingInline: '4', paddingTop: '6', paddingBottom: '3', flexShrink: '0' })
const listHeaderRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', paddingInline: '2' })
const listTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
// Minimal text+chevron trigger — same weight as the bulk-select dropdown in
// pages/inbox/notifications.vue (no border/box), not the heavier bordered
// select field GoalApprovalQueue.vue uses in its own cycle-scoped table.
const typeTrigger = css({
  display: 'inline-flex', alignItems: 'center', gap: '1',
  border: 'none', background: 'transparent', cursor: 'pointer', padding: '0',
  fontSize: '14px', color: 'text.secondary',
})

const listScroll = css({ flex: '1', minHeight: '0', overflowY: 'auto', paddingInline: '4', paddingBottom: '3' })
const emptyText = css({ paddingTop: '6', paddingInline: '2', color: 'text.secondary', fontSize: '14px' })

const requestRow = css({
  display: 'flex', flexDirection: 'column', gap: '1', width: '100%',
  paddingLeft: '2', paddingRight: '3', paddingBlock: '3', borderRadius: 'md',
  border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: '1',
})
const requestRowDefault = css({ background: 'transparent', _hover: { background: 'background.neutral.hovered' } })
const requestRowSelected = css({ background: 'background.brand.selected', _hover: { background: 'background.brand.selected' } })
const requestNameRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', width: '100%' })
const requestName = css({ flex: '1', minWidth: '0', fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
const requestDate = css({ flexShrink: '0', fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const requestCaption = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })

const blankSlate = css({ paddingBlock: '6', paddingInline: '2' })
const blankSlateIllustration = css({ flexShrink: '0' })
const blankSlateTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', textAlign: 'center' })
const blankSlateCaption = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary', textAlign: 'center' })

const detailColumn = css({ minWidth: '0', minHeight: '0', overflowY: 'auto' })
</script>

<template>
  <MpFlex :class="pageRoot">
    <!-- List column -->
    <MpFlex direction="column" :class="listColumn" :style="{ width: listColumnWidth + 'px' }">
      <div :class="listHeader">
        <div :class="listHeaderRow">
          <MpText :class="listTitle">Awaiting approval</MpText>
          <MpPopover is-close-on-select use-portal placement="bottom-end">
            <MpPopoverTrigger>
              <button type="button" :class="typeTrigger" aria-label="Filter by type">
                <span>{{ typeFilter || 'All types' }}</span>
                <MpIcon name="caret-down" size="sm" :class="css({ color: 'icon.default' })" />
              </button>
            </MpPopoverTrigger>
            <MpPopoverContent :class="css({ minWidth: '180px' })">
              <MpPopoverList>
                <MpPopoverListItem :is-active="!typeFilter" @click="typeFilter = ''">All types</MpPopoverListItem>
                <MpPopoverListItem v-for="opt in TYPE_OPTIONS" :key="opt" :is-active="opt === typeFilter" @click="typeFilter = opt">
                  {{ opt }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
        </div>
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search employee..." />
        </MpInputGroup>
      </div>

      <MpFlex direction="column" :class="listScroll">
        <button
          v-for="submission in filteredSubmissions"
          :key="submission.id"
          type="button"
          :class="[requestRow, submission.id === selectedId ? requestRowSelected : requestRowDefault]"
          @click="selectedId = submission.id"
        >
          <div :class="requestNameRow">
            <span :class="requestName">{{ employeeById(submission.ownerId)?.name ?? submission.ownerId }}</span>
            <span :class="requestDate">{{ formatDate(submission.submittedAt) }}</span>
          </div>
          <span :class="requestCaption">{{ employeeById(submission.ownerId)?.code }} · {{ employeeById(submission.ownerId)?.title }}</span>
          <span :class="requestCaption">{{ typeLabelFor(submission) }} · {{ cycleNameById.get(submission.cycleId) ?? '—' }}</span>
        </button>
        <span v-if="!filteredSubmissions.length" :class="emptyText">Nothing waiting on your approval right now.</span>
      </MpFlex>

      <div :class="resizeHandle" @mousedown="onResizeDown" />
    </MpFlex>

    <!-- Detail column -->
    <MpFlex direction="column" flex="1" :class="detailColumn">
      <GoalSubmissionReview
        v-if="selected"
        :cycle-id="selected.cycleId"
        :submission-id="selected.id"
        @approved="onApproved"
      />
      <MpFlex v-else direction="column" align="center" justify="center" gap="4" flex="1" :class="blankSlate">
        <svg :class="blankSlateIllustration" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g clip-path="url(#awaiting-approval-goals-empty-clip)">
            <path d="M47.2327 42.9924C47.5481 38.1597 47.7143 33.1437 47.7143 28C47.7143 26.6003 47.7022 25.2101 47.6779 23.8305C47.6325 21.2548 46.8058 18.7411 45.2277 16.7048C42.5173 13.2073 40.1043 10.7971 36.3693 7.95017C35.3274 7.15599 34.0556 6.72408 32.7459 6.69428C31.2465 6.66016 29.6793 6.64282 28.0001 6.64282C22.9382 6.64282 18.8948 6.8004 14.6558 7.10004C11.4901 7.32382 8.97429 9.84064 8.76749 13.0076C8.45193 17.8403 8.28577 22.8562 8.28577 28C8.28577 33.1437 8.45193 38.1597 8.76749 42.9924C8.97429 46.1595 11.4901 48.676 14.6558 48.8997C18.8948 49.1994 22.9382 49.3571 28.0001 49.3571C33.0619 49.3571 37.1053 49.1994 41.3443 48.8997C44.5101 48.676 47.026 46.1595 47.2327 42.9924Z" fill="white" />
            <path d="M47.5776 28.0002C47.5776 26.5932 47.5651 25.1957 47.5408 23.8089C47.4958 21.2468 46.6783 18.7458 45.1156 16.7148C42.4249 13.2171 40.0306 10.807 36.3273 7.96276C35.2828 7.16059 34.0047 6.72397 32.6881 6.69398L32.21 6.68372L31.7935 6.67578V18.6474C31.7935 20.4621 33.2636 21.8675 35.0779 21.9052C40.0214 22.008 47.5424 23.0628 47.5424 32.1062C47.5657 30.7474 47.5776 29.3784 47.5776 28.0002Z" fill="#F8F9FB" />
            <path d="M31.7935 6.96289V18.6464C31.7935 20.461 33.2636 21.8664 35.0779 21.9041C40.0214 22.0069 47.5654 23.2222 47.5654 32.2656" stroke="#8B95A5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15.6154 7.02548C15.2635 7.04844 14.9109 7.0724 14.557 7.09735C11.3691 7.32212 8.83743 9.84078 8.63063 13.0078C8.60835 13.3493 8.5868 13.6916 8.566 14.0349M15.6154 48.9743C15.2635 48.9517 14.9109 48.9277 14.557 48.9027C11.3691 48.678 8.83743 46.1591 8.63063 42.992C8.61805 42.7992 8.60569 42.606 8.59357 42.4128M24.0369 6.67562C25.2561 6.65385 26.524 6.64282 27.8632 6.64282C29.3543 6.64282 30.757 6.65649 32.1024 6.68345C32.2637 6.68668 32.4242 6.6901 32.5839 6.69371C33.9097 6.7237 35.1968 7.16033 36.2486 7.96249C39.9777 10.8067 42.3888 13.2168 45.0985 16.7145C46.6717 18.7455 47.4951 21.2466 47.5405 23.8086C47.5651 25.1954 47.5776 26.5929 47.5776 28C47.5776 29.3782 47.5654 30.7472 47.5421 32.1059M24.0369 49.3243C25.2561 49.3459 26.524 49.3571 27.8632 49.3571C29.3543 49.3571 30.757 49.3433 32.1024 49.3164M40.4193 48.954C40.6687 48.9375 40.9188 48.9201 41.1695 48.9027C44.3573 48.678 46.8889 46.1591 47.0959 42.992C47.1084 42.7992 47.1209 42.606 47.1327 42.4128M8.1801 24.1497C8.1594 25.4245 8.14893 26.7082 8.14893 28C8.14893 29.3782 8.16085 30.7472 8.18439 32.1059" stroke="#8B95A5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          </g>
          <defs>
            <clipPath id="awaiting-approval-goals-empty-clip">
              <rect width="46" height="46" fill="white" transform="translate(5 5)" />
            </clipPath>
          </defs>
        </svg>
        <MpFlex direction="column" gap="1">
          <span :class="blankSlateTitle">Select a request</span>
          <span :class="blankSlateCaption">Click any request on the left to view its details.</span>
        </MpFlex>
      </MpFlex>
    </MpFlex>
  </MpFlex>
</template>
