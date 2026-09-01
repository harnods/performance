# File upload (dropzone)

A hand-rolled dropzone for a single-file upload (spreadsheet import flows) — not
`MpUpload`/`MpDropzone`. See `components/CompetencyUploadResults.vue` (import
competency assessment results).

## Two states

**Empty** — a fixed-height dashed dropzone, click-or-drag to pick a file:

```vue
<MpFormControl id="upload-results-file" :is-invalid="!!fileInvalidReason">
  <div
    :class="fileInvalidReason ? dropzoneInvalid : isDragging ? dropzoneDragging : dropzone"
    role="button" tabindex="0"
    @click="browse"
    @keydown.enter.prevent="browse"
    @keydown.space.prevent="browse"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <div :class="blankSlate">
      <span :class="uploadIcon"><MpIcon name="upload" /></span>
      <MpText>Drop your file here or <MpTextlink as="button" @click.stop="browse">Browse</MpTextlink></MpText>
      <span :class="dropHint">.xlsx only with max size {{ MAX_MB }}mb</span>
    </div>
  </div>
  <input ref="fileInput" type="file" accept=".xlsx" :class="hiddenInput" @change="onInputChange">
  <MpFormErrorMessage>{{ fileInvalidReason }}</MpFormErrorMessage>
</MpFormControl>
```

```ts
const dropzoneBase = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  height: '360px', width: '100%', borderRadius: 'md', textAlign: 'center', cursor: 'pointer',
  border: '1px dashed', borderColor: 'border.default', background: 'white',
  transition: 'border-color 0.12s ease, background 0.12s ease',
} as const
const dropzone = css(dropzoneBase)
const dropzoneDragging = css({ ...dropzoneBase, borderColor: 'border.brand', background: 'background.brand.subtle' })
const dropzoneInvalid = css({ ...dropzoneBase, borderColor: 'border.danger' })
```

- Height is a fixed `360px`, full width — not content-sized.
- Three visual states via one CSS var toggle: default / `isDragging` (brand border +
  subtle brand background) / invalid (danger border, driven by the same
  `MpFormControl :is-invalid`).
- The real `<input type="file">` stays in the DOM (`hiddenInput` = `display: none`),
  not removed — click **and** keyboard (`Enter`/`Space`) both call the same `browse()`
  that clicks it. `role="button" tabindex="0"` on the dropzone div makes it
  keyboard-reachable.
- Validation (file type, `MAX_MB` size) happens in one `acceptFile()` used by both the
  file-input `change` and the `drop` handler — never trust the browser to pre-filter by
  `accept=".xlsx"` alone. Show the reason via `MpFormErrorMessage`, not a toast.
- Secondary affordance below the drop copy for "you don't have the file yet" — a plain
  `MpTextlink as="button"` sentence, not a separate button.

**File selected** — replaces the dropzone entirely (not shown alongside it): a
"File uploaded" label + a single-row file summary + a footer.

```vue
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
<div v-if="hasFile" :class="footer">
  <MpButton variant="ghost" @click="clearFile">Cancel</MpButton>
  <MpButton variant="primary" @click="onProcess">Process upload</MpButton>
</div>
```

- File-type icon tinted `icon.success` green (`var(--mp-icon-success, #1C8459)`) — same
  hardcoded-token-with-fallback pattern used for the warning-triangle icon elsewhere
  (see [`icons.md`](icons.md)) because the semantic token isn't reliably emitted by this
  app's Panda build.
- Remove is a round 24px icon button (`borderRadius: 'full'`), not a text link.
- Footer (Cancel / Process upload) only renders once a file is picked — an empty
  dropzone has no footer at all.

## After "Process upload"

Don't block on the upload with a spinner/modal — hand it off to a background job and
reset the dropzone immediately, confirmed with a toast pointing at where to track it:

```ts
function onProcess() {
  if (!hasFile.value) return
  addImport(fileName.value) // useActivityMonitor — see AppHeader.vue's activity monitor
  toast.notify({
    id: 'competency-results-uploaded',
    position: 'top-center',
    variant: 'success',
    title: 'Competency results uploaded',
    description: 'Your file is being processed — track it from the activity monitor in the header.',
  })
  clearFile()
}
```

## Rules

- One file at a time — no multi-file queue.
- Validate type + size client-side before accepting; inline error via
  `MpFormControl :is-invalid` + `MpFormErrorMessage`, never a toast for validation
  failures.
- Toasts are reserved for the *successful* hand-off after Process upload, not for
  per-file errors.
