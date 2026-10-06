<!--
  Two-step import page: 1 Select employees (SelectEmployeesDrawer) · 2 Upload data
  (download template, fill in, upload). Prototype only: template download and upload
  are MOCKED (toasts, no network). A file whose name contains "error" shows the
  row-error banner. See docs/patterns/upload.md.
  Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpFlex, MpText, MpButton, MpButtonGroup, MpIcon, MpDivider, MpTextlink, MpBanner, MpBannerDescription,
  MpFormControl, MpFormErrorMessage, MpInput, MpInputGroup, MpInputLeftAddon,
  MpTooltip, MpSpinner, toast, css,
} from '@mekari/pixel3'
import { EMPLOYEES, employeeMeta } from '~/utils/employees'

defineOptions({ name: 'StepImportPage' })

const props = withDefaults(defineProps<{
  /** Sentence above the numbered instructions on step 2. */
  intro?: string
  templateName: string
  redirectUrl: string
  maxMb?: number
  submitText?: string
}>(), {
  intro: 'Follow these steps to import IDPs.',
  maxMb: 5,
  submitText: 'Import',
})

const router = useRouter()

// ─── Wizard ─────────────────────────────────────────────────────────────────
const step = ref<1 | 2>(1)
const STEPS = ['Select employees', 'Upload file']

// Step 1: employees come from the shared SelectEmployeesDrawer.
const drawerOpen = ref(false)
const selectedIds = ref<string[]>([])
const selectedEmployees = computed(() =>
  selectedIds.value.map(id => EMPLOYEES.find(e => e.id === id)).filter((e): e is typeof EMPLOYEES[number] => Boolean(e)))
const nextAttempted = ref(false)
const selectionError = computed(() => (nextAttempted.value && !selectedIds.value.length ? 'You must select at least one employee' : ''))
// The empty-selection error only appears when Continue is clicked; any change to the selection clears it.
watch(selectedIds, () => { nextAttempted.value = false })
function onEmployeesContinue(ids: string[]) { selectedIds.value = ids }
function removeEmployee(id: string) { selectedIds.value = selectedIds.value.filter(x => x !== id) }
// Big selections take a moment to prepare the template (mocked): show a 3-second loader first.
const GENERATE_THRESHOLD = 25
const GENERATE_MS = 3000
const isGenerating = ref(false)
// The dev tools' "Loading state" scenario keeps step 2 on the loader.
const showLoader = computed(() => isGenerating.value || (step.value === 2 && importScenario.value === 'loading'))
const fileTypeHint = computed(() => `File must be in XLSX format with a maximum of ${props.maxMb} MB`)
function goNext() {
  nextAttempted.value = true
  if (!selectedIds.value.length) return
  if (selectedIds.value.length <= GENERATE_THRESHOLD) { step.value = 2; return }
  isGenerating.value = true
  setTimeout(() => { isGenerating.value = false; step.value = 2 }, GENERATE_MS)
}

// Progressive "Load more" (docs/patterns/pagination.md): append-only, 10 at a time.
const PAGE = 10
const visibleCount = ref(PAGE)
// Search appears once there are more than 10 picks; it matches name or employee ID.
const showSearch = computed(() => selectedEmployees.value.length > PAGE)
const search = ref('')
watch(search, () => { visibleCount.value = PAGE })
watch(showSearch, (on) => { if (!on) search.value = '' })
const filteredEmployees = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? selectedEmployees.value.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)) : selectedEmployees.value
})
const visibleEmployees = computed(() => filteredEmployees.value.slice(0, visibleCount.value))
const remaining = computed(() => Math.max(0, filteredEmployees.value.length - visibleCount.value))
function loadMore() { visibleCount.value += PAGE }
// Dev tools can force an error state on the dropzone (docs/patterns/dev-scenario-control.md).
const { importError, importScenario, importStep } = useIdpImportFlag()
watch(step, (n) => { importStep.value = n }, { immediate: true })
onBeforeUnmount(() => { importStep.value = 1 })

function downloadTemplate() {
  toast.notify({ id: 'import-template', position: 'top-center', variant: 'success', title: `${props.templateName} downloaded`, description: 'Prototype only. No file is generated.' })
}

