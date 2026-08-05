<script setup lang="ts">
// Confirm before an action disables the "prefill review answer" option
// (production: ModalDisablePrefillReview).
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpText, MpButton, css,
} from '@mekari/pixel3'

defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'confirm': [], 'cancel': [] }>()

function onCancel() { emit('cancel'); emit('update:isOpen', false) }
function onConfirm() { emit('confirm'); emit('update:isOpen', false) }
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="onCancel">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Disable prefill review answer option?
          <MpModalCloseButton @click="onCancel" />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="css({ color: 'text.default', paddingBottom: '2' })">
            Your action will disable the prefill review answer option, so the review form in the layering process will not be prefilled automatically.
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
          <MpButton variant="primary" @click="onConfirm">Confirm</MpButton>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
