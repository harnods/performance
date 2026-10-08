<script setup lang="ts">
/*
  ─── DEMO ONLY — do not port to talenta-review / production ───
  DevCoachmark: a pulsing orange dot marking an element that differs from
  production. Clicking it opens a coachmark (MpPopover) with a title, what's
  new, and a Hide button. Rendered by DemoLayer from the registry in
  coachmarks.ts; toggled and reset from IdpDevTools.
*/
import { MpButton, MpPopover, MpPopoverTrigger, MpPopoverContent, css } from '@mekari/pixel3'
import { useDevCoachmarks } from './useDevCoachmarks'

const props = withDefaults(defineProps<{
  id: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'bottom-start' | 'right-start'
}>(), { placement: 'right-start' })

const { isVisible, hide } = useDevCoachmarks()

// ─── Styles ───────────────────────────────────────────────────────────────
const trigger = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '16px', height: '16px', verticalAlign: 'top',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', flexShrink: '0',
  borderRadius: 'full',
  _focusVisible: { boxShadow: '0 0 0 3px var(--mp-colors-border-brand)' },
})
const dot = css({
  position: 'relative', display: 'block', width: '8px', height: '8px', borderRadius: 'full',
  background: 'orange.500',
  '&::after': {
    content: '""', position: 'absolute', inset: '0', borderRadius: 'full',
    background: 'orange.500',
    animation: 'px-coachmark-pulse 1.6s ease-out infinite',
  },
})
const panel = css({ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', width: '280px', textAlign: 'left' })
const titleText = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const bodyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary', whiteSpace: 'normal', fontWeight: '400' })
const footer = css({ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' })
</script>

<template>
  <MpPopover v-if="isVisible(props.id)" use-portal :placement="placement">
    <MpPopoverTrigger>
      <button type="button" :class="trigger" :aria-label="`What's new: ${title}`" @click.stop>
        <span :class="dot" />
      </button>
    </MpPopoverTrigger>
    <MpPopoverContent>
      <div :class="panel">
        <span :class="titleText">{{ title }}</span>
        <span :class="bodyText">{{ description }}</span>
        <div :class="footer">
          <MpButton variant="secondary" @click="hide(props.id)">Hide</MpButton>
        </div>
      </div>
    </MpPopoverContent>
  </MpPopover>
</template>
