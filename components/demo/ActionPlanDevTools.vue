<!--
  DEMO ONLY — do not port.
  Dev-tools icon in the Add/Edit action plan drawer header (next to the X).
  Forces the "Competency item" picker's source list: Filled (Default) vs Empty
  (blank slate). State is the competency item store's `scenario`.
  See docs/patterns/dev-scenario-control.md.
-->
<script setup lang="ts">
import { MpIcon, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css } from '@mekari/pixel3'

const { scenario, resetScenario } = useCompetencyItemStore()

const wrap = css({ position: 'absolute', top: '16px', right: '56px', zIndex: '1' })
const btn = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: 'full',
  background: 'background.inverse', border: 'none', cursor: 'pointer',
  _hover: { opacity: '0.9' },
  _focusVisible: { boxShadow: '0 0 0 3px var(--mp-colors-border-brand)' },
})
</script>

<template>
  <div :class="wrap">
    <MpPopover is-close-on-select use-portal placement="bottom-end">
      <MpPopoverTrigger>
        <button type="button" :class="btn" aria-label="Dev tools">
          <MpIcon name="sliders" size="sm" color="icon.inverse" />
        </button>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <MpPopoverList>
          <MpPopoverListItem :is-active="scenario === 'default'" @click="resetScenario">Competency items: Filled (Default)</MpPopoverListItem>
          <MpPopoverListItem :is-active="scenario === 'empty'" @click="scenario = 'empty'">Competency items: Empty state</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
