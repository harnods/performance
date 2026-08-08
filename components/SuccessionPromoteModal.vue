<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Promote successor talent modal
  Replicated from production (talenta-performance:
    src/views/talent-management/succession-pool/components/ModalPromote.vue).
  Shared by the Succession plans index (Successor talents tab) and the plan
  detail page. Promotion is a request: it notifies the HR admin — it does not
  itself move the employee or change the pool (prod parity).
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpAvatar, MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage,
  toast, css,
} from '@mekari/pixel3'

interface PromoteEmployee { id: string, name: string, code: string, title: string, department: string, photo?: string }
const props = defineProps<{
  isOpen: boolean
  employee: PromoteEmployee | null
  keyPositionValue: string
  keyPositionLabel: string
}>()
const emit = defineEmits<{ 'update:isOpen': [boolean] }>()

const keyPos = ref('')
const submitted = ref(false)
const keyPosInvalid = computed(() => submitted.value && !keyPos.value)
// The employee's nominated key position(s) — this pool's, in this context.
const options = computed(() => (props.keyPositionValue ? [{ value: props.keyPositionValue, label: props.keyPositionLabel }] : []))

watch(() => props.isOpen, (open) => {
  if (open) { keyPos.value = props.keyPositionValue; submitted.value = false }
})

function close() { emit('update:isOpen', false) }
function confirm() {
  submitted.value = true
  if (!keyPos.value) return
  toast.notify({ id: 'succ-promoted', position: 'top-center', variant: 'success', title: 'Promotion request sent to HR admin' })
  close()
}

const modalText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
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
        <MpModalHeader>Promote this employee?<MpModalCloseButton @click="close" /></MpModalHeader>
        <MpModalBody>
          <div v-if="employee" :class="card">
            <MpAvatar :id="`promote-${employee.id}`" :name="employee.name" :src="employee.photo" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <span :class="name">{{ employee.name }}</span>
              <span :class="job">{{ employee.code }} | {{ employee.title }} | {{ employee.department }}</span>
            </MpFlex>
          </div>
          <div :class="divider" />
          <MpFormControl id="promote-key-position" :is-invalid="keyPosInvalid">
            <MpFormLabel>Promote to key position <MpText as="span" :class="req">*</MpText></MpFormLabel>
            <!-- Single option → nothing to choose; keep the select but disable it (pre-selected) -->
            <PxSelectPopover v-model="keyPos" :options="options" placeholder="Select position" :width="'100%'" :is-disabled="options.length === 1" />
            <MpFormErrorMessage>You must select key position</MpFormErrorMessage>
          </MpFormControl>
          <MpText :class="[modalText, css({ marginTop: '4' })]">We will notify HR admin to proceed with the promotion. Do you want to continue?</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="confirm">Promote</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
