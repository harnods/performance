<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/manage-user/component/DrawerRequestQuota.vue
  Component name preserved: DrawerRequestQuota. Props/events preserved: isOpen
  (+ update:isOpen), quota; emits `sent`.
  Prototype only — removed: the hidden Zoho form POST (forms.zohopublic.com,
  opens a new tab) and POST /quota/request-adjustment-log. userData/consultant
  (Vuex) → the "View as" persona. vuelidate → local validation.
  Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpButton, MpButtonGroup, MpInput, MpInputGroup, MpInputLeftAddon, MpTextarea, MpBadge,
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpFormHelpText, css,
} from '@mekari/pixel3'
import type { QuotaData } from '~/utils/manageUser'
import { employeeById } from '~/utils/employees'

defineOptions({ name: 'DrawerRequestQuota' })

const props = withDefaults(defineProps<{ isOpen?: boolean, quota?: Partial<QuotaData> }>(), { isOpen: false, quota: () => ({}) })
const emit = defineEmits<{ 'update:isOpen': [value: boolean], sent: [] }>()

const ADDITIONAL_INFO_MAX = 120
const inquiries = [
  { id: 1, name: 'Upgrade quota', description: 'Increase your quota number from existing subscription.' },
  { id: 2, name: 'Change subscription', description: 'Request new subscription type.' },
]
const inquiryOptions = inquiries.map(i => ({ value: String(i.id), label: i.name, description: i.description }))

const activeStep = ref(1)
const form = ref({ inquiry_type: '1', requested_quota: '' as string, additional_info: '' })
const touched = ref(false)
const isModalSent = ref(false)

watch(() => props.isOpen, (val) => {
  if (!val) return
  touched.value = false
  activeStep.value = 1
  form.value = { inquiry_type: '1', requested_quota: '', additional_info: '' }
})
watch(() => form.value.inquiry_type, () => { form.value.requested_quota = '' })

const { currentUserId } = useCurrentUser()
const user = computed(() => employeeById(currentUserId.value))
const fullName = computed(() => user.value?.name ?? '-')
const email = computed(() => (user.value ? `${user.value.id}@centralperk.co.id` : '-'))

const selectedInquiry = computed(() => inquiries.find(i => i.id === Number(form.value.inquiry_type)) ?? inquiries[0])
const isMandatoryQuota = computed(() => Number(form.value.inquiry_type) === 1)

const quotaError = computed(() => {
  if (!touched.value || !isMandatoryQuota.value) return ''
  return Number.parseInt(form.value.requested_quota, 10) > 0 ? '' : 'This field is required'
})
const infoError = computed(() => (form.value.additional_info.length > ADDITIONAL_INFO_MAX ? `Must have at most ${ADDITIONAL_INFO_MAX} characters` : ''))

const subDetail = computed(() => [
  { label: 'Subscription type', value: props.quota.package_name || '' },
  { label: 'Total quota', value: `${props.quota.limit} users` },
  { label: 'User detail', value: fullName.value, sub: email.value },
  { label: 'Phone number', value: '-' },
])
const requestDetail = computed(() => [
  { label: 'User detail', value: fullName.value, sub: email.value },
  { label: 'Company name', value: 'PT Central Perk Indonesia' },
  { label: 'Inquiry type', value: selectedInquiry.value.name },
  { label: 'Requested quota', value: `+${form.value.requested_quota} users`, isHidden: !isMandatoryQuota.value },
  { label: 'Additional information', value: form.value.additional_info },
])

function handleClose() { emit('update:isOpen', false) }
function cancel() {
  if (activeStep.value === 1) handleClose()
  else activeStep.value = 1
}
function next() {
  if (activeStep.value === 1) {
    touched.value = true
    if (!quotaError.value && !infoError.value) activeStep.value = 2
  }
  else submit()
}
function submit() {
  // MOCK: production posts a hidden Zoho form + POST /quota/request-adjustment-log.
  emit('update:isOpen', false)
  emit('sent')
  isModalSent.value = true
}

