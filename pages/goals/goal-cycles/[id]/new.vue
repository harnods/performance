<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — New goals (bulk create)
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU)
    single-owner: node 4433:71962 / 4450:80523 · multi-owner: node 4818:35158

  Reached from the "New goals" button on the goal cycle details page after
  picking one or more employees in the Select Employee modal. One shared
  table: every goal added here (via AddGoalDrawer) applies to every selected
  owner at once — "Each selected owner will receive their own copy of this
  goal. Progress and updates will be tracked separately."
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpIcon,
  MpAvatar,
  MpAvatarGroup,
  MpBadge,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpButtonGroup,
  toast,
  css,
} from '@mekari/pixel3'
import { type Employee, EMPLOYEES, employeeMeta } from '~/utils/employees'
import type { DraftGoal } from '~/utils/goalDraft'
import { goalFromDraft, LEVEL_TO_GOAL_TYPE_LABEL } from '~/utils/goalMapping'
import { ownerOf } from '~/utils/goalRows'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
  title: 'New goals',
})

const route = useRoute()
const router = useRouter()
const { cycles } = useGoalCyclesStore()
const { goals: allGoals, addGoals } = useGoalsStore()
const { createSubmission } = useGoalApprovalsStore()

const cycle = computed(() => cycles.value.find(c => c.id === route.params.id))
const weightMandatory = computed(() => cycle.value?.weightMandatory ?? false)

// Each drafted goal becomes one real Goal per selected owner — "each
// selected owner will receive their own copy of this goal" (see the owner
// summary banner above).
function goalsFromDraft(draft: DraftGoal, forOwners: Employee[], isDraft: boolean) {
  return forOwners.map(owner => goalFromDraft(draft, owner, isDraft))
}

const ownerIds = computed(() => {
  const raw = route.query.employees
  const list = Array.isArray(raw) ? raw[0] : raw
  return (list ?? '').split(',').filter(Boolean)
})
const owners = computed(() => EMPLOYEES.filter(e => ownerIds.value.includes(e.id)))

const goals = ref<DraftGoal[]>([])
const isDrawerOpen = ref(false)
const hasWeightError = ref(false)
const weightErrorOwnerName = ref('')
const weightErrorTotal = ref(0)

const totalWeight = computed(() => goals.value.reduce((sum, g) => sum + g.weight, 0))
watch(totalWeight, () => { hasWeightError.value = false })

// Weight is a single 100%-of-total budget per OWNER across every goal they
// have in this cycle — not just whatever's drafted in this one visit to
// this page. Without this, leaving and coming back to add more goals for
// someone who already has a full 100% could silently push them over.
const existingWeightByOwner = computed(() => {
  const map = new Map<string, number>()
  for (const owner of owners.value) {
    const existing = allGoals.value
      .filter(g => g.cycleId === route.params.id && g.ownerId === owner.id)
      .reduce((sum, g) => sum + g.weight, 0)
    map.set(owner.id, existing)
  }
  return map
})
// A drafted goal only counts toward an owner's weight if it still applies to
// them (goal.ownerIds) — editing one owner's row detaches them into their
// own copy, so the remaining owners' totals must no longer include it.
// excludeGoalId skips the goal currently being edited so its own (not-yet-
// saved) weight isn't double-counted against the live value being typed.
function draftedWeightForOwner(ownerId: string, excludeGoalId?: string) {
  return goals.value
    .filter(g => g.id !== excludeGoalId && g.ownerIds.includes(ownerId))
    .reduce((sum, g) => sum + g.weight, 0)
}
// Each owner's own existing + already-drafted total — the drawer's weight
// hint subtracts whatever's currently being typed from this per owner, so a
// single blanket figure would only be accurate for whichever owner it came from.
const alreadyUsedWeightByOwner = computed(() => owners.value.map(owner => ({
  id: owner.id,
  name: owner.name,
  weight: (existingWeightByOwner.value.get(owner.id) ?? 0) + draftedWeightForOwner(owner.id),
})))
// The single-number prop still gets the highest total across owners, so the
// hard 100% cap in the drawer's own weight field validation never lets a
// goal push ANY owner over.
const alreadyUsedWeightForDrawer = computed(() => Math.max(0, ...alreadyUsedWeightByOwner.value.map(o => o.weight)))
// Single-owner "Total goal weight" footer — real running total (existing +
// whatever's drafted this session). For multiple owners this isn't one
// number at all (see perOwnerWeightTotals below, used instead in that case).
const totalWeightDisplay = computed(() => (existingWeightByOwner.value.get(owners.value[0]?.id) ?? 0) + totalWeight.value)
// Each owner's own real running total — shown as a per-owner breakdown in
// the footer instead of the single-owner figure whenever there's more than
// one owner, since each can already carry a different existing total and a
// drafted goal may no longer apply to all of them after a detach-edit.
const perOwnerWeightTotals = computed(() => owners.value.map(owner => ({
  owner,
  total: (existingWeightByOwner.value.get(owner.id) ?? 0) + draftedWeightForOwner(owner.id),
})))

