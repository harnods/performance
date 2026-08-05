<script setup lang="ts">
// Pick which parts of a source cycle to duplicate (production: ModalDuplicateComponents).
// "Include reviewers" only applies when Members is selected.
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpCheckbox, MpButton, MpFlex, css,
} from '@mekari/pixel3'

interface DupComponents { member: boolean, reviewMethod: boolean, reviewer: boolean }

const props = defineProps<{ isOpen: boolean, modelValue: DupComponents }>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'update:modelValue': [DupComponents] }>()

const temp = reactive<DupComponents>({ member: false, reviewMethod: false, reviewer: false })

watch(() => props.isOpen, (open) => {
  if (open) {
    temp.member = props.modelValue.member
    temp.reviewMethod = props.modelValue.reviewMethod
    // Reviewer only meaningful when members are duplicated.
    temp.reviewer = props.modelValue.member ? props.modelValue.reviewer : false
  }
})
watch(() => temp.member, (v) => { if (!v) temp.reviewer = false })

function close() { emit('update:isOpen', false) }
function save() {
  emit('update:modelValue', { member: temp.member, reviewMethod: temp.reviewMethod, reviewer: temp.reviewer })
  close()
}
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Select component
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpFlex direction="column" gap="4" :class="css({ paddingBottom: '2' })">
            <MpCheckbox :is-checked="temp.member" @update:is-checked="(v) => (temp.member = v)">Members</MpCheckbox>
            <MpCheckbox :is-checked="temp.reviewMethod" @update:is-checked="(v) => (temp.reviewMethod = v)">Review method</MpCheckbox>
            <MpCheckbox v-if="temp.member" :is-checked="temp.reviewer" @update:is-checked="(v) => (temp.reviewer = v)">Include reviewers</MpCheckbox>
          </MpFlex>
        </MpModalBody>
        <MpModalFooter>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="save">Save</MpButton>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
