<script setup lang="ts">
// DEMO ONLY: coachmarks + dev tools for prototype demos (components/demo/).
// Not part of the product; turn off with NUXT_PUBLIC_DEMO_MODE=false.
import DemoLayer from '~/components/demo/DemoLayer.vue'

const demoMode = useRuntimeConfig().public.demoMode
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <DemoLayer v-if="demoMode" />
  </ClientOnly>
</template>
