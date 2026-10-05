<!--
  Stepped import page (1 Download template · 2 Fill in · 3 Upload). Prototype only:
  template download and upload are MOCKED (toasts, no network). A file whose name
  contains "error" shows the row-error banner. See docs/patterns/upload.md.
  Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpFlex, MpText, MpButton, MpIcon, MpDivider, MpTextlink, MpBanner, MpBannerDescription,
  MpFormControl, MpFormErrorMessage, toast, css,
} from '@mekari/pixel3'

defineOptions({ name: 'StepImportPage' })

const props = withDefaults(defineProps<{
  /** Sentence above the steps, e.g. "…start importing IDPs to Talenta Performance." */
  intro: string
  templateName: string
  redirectUrl: string
  /** Bullets for step 2. */
  tips?: string[]
  maxMb?: number
  submitText?: string
}>(), {
  tips: () => [],
  maxMb: 10,
  submitText: 'Import',
})

const router = useRouter()
// Dev tools can force an error state on the dropzone (docs/patterns/dev-scenario-control.md).
const { importError } = useIdpImportFlag()

function downloadTemplate() {
  toast.notify({ id: 'import-template', position: 'top-center', variant: 'success', title: `${props.templateName} downloaded`, description: 'Prototype only. No file is generated.' })
}

// ─── File picker (docs/patterns/upload.md dropzone) ─────────────────────────
const fileName = ref('')
const fileSizeLabel = ref('')
const pickedInvalidReason = ref('')
const forcedReason = computed(() => importError.value === 'too-large'
  ? `File size is over ${props.maxMb} MB. Please upload a smaller file`
  : importError.value === 'wrong-format' ? 'File must be in .xlsx format. Please upload a different file' : '')
