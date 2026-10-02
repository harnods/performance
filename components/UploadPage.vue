<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migrated from talenta-review (commit 010875214aba): src/components/UploadPage.vue
  Component name + props preserved: detail { template_name, template_url,
  template_blob, process_url, redirect_url, dataPost }, tips, submitText, isPost.
  Prototype only — template download, Uppy upload and the process POST are
  MOCKED (toasts, no network). The Uppy picker is replaced by Performance's
  dropzone pattern (docs/patterns/upload.md, CompetencyUploadResults.vue).
  Demo: a file whose name contains "error" shows the row-error banner.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpText, MpButton, MpIcon, MpTextlink, MpBanner, MpBannerDescription,
  MpFormControl, MpFormErrorMessage, toast, css,
} from '@mekari/pixel3'

defineOptions({ name: 'UploadPage' })

interface UploadDetail {
  template_name: string
  template_url: string
  template_blob?: boolean
  process_url: string
  redirect_url: string
  dataPost?: Record<string, unknown>
}

const props = withDefaults(defineProps<{
  detail?: UploadDetail
  tips?: string[]
  submitText?: string
  isPost?: boolean
}>(), {
  detail: () => ({ template_name: 'Template.xlsx', template_url: '', template_blob: false, process_url: '', redirect_url: '', dataPost: {} }),
  tips: () => ['Make sure your employee ID is correct', 'Click column header on spreadsheet to read instruction'],
  submitText: 'Submit',
  isPost: false,
})

const router = useRouter()

// ─── Template download (MOCK) ────────────────────────────────────────────────
function downloadTemplate() {
  toast.notify({ id: 'upload-template', position: 'top-center', variant: 'success', title: `${props.detail.template_name} downloaded`, description: 'Prototype only. No file is generated.' })
}

// ─── File picker (Performance dropzone pattern) ──────────────────────────────
const MAX_MB = 10
const fileName = ref('')
const fileSizeLabel = ref('')
const fileInvalidReason = ref('')
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const hasFile = computed(() => !!fileName.value)

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
function browse() { fileInput.value?.click() }
function acceptFile(file: File | undefined) {
  if (!file) return
  fileInvalidReason.value = ''
  errorMessage.value = ''
  errorRows.value = []
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    fileInvalidReason.value = 'File must be an .xlsx spreadsheet. Please choose a different file'
    fileName.value = ''
    return
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    fileInvalidReason.value = `File is larger than ${MAX_MB} MB. Please choose a smaller file`
    fileName.value = ''
    return
  }
  fileName.value = file.name
  fileSizeLabel.value = formatSize(file.size)
}
function onInputChange(e: Event) { acceptFile((e.target as HTMLInputElement).files?.[0]) }
function onDrop(e: DragEvent) { isDragging.value = false; acceptFile(e.dataTransfer?.files?.[0]) }
function clearFile() {
  fileName.value = ''
  fileSizeLabel.value = ''
  fileInvalidReason.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

// ─── Process upload (MOCK) ───────────────────────────────────────────────────
const errorMessage = ref('')
const errorRows = ref<string[]>([])
// Mirrors the API's row-level error list (response.data.message as an array).
const MOCK_ERROR_ROWS = [
  'Row 4: Item name is required.',
  'Row 7: Item name "Leadership" already exists.',
  'Row 12: Rating 3 description exceeds 255 characters.',
]
function uploadFiles() {
  errorMessage.value = ''
  errorRows.value = []
  // Primary CTA stays enabled (docs/patterns/buttons.md) — validate on click.
  if (!hasFile.value) {
    fileInvalidReason.value = 'Please upload a spreadsheet first'
    return
  }
  if (fileName.value.toLowerCase().includes('error')) {
    toast.notify({ id: 'upload-error', position: 'top-center', variant: 'error', title: 'Error to upload template' })
    errorRows.value = MOCK_ERROR_ROWS
    clearFile()
    return
  }
  toast.notify({ id: 'upload-success', position: 'top-center', variant: 'success', title: 'File uploaded', description: 'Your file is being processed.' })
  router.push(props.detail.redirect_url)
}
function cancel() { router.push(props.detail.redirect_url) }

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const wrap = css({ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '552px' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const descText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const templateRow = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', width: '100%',
  padding: '16px', borderRadius: 'md', border: '1px solid', borderColor: 'border.default',
  background: 'white', cursor: 'pointer', textAlign: 'left',
  _hover: { background: 'background.neutral.subtle' },
})
const templateName = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', overflowWrap: 'anywhere' })
const fieldLabel = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', marginBottom: '4px' })
const dropzoneBase = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  height: '240px', width: '100%', borderRadius: 'md', textAlign: 'center', cursor: 'pointer',
  border: '1px dashed', borderColor: 'border.default', background: 'white',
  transition: 'border-color 0.12s ease, background 0.12s ease',
} as const
const dropzone = css(dropzoneBase)
const dropzoneDragging = css({ ...dropzoneBase, borderColor: 'border.brand', background: 'background.brand.subtle' })
const dropzoneInvalid = css({ ...dropzoneBase, borderColor: 'border.danger' })
const blankSlate = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4', paddingInline: '4' })
const uploadIcon = css({ display: 'flex', color: 'icon.brand', '& svg': { width: '48px', height: '48px' } })
const dropTitle = css({ fontSize: '16px', lineHeight: '24px', color: 'text.default' })
const dropHint = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const hiddenInput = css({ display: 'none' })
const fileRow = css({ display: 'flex', alignItems: 'center', gap: '3', padding: '16px', borderRadius: 'md', border: '1px solid', borderColor: 'border.default' })
const fileMeta = css({ display: 'flex', flexDirection: 'column', flex: '1', minWidth: '0' })
const fileNameText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', overflowWrap: 'anywhere' })
const fileSizeText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const footer = css({ display: 'flex', justifyContent: 'flex-end', gap: '2' })
</script>

