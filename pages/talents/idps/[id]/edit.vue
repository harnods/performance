<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Edit development plan
  Replicated from production (talenta-performance:
    individual-development/form/Index.vue, edit route — same component, seeded).
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpButton, MpText, MpFlex, toast, css } from '@mekari/pixel3'

definePageMeta({
  title: 'Edit development plan',
  layout: 'default',
  breadcrumb: { label: 'IDP', to: '/talents/idps' },
})

const route = useRoute()
const router = useRouter()
const { planById, updatePlan, deletePlan } = useIdpStore()
const { currentUserId } = useCurrentUser()

const planId = computed(() => String(route.params.id))
const plan = computed(() => planById(planId.value))

const isDeleteOpen = ref(false)

function onSubmit(payload: Parameters<typeof updatePlan>[1]) {
  updatePlan(planId.value, payload, currentUserId.value)
  toast.notify({ id: 'idp-updated', position: 'top-center', variant: 'success', title: 'Development plan updated' })
  router.push(`/talents/idps/${planId.value}`)
}
function onCancel() { router.push(`/talents/idps/${planId.value}`) }
function confirmDelete() {
  deletePlan(planId.value)
  isDeleteOpen.value = false
  toast.notify({ id: 'idp-deleted', position: 'top-center', variant: 'success', title: 'Development plan deleted' })
  router.push('/talents/idps')
}

const notFound = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2', paddingBlock: '16', textAlign: 'center' })
</script>

<template>
  <IdpPlanForm v-if="plan" mode="edit" :plan="plan" @submit="onSubmit" @cancel="onCancel" @delete="isDeleteOpen = true" />

  <MpFlex v-else :class="notFound">
    <MpText weight="semiBold">Development plan not found</MpText>
    <MpButton variant="secondary" @click="router.push('/talents/idps')">Back to IDPs</MpButton>
  </MpFlex>

  <IdpDeleteModal
    :is-open="isDeleteOpen"
    :plan-name="plan?.name ?? ''"
    @update:is-open="(v: boolean) => (isDeleteOpen = v)"
    @confirm="confirmDelete"
  />
</template>
