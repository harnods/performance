<script setup lang="ts">
/*
  ─── DEMO ONLY — do not port to talenta-review / production ───
  The "Coachmarks" group of a dev-tools panel (docs/patterns/dev-scenario-control.md), for
  pages that own their scenario control and so can't use TemplateDevTools / IdpDevTools:
  - Show coachmarks: hides/shows every DevCoachmark pulse.
  - Reset coachmarks: brings back the ones hidden from their own Hide button.
  Imported explicitly (components/demo/** is not auto-imported).
*/
import { MpFlex, MpToggle, MpTextlink, css } from '@mekari/pixel3'
import { useDevCoachmarks } from './useDevCoachmarks'

const { isEnabled, hiddenCount, reset } = useDevCoachmarks()

const group = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const groupLabel = css({ fontSize: '12px', fontWeight: '600', lineHeight: '16px', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' })
const rowLabel = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const hint = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
</script>

<template>
  <div :class="group">
    <span :class="groupLabel">Coachmarks</span>
    <MpFlex as="span" align="center" justify="space-between" gap="2">
      <span :class="rowLabel">Show coachmarks</span>
      <MpToggle id="dev-page-show-coachmarks" :is-checked="isEnabled" @update:is-checked="isEnabled = $event" />
    </MpFlex>
    <span :class="hint">Pulses mark what's new vs production. Click one to read it.</span>
    <MpFlex align="center" justify="space-between" gap="2">
      <span :class="hint">{{ hiddenCount }} hidden</span>
      <MpTextlink as="button" @click="reset">Reset coachmarks</MpTextlink>
    </MpFlex>
  </div>
</template>
