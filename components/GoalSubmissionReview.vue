<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal submission review (shared)

  Reached from both pages/goals/goal-cycles/[id]/awaiting-approval/[submissionId].vue
  (standalone page) and pages/inbox/awaiting-approval/goals.vue (Inbox split
  view) — one shared review body so both surfaces stay identical.

  Table format matches Figma node 6696:2661 (the same rowspan-merged-Category
  table shape as pages/goals/goal-cycles/[id]/company-goals.vue's own "All
  goals" table, built via utils/goalRows.ts's sortByCategory/withRowSpans):
  Category (merged, with summed weight) | Sub-category | Goal | Goal type |
  Goal weight | row actions. Edit items show a before → after strikethrough
  wherever the submitted change touches a shown column. A "Total weight"
  footer row always sums every item's weight — 100% is what makes a
  "create" bundle valid (the "New goals" page itself blocks Save short of
  that), so a batch that doesn't hit it is flagged in red rather than hidden.

  Callers decide what happens after an approval (redirect vs. stay in
  place) via the `approved` emit; rejection never navigates anywhere in
  either caller, so it needs no emit.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpIcon,
  MpAvatar,
  MpTextarea,
  MpFormControl,
  MpFormLabel,
  MpTableContainer,
  MpTable,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpTooltip,
  MpBadge,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  css,
  toast,
} from '@mekari/pixel3'
import { employeeById, employeeMeta } from '~/utils/employees'
import { LEVEL_TO_GOAL_TYPE_LABEL } from '~/utils/goalMapping'
import { sortByCategory, withRowSpans } from '~/utils/goalRows'
import { CURRENCY_OPTIONS } from '~/utils/goalTaxonomy'
import type { GoalLevel, GoalUnit } from '~/composables/useGoalsStore'
import type { SubmissionItem, SubmissionStatus } from '~/composables/useGoalApprovalsStore'

// `padded` is false for the standalone review page — its own (non-boxed)
// layout already wraps every page in a 24px-padded white stage, so this
// component's own edge padding would double up with it. The Inbox split
// view opts out of that layout padding (`boxed: true`) precisely because
// it needs this component to supply its own, so it keeps the default.
const props = withDefaults(defineProps<{ cycleId: string, submissionId: string, padded?: boolean }>(), { padded: true })
const emit = defineEmits<{ approved: [] }>()

const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === props.cycleId))
const { submissionById, approveSubmission, rejectSubmission, resubmitSubmission } = useGoalApprovalsStore(props.cycleId)
const { currentUserId } = useCurrentUser()
const { addNotification } = useInboxNotificationsStore()

const submission = computed(() => submissionById(props.submissionId))
const owner = computed(() => (submission.value ? employeeById(submission.value.ownerId) : undefined))
// Approve/Reject is Super Admin (reviews everyone) or the submission owner's
// own manager (reviews their direct reports); Resubmit is the submitter's
// own action after a rejection — everyone else sees a read-only status line.
const isReviewer = computed(() =>
  isSuperAdmin(currentUserId.value)
  || (!!submission.value && EMPLOYEE_MANAGER[submission.value.ownerId] === currentUserId.value),
)
const isOwnerViewing = computed(() => submission.value?.ownerId === currentUserId.value)
// The submission's actual reviewer is its owner's manager (or the Super
// Admin, for owners with no manager on record) — used for the read-only
// "Awaiting approval from ..." line shown to everyone else.
const reviewerName = computed(() => {
  const managerId = submission.value ? EMPLOYEE_MANAGER[submission.value.ownerId] : undefined
  return (managerId && employeeById(managerId)?.name) || employeeById('rizal')?.name || 'the Super Admin'
})

function goalTypeLabel(level: GoalLevel) {
  return LEVEL_TO_GOAL_TYPE_LABEL[level] ?? level
}

