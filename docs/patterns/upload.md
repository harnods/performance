# File upload

Two shapes coexist, picked by what's being uploaded — don't mix them.

| | **Dropzone** | **Multi-file inline chooser** |
|---|---|---|
| Use for | a single spreadsheet import | any number of loose attachments on a record (an action plan, a form) |
| Trigger | full dashed drop target, drag-or-click | `MpUpload`'s "Choose file" button |
| File count | one; picking a new file replaces it | any number; each add appends |
| Reference | `components/CompetencyUploadResults.vue` | `components/IdpActionPlanModal.vue` |

## Dropzone (single spreadsheet import)

A hand-rolled dropzone for a single-file upload — not `MpUpload`/`MpDropzone`. See
`components/CompetencyUploadResults.vue` (import competency assessment results).

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

## Multi-file inline chooser (attachments on a record)

When a field just collects loose attachments on a record — not a single import
file that gets "processed" — the dropzone is the wrong shape: there's no batch to
process, no full-width drop target earns its space in a compact form, and files
need to keep accumulating rather than replacing each other. Use `MpUpload` as the
trigger + a running list below it.

```vue
<!-- IdpActionPlanModal.vue -->
<MpFormControl id="ap-attachment" :is-invalid="!!attachmentError">
  <MpFormLabel>Attachment</MpFormLabel>
  <MpUpload :is-multiple="true" is-full-width :accept="ACCEPT" @change="onPickFiles" />
  <MpText :class="helperText">Maximum file size is {{ MAX_FILE_MB }}MB</MpText>
  <MpFlex v-if="attachments.length" direction="column" gap="0" :class="css({ marginTop: '2' })">
    <div v-for="(file, i) in attachments" :key="`${file}-${i}`" :class="fileRow">
      <MpIcon name="attachment" size="sm" />
      <span :class="fileName" :title="file">{{ file }}</span>
      <MpButton variant="ghost" size="sm" left-icon="close" :aria-label="`Remove ${file}`" @click="removeAttachment(i)" />
    </div>
  </MpFlex>
  <MpFormErrorMessage>{{ attachmentError }}</MpFormErrorMessage>
</MpFormControl>
```

```ts
const ACCEPT = ACCEPTED_EXTENSIONS.map(ext => `.${ext}`).join(',')
// marginTop on the caption, not gap on a wrapper — it's a bare MpText sibling
// of `MpUpload`, not a flex container.
const helperText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', marginTop: '1' })   // 4px below the trigger
const fileRow = css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: '14px', paddingBlock: '1' })
const fileName = css({ flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.default' })
```

- **`MpUpload`** (not a hand-rolled hidden-input trigger) drives the "Choose file"
  button; `:is-multiple="true"` lets it keep accepting more files, `is-full-width`
  matches the rest of the form's field width, and `:accept` mirrors the same
  extension allowlist used for validation.
- `@change` on `MpUpload` hands back either a native `FileList` (via
  `event.target.files`) or a plain `File[]` depending on how it fires — normalize
  both in the handler (see `onPickFiles`) rather than assuming one shape.
- **Type + size validation happens in one handler** (`onPickFiles`), same as the
  single-file case — never trust `accept=` alone. Reject unsupported types and
  oversized files individually (one file failing doesn't block the rest of the
  batch) and surface the reason via `MpFormErrorMessage`, not a toast.
- **`MpFormLabel` requires the field to sit inside `MpFormControl`**, even though
  attachment has no required-field validation of its own — see
  [`form.md`](form.md)'s warning that `MpFormLabel` throws (and silently empties
  the whole modal) outside one.
- Each picked file becomes a plain **name row** with its own ghost remove button
  — no thumbnail, no progress bar, no upload state (there's no real backend in
  this prototype; production's own equivalent field behaves the same way from
  the user's side, just backed by a real upload call).
- `:is-invalid` on the `MpFormControl` drives the dashed/red state the same way
  every other field does — attachments aren't a special case for error display.

## Rules

- **Dropzone**: one file at a time — no multi-file queue. **Chooser**: any number
  of files, each add appends.
- Validate type + size client-side before accepting; inline error via
  `MpFormControl :is-invalid` + `MpFormErrorMessage`, never a toast for validation
  failures.
- Toasts are reserved for the *successful* hand-off after Process upload (dropzone
  only), not for per-file errors on either shape.