// ─── File picker (docs/patterns/upload.md dropzone) ─────────────────────────
const fileName = ref('')
const fileSizeLabel = ref('')
const pickedInvalidReason = ref('')
const forcedReason = computed(() => importError.value === 'too-large'
  ? `File size is over ${props.maxMb} MB. Please upload a smaller file`
  : importError.value === 'wrong-format' ? 'File must be in XLSX format. Please upload a different file' : '')
const fileInvalidReason = computed({
  get: () => forcedReason.value || pickedInvalidReason.value,
  set: (v: string) => { pickedInvalidReason.value = v },
})
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
function browse() { fileInput.value?.click() }
const hasFile = computed(() => !!fileName.value)
const errorRows = ref<string[]>([])
const MOCK_ERROR_ROWS = ['Row 4: Employee ID is required', 'Row 7: Employee ID "EMP-999" was not found']

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
function acceptFile(file: File | undefined) {
  if (!file) return
  fileInvalidReason.value = ''
  errorRows.value = []
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    fileInvalidReason.value = 'File must be in XLSX format. Please upload a different file'
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
  if (!hasFile.value) { fileInvalidReason.value = 'You must upload a file'; return }
  if (fileName.value.toLowerCase().includes('error')) {
    toast.notify({ id: 'import-error', position: 'top-center', variant: 'error', title: 'IDP import failed', description: 'Fix the rows listed below and upload the file again.' })
    errorRows.value = MOCK_ERROR_ROWS
    clearFile()
    return
  }
  toast.notify({ id: 'import-success', position: 'top-center', variant: 'success', title: 'File uploaded', description: 'Your IDPs are being imported.' })
  router.push(props.redirectUrl)
}
// Back keeps the picked employees; the file and its errors are cleared.
function goBack() { clearFile(); errorRows.value = []; step.value = 1 }
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
const fileRow = css({ padding: '16px', borderRadius: 'md', border: '1px solid', borderColor: 'border.default' })

// Layout guide: only the employee list (step 1) sits in 6 of the 12 columns on desktop (full width below lg); the stepper, both footers and step 2 keep a 720px column.
const grid = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
// Literal 20px: the spacing token `5` is 20.8px.
const sectionGap = css({ gap: '20px' })
const sixCol = css({ gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' }, minWidth: '0' })
const narrow = css({ width: '100%', maxWidth: '720px' })

// Dropzone: copied from components/CompetencyUploadResults.vue (same icon and spacing, minus its divider line); 240px tall here instead of 360px.
const dropzoneBase = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  height: '240px', width: '100%', borderRadius: 'md', textAlign: 'center', cursor: 'pointer',
  border: '1px dashed', borderColor: 'border.default', background: 'white',
  transition: 'border-color 0.12s ease, background 0.12s ease',
} as const
const dropzone = css(dropzoneBase)
const dropzoneDragging = css({ ...dropzoneBase, borderColor: 'border.brand', background: 'background.brand.subtle' })
const dropzoneInvalid = css({ ...dropzoneBase, borderColor: 'border.danger' })
const blankSlate = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6', paddingBottom: '6', paddingInline: '4' })
const uploadIcon = css({ display: 'flex', color: 'icon.brand', '& svg': { width: '56px', height: '56px' } })
const dropRow = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1' })
const dropTitle = css({ fontSize: '16px', lineHeight: '24px', color: 'text.default' })
const dropHint = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const hiddenInput = css({ display: 'none' })

// Stepper (hand-rolled: Pixel has no stepper). 32px circles joined by a 2px brand line.
const BRAND = 'var(--mp-colors-border-brand)'
const stepCircleBase = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  width: '32px', height: '32px', borderRadius: 'full', fontSize: '14px', fontWeight: '500', borderWidth: '2px', borderStyle: 'solid',
} as const
const stepCircleCurrent = css({ ...stepCircleBase, borderColor: BRAND, color: BRAND, background: 'white' })
const stepCircleDone = css({ ...stepCircleBase, borderColor: BRAND, background: BRAND })
const stepCircleTodo = css({ ...stepCircleBase, borderColor: 'border.default', color: 'text.secondary', background: 'white' })
const stepLabelActive = css({ fontSize: '14px', lineHeight: '20px', fontWeight: '600', color: BRAND })
const stepLabelDone = css({ fontSize: '14px', lineHeight: '20px', color: BRAND })
const stepLabelTodo = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const stepper = css({ display: 'flex', alignItems: 'center', gap: '2', height: '32px', marginBottom: '8' })
// The label is out of flow so a long label never widens the circle's column (that is what pushed the line away).
const stepItem = css({ position: 'relative', display: 'flex', width: '32px', flexShrink: '0' })
const stepLabel = css({ position: 'absolute', top: '40px', left: '0', whiteSpace: 'nowrap' })
const stepLabelEnd = css({ left: 'auto', right: '0' })
const stepLine = css({ flex: '1', height: '2px', background: BRAND })