// ─── Table rows — one row per submission item, grouped/merged by Category
// (then Sub-category) exactly like company-goals.vue's own goals table, via
// the same shared utils/goalRows.ts helpers. `groupByOwner: false` because
// every item here always belongs to the same single submission owner
// anyway, so there's nothing to separate.
interface ReviewRow {
  id: string
  itemId: string
  itemType: SubmissionItem['type']
  ownerId: string
  category: string
  subCategory: string
  code: string
  title: string
  weight: number
  level: GoalLevel
  beforeCategory?: string
  beforeSubCategory?: string
  beforeTitle?: string
  beforeWeight?: number
  // Accordion detail fields — a goal created outside the "New goals" flow
  // (every legacy seed goal) simply has none of these set, same as the real
  // Goal record it's built from; the panel falls back to the same defaults
  // draftFromGoal itself uses (direction 'higher', repeat false, schedule =
  // the goal cycle's own dates) rather than showing them as unset.
  description?: string
  startDate?: string
  endDate?: string
  repeat?: boolean
  unit?: GoalUnit
  currency?: string
  min?: number
  max?: number
  deadlineDate?: string
  direction?: 'higher' | 'lower'
  contributorIds: string[]
  viewerIds: string[]
}
const baseRows = computed<ReviewRow[]>(() => {
  if (!submission.value) return []
  return submission.value.items.map((item) => {
    const current = (item.after ?? item.before)!
    const before = item.type === 'edit' ? item.before : undefined
    return {
      id: item.id,
      itemId: item.id,
      itemType: item.type,
      ownerId: item.ownerId,
      category: current.category,
      subCategory: current.subCategory,
      code: current.code,
      title: current.title,
      weight: current.weight,
      level: current.level,
      beforeCategory: before && before.category !== current.category ? before.category : undefined,
      beforeSubCategory: before && before.subCategory !== current.subCategory ? before.subCategory : undefined,
      beforeTitle: before && before.title !== current.title ? before.title : undefined,
      beforeWeight: before && before.weight !== current.weight ? before.weight : undefined,
      description: current.description,
      startDate: current.startDate,
      endDate: current.endDate,
      repeat: current.repeat,
      unit: current.unit,
      currency: current.currency,
      min: current.min,
      max: current.max,
      deadlineDate: current.deadlineDate,
      direction: current.direction,
      contributorIds: current.contributorIds ?? [],
      viewerIds: current.viewerIds ?? [],
    }
  })
})
const tableRows = computed(() => withRowSpans(sortByCategory(baseRows.value, { groupByOwner: false }), { groupByOwner: false }))

// ─── Accordion — "View details" (Figma node 6700:3203) expands in place
// inside the Goal cell's own column, right below the goal title — it isn't
// a separate table row, so Category/Sub-category's rowspan needs no
// adjustment; the cell (and whatever rowspan cell overlaps it) just grows
// taller like any other cell whose content grows.
const expandedItemIds = reactive<Record<string, boolean>>({})
function toggleExpand(itemId: string) {
  expandedItemIds[itemId] = !expandedItemIds[itemId]
}

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}
function goalScheduleLabel(row: ReviewRow): string {
  const start = row.startDate || cycle.value?.startDate
  const end = row.endDate || cycle.value?.endDate
  if (!start || !end) return '—'
  const range = `${formatDate(start)} – ${formatDate(end)}`
  return row.repeat ? `${range} · Repeats` : range
}
function formatMeasurementValue(row: ReviewRow, val?: number): string {
  const v = val ?? 0
  if (row.unit === 'currency') {
    const symbol = CURRENCY_OPTIONS.find(c => c.value === (row.currency ?? 'IDR'))?.symbol ?? 'Rp'
    return `${symbol}${formatNumber(v)}`
  }
  if (row.unit === 'percent') return `${v}%`
  return formatNumber(v)
}
function directionLabel(direction?: 'higher' | 'lower'): string {
  return direction === 'lower' ? 'Lower is better' : 'Higher is better'
}
// Deadline goals have no baseline/target scale, and legacy goals seeded
// outside the "New goals" flow carry no unit at all — both fall outside
// what the Figma reference (a plain percent goal) shows, so they get their
// own plain-text line rather than a fabricated Start/Target/Direction.
function measurementLines(row: ReviewRow): string[] {
  if (row.unit === 'deadline') return [`Deadline date: ${row.deadlineDate ? formatDate(row.deadlineDate) : '—'}`]
  if (!row.unit) return ['Completion goal — no numeric target.']
  return [
    `Start value: ${formatMeasurementValue(row, row.min)}`,
    `Target value: ${formatMeasurementValue(row, row.max)}`,
    `Goal direction: ${directionLabel(row.direction)}`,
  ]
}

