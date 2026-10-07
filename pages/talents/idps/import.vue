<script setup lang="ts">
definePageMeta({
  title: 'Import IDP',
  layout: 'default',
  breadcrumb: { label: 'IDP', to: '/talents/idps' },
})
</script>

<template>
  <StepImportPage
    template-name="Template_Import_IDP.xlsx"
    redirect-url="/talents/idps"
  />
</template>