const section = css({ display: 'flex', flexDirection: 'column', gap: '4', paddingBottom: '5', marginBottom: '5', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const detailRow = css({ display: 'flex', gap: '4' })
const detailLabel = css({ width: '50%', flexShrink: '0', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })
const detailValue = css({ width: '50%', fontSize: '14px', lineHeight: '20px', color: 'text.default', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })
const subText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const sentIllustration = css({ height: '140px', width: 'auto' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-request-quota" :is-open="isOpen" placement="right" size="md" :is-close-on-overlay-click="false" is-keep-alive @close="handleClose">
      <MpDrawerContent>
        <MpDrawerHeader>
          Upgrade quota
          <MpDrawerCloseButton @click="handleClose" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <!-- Subscription detail -->
          <div :class="section">
            <MpFlex direction="column" gap="0">
              <MpText as="h3" :class="h3Class">Subscription detail</MpText>
              <MpText size="label" color="text.secondary">Here is your current subscription details.</MpText>
            </MpFlex>
            <div v-for="(field, idx) in subDetail" :key="idx" :class="detailRow" :data-qa="`view-settings-drawer-request-quota-field-${idx}`">
              <span :class="detailLabel">{{ field.label }}</span>
              <span :class="detailValue">
                {{ field.value || '-' }}
                <span v-if="field.sub" :class="[subText, css({ display: 'block' })]">{{ field.sub }}</span>
              </span>
            </div>
          </div>

          <!-- Step 1 -->
          <MpFlex v-if="activeStep === 1" direction="column" gap="5">
            <MpFlex direction="column" gap="0">
              <MpText as="h3" :class="h3Class">Request upgrade quota</MpText>
              <MpText size="label" color="text.secondary">Send an inquiry to our Account Manager team to upgrade your quota with more employees.</MpText>
            </MpFlex>

            <MpFormControl id="inquiry-type">
              <MpFormLabel>Inquiry type</MpFormLabel>
              <PxSelectPopover v-model="form.inquiry_type" :options="inquiryOptions" width="100%" data-qa="settings-drawer-request-quota-dropdown-inquiry-type" />
            </MpFormControl>

            <MpFormControl v-if="isMandatoryQuota" id="requested-quota" :is-invalid="!!quotaError">
              <MpFormLabel>Requested user quota</MpFormLabel>
              <MpInputGroup>
                <MpInputLeftAddon>+</MpInputLeftAddon>
                <MpInput v-model="form.requested_quota" type="number" min="1" data-qa="settings-drawer-request-quota-input-requested-quota" />
              </MpInputGroup>
              <MpFormHelpText v-if="!quotaError">You will add this number to your new quota.</MpFormHelpText>
              <MpFormErrorMessage>{{ quotaError }}</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl id="additional-info" :is-invalid="!!infoError">
              <div :class="labelRow">
                <MpFormLabel>
                  <MpFlex as="span" align="center" gap="2">Additional information <MpBadge for="tableStatus" type="announcement" size="sm">Optional</MpBadge></MpFlex>
                </MpFormLabel>
                <span :class="charCount">{{ form.additional_info.length }} / {{ ADDITIONAL_INFO_MAX }}</span>
              </div>
              <MpTextarea v-model="form.additional_info" data-qa="settings-drawer-request-quota-textarea-additional-info" />
              <MpFormErrorMessage>{{ infoError }}</MpFormErrorMessage>
            </MpFormControl>
          </MpFlex>

          <!-- Step 2 -->
          <MpFlex v-else direction="column" gap="4">
            <MpFlex direction="column" gap="0">
              <MpText as="h3" :class="h3Class">Request details</MpText>
              <MpText size="label" color="text.secondary">Make sure your data request is accurate before sending it.</MpText>
            </MpFlex>
            <template v-for="(field, idx) in requestDetail" :key="idx">
              <div v-if="!field.isHidden" :class="detailRow">
                <span :class="detailLabel">{{ field.label }}</span>
                <span :class="detailValue">
                  {{ field.value || '-' }}
                  <span v-if="field.sub" :class="[subText, css({ display: 'block' })]">{{ field.sub }}</span>
                </span>
              </div>
            </template>
          </MpFlex>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" data-qa="settings-drawer-request-quota-btn-cancel" @click="cancel">{{ activeStep === 1 ? 'Cancel' : 'Back' }}</MpButton>
            <MpButton variant="primary" data-qa="settings-drawer-request-quota-btn-next" @click="next">{{ activeStep === 1 ? 'Next' : 'Submit' }}</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>

    <!-- ModalInfo: request sent -->
    <MpModal :is-open="isModalSent" class="request-quota-sent-modal" @close="isModalSent = false">
      <MpModalOverlay />
      <MpModalContent :class="css({ width: '448px', maxWidth: '90vw' })">
        <MpModalHeader>
          Upgrade quota
          <MpModalCloseButton @click="isModalSent = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpFlex direction="column" align="center" gap="2" :class="css({ textAlign: 'center' })">
            <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="sentIllustration">
            <MpText :class="css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px' })">Request upgrade sent</MpText>
            <MpText size="label" color="text.secondary">Thank you, we have received your request. Our team will contact you soon.</MpText>
          </MpFlex>
        </MpModalBody>
        <MpModalFooter>
          <MpFlex justify="flex-end" :class="css({ width: '100%' })">
            <MpButton variant="primary" @click="isModalSent = false">Go to user management</MpButton>
          </MpFlex>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.request-quota-sent-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
/* docs/patterns/form.md — addon offset reads NaNpx inside a just-opened drawer. */
:deep(.mp-input-group__root[data-with-left-addon='true'] .mp-input__control) {
  padding-left: 46px !important;
}
</style>
