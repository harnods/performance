<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/ModalPreview.vue
  Component name preserved: ModalTemplatePreview. Props/events preserved:
  isOpen (+ update:isOpen), data, isWeight, isLegend, legends.
  Full-size modal, same as production: amber frame + sticky "Exit preview" tab.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpModal, MpModalOverlay, MpModalContent, MpIcon, MpText, css } from '@mekari/pixel3'
import type { TemplateLegend } from '~/utils/reviewTemplate'

defineOptions({ name: 'ModalTemplatePreview' })

withDefaults(defineProps<{
  isOpen?: boolean
  data?: Record<string, unknown>
  isWeight?: boolean
  isLegend?: boolean
  legends?: TemplateLegend[]
}>(), { isOpen: false, data: () => ({}), isWeight: false, isLegend: false, legends: () => [] })

const emit = defineEmits<{ 'update:isOpen': [value: boolean] }>()
function onClose() { emit('update:isOpen', false) }

const content = css({ position: 'relative', border: '4px solid', borderColor: 'amber.400', background: 'background.surface', overflowY: 'auto' })
// Production hand-rolls this tab (mp-box bg amber.400) — see Design System Debt.
const exitTab = css({ position: 'sticky', top: '0', zIndex: '1', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: '4px', paddingX: '16px', paddingY: '8px', background: 'amber.400', border: 'none', cursor: 'pointer' })
const exitText = css({ fontSize: '14px', lineHeight: '24px', fontWeight: '600', color: 'text.default' })
const stage = css({ display: 'flex', justifyContent: 'center', marginTop: '40px', marginBottom: '40px', marginX: 'auto', width: '684px', maxWidth: '100%' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="full" class="template-preview-modal" @close="onClose">
      <MpModalOverlay />
      <MpModalContent :class="content">
        <button type="button" :class="exitTab" data-qa="settings-template-preview-btn-exit" @click="onClose">
          <MpIcon name="arrows-left" color="icon.default" />
          <MpText :class="exitText">Exit preview</MpText>
        </button>

        <div :class="stage">
          <TemplatePreviewContent :data="data" :is-weight="isWeight" :legends="legends" />
        </div>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
