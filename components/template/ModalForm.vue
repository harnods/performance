<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/ModalForm.vue
  Component name preserved: ModalTemplateForm. Props/events preserved: isOpen
  (+ update:isOpen), uuid, hasEditAccess; emits `updated`.
  Full-size modal (Pixel 3 MpModal size="full"), same as production — header
  carries Reset / Template library / Preview / Save, like production.
  The preset, preview and confirmation modals are mounted as siblings of the
  builder modal (not inside its content): Pixel 3 crashes when a modal opens
  inside another modal's content (docs/patterns/avatar.md).
  Prototype only — Vuex/API removed (see useReviewTemplateStore).
  Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpButton, MpText, toast, css,
} from '@mekari/pixel3'
import type { TemplatePreset, TemplateLegend } from '~/utils/reviewTemplate'

defineOptions({ name: 'ModalTemplateForm' })

const props = withDefaults(defineProps<{ isOpen?: boolean, uuid?: string, hasEditAccess?: boolean }>(), { isOpen: false, uuid: '', hasEditAccess: false })
const emit = defineEmits<{ 'update:isOpen': [value: boolean], 'updated': [showPresetFeedback: boolean] }>()

const { getTemplate } = useReviewTemplateStore()

interface TemplateFormRef {
  assignData: (data: ReturnType<typeof getTemplate>, isPreset?: boolean) => void
  resetTemplate: () => void
  handleSubmit: () => void
  form: Record<string, unknown>
  is_use_weight: boolean
  currentLegendsData: TemplateLegend[]
}
const formTemplate = ref<TemplateFormRef | null>(null)

const isLoading = ref(false)
const isLoadingSubmit = ref(false)
const isModalReset = ref(false)
const isModalCancel = ref(false)
const isModalPreset = ref(false)
const isModalPresetDetail = ref(false)
const isModalPreview = ref(false)
const templateUuid = ref('')
const selectedPreset = ref<TemplatePreset | Record<string, never>>({})

const isEdit = computed(() => Boolean(templateUuid.value))
const isViewOnly = computed(() => (props.uuid ? !props.hasEditAccess : false))
const isActionDisabled = computed(() => isLoading.value || isLoadingSubmit.value || isViewOnly.value)

function fetch(uuid: string, isPreset = false) {
  try {
    if (!uuid) throw new Error('Invalid template UUID')
    isLoading.value = true
    // MOCK of GET /review-templates/detail/{uuid}
    const data = getTemplate(uuid)
    isLoading.value = false
    nextTick(() => formTemplate.value?.assignData(data, isPreset))
  }
  catch (err) {
    isLoading.value = false
    toast.notify({ id: 'template-fetch-error', position: 'top-center', variant: 'error', title: (err as { message?: string })?.message ?? 'Failed to fetch template' })
    close()
  }
}

watch(() => props.isOpen, (val) => {
  if (!val) return
  templateUuid.value = props.uuid || ''
  nextTick(() => {
    formTemplate.value?.resetTemplate()
    if (props.uuid) fetch(props.uuid)
  })
})

function onClose() { isModalCancel.value = true }
function close() {
  isModalCancel.value = false
  emit('update:isOpen', false)
}
function handleSubmit() { formTemplate.value?.handleSubmit() }
function updated(isShowPresetFeedback = false) {
  isLoadingSubmit.value = false
  close()
  emit('updated', isShowPresetFeedback)
}
function previewPreset(preset: TemplatePreset) {
  selectedPreset.value = preset
  isModalPresetDetail.value = true
}
function usePreset(uuid: string) {
  isModalPreset.value = false
  isModalPresetDetail.value = false
  toast.notify({ id: 'template-preset-applied', position: 'top-center', variant: 'success', title: 'Preset applied' })
  fetch(uuid, true)
}
function confirmReset() {
  isModalReset.value = false
  formTemplate.value?.resetTemplate()
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
const contentClass = css({ display: 'flex', flexDirection: 'column', height: '100vh' })
const headerWhite = css({ background: 'background.neutral' })
const brandBtn = css({ color: 'text.link', '& svg': { color: 'text.link' } })
const headerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4', width: 'calc(100% - 48px)' })
const titleText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const actions = css({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3' })
const bodyClass = css({ padding: '0', flex: '1', minHeight: '0', display: 'flex', overflowY: { base: 'auto', md: 'hidden' }, overflowX: 'hidden' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
const bodyText = css({ color: 'text.default' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="full" class="template-form-modal" :is-close-on-esc="false" @close="onClose">
      <MpModalOverlay />
      <MpModalContent :class="contentClass">
        <MpModalHeader :class="headerWhite">
          <div :class="headerRow">
            <MpText as="h1" :class="titleText">{{ isEdit ? 'View & edit template' : 'Create new template' }}</MpText>
            <div :class="actions">
              <MpButton variant="ghost" :is-disabled="isActionDisabled" data-qa="settings-template-modal-form-btn-reset" @click="isModalReset = true">Reset</MpButton>
              <MpButton variant="secondary" left-icon="book" :class="brandBtn" :is-disabled="isActionDisabled" data-qa="settings-template-modal-form-btn-library" @click="isModalPreset = true">Template library</MpButton>
              <MpButton variant="secondary" left-icon="show" :class="brandBtn" :is-disabled="isLoading || isLoadingSubmit" data-qa="settings-template-modal-form-btn-preview" @click="isModalPreview = true">Preview</MpButton>
              <MpButton :is-disabled="isActionDisabled" :is-loading="isLoadingSubmit" data-qa="modal-template-form-submit" @click="handleSubmit">Save</MpButton>
            </div>
          </div>
          <MpModalCloseButton :is-disabled="isLoading" @click="onClose" />
        </MpModalHeader>
        <MpModalBody :class="bodyClass">
          <TemplateForm
            ref="formTemplate"
            :uuid="templateUuid"
            :is-loading="isLoading"
            :is-view-only="isViewOnly"
            @updated="updated"
            @is-submitting="(v: boolean) => (isLoadingSubmit = v)"
          />
        </MpModalBody>
      </MpModalContent>
    </MpModal>

    <!-- Template library -->
    <TemplateModalPreset v-model:is-open="isModalPreset" @preview="previewPreset" @use-template="usePreset" />
    <TemplateModalPresetDetail v-model:is-open="isModalPresetDetail" :preset="selectedPreset" @use-template="usePreset" />

    <!-- Preview (production mounts it inside TemplateForm) -->
    <TemplateModalPreview
      v-model:is-open="isModalPreview"
      :data="formTemplate?.form ?? {}"
      :is-weight="formTemplate?.is_use_weight ?? false"
      :legends="formTemplate?.currentLegendsData ?? []"
    />

    <!-- Cancel confirmation -->
    <MpModal :is-open="isModalCancel" class="template-confirm-modal" @close="isModalCancel = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Cancel {{ isEdit ? 'editing' : 'creating' }} template?
          <MpModalCloseButton @click="isModalCancel = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">Your {{ isEdit ? 'changes' : 'template' }} will be deleted and you can't undo this action.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="isModalCancel = false">Keep template</MpButton>
            <MpButton variant="danger" @click="close">Discard {{ isEdit ? 'changes' : 'template' }}</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Reset confirmation -->
    <MpModal :is-open="isModalReset" class="template-confirm-modal" @close="isModalReset = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Reset this preset?
          <MpModalCloseButton @click="isModalReset = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">The configuration you made won’t be saved.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="isModalReset = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmReset">Reset</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px (confirmations only; the builder is full-size). */
:global(.template-confirm-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
