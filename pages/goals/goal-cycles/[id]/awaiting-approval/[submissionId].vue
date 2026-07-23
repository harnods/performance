<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Review goal submission

  Reached from the "Awaiting approval" tab's table (GoalApprovalQueue.vue).
  Every goal in the batch gets its own accordion showing the FULL detail
  (same field groups/labels as AddGoalDrawer — Goal details / schedule /
  measurement / contributor / viewers / key results), not just a summary
  line, since the approver needs to actually review what's being proposed.
  The WHOLE batch is approved or rejected as one decision — never
  goal-by-goal — since a create-bundle's weights only add up to 100%
  together; approving some goals and rejecting others would leave a broken
  partial total. A rejection sends the entire batch back with one reason;
  any goal inside can still be corrected via "Edit" before it's resubmitted
  for another look.
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
  css,
  toast,
} from '@mekari/pixel3'
import { employeeById } from '~/utils/employees'
import { draftFromGoal, goalFromDraft, LEVEL_TO_GOAL_TYPE_LABEL, GOAL_UNIT_TO_MEASUREMENT_UNIT } from '~/utils/goalMapping'
import { MEASUREMENT_UNIT_OPTIONS, CURRENCY_OPTIONS } from '~/utils/goalTaxonomy'
import type { DraftGoal } from '~/utils/goalDraft'
import type { Goal, GoalLevel } from '~/composables/useGoalsStore'
import type { SubmissionItem } from '~/composables/useGoalApprovalsStore'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
  title: 'Review submission',
})

const route = useRoute()
const router = useRouter()
const cycleId = route.params.id as string
const submissionId = route.params.submissionId as string

const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === cycleId))
const { submissionById, approveSubmission, rejectSubmission, updateItem, resubmitSubmission } = useGoalApprovalsStore(cycleId)
const { currentUserId } = useCurrentUser()

const submission = computed(() => submissionById(submissionId))
const owner = computed(() => (submission.value ? employeeById(submission.value.ownerId) : undefined))
// Approve/Reject is Super Admin-only (centralized review); Resubmit is the
// submitter's own action after a rejection — everyone else sees a
// read-only status line.
const isReviewer = computed(() => isSuperAdmin(currentUserId.value))
const isOwnerViewing = computed(() => submission.value?.ownerId === currentUserId.value)
const superAdminName = computed(() => employeeById('rizal')?.name ?? 'the Super Admin')

const TYPE_LABEL: Record<SubmissionItem['type'], string> = { create: 'New goal', edit: 'Edit', delete: 'Delete' }
// Only a bundle of new goals carries the "must add up to 100%" constraint
// that makes an all-or-nothing decision matter — worth surfacing the
// running total for that case specifically.
const totalWeight = computed(() => submission.value?.items.reduce((sum, i) => sum + (i.after?.weight ?? 0), 0) ?? 0)
const showTotalWeight = computed(() => (submission.value?.items.length ?? 0) > 1 && submission.value?.items.every(i => i.type === 'create'))

// ─── Per-goal accordion — expanded by default, since the whole point is
// to see the full detail without an extra click.
const expanded = reactive<Record<string, boolean>>({})
function isExpanded(itemId: string) {
  return expanded[itemId] ?? true
}
function toggle(itemId: string) {
  expanded[itemId] = !isExpanded(itemId)
}

// ─── Full field detail — same groups/labels as AddGoalDrawer, rendered
// read-only, with a before → after callout on whatever changed for edit items.
function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}
function goalTypeLabel(level: GoalLevel) {
  return LEVEL_TO_GOAL_TYPE_LABEL[level] ?? level
}
function measurementUnitLabel(unit: Goal['unit']) {
  const key = GOAL_UNIT_TO_MEASUREMENT_UNIT[unit ?? 'percent']
  return MEASUREMENT_UNIT_OPTIONS.find(o => o.value === key)?.label ?? '—'
}
function currencyLabel(code?: string) {
  return CURRENCY_OPTIONS.find(o => o.value === code)?.label ?? code ?? 'IDR'
}
function formatValue(n: number | undefined, unit: Goal['unit'], currency?: string) {
  if (n === undefined) return '—'
  if (unit === 'currency') return `${CURRENCY_OPTIONS.find(o => o.value === currency)?.symbol ?? 'Rp'}${formatNumber(n)}`
  if (unit === 'percent') return `${n}%`
  return formatNumber(n)
}
function namesFor(ids?: string[]) {
  return ids?.length ? ids.map(id => employeeById(id)?.name ?? id).join(', ') : '—'
}

