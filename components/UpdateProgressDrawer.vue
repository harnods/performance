<script setup lang="ts">
/*
  Update goal progress — shared right drawer (production parity).

  Extracted from the goal detail page so any goal list (goal-cycle index,
  scoped Company/Org/Team/Individual pages) can open it in place via a row
  action, without navigating to the detail page.

  Progress precedence (prod parity): key results → aligned children → manual.
  Status is decided manually and drives every progress-bar colour.
*/
import {
  MpDrawer, MpDrawerOverlay, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton,
  MpDrawerBody, MpDrawerFooter,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpButton, MpButtonGroup, MpFlex, MpText, MpBadge, MpIcon,
  MpBanner, MpBannerIcon, MpBannerDescription,
  MpFormControl, MpFormLabel, MpFormHelpText, MpInput, MpInputGroup, MpInputLeftAddon, MpInputRightAddon,
  MpTextarea, MpDatePicker, MpUpload,
  toast, css,
} from '@mekari/pixel3'
import type { Goal, GoalStatus } from '~/composables/useGoalsStore'
import { EMPLOYEE_MANAGER } from '~/composables/useGoalsStore'
import { employeeById } from '~/utils/employees'
import type { DraftKeyResult } from '~/utils/goalDraft'
import { alignedGoalsOf } from '~/utils/goalRows'

const props = defineProps<{ isOpen: boolean, goal: Goal | null }>()
const emit = defineEmits<{ close: [], saved: [] }>()

const { goals, updateGoal } = useGoalsStore()
const { cycles } = useGoalCyclesStore()
const { logActivity } = useGoalActivityStore()
const { createSubmission } = useGoalApprovalsStore()

const cycle = computed(() => cycles.value.find(c => c.id === props.goal?.cycleId))
const approverName = computed(() => employeeById(EMPLOYEE_MANAGER[props.goal?.ownerId ?? ''] ?? '')?.name ?? 'your manager')
const keyResults = computed<DraftKeyResult[]>(() => props.goal?.keyResults ?? [])
const alignedChildren = computed(() => (props.goal ? alignedGoalsOf(props.goal, goals.value) : []))

