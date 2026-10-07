<!--
  Production route settings_roles_edit (/settings/manage-user/roles/edit/:id) →
  RolesForm (components/manage-user/RolesForm.vue).
-->
<script setup lang="ts">
definePageMeta({
  title: 'Edit role',
  layout: 'default',
  breadcrumb: { label: 'Roles', to: '/settings/manage-users/roles' },
})
</script>

<template>
  <div>
    <ManageUserRolesForm :key="$route.params.id as string" />
  </div>
</template>
