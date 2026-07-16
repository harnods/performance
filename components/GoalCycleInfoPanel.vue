<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle info panel
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4808:28568)

  Shared "Goal cycle info" tab content — every goal-cycle-details page
  (All goals, Company goals, Organization goals, Team goals, Individual
  goals) has the same tab bar and must show identical info here, so it
  lives in one component instead of being copy-pasted per page. Reads the
  real cycle straight from the mini-DB (matched by route.params.id) rather
  than hardcoding a single cycle's data.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpFlex, MpText, MpButton, css } from '@mekari/pixel3'

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
const { cycles } = useGoalCyclesStore()
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
      label: 'Last updated',
      value: cycle.value.updatedAt ? formatUpdatedAt(cycle.value.updatedAt) : '—',
      caption: cycle.value.updatedBy,
    },
  ]
})

const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const infoLabelCol = css({ width: '168px', flexShrink: '0' })
</script>

<template>
  <MpFlex align="flex-start" gap="6">
    <MpFlex direction="column" gap="4">
      <MpFlex v-for="row in cycleInfoRows" :key="row.label" align="flex-start" gap="6">
        <MpText size="label" :class="[valueText, infoLabelCol]">{{ row.label }}</MpText>
        <MpFlex direction="column" gap="0">
          <MpText size="label" :class="valueText">{{ row.value }}</MpText>
          <MpText v-if="row.caption" size="label-small" :class="captionText">{{ row.caption }}</MpText>
        </MpFlex>
      </MpFlex>
    </MpFlex>
    <MpButton variant="secondary" left-icon="edit">Edit</MpButton>
  </MpFlex>
</template>
