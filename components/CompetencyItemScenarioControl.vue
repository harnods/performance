<script setup lang="ts">
/*
  Dev-only scenario control for the competency item prototype
  (docs/patterns/dev-scenario-control.md). One axis → flat list:
  Filled (Default) = mock seed, Empty = no items yet (blank slate).
  Never a product affordance.
*/
import { MpIcon, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css } from '@mekari/pixel3'

const { scenario, resetScenario } = useCompetencyItemStore()

const scenarioFab = css({ position: 'fixed', right: '24px', bottom: '24px', zIndex: '100' })
const scenarioFabButton = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '48px', height: '48px', borderRadius: 'full',
  background: 'background.inverse',
  border: 'none', cursor: 'pointer', boxShadow: 'lg',
  _hover: { opacity: '0.9' },
  _focusVisible: { boxShadow: '0 0 0 3px var(--mp-colors-border-brand)' },
})
</script>

<template>
  <div :class="scenarioFab">
    <MpPopover is-close-on-select use-portal placement="top-end">
      <MpPopoverTrigger>
        <button type="button" :class="scenarioFabButton" aria-label="Scenario control">
          <MpIcon name="sliders" size="sm" color="icon.inverse" />
        </button>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <MpPopoverList>
          <MpPopoverListItem :is-active="scenario === 'default'" @click="resetScenario">Filled (Default)</MpPopoverListItem>
          <MpPopoverListItem :is-active="scenario === 'empty'" @click="scenario = 'empty'">Empty state</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