const fileInvalidReason = computed({
  get: () => forcedReason.value || pickedInvalidReason.value,
  set: (v: string) => { pickedInvalidReason.value = v },
})
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const hasFile = computed(() => !!fileName.value)
const errorRows = ref<string[]>([])
const MOCK_ERROR_ROWS = ['Row 4: Employee ID is required.', 'Row 7: Employee ID "EMP-999" was not found.']

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
function browse() { fileInput.value?.click() }
function acceptFile(file: File | undefined) {
  if (!file) return
  fileInvalidReason.value = ''
  errorRows.value = []
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    fileInvalidReason.value = 'File must be in .xlsx format. Please upload a different file'
    fileName.value = ''
    return
  }
  if (file.size > props.maxMb * 1024 * 1024) {
    fileInvalidReason.value = `File size is over ${props.maxMb} MB. Please upload a smaller file`
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
function submit() {
  errorRows.value = []
  if (!hasFile.value) { fileInvalidReason.value = 'You must upload spreadsheet'; return }
  if (fileName.value.toLowerCase().includes('error')) {
    toast.notify({ id: 'import-error', position: 'top-center', variant: 'error', title: 'Error to upload template' })
    errorRows.value = MOCK_ERROR_ROWS
    clearFile()
    return
  }
  toast.notify({ id: 'import-success', position: 'top-center', variant: 'success', title: 'File uploaded', description: 'Your file is being processed.' })
  router.push(props.redirectUrl)
}
function cancel() { router.push(props.redirectUrl) }

// ─── Styles (DT 2.4) ────────────────────────────────────────────────────────
const badge = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  width: '32px', height: '32px', borderRadius: 'full', fontSize: '14px', fontWeight: '500',
  background: 'blue.50', color: 'var(--mp-colors-border-brand)',
})
// Body aligns with the title: badge 32px + gap 16px.
const stepBody = css({ paddingLeft: '48px', minWidth: '0' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const bulletList = css({ listStyleType: 'disc', paddingLeft: '20px' })
const dropzoneBase = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  height: '240px', width: '100%', borderRadius: 'md', textAlign: 'center', cursor: 'pointer',
  border: '1px dashed', borderColor: 'border.default', background: 'white',
  transition: 'border-color 0.12s ease, background 0.12s ease',
} as const
const dropzone = css(dropzoneBase)
const dropzoneDragging = css({ ...dropzoneBase, borderColor: 'border.brand', background: 'background.brand.subtle' })
const dropzoneInvalid = css({ ...dropzoneBase, borderColor: 'border.danger' })
const uploadIcon = css({ display: 'flex', color: 'icon.brand', '& svg': { width: '48px', height: '48px' } })
const hiddenInput = css({ display: 'none' })
const fileRow = css({ padding: '16px', borderRadius: 'md', border: '1px solid', borderColor: 'border.default' })
</script>

<template>
  <MpFlex direction="column" gap="6" maxWidth="720px">
    <MpText size="label" color="text.default">{{ intro }}</MpText>

    <!-- 1 · Download -->
    <MpFlex direction="column" gap="1">
      <MpFlex align="center" gap="4">
        <span :class="badge">1</span>
        <MpText :class="h3Class">Download the data template</MpText>
      </MpFlex>
      <MpFlex direction="column" gap="2" :class="stepBody">
        <MpText size="label" color="text.secondary">To upload data accurately, use only the provided template customized for this system.</MpText>
        <MpFlex><MpButton variant="secondary" @click="downloadTemplate">Download template</MpButton></MpFlex>
      </MpFlex>
    </MpFlex>

    <MpDivider />

    <!-- 2 · Fill in -->
    <MpFlex direction="column" gap="1">
      <MpFlex align="center" gap="4">
        <span :class="badge">2</span>
        <MpText :class="h3Class">Fill in the data in the template file</MpText>
      </MpFlex>
      <MpFlex direction="column" gap="2" :class="stepBody">
        <MpFlex as="ul" direction="column" gap="1" :class="bulletList">
          <MpText v-for="(tip, idx) in tips" :key="`tip_${idx}`" as="li" size="label" color="text.secondary">{{ tip }}</MpText>
        </MpFlex>
      </MpFlex>
    </MpFlex>

    <MpDivider />

    <!-- 3 · Upload -->
    <MpFlex direction="column" gap="1">
      <MpFlex align="center" gap="4">
        <span :class="badge">3</span>
        <MpText :class="h3Class">Upload spreadsheet</MpText>
      </MpFlex>
      <MpFlex direction="column" gap="4" :class="stepBody">

        <MpBanner v-if="errorRows.length" variant="error" :is-closable="false">
          <MpBannerDescription>
            <MpFlex as="ul" direction="column" :class="bulletList"><MpText v-for="row in errorRows" :key="row" as="li" size="label">{{ row }}</MpText></MpFlex>
          </MpBannerDescription>
        </MpBanner>

        <MpFormControl id="step-import-file" :is-invalid="!!fileInvalidReason">
          <MpFlex v-if="hasFile" align="center" gap="3" :class="fileRow">
            <MpIcon name="excel-document" />
            <MpFlex direction="column" flex="1" minWidth="0">
              <MpText size="label" color="text.default">{{ fileName }}</MpText>
              <MpText size="caption" color="text.secondary">{{ fileSizeLabel }}</MpText>
            </MpFlex>
            <MpButton variant="ghost" left-icon="close" aria-label="Remove file" @click="clearFile" />
          </MpFlex>
          <MpFlex
            v-else
            :class="fileInvalidReason ? dropzoneInvalid : isDragging ? dropzoneDragging : dropzone"
            role="button" tabindex="0"
            @click="browse"
            @keydown.enter.prevent="browse"
            @keydown.space.prevent="browse"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <MpFlex direction="column" align="center" gap="4" paddingX="4">
              <span :class="uploadIcon"><MpIcon name="upload" /></span>
              <MpText size="label" color="text.default">Drop your file here or <MpTextlink as="button" @click.stop="browse">Browse</MpTextlink></MpText>
              <MpText size="label" color="text.secondary">.xlsx only with max size {{ maxMb }}mb</MpText>
            </MpFlex>
          </MpFlex>
          <input ref="fileInput" type="file" accept=".xlsx" :class="hiddenInput" @change="onInputChange">
          <MpFormErrorMessage>{{ fileInvalidReason }}</MpFormErrorMessage>
        </MpFormControl>

        <MpFlex justify="flex-end" gap="2">
          <MpButton variant="ghost" @click="cancel">Cancel</MpButton>
          <MpButton variant="primary" @click="submit">{{ submitText }}</MpButton>
        </MpFlex>
      </MpFlex>
    </MpFlex>
  </MpFlex>
</template>
