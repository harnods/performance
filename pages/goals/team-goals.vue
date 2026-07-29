<script setup lang="ts">
// The cycle-based Goals module (goal-cycles) replaced this standalone page.
// Redirect so an old link or typed URL lands on the working interface instead
// of a blank stub.
definePageMeta({ layout: false })
await navigateTo('/goals/goal-cycles', { redirectCode: 302 })
</script>

<template>
  <div />
</template>
