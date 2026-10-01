<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Create development plan
  Replicated from production (talenta-performance:
    individual-development/form/Index.vue, create route).
  Full-page create of a primary entity (docs/patterns/page-form.md).
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { toast } from '@mekari/pixel3'

definePageMeta({
  title: 'Create development plan',
  layout: 'default',
  breadcrumb: { label: 'IDP', to: '/talents/idps' },
})

const route = useRoute()
const router = useRouter()
const { createPlan } = useIdpStore()
const { currentUserId } = useCurrentUser()

// `?employee=<id>` — "Create IDP" from a talent's profile lands here with them
// already picked, mirroring production's employee_id route param.
const initialEmployeeId = computed(() => (route.query.employee ? String(route.query.employee) : undefined))

function onSubmit(payload: Parameters<typeof createPlan>[0]) {
  createPlan(payload, currentUserId.value)
  toast.notify({ id: 'idp-created', position: 'top-center', variant: 'success', title: 'Development plan created' })
  router.push('/talents/idps')
}
function onCancel() { router.push('/talents/idps') }
</script>

<template>
  <IdpPlanForm mode="create" :initial-employee-id="initialEmployeeId" @submit="onSubmit" @cancel="onCancel" />
</template>