// Selected-employee list
const listRow = css({
  display: 'flex', alignItems: 'center', gap: '3', paddingBlock: '3', paddingInline: '2',
  borderBottom: '1px solid', borderBottomColor: 'border.default',
})
const nameText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const metaText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// 20px below the caption: 16px margin + the 4px flex gap above it.
const searchBox = css({ marginTop: '4', width: '360px', maxWidth: '100%' })
const listRowFirst = css({ paddingTop: '0' })
const noResult = css({ paddingBlock: '8', textAlign: 'center' })
const noResultTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const loadMoreBar = css({ paddingInline: '2', paddingBlock: '3' })
const captionText = css({ color: 'text.secondary' })
const loadingWrap = css({ minHeight: '240px' })
const errorText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.danger' })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <!-- Stepper: circles on one row joined by a line at their centre; labels hang under each circle -->
    <div :class="[stepper, narrow]" role="list" aria-label="Import progress">
      <div :class="stepItem" role="listitem" :aria-current="step === 1 ? 'step' : undefined">
        <span :class="step === 1 ? stepCircleCurrent : stepCircleDone">
          <MpIcon v-if="step > 1" name="check" size="sm" color="icon.inverse" />
          <template v-else>1</template>
        </span>
        <span :class="[stepLabel, step === 1 ? stepLabelActive : stepLabelDone]">{{ STEPS[0] }}</span>
      </div>
      <span :class="stepLine" aria-hidden="true" />
      <div :class="stepItem" role="listitem" :aria-current="step === 2 ? 'step' : undefined">
        <span :class="step === 2 ? stepCircleCurrent : stepCircleTodo">2</span>
        <span :class="[stepLabel, stepLabelEnd, step === 2 ? stepLabelActive : stepLabelTodo]">{{ STEPS[1] }}</span>
      </div>
    </div>

    <!-- Generating the template (more than 25 employees) -->
    <MpFlex v-if="showLoader" direction="column" align="center" justify="center" gap="4" role="status" aria-live="polite" :class="loadingWrap">
      <MpSpinner size="md" />
      <MpText size="label" color="text.secondary">Generating template...</MpText>
    </MpFlex>

    <!-- Step 1 · Select employees -->
    <template v-else-if="step === 1">
      <div :class="grid">
        <MpFlex direction="column" :class="[sixCol, sectionGap]">
        <MpFlex direction="column" gap="1">
          <MpText :class="h3Class">Employees</MpText>
          <MpText size="label" color="text.secondary">Select the employees you want to import IDPs for</MpText>
          <MpInputGroup v-if="showSearch" :class="searchBox">
            <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search employee name or employee ID" aria-label="Search employee name or employee ID" />
          </MpInputGroup>
        </MpFlex>

        <MpFlex direction="column" gap="4">
          <div v-if="selectedEmployees.length">
            <MpFlex v-if="!filteredEmployees.length" direction="column" align="center" gap="1" :class="noResult">
              <span :class="noResultTitle">No employees found</span>
              <MpText size="label" color="text.secondary">Recheck the keywords you have typed and try searching again.</MpText>
            </MpFlex>
            <div v-for="(e, i) in visibleEmployees" :key="e.id" :class="[listRow, i === 0 && listRowFirst]">
              <PxAvatar :id="`import-${e.id}`" :name="e.name" :src="e.photo" size="lg" variant-color="gray" />
              <MpFlex direction="column" flex="1" minWidth="0">
                <span :class="nameText">{{ e.name }}</span>
                <span :class="metaText">{{ employeeMeta(e) }}</span>
              </MpFlex>
              <MpTooltip label="Remove" use-portal>
                <MpButton variant="ghost" left-icon="minus-circular" :aria-label="`Remove ${e.name}`" @click="removeEmployee(e.id)" />
              </MpTooltip>
            </div>
            <MpFlex v-if="filteredEmployees.length" align="center" gap="1" :class="loadMoreBar">
              <MpText size="label" :class="captionText">Showing {{ visibleEmployees.length }} of {{ filteredEmployees.length }} employees.</MpText>
              <MpTextlink v-if="remaining > 0" as="button" size="label" @click="loadMore">Load more</MpTextlink>
            </MpFlex>
          </div>

          <MpFlex direction="column" gap="1" align="flex-start">
            <MpButton variant="secondary" left-icon="add" @click="drawerOpen = true">{{ selectedEmployees.length ? 'Add employees' : 'Select employees' }}</MpButton>
            <span v-if="selectionError" :class="errorText">{{ selectionError }}</span>
          </MpFlex>
        </MpFlex>
        </MpFlex>
      </div>

      <MpFlex justify="flex-end" :class="narrow">
        <MpButtonGroup>
          <MpButton variant="ghost" @click="cancel">Cancel</MpButton>
          <MpButton variant="primary" @click="goNext">Continue</MpButton>
        </MpButtonGroup>
      </MpFlex>

      <SelectEmployeesDrawer
        v-model:is-open="drawerOpen"
        drawer-id="drawer-import-employees"
        title="Select employees"
        description="Select the employees you want to import IDPs for."
        :initial-selected="selectedIds"
        @continue="onEmployeesContinue"
      />
    </template>

    <!-- Step 2 · Upload data -->
    <template v-else>
      <MpFlex direction="column" gap="6" :class="narrow">
        <MpText size="label" color="text.default">{{ intro }}</MpText>

        <!-- 1 · Download -->
        <MpFlex direction="column" gap="1">
          <MpFlex align="center" gap="4">
            <span :class="badge">1</span>
            <MpText :class="h3Class">Download the IDP template</MpText>
          </MpFlex>
          <MpFlex direction="column" gap="2" :class="stepBody">
            <MpText size="label" color="text.secondary">Use this template so your IDP data is in the right format.</MpText>
            <MpFlex><MpButton variant="secondary" @click="downloadTemplate">Download template</MpButton></MpFlex>
          </MpFlex>
        </MpFlex>

        <MpDivider />

        <!-- 2 · Fill in -->
        <MpFlex direction="column" gap="1">
          <MpFlex align="center" gap="4">
            <span :class="badge">2</span>
            <MpText :class="h3Class">Fill in the template</MpText>
          </MpFlex>
          <MpFlex direction="column" gap="2" :class="stepBody">
            <MpFlex as="ul" direction="column" gap="1" :class="bulletList">
              <MpText as="li" size="label" color="text.secondary">Follow the column guidelines in the template.</MpText>
              <MpText as="li" size="label" color="text.secondary">Fill in all required fields.</MpText>
              <MpText as="li" size="label" color="text.secondary">Each row is one action plan. Rows with the same employee ID are grouped into one IDP.</MpText>
            </MpFlex>
          </MpFlex>
        </MpFlex>

        <MpDivider />

        <!-- 3 · Upload -->
        <MpFlex direction="column" gap="1">
          <MpFlex align="center" gap="4">
            <span :class="badge">3</span>
            <MpText :class="h3Class">Upload the file</MpText>
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
                  <div :class="dropRow">
                    <MpText :class="dropTitle">Drop your file here or <MpTextlink as="button" @click.stop="browse">Browse</MpTextlink></MpText>
                    <span :class="dropHint">{{ fileTypeHint }}</span>
                  </div>
                </div>
              </div>
              <input ref="fileInput" type="file" accept=".xlsx" :class="hiddenInput" @change="onInputChange">
              <MpFormErrorMessage>{{ fileInvalidReason }}</MpFormErrorMessage>
            </MpFormControl>
          </MpFlex>
        </MpFlex>
        <MpFlex justify="flex-end">
          <MpButtonGroup>
            <MpButton variant="ghost" @click="cancel">Cancel</MpButton>
            <MpButton variant="secondary" @click="goBack">Back</MpButton>
            <MpButton variant="primary" @click="submit">{{ submitText }}</MpButton>
          </MpButtonGroup>
        </MpFlex>
      </MpFlex>
    </template>
  </MpFlex>
</template>