const { isEditDrawerOpen, editingDraft, editingOwners, alreadyUsedWeightForEdit, openEditGoal, saveEdit } = useGoalEditor()
const { isDeleteModalOpen, goalToDelete, askDeleteGoal, confirmDeleteGoal } = useGoalDeleter()

// Goals already saved for the selected owner(s) in this cycle, from an
// earlier visit to this page — shown right in the same table (still a
// draft until finalized, so it belongs alongside what's being drafted now).
const existingGoalsByOwner = computed(() => owners.value
  .map(owner => ({
    owner,
    goals: allGoals.value.filter(g => g.cycleId === route.params.id && g.ownerId === owner.id),
  }))
  .filter(entry => entry.goals.length > 0))
const hasExistingGoals = computed(() => existingGoalsByOwner.value.length > 0)
const existingGoalsFlat = computed(() => existingGoalsByOwner.value.flatMap(
  entry => entry.goals.map(g => ({ ...g, ownerName: entry.owner.name })),
))

function openAddGoal() {
  isDrawerOpen.value = true
}
function onGoalSaved(goal: DraftGoal) {
  goals.value = [...goals.value, goal]
}
// Single-owner path only — with multiple owners a drafted goal's ownerIds
// can be a subset, so removal there goes through removeGoalForOwner instead.
function removeGoal(id: string) {
  goals.value = goals.value.filter(g => g.id !== id)
}

// Multiple owners: one row per (goal, owner) so the "Goal owner" column and
// per-owner actions line up with the shared goal-definition cells above,
// which are rowspan-merged across each goal's own owner rows.
const draftedRowsFlat = computed(() => {
  if (owners.value.length <= 1) return []
  return goals.value.flatMap((goal) => {
    const goalOwners = goal.ownerIds.map(id => EMPLOYEES.find(e => e.id === id)).filter((e): e is Employee => Boolean(e))
    return goalOwners.map((owner, ownerIndex) => ({ goal, owner, ownerIndex, groupSize: goalOwners.length }))
  })
})

const isDraftEditDrawerOpen = ref(false)
const editingDraftGoalId = ref<string | null>(null)
const editingDraftOwnerId = ref<string | null>(null)
const editingDraftForOwner = computed<DraftGoal | null>(() => goals.value.find(g => g.id === editingDraftGoalId.value) ?? null)
const editingDraftOwnerAsList = computed<Employee[]>(() => {
  const owner = editingDraftOwnerId.value ? EMPLOYEES.find(e => e.id === editingDraftOwnerId.value) : undefined
  return owner ? [owner] : []
})
// Editing a single owner's row shouldn't double-count that goal's own
// (not-yet-saved) weight against itself — exclude it from the baseline the
// drawer subtracts the live typed value from.
const alreadyUsedWeightForDraftEdit = computed(() => {
  if (!editingDraftOwnerId.value) return 0
  return (existingWeightByOwner.value.get(editingDraftOwnerId.value) ?? 0)
    + draftedWeightForOwner(editingDraftOwnerId.value, editingDraftGoalId.value ?? undefined)
})

