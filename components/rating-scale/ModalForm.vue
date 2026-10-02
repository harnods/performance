<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migrated from talenta-review (commit 010875214aba):
    src/views/talent-management/competencies/setup/rating-scale/ModalForm.vue
  Component name preserved: ModalRatingDescription.
  Prototype only — no Vuex/API. vuelidate `requiredIf(isRequired)` → local check.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpButton, MpButtonGroup, MpFormControl, MpFormErrorMessage, MpTextarea, css,
} from '@mekari/pixel3'

defineOptions({ name: 'ModalRatingDescription' })

const props = withDefaults(defineProps<{
  isOpen: boolean
  isRequired?: boolean
  description?: string
  isLoading?: boolean
  defaultDesc?: string
}>(), { isRequired: false, description: '', isLoading: false, defaultDesc: '' })
const emit = defineEmits<{ 'update:isOpen': [value: boolean], updated: [value: string] }>()

const value = ref('')
const touched = ref(false)
const isInvalid = computed(() => touched.value && props.isRequired && !value.value.trim())

watch(() => props.isOpen, (open) => {
  if (open) { value.value = props.description; touched.value = false }
})

function close() { emit('update:isOpen', false) }
function submit() {
  touched.value = true
  if (props.isRequired && !value.value.trim()) return
  // Create flow: a blank description falls back to the predefined default.
  emit('updated', value.value || props.defaultDesc)
  close()
}

const contentWidth = css({ width: '560px', maxWidth: '90vw' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" class="rating-description-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent :class="contentWidth">
        <MpModalHeader>
          Edit rating description
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpFormControl id="rating-description" :is-required="isRequired" :is-invalid="isInvalid">
            <MpTextarea
              v-model="value"
              :placeholder="isRequired ? '' : 'Default description'"
              is-full-width
              @blur="touched = true"
            />
            <MpFormErrorMessage>This field is required</MpFormErrorMessage>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" :is-loading="isLoading" data-qa="modal-rating-scale-submit" @click="submit">Save changes</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.rating-description-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