// A "create" bundle's weights only make sense as one coherent 100% set (the
// "New goals" page itself blocks Save short of that) — shown for every
// batch regardless of type mix, flagged red whenever it doesn't hit 100%.
const totalWeight = computed(() => submission.value?.items.reduce((sum, i) => sum + (i.after?.weight ?? i.before?.weight ?? 0), 0) ?? 0)

// ─── Per-goal accept — the reviewer checks off each goal individually
// before the batch itself can be approved (still ONE commit for the whole
// batch, never goal-by-goal — this is a review checklist gate, not a
// per-goal decision). Resets whenever a different submission is opened, so
// stale accept-state never leaks across rows from the last one reviewed.
const acceptedItemIds = reactive<Record<string, boolean>>({})
watch(() => props.submissionId, () => {
  for (const key of Object.keys(acceptedItemIds)) delete acceptedItemIds[key]
  for (const key of Object.keys(expandedItemIds)) delete expandedItemIds[key]
})
function toggleAccept(itemId: string) {
  acceptedItemIds[itemId] = !acceptedItemIds[itemId]
}
const allAccepted = computed(() => !!submission.value && submission.value.items.every(i => acceptedItemIds[i.id]))
// Header checkmark — accepts every row in one click; clicking again while
// everything's already accepted un-accepts everything, same toggle
// semantics as a table's own "select all" checkbox.
function toggleAcceptAll() {
  if (!submission.value) return
  const nextValue = !allAccepted.value
  for (const item of submission.value.items) acceptedItemIds[item.id] = nextValue
}
// Sum of just the accepted rows' own weight — lets the reviewer see how much
// of the batch's total they've actually reviewed so far (e.g. "45% / 100%"),
// separate from whether the batch's own authored weight is valid.
const acceptedWeight = computed(() => submission.value?.items.reduce((sum, i) => (acceptedItemIds[i.id] ? sum + (i.after?.weight ?? i.before?.weight ?? 0) : sum), 0) ?? 0)

// Reject reason is typed inline before it's confirmed — rejectSubmission
// only gets called once the manager confirms, so a half-typed reason
// never silently counts as a decision.
const showRejectInput = ref(false)
const rejectDraftReason = ref('')