// Opens the Add/Edit drawer scoped to just this one owner — saving detaches
// them into their own independent copy, leaving the other owners' shared
// entry untouched (see onDraftEditSaved).
function openDraftEditForOwner(goal: DraftGoal, ownerId: string) {
  editingDraftGoalId.value = goal.id
  editingDraftOwnerId.value = ownerId
  isDraftEditDrawerOpen.value = true
}
function onDraftEditSaved(updatedDraft: DraftGoal) {
  const goalId = editingDraftGoalId.value
  const ownerId = editingDraftOwnerId.value
  const original = goalId ? goals.value.find(g => g.id === goalId) : undefined
  if (!goalId || !ownerId || !original) return

  if (original.ownerIds.length <= 1) {
    // Only this one owner has it anyway — no detach needed, just replace it.
    goals.value = goals.value.map(g => (g.id === goalId ? { ...updatedDraft, id: goalId, ownerIds: [ownerId] } : g))
  }
  else {
    const { [ownerId]: _removedContributors, ...remainingContributors } = original.contributorsByOwner
    const shrunk: DraftGoal = { ...original, ownerIds: original.ownerIds.filter(id => id !== ownerId), contributorsByOwner: remainingContributors }
    const detached: DraftGoal = { ...updatedDraft, id: `${goalId}-${ownerId}-${Date.now()}`, ownerIds: [ownerId] }
    goals.value = [...goals.value.filter(g => g.id !== goalId), shrunk, detached]
  }
  isDraftEditDrawerOpen.value = false
  editingDraftGoalId.value = null
  editingDraftOwnerId.value = null
}
// Removes just this one owner from the goal; if they were the last owner
// left, the whole drafted entry is dropped — nobody it still applies to.
function removeGoalForOwner(goalId: string, ownerId: string) {
  const goal = goals.value.find(g => g.id === goalId)
  if (!goal) return
  const remainingOwners = goal.ownerIds.filter(id => id !== ownerId)
  goals.value = remainingOwners.length === 0
    ? goals.value.filter(g => g.id !== goalId)
    : goals.value.map(g => (g.id === goalId ? { ...g, ownerIds: remainingOwners } : g))
}

function contributorsFor(goal: DraftGoal, ownerId: string) {
  return (goal.contributorsByOwner[ownerId] ?? [])
    .map(id => EMPLOYEES.find(e => e.id === id))
    .filter((e): e is typeof EMPLOYEES[number] => Boolean(e))
}

// layouts/default.vue's page title reads route.query.name (same convention
// as pages/reviews/review-cycles/[id]/index.vue) — carry it on every
// navigation back to the cycle page, or the title silently goes blank.
function onCancel() {
  router.push({ path: `/goals/goal-cycles/${route.params.id}`, query: { name: cycle.value?.name } })
}
function persistAndLeave(isDraft: boolean) {
  const cycleId = route.params.id as string

  // Only a real Save (not "Save as draft") goes through approval — a draft
  // isn't submitted to anyone yet. Owners who are the current user's direct
  // reports get their goals queued for review instead of saved immediately.
  // Each drafted goal only goes to the owners it currently still applies to
  // (goal.ownerIds) — detach-editing one owner's row means it no longer
  // shares the same fate as the goal's other owners.
  let anyQueued = false
  let anyDirect = false
  for (const draft of goals.value) {
    const draftOwners = owners.value.filter(owner => draft.ownerIds.includes(owner.id))
    const queuedOwners = isDraft ? [] : draftOwners.filter(owner => needsApproval(owner.id))
    const directOwners = isDraft ? draftOwners : draftOwners.filter(owner => !needsApproval(owner.id))
    if (directOwners.length) {
      anyDirect = true
      addGoals(goalsFromDraft(draft, directOwners, isDraft), cycleId)
    }
    for (const owner of queuedOwners) {
      anyQueued = true
      createSubmission([{ type: 'create' as const, ownerId: owner.id, cycleId, after: goalFromDraft(draft, owner, isDraft) }], owner.id, cycleId)
    }
  }

  const title = !anyQueued
    ? 'Goals saved'
    : !anyDirect
      ? 'Goals submitted for approval'
      : 'Goals saved — some submitted for approval'
  toast.notify({
    id: 'new-goals-saved',
    position: 'top-center',
    variant: 'success',
    title,
  })
  // Everything above is already persisted (or queued) by this point, so
  // there's nothing left for the "unsaved changes" leave guard to protect —
  // without this, its own router.push below would re-trigger that same
  // guard (goals.value is still non-empty) and pop the leave-confirm modal
  // right after a legitimate save, and clicking "Save as draft" there would
  // call persistAndLeave a second time and duplicate every goal just saved.
  bypassLeaveGuard = true
  // The "All goals" index paginates by owner, alphabetically — a
  // newly-saved owner can land past the first page and be invisible on
  // arrival unless we tell the index which owners to make sure are loaded.
  router.push({ path: `/goals/goal-cycles/${route.params.id}`, query: { name: cycle.value?.name, newOwners: ownerIds.value.join(',') } })
}
function onSaveAsDraft() {
  if (goals.value.length === 0) {
    toast.notify({
      id: 'no-goals-to-save',
      position: 'top-center',
      variant: 'error',
      title: 'Add at least one goal before saving as draft',
    })
    return
  }
  persistAndLeave(true)
}
function onSave() {
  if (goals.value.length === 0) {
    toast.notify({
      id: 'no-goals-to-save',
      position: 'top-center',
      variant: 'error',
      title: 'Add at least one goal before saving',
    })
    return
  }
  hasWeightError.value = false
  if (weightMandatory.value) {
    for (const owner of owners.value) {
      const combined = (existingWeightByOwner.value.get(owner.id) ?? 0) + draftedWeightForOwner(owner.id)
      if (combined !== 100) {
        hasWeightError.value = true
        weightErrorOwnerName.value = owner.name
        weightErrorTotal.value = combined
        break
      }
    }
  }
  if (hasWeightError.value) return
  persistAndLeave(false)
}

