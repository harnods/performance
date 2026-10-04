<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migrated from talenta-review (commit 010875214aba):
    src/views/talent-management/competencies/setup/competency-item/Upload.vue
  Component name preserved: CompetencyItemUpload. One component, two routes
  (production: competency_item_upload + competency_item_bulk_edit), switched on
  the route — rendered by pages/talents/competencies/items/{upload,bulk-edit}.vue.
  Template/process URLs kept as data for backporting; nothing is called.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
defineOptions({ name: 'CompetencyItemUpload' })

const route = useRoute()

const tips = [
  'You can click on the column header for instruction.',
  'You can define the description for rating scale or simply use the default.',
]

const detail = computed(() => {
  if (route.path.endsWith('/bulk-edit')) {
    return {
      title: 'Edit bulk item',
      detail: {
        template_name: 'Bulk_Edit_Competency_Item.xlsx',
        template_url: `competencies/template/edit?uuids=${route.query.uuids ?? ''}`,
        template_blob: true,
        process_url: 'kpi/competencies/template/update',
        redirect_url: '/talents/competencies/items',
      },
      button: 'Save changes',
    }
  }
  return {
    title: 'Upload .xlsx',
    detail: {
      template_name: 'Template_Upload_Competency_Item.xlsx',
      template_url: 'competencies/template/new',
      template_blob: true,
      process_url: 'kpi/competencies/template/store',
      redirect_url: '/talents/competencies/items',
    },
    button: undefined,
  }
})
</script>

<template>
  <UploadPage :detail="detail.detail" :tips="tips" :submit-text="detail.button" />
</template>
