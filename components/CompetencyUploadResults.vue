<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Import competency results — "Upload results" tab.
  Layout from Figma (Import Competency Assessment Results, nodes 4205:9776 /
  4205:10939). Full flow:
    1. Empty → 360px dashed dropzone: 56px upload glyph, "Drop your file here or
       Browse", ".xlsx only with max size 10mb", "Generate one first" shortcut.
    2. File chosen → "File uploaded" label + a green .xlsx file row (name + size +
       remove) and a Cancel / Process upload footer.
    3. Process upload → the job is handed to the header activity monitor
       (useActivityMonitor) which shows it progressing; the dropzone resets.
  Built with Pixel 3 (DT 2.4). Errors are inline, never a toast.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpText,
  MpButton,
  MpIcon,
  MpTextlink,
  MpFormControl,
  MpFormErrorMessage,
  toast,
  css,
} from '@mekari/pixel3'

const emit = defineEmits<{ (e: 'go-generate'): void }>()

const { addImport } = useActivityMonitor()

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
function onProcess() {
  if (!hasFile.value) return
  addImport(fileName.value)
  toast.notify({
    id: 'competency-results-uploaded',
    position: 'top-center',
    variant: 'success',
    title: 'Competency results uploaded',
    description: 'Your file is being processed — track it from the activity monitor in the header.',
  })
  clearFile()
}

// ─── Styles (DT 2.4) — mapped from the Figma tokens ──────────────────────────
const wrap = css({ display: 'flex', flexDirection: 'column' })
// Dropzone: fixed 360px, dashed border.default (#D0D6DD), radius md (6px).
const dropzoneBase = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  height: '360px', width: '100%', borderRadius: 'md', textAlign: 'center', cursor: 'pointer',
  border: '1px dashed', borderColor: 'border.default', background: 'white',
  transition: 'border-color 0.12s ease, background 0.12s ease',
} as const
const dropzone = css(dropzoneBase)
const dropzoneDragging = css({ ...dropzoneBase, borderColor: 'border.brand', background: 'background.brand.subtle' })
const dropzoneInvalid = css({ ...dropzoneBase, borderColor: 'border.danger' })
const blankSlate = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6', paddingBottom: '6', paddingInline: '4' })
const uploadIcon = css({ display: 'flex', color: 'icon.brand', '& svg': { width: '56px', height: '56px' } })
const copyWrap = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3', whiteSpace: 'nowrap' })
const dropRow = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1', paddingBottom: '3', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const dropTitle = css({ fontSize: '16px', lineHeight: '24px', color: 'text.default' })
const dropHint = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const generateLine = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const hiddenInput = css({ display: 'none' })
// File-selected state (Figma frame 2): a label + a green .xlsx row.
const fileUploadedLabel = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', marginBottom: '3' })
const fileRow = css({ display: 'flex', alignItems: 'center', gap: '3' })
const fileIconGreen = css({ display: 'inline-flex', flexShrink: '0', '& svg': { color: 'var(--mp-icon-success, #1C8459)' } })
const fileMeta = css({ display: 'flex', flexDirection: 'column', gap: '0', minWidth: '0' })
const fileNameText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', overflowWrap: 'anywhere' })
const fileSizeText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const removeBtn = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  width: '24px', height: '24px', borderRadius: 'full', border: 'none', background: 'transparent',
  color: 'text.secondary', cursor: 'pointer', _hover: { background: 'background.neutral.subtle' },
})
const footer = css({ display: 'flex', justifyContent: 'flex-end', gap: '2', marginTop: '6' })
</script>

<template>
  <div :class="wrap">
    <MpFormControl id="upload-results-file" :is-invalid="!!fileInvalidReason">
      <!-- File chosen → "File uploaded" + green .xlsx row -->
      <div v-if="hasFile">
        <div :class="fileUploadedLabel">File uploaded</div>
        <div :class="fileRow">
          <span :class="fileIconGreen"><MpIcon name="excel-document" /></span>
          <div :class="fileMeta">
            <span :class="fileNameText">{{ fileName }}</span>
            <span :class="fileSizeText">{{ fileSizeLabel }}</span>
          </div>
          <button type="button" :class="removeBtn" aria-label="Remove file" @click="clearFile">
            <MpIcon name="close" size="sm" />
          </button>
        </div>
      </div>

      <!-- Empty → the Figma dropzone -->
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
          <div :class="copyWrap">
            <div :class="dropRow">
              <MpText :class="dropTitle">
                Drop your file here or <MpTextlink as="button" @click.stop="browse">Browse</MpTextlink>
              </MpText>
              <span :class="dropHint">.xlsx only with max size {{ MAX_MB }}mb</span>
            </div>
            <MpText :class="generateLine">
              Don't have a template yet? <MpTextlink as="button" @click.stop="emit('go-generate')">Generate one first</MpTextlink>
            </MpText>
          </div>
        </div>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx" :class="hiddenInput" @change="onInputChange">
      <MpFormErrorMessage>{{ fileInvalidReason }}</MpFormErrorMessage>
    </MpFormControl>

    <!-- Footer — only once a file is selected (prod parity) -->
    <div v-if="hasFile" :class="footer">
      <MpButton variant="ghost" @click="clearFile">Cancel</MpButton>
      <MpButton variant="primary" @click="onProcess">Process upload</MpButton>
    </div>
  </div>
</template>
