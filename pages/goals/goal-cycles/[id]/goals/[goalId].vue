<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal details
  Token mode: Pixel 2.4 (DT2.4)

  Reached by clicking a goal's name (or Actions → View details) inside a goal
  cycle. Replicates the production "Goal details" page
  (talenta-review src/views/goals/general/Detail.vue): a main column
  (name + weight + status, description, goal progress, then Key results OR
  Aligned goals for company-level goals) beside a right info sidebar
  (owner, period, measurement, category, contributors, alignment).

  All data reads from the goals mini-DB (useGoalsStore) by cycle + goal id.
  Update progress, Edit, Delete and Key result add/edit/delete all persist
  back through the same store (localStorage "talenta-goals-db"), reusing the
  shared useGoalEditor / useGoalDeleter flows the goal lists already use.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpAvatar,
  MpAvatarGroup,
  MpIcon,
  MpBadge,
  MpButton,
  MpButtonGroup,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
  MpFormControl,
  MpFormLabel,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  toast,
  css,
} from '@mekari/pixel3'
import type { Goal, GoalStatus } from '~/composables/useGoalsStore'
import type { DraftKeyResult } from '~/utils/goalDraft'
import { ownerOf, alignedGoalsOf } from '~/utils/goalRows'
import { employeeById } from '~/utils/employees'

definePageMeta({
  layout: 'default',
  title: 'Goal details',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
})

const route = useRoute()
const router = useRouter()
const cycleId = computed(() => route.params.id as string)
const goalId = computed(() => route.params.goalId as string)

const { goals, updateGoal } = useGoalsStore(cycleId.value)
const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === cycleId.value))
const goal = computed(() => goals.value.find(g => g.id === goalId.value))

// Link back to the cycle for the second breadcrumb crumb (layouts/default.vue
// renders "Goal cycles / <cycleName>" when ?cycleName= is present).
const cycleName = computed(() => (route.query.cycleName as string) || cycle.value?.name || '')

// ─── Derived display ──────────────────────────────────────────────────────────
const owner = computed(() => (goal.value ? employeeById(goal.value.ownerId) : undefined))
const ownerMeta = computed(() => (owner.value ? ownerOf(owner.value.id) : null))

const MEASUREMENT_UNIT_LABEL: Record<NonNullable<Goal['unit']>, string> = {
  currency: 'Amount',
  percent: 'Percentage (%)',
  count: 'Number',
  deadline: 'Deadline',
}
const measurementUnitLabel = computed(() => (goal.value?.unit ? MEASUREMENT_UNIT_LABEL[goal.value.unit] : '—'))
const measurementTypeLabel = computed(() =>
  goal.value?.direction === 'lower' ? 'Decrease KPI' : goal.value?.direction === 'higher' ? 'Increase KPI' : '—',
)

const STATUS_LABEL: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not updated' }

const contributors = computed(() =>
  (goal.value?.contributorIds ?? []).map(id => employeeById(id)).filter(Boolean) as NonNullable<ReturnType<typeof employeeById>>[],
)

// Alignment — the parent goal this one cascades from, plus its own children
// (every goal whose alignedToId points back at this one).
const parentGoal = computed(() => (goal.value?.alignedToId ? goals.value.find(g => g.id === goal.value!.alignedToId) : undefined))
const alignedChildren = computed(() => (goal.value ? alignedGoalsOf(goal.value, goals.value) : []))

const keyResults = computed<DraftKeyResult[]>(() => goal.value?.keyResults ?? [])
const isCompany = computed(() => goal.value?.level === 'company')

