<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Remove from pool confirmation modal
  Mirrors production (talenta-performance ModalRemoveFromPool.vue) + the repo
  confirmation pattern. Shared by the Succession plans index (Successor talents
  tab) and the plan detail page. Destructive confirm.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpAvatar, MpButton, MpButtonGroup,
  toast, css,
} from '@mekari/pixel3'

interface RemoveEmployee { id: string, name: string, code: string, title: string, department: string, photo?: string }
const props = defineProps<{
  isOpen: boolean
  employee: RemoveEmployee | null
  keyPosition: string
}>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'confirm': [] }>()

function close() { emit('update:isOpen', false) }
function confirm() {
  emit('confirm')
  toast.notify({ id: 'succ-removed', position: 'top-center', variant: 'success', title: 'Removed from pool' })
  close()
}

const bodyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const card = css({ display: 'flex', alignItems: 'center', gap: '3', marginTop: '4' })
// Consistent across all succession modals: 24px · divider · 24px after the card.
const divider = css({ borderBottom: '1px solid', borderBottomColor: 'border.default', marginTop: '6', marginBottom: '6' })
const name = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const job = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>Remove from pool?<MpModalCloseButton @click="close" /></MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">You are about to remove the following employee from this succession pool:</MpText>
          <div v-if="employee" :class="card">
            <PxAvatar :id="`remove-${employee.id}`" :name="employee.name" :src="employee.photo" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <span :class="name">{{ employee.name }}</span>
              <span :class="job">{{ employee.code }} | {{ employee.title }} | {{ employee.department }}</span>
            </MpFlex>
          </div>
          <div :class="divider" />
          <MpText :class="bodyText">They will no longer be a successor talent for {{ keyPosition }}. You can add them back anytime.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="danger" @click="confirm">Remove</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
