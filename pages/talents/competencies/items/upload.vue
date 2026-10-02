<!-- talenta-review route: competency_item_upload (…/competencies/setup/item/upload). -->
<script setup lang="ts">
definePageMeta({
  title: 'Upload .xlsx',
  layout: 'default',
  breadcrumb: { label: 'Competency items', to: '/talents/competencies/items' },
})
</script>

<template>
  <CompetencyItemUpload />
</template>