// ─── Column sort (per table; behaviour from goal-cycles/index.vue) ─────────────
// Aligned goals table (company level).
const alSortKey = ref('')
const alSortDir = ref<'asc' | 'desc'>('asc')
function onAlSortChange(key: string, dir: 'asc' | 'desc') { alSortKey.value = key; alSortDir.value = dir }
const alColumnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  goal: 'text',
  weight: 'number',
  owner: 'text',
  status: 'text',
}
function alSortValue(g: Goal, key: string): string | number {
  if (key === 'goal') return g.title
  if (key === 'weight') return g.weight ?? 0
  if (key === 'owner') return ownerOf(g.ownerId).name
  if (key === 'status') return STATUS_LABEL[g.status]
  return ''
}
const sortedAligned = computed(() => {
  if (!alSortKey.value) return alignedChildren.value
  const dir = alSortDir.value === 'asc' ? 1 : -1
  return [...alignedChildren.value].sort((a, b) =>
    String(alSortValue(a, alSortKey.value)).localeCompare(
      String(alSortValue(b, alSortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// Key results table (rows keyed by stable kr.id; add/edit happens in a drawer,
// so sorting a copy for display can't corrupt any inline entry state).
const krSortKey = ref('')
const krSortDir = ref<'asc' | 'desc'>('asc')
function onKrSortChange(key: string, dir: 'asc' | 'desc') { krSortKey.value = key; krSortDir.value = dir }
const krColumnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  title: 'text',
  target: 'text',
}
function krSortValue(kr: DraftKeyResult, key: string): string {
  if (key === 'title') return kr.title
  if (key === 'target') return kr.target ?? ''
  return ''
}
const sortedKeyResults = computed(() => {
  if (!krSortKey.value) return keyResults.value
  const dir = krSortDir.value === 'asc' ? 1 : -1
  return [...keyResults.value].sort((a, b) =>
    String(krSortValue(a, krSortKey.value)).localeCompare(
      String(krSortValue(b, krSortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}
function formatValue(unit: Goal['unit'], v: number | undefined): string {
  if (v == null) return '—'
  if (unit === 'currency') return `Rp${formatNumber(v)}`
  if (unit === 'percent') return `${v}%`
  return `${formatNumber(v)}`
}
function goalHref(id: string) {
  return { path: `/goals/goal-cycles/${cycleId.value}/goals/${id}`, query: { cycleName: cycleName.value } }
}

// ─── Update progress ────────────────────────────────────────────────────────
const isUpdateOpen = ref(false)
const upStatus = ref<GoalStatus>('green')
const upValue = ref<number | ''>('')
function openUpdate() {
  if (!goal.value) return
  upStatus.value = goal.value.status === 'gray' ? 'green' : goal.value.status
  upValue.value = goal.value.value ?? ''
  isUpdateOpen.value = true
}
function saveUpdate() {
  if (!goal.value) return
  const patch: Partial<Goal> = { status: upStatus.value }
  if (goal.value.unit && goal.value.unit !== 'deadline') {
    const v = Number(upValue.value) || 0
    patch.value = v
    patch.pill = goal.value.max ? Math.round((v / goal.value.max) * 100) : goal.value.pill
  }
  updateGoal(goal.value.id, patch)
  isUpdateOpen.value = false
  toast.notify({ id: 'goal-progress-updated', position: 'top-center', variant: 'success', title: 'Progress updated' })
}

// ─── Edit (reuse the shared drawer flow) ──────────────────────────────────────
const { isEditDrawerOpen, editingDraft, editingOwners, alreadyUsedWeightForEdit, openEditGoal, saveEdit } = useGoalEditor()
function editGoal() {
  if (goal.value) openEditGoal(goal.value)
}

// ─── Delete (reuse the shared flow) — return to the cycle once it's gone ──────
const { isDeleteModalOpen, goalToDelete, askDeleteGoal, confirmDeleteGoal } = useGoalDeleter()
function deleteGoalAction() {
  if (goal.value) askDeleteGoal(goal.value)
}
// An actual delete removes the record from the store; a direct report's delete
// only submits for approval and keeps the goal live. Redirect back to the
// cycle only when the goal really disappears.
watch(goal, (v) => {
  if (!v) router.push({ path: `/goals/goal-cycles/${cycleId.value}`, query: { name: cycleName.value } })
})

// ─── Key results (add / edit / delete) ────────────────────────────────────────
const isKrDrawerOpen = ref(false)
const editingKrId = ref<string | null>(null)
const krTitle = ref('')
const krTarget = ref('')
const krError = ref(false)
const krDrawerTitle = computed(() => (editingKrId.value ? 'Edit key result' : 'Add key result'))
function openAddKr() {
  editingKrId.value = null
  krTitle.value = ''
  krTarget.value = ''
  krError.value = false
  isKrDrawerOpen.value = true
}
function openEditKr(kr: DraftKeyResult) {
  editingKrId.value = kr.id
  krTitle.value = kr.title
  krTarget.value = kr.target
  krError.value = false
  isKrDrawerOpen.value = true
}
function saveKr() {
  if (!goal.value) return
  krError.value = !krTitle.value.trim()
  if (krError.value) return
  const list = [...keyResults.value]
  if (editingKrId.value) {
    const i = list.findIndex(k => k.id === editingKrId.value)
    if (i !== -1) list[i] = { ...list[i], title: krTitle.value.trim(), target: krTarget.value.trim() }
  }
  else {
    list.push({ id: `kr-${Date.now()}`, title: krTitle.value.trim(), target: krTarget.value.trim() })
  }
  updateGoal(goal.value.id, { keyResults: list })
  isKrDrawerOpen.value = false
  toast.notify({ id: 'kr-saved', position: 'top-center', variant: 'success', title: editingKrId.value ? 'Key result updated' : 'Key result added' })
}
const krToDelete = ref<DraftKeyResult | null>(null)
const isKrDeleteOpen = ref(false)
function askDeleteKr(kr: DraftKeyResult) {
  krToDelete.value = kr
  isKrDeleteOpen.value = true
}
function confirmDeleteKr() {
  if (!goal.value || !krToDelete.value) return
  updateGoal(goal.value.id, { keyResults: keyResults.value.filter(k => k.id !== krToDelete.value!.id) })
  isKrDeleteOpen.value = false
  krToDelete.value = null
  toast.notify({ id: 'kr-deleted', position: 'top-center', variant: 'success', title: 'Key result deleted' })
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const bodyRow = css({ display: 'flex', alignItems: 'flex-start', gap: '0', flexWrap: { base: 'wrap', lg: 'nowrap' } })
const mainCol = css({ flex: '1', minWidth: '0', paddingRight: { base: '0', lg: '8' } })
const sideCol = css({
  width: { base: '100%', lg: '320px' }, flexShrink: '0',
  borderLeftWidth: { base: '0', lg: '1px' }, borderLeftStyle: 'solid', borderLeftColor: 'border.default',
  paddingLeft: { base: '0', lg: '8' }, paddingTop: { base: '6', lg: '0' },
  display: 'flex', flexDirection: 'column', gap: '5',
})

const nameText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '28px', color: 'text.default' })
const weightText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '28px', color: 'text.link' })
const sectionH3 = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const descText = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const emptyMuted = css({ color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })

const divider = css({ height: '1px', background: 'border.default', marginBlock: '6' })

// Progress bar — same shape as the goal lists' inline progress cell.
const progressTrack = css({ width: '100%', maxWidth: '360px', height: '8px', borderRadius: 'full', background: 'border.default', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })
const fillGray = css({ background: 'gray.400' })
const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })
const rangeRow = css({ display: 'flex', justifyContent: 'space-between', maxWidth: '360px', marginTop: '1' })
const rangeMin = css({ fontSize: '10px', lineHeight: '12px', color: 'text.secondary' })
const rangeMax = css({ fontSize: '10px', lineHeight: '12px', color: 'text.default' })

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '2', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
function statusClass(s: GoalStatus) {
  return s === 'green' ? statusPillGreen : s === 'orange' ? statusPillOrange : statusPillGray
}

// Sidebar key/value
const kvRow = css({ display: 'flex', flexDirection: 'column', gap: '0.5' })
const kvLabel = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const kvValue = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const ownerRow = css({ display: 'flex', alignItems: 'center', gap: '2' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const linkReset = css({ color: 'text.link', cursor: 'pointer', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const addKrRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2' })
const krFields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const headCell = css({ whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Header label + sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cell = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
const actionCell = css({ width: '1%', whiteSpace: 'nowrap', textAlign: 'right', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const alignCard = css({ display: 'flex', flexDirection: 'column', gap: '1' })
</script>

<template>
  <div v-if="goal">
    <!-- Page header actions -->
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="secondary" @click="openUpdate">Update progress</MpButton>
      <MpPopover is-close-on-select use-portal placement="bottom-end">
        <MpPopoverTrigger>
          <MpButton variant="secondary" left-icon="menu-kebab" aria-label="Goal actions" />
        </MpPopoverTrigger>
        <MpPopoverContent :class="css({ minWidth: '160px' })">
          <MpPopoverList>
            <MpPopoverListItem @click="openUpdate">Update progress</MpPopoverListItem>
            <MpPopoverListItem @click="editGoal">Edit goal</MpPopoverListItem>
            <MpPopoverListItem @click="deleteGoalAction">
              <span :class="css({ color: 'text.danger' })">Delete goal</span>
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
    </Teleport>

    <div :class="bodyRow">
      <!-- ═════ Main column ═════ -->
      <div :class="mainCol">
        <!-- Name + weight + status -->
        <MpFlex align="center" gap="2" wrap="wrap">
          <span :class="goalCode">{{ goal.code }}</span>
        </MpFlex>
        <MpFlex align="center" gap="2" wrap="wrap" :class="css({ marginTop: '0.5' })">
          <span :class="nameText">{{ goal.title }}</span>
          <span v-if="goal.weight" :class="weightText">({{ goal.weight }}%)</span>
          <span :class="statusClass(goal.status)">{{ STATUS_LABEL[goal.status] }}</span>
        </MpFlex>

        <!-- Description -->
        <MpText :class="[descText, css({ marginTop: '3' })]">{{ goal.description || 'No description.' }}</MpText>

        <!-- Goal progress -->
        <div :class="css({ marginTop: '6' })">
          <MpText :class="sectionH3">Goal progress</MpText>
          <div v-if="goal.unit && goal.unit !== 'deadline'" :class="css({ marginTop: '2' })">
            <MpFlex align="center" gap="1">
              <MpText size="label" :class="valueText">{{ formatValue(goal.unit, goal.value) }}</MpText>
              <span :class="pillGreen">{{ goal.pill ?? 0 }}%</span>
            </MpFlex>
            <div :class="[progressTrack, css({ marginTop: '1' })]">
              <div :class="[progressFill, goal.status === 'green' ? fillGreen : goal.status === 'orange' ? fillOrange : fillGray]" :style="{ width: `${Math.min(goal.pill ?? 0, 100)}%` }" />
            </div>
            <div :class="rangeRow">
              <span :class="rangeMin">{{ formatValue(goal.unit, goal.min ?? 0) }}</span>
              <span :class="rangeMax">{{ formatValue(goal.unit, goal.max) }}</span>
            </div>
          </div>
          <MpText v-else-if="goal.unit === 'deadline'" size="label" :class="[valueText, css({ marginTop: '2' })]">
            Deadline: {{ goal.deadlineDate || '—' }}
          </MpText>
          <MpText v-else size="label" :class="[emptyMuted, css({ marginTop: '2' })]">
            No measurable progress — tracked by status only.
          </MpText>
        </div>

        <div :class="divider" />

        <!-- Aligned goals (company) OR Key results -->
        <template v-if="isCompany">
          <MpText :class="sectionH3">Aligned goals ({{ alignedChildren.length }})</MpText>
          <MpTableContainer v-if="alignedChildren.length" :class="css({ marginTop: '3' })">
            <MpTable :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Goal</span><PxColumnSortMenu col-key="goal" :sort-type="alColumnSortTypes.goal" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Weight</span><PxColumnSortMenu col-key="weight" :sort-type="alColumnSortTypes.weight" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Owner</span><PxColumnSortMenu col-key="owner" :sort-type="alColumnSortTypes.owner" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="alColumnSortTypes.status" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="c in sortedAligned" :key="c.id">
                  <MpTableCell as="td" :class="cell">
                    <MpFlex direction="column" gap="0">
                      <span :class="goalCode">{{ c.code }}</span>
                      <span :class="linkReset" @click="router.push(goalHref(c.id))">{{ c.title }}</span>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="td" :class="cell">{{ c.weight }}%</MpTableCell>
                  <MpTableCell as="td" :class="cell">{{ ownerOf(c.ownerId).name }}</MpTableCell>
                  <MpTableCell as="td" :class="cell"><span :class="statusClass(c.status)">{{ STATUS_LABEL[c.status] }}</span></MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else :class="[emptyMuted, css({ marginTop: '2' })]">No aligned goal found.</MpText>
        </template>

        <template v-else>
          <div :class="addKrRow">
            <div>
              <MpText :class="sectionH3">Key results ({{ keyResults.length }})</MpText>
              <MpText size="label" :class="captionText">
                Key results track specific outcomes that contribute to this goal.
              </MpText>
            </div>
            <MpButton variant="secondary" left-icon="add" @click="openAddKr">Add key result</MpButton>
          </div>

          <MpTableContainer v-if="keyResults.length" :class="css({ marginTop: '3' })">
            <MpTable :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Key result name</span><PxColumnSortMenu col-key="title" :sort-type="krColumnSortTypes.title" :sort-key="krSortKey" :sort-dir="krSortDir" @sort-change="onKrSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Target</span><PxColumnSortMenu col-key="target" :sort-type="krColumnSortTypes.target" :sort-key="krSortKey" :sort-dir="krSortDir" @sort-change="onKrSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" :class="[headCell, actionCell]" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="kr in sortedKeyResults" :key="kr.id">
                  <MpTableCell as="td" :class="cell">{{ kr.title }}</MpTableCell>
                  <MpTableCell as="td" :class="cell">{{ kr.target || '—' }}</MpTableCell>
                  <MpTableCell as="td" :class="[cell, actionCell]">
                    <MpPopover is-close-on-select use-portal placement="bottom-end">
                      <MpPopoverTrigger>
                        <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Key result actions" />
                      </MpPopoverTrigger>
                      <MpPopoverContent :class="css({ minWidth: '140px' })">
                        <MpPopoverList>
                          <MpPopoverListItem @click="openEditKr(kr)">Edit</MpPopoverListItem>
                          <MpPopoverListItem @click="askDeleteKr(kr)">
                            <span :class="css({ color: 'text.danger' })">Delete</span>
                          </MpPopoverListItem>
                        </MpPopoverList>
                      </MpPopoverContent>
                    </MpPopover>
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpFlex v-else direction="column" gap="1" :class="css({ marginTop: '4', paddingBlock: '6', textAlign: 'center' })">
            <MpText :class="css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })">No key results found.</MpText>
            <MpText size="label" :class="captionText">Add a key result to start tracking outcomes for this goal.</MpText>
          </MpFlex>
        </template>
      </div>

      <!-- ═════ Right info sidebar ═════ -->
      <aside :class="sideCol">
        <div :class="kvRow">
          <span :class="kvLabel">Goal owner</span>
          <div :class="ownerRow">
            <MpAvatar v-if="owner" :id="`goal-owner-${owner.id}`" :name="owner.name" :src="owner.photo" size="md" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <MpText size="label" :class="valueText">{{ owner?.name }}</MpText>
              <MpText size="label-small" :class="captionText">{{ ownerMeta?.title }}</MpText>
            </MpFlex>
          </div>
        </div>

        <div :class="kvRow">
          <span :class="kvLabel">Goal period</span>
          <span :class="kvValue">{{ cycle?.period || '—' }}</span>
        </div>

        <div :class="kvRow">
          <span :class="kvLabel">Measurement type</span>
          <span :class="kvValue">{{ measurementTypeLabel }}</span>
        </div>

        <div :class="kvRow">
          <span :class="kvLabel">Measurement unit</span>
          <span :class="kvValue">{{ measurementUnitLabel }}</span>
        </div>

        <div :class="kvRow">
          <span :class="kvLabel">Goal category</span>
          <span :class="kvValue">{{ goal.category }} ({{ goal.categoryWeight }}%)</span>
        </div>

        <div :class="kvRow">
          <span :class="kvLabel">Goal sub-category</span>
          <span :class="kvValue">{{ goal.subCategory }}</span>
        </div>

        <div :class="kvRow">
          <span :class="kvLabel">Contributors</span>
          <MpAvatarGroup v-if="contributors.length" :id="`goal-contributors-${goal.id}`" size="md" :max="5">
            <MpAvatar v-for="c in contributors" :key="c.id" :id="`contributor-${c.id}`" :name="c.name" :src="c.photo" variant-color="gray" />
          </MpAvatarGroup>
          <span v-else :class="emptyMuted">No contributors.</span>
        </div>

        <div :class="kvRow">
          <span :class="kvLabel">Alignment</span>
          <div v-if="parentGoal" :class="alignCard">
            <span :class="goalCode">Aligned to {{ parentGoal.code }}</span>
            <span :class="linkReset" @click="router.push(goalHref(parentGoal.id))">{{ parentGoal.title }}</span>
          </div>
          <span v-else :class="emptyMuted">Not aligned to a parent goal.</span>
        </div>
      </aside>
    </div>
  </div>

  <div v-else :class="css({ padding: '20', textAlign: 'center', color: 'text.secondary' })">
    Goal not found.
  </div>

  <!-- ═════ Update progress modal ═════ -->
  <ClientOnly>
    <MpModal :is-open="isUpdateOpen" is-centered @close="isUpdateOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Update progress
          <MpModalCloseButton @click="isUpdateOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpFlex direction="column" gap="5">
            <MpFlex direction="column" gap="0">
              <span :class="goalCode">{{ goal?.code }}</span>
              <MpText size="label" :class="valueText">{{ goal?.title }}</MpText>
            </MpFlex>

            <MpFormControl id="up-status">
              <MpFormLabel>Status</MpFormLabel>
              <PxSelectPopover
                v-model="upStatus"
                :options="[
                  { value: 'green', label: 'On track' },
                  { value: 'orange', label: 'Off track' },
                ]"
                :width="'100%'"
              />
            </MpFormControl>

            <MpFormControl v-if="goal?.unit && goal.unit !== 'deadline'" id="up-value">
              <MpFormLabel>Achievement value</MpFormLabel>
              <MpInputGroup>
                <MpInputLeftAddon v-if="goal.unit === 'currency'">Rp</MpInputLeftAddon>
                <MpInput v-model="upValue" type="number" placeholder="0" />
                <MpInputRightAddon v-if="goal.unit === 'percent'">%</MpInputRightAddon>
              </MpInputGroup>
              <MpText size="label-small" :class="[captionText, css({ marginTop: '1' })]">
                Target: {{ formatValue(goal.unit, goal.max) }}
              </MpText>
            </MpFormControl>
          </MpFlex>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isUpdateOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="saveUpdate">Save changes</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- ═════ Key result drawer ═════ -->
  <ClientOnly>
    <MpDrawer id="drawer-key-result" :is-open="isKrDrawerOpen" placement="right" size="md" is-keep-alive @close="isKrDrawerOpen = false">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ krDrawerTitle }}
          <MpDrawerCloseButton />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div :class="krFields">
            <MpFormControl id="kr-title" :is-invalid="krError">
              <MpFormLabel>Key result name</MpFormLabel>
              <MpInput v-model="krTitle" placeholder="e.g. Ship the new onboarding flow" />
            </MpFormControl>
            <MpFormControl id="kr-target">
              <MpFormLabel>Target</MpFormLabel>
              <MpInput v-model="krTarget" placeholder="e.g. 100% / 500 units / By June 30" />
            </MpFormControl>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isKrDrawerOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="saveKr">{{ editingKrId ? 'Save changes' : 'Save' }}</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>

  <!-- Key result delete confirmation -->
  <ClientOnly>
    <MpModal :is-open="isKrDeleteOpen" is-centered @close="isKrDeleteOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Delete key result
          <MpModalCloseButton @click="isKrDeleteOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="valueText"><strong>{{ krToDelete?.title }}</strong> will be permanently deleted.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isKrDeleteOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDeleteKr">Delete</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Edit goal (shared drawer) -->
  <AddGoalDrawer
    drawer-id="drawer-edit-goal-detail"
    v-model:is-open="isEditDrawerOpen"
    :owners="editingOwners"
    :already-used-weight="alreadyUsedWeightForEdit"
    :cycle-start-date="cycle?.startDate ?? ''"
    :cycle-end-date="cycle?.endDate ?? ''"
    :editing-draft="editingDraft"
    @save="saveEdit"
  />

  <!-- Delete goal confirmation (shared flow) -->
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
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule (not a
   Panda css() @layer utility) so it beats PxColumnSortMenu's unlayered scoped
   `visibility: hidden` on specificity — see goal-cycles/index.vue. */
.gd-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
