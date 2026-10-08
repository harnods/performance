<script setup lang="ts">
/*
  ─── DEMO ONLY — do not port to talenta-review / production ───
  DevCoachmark: a pulsing orange dot marking an element that differs from
  production. Clicking it opens a coachmark (MpPopover) with a title, what's
  new, and a Hide button. Rendered by DemoLayer from the registry in
  coachmarks.ts; toggled and reset from IdpDevTools.
*/
import type { Ref } from 'vue'
import { MpButton, MpPopover, MpPopoverTrigger, MpPopoverContent, css } from '@mekari/pixel3'
import { useDevCoachmarks } from './useDevCoachmarks'

const props = withDefaults(defineProps<{
  id: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'bottom-start' | 'right-start'
}>(), { placement: 'right-start' })

const { isVisible, hide } = useDevCoachmarks()

// The popover is portaled to <body>, so it isn't clipped by the page's scroll area: once its pulse
// scrolls out of view it would stay put, floating over the header with nothing to point at. Close it
// the moment the pulse leaves the visible area (IntersectionObserver accounts for every clipping
// scroll container). Pixel only honours `isOpen` in manual mode (which turns off click-to-open), so
// stay uncontrolled and flip the popover's own `isOpen` ref, which its `open` event hands us.
// The observed wrapper is ours, not a ref inside MpPopoverTrigger (Pixel re-creates that slot
// child, so a ref on it stays null).
const popoverOpen = ref<Ref<boolean> | null>(null)
function onPopoverOpen(e?: { isOpen?: Ref<boolean> }) { if (e?.isOpen) popoverOpen.value = e.isOpen }
const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver((entries) => {
    if (!entries[entries.length - 1].isIntersecting && popoverOpen.value) popoverOpen.value.value = false
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

// ─── Styles ───────────────────────────────────────────────────────────────
const wrapper = css({ display: 'inline-block', width: '16px', height: '16px', lineHeight: '0', verticalAlign: 'top' })
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
  <span v-if="isVisible(props.id)" ref="root" :class="wrapper">
  <MpPopover use-portal :placement="placement" @open="onPopoverOpen">
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
  </span>
</template>
