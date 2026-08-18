<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Too many employees selected modal
  Shared by every "New goals" entry point (individual/team/organization/
  company-goals) — shown right after "Continue" is clicked in
  SelectEmployeesDrawer, before navigating anywhere, when the selection is
  past useBulkOwnerGate's BULK_OWNER_LIMIT.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpButton,
  MpButtonGroup,
  MpText,
  css,
} from '@mekari/pixel3'
import { BULK_OWNER_LIMIT } from '~/composables/useBulkOwnerGate'

defineProps<{ isOpen: boolean }>()
// Manual creation is a hard block past the limit — the only ways out are
// "Cancel" (back to the drawer, selection kept, to trim it down) or Import.
const emit = defineEmits<{
  cancel: []
  import: []
}>()

const bodyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" class="too-many-employees-modal" @close="emit('cancel')">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Bulk add limit reached
          <MpModalCloseButton @click="emit('cancel')" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">
            You can bulk add goals for up to {{ BULK_OWNER_LIMIT }} employees at once. For more, use import goals instead.
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="emit('cancel')">Cancel</MpButton>
            <MpButton variant="primary" @click="emit('import')">Import goals</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* MpModal's own root (where the `class` we pass lands) never gets this
   file's scope id — its manual mergeProps()/Teleport render skips Vue's
   usual scope-id injection — so a plain scoped selector never matches at
   runtime. Wrap the whole selector in :global() instead. !important beats
   the component's own inline `margin-top: 3.75rem` (60px, its
   default/outside scroll-behavior offset — position is `relative`, so `top`
   has no effect). Every MpModal in this app aligns top-center at 80px. */
:global(.too-many-employees-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