function markApprove() {
  if (!submission.value) return
  if (!allAccepted.value) {
    toast.notify({
      id: 'submission-approve-blocked',
      position: 'top-center',
      variant: 'error',
      title: 'Accept every goal before approving',
    })
    return
  }
  approveSubmission(submission.value.id)
  toast.notify({
    id: 'submission-approved',
    position: 'top-center',
    variant: 'success',
    title: 'Submission approved',
  })
  emit('approved')
}
function startRequestRevision() {
  showRejectInput.value = true
}
function cancelRequestRevision() {
  showRejectInput.value = false
  rejectDraftReason.value = ''
}
function confirmRequestRevision() {
  if (!submission.value) return
  const reason = rejectDraftReason.value.trim()
  if (!reason) return
  const notAccepted = submission.value.items.filter(i => !acceptedItemIds[i.id]).map(i => (i.after ?? i.before)!.title)
  rejectSubmission(submission.value.id, reason)
  showRejectInput.value = false
  const flaggedGoals = notAccepted.length ? notAccepted.join(', ') : submission.value.items.map(i => (i.after ?? i.before)!.title).join(', ')
  addNotification({
    recipientId: submission.value.ownerId,
    group: 'Today',
    title: 'Goal revision requested',
    timeLabel: 'Just now',
    summary: `${employeeById(currentUserId.value)?.name ?? 'Your reviewer'} has requested changes to your goal submission for ${cycle.value?.name ?? 'this cycle'}.`,
    senderName: 'Mekari Talenta',
    senderTimestamp: '10 Jun 2026, 09:00',
    body: `${employeeById(currentUserId.value)?.name ?? 'Your reviewer'} has requested changes to your goal submission for ${cycle.value?.name ?? 'this cycle'}. Please revise and resubmit.`,
    details: [
      { label: 'Goals needing revision', value: flaggedGoals },
      { label: 'Reason', value: reason },
    ],
    actions: [{ label: 'View submission', variant: 'primary', to: `/goals/goal-cycles/${submission.value.cycleId}/awaiting-approval/${submission.value.id}` }],
  })
}
function resubmit() {
  if (!submission.value) return
  resubmitSubmission(submission.value.id)
  toast.notify({
    id: 'submission-resubmitted',
    position: 'top-center',
    variant: 'success',
    title: 'Resubmitted for approval',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Header padding/border exactly mirrors pages/inbox/notifications.vue's own
// detailHeader (self-padded, full-width border-bottom) — the body below is
// a plain data table, so unlike notifications' prose detailBody it carries
// no maxWidth constraint, sized by its own columns instead.
// Scrolls away with the table as part of the same block (not sticky) — the
// submission's own identity (owner, when, which cycle, current status) is
// context you read once, not a header you keep referring to while scrolling.
// Content-list layout — label left, value right on each row — replacing the
// old avatar/name header card.
const headerCardBase = { display: 'flex', flexDirection: 'column', gap: '4', paddingBottom: '4', background: 'background.neutral', flexShrink: '0' } as const
// Padded: this component supplies its own edge padding (Inbox split view,
// whose `boxed: true` layout gives it none). Flat: the caller's own layout
// already padded the stage 24px, so adding another layer here would double
// up with it (the standalone review page's own case).
const headerCardPadded = css({ ...headerCardBase, paddingInline: '6', paddingTop: '6' })
const headerCardFlat = css({ ...headerCardBase, paddingInline: '0', paddingTop: '0' })
// Exactly mirrors pages/reviews/review-cycles/[id]/index.vue's own cycle
// info panel: a fixed 200px label column (never pushed to the far right)
// + value in the remaining space, both `size="label"`, differentiated only
// by color (text.secondary vs text.default) — not by size.
const summaryRow = css({ display: 'flex', alignItems: 'flex-start', gap: '4' })
const summaryLabelCol = css({ width: '200px', flexShrink: '0' })
const summaryLabel = css({ color: 'text.secondary' })
const summaryValue = css({ color: 'text.default' })
const bodyWrapPadded = css({ paddingInline: '6', paddingBlock: '5' })
const bodyWrapFlat = css({ paddingBlock: '5' })
const nameText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const dangerText = css({ color: 'text.danger' })
const beforeValueText = css({ color: 'text.secondary', textDecoration: 'line-through' })

// ─── Table — same shape/classes as company-goals.vue's own rowspan-merged
// goals table (tableOuterBorder + colDivider convention: every column gets
// a right border except the last, so a merged cell always has something to
// lean on and no boundary ever doubles up).
const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '944px' })
const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const colCategory = css({ width: '144px' })
const colSubCategory = css({ width: '160px' })
const colGoal = css({ width: '320px' })
const colGoalType = css({ width: '160px' })
const colWeight = css({ width: '108px' })
const actionHead = css({ width: '108px', paddingLeft: '0', paddingRight: '2', whiteSpace: 'nowrap', textAlign: 'right' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', paddingLeft: '0', paddingRight: '2', width: '108px', whiteSpace: 'nowrap', verticalAlign: 'top' })
// Label + checkmark on one right-aligned line; the "Accepted" label shows once a row is accepted.
const actionCellInner = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1', width: '100%' })
const acceptedLabel = css({ color: 'green.700', whiteSpace: 'nowrap' })
// Matches MpTable's own default (non-narrow) th/td padding (paddingY: '4')
// per the Pixel3 spec — a flatter '2' reads as the narrow/dense table
// variant, which made single-line rows (e.g. Goal type) look too short.
const cellPad = css({ paddingTop: '4', paddingBottom: '4', verticalAlign: 'top' })
const cellContent = css({ minWidth: '0', width: '100%', whiteSpace: 'normal', overflowWrap: 'break-word' })
const headerLabel = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const goalCode = css({ fontSize: '10px', fontWeight: '600', color: 'text.secondary', lineHeight: '12px' })
const deleteTag = css({
  display: 'inline-flex', alignItems: 'center', borderRadius: 'sm', paddingInline: '1.5', paddingBlock: '0.5',
  fontSize: '12px', fontWeight: '600', width: 'fit-content', background: 'red.50', color: 'red.700',
})
const totalRowBg = css({ background: 'background.neutral.subtle' })
const totalRowCell = css({ paddingTop: '10px', paddingBottom: '10px', verticalAlign: 'top' })
const chevronIcon = css({ color: 'text.secondary', flexShrink: '0' })

// Accordion (Figma node 6700:3203) — a "View details" toggle sitting right
// under the goal title, opening an indented content list in place. Matches
// the reference exactly: caret + 12px label, then a 24px-indented stack of
// label (12px secondary) / value (14px default) blocks, each with its own
// 8px vertical padding.
const accordionToggle = css({
  display: 'inline-flex', alignItems: 'center', gap: '2',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
})
const accordionToggleText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.default' })
const accordionBody = css({ paddingLeft: '6', width: '100%' })
const contentBlock = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingBlock: '2', width: '100%' })
const measurementLinesWrap = css({ display: 'flex', flexDirection: 'column', gap: '0', width: '100%' })

// Goal member / Goal contributor — overlapping avatar stack (hand-rolled
// rather than MpAvatarGroup, since that component clones its direct
// children to inject size/spacing/border, which breaks once each avatar is
// wrapped in its own MpPopover trigger for the hover coachmark below).
const avatarStack = css({ display: 'flex', alignItems: 'center' })
const avatarStackItem = css({ position: 'relative', display: 'flex' })
const avatarRing = css({ display: 'flex', borderRadius: 'full', borderWidth: '2px', borderStyle: 'solid', borderColor: 'background.surface' })
// Coachmark (Figma-unspecified, mirrors Google Chat's avatar hover card) —
// avatar, name, then employeeMeta()'s own "code | title | department" line,
// the same identity format already used everywhere else in this app
// (e.g. AddGoalDrawer.vue's personRow/personMeta).
const hoverCard = css({ display: 'flex', alignItems: 'center', gap: '3', padding: '3' })
const hoverCardName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const hoverCardMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const acceptBtn = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px',
  border: 'none', borderRadius: 'md', cursor: 'pointer',
})
// Idle vs. active are mutually exclusive — never applied together — since
// both set `background`/`color` and Panda's atomic classes don't reliably
// override each other by array order the way normal cascade rules would.
const acceptBtnIdle = css({ background: 'transparent', color: 'gray.100', _hover: { background: 'background.neutral.hovered' } })
const acceptBtnActive = css({ background: 'green.50', color: 'green.700', _hover: { background: 'green.50' } })

