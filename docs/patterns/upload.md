# File upload

Two shapes coexist, picked by what's being uploaded — don't mix them.

| | **Dropzone** | **Multi-file inline chooser** |
|---|---|---|
| Use for | a single spreadsheet import | any number of loose attachments on a record (an action plan, a form) |
| Trigger | full dashed drop target, drag-or-click | `MpUpload`'s "Choose file" button |
| File count | one; picking a new file replaces it | any number; each add appends |
| Reference | `components/CompetencyUploadResults.vue`, `components/UploadPage.vue` | `components/IdpActionPlanModal.vue` |

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


## Upload page with a template download (`components/UploadPage.vue`)

A full page for "download our template → fill it → upload it back", migrated from
talenta-review's `UploadPage`. Used by competency item **Upload .xlsx** and **Edit bulk item**
(`components/competency-item/Upload.vue`, one component on two routes).

Order, in a 552px column with 24px gaps:
1. **"Download the template"** (20/600 title) + a 14px `text.secondary` line.
2. **Template row**: a bordered `button` (1px `border.default`, radius md, 16px padding, white,
   hover `background.neutral.subtle`) with the `excel-document` icon, the template file name
   (16/600), and a trailing `download` icon.
3. **"Please note that:"** (16/600) + tips, each an `indicator-circle` icon (sm) + 14px
   `text.secondary` text.
4. **"Upload spreadsheet"** label + the **dropzone** above (240px tall here). Once a file is
   chosen it becomes a bordered file row with a ghost `close` button.
5. Error output: `MpBanner variant="danger"` for one message, or a "File errors" label + a
   banner listing row errors.
