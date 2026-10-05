<script setup lang="ts">
/*
  Dev-only scenario control for the role form prototype
  (docs/patterns/dev-scenario-control.md). One axis → flat list:
  Version 1 (Default) = Access + Permission list, Version 2 = one checkbox
  column per action (View / Create / Edit / Delete / Report).
  Never a product affordance.
*/
import { MpIcon, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css } from '@mekari/pixel3'

const { rolesFormVersion } = useManageUserStore()

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
          <MpPopoverListItem :is-active="rolesFormVersion === 'v1'" @click="rolesFormVersion = 'v1'">Version 1 (Default)</MpPopoverListItem>
          <MpPopoverListItem :is-active="rolesFormVersion === 'v2'" @click="rolesFormVersion = 'v2'">Version 2 — Action columns</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
