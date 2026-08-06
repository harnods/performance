<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle info panel
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4808:28568)

  Shared "Goal cycle info" tab content for every goal-cycle-details page.
  Reads the real cycle from the mini-DB (matched by route.params.id).

  "Edit" flips this panel into an inline edit form — the SAME fields as the
  New/Edit goal cycle drawer (name, period, progress update method, goal
  weight) — and commits via updateCycle. Goal period is a HALF-YEAR (H1/H2),
  never a custom date range. The form is 6 grid columns wide and its action
  buttons span that full width.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpText, MpButton, MpInput,
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpRadio, MpCheckbox,
  toast, css,
} from '@mekari/pixel3'
import type { ProgressUpdateMethod } from '~/composables/useGoalCyclesStore'
import type { PeriodValue } from '~/utils/periodPicker'
import { reconstructPeriod } from '~/utils/periodPicker'

const PROGRESS_UPDATE_METHOD_LABEL: Record<string, string> = {
  manual: 'Manual entry',
  'log-based': 'Log-based',
}
const PROGRESS_UPDATE_METHOD_CAPTION: Record<string, string> = {
  manual: 'Update total progress manually by entering achievement values.',
  'log-based': 'Achievement entries are automatically summed to update total progress.',
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatUpdatedAt(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

interface CycleInfoRow { label: string, value: string, caption?: string }

const route = useRoute()
const { cycles, updateCycle } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === route.params.id))

const cycleInfoRows = computed<CycleInfoRow[]>(() => {
  if (!cycle.value) return []
  return [
    { label: 'Goal cycle name', value: cycle.value.name },
    { label: 'Goal period', value: cycle.value.period },
    {
      label: 'Progress update method',
      value: PROGRESS_UPDATE_METHOD_LABEL[cycle.value.progressUpdateMethod],
      caption: PROGRESS_UPDATE_METHOD_CAPTION[cycle.value.progressUpdateMethod],
    },
    {
      label: 'Goal weight',
      value: cycle.value.weightMandatory ? 'Mandatory' : 'Optional',
      caption: cycle.value.weightMandatory
        ? 'Users must assign a weight when creating or editing goals.'
        : 'Users can leave goal weight empty when creating or editing goals.',
    },
    {
      label: 'Last updated',
      value: cycle.value.updatedAt ? formatUpdatedAt(cycle.value.updatedAt) : '—',
      caption: cycle.value.updatedBy,
    },
  ]
})

// ─── Inline edit form (same fields as the New/Edit goal cycle drawer) ─────────
const isEditing = ref(false)
const nameMax = 60
const cycleName = ref('')
const cyclePeriod = ref<PeriodValue | null>(null)
const progressMethod = ref<ProgressUpdateMethod>('manual')
const weightMandatory = ref(true)
const errors = reactive({ name: false, period: false })
watch(cycleName, () => { errors.name = false })
watch(cyclePeriod, () => { errors.period = false })

function openEdit() {
  if (!cycle.value) return
  cycleName.value = cycle.value.name
  // Preselect the ORIGINAL preset (e.g. "H1 2026"), not a custom range.
  cyclePeriod.value = reconstructPeriod(cycle.value.startDate, cycle.value.endDate)
  progressMethod.value = cycle.value.progressUpdateMethod
  weightMandatory.value = cycle.value.weightMandatory
  errors.name = false
  errors.period = false
  isEditing.value = true
}
function cancelEdit() {
  isEditing.value = false
}
function saveEdit() {
  errors.name = !cycleName.value.trim()
  errors.period = !cyclePeriod.value
  if (errors.name || errors.period || !cycle.value) return
  updateCycle(cycle.value.id, {
    name: cycleName.value.trim(),
    period: cyclePeriod.value!.label,
    startDate: cyclePeriod.value!.startDate,
    endDate: cyclePeriod.value!.endDate,
    progressUpdateMethod: progressMethod.value,
    weightMandatory: weightMandatory.value,
  })
  isEditing.value = false
  toast.notify({ id: 'goal-cycle-updated', position: 'top-center', variant: 'success', title: 'Goal cycle updated' })
}