const decisionBlock = css({ marginTop: '6' })

function submissionStatusLabel(status: SubmissionStatus): string {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Revision requested'
  return 'Awaiting approval'
}
// "Awaiting approval" always reads as the warning/yellow tone — it's a
// pending decision, not a settled/good or settled/bad one.
function submissionStatusType(status: SubmissionStatus): 'completed' | 'critical' | 'warning' {
  if (status === 'approved') return 'completed'
  if (status === 'rejected') return 'critical'
  return 'warning'
}
</script>

<template>
  <div>
    <template v-if="!submission">
      <div :class="padded ? bodyWrapPadded : bodyWrapFlat">
        <MpText :class="captionText">This submission no longer exists.</MpText>
      </div>
    </template>
    <template v-else>
      <div :class="padded ? headerCardPadded : headerCardFlat">
        <div :class="summaryRow">
          <MpText size="label" :class="[summaryLabel, summaryLabelCol]">Goal owner</MpText>
          <MpText size="label" :class="summaryValue">{{ owner?.name ?? submission.ownerId }}</MpText>
        </div>
        <div :class="summaryRow">
          <MpText size="label" :class="[summaryLabel, summaryLabelCol]">Submitted date</MpText>
          <MpText size="label" :class="summaryValue">{{ formatDate(submission.submittedAt) }}</MpText>
        </div>
        <div :class="summaryRow">
          <MpText size="label" :class="[summaryLabel, summaryLabelCol]">Goal cycle</MpText>
          <MpText size="label" :class="summaryValue">{{ cycle?.name }} · {{ cycle?.period }}</MpText>
        </div>
        <div :class="summaryRow">
          <MpText size="label" :class="[summaryLabel, summaryLabelCol]">Status</MpText>
          <MpBadge for="tableStatus" :type="submissionStatusType(submission.status)">{{ submissionStatusLabel(submission.status) }}</MpBadge>
        </div>
      </div>

      <div :class="padded ? bodyWrapPadded : bodyWrapFlat">
        <div :class="tableOuterBorder">
          <MpTableContainer>
            <MpTable :is-hoverable="false" :class="fixedTable">
              <colgroup>
                <col :class="colCategory">
                <col :class="colSubCategory">
                <col :class="colGoal">
                <col :class="colGoalType">
                <col :class="colWeight">
                <col :class="actionHead">
              </colgroup>
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" :class="[colDivider, colCategory]"><span :class="headerLabel">Category</span></MpTableCell>
                  <MpTableCell as="th" :class="[colDivider, colSubCategory]"><span :class="headerLabel">Sub-category</span></MpTableCell>
                  <MpTableCell as="th" :class="[colDivider, colGoal]"><span :class="headerLabel">Goal</span></MpTableCell>
                  <MpTableCell as="th" :class="[colDivider, colGoalType]"><span :class="headerLabel">Goal type</span></MpTableCell>
                  <MpTableCell as="th" :class="[colDivider, colWeight]"><span :class="headerLabel">Goal weight</span></MpTableCell>
                  <MpTableCell as="th" :class="actionHead">
                    <MpTooltip v-if="submission.status === 'pending'" :label="allAccepted ? 'Un-accept all' : 'Accept all'" use-portal>
                      <button
                        type="button"
                        :class="[acceptBtn, allAccepted ? acceptBtnActive : acceptBtnIdle]"
                        :aria-label="allAccepted ? 'Un-accept all — click to un-accept every goal' : 'Accept all goals'"
                        @click="toggleAcceptAll"
                      >
                        <MpIcon name="check" size="sm" />
                      </button>
                    </MpTooltip>
                  </MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="row in tableRows" :key="row.id">
                  <MpTableCell v-if="row.showCategory" as="td" :rowspan="row.categoryRowspan" :class="[cellPad, colDivider, colCategory]">
                    <MpFlex direction="column" gap="0" :class="cellContent">
                      <MpText size="label" :class="[nameText, cellContent]">{{ row.category }}</MpText>
                      <MpText size="label-small" :class="captionText">Weight: {{ row.categoryWeight }}%</MpText>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell v-if="row.showSubCategory" as="td" :rowspan="row.subCategoryRowspan" :class="[cellPad, colDivider, colSubCategory]">
                    <MpFlex direction="column" gap="0" :class="cellContent">
                      <MpText v-if="row.beforeSubCategory" size="label-small" :class="beforeValueText">{{ row.beforeSubCategory }}</MpText>
                      <MpText size="label" :class="[nameText, cellContent]">{{ row.subCategory }}</MpText>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[cellPad, colDivider, colGoal]">
                    <MpFlex direction="column" gap="2" :class="cellContent">
                      <MpFlex direction="column" gap="1" :class="cellContent">
                        <span v-if="row.itemType === 'delete'" :class="deleteTag">Delete</span>
                        <span :class="goalCode">{{ row.code }}</span>
                        <MpText v-if="row.beforeTitle" size="label" :class="beforeValueText">{{ row.beforeTitle }}</MpText>
                        <MpText size="label" :class="[nameText, cellContent]">{{ row.title }}</MpText>
                      </MpFlex>

                      <!-- Accordion (Figma 6700:3203) — "View details" toggle
                           right under the title, expanding an indented
                           content list in place. -->
                      <MpFlex direction="column" gap="0" :class="cellContent">
                        <button type="button" :class="accordionToggle" @click="toggleExpand(row.itemId)">
                          <MpIcon :name="expandedItemIds[row.itemId] ? 'caret-down' : 'caret-right'" size="sm" :class="chevronIcon" />
                          <span :class="accordionToggleText">View details</span>
                        </button>

                        <div v-if="expandedItemIds[row.itemId]" :class="accordionBody">
                          <MpFlex direction="column" gap="0" :class="cellContent">
                            <div :class="contentBlock">
                              <MpText size="label-small" :class="captionText">Goal description</MpText>
                              <MpText size="label" :class="nameText">{{ row.description || '--' }}</MpText>
                            </div>
                            <div :class="contentBlock">
                              <MpText size="label-small" :class="captionText">Goal schedule</MpText>
                              <MpText size="label" :class="nameText">{{ goalScheduleLabel(row) }}</MpText>
                            </div>
                            <div :class="contentBlock">
                              <MpText size="label-small" :class="captionText">Goal measurement</MpText>
                              <div :class="measurementLinesWrap">
                                <MpText v-for="line in measurementLines(row)" :key="line" size="label" :class="nameText">{{ line }}</MpText>
                              </div>
                            </div>
                            <div :class="contentBlock">
                              <MpText size="label-small" :class="captionText">Goal member</MpText>
                              <div v-if="row.viewerIds.length" :class="avatarStack">
                                <div v-for="(id, idx) in row.viewerIds" :key="id" :class="avatarStackItem" :style="{ marginLeft: idx === 0 ? '0' : '-8px', zIndex: row.viewerIds.length - idx }">
                                  <MpPopover trigger="hover" use-portal placement="top">
                                    <MpPopoverTrigger>
                                      <div :class="avatarRing"><MpAvatar size="md" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" variant-color="gray" /></div>
                                    </MpPopoverTrigger>
                                    <MpPopoverContent>
                                      <div :class="hoverCard">
                                        <MpAvatar size="lg" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" variant-color="gray" />
                                        <MpFlex direction="column" gap="0">
                                          <span :class="hoverCardName">{{ employeeById(id)?.name }}</span>
                                          <span :class="hoverCardMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                                        </MpFlex>
                                      </div>
                                    </MpPopoverContent>
                                  </MpPopover>
                                </div>
                              </div>
                              <MpText v-else size="label" :class="nameText">--</MpText>
                            </div>
                            <div :class="contentBlock">
                              <MpText size="label-small" :class="captionText">Goal contributor</MpText>
                              <div v-if="row.contributorIds.length" :class="avatarStack">
                                <div v-for="(id, idx) in row.contributorIds" :key="id" :class="avatarStackItem" :style="{ marginLeft: idx === 0 ? '0' : '-8px', zIndex: row.contributorIds.length - idx }">
                                  <MpPopover trigger="hover" use-portal placement="top">
                                    <MpPopoverTrigger>
                                      <div :class="avatarRing"><MpAvatar size="md" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" variant-color="gray" /></div>
                                    </MpPopoverTrigger>
                                    <MpPopoverContent>
                                      <div :class="hoverCard">
                                        <MpAvatar size="lg" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" variant-color="gray" />
                                        <MpFlex direction="column" gap="0">
                                          <span :class="hoverCardName">{{ employeeById(id)?.name }}</span>
                                          <span :class="hoverCardMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                                        </MpFlex>
                                      </div>
                                    </MpPopoverContent>
                                  </MpPopover>
                                </div>
                              </div>
                              <MpText v-else size="label" :class="nameText">--</MpText>
                            </div>
                          </MpFlex>
                        </div>
                      </MpFlex>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[cellPad, colDivider, colGoalType]">
                    <MpText size="label" :class="[nameText, cellContent]">{{ goalTypeLabel(row.level) }}</MpText>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[cellPad, colDivider, colWeight]">
                    <MpFlex direction="column" gap="0">
                      <MpText v-if="row.beforeWeight !== undefined" size="label-small" :class="beforeValueText">{{ row.beforeWeight }}%</MpText>
                      <MpText size="label" :class="nameText">{{ row.weight }}%</MpText>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="td" :class="actionCell">
                    <div v-if="submission.status === 'pending'" :class="actionCellInner">
                      <MpText v-if="acceptedItemIds[row.itemId]" size="label" :class="acceptedLabel">Accepted</MpText>
                      <MpTooltip :label="acceptedItemIds[row.itemId] ? 'Un-accept' : 'Accept'" use-portal>
                        <button
                          type="button"
                          :class="[acceptBtn, acceptedItemIds[row.itemId] ? acceptBtnActive : acceptBtnIdle]"
                          :aria-label="acceptedItemIds[row.itemId] ? 'Accepted — click to un-accept' : 'Accept'"
                          @click="toggleAccept(row.itemId)"
                        >
                          <MpIcon name="check" size="sm" />
                        </button>
                      </MpTooltip>
                    </div>
                  </MpTableCell>
                </MpTableRow>

                <!-- Total weight — a "create" bundle's own weights only add up
                     to 100% together; flagged red whenever a batch doesn't. -->
                <MpTableRow :class="totalRowBg">
                  <MpTableCell as="td" colspan="4" :class="totalRowCell">
                    <MpText size="label" weight="semiBold" :class="nameText">Total weight</MpText>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[totalRowCell, colDivider]">
                    <MpText size="label" weight="semiBold" :class="totalWeight === 100 ? nameText : dangerText">
                      <template v-if="submission.status === 'pending'">{{ acceptedWeight }}% / {{ totalWeight }}%</template>
                      <template v-else>{{ totalWeight }}%</template>
                    </MpText>
                  </MpTableCell>
                  <MpTableCell as="td" />
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </div>

        <!-- One decision for the whole batch — never per goal. Approve is
             blocked (toast, not a disabled button) until every row above is
             individually accepted. -->
        <div :class="decisionBlock">
          <template v-if="isReviewer && submission.status === 'pending'">
            <MpFlex v-if="!showRejectInput" align="center" justify="flex-end" gap="2">
              <MpButton variant="ghost" @click="startRequestRevision">Request revision</MpButton>
              <MpButton variant="primary" @click="markApprove">Approve</MpButton>
            </MpFlex>
            <MpFlex v-else direction="column" gap="2">
              <MpFormControl>
                <MpFormLabel>Reason</MpFormLabel>
                <MpTextarea v-model="rejectDraftReason" placeholder="Let them know what needs to change..." />
              </MpFormControl>
              <MpFlex align="center" justify="flex-end" gap="2">
                <MpButton variant="ghost" @click="cancelRequestRevision">Cancel</MpButton>
                <MpButton variant="danger" :is-disabled="!rejectDraftReason.trim()" @click="confirmRequestRevision">Send revision request</MpButton>
              </MpFlex>
            </MpFlex>
          </template>

          <template v-else-if="isOwnerViewing && submission.status === 'rejected'">
            <MpText size="label-small" :class="[dangerText, css({ display: 'block', marginBottom: '3' })]">Reason: {{ submission.rejectReason }}</MpText>
            <MpButton variant="primary" @click="resubmit">Resubmit for approval</MpButton>
          </template>

          <template v-else-if="submission.status === 'pending'">
            <MpText size="label" :class="captionText">Awaiting approval from {{ reviewerName }}.</MpText>
          </template>

          <template v-else-if="submission.status === 'rejected'">
            <MpText size="label-small" :class="[dangerText, css({ display: 'block' })]">Revision requested — reason: {{ submission.rejectReason }}</MpText>
          </template>

          <template v-else>
            <MpText size="label" :class="captionText">This submission has already been approved.</MpText>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
