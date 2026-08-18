<script setup lang="ts">
// Thin wrapper over MpAvatar that gives initials-only avatars (no photo) a
// deterministic pastel background with a darker same-hue initial, so every
// no-photo avatar is colourful yet always readable. Photo avatars are passed
// through to MpAvatar untouched. Drop-in for <MpAvatar> — forwards all props,
// attrs and the caller's own :class.
import { computed, useAttrs } from 'vue'
import { MpAvatar, css } from '@mekari/pixel3'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

// Pastel fill (.100) + darker same-hue initial (.700), Pixel-token only.
// Hues limited to full-scale palettes that resolve at every shade. `!` marks
// the value !important so it beats MpAvatar's own bg/color recipe rules.
const PASTELS = [
  css({ background: 'teal.100!', color: 'teal.700!' }),
  css({ background: 'violet.100!', color: 'violet.700!' }),
  css({ background: 'lime.100!', color: 'lime.700!' }),
  css({ background: 'indigo.100!', color: 'indigo.700!' }),
  css({ background: 'orange.100!', color: 'orange.700!' }),
  css({ background: 'blue.100!', color: 'blue.700!' }),
]

// Small stable string hash so the same person always maps to the same hue.
function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

const pastelClass = computed(() => {
  if (attrs.src) return undefined // has a photo → leave Pixel default
  const seed = String(attrs.id ?? attrs.name ?? '')
  return PASTELS[hashSeed(seed) % PASTELS.length]
})
</script>

<template>
  <MpAvatar v-bind="attrs" :class="[attrs.class, pastelClass]" />
</template>