6. Footer: **Cancel** (ghost) + the submit (primary, label from `submitText`, e.g. "Save
   changes" for bulk edit), right-aligned. The submit is **never disabled**: with no file it shows
   "Please upload a spreadsheet first" on the dropzone.

The download, upload and processing are mocked in the prototype. A file whose name contains
"error" demos the row-error banner.

## Import page (IDP): two-step wizard

A list page's header gets a **secondary** `Import` (`left-icon="upload"`) button left of
the primary CTA. It opens a dedicated route (`/talents/idps/import`) rendering
`components/StepImportPage.vue`, a **two-step wizard**. Only step 1's **employee list section** (heading, search, list, add button) sits in **6 of the 12 layout columns** from `md` (768px) up (`span 6 / span 6` at `md`, **capped at `maxWidth: 656px`** like the form column in [`form.md`](form.md), so it stops growing on wide screens; full width below `md`; the 12-column grid uses `minmax(0, 1fr)` tracks so long content never pushes it wider than its container), like a form column. The stepper, both footers and all of step 2 keep a 720px max-width column:

**Stepper** (hand-rolled, Pixel has no stepper component or pattern): 32px circles joined by a 2px brand line that runs from circle to circle at their centre. Each label is absolutely positioned 8px under its circle (step 1 left-aligned, step 2 right-aligned to the edge) so a long label never widens the circle's column and pushes the line away. Current step: brand 2px ring, brand number,
semibold brand label. Done: filled brand circle with a white check, regular brand label.
Upcoming: `border.default` ring, `text.secondary` number and label. Brand colour is
`var(--mp-colors-border-brand)` (the semantic brand tokens aren't emitted here).

**Step 1 · Select employees.** H3 "Employees" + caption "Select the employees you want to import IDPs for". A secondary `+ Select employees` button ("Add employees" once there are picks) opens the shared
`SelectEmployeesDrawer` (the same two-column picker used for goals and cycle members) with the opt-in **`paginated`** prop: each list in the drawer (Employees, Selected employees) shows **10 rows**, then a "Showing 10 of 26 employees." caption + "Load 10 more" link (no trailing period) at the bottom of that list (last load: "Load 6 more"); search resets the count to 10. Other callers don't pass `paginated` and still list everyone.
Once picked, the people show as a list above the button: avatar, name, `code | title |
department`, and a ghost `minus-circular` remove button per row, 1px `border.default` between
rows. The list loads progressively (see [`pagination.md`](pagination.md) › Progressive "Load more"): 10 rows first, then the caption "Showing 10 of 26 employees." with a text link "Load 10 more" (no trailing period) that appends the next 10 (the last load names the remainder, e.g. "Load 6 more"). The caption **always shows** (even for 3 employees: "Showing 3 of 3 employees."); once everything is shown only the "Load N more" link goes away, there is nothing left to load. The first row has no top padding. **With more than 10 picks** a search field ("Search employee name or employee ID", 360px, `search` left addon) sits **20px below** the "Select the employees you want to import IDPs for" caption (16px margin + the 4px flex gap); it matches name or employee ID, resets "Load more" to 10, and the caption counts the filtered list. No match shows "No employees found" / "Recheck the keywords you have typed and try searching again." The field disappears (and clears) once the list drops to 10 or fewer. The button stays under the list
to add more (it re-opens the drawer pre-filled). Footer: **Cancel** (ghost) / **Continue**
(primary), right-aligned (multi-step form, so Continue, not Next); **Continue** with nobody picked (only on click; picking or removing anyone clears it again) shows `You must select at least one
employee` under the button (never disabled). The picker drawer's own confirm button reads **Save** here (`confirm-label="Save"`), not its default Continue.

**Loader.** When more than 25 employees are picked, **Continue** first shows a centred `MpSpinner` (`size="md"`; Pixel only has `sm` and `md`, an unknown size renders nothing) with the caption "Generating template..." under it for 2 seconds (mocked), in place of the form, then step 2. The loader sits in the **same 720px column as the stepper** (so it centres under the stepper's line, not the full page width). 25 or fewer go straight to step 2.

**Footers** use `MpButtonGroup` (the same group as drawer / modal footers), right-aligned: step 1 = **Cancel** (ghost) + **Continue** (primary); step 2 = **Cancel** (ghost) + **Back** (secondary) + **Import** (primary). **Back** returns to step 1 with the picked employees kept; the chosen file and any row errors are cleared.

**Step 2 · Upload file.** The step-1 circle turns into a check. An intro line ("Follow these
steps to import IDPs."), then three numbered steps separated by 1px `border.default`
lines:

1. **Download the IDP template**: "Use this template so your IDP data is in the right format." + secondary `Download template`.
2. **Fill in the template**: bullets (follow the column guidelines, fill in all required
   fields, "Each row is one action plan. Rows with the same employee ID are grouped into one IDP.").
3. **Upload the file**: no description, straight to the
   dropzone above, **the same markup and styles as `CompetencyUploadResults.vue`** (56px upload glyph, `paddingBottom: 6` / `paddingInline: 4` blank slate, title + hint, **without** the competency one's 1px divider under the hint), 240px tall here instead of 360px (title "Drop your file here or Browse", hint ".xlsx only with max size 10mb"; Pixel's `MpDropzone` was tried and dropped: it sizes to its content, its icon is oversized and it has no vertical padding; swaps to a file row once picked; row errors in
   an error banner), then the footer above.

Each step's number badge and title sit in one row, **vertically centred** (`align="center"`); the step body sits 4px (`gap="1"`) below the title and is indented 48px (badge + gap) to line up under the title. Inline errors follow the copy rule `[cause]. Please [fix]`, no trailing period: `File size is over 10 MB. Please upload a smaller file`, `File must be in XLSX format. Please upload a different file`, empty submit `You must upload a file`. **Import** (valid file) hands off to the header activity monitor exactly like the competency upload above: `addImport(fileName, 'IDP import')` opens the monitor on the **Import** tab with the job progressing, the page goes back to the IDP list, and a completed row in the monitor shows the Pixel `done` icon, `variant="fill"` (filled circle with a check), 24px, `color="icon.success"`, the file name in semibold, and the job description ("IDP import"; "Completed" when none is given) in grey under it; when the mocked job reaches 100% (`addImport`'s third argument, an `onComplete` callback) the prototype creates **one mock IDP per employee picked on step 1** (`utils/idpImportMock.ts`, 2-3 action plans each; the uploaded file is never read) and they appear on the IDP list; the toast is `Import started` ("Track the progress in the Import tab."; copy follows the toast rule [Object] + past participle) and lasts **3 seconds** (`duration: 3000`; every other toast uses Pixel's 5s default). It must be gone before the job finishes, since the monitor, not the toast, is where progress lives. The monitor opens by itself on the **Import** tab (`AppHeader.vue` clicks the trigger found by its `aria-label`; a template `ref` on it stays null because `MpPopoverTrigger` re-creates the slot child). Toasts: `Import started` and `IDP import failed` ("Fix the rows listed below and upload the file again.").

The step badge is a 32px round `blue.50` circle with a brand-coloured
(`var(--mp-colors-border-brand)`) number; step title is H3 (16/600/24), descriptions 14/20 `text.secondary`.
Reference: `pages/talents/idps/import.vue`. Competency items still use the older
`UploadPage` (single column).
