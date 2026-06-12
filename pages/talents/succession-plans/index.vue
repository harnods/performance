<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Succession plans (landing)
  Source: Flexible Competency Assignment PRD — US3 entry point
  Token mode: Pixel 2.4
  Patterns used: layout-shell, empty-state
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Lightweight landing so the Create succession plan (US3) flow is reachable.
  Full succession-plan list/redesign is out of scope for this initiative.
-->
<script setup lang="ts">
import { MpFlex, MpButton, MpText, css } from '@mekari/pixel3'

definePageMeta({ title: 'Succession plans', layout: 'default' })

const emptyBlock = css({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2',
  paddingBlock: '20', border: '1px dashed', borderColor: 'border.default', borderRadius: 'md',
  background: 'background.surface',
})
const captionText = css({ color: 'text.secondary' })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="primary" left-icon="add" @click="navigateTo('/talents/succession-plans/create')">
        Create succession plan
      </MpButton>
    </Teleport>

    <div :class="emptyBlock">
      <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">No succession plan yet</MpText>
      <MpText size="label-small" :class="captionText">
        Start one from the <strong>Create succession plan</strong> button.
      </MpText>
    </div>
  </MpFlex>
</template>
