<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Reviews / Pending actions — Co-worker list modal
  Replica of talenta-review's pending-action ModalCoworkerList. Opened from a
  History row's "Co-worker list" action; lists the co-workers picked for that
  cycle's peer/team review. DEMO data from the employees mock.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpAvatar,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES, employeeMeta } from '~/utils/employees'

const props = defineProps<{ isOpen: boolean, coworkerIds?: string[] }>()
const emit = defineEmits<{ 'update:isOpen': [v: boolean] }>()

const coworkers = computed(() => {
  const ids = props.coworkerIds?.length ? props.coworkerIds : EMPLOYEES.slice(0, 5).map(e => e.id)
  return ids.map(id => EMPLOYEES.find(e => e.id === id)).filter(Boolean) as typeof EMPLOYEES
})
function close() { emit('update:isOpen', false) }

const row = css({ display: 'flex', alignItems: 'center', gap: '3', paddingBlock: '3', borderBottom: '1px solid', borderBottomColor: 'gray.50' })
const nameText = css({ fontSize: '14px', color: 'text.default' })
const metaText = css({ fontSize: '12px', color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Co-worker list ({{ coworkers.length }})
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <div v-for="e in coworkers" :key="e.id" :class="row">
            <PxAvatar :id="`cw-${e.id}`" :name="e.name" :src="e.photo" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <span :class="nameText">{{ e.name }}</span>
              <span :class="metaText">{{ employeeMeta(e) }}</span>
            </MpFlex>
          </div>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
