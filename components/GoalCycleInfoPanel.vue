<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle info panel
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4808:28568)

  Shared "Goal cycle info" tab content — every goal-cycle-details page
  (All goals, Company goals, Organization goals, Team goals, Individual
  goals) has the same tab bar and must show identical info here, so it
  lives in one component instead of being copy-pasted per page.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpFlex, MpText, MpButton, css } from '@mekari/pixel3'

interface CycleInfoRow { label: string, value: string, caption?: string }
const cycleInfoRows: CycleInfoRow[] = [
  { label: 'Goal cycle name', value: '26 H1' },
  { label: 'Goal period', value: 'H1 2026 (1 Jan 2026 - 31 Jun 2026)', caption: 'Goals repeat automatically' },
  { label: 'Progress update method', value: 'Manual entry', caption: 'Update total progress manually by entering achievement values.' },
  { label: 'Goal progress display', value: 'Display progress as actual value', caption: 'Show the raw measurement value instead of the completion percentage.' },
  { label: 'Last updated', value: '20 Dec 2025, 14:50', caption: 'Rizal Candra' },
]

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