// Warn before losing drafted-but-unsaved goals. Two separate mechanisms,
// because a real browser refresh/close can only trigger the browser's own
// native "Leave site?" dialog (no custom text/buttons allowed since
// Chrome/Firefox locked this down) — in-app navigation (Cancel button,
// breadcrumb, sidebar, browser back) goes through Vue Router instead, where
// we CAN show our own modal with a real "Save as draft" action.
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (goals.value.length === 0) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload))

const isLeaveConfirmOpen = ref(false)
let bypassLeaveGuard = false
let resolveLeaveGuard: ((allow: boolean) => void) | null = null

onBeforeRouteLeave(() => {
  if (bypassLeaveGuard || goals.value.length === 0) return true
  isLeaveConfirmOpen.value = true
  return new Promise<boolean>((resolve) => { resolveLeaveGuard = resolve })
})

function cancelLeave() {
  isLeaveConfirmOpen.value = false
  resolveLeaveGuard?.(false)
  resolveLeaveGuard = null
}
function discardAndLeave() {
  isLeaveConfirmOpen.value = false
  resolveLeaveGuard?.(true)
  resolveLeaveGuard = null
}
function saveAsDraftAndLeave() {
  isLeaveConfirmOpen.value = false
  resolveLeaveGuard?.(false)
  resolveLeaveGuard = null
  bypassLeaveGuard = true
  onSaveAsDraft()
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
// Root wrapper stretches to at least fill the visible content area (its
// flex:1 parent in layouts/default.vue) so a short goal list doesn't leave
// the action bar floating right under it — `marginTop: 'auto'` on the bar
// below then pushes it all the way down to fill that space. When the goals
// table is long enough to overflow, this wrapper naturally grows taller
// instead, marginTop:auto collapses, and `position: sticky` takes over to
// pin the bar to the viewport while layouts/default.vue's <main> scrolls.
const pageRoot = css({ minHeight: '100%' })
const stickyActionBar = css({
  position: 'sticky', bottom: '0', zIndex: '1', marginTop: 'auto',
  background: 'background.neutral', paddingTop: '5', paddingBottom: '6',
  borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'border.default',
})
const ownersBar = css({ display: 'flex', alignItems: 'center', gap: '3', paddingBottom: '5' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'top' })

const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const detailLabel = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })

const ownerCellWrap = css({ display: 'flex', flexDirection: 'column', gap: '2' })

const addGoalRow = css({
  display: 'flex', alignItems: 'center', gap: '2',
  paddingInline: '4', paddingBlock: '3',
  background: 'transparent', border: 'none', width: '100%', cursor: 'pointer',
  color: 'text.link', fontSize: '14px', lineHeight: '20px',
  borderTop: '1px solid', borderTopColor: 'border.default',
})
const totalRow = css({
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2',
  paddingInline: '4', paddingBlock: '3',
  borderTop: '1px solid', borderTopColor: 'border.default',
})
const totalRowMulti = css({
  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1',
  paddingInline: '4', paddingBlock: '3',
  borderTop: '1px solid', borderTopColor: 'border.default',
})
const perOwnerTotalRow = css({ display: 'flex', alignItems: 'center', gap: '2' })

