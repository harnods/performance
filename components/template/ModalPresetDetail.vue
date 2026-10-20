<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/ModalPresetDetail.vue
  Component name preserved: ModalPresetDetail. Props/events preserved: isOpen
  (+ update:isOpen), preset; emits `use-template`.
  Preset images → Pixel icons. Production's #F1F5F9 preview canvas →
  background.surface.
  Prototype only — detail from useReviewTemplateStore. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpText, MpButton, MpIcon, MpDivider, toast, css } from '@mekari/pixel3'
import { answerTypeName, type TemplatePreset, type TemplateDetail } from '~/utils/reviewTemplate'

defineOptions({ name: 'ModalPresetDetail' })

const props = withDefaults(defineProps<{ isOpen?: boolean, preset?: TemplatePreset | Record<string, never> }>(), { isOpen: false, preset: () => ({}) })
const emit = defineEmits<{ 'update:isOpen': [value: boolean], 'use-template': [uuid: string] }>()

const { getTemplate } = useReviewTemplateStore()

const TOTAL_HEIGHT = 720
const HEADER_HEIGHT = 56
const data = ref<(TemplateDetail & TemplateDetail['template'] & { is_indicator_rating: boolean | string }) | null>(null)

watch(() => props.isOpen, (val) => {
  if (!val || !('template_uuid' in props.preset)) return
  try {
    const detail = getTemplate(props.preset.template_uuid)
    data.value = { ...detail, ...detail.template, is_indicator_rating: Boolean(Number(detail.template.is_indicator_rating)) }
  }
  catch (err) {
    toast.notify({ id: 'template-preset-error', position: 'top-center', variant: 'error', title: (err as { message?: string })?.message ?? 'Failed to fetch template' })
    close()
  }
})

const totalQuestions = computed(() => data.value?.categories?.reduce((acc, c) => acc + (c.indicators?.length ?? 0), 0) ?? 0)

function close() { emit('update:isOpen', false) }
function useTemplate() {
  if ('template_uuid' in props.preset) emit('use-template', props.preset.template_uuid)
  close()
}

const contentClass = css({ maxHeight: `${TOTAL_HEIGHT}px`, display: 'flex', flexDirection: 'column' })
const bodyClass = css({ padding: '0', display: 'flex', minHeight: '0', flex: '1' })
const summary = css({ width: '220px', flexShrink: '0', padding: '4', borderRight: '1px solid', borderRightColor: 'border.default', display: 'flex', flexDirection: 'column', gap: '3' })
const iconBox = css({ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'md', background: 'background.brand.subtle', marginBottom: '2' })
const name = css({ fontWeight: '600' })
const caption = css({ color: 'text.secondary' })
const metaList = css({ display: 'flex', flexDirection: 'column', gap: '3', marginTop: '2', color: 'text.secondary' })
const metaItem = css({ display: 'flex', alignItems: 'center', gap: '2' })
const previewCol = css({ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', background: 'background.surface', borderBottomRightRadius: 'md' })
const previewHead = css({ height: `${HEADER_HEIGHT}px`, flexShrink: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingX: '6', background: 'background.neutral', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const previewScroll = css({ height: `${TOTAL_HEIGHT - HEADER_HEIGHT - 48}px`, overflowY: 'auto', paddingY: '6', paddingX: '10' })
const backBtn = css({ alignSelf: 'flex-start' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="xl" class="template-preset-detail-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent :class="contentClass">
        <MpModalHeader>
          Template library
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody :class="bodyClass">
          <template v-if="data && 'template_uuid' in preset">
            <!-- Left: summary -->
            <div :class="summary">
              <MpButton variant="ghost" left-icon="arrows-left" :class="backBtn" data-qa="settings-template-modal-preset-btn-back" @click="close">Back</MpButton>
              <MpDivider />
              <div>
                <span :class="iconBox"><MpIcon :name="preset.icon" color="icon.brand" /></span>
                <MpText :class="name">{{ preset.name }}</MpText>
                <MpText :class="caption">{{ preset.description }}</MpText>
              </div>
              <div :class="metaList">
                <span :class="metaItem"><MpIcon name="chart-of-account" size="sm" /> {{ answerTypeName(data.answer_type) }} form</span>
                <span :class="metaItem"><MpIcon name="table-view-sort" size="sm" /> {{ totalQuestions }} indicators</span>
                <span v-if="data.ratings?.length" :class="metaItem"><MpIcon name="competencies" size="sm" /> {{ data.ratings.length }} ratings</span>
                <span v-if="data.legends?.length" :class="metaItem"><MpIcon name="today" size="sm" /> {{ data.legends.length }} legends</span>
              </div>
            </div>

            <!-- Right: preview -->
            <div :class="previewCol">
              <div :class="previewHead">
                <MpText as="h2" :class="h2Class">Preview</MpText>
                <MpButton size="sm" data-qa="settings-template-modal-preset-btn-use" @click="useTemplate">Use template</MpButton>
              </div>
              <div :class="previewScroll">
                <TemplatePreviewContent :data="data" :is-weight="data.calculate_type === 'weight'" :legends="data.legends" />
              </div>
            </div>
          </template>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.template-preset-detail-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
