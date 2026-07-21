<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Bulk goal action (stub)

  Reached from the table-header action bar ("Update selected goals" /
  "Edit selected goals" / "Close selected goals") on any goal-listing page
  once 1+ rows are checkbox-selected. Stub only — none of these flows are
  built in this prototype yet; this page just confirms the right goals/mode
  carried over.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpFlex, MpText, MpButton, css } from '@mekari/pixel3'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
  title: 'Bulk goal action',
})

const route = useRoute()
const router = useRouter()

const MODE_LABEL: Record<string, string> = {
  'update-progress': 'Update selected goals',
  'edit-goals': 'Edit selected goals',
  'close-goals': 'Close selected goals',
}
const mode = computed(() => {
  const raw = route.query.mode
  return typeof raw === 'string' && raw in MODE_LABEL ? raw : 'edit-goals'
})
const selectedIds = computed(() => {
  const raw = route.query.ids
  const list = Array.isArray(raw) ? raw[0] : raw
  return (list ?? '').split(',').filter(Boolean)
})
const modeLabel = computed(() => MODE_LABEL[mode.value])

function goBack() {
  router.back()
}

const wrap = css({ paddingY: '20', textAlign: 'center' })
const illustration = css({ height: '240px', width: 'auto' })
const textWrap = css({ maxWidth: '420px' })
const title = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
</script>

<template>
  <MpFlex direction="column" align="center" justify="center" gap="4" :class="wrap">
    <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="illustration">
    <MpFlex direction="column" align="center" gap="1" :class="textWrap">
      <MpText :class="title">{{ modeLabel }}</MpText>
      <MpText size="label" :class="captionText">
        {{ selectedIds.length }} goal{{ selectedIds.length === 1 ? '' : 's' }} selected. This flow isn't built in this prototype yet.
      </MpText>
    </MpFlex>
    <MpButton variant="secondary" @click="goBack">Back</MpButton>
  </MpFlex>
</template>
