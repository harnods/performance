<!-- talenta-review route: competency_item_bulk_edit (…/competencies/setup/item/bulk-edit?uuids=…). -->
<script setup lang="ts">
definePageMeta({
  title: 'Edit bulk item',
  layout: 'default',
  breadcrumb: { label: 'Competency items', to: '/talents/competencies/items' },
})
</script>

<template>
  <CompetencyItemUpload />
</template>
