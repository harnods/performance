<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/ModalPreset.vue
  Component name preserved: ModalPresetList. Props/events preserved: isOpen
  (+ update:isOpen); emits `preview`, `use-template`.
  Preset images (templatePresetImgsPath) → Pixel icons (images not in this repo).
  Prototype only — presets come from useReviewTemplateStore. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpText, MpButton, MpIcon, css } from '@mekari/pixel3'
import type { TemplatePreset } from '~/utils/reviewTemplate'

defineOptions({ name: 'ModalPresetList' })

defineProps<{ isOpen?: boolean }>()
const emit = defineEmits<{ 'update:isOpen': [value: boolean], 'preview': [preset: TemplatePreset], 'use-template': [uuid: string] }>()

const { presets } = useReviewTemplateStore()
function close() { emit('update:isOpen', false) }

const contentClass = css({ maxHeight: '670px', display: 'flex', flexDirection: 'column' })
const bodyClass = css({ padding: '6', overflowY: 'auto' })
const inner = css({ maxWidth: '752px', marginX: 'auto' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const caption = css({ color: 'text.secondary' })
const grid = css({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2', marginTop: '6' })
const tile = css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '4', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', cursor: 'pointer', textAlign: 'left', background: 'background.neutral', _hover: { background: 'background.neutral.hovered' } })
const iconBox = css({ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'md', background: 'background.brand.subtle' })
const name = css({ fontWeight: '600' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="!!isOpen" size="xl" class="template-preset-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent :class="contentClass">
        <MpModalHeader>
          Template library
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody :class="bodyClass">
          <div :class="inner">
            <MpText as="h2" :class="h2Class">A more compact review form with templates</MpText>
            <MpText :class="caption">Choose one of the templates below that best suits your review form needs.</MpText>

            <div :class="grid">
              <div
                v-for="preset in presets"
                :key="preset.template_uuid"
                :class="tile"
                role="button"
                tabindex="0"
                :data-qa="`view-settings-template-preset-${preset.template_uuid}`"
                @click="emit('preview', preset)"
                @keydown.enter="emit('preview', preset)"
              >
                <span :class="iconBox"><MpIcon :name="preset.icon" color="icon.brand" /></span>
                <div>
                  <MpText :class="name">{{ preset.name }}</MpText>
                  <MpText :class="caption">{{ preset.description }}</MpText>
                </div>
                <div>
                  <MpButton variant="secondary" size="sm" data-qa="settings-template-modal-preset-btn-use" @click.stop="emit('use-template', preset.template_uuid)">Use template</MpButton>
                </div>
              </div>
            </div>
          </div>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.template-preset-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
