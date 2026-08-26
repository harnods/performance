<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEV SCENARIO CONTROL — Goals dashboard. NOT a product control.

  Same floating affordance as pages/goals/goal-cycles/[id]/index.vue's scenario
  FAB (fixed bottom-right, 24px margin, 48px circular, `sliders` icon, popover
  anchored top-end). This one carries a small panel instead of a flat list,
  because the dashboard has three independent groups of state to preview:

    Goals progress      → Needs update (show/hide)
    Goals distribution  → Full / < Half / < Quarter (drives the donut colour band)
    Awaiting approval   → Goal creation + Goal progress update + Goal edit
                          (all three off = section hidden)

  Exists so a demo can reach every layout variant without editing seed data —
  notably the progress-update card, which no seeded submission produces.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpToggle,
  MpTextlink,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  css,
} from '@mekari/pixel3'
import type { DistributionScenario } from '~/composables/useGoalsDashboardScenario'

const { needsUpdate, distribution, goalCreation, progressUpdate, goalEdit, reset } = useGoalsDashboardScenario()

const distributionOptions: { key: DistributionScenario, label: string, hint: string }[] = [
  { key: 'default', label: 'Default', hint: 'Real data' },
  { key: 'full', label: 'Full', hint: '100%' },
  { key: 'half', label: '< Half', hint: '40%' },
  { key: 'quarter', label: '< Quarter', hint: '20%' },
]

// ─── Styles — FAB copied from the goal-cycle detail scenario control ─────────
const scenarioFab = css({ position: 'fixed', right: '24px', bottom: '24px', zIndex: '100' })
const scenarioFabButton = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '48px', height: '48px', borderRadius: 'full',
  background: 'background.inverse',
  border: 'none', cursor: 'pointer', boxShadow: 'lg',
  _hover: { opacity: '0.9' },
  _focusVisible: { boxShadow: '0 0 0 3px var(--mp-colors-border-brand)' },
})

const panel = css({ display: 'flex', flexDirection: 'column', gap: '4', padding: '4', width: '280px' })
const panelHead = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2' })
const panelTitle = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const group = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const groupLabel = css({ fontSize: '12px', fontWeight: '600', lineHeight: '16px', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' })
const rowLabel = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const choiceRow = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2',
  paddingBlock: '1', paddingInline: '2', borderRadius: '4px',
  border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left',
  _hover: { background: 'background.neutral.subtle' },
})
const choiceRowActive = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2',
  paddingBlock: '1', paddingInline: '2', borderRadius: '4px',
  border: 'none', background: 'background.neutral.subtle', cursor: 'pointer', width: '100%', textAlign: 'left',
})
const choiceHint = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', whiteSpace: 'nowrap' })
</script>

<template>
  <div :class="scenarioFab">
    <MpPopover use-portal placement="top-end">
      <MpPopoverTrigger>
        <button type="button" :class="scenarioFabButton" aria-label="Scenario control">
          <MpIcon name="sliders" size="sm" color="icon.inverse" />
        </button>
      </MpPopoverTrigger>

      <MpPopoverContent>
        <div :class="panel">
          <div :class="panelHead">
            <span :class="panelTitle">Scenario</span>
            <MpTextlink as="button" size="small" @click="reset">Reset</MpTextlink>
          </div>

          <!-- Goals progress -->
          <div :class="group">
            <span :class="groupLabel">Goals progress</span>
            <MpFlex as="span" align="center" justify="space-between" gap="2">
              <span :class="rowLabel">Needs progress update</span>
              <MpToggle
                id="scenario-needs-update"
                :is-checked="needsUpdate"
                @update:is-checked="needsUpdate = $event"
              />
            </MpFlex>
          </div>

          <!-- Goals distribution -->
          <div :class="group">
            <span :class="groupLabel">Goals distribution</span>
            <button
              v-for="opt in distributionOptions"
              :key="opt.key"
              type="button"
              :class="distribution === opt.key ? choiceRowActive : choiceRow"
              @click="distribution = opt.key"
            >
              <span :class="rowLabel">{{ opt.label }}</span>
              <span :class="choiceHint">{{ opt.hint }}</span>
            </button>
          </div>

          <!-- Awaiting approval -->
          <div :class="group">
            <span :class="groupLabel">Awaiting approval</span>
            <MpFlex as="span" align="center" justify="space-between" gap="2">
              <span :class="rowLabel">Goal creation</span>
              <MpToggle
                id="scenario-goal-creation"
                :is-checked="goalCreation"
                @update:is-checked="goalCreation = $event"
              />
            </MpFlex>
            <MpFlex as="span" align="center" justify="space-between" gap="2">
              <span :class="rowLabel">Goal progress update</span>
              <MpToggle
                id="scenario-progress-update"
                :is-checked="progressUpdate"
                @update:is-checked="progressUpdate = $event"
              />
            </MpFlex>
            <MpFlex as="span" align="center" justify="space-between" gap="2">
              <span :class="rowLabel">Goal edit</span>
              <MpToggle
                id="scenario-goal-edit"
                :is-checked="goalEdit"
                @update:is-checked="goalEdit = $event"
              />
            </MpFlex>
            <MpText v-if="!goalCreation && !progressUpdate && !goalEdit" size="label-small" :class="choiceHint">
              All off — section hidden
            </MpText>
          </div>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
