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
  toast,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES, employeeMeta } from '~/utils/employees'
import { MEASUREMENT_UNIT_OPTIONS } from '~/utils/goalTaxonomy'
import type { DraftGoal } from '~/utils/goalDraft'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
  title: 'New goals',
})

const route = useRoute()
const router = useRouter()
const { cycles } = useGoalCyclesStore()

const cycle = computed(() => cycles.value.find(c => c.id === route.params.id))
const weightMandatory = computed(() => cycle.value?.weightMandatory ?? false)

const ownerIds = computed(() => {
  const raw = route.query.employees
  const list = Array.isArray(raw) ? raw[0] : raw
  return (list ?? '').split(',').filter(Boolean)
})
const owners = computed(() => EMPLOYEES.filter(e => ownerIds.value.includes(e.id)))

const goals = ref<DraftGoal[]>([])
const isDrawerOpen = ref(false)
const hasWeightError = ref(false)

const totalWeight = computed(() => goals.value.reduce((sum, g) => sum + g.weight, 0))
watch(totalWeight, () => { hasWeightError.value = false })

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

function onCancel() {
  router.push(`/goals/goal-cycles/${route.params.id}`)
}
function persistAndLeave() {
  toast.notify({
    id: 'new-goals-saved',
    position: 'top-center',
    variant: 'success',
    title: 'Goals saved',
  })
  router.push(`/goals/goal-cycles/${route.params.id}`)
}
function onSaveAsDraft() {
  persistAndLeave()
}
function onSave() {
  hasWeightError.value = weightMandatory.value && totalWeight.value !== 100
  if (hasWeightError.value) return
  persistAndLeave()
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const ownersBar = css({ display: 'flex', alignItems: 'center', gap: '3', paddingBottom: '5' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'top' })

const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const descText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const detailGrid = css({ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '3', rowGap: '1', marginTop: '2' })
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
</script>

<template>
  <MpFlex direction="column" gap="0">
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

    <!-- Goals table -->
    <MpTableContainer :class="tableOuterBorder">
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
          <MpTableRow v-if="goals.length === 0">
            <MpTableCell as="td" :colspan="6" :class="css({ textAlign: 'center', paddingBlock: '8' })">
              <MpText size="label" :class="captionText">No goals yet. Click "Add goal" to create one.</MpText>
            </MpTableCell>
          </MpTableRow>
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

              <div :class="detailGrid">
                <span :class="detailLabel">Measurement unit</span>
                <span :class="detailValue">
                  {{ measurementUnitLabel(goal) }}
                  <span :class="captionText">· {{ directionLabel(goal) }}</span>
                </span>
                <span :class="detailLabel">Target</span>
                <span :class="detailValue">
                  {{ formatValue(goal, goal.targetValue) }}
                  <span v-if="goal.useBaseline" :class="captionText">· Baseline: {{ formatValue(goal, goal.baselineValue) }}</span>
                </span>
              </div>

              <!-- Single owner: flat contributor list -->
              <div v-if="owners.length === 1" :class="ownerContribBlockFirst">
                <span :class="detailLabel">Goal contributor</span>
                <MpFlex v-if="contributorsFor(goal, owners[0].id).length" gap="1">
                  <MpAvatar v-for="c in contributorsFor(goal, owners[0].id)" :key="c!.id" :id="c!.id" :name="c!.name" :src="c!.photo" size="sm" variant-color="gray" />
                </MpFlex>
                <span v-else :class="captionText">—</span>
              </div>

              <!-- Multiple owners: nested per-owner block -->
              <template v-else>
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
                <MpPopoverContent>
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

      <div v-if="weightMandatory && goals.length" :class="totalRow">
        <MpText size="label" weight="semiBold" :class="valueText">Total goal weight</MpText>
        <MpText size="label" :class="totalWeight === 100 ? css({ color: 'text.success' }) : css({ color: 'text.danger' })">
          {{ totalWeight }}% of 100%
        </MpText>
      </div>

      <button type="button" :class="addGoalRow" @click="openAddGoal">
        <MpIcon name="add" size="sm" />
        Add goal
      </button>
    </MpTableContainer>

    <MpFlex align="center" justify="space-between" :class="css({ paddingTop: '5' })">
      <MpText v-if="hasWeightError" size="label" :class="css({ color: 'text.danger' })">
        Total goal weight must equal 100% before saving — currently at {{ totalWeight }}%.
      </MpText>
      <span v-else />
      <MpFlex gap="2">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="secondary" @click="onSaveAsDraft">Save as draft</MpButton>
        <MpButton variant="primary" @click="onSave">Save</MpButton>
      </MpFlex>
    </MpFlex>

    <AddGoalDrawer
      v-model:is-open="isDrawerOpen"
      :owners="owners"
      :already-used-weight="totalWeight"
      @save="onGoalSaved"
    />
  </MpFlex>
</template>
