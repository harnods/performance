<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dashboard — email reminder modal
  Replica of talenta-review's ModalEmail.vue. Single ("Email reminder") or
  bulk ("Bulk email reminder"). Read-only Employee field (avatar+id single, or
  name badges capped at 9 with "+N more" → employee list), a "Hi {{employee
  name}}" salutation, and a required editable "Email content" textarea
  defaulting to the caller's template. Cancel / Send email.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpAvatar,
  MpButton,
  MpButtonGroup,
  MpTextarea,
  MpTextlink,
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

interface EmailEmployee { id: string, name: string, employeeId: string, photo?: string }

const props = defineProps<{
  isOpen: boolean
  mode: 'single' | 'bulk'
  employee?: EmailEmployee | null
  employees?: EmailEmployee[]
  template: string
}>()
const emit = defineEmits<{ 'update:isOpen': [v: boolean], send: [content: string] }>()

const MAX_BADGES = 9
const salutationName = '{{employee name}}' // shown literally as a template placeholder
const content = ref('')
const error = ref(false)
const showAll = ref(false)

const title = computed(() => (props.mode === 'bulk' ? 'Bulk email reminder' : 'Email reminder'))
const bulkList = computed(() => props.employees ?? [])
const shownBadges = computed(() => bulkList.value.slice(0, MAX_BADGES))
const moreCount = computed(() => Math.max(0, bulkList.value.length - MAX_BADGES))

watch(() => props.isOpen, (open) => {
  if (open) { content.value = props.template; error.value = false; showAll.value = false }
})
watch(content, () => { error.value = false })

function close() { emit('update:isOpen', false) }
function send() {
  error.value = !content.value.trim()
  if (error.value) return
  emit('send', content.value.trim())
  close()
}

const label = css({ fontSize: '14px', fontWeight: '600', color: 'text.default', marginBottom: '1' })
const ownerRow = css({ display: 'flex', alignItems: 'center', gap: '2' })
const nameText = css({ fontSize: '14px', color: 'text.default' })
const idText = css({ fontSize: '12px', color: 'text.secondary' })
const badges = css({ display: 'flex', flexWrap: 'wrap', gap: '1.5' })
const badge = css({ display: 'inline-flex', alignItems: 'center', paddingInline: '2', paddingBlock: '0.5', background: 'background.neutral.subtle', borderRadius: 'sm', fontSize: '12px', color: 'text.default' })
const salutation = css({ fontSize: '14px', color: 'text.default', marginBottom: '2' })
const listWrap = css({ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2', marginTop: '2', padding: '3', border: '1px solid', borderColor: 'border.default', borderRadius: '6px' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="lg" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          {{ title }}
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpFlex direction="column" gap="4">
            <div>
              <div :class="label">Employee</div>
              <div v-if="mode === 'single' && employee" :class="ownerRow">
                <PxAvatar :id="`email-${employee.id}`" :name="employee.name" :src="employee.photo" size="md" variant-color="gray" />
                <MpFlex direction="column" gap="0">
                  <span :class="nameText">{{ employee.name }}</span>
                  <span :class="idText">{{ employee.employeeId }}</span>
                </MpFlex>
              </div>
              <div v-else :class="badges">
                <span v-for="e in shownBadges" :key="e.id" :class="badge">{{ e.name }}</span>
                <MpTextlink v-if="moreCount > 0" as="a" @click="showAll = true">+{{ moreCount }} more</MpTextlink>
              </div>
              <div v-if="mode === 'bulk' && showAll" :class="listWrap">
                <span v-for="e in bulkList" :key="e.id" :class="nameText">{{ e.name }}</span>
              </div>
            </div>

            <MpFormControl id="email-content" :is-invalid="error">
              <MpFormLabel>Email content</MpFormLabel>
              <div :class="salutation">Hi {{ salutationName }},</div>
              <MpTextarea v-model="content" placeholder="Write your reminder message" />
              <MpFormErrorMessage>This field is required</MpFormErrorMessage>
            </MpFormControl>
          </MpFlex>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="send">Send email</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