<template>
  <div :class="wrap">
    <!-- Title -->
    <div>
      <MpText :class="h2Class">Download the template</MpText>
      <MpText :class="descText">Download template below and complete it with your data.</MpText>
    </div>

    <!-- Template -->
    <button type="button" :class="templateRow" @click="downloadTemplate">
      <MpFlex align="center" gap="4">
        <MpIcon name="excel-document" />
        <span :class="templateName">{{ detail.template_name }}</span>
      </MpFlex>
      <MpIcon name="download" />
    </button>

    <!-- Info -->
    <div>
      <MpText :class="h3Class">Please note that:</MpText>
      <MpFlex v-for="(tip, idx) in tips" :key="`tip_${idx}`" align="center" gap="2" :data-qa="`component-upload-page-tip-${idx}`">
        <MpIcon name="indicator-circle" size="sm" />
        <MpText :class="descText">{{ tip }}</MpText>
      </MpFlex>
    </div>

    <!-- Input upload -->
    <MpFormControl id="upload-page-file" :is-invalid="!!fileInvalidReason">
      <div :class="fieldLabel">Upload spreadsheet</div>
      <div v-if="hasFile" :class="fileRow">
        <MpIcon name="excel-document" />
        <div :class="fileMeta">
          <span :class="fileNameText">{{ fileName }}</span>
          <span :class="fileSizeText">{{ fileSizeLabel }}</span>
        </div>
        <MpButton variant="ghost" left-icon="close" aria-label="Remove file" @click="clearFile" />
      </div>
      <div
        v-else
        :class="fileInvalidReason ? dropzoneInvalid : isDragging ? dropzoneDragging : dropzone"
        role="button"
        tabindex="0"
        @click="browse"
        @keydown.enter.prevent="browse"
        @keydown.space.prevent="browse"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <div :class="blankSlate">
          <span :class="uploadIcon"><MpIcon name="upload" /></span>
          <MpText :class="dropTitle">
            Drop your file here or <MpTextlink as="button" @click.stop="browse">Browse</MpTextlink>
          </MpText>
          <span :class="dropHint">.xlsx only with max size {{ MAX_MB }}mb</span>
        </div>
      </div>
      <input ref="fileInput" type="file" accept=".xlsx" :class="hiddenInput" @change="onInputChange">
      <MpFormErrorMessage>{{ fileInvalidReason }}</MpFormErrorMessage>
    </MpFormControl>

    <!-- Error message -->
    <MpBanner v-if="errorMessage" variant="danger">
      <MpBannerDescription>{{ errorMessage }}</MpBannerDescription>
    </MpBanner>

    <div v-if="errorRows.length">
      <div :class="fieldLabel">File errors</div>
      <MpBanner variant="danger">
        <MpBannerDescription>
          <MpFlex v-for="(error, idx) in errorRows" :key="idx" align="center" gap="2" :data-qa="`component-upload-page-error-${idx}`">
            <MpIcon name="indicator-circle" size="sm" />
            <MpText>{{ error }}</MpText>
          </MpFlex>
        </MpBannerDescription>
      </MpBanner>
    </div>

    <!-- Action buttons -->
    <div :class="footer">
      <MpButton variant="ghost" @click="cancel">Cancel</MpButton>
      <MpButton variant="primary" @click="uploadFiles">{{ submitText }}</MpButton>
    </div>
  </div>
</template>
