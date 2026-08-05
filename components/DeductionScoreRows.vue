<script setup lang="ts">
// Repeatable (value / deduct_score) condition rows — production DeductionScoreForm.
// Shared by attendance items, the reprimand item, and each time-off policy block.
// Edits the passed `rows` array by reference (Vue keeps it reactive).
import {
  MpFlex, MpText, MpButton, MpInput, MpInputGroup, MpInputRightAddon, MpFormControl, css,
} from '@mekari/pixel3'
import { REPRIMAND_TYPES } from '~/utils/reviewMethod'
import type { ScoreRow } from '~/utils/deduction'

const props = defineProps<{
  rows: ScoreRow[]
  type: string // attendance type | 'reprimand' | 'timeoff'
  isPercent?: boolean
}>()

const isReprimand = computed(() => props.type === 'reprimand')
const lastRow = computed(() => props.rows.length - 1)
const unit = computed(() => (props.isPercent ? '%' : 'Day(s)'))

// Reprimand types already picked in other rows → disabled to prevent duplicates.
const usedReprimand = computed(() => new Set(props.rows.map(r => r.value).filter(v => v !== '')))
function reprimandOptions(idx: number) {
  return REPRIMAND_TYPES.filter(t => !usedReprimand.value.has(t.id) || props.rows[idx].value === t.id)
    .map(t => ({ value: t.id, label: t.type_name }))
}

const isDisabledAdd = computed(() => {
  if (isReprimand.value) return usedReprimand.value.size >= REPRIMAND_TYPES.length
  if (props.isPercent) return Number(props.rows[lastRow.value]?.value) >= 100
  return false
})

function add() {
  props.rows.push({ value: '', deduct_score: '' })
}
function remove(idx: number) {
  props.rows.splice(idx, 1)
}
function canRemove(idx: number) {
  if (props.rows.length === 1) return false
  if (!isReprimand.value && idx < lastRow.value) return false // only last row removable (ascending)
  return true
}

const rowGrid = css({ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: '3', alignItems: 'center', paddingBlock: '1' })
const headText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
</script>

<template>
  <div>
    <div :class="rowGrid">
      <MpText :class="headText">{{ isReprimand ? 'Reprimand type' : 'Total value' }}</MpText>
      <MpText :class="headText">Deduct score</MpText>
      <span />
    </div>
    <div v-for="(row, idx) in rows" :key="idx" :class="rowGrid">
      <!-- Value -->
      <MpFormControl v-if="isReprimand" :id="`reprimand-type-${idx}`">
        <PxSelectPopover
          :model-value="row.value"
          :options="reprimandOptions(idx)"
          placeholder="Select type"
          @update:model-value="(v) => (row.value = v)"
        />
      </MpFormControl>
      <MpInputGroup v-else>
        <MpInput v-model="row.value" type="number" :is-disabled="idx < lastRow" />
        <MpInputRightAddon>{{ unit }}</MpInputRightAddon>
      </MpInputGroup>

      <!-- Deduct score -->
      <MpInputGroup>
        <MpInput v-model="row.deduct_score" type="number" />
        <MpInputRightAddon>Point(s)</MpInputRightAddon>
      </MpInputGroup>

      <!-- Remove -->
      <MpButton variant="ghost" left-icon="minus-circular" :is-disabled="!canRemove(idx)" @click="remove(idx)" />
    </div>

    <MpButton variant="ghost" left-icon="add-circular" :is-disabled="isDisabledAdd" @click="add">Add condition</MpButton>
  </div>
</template>
