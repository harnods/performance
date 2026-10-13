<!--
  Placeholder — not migrated yet.
  Production source: talenta-review (commit 010875214aba)
    src/views/settings/manage-user/activity-log/Index.vue (page title "Activity User Log").
  Exists so the Settings → Manage users → Activity logs menu resolves.
-->
<script setup lang="ts">
import { MpFlex, MpText, css } from '@mekari/pixel3'

definePageMeta({ title: 'Activity User Log', layout: 'default' })

const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <MpFlex direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
    <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
    <MpFlex direction="column" align="center" gap="1">
      <MpText :class="emptyTitle">Activity user log</MpText>
      <MpText size="label" color="text.secondary">This page hasn't been migrated to the prototype yet.</MpText>
    </MpFlex>
  </MpFlex>
</template>