// ─── Labels / formatting ──────────────────────────────────────────────────
const GOAL_TYPE_LABEL: Record<string, string> = { company: 'Company goal', organization: 'Organization goal', team: 'Team goal', individual: 'Individual goal' }
const STATUS_LABEL: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not updated' }
const STATUS_BADGE_TYPE: Record<GoalStatus, 'completed' | 'critical' | 'announcement'> = { green: 'completed', orange: 'critical', gray: 'announcement' }
function statusBadgeType(s?: GoalStatus) { return STATUS_BADGE_TYPE[s ?? 'gray'] }
function betterLabel(dir?: 'higher' | 'lower') { return dir === 'lower' ? 'Lower is better' : 'Higher is better' }
function mechanismLabel(m?: string) { return m === 'log-based' ? 'Log-based' : 'Manual entry' }
const goalTypeLabel = computed(() => (props.goal ? (GOAL_TYPE_LABEL[props.goal.level] ?? props.goal.level) : '—'))
const goalStatusLabel = computed(() => (props.goal ? STATUS_LABEL[props.goal.status] : '—'))
const goalMechanism = computed(() => keyResults.value[0]?.progressMechanism ?? 'manual')
const goalDescriptionText = computed(() => (props.goal?.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())

function formatNumber(n: number): string { return n.toLocaleString('id-ID') }
function formatValue(unit: Goal['unit'], v: number | undefined): string {
  if (v == null) return '—'
  if (unit === 'currency') return `Rp${formatNumber(v)}`
  if (unit === 'percent') return `${v}%`
  return `${formatNumber(v)}`
}
function krFmt(kr: DraftKeyResult, v: number | '' | undefined): string {
  if (v === '' || v == null) return '—'
  if (kr.measurementUnit === 'amount') return `Rp${formatNumber(Number(v))}`
  if (kr.measurementUnit === 'percentage') return `${v}%`
  return formatNumber(Number(v))
}
function krPct(kr: DraftKeyResult): number {
  const base = kr.useBaseline && typeof kr.startValue === 'number' ? kr.startValue : 0
  const target = Number(kr.targetValue)
  const cur = Number(kr.currentValue)
  const span = kr.kpiDirection === 'lower' ? base - target : target - base
  if (!span) return 0
  const done = kr.kpiDirection === 'lower' ? base - cur : cur - base
  return Math.max(0, Math.min(100, Math.round((done / span) * 100)))
}

// ─── State ────────────────────────────────────────────────────────────────
const upStatus = ref<GoalStatus>('green')
const upValue = ref<number | ''>('')
const krDraft = ref<{ id: string, currentValue: number | '' }[]>([])
const upNotes = ref('')
const upEffectiveDate = ref<Date | null>(null)
const upFiles = ref<{ name: string, sizeLabel: string }[]>([])
const isConfirmUpdateOpen = ref(false)

const updateMode = computed<'kr' | 'children' | 'goal'>(() =>
  (keyResults.value.length ? 'kr' : (alignedChildren.value.length ? 'children' : 'goal')))

// Same roll-up rule as `children` mode, but scoped to a single key result:
// when another goal aligns to THIS goal's key result, that key result is a
// roll-up target — its progress comes from the child, so the parent can't type
// into it. Only the parent side is locked; the child updates as normal.
// alignedGoalsOf() drops alignedToKrId, so this reads the raw goals instead.
const rollupKrIds = computed(() => {
  const g = props.goal
  if (!g) return new Set<string>()
  return new Set(
    goals.value
      .filter(child => child.alignedToId === g.id && child.alignedToKrId)
      .map(child => child.alignedToKrId as string),
  )
})
function krIsRollup(id: string) { return rollupKrIds.value.has(id) }
function krMeta(id: string) { return keyResults.value.find(k => k.id === id) }
function krDraftPct(d: { id: string, currentValue: number | '' }) {
  const kr = krMeta(d.id)
  if (!kr) return 0
  const start = typeof kr.startValue === 'number' ? kr.startValue : 0
  const target = Number(kr.targetValue)
  const cur = d.currentValue === '' ? 0 : Number(d.currentValue)
  if (!Number.isFinite(target) || target === start) return 0
  const raw = kr.kpiDirection === 'lower' ? (start - cur) / (start - target) : (cur - start) / (target - start)
  return Math.max(0, Math.min(100, Math.round(raw * 100)))
}
const statusOptions = computed(() => (props.goal?.unit === 'deadline'
  ? [{ value: 'green', label: 'Complete' }, { value: 'gray', label: 'Not started' }]
  : [{ value: 'green', label: 'On track' }, { value: 'orange', label: 'Off track' }, { value: 'gray', label: 'Not updated' }]))

function bytesLabel(n: number) {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}
function onUploadFiles(payload: unknown) {
  const raw = (payload as { target?: { files?: FileList } })?.target?.files ?? payload
  const list: File[] = raw instanceof FileList ? Array.from(raw) : Array.isArray(raw) ? raw as File[] : []
  for (const f of list) {
    if (upFiles.value.length >= 5) break
    upFiles.value = [...upFiles.value, { name: f.name, sizeLabel: bytesLabel(f.size) }]
  }
}
function removeUpFile(i: number) { upFiles.value = upFiles.value.filter((_, idx) => idx !== i) }
function disabledFutureDate(d: Date) { return d.getTime() > Date.now() }

// Init each time the drawer opens.
watch(() => props.isOpen, (open) => {
  if (!open || !props.goal) return
  upStatus.value = props.goal.status
  upValue.value = props.goal.value ?? ''
  krDraft.value = keyResults.value.map(kr => ({
    id: kr.id,
    currentValue: typeof kr.currentValue === 'number' ? kr.currentValue : (typeof kr.startValue === 'number' ? kr.startValue : 0),
  }))
  upNotes.value = ''
  upEffectiveDate.value = null
  upFiles.value = []
  isConfirmUpdateOpen.value = false
})

function confirmSubmitUpdate() { isConfirmUpdateOpen.value = false; saveUpdate() }
function saveUpdate() {
  const g = props.goal
  if (!g) return
  if (updateMode.value === 'children') { emit('close'); return } // read-only roll-up

  // Build the progress patch (same for both immediate + approval paths).
  const patch: Partial<Goal> = { status: upStatus.value }
  if (updateMode.value === 'kr') {
    const list = keyResults.value.map((kr) => {
      const d = krDraft.value.find(x => x.id === kr.id)
      // A roll-up key result is owned by its aligned child — never write this
      // drawer's value over it, even though its input is already disabled.
      const cur = krIsRollup(kr.id)
        ? (kr.currentValue ?? 0)
        : d ? (d.currentValue === '' ? 0 : Number(d.currentValue)) : (kr.currentValue ?? 0)
      const start = typeof kr.startValue === 'number' ? kr.startValue : 0
      const target = Number(kr.targetValue)
      const pct = (!Number.isFinite(target) || target === start)
        ? 0
        : Math.max(0, Math.min(100, Math.round(((kr.kpiDirection === 'lower' ? start - cur : cur - start) / (kr.kpiDirection === 'lower' ? start - target : target - start)) * 100)))
      const status: DraftKeyResult['status'] = pct === 0 ? 'gray' : pct < 45 ? 'orange' : undefined
      return { ...kr, currentValue: cur, status }
    })
    const goalPct = Math.round(list.reduce((a, kr) => a + krPct(kr), 0) / (list.length || 1))
    const max = g.max ?? 100
    const min = g.min ?? 0
    patch.keyResults = list
    patch.pill = goalPct
    patch.value = g.unit ? Math.round(min + (max - min) * (goalPct / 100)) : g.value
  }
  else if (g.unit && g.unit !== 'deadline') {
    const v = Number(upValue.value) || 0
    patch.value = v
    patch.pill = g.max ? Math.round((v / g.max) * 100) : g.pill
  }

  // A direct report's progress update goes to the approval queue (submitted as
  // an edit that touches only value/pill — the review UI labels it "Update goal
  // progress"); everyone else applies immediately.
  if (needsApproval(g.ownerId)) {
    const { cycleId, ...rest } = g
    createSubmission(
      [{ type: 'edit', goalId: g.id, ownerId: g.ownerId, cycleId: g.cycleId, before: g, after: { ...rest, ...patch } }],
      g.ownerId,
      g.cycleId,
    )
    toast.notify({ id: 'goal-progress-submitted', position: 'top-center', variant: 'success', title: 'Progress update sent for approval' })
    emit('saved')
    emit('close')
    return
  }

  updateGoal(g.id, patch)
  // Record it in the activity log + bump the goal's "last updated" stamp.
  logActivity(g.id, {
    type: 'progress',
    status: upStatus.value,
    wording: keyResults.value.length
      ? `Updated the key results — goal achievement is now ${g.pill ?? 0}%.`
      : (g.unit && g.unit !== 'deadline'
        ? `Updated the goal progress to ${g.pill ?? 0}%.`
        : `Set the goal status to ${STATUS_LABEL[upStatus.value]}.`),
    files: upFiles.value.length ? upFiles.value.map(f => ({ name: f.name, sizeLabel: f.sizeLabel })) : undefined,
  })
  toast.notify({ id: 'goal-progress-updated', position: 'top-center', variant: 'success', title: 'Progress updated' })
  emit('saved')
  emit('close')
}

// ─── Styles ───────────────────────────────────────────────────────────────
const valueText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const sectionH2 = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const progressTrack = css({ width: '100%', maxWidth: '360px', height: '8px', borderRadius: 'full', background: 'border.default', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })
const fillGray = css({ background: 'gray.400' })
const rangeRow = css({ display: 'flex', justifyContent: 'space-between', maxWidth: '360px', marginTop: '1' })
const rangeMin = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const rangeMax = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })
const pillRose = css({ ...pillBase, background: 'red.50', color: 'red.700' })
const pillGray = css({ ...pillBase, background: 'gray.100', color: 'gray.600' })
function pillClass(s?: GoalStatus) { return s === 'orange' ? pillRose : s === 'gray' ? pillGray : pillGreen }
const statusFillClass = computed(() => (upStatus.value === 'orange' ? fillOrange : upStatus.value === 'gray' ? fillGray : fillGreen))
const upPillClass = computed(() => pillClass(upStatus.value))
const upHeaderBlock = css({ display: 'flex', flexDirection: 'column', gap: '2', marginTop: '-6', marginInline: '-6', paddingInline: '6', paddingTop: '6', paddingBottom: '6', background: 'gray.25', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const upStatusControl = css({ flexShrink: '0', width: '180px' })
const upFieldW = css({ maxWidth: '264px' })
const upMetaRow = css({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3', fontSize: '12px', lineHeight: '16px', color: 'text.default' })
const upMetaItem = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
const upMetaSep = css({ width: '1px', height: '12px', background: 'border.default' })
const krProgRow = css({ display: 'flex', flexDirection: 'column', gap: '2', paddingTop: '4', paddingBottom: '4', borderBottom: '1px solid', borderBottomColor: 'border.default', _lastOfType: { borderBottom: 'none' } })
const upItemRow = css({ display: 'flex', alignItems: 'flex-start', gap: '6' })
const upItemBar = css({ flexGrow: '1', minWidth: '0' })
const upItemInput = css({ flexShrink: '0', width: '33%' })
const upFileRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', padding: '2', borderRadius: '6px', border: '1px solid', borderColor: 'border.default', marginTop: '2' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :is-open="isOpen" size="lg" placement="right" :is-close-on-overlay-click="false" @close="emit('close')">
      <MpDrawerOverlay />
      <MpDrawerContent>
        <MpDrawerHeader>
          Update progress
          <MpDrawerCloseButton @click="emit('close')" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <MpFlex direction="column" gap="5">
            <!-- Goal summary header block -->
            <div v-if="goal" :class="upHeaderBlock">
              <MpFlex align="flex-start" justify="space-between" gap="4">
                <MpFlex direction="column" gap="0">
                  <span :class="[goalCode, css({ color: 'text.default' })]">{{ goal.code }}</span>
                  <MpText size="label" weight="semiBold" :class="valueText">
                    {{ goal.title }}<template v-if="goal.weight"> ({{ goal.weight }}%)</template>
                  </MpText>
                </MpFlex>
                <div v-if="updateMode !== 'children'" :class="upStatusControl">
                  <PxSelectPopover v-model="upStatus" :options="statusOptions" :width="'180px'" />
                </div>
                <MpBadge v-else for="tableStatus" :type="statusBadgeType(goal.status)" size="sm">{{ goalStatusLabel }}</MpBadge>
              </MpFlex>
              <div :class="upMetaRow">
                <span :class="upMetaItem">{{ goalTypeLabel }}</span>
                <span :class="upMetaSep" />
                <span :class="upMetaItem">{{ cycle?.period ?? '—' }}</span>
                <template v-if="goal.direction">
                  <span :class="upMetaSep" />
                  <span :class="upMetaItem">{{ betterLabel(goal.direction) }}</span>
                </template>
                <span :class="upMetaSep" />
                <span :class="upMetaItem">{{ mechanismLabel(goalMechanism) }}</span>
              </div>
              <div v-if="goalDescriptionText" :class="css({ fontSize: '12px', lineHeight: '18px', color: 'text.default' })">{{ goalDescriptionText }}</div>
              <div :class="upMetaRow">
                <span :class="upMetaItem">{{ goal.category }}<template v-if="goal.subCategory"> · {{ goal.subCategory }}</template></span>
              </div>
              <div :class="css({ marginTop: '1' })">
                <MpFlex align="center" gap="2">
                  <MpText size="label" weight="semiBold" :class="valueText">
                    <template v-if="goal.unit && goal.unit !== 'deadline'">{{ formatValue(goal.unit, goal.value) }}</template>
                    <template v-else>{{ goal.pill ?? 0 }}%</template>
                  </MpText>
                  <span :class="upPillClass">{{ goal.pill ?? 0 }}%</span>
                </MpFlex>
                <div :class="[progressTrack, css({ maxWidth: 'none', marginTop: '1' })]">
                  <div :class="[progressFill, statusFillClass]" :style="{ width: `${Math.min(goal.pill ?? 0, 100)}%` }" />
                </div>
                <div v-if="goal.unit && goal.unit !== 'deadline'" :class="[rangeRow, css({ maxWidth: 'none' })]">
                  <span :class="rangeMin">{{ formatValue(goal.unit, goal.min ?? 0) }}</span>
                  <span :class="rangeMax">{{ formatValue(goal.unit, goal.max) }}</span>
                </div>
              </div>
            </div>

            <MpBanner v-if="updateMode === 'children'" variant="info" is-inline>
              <MpBannerIcon />
              <MpBannerDescription>Progress cannot be updated manually if they have goal aligned and the progress will be taken from the child goal.</MpBannerDescription>
            </MpBanner>

            <!-- KR-driven -->
            <template v-if="updateMode === 'kr'">
              <MpText :class="sectionH2">Key results<template v-if="krDraft.length"> ({{ krDraft.length }})</template></MpText>
              <div v-for="d in krDraft" :key="d.id" :class="krProgRow">
                <MpFlex direction="column" gap="0">
                  <MpText size="label" weight="semiBold" :class="valueText">{{ krMeta(d.id)?.title }}</MpText>
                  <div :class="upMetaRow">
                    <span :class="upMetaItem">{{ betterLabel(krMeta(d.id)?.kpiDirection) }}</span>
                    <span :class="upMetaSep" />
                    <span :class="upMetaItem">{{ mechanismLabel(krMeta(d.id)?.progressMechanism) }}</span>
                  </div>
                  <div v-if="krMeta(d.id)?.description" :class="css({ fontSize: '12px', lineHeight: '18px', color: 'text.secondary', marginTop: '1' })">{{ krMeta(d.id)?.description }}</div>
                </MpFlex>
                <div :class="upItemRow">
                  <div :class="upItemBar">
                    <MpFlex align="center" gap="2">
                      <MpText size="label" weight="semiBold" :class="valueText">{{ krFmt(krMeta(d.id)!, d.currentValue === '' ? 0 : Number(d.currentValue)) }}</MpText>
                      <span :class="upPillClass">{{ krDraftPct(d) }}%</span>
                    </MpFlex>
                    <div :class="[progressTrack, css({ maxWidth: 'none', marginTop: '1' })]">
                      <div :class="[progressFill, statusFillClass]" :style="{ width: `${krDraftPct(d)}%` }" />
                    </div>
                    <div :class="[rangeRow, css({ maxWidth: 'none' })]">
                      <span :class="rangeMin">{{ krFmt(krMeta(d.id)!, krMeta(d.id)?.startValue ?? 0) }}</span>
                      <span :class="rangeMax">{{ krFmt(krMeta(d.id)!, krMeta(d.id)?.targetValue) }}</span>
                    </div>
                  </div>
                  <div :class="upItemInput">
                    <MpFormControl :id="`up-kr-${d.id}`">
                      <MpFormLabel>Progress</MpFormLabel>
                      <MpInputGroup>
                        <MpInputLeftAddon v-if="krMeta(d.id)?.measurementUnit === 'amount'">Rp</MpInputLeftAddon>
                        <MpInput v-model="d.currentValue" type="number" placeholder="0" :is-disabled="krIsRollup(d.id)" />
                        <MpInputRightAddon v-if="krMeta(d.id)?.measurementUnit === 'percentage'">%</MpInputRightAddon>
                      </MpInputGroup>
                      <MpFormHelpText v-if="krIsRollup(d.id)">Taken from the aligned goal — can’t be updated here.</MpFormHelpText>
                    </MpFormControl>
                  </div>
                </div>
              </div>
            </template>

            <!-- Aligned children (read-only) -->
            <template v-else-if="updateMode === 'children'">
              <MpText size="label" weight="semiBold" :class="valueText">{{ alignedChildren.length }} align goal{{ alignedChildren.length === 1 ? '' : 's' }}</MpText>
              <div :class="upItemBar">
                <MpFlex align="center" gap="2">
                  <MpText size="label" weight="semiBold" :class="valueText">{{ goal?.pill ?? 0 }}%</MpText>
                </MpFlex>
                <div :class="[progressTrack, css({ maxWidth: 'none', marginTop: '1' })]">
                  <div :class="[progressFill, statusFillClass]" :style="{ width: `${Math.min(goal?.pill ?? 0, 100)}%` }" />
                </div>
              </div>
            </template>

            <!-- Leaf -->
            <template v-else>
              <div v-if="goal?.unit && goal.unit !== 'deadline'" :class="upItemRow">
                <div :class="upItemBar">
                  <MpFlex align="center" gap="2">
                    <MpText size="label" weight="semiBold" :class="valueText">{{ formatValue(goal.unit, upValue === '' ? 0 : Number(upValue)) }}</MpText>
                    <span :class="upPillClass">{{ goal?.pill ?? 0 }}%</span>
                  </MpFlex>
                  <div :class="[progressTrack, css({ maxWidth: 'none', marginTop: '1' })]">
                    <div :class="[progressFill, statusFillClass]" :style="{ width: `${Math.min(goal?.pill ?? 0, 100)}%` }" />
                  </div>
                  <div :class="[rangeRow, css({ maxWidth: 'none' })]">
                    <span :class="rangeMin">{{ formatValue(goal.unit, goal.min ?? 0) }}</span>
                    <span :class="rangeMax">{{ formatValue(goal.unit, goal.max) }}</span>
                  </div>
                </div>
                <div :class="upItemInput">
                  <MpFormControl id="up-value">
                    <MpFormLabel>Progress</MpFormLabel>
                    <MpInputGroup>
                      <MpInputLeftAddon v-if="goal?.unit === 'currency'">Rp</MpInputLeftAddon>
                      <MpInput v-model="upValue" type="number" placeholder="0" />
                      <MpInputRightAddon v-if="goal?.unit === 'percent'">%</MpInputRightAddon>
                    </MpInputGroup>
                  </MpFormControl>
                </div>
              </div>
            </template>

            <!-- Notes / Effective date / Attachment -->
            <template v-if="updateMode !== 'children'">
              <MpFormControl id="up-notes">
                <MpFormLabel>Notes</MpFormLabel>
                <MpTextarea v-model="upNotes" :rows="3" placeholder="Optional" />
              </MpFormControl>
              <MpFormControl id="up-effective-date" :class="upFieldW">
                <MpFormLabel>Effective date (optional)</MpFormLabel>
                <MpDatePicker v-model="upEffectiveDate" placeholder="DD MMM YYYY" format="DD MMM YYYY" :disabled-date="disabledFutureDate" />
              </MpFormControl>
              <MpFormControl id="up-attachment" :class="upFieldW">
                <MpFormLabel>Add attachment</MpFormLabel>
                <MpUpload :is-multiple="true" is-full-width accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" @change="onUploadFiles" />
                <MpText size="label-small" :class="[captionText, css({ marginTop: '1' })]">Max. 5 files, 10 MB each. JPG, PNG, PDF, DOC, XLS.</MpText>
                <div v-for="(f, i) in upFiles" :key="i" :class="upFileRow">
                  <MpFlex align="center" gap="2" :class="css({ minWidth: '0' })">
                    <MpIcon name="document" size="sm" :class="css({ color: 'icon.default', flexShrink: '0' })" />
                    <MpText size="label" :class="[valueText, css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })]">{{ f.name }}</MpText>
                    <MpText size="label-small" :class="captionText">{{ f.sizeLabel }}</MpText>
                  </MpFlex>
                  <MpButton variant="ghost" size="sm" left-icon="delete" :class="css({ flexShrink: '0' })" @click="removeUpFile(i)">Remove</MpButton>
                </div>
              </MpFormControl>
            </template>
          </MpFlex>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="emit('close')">{{ updateMode === 'children' ? 'Close' : 'Cancel' }}</MpButton>
            <MpButton v-if="updateMode !== 'children'" variant="primary" @click="isConfirmUpdateOpen = true">Submit</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
    </MpDrawer>

    <!-- Confirmation -->
    <MpModal :is-open="isConfirmUpdateOpen" size="sm" @close="isConfirmUpdateOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Update this goal's progress?
          <MpModalCloseButton @click="isConfirmUpdateOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText v-if="goal && needsApproval(goal.ownerId)" size="label" :class="valueText">This progress update will be sent to {{ approverName }} for approval before it takes effect.</MpText>
          <MpText v-else size="label" :class="valueText">This saves your changes and recalculates the goal's achievement from the values you entered. You can update it again anytime.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isConfirmUpdateOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmSubmitUpdate">Update progress</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
