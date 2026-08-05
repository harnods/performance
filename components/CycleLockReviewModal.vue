<script setup lang="ts">
// Lock / Unlock review result confirmation (production parity: ModalLockReview.vue).
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpText, MpButton, css,
} from '@mekari/pixel3'

const props = defineProps<{ isOpen: boolean, toLock: boolean }>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'submit': [] }>()

const verb = computed(() => (props.toLock ? 'lock' : 'unlock'))
function close() { emit('update:isOpen', false) }
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>{{ toLock ? 'Lock' : 'Unlock' }} cycle?<MpModalCloseButton @click="close" /></MpModalHeader>
        <MpModalBody>
          <MpText :class="css({ color: 'text.default', paddingBottom: '2' })">
            Are you sure you want to {{ verb }} this review cycle?
            {{ toLock ? 'Reviewers will not be able to edit or reset the review result unless it is requested.' : 'Reviewers will be able to edit the review result again.' }}
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="emit('submit')">{{ toLock ? 'Lock' : 'Unlock' }}</MpButton>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
