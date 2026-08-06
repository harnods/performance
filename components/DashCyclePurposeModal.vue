<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dashboard — Create cycle purpose modal
  Replica of talenta-review's ModalCyclePurpose.vue. "What is the purpose of
  your cycle?" → purpose radio cards (Performance / Competency [upgrade,
  disabled] / Evaluation review) + "Cycle name" (required, /60). Create routes
  to the review-cycle create page with {name, purpose}.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpBadge,
  MpButton,
  MpButtonGroup,
  MpInput,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  css,
} from '@mekari/pixel3'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ 'update:isOpen': [v: boolean] }>()
const router = useRouter()

const NAME_MAX = 60
const purposes = [
  { value: 'performance', label: 'Performance review', disabled: false, upgrade: false },
  { value: 'competency', label: 'Competency review', disabled: true, upgrade: true },
  { value: 'evaluation', label: 'Evaluation review', disabled: false, upgrade: false },
]
const purpose = ref('performance')
const name = ref('')
const error = ref('')

watch(() => props.isOpen, (open) => { if (open) { purpose.value = 'performance'; name.value = ''; error.value = '' } })
watch(name, () => { error.value = '' })

function close() { emit('update:isOpen', false) }
function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) { error.value = 'This field is required'; return }
  if (trimmed.length > NAME_MAX) { error.value = `Cycle name must have at most ${NAME_MAX} characters.`; return }
  close()
  router.push({ path: '/reviews/review-cycles/create', query: { name: trimmed, purpose: purpose.value } })
}

const prompt = css({ fontSize: '14px', fontWeight: '600', color: 'text.default', marginBottom: '2' })
const cards = css({ display: 'flex', flexDirection: 'column', gap: '2', marginBottom: '5' })
const card = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', padding: '3', border: '1px solid', borderColor: 'border.default', borderRadius: '8px', cursor: 'pointer' })
const cardActive = css({ borderColor: 'border.brand', boxShadow: 'inset 0 0 0 1px var(--mp-colors-border-brand)' })
const cardDisabled = css({ opacity: '0.6', cursor: 'not-allowed' })
const radio = css({ width: '16px', height: '16px', borderRadius: 'full', border: '2px solid', borderColor: 'border.default', flexShrink: '0' })
const radioOn = css({ borderColor: 'border.brand', background: 'radial-gradient(circle, var(--mp-colors-background-brand-bold, #4B61DD) 0 5px, transparent 6px)' })
const cardLabel = css({ fontSize: '14px', color: 'text.default' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Create your cycle
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <div :class="prompt">What is the purpose of your cycle?</div>
          <div :class="cards">
            <div
              v-for="p in purposes"
              :key="p.value"
              :class="[card, purpose === p.value && cardActive, p.disabled && cardDisabled]"
              @click="!p.disabled && (purpose = p.value)"
            >
              <MpFlex align="center" gap="2">
                <span :class="[radio, purpose === p.value && radioOn]" />
                <span :class="cardLabel">{{ p.label }}</span>
              </MpFlex>
              <MpBadge v-if="p.upgrade" for="tableStatus" type="announcement">Upgrade</MpBadge>
            </div>
          </div>

          <MpFormControl id="cycle-purpose-name" :is-invalid="!!error">
            <div :class="labelRow">
              <MpFormLabel>Cycle name</MpFormLabel>
              <span :class="charCount">{{ name.length }} / {{ NAME_MAX }}</span>
            </div>
            <MpInput v-model="name" :maxlength="NAME_MAX" placeholder="e.g. 26 H1 Performance Review" />
            <MpFormErrorMessage>{{ error }}</MpFormErrorMessage>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="submit">Create</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
