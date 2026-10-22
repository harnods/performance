<!--
  DEMO ONLY — do not port.
  Dev-tools icon in the IDP import "Select employees" drawer header (next to the X).
  Switches the employee pool: Default (the 30-person seed) vs More than 500 employees
  (612 fabricated people), so Load more, Select all and the 500 cap can be walked through.
  State is useIdpImportFlag().importPool. See docs/patterns/dev-scenario-control.md.
-->
<script setup lang="ts">
import { MpIcon, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css } from '@mekari/pixel3'

const { importPool } = useIdpImportFlag()

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
          <MpPopoverListItem :is-active="importPool === 'default'" @click="importPool = 'default'">Employees: Default</MpPopoverListItem>
          <MpPopoverListItem :is-active="importPool === 'over-limit'" @click="importPool = 'over-limit'">Employees: More than 500</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
