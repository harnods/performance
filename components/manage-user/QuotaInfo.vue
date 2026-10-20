<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/manage-user/component/QuotaInfo.vue
  Component name preserved: QuotaInfo. Props/events preserved: data, isLoading,
  isRequestSent; emits `request-quota`.
  Prototype only: the "show the banner once" rule used the `quota-banner`
  cookie via $cookies — kept with useCookie.
  Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFlex, MpText, MpButton, MpProgress, MpBanner, MpBannerIcon, MpBannerDescription, css } from '@mekari/pixel3'
import type { QuotaData } from '~/utils/manageUser'

defineOptions({ name: 'QuotaInfo' })

const props = withDefaults(defineProps<{ data?: Partial<QuotaData>, isLoading?: boolean, isRequestSent?: boolean }>(), {
  data: () => ({}),
  isLoading: false,
  isRequestSent: false,
})
const emit = defineEmits<{ 'request-quota': [] }>()

const info = {
  exceed: { type: 'exceed-quota', desc: 'Your member quota has run out. Manage the employees accordingly within 30 days, or the system will restrict you from some actions.', variant: 'danger' as const },
  requested: { type: 'newly-requested', desc: 'A new request has been sent to upgrade your subscription type.', variant: 'info' as const },
  approved: { type: 'newly-approved', desc: 'A new quota has been set, now you can add more user to Performance Management feature.', variant: 'success' as const },
}

const existing = computed(() => props.data.active_user || 0)
const quota = computed(() => props.data.limit || 0)
const progress = computed(() => ({
  percent: quota.value ? Math.min(100, (existing.value / quota.value) * 100) : 0,
  isOver: existing.value > quota.value,
  color: existing.value >= quota.value ? 'negative' : 'information',
}))
const banner = computed(() => {
  if (props.isRequestSent) return info.requested
  if (props.data.is_newly_upgraded) return info.approved
  if (props.data.is_error) return info.exceed
  return null
})

// Show the banner only once, unless the information changes.
const bannerCookie = useCookie<string | null>('quota-banner', { default: () => null })
const isShowBanner = ref(false)
watch(banner, (val) => {
  if (!val) return
  isShowBanner.value = bannerCookie.value !== val.type
  bannerCookie.value = val.type
}, { deep: true, immediate: true })

const box = css({
  display: 'flex', alignItems: 'center', gap: '10', padding: '6',
  borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'lg',
})
const meter = css({ flex: '1', display: 'flex', flexDirection: 'column', gap: '2', paddingRight: '10', borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const titleText = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const countText = css({ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' })
</script>

<template>
  <MpFlex direction="column" gap="4">
    <MpBanner v-if="isShowBanner && banner" :variant="banner.variant" is-inline>
      <MpBannerIcon />
      <MpBannerDescription>{{ banner.desc }}</MpBannerDescription>
    </MpBanner>
    <div :class="box">
      <div :class="meter">
        <MpFlex justify="space-between" align="center" gap="4">
          <MpText :class="titleText">User management quota</MpText>
          <MpText size="label" :class="countText">
            <span :class="css({ color: progress.isOver ? 'text.danger' : 'text.default' })">{{ existing }}</span>
            <span :class="css({ fontWeight: '600' })"> of </span>{{ quota }} quota
          </MpText>
        </MpFlex>
        <MpProgress variant="linear" size="sm" :color="isLoading ? 'stone' : progress.color" :value="progress.percent" />
        <MpText size="label" color="text.secondary">You can add and limit quotas in user management.</MpText>
      </div>
      <MpButton variant="secondary" :is-disabled="isLoading" data-qa="settings-quota-info-btn-upgrade" @click="emit('request-quota')">Upgrade quota</MpButton>
    </div>
  </MpFlex>
</template>
