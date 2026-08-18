<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Update readiness modal
  Replicated from production (talenta-performance:
    src/views/talent-management/succession-pool/components/ModalReadiness.vue).
  Shared by the Succession plans index (Successor talents tab) and the plan
  detail page. Employee card + Readiness select. Size md (project convention
  for these succession modals).
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpAvatar, MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage,
  toast, css,
} from '@mekari/pixel3'
import { READINESS_OPTIONS } from '~/utils/succession'

interface ReadinessEmployee { id: string, name: string, code: string, title: string, department: string, photo?: string }
const props = defineProps<{
  isOpen: boolean
  employee: ReadinessEmployee | null
  readiness: string
}>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'save': [string] }>()

const value = ref('')
const submitted = ref(false)
const invalid = computed(() => submitted.value && !value.value)

watch(() => props.isOpen, (open) => {
  if (open) { value.value = props.readiness ?? ''; submitted.value = false }
})

function close() { emit('update:isOpen', false) }
function save() {
  submitted.value = true
  if (!value.value) return
  emit('save', value.value)
  toast.notify({ id: 'succ-readiness', position: 'top-center', variant: 'success', title: 'Readiness updated' })
  close()
}

const card = css({ display: 'flex', alignItems: 'center', gap: '3', marginTop: '4' })
// Consistent across all succession modals: 24px · divider · 24px after the card.
const divider = css({ borderBottom: '1px solid', borderBottomColor: 'border.default', marginTop: '6', marginBottom: '6' })
const name = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const job = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const req = css({ color: 'text.danger' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>Update readiness<MpModalCloseButton @click="close" /></MpModalHeader>
        <MpModalBody>
          <div v-if="employee" :class="card">
            <PxAvatar :id="`readiness-${employee.id}`" :name="employee.name" :src="employee.photo" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <span :class="name">{{ employee.name }}</span>
              <span :class="job">{{ employee.code }} | {{ employee.title }} | {{ employee.department }}</span>
            </MpFlex>
          </div>
          <div :class="divider" />
          <MpFormControl id="readiness-range" :is-invalid="invalid">
            <MpFormLabel>Readiness <MpText as="span" :class="req">*</MpText></MpFormLabel>
            <PxSelectPopover v-model="value" :options="READINESS_OPTIONS" placeholder="Select range" :width="'100%'" />
            <MpFormErrorMessage>You must select readiness</MpFormErrorMessage>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="save">Save changes</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
