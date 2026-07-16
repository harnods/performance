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
import { MEASUREMENT_UNIT_OPTIONS } from '~/utils/goalTaxonomy'
import type { DraftGoal } from '~/utils/goalDraft'
import { goalFromDraft, LEVEL_TO_GOAL_TYPE_LABEL } from '~/utils/goalMapping'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
  title: 'New goals',
})

const route = useRoute()
const router = useRouter()
const { cycles } = useGoalCyclesStore()
const { goals: allGoals, addGoals } = useGoalsStore()

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
// The drawer only takes one shared number — use the highest existing total
// across the selected owners so no owner can be pushed over 100%, even
// though each owner's own existing total may differ.
const maxExistingWeight = computed(() => Math.max(0, ...Array.from(existingWeightByOwner.value.values())))
const alreadyUsedWeightForDrawer = computed(() => maxExistingWeight.value + totalWeight.value)
// For a single owner (the common case) this is their real running total;
// for multiple owners each has their own baseline, so this is session-only.
const totalWeightDisplay = computed(() => (
  owners.value.length === 1
    ? (existingWeightByOwner.value.get(owners.value[0].id) ?? 0) + totalWeight.value
    : totalWeight.value
))

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
function removeGoal(id: string) {
  goals.value = goals.value.filter(g => g.id !== id)
}

function unitSuffix(goal: DraftGoal) {
  if (goal.measurementUnit === 'percentage') return '%'
  if (goal.measurementUnit === 'amount') return 'Rp'
  return ''
}
function formatValue(goal: DraftGoal, value: number) {
  return goal.measurementUnit === 'amount' ? `Rp${value.toLocaleString('id-ID')}` : `${value}${unitSuffix(goal)}`
}
function directionLabel(goal: DraftGoal) {
  return goal.direction === 'higher' ? 'Higher is better' : 'Lower is better'
}
function measurementUnitLabel(goal: DraftGoal) {
  return MEASUREMENT_UNIT_OPTIONS.find(o => o.value === goal.measurementUnit)?.label ?? goal.measurementUnit
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
  const goalsToSave = goals.value.flatMap(draft => goalsFromDraft(draft, owners.value, isDraft))
  addGoals(goalsToSave, route.params.id as string)
  toast.notify({
    id: 'new-goals-saved',
    position: 'top-center',
    variant: 'success',
    title: 'Goals saved',
  })
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
      const combined = (existingWeightByOwner.value.get(owner.id) ?? 0) + totalWeight.value
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
const descText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const detailRow = css({ marginTop: '2' })
const detailLabel = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const detailValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })

const ownerContribBlock = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingTop: '2', paddingBottom: '2', borderTop: '1px solid', borderTopColor: 'border.default' })
const ownerContribBlockFirst = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingTop: '2', paddingBottom: '2' })

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
              <MpText v-if="owners.length > 1" size="label-small" :class="captionText">Owner: {{ g.ownerName }}</MpText>
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

          <!-- Drafted this session, not yet saved -->
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
              <MpText v-if="goal.description" :class="descText">{{ goal.description }}</MpText>

              <!-- Single owner: Measurement unit / Target / Goal contributor
                   sit side by side, each its own label-above-value column -->
              <MpFlex v-if="owners.length === 1" gap="6" :class="detailRow">
                <MpFlex direction="column" gap="0">
                  <span :class="detailLabel">Measurement unit</span>
                  <span :class="detailValue">
                    {{ measurementUnitLabel(goal) }}
                    <span :class="captionText">· {{ directionLabel(goal) }}</span>
                  </span>
                </MpFlex>
                <MpFlex direction="column" gap="0">
                  <span :class="detailLabel">Target</span>
                  <span :class="detailValue">
                    {{ formatValue(goal, goal.targetValue) }}
                    <span v-if="goal.useBaseline" :class="captionText">· Baseline: {{ formatValue(goal, goal.baselineValue) }}</span>
                  </span>
                </MpFlex>
                <MpFlex direction="column" gap="0">
                  <span :class="detailLabel">Goal contributor</span>
                  <MpFlex v-if="contributorsFor(goal, owners[0].id).length" gap="1">
                    <MpAvatar v-for="c in contributorsFor(goal, owners[0].id)" :key="c!.id" :id="c!.id" :name="c!.name" :src="c!.photo" size="sm" variant-color="gray" />
                  </MpFlex>
                  <span v-else :class="captionText">—</span>
                </MpFlex>
              </MpFlex>

              <!-- Multiple owners: Measurement unit / Target inline, then a
                   nested per-owner block for owner + contributor -->
              <template v-else>
                <MpFlex gap="6" :class="detailRow">
                  <MpFlex direction="column" gap="0">
                    <span :class="detailLabel">Measurement unit</span>
                    <span :class="detailValue">
                      {{ measurementUnitLabel(goal) }}
                      <span :class="captionText">· {{ directionLabel(goal) }}</span>
                    </span>
                  </MpFlex>
                  <MpFlex direction="column" gap="0">
                    <span :class="detailLabel">Target</span>
                    <span :class="detailValue">
                      {{ formatValue(goal, goal.targetValue) }}
                      <span v-if="goal.useBaseline" :class="captionText">· Baseline: {{ formatValue(goal, goal.baselineValue) }}</span>
                    </span>
                  </MpFlex>
                </MpFlex>
                <div v-for="(owner, oi) in owners" :key="owner.id" :class="oi === 0 ? ownerContribBlockFirst : ownerContribBlock">
                  <span :class="detailLabel">Goal owner</span>
                  <span :class="detailValue">{{ owner.name }}</span>
                  <span :class="captionText">{{ employeeMeta(owner) }}</span>
                  <span :class="detailLabel">Goal contributor</span>
                  <MpFlex v-if="contributorsFor(goal, owner.id).length" gap="1">
                    <MpAvatar v-for="c in contributorsFor(goal, owner.id)" :key="c!.id" :id="c!.id" :name="c!.name" :src="c!.photo" size="sm" variant-color="gray" />
                  </MpFlex>
                  <span v-else :class="captionText">—</span>
                </div>
              </template>
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
        </MpTableBody>
      </MpTable>

      <div v-if="weightMandatory && (goals.length || hasExistingGoals)" :class="totalRow">
        <MpText size="label" weight="semiBold" :class="valueText">Total goal weight</MpText>
        <MpText size="label" :class="totalWeightDisplay === 100 ? css({ color: 'text.success' }) : css({ color: 'text.danger' })">
          {{ totalWeightDisplay }}% of 100%
        </MpText>
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
      :cycle-start-date="cycle?.startDate ?? ''"
      :cycle-end-date="cycle?.endDate ?? ''"
      @save="onGoalSaved"
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
