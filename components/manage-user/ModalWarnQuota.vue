<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/manage-user/component/ModalWarnQuota.vue
  Component name preserved: ModalWarnQuota. Props/events preserved: isOpen
  (+ update:isOpen), isExceed, isRestricted, title, data, preventClose; emits
  `request-quota`.
  Prototype only: getGrantAccess.quotaData fallback (Vuex) and the per-state
  illustrations ($store.state.assets.*) removed — every state uses the shared
  empty-state illustration. Footer permission check removed.
  Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpButton, MpTextlink, css,
} from '@mekari/pixel3'
import type { QuotaData } from '~/utils/manageUser'

defineOptions({ name: 'ModalWarnQuota' })

const props = withDefaults(defineProps<{
  isOpen?: boolean
  isExceed?: boolean
  isRestricted?: boolean
  title?: string
  data?: Partial<QuotaData>
  preventClose?: boolean
}>(), { isOpen: false, isExceed: false, isRestricted: false, title: '', data: () => ({}), preventClose: false })
const emit = defineEmits<{ 'update:isOpen': [value: boolean], 'request-quota': [] }>()

const route = useRoute()
const router = useRouter()

const content = computed(() => {
  if (props.isRestricted) return { title: 'Unable to access', isQuotaInfo: false, description: 'restricted' as const }
  return props.isExceed
    ? { title: 'Quota limit reached', isQuotaInfo: true, description: 'exceed' as const }
    : { title: 'Quota limit reached', isQuotaInfo: true, description: 'equal' as const }
})
const isOverQuota = computed(() => (props.data.active_user ?? 0) > (props.data.limit ?? 0))

function close() { emit('update:isOpen', false) }
function goToManage() {
  if (route.path !== '/settings/manage-users/assign-role') router.push('/settings/manage-users/assign-role')
  close()
}
function upgrade() {
  emit('request-quota')
  close()
}

const illustration = css({ height: '180px', width: 'auto' })
const contentTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" class="warn-quota-modal" :is-close-on-esc="!preventClose" :is-close-on-overlay-click="!preventClose" @close="close">
      <MpModalOverlay />
      <MpModalContent :class="css({ width: '448px', maxWidth: '90vw' })">
        <MpModalHeader>
          {{ title }}
          <MpModalCloseButton v-if="!preventClose" @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpFlex direction="column" align="center" gap="2" :class="css({ textAlign: 'center' })">
            <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="illustration">
            <MpText :class="contentTitle">{{ content.title }}</MpText>
            <MpText v-if="content.isQuotaInfo" size="label">
              <span :class="css({ color: 'text.secondary' })">Current quota: </span>
              <span :class="css({ color: isOverQuota ? 'text.danger' : 'text.default' })">{{ data.active_user }}</span>/{{ data.limit }} users
            </MpText>
            <MpText size="label" color="text.secondary">
              <template v-if="content.description === 'restricted'">You have not removed total user on performance to meet the quota.</template>
              <template v-else-if="content.description === 'exceed'">
                Manage the employees accordingly within {{ data.grace_period_remaining_days ?? 30 }} days, or the system will have to restrict some actions.<br><br>
                For more information please contact our support team.
              </template>
              <template v-else>
                To add more employees, please remove some of them or upgrade your quota please
                <MpTextlink as="a" href="mailto:support@mekari.com" data-qa="settings-modal-warn-quota-link-support">contact support</MpTextlink>
              </template>
            </MpText>
          </MpFlex>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton v-if="!preventClose" variant="ghost" data-qa="settings-modal-warn-quota-btn-cancel" @click="close">Cancel</MpButton>
            <MpButton v-if="isRestricted || isExceed" variant="primary" data-qa="settings-modal-warn-quota-btn-manage" @click="goToManage">Manage user</MpButton>
            <MpButton v-else variant="primary" data-qa="settings-modal-warn-quota-btn-upgrade" @click="upgrade">Upgrade quota</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.warn-quota-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
