<script setup lang="ts">
/*
  ─── DEMO ONLY — do not port to talenta-review / production ───
  Add / Edit role dev tools: the page's ONE dev-only control
  (docs/patterns/dev-scenario-control.md). Bottom-LEFT, same shell as IdpDevTools.
  - Scenario: Version 1 (Module + Permission list) vs Version 2 (action columns),
    via useManageUserStore().rolesFormVersion.
  - Coachmarks: show / hide / reset the "what's new vs production" pulses.
*/
import { MpFlex, MpIcon, MpToggle, MpRadio, MpTextlink, MpPopover, MpPopoverTrigger, MpPopoverContent, css } from '@mekari/pixel3'
import { useDevCoachmarks } from './useDevCoachmarks'

const { isEnabled, hiddenCount, reset } = useDevCoachmarks()
const { rolesFormVersion } = useManageUserStore()

// ─── Styles: same FAB + panel as IdpDevTools ────────────────────────────────
const devFab = css({ position: 'fixed', left: '24px', bottom: '24px', zIndex: '100' })
const devFabButton = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '48px', height: '48px', borderRadius: 'full',
  background: 'background.inverse',
  border: 'none', cursor: 'pointer', boxShadow: 'lg',
  _hover: { opacity: '0.9' },
  _focusVisible: { boxShadow: '0 0 0 3px var(--mp-colors-border-brand)' },
})
const panel = css({ display: 'flex', flexDirection: 'column', gap: '4', padding: '4', width: '280px' })
const panelTitle = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const group = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const groupLabel = css({ fontSize: '12px', fontWeight: '600', lineHeight: '16px', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' })
const rowLabel = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const hint = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
</script>

<template>
  <div :class="devFab">
    <MpPopover use-portal placement="top-start">
      <MpPopoverTrigger>
        <button type="button" :class="devFabButton" aria-label="Dev tools">
          <MpIcon name="sliders" size="sm" color="icon.inverse" />
        </button>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <div :class="panel">
          <span :class="panelTitle">Dev tools</span>
          <div :class="group">
            <span :class="groupLabel">Scenario</span>
            <MpRadio name="dev-roles-form-version" value="v1" :is-checked="rolesFormVersion === 'v1'" @update:is-checked="rolesFormVersion = 'v1'">Version 1 (Default)</MpRadio>
            <MpRadio name="dev-roles-form-version" value="v2" :is-checked="rolesFormVersion === 'v2'" @update:is-checked="rolesFormVersion = 'v2'">Version 2 — Action columns</MpRadio>
          </div>
          <div :class="group">
            <span :class="groupLabel">Coachmarks</span>
            <MpFlex as="span" align="center" justify="space-between" gap="2">
              <span :class="rowLabel">Show coachmarks</span>
              <MpToggle id="dev-show-coachmarks-roles" :is-checked="isEnabled" @update:is-checked="isEnabled = $event" />
            </MpFlex>
            <span :class="hint">Pulses mark what's new vs production. Click one to read it.</span>
            <MpFlex align="center" justify="space-between" gap="2">
              <span :class="hint">{{ hiddenCount }} hidden</span>
              <MpTextlink as="button" @click="reset">Reset coachmarks</MpTextlink>
            </MpFlex>
          </div>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
