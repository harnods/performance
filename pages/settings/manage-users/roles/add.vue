<!--
  Production route settings_roles_add (/settings/manage-user/roles/add) →
  RolesForm (components/manage-user/RolesForm.vue).
-->
<script setup lang="ts">
definePageMeta({
  title: 'Add role',
  layout: 'default',
  breadcrumb: { label: 'Roles', to: '/settings/manage-users/roles' },
})
</script>

<template>
  <div>
    <ManageUserRolesForm />
  </div>
</template>