interface FieldRow { key: string, label: string, value: string }
interface FieldGroup { title: string, rows: FieldRow[] }

function buildGroups(g: Goal | Omit<Goal, 'cycleId'>): FieldGroup[] {
  return [
    {
      title: 'Goal details',
      rows: [
        { key: 'owner', label: 'Goal owner', value: employeeById(g.ownerId)?.name ?? g.ownerId },
        { key: 'title', label: 'Goal name', value: g.title },
        { key: 'description', label: 'Description', value: g.description || '—' },
        { key: 'level', label: 'Goal type', value: goalTypeLabel(g.level) },
        { key: 'category', label: 'Goal category', value: g.category },
        { key: 'subCategory', label: 'Goal sub-category', value: g.subCategory },
        { key: 'weight', label: 'Goal weight', value: `${g.weight}%` },
      ],
    },
    {
      title: 'Goal schedule',
      rows: [
        { key: 'startDate', label: 'Start date', value: g.startDate || '—' },
        { key: 'endDate', label: 'End date', value: g.endDate || '—' },
        { key: 'repeat', label: 'Repeat', value: g.repeat ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Goal measurement',
      rows: g.unit === 'deadline'
        ? [
            { key: 'unit', label: 'Measurement unit', value: measurementUnitLabel(g.unit) },
            { key: 'deadlineDate', label: 'Deadline date', value: g.deadlineDate || '—' },
            ...(g.deadlineRules?.length ? [{ key: 'deadlineRules', label: 'Deadline rules', value: g.deadlineRules.map(r => `${r.daysExceed} days exceeded → ${r.percentage}%`).join('; ') }] : []),
          ]
        : [
            { key: 'unit', label: 'Measurement unit', value: measurementUnitLabel(g.unit) },
            { key: 'useBaseline', label: 'Use baseline', value: g.useBaseline ? 'Yes' : 'No' },
            ...(g.unit === 'currency' ? [{ key: 'currency', label: 'Currency', value: currencyLabel(g.currency) }] : []),
            { key: 'min', label: 'Start value', value: formatValue(g.min, g.unit, g.currency) },
            { key: 'max', label: 'Target value', value: formatValue(g.max, g.unit, g.currency) },
            { key: 'direction', label: 'Goal direction', value: g.direction === 'lower' ? 'Lower is better' : 'Higher is better' },
          ],
    },
    {
      title: 'Goal members',
      rows: [
        { key: 'viewerIds', label: 'Members', value: namesFor(g.viewerIds) },
        ...(g.level === 'organization' ? [{ key: 'restrictedVisibility', label: 'Limit visibility', value: g.restrictedVisibility ? 'Yes' : 'No' }] : []),
      ],
    },
    { title: 'Goal contributor', rows: [{ key: 'contributorIds', label: 'Contributors', value: namesFor(g.contributorIds) }] },
    {
      title: 'Key results',
      rows: (g.keyResults ?? []).map(kr => ({ key: `kr-${kr.id}`, label: kr.title, value: kr.target || '—' })),
    },
  ].filter(group => group.rows.length > 0)
}

// Adds a `beforeValue` alongside any row that differs from the goal's
// prior state — edit items only, since create/delete have nothing to diff.
function itemGroups(item: SubmissionItem): (FieldGroup & { rows: (FieldRow & { beforeValue?: string })[] })[] {
  const current = item.after ?? item.before
  if (!current) return []
  const afterGroups = buildGroups(current)
  if (item.type !== 'edit' || !item.before) return afterGroups
  const beforeGroups = buildGroups(item.before)
  return afterGroups.map((group, gi) => ({
    ...group,
    rows: group.rows.map((row, ri) => {
      const beforeRow = beforeGroups[gi]?.rows[ri]
      return beforeRow && beforeRow.value !== row.value ? { ...row, beforeValue: beforeRow.value } : row
    }),
  }))
}

// Reject reason is typed inline before it's confirmed — rejectSubmission
// only gets called once the manager confirms, so a half-typed reason
// never silently counts as a decision.
const showRejectInput = ref(false)
const rejectDraftReason = ref('')

function markApprove() {
  if (!submission.value) return
  approveSubmission(submission.value.id)
  toast.notify({
    id: 'submission-approved',
    position: 'top-center',
    variant: 'success',
    title: 'Submission approved',
  })
  router.push({ path: `/goals/goal-cycles/${cycleId}`, query: { name: cycle.value?.name } })
}
function startNotApprove() {
  showRejectInput.value = true
}
function cancelNotApprove() {
  showRejectInput.value = false
  rejectDraftReason.value = ''
}
function confirmNotApprove() {
  if (!submission.value) return
  const reason = rejectDraftReason.value.trim()
  if (!reason) return
  rejectSubmission(submission.value.id, reason)
  showRejectInput.value = false
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

// "Edit" on a goal inside the batch — reuses AddGoalDrawer, same as
// editing any other goal, just writing back to updateItem instead of the
// live goals store. Available on create/edit items any time the batch
// isn't already approved (delete items have no fields to correct).
const editDrawerOpen = ref(false)
const editTargetItem = ref<SubmissionItem | null>(null)
const editOwner = computed(() => (editTargetItem.value ? employeeById(editTargetItem.value.ownerId) : undefined))
const editDraft = computed<DraftGoal | null>(() => {
  if (!editTargetItem.value?.after || !editOwner.value) return null
  return draftFromGoal({ ...editTargetItem.value.after, cycleId }, editOwner.value)
})

function openItemEdit(item: SubmissionItem) {
  editTargetItem.value = item
  editDrawerOpen.value = true
}
function onItemEditSave(draft: DraftGoal) {
  if (!editTargetItem.value || !submission.value || !editOwner.value) return
  const updated = goalFromDraft(draft, editOwner.value, false)
  updateItem(submission.value.id, editTargetItem.value.id, updated)
  editDrawerOpen.value = false
  toast.notify({
    id: 'item-updated',
    position: 'top-center',
    variant: 'success',
    title: 'Goal updated',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const pageWrap = css({ paddingBottom: '10' })
const headerCard = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4',
  paddingBlock: '4', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default',
})
const nameText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const dangerText = css({ color: 'text.danger' })
const itemCard = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: '6px', overflow: 'hidden' })
const itemsWrap = css({ display: 'flex', flexDirection: 'column', gap: '4', marginTop: '6' })
const accordionHeader = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2',
  paddingInline: '4', paddingBlock: '3', cursor: 'pointer',
  background: 'gray.50', borderBottom: '1px solid', borderBottomColor: 'border.default',
})
const accordionLeft = css({ display: 'flex', alignItems: 'center', gap: '2', minWidth: '0' })
const accordionBody = css({ padding: '4', display: 'flex', flexDirection: 'column', gap: '5' })
const typeTagBase = {
  display: 'inline-flex', alignItems: 'center', borderRadius: 'sm', paddingInline: '1.5', paddingBlock: '0.5',
  fontSize: '12px', fontWeight: '600', width: 'fit-content',
} as const
const typeTag = css({ ...typeTagBase, background: 'white', color: 'text.default' })
const deleteTag = css({ ...typeTagBase, background: 'red.50', color: 'red.700' })
const groupTitle = css({ fontSize: '13px', fontWeight: '600', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.02em' })
const fieldRow = css({ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '4', fontSize: '14px', paddingBlock: '1.5' })
const beforeValueText = css({ color: 'text.secondary', textDecoration: 'line-through' })
const totalWeightRow = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  paddingBlock: '3', paddingInline: '4', marginTop: '4', borderRadius: '6px', background: 'background.neutral.subtle',
})
const decisionBlock = css({
  marginTop: '6', paddingTop: '4', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'border.default',
})
const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '12px', lineHeight: '20px', width: 'fit-content' } as const
const statusApproved = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusRejected = css({ ...statusPillBase, background: 'red.50', color: 'red.700' })
const editedTag = css({ ...statusPillBase, background: 'blue.50', color: 'blue.700' })
</script>