// Empty state — no goals drafted yet in this session (same illustrated
// pattern as the goal cycle's own Company/Organization/Team/Individual/All
// goals pages when the cycle itself has none).
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <MpFlex direction="column" gap="0" :class="pageRoot">
    <!-- Owner summary -->
    <div :class="ownersBar">
      <template v-if="owners.length === 1">
        <MpAvatar :id="owners[0].id" :name="owners[0].name" :src="owners[0].photo" size="lg" variant-color="gray" />
        <MpFlex direction="column" align="flex-start" gap="1">
          <MpText size="label" weight="semiBold" :class="valueText">{{ owners[0].name }}</MpText>
          <MpText size="label-small" :class="captionText">{{ employeeMeta(owners[0]) }}</MpText>
          <MpBadge for="tableStatus" type="completed" size="sm">Active</MpBadge>
        </MpFlex>
      </template>
      <template v-else>
        <MpAvatarGroup id="owners-summary-avatars" size="md" :max="owners.length">
          <MpAvatar v-for="o in owners" :key="o.id" :id="o.id" :name="o.name" :src="o.photo" variant-color="gray" />
        </MpAvatarGroup>
        <MpFlex direction="column" gap="1">
          <MpText size="label" weight="semiBold" :class="valueText">{{ owners.length }} goal owners</MpText>
          <MpText size="label-small" :class="captionText">
            Each selected owner will receive their own copy of this goal. Progress and updates will be tracked separately.
          </MpText>
        </MpFlex>
      </template>
    </div>

    <!-- Empty state: nothing drafted this session AND nothing existing
         either (no border box, matching the goal cycle pages' own empty
         state) -->
    <MpFlex v-if="goals.length === 0 && !hasExistingGoals" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
        <MpText :class="emptyTitle">No goals added yet</MpText>
        <MpText size="label" :class="captionText">Goals you add will appear here.</MpText>
      </MpFlex>
      <MpButton variant="primary" left-icon="add" @click="openAddGoal">Add goal</MpButton>
    </MpFlex>

    <!-- Goals table — goals already saved for the selected owner(s) from an
         earlier visit to this page (still a draft until finalized) come
         first, then whatever's being drafted right now this session. -->
    <MpTableContainer v-else :class="tableOuterBorder">
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell v-if="owners.length > 1" as="th" :class="colDivider">Goal owner</MpTableCell>
            <MpTableCell as="th" :class="colDivider">Goal category</MpTableCell>
            <MpTableCell as="th" :class="colDivider">Goal sub-category</MpTableCell>
            <MpTableCell as="th" :class="colDivider">Goal name</MpTableCell>
            <MpTableCell as="th" :class="colDivider">Goal type</MpTableCell>
            <MpTableCell as="th" :class="colDivider">Goal weight</MpTableCell>
            <MpTableCell as="th" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <!-- Already saved (existing) goals for the selected owner(s) -->
          <MpTableRow v-for="g in existingGoalsFlat" :key="`existing-${g.id}`">
            <MpTableCell v-if="owners.length > 1" as="td" :class="[tightCell, colDivider]">
              <MpFlex direction="column" gap="0">
                <MpText size="label" :class="valueText">{{ ownerOf(g.ownerId).name }}</MpText>
                <MpText size="label-small" :class="captionText">{{ ownerOf(g.ownerId).id }}</MpText>
                <MpText size="label-small" :class="captionText">{{ ownerOf(g.ownerId).title }}</MpText>
                <MpText size="label-small" :class="captionText">{{ ownerOf(g.ownerId).department }}</MpText>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="[tightCell, colDivider]">
              <MpText size="label" :class="valueText">{{ g.category }}</MpText>
              <MpText size="label-small" :class="captionText">Weight: {{ g.weight }}%</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="[tightCell, colDivider]">
              <MpText size="label" :class="valueText">{{ g.subCategory || '—' }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="[tightCell, colDivider]">
              <span :class="goalCode">{{ g.code }}</span>
              <MpFlex align="center" gap="2">
                <MpText size="label" :class="valueText">{{ g.title }}</MpText>
                <MpBadge v-if="g.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="[tightCell, colDivider]">
              <MpText size="label" :class="valueText">{{ LEVEL_TO_GOAL_TYPE_LABEL[g.level] }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="[tightCell, colDivider]">
              <MpText size="label" :class="valueText">{{ g.weight }}%</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="actionCell">
              <MpPopover is-close-on-select use-portal placement="bottom-end">
                <MpPopoverTrigger>
                  <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Goal actions" />
                </MpPopoverTrigger>
                <MpPopoverContent :class="css({ minWidth: '160px' })">
                  <MpPopoverList>
                    <MpPopoverListItem @click="openEditGoal(g)">Edit</MpPopoverListItem>
                    <MpPopoverListItem @click="askDeleteGoal(g)">
                      <span :class="css({ color: 'text.danger' })">Delete</span>
                    </MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </MpTableCell>
          </MpTableRow>

          <!-- Drafted this session, not yet saved — single owner: one row
               per goal, unchanged from before. -->
          <template v-if="owners.length === 1">
            <MpTableRow v-for="goal in goals" :key="goal.id">
              <MpTableCell as="td" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ goal.category }}</MpText>
                <MpText size="label-small" :class="captionText">Weight: {{ goal.weight }}%</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ goal.subCategory || '—' }}</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="[tightCell, colDivider]">
                <span :class="goalCode">{{ goal.code }}</span>
                <MpText size="label" :class="valueText">{{ goal.name }}</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ goal.goalType }}</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ goal.weight }}%</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Goal actions" />
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem @click="removeGoal(goal.id)">
                        <span :class="css({ color: 'text.danger' })">Remove</span>
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </template>

          <!-- Drafted this session, not yet saved — multiple owners: one row
               per (goal, owner). Goal-definition cells are rowspan-merged
               across each goal's own owner rows (identical for all of
               them); Goal owner + actions vary per row. Editing one owner's
               row detaches just them into their own independent entry;
               removing one owner's row only drops that owner (see
               openDraftEditForOwner / removeGoalForOwner). -->
          <template v-else>
            <MpTableRow v-for="row in draftedRowsFlat" :key="`${row.goal.id}-${row.owner.id}`">
              <MpTableCell as="td" :class="[tightCell, colDivider]">
                <div :class="ownerCellWrap">
                  <MpFlex direction="column" gap="0">
                    <MpText size="label" :class="valueText">{{ ownerOf(row.owner.id).name }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ ownerOf(row.owner.id).id }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ ownerOf(row.owner.id).title }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ ownerOf(row.owner.id).department }}</MpText>
                  </MpFlex>
                  <MpFlex direction="column" gap="0">
                    <span :class="detailLabel">Goal contributor</span>
                    <MpFlex v-if="contributorsFor(row.goal, row.owner.id).length" gap="1">
                      <MpAvatar v-for="c in contributorsFor(row.goal, row.owner.id)" :key="c!.id" :id="c!.id" :name="c!.name" :src="c!.photo" size="sm" variant-color="gray" />
                    </MpFlex>
                    <span v-else :class="captionText">—</span>
                  </MpFlex>
                </div>
              </MpTableCell>
              <MpTableCell v-if="row.ownerIndex === 0" as="td" :rowspan="row.groupSize" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ row.goal.category }}</MpText>
                <MpText size="label-small" :class="captionText">Weight: {{ row.goal.weight }}%</MpText>
              </MpTableCell>
              <MpTableCell v-if="row.ownerIndex === 0" as="td" :rowspan="row.groupSize" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ row.goal.subCategory || '—' }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="row.ownerIndex === 0" as="td" :rowspan="row.groupSize" :class="[tightCell, colDivider]">
                <span :class="goalCode">{{ row.goal.code }}</span>
                <MpText size="label" :class="valueText">{{ row.goal.name }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="row.ownerIndex === 0" as="td" :rowspan="row.groupSize" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ row.goal.goalType }}</MpText>
              </MpTableCell>
              <MpTableCell v-if="row.ownerIndex === 0" as="td" :rowspan="row.groupSize" :class="[tightCell, colDivider]">
                <MpText size="label" :class="valueText">{{ row.goal.weight }}%</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Goal actions" />
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem @click="openDraftEditForOwner(row.goal, row.owner.id)">Edit</MpPopoverListItem>
                      <MpPopoverListItem @click="removeGoalForOwner(row.goal.id, row.owner.id)">
                        <span :class="css({ color: 'text.danger' })">Remove</span>
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </template>
        </MpTableBody>
      </MpTable>

      <!-- Single owner: one running total. Multiple owners each carry their
           own existing weight, so this is a per-owner breakdown instead of
           one shared (and potentially misleading) number. -->
      <div v-if="weightMandatory && (goals.length || hasExistingGoals) && owners.length === 1" :class="totalRow">
        <MpText size="label" weight="semiBold" :class="valueText">Total goal weight</MpText>
        <MpText size="label" :class="totalWeightDisplay === 100 ? css({ color: 'text.success' }) : css({ color: 'text.danger' })">
          {{ totalWeightDisplay }}% of 100%
        </MpText>
      </div>
      <div v-else-if="weightMandatory && (goals.length || hasExistingGoals)" :class="totalRowMulti">
        <MpText size="label" weight="semiBold" :class="valueText">Total goal weight per owner</MpText>
        <MpFlex v-for="entry in perOwnerWeightTotals" :key="entry.owner.id" align="center" gap="2" :class="perOwnerTotalRow">
          <MpText size="label-small" :class="captionText">{{ entry.owner.name }}</MpText>
          <MpText size="label" :class="entry.total === 100 ? css({ color: 'text.success' }) : css({ color: 'text.danger' })">
            {{ entry.total }}% of 100%
          </MpText>
        </MpFlex>
      </div>

      <button type="button" :class="addGoalRow" @click="openAddGoal">
        <MpIcon name="add" size="sm" />
        Add goal
      </button>
    </MpTableContainer>

    <MpFlex align="center" justify="space-between" :class="stickyActionBar">
      <MpText v-if="hasWeightError" size="label" :class="css({ color: 'text.danger' })">
        {{ weightErrorOwnerName }}'s total goal weight would be {{ weightErrorTotal }}% — it must equal exactly 100%.
      </MpText>
      <span v-else />
      <MpFlex gap="2">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="secondary" @click="onSaveAsDraft">Save as draft</MpButton>
        <MpButton variant="primary" @click="onSave">Save</MpButton>
      </MpFlex>
    </MpFlex>

    <AddGoalDrawer
      drawer-id="drawer-add-goal-create"
      v-model:is-open="isDrawerOpen"
      :owners="owners"
      :already-used-weight="alreadyUsedWeightForDrawer"
      :already-used-weight-by-owner="alreadyUsedWeightByOwner"
      :cycle-start-date="cycle?.startDate ?? ''"
      :cycle-end-date="cycle?.endDate ?? ''"
      @save="onGoalSaved"
    />
    <AddGoalDrawer
      drawer-id="drawer-add-goal-draft-edit"
      v-model:is-open="isDraftEditDrawerOpen"
      :owners="editingDraftOwnerAsList"
      :already-used-weight="alreadyUsedWeightForDraftEdit"
      :cycle-start-date="cycle?.startDate ?? ''"
      :cycle-end-date="cycle?.endDate ?? ''"
      :editing-draft="editingDraftForOwner"
      @save="onDraftEditSaved"
    />
    <AddGoalDrawer
      drawer-id="drawer-add-goal-edit"
      v-model:is-open="isEditDrawerOpen"
      :owners="editingOwners"
      :already-used-weight="alreadyUsedWeightForEdit"
      :cycle-start-date="cycle?.startDate ?? ''"
      :cycle-end-date="cycle?.endDate ?? ''"
      :editing-draft="editingDraft"
      @save="saveEdit"
    />
  </MpFlex>

  <!-- Delete confirmation -->
  <ClientOnly>
  <MpModal :is-open="isDeleteModalOpen" @close="isDeleteModalOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="css({ marginTop: '80px' })">
      <MpModalHeader>
        Delete goal?
        <MpModalCloseButton @click="isDeleteModalOpen = false" />
      </MpModalHeader>
      <MpModalBody>
        <MpText :class="valueText">
          <strong>{{ goalToDelete?.title }}</strong> will be permanently deleted and cannot be recovered.
        </MpText>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="isDeleteModalOpen = false">Cancel</MpButton>
          <MpButton variant="danger" @click="confirmDeleteGoal">Delete</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
  </ClientOnly>

  <!-- Leave without saving -->
  <ClientOnly>
  <MpModal :is-open="isLeaveConfirmOpen" @close="cancelLeave">
    <MpModalOverlay />
    <MpModalContent :class="css({ marginTop: '80px' })">
      <MpModalHeader>
        Leave without saving?
        <MpModalCloseButton @click="cancelLeave" />
      </MpModalHeader>
      <MpModalBody>
        <MpText :class="valueText">
          The goals you've added haven't been saved yet and will be lost if you leave this page. Save as draft to keep them.
        </MpText>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="cancelLeave">Cancel</MpButton>
          <MpButton variant="secondary" @click="saveAsDraftAndLeave">Save as draft</MpButton>
          <MpButton variant="primary" @click="discardAndLeave">Discard</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
  </ClientOnly>
</template>
