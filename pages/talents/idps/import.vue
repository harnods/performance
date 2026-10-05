<script setup lang="ts">
definePageMeta({
  title: 'Import IDP',
  layout: 'default',
  breadcrumb: { label: 'IDP', to: '/talents/idps' },
})

const tips = [
  'Please follow the guidelines to avoid upload errors.',
  'Make sure the employee ID is correct and all mandatory fields in the template are filled.',
  'Each row is one action plan. Rows with the same employee ID are grouped into one IDP.',
]
</script>

<template>
  <StepImportPage
    intro="Please follow these steps to start importing IDPs to Talenta Performance."
    template-name="Template_Import_IDP.xlsx"
    redirect-url="/talents/idps"
    :tips="tips"
  />
</template>