<template>
  <MpFlex direction="column" :class="pageWrap">
    <template v-if="!submission">
      <MpText :class="captionText">This submission no longer exists.</MpText>
    </template>
    <template v-else>
      <div :class="headerCard">
        <MpFlex align="center" gap="3">
          <MpAvatar id="avatar-submission-owner" :name="owner?.name ?? submission.ownerId" :src="owner?.photo" variant-color="gray" />
          <MpFlex direction="column" gap="0">
            <MpText size="label" weight="semiBold" :class="nameText">{{ owner?.name ?? submission.ownerId }}</MpText>
            <MpText size="label-small" :class="captionText">Submitted {{ formatDate(submission.submittedAt) }} · {{ cycle?.name }}</MpText>
          </MpFlex>
        </MpFlex>
        <MpFlex align="center" gap="2">
          <span v-if="submission.wasEdited" :class="editedTag">Edited</span>
          <span v-if="submission.status !== 'pending'" :class="submission.status === 'approved' ? statusApproved : statusRejected">
            {{ submission.status === 'approved' ? 'Approved' : 'Not approved' }}
          </span>
        </MpFlex>
      </div>

      <div :class="itemsWrap">
        <div v-for="item in submission.items" :key="item.id" :class="itemCard">
          <button type="button" :class="accordionHeader" @click="toggle(item.id)">
            <span :class="accordionLeft">
              <MpIcon :name="isExpanded(item.id) ? 'caret-down' : 'caret-right'" size="sm" />
              <span :class="item.type === 'delete' ? deleteTag : typeTag">{{ TYPE_LABEL[item.type] }}</span>
              <MpText size="label" weight="semiBold" :class="nameText">{{ (item.after ?? item.before)?.title }}</MpText>
              <MpText size="label-small" :class="captionText">{{ (item.after ?? item.before)?.code }} · Weight: {{ (item.after ?? item.before)?.weight }}%</MpText>
            </span>
            <MpButton v-if="item.type !== 'delete' && submission.status !== 'approved'" variant="ghost" size="sm" @click.stop="openItemEdit(item)">Edit</MpButton>
          </button>

          <div v-if="isExpanded(item.id)" :class="accordionBody">
            <MpText v-if="item.type === 'delete'" size="label-small" :class="dangerText">This goal will be permanently deleted if approved.</MpText>

            <MpFlex v-for="group in itemGroups(item)" :key="group.title" direction="column" gap="1">
              <span :class="groupTitle">{{ group.title }}</span>
              <div v-for="row in group.rows" :key="row.key" :class="fieldRow">
                <MpText size="label-small" :class="captionText">{{ row.label }}</MpText>
                <MpFlex align="center" gap="2">
                  <MpText v-if="row.beforeValue" size="label" :class="beforeValueText">{{ row.beforeValue }}</MpText>
                  <MpIcon v-if="row.beforeValue" name="arrows-right" size="sm" />
                  <MpText size="label" :class="nameText">{{ row.value }}</MpText>
                </MpFlex>
              </div>
            </MpFlex>
          </div>
        </div>

        <!-- Weight only needs to add up to 100% together for a bundle of new goals -->
        <div v-if="showTotalWeight" :class="totalWeightRow">
          <MpText size="label" :class="nameText">Total weight in this batch</MpText>
          <MpText size="label" weight="semiBold" :class="nameText">{{ totalWeight }}%</MpText>
        </div>
      </div>

      <!-- One decision for the whole batch — never per goal -->
      <div :class="decisionBlock">
        <template v-if="isReviewer && submission.status === 'pending'">
          <MpFlex v-if="!showRejectInput" align="center" gap="2">
            <MpButton variant="primary" @click="markApprove">Approve</MpButton>
            <MpButton variant="ghost" @click="startNotApprove">Not approve</MpButton>
          </MpFlex>
          <MpFlex v-else direction="column" gap="2">
            <MpFormControl>
              <MpFormLabel>Reason</MpFormLabel>
              <MpTextarea v-model="rejectDraftReason" placeholder="Let them know what needs to change..." />
            </MpFormControl>
            <MpFlex align="center" gap="2">
              <MpButton variant="danger" :is-disabled="!rejectDraftReason.trim()" @click="confirmNotApprove">Confirm not approve</MpButton>
              <MpButton variant="ghost" @click="cancelNotApprove">Cancel</MpButton>
            </MpFlex>
          </MpFlex>
        </template>

        <template v-else-if="isOwnerViewing && submission.status === 'rejected'">
          <MpText size="label-small" :class="[dangerText, css({ display: 'block', marginBottom: '3' })]">Reason: {{ submission.rejectReason }}</MpText>
          <MpButton variant="primary" @click="resubmit">Resubmit for approval</MpButton>
        </template>

        <template v-else-if="submission.status === 'pending'">
          <MpText size="label" :class="captionText">Awaiting approval from {{ superAdminName }}.</MpText>
        </template>

        <template v-else-if="submission.status === 'rejected'">
          <MpText size="label-small" :class="[dangerText, css({ display: 'block' })]">Not approved — reason: {{ submission.rejectReason }}</MpText>
        </template>

        <template v-else>
          <MpText size="label" :class="captionText">This submission has already been approved.</MpText>
        </template>
      </div>
    </template>
  </MpFlex>

  <AddGoalDrawer
    v-if="editDraft && editOwner"
    drawer-id="drawer-submission-item-edit"
    v-model:is-open="editDrawerOpen"
    :owners="[editOwner]"
    :already-used-weight="0"
    :cycle-start-date="cycle?.startDate ?? ''"
    :cycle-end-date="cycle?.endDate ?? ''"
    :editing-draft="editDraft"
    @save="onItemEditSave"
  />
</template>
