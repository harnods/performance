<script setup lang="ts">
import { MpTooltip, css } from '@mekari/pixel3'

// `reason` is the tooltip copy; empty means the control is not locked.
defineProps<{ reason: string }>()
// A disabled checkbox fires no mouse events, so the tooltip hangs off this wrapper.
const wrapper = css({ width: 'fit-content' })
</script>

<template>
  <MpTooltip :label="reason" :is-manual="!reason" :is-open="false" use-portal>
    <div :class="wrapper"><slot /></div>
  </MpTooltip>
</template>
