<script setup lang="ts">
import { MpIcon } from '@mekari/pixel3'

const props = withDefaults(
  defineProps<{
    name: string
    size?: 16 | 18 | 20 | 24 | 28 | 32
    variant?: 'outline' | 'fill' | 'duotone'
    color?: string
  }>(),
  { size: 24, variant: 'outline', color: '' },
)
</script>

<template>
  <span class="mp-icon-box" :data-size="props.size">
    <MpIcon :name="name" :variant="variant" :color="color" size="md" />
  </span>
</template>