const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const infoLabelCol = css({ width: '168px', flexShrink: '0' })
// Form is 6 grid columns wide (12-col grid, span 6 on desktop; full on mobile).
const formGrid = css({ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '6', width: '100%' })
const formCol = css({ gridColumn: { base: '1 / -1', lg: 'span 6 / span 6' }, maxWidth: { lg: '656px' }, display: 'flex', flexDirection: 'column', gap: '5' })
// Create/edit form footer — right-aligned, hug-width buttons (docs/patterns/buttons.md).
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2', paddingTop: '4' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
</script>

<template>
  <!-- Read view -->
  <MpFlex v-if="!isEditing" align="flex-start" gap="6">
    <MpFlex direction="column" gap="4">
      <MpFlex v-for="row in cycleInfoRows" :key="row.label" align="flex-start" gap="6">
        <MpText size="label" :class="[valueText, infoLabelCol]">{{ row.label }}</MpText>
        <MpFlex direction="column" gap="0">
          <MpText size="label" :class="valueText">{{ row.value }}</MpText>
          <MpText v-if="row.caption" size="label-small" :class="captionText">{{ row.caption }}</MpText>
        </MpFlex>
      </MpFlex>
    </MpFlex>
    <MpButton variant="secondary" left-icon="edit" @click="openEdit">Edit</MpButton>
  </MpFlex>

  <!-- Edit form (6 grid columns; H1/H2 period; full-width action buttons) -->
  <div v-else :class="formGrid">
    <div :class="formCol">
      <MpFormControl id="info-cycle-name" :is-invalid="errors.name">
        <MpFlex align="center" justify="space-between">
          <MpFlex align="center" gap="1">
            <MpFormLabel>Goal cycle name</MpFormLabel>
            <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
          </MpFlex>
          <span :class="charCount">{{ cycleName.length }} / {{ nameMax }}</span>
        </MpFlex>
        <MpInput v-model="cycleName" :maxlength="nameMax" />
        <MpFormErrorMessage>Goal cycle name is required.</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="info-cycle-period" :is-invalid="errors.period">
        <MpFlex align="center" gap="1">
          <MpFormLabel>Goal period</MpFormLabel>
          <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
        </MpFlex>
        <PxAdvancedDatePicker v-model="cyclePeriod" placeholder="Select goal period" width="264px" />
        <MpFormErrorMessage>Goal period is required.</MpFormErrorMessage>
      </MpFormControl>

      <div>
        <MpFlex align="center" gap="1" :class="css({ marginBottom: '2' })">
          <MpText :class="css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })">Progress update method</MpText>
          <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
        </MpFlex>
        <MpFlex direction="column" gap="2">
          <MpRadio name="info-progress-update-method" value="manual" :is-checked="progressMethod === 'manual'" @update:is-checked="progressMethod = 'manual'">
            Manual entry
            <template #description>Update total progress manually by entering achievement values.</template>
          </MpRadio>
          <MpRadio name="info-progress-update-method" value="log-based" :is-checked="progressMethod === 'log-based'" @update:is-checked="progressMethod = 'log-based'">
            Log-based
            <template #description>Achievement entries are automatically summed to update total progress.</template>
          </MpRadio>
        </MpFlex>
      </div>

      <div>
        <MpFlex align="center" gap="1" :class="css({ marginBottom: '2' })">
          <MpText :class="css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })">Goal weight</MpText>
          <MpText size="label" :class="css({ color: 'text.danger' })">*</MpText>
        </MpFlex>
        <MpCheckbox id="info-weight-mandatory" v-model:is-checked="weightMandatory">
          Make goal weight mandatory
          <template #description>Require users to assign a weight when creating or editing goals.</template>
        </MpCheckbox>
      </div>

      <div :class="footerBar">
        <MpButton variant="ghost" @click="cancelEdit">Cancel</MpButton>
        <MpButton variant="primary" @click="saveEdit">Save changes</MpButton>
      </div>
    </div>
  </div>
</template>
