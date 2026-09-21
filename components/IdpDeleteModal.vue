<!--
  IdpDeleteModal — confirm deleting a development plan or one of its action plans.
  Replicated from production (talenta-performance:
    individual-development/form/ModalDeleteIdp.vue + the detail page's
    ModalConfirmation), which are the same shape with different copy.
-->
<script setup lang="ts">
import {
  MpModal, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter, MpModalOverlay,
  MpFlex, MpText, MpButton, css,
} from '@mekari/pixel3'

const props = withDefaults(defineProps<{
  isOpen: boolean
  /** Name of the thing being deleted, echoed back in the body copy. */
  planName: string
  /** 'plan' deletes the whole development plan; 'action' one action plan. */
  kind?: 'plan' | 'action'
}>(), { kind: 'plan' })

const emit = defineEmits<{ 'update:isOpen': [value: boolean], 'confirm': [] }>()

const title = computed(() => (props.kind === 'plan' ? 'Delete development plan?' : 'Delete action plan?'))

function close() { emit('update:isOpen', false) }
function confirm() { emit('confirm') }

const bodyText = css({ color: 'text.default' })
const footerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '3' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" class="idp-delete-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          {{ title }}
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">
            Do you want to delete
            <MpText as="span" weight="semiBold">{{ planName }}</MpText>? You cannot undo this action.
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpFlex align="center" gap="3">
              <MpButton variant="ghost" @click="close">Cancel</MpButton>
              <MpButton variant="danger" @click="confirm">Delete</MpButton>
            </MpFlex>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px, beating MpModal's inline 3.75rem. */
:global(.idp-delete-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
