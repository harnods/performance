<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/ModalPresetFeedback.vue
  Component name preserved: ModalPresetFeedback. Props/events preserved: isOpen
  (+ update:isOpen). Production closes only via the X (no Esc / overlay).
  Production embeds a third-party Zoho survey iframe with the user and company
  ids in its URL. Not loaded in this prototype — placeholder body instead.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpText, css } from '@mekari/pixel3'

defineOptions({ name: 'ModalPresetFeedback' })

defineProps<{ isOpen?: boolean }>()
const emit = defineEmits<{ 'update:isOpen': [value: boolean] }>()
function close() { emit('update:isOpen', false) }

const bodyClass = css({ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1', textAlign: 'center' })
const title = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="!!isOpen" size="xl" class="template-preset-feedback-modal" :is-close-on-esc="false" :is-close-on-overlay-click="false" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Template library feedback
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody :class="bodyClass">
          <MpText :class="title">Feedback survey</MpText>
          <MpText size="label" color="text.secondary">Production embeds the template library feedback survey (Zoho) here. It isn't loaded in this prototype.</MpText>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.template-preset-feedback-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
