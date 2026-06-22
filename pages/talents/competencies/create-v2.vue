<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Create competency assignment (VERSION 2)
  Source: Figma — Competencies / Create assignment (node 4203:2694)
  Token mode: Pixel 2.4
  Patterns used: layout-shell, form-view, matrix builder (group × scoping-value grid)

  V2 vs V1:
    - Scoping is a single "Scoping attribute" type picker (no inline value picker).
    - Set group is replaced by a MATRIX: rows = competency groups, columns =
      scoping values (e.g. job levels). Each cell is a target-rating select.
    - "+" adds a value column; per-column "−" removes it; "Add competency group"
      adds a row; per-row "−" removes it.
    - "Not applicable" rating for cells where a group doesn't apply to a value.
    - Assignment name has a 0/60 character counter. Submit verb = "Save".
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpInput,
  MpInputTag,
  MpText,
  MpIcon,
  MpFormControl,
  MpFormLabel,
  MpFormHelpText,
  MpFormErrorMessage,
  MpBanner,
  MpBannerIcon,
  MpBannerTitle,
  MpBannerDescription,
  css,
} from '@mekari/pixel3'

definePageMeta({
  title: 'Create assignment',
  layout: 'default',
  breadcrumb: { label: 'Assignments', to: '/talents/competencies' },
})

const router = useRouter()

const NAME_MAX = 60

const COPY = {
  nameLabel: 'Assignment name',
  positionLabel: 'Job position',
  positionPlaceholder: 'Select job position',
  positionHelper: 'You can add multiple job positions',
  scopeLabel: 'Scoping attribute',
  scopePlaceholder: 'Select attribute type',
  columnPlaceholderEmpty: 'Select scoping attribute first',
  columnPlaceholder: 'Select value',
  groupsTitle: 'Competency groups',
  groupsHelper:
    'Add competency groups and set a target rating per grade. Choose "Not applicable" if a group doesn\'t apply to a specific value.',
  groupNameCol: 'Group name',
  addGroup: 'Add competency group',
  groupPlaceholder: 'Select group',
  ratingPlaceholder: 'Select rating',
  cancel: 'Cancel',
  submit: 'Save',
}

// ─── Option data (mock) ─────────────────────────────────────────────────────────
const jobPositionOptions = [
  { value: 'product-manager', label: 'Product Manager' },
  { value: 'engineering-manager', label: 'Engineering Manager' },
  { value: 'software-engineer', label: 'Software Engineer' },
  { value: 'ux-designer', label: 'UX Designer' },
  { value: 'data-analyst', label: 'Data Analyst' },
  { value: 'sales-executive', label: 'Sales Executive' },
]

const scopeTypeOptions = [
  { value: 'job-level', label: 'Job level' },
  { value: 'grade', label: 'Job grade' },
  { value: 'class', label: 'Job class' },
]

const jobLevelOptions = [
  { value: 'associate', label: 'Associate' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'senior', label: 'Senior' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior-manager', label: 'Senior Manager' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
]
const gradeOptions = Array.from({ length: 6 }, (_, i) => ({ value: `grade-${i + 1}`, label: `Grade ${i + 1}` }))
const classOptions = ['A', 'B', 'C', 'D'].map(c => ({ value: `class-${c.toLowerCase()}`, label: `Class ${c}` }))

const competencyGroupOptions = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'communication', label: 'Communication' },
  { value: 'technical-excellence', label: 'Technical excellence' },
  { value: 'product-thinking', label: 'Product thinking' },
  { value: 'stakeholder-management', label: 'Stakeholder management' },
  { value: 'execution', label: 'Execution' },
]
const ratingOptions = [
  { value: 'na', label: 'Not applicable' },
  { value: '1', label: '1 — Needs development' },
  { value: '2', label: '2 — Developing' },
  { value: '3', label: '3 — Proficient' },
  { value: '4', label: '4 — Advanced' },
  { value: '5', label: '5 — Expert' },
]

// ─── Form state ──────────────────────────────────────────────────────────────
const assignmentName = ref('')
const selectedPositions = ref<string[]>([])
const scopeType = ref<'' | 'job-level' | 'grade' | 'class'>('')

// Matrix model: columns are scoping values, rows are competency groups.
interface Column { cid: number; value: string }
interface GroupRow { rid: number; groupId: string; ratings: Record<number, string> }

let uid = 0
const nextId = () => ++uid
const makeColumn = (value = ''): Column => ({ cid: nextId(), value })
const makeRow = (): GroupRow => ({ rid: nextId(), groupId: '', ratings: {} })

// First run: no scoping attribute chosen yet, so the matrix has NO attribute
// columns — just the group rows. Columns are added once an attribute is picked.
const columns = ref<Column[]>([])
const rows = ref<GroupRow[]>([makeRow()])

// ─── Derived ───────────────────────────────────────────────────────────────────
const isScoped = computed(() => scopeType.value !== '')

// Column header value options follow the chosen scoping attribute.
// Before one is chosen there are NO values to pick — the columns stay disabled.
const columnValueOptions = computed(() => {
  switch (scopeType.value) {
    case 'job-level': return jobLevelOptions
    case 'grade': return gradeOptions
    case 'class': return classOptions
    default: return []
  }
}) as ComputedRef<{ value: string; label: string }[]>

const nameCount = computed(() => assignmentName.value.length)

// Each competency group / attribute value can only be picked once: hide options
// already chosen elsewhere, but keep the current select's own value visible.
const selectedGroupIds = computed(() => rows.value.map(r => r.groupId).filter(Boolean))
function groupOptionsFor(current: string) {
  return competencyGroupOptions.filter(o => o.value === current || !selectedGroupIds.value.includes(o.value))
}
const selectedColumnValues = computed(() => columns.value.map(c => c.value).filter(Boolean))
function columnOptionsFor(current: string) {
  return columnValueOptions.value.filter(o => o.value === current || !selectedColumnValues.value.includes(o.value))
}

// When the scoping dimension changes: clear all ratings, and seed a single
// empty attribute column (ready to fill) — or none when cleared back to "".
watch(scopeType, () => {
  columns.value = scopeType.value ? [makeColumn()] : []
  rows.value.forEach(r => (r.ratings = {}))
})

// ─── Job position (MpInputTag, pick from suggestions only) ───────────────────────
const positionSuggestions = jobPositionOptions.map(o => ({ id: o.value, label: o.label, value: o.value }))
function onPositionChange(data: { value?: string; text?: string }[]) {
  selectedPositions.value = data.map(d => d.value ?? d.text ?? '').filter(Boolean)
}

// ─── Matrix mutations ────────────────────────────────────────────────────────────
function addColumn() { columns.value.push(makeColumn()) }
function removeColumn(cid: number) {
  columns.value = columns.value.filter(c => c.cid !== cid)
  rows.value.forEach(r => delete r.ratings[cid])
}
function addRow() { rows.value.push(makeRow()) }
function removeRow(rid: number) { rows.value = rows.value.filter(r => r.rid !== rid) }

// ─── Drag & drop (native) — reorder attribute columns and group rows ───────────────
// Ratings are keyed by column id, so reordering the columns array is enough.
// `over*` drives the live insertion-line indicator while dragging.
const dragColIndex = ref<number | null>(null)
const overColIndex = ref<number | null>(null)
function onColumnDragStart(i: number, e: DragEvent) {
  dragColIndex.value = i
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }
}
function onColumnDragEnter(i: number) {
  if (dragColIndex.value !== null) overColIndex.value = i
}
function resetColDrag() { dragColIndex.value = null; overColIndex.value = null }
function onColumnDrop(i: number) {
  const from = dragColIndex.value
  resetColDrag()
  if (from === null || from === i) return
  const arr = columns.value.slice()
  arr.splice(i, 0, arr.splice(from, 1)[0])
  columns.value = arr
}

const dragRowIndex = ref<number | null>(null)
const overRowIndex = ref<number | null>(null)
function onRowDragStart(i: number, e: DragEvent) {
  dragRowIndex.value = i
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }
}
function onRowDragEnter(i: number) {
  if (dragRowIndex.value !== null) overRowIndex.value = i
}
function resetRowDrag() { dragRowIndex.value = null; overRowIndex.value = null }
function onRowDrop(i: number) {
  const from = dragRowIndex.value
  resetRowDrag()
  if (from === null || from === i) return
  const arr = rows.value.slice()
  arr.splice(i, 0, arr.splice(from, 1)[0])
  rows.value = arr
}

// Body cells accept whichever drag is active (column or group row).
function onCellDragEnter(ci: number, idx: number) {
  if (dragColIndex.value !== null) overColIndex.value = ci
  else if (dragRowIndex.value !== null) overRowIndex.value = idx
}
function onCellDrop(ci: number, idx: number) {
  if (dragColIndex.value !== null) onColumnDrop(ci)
  else if (dragRowIndex.value !== null) onRowDrop(idx)
}

// ─── Validation ──────────────────────────────────────────────────────────────────
const submitted = ref(false)
const formError = ref('')

const nameInvalid = computed(() => submitted.value && !assignmentName.value.trim())
const positionInvalid = computed(() => submitted.value && selectedPositions.value.length === 0)

function rowInvalid(r: GroupRow): boolean {
  if (!submitted.value) return false
  if (!r.groupId) return true
  // Every defined column needs a rating (Not applicable counts as a rating).
  return columns.value.some(c => c.value && !r.ratings[c.cid])
}

function validate(): boolean {
  formError.value = ''
  const missing
    = nameInvalid.value
    || positionInvalid.value
    || !scopeType.value
    || columns.value.length === 0
    || columns.value.some(c => !c.value)
    || rows.value.length === 0
    || rows.value.some(rowInvalid)

  if (missing) {
    formError.value = 'Please complete the highlighted fields before saving the assignment.'
    return false
  }
  return true
}

function onSubmit() {
  submitted.value = true
  if (!validate()) return
  router.push({
    path: '/talents/competencies',
    query: { created: '1', name: assignmentName.value.trim() },
  })
}
function onCancel() {
  router.push('/talents/competencies')
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
// 12-column form grid. Each field starts at column 1 so it gets its own row;
// input/inputtag span 6 cols, select spans 3 (per the Pixel form rule).
const formColumn = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', columnGap: '6', rowGap: '4' })
const span6 = css({ gridColumn: { base: '1 / -1', lg: '1 / span 6' } })
const span3 = css({ gridColumn: { base: '1 / -1', lg: '1 / span 3' } })
const span12 = css({ gridColumn: '1 / -1' })

const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '6', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const counterText = css({ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' })

const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' })

// ─── Matrix grid ──────────────────────────────────────────────────────────────────
// Attribute select and rating select share the same width (200px). Each column
// is two tracks: the select + a narrow track for the per-column remove button
// (kept empty under the rating cells so columns stay aligned).
const RATING_COL = '200px'
const GROUP_COL = '240px'
// The trailing action track (+ / remove-group) is the last column.
// (repeat(0, …) is invalid CSS, so omit the middle track when there are no columns.)
const matrixTemplate = computed(() => {
  const mid = columns.value.length ? `repeat(${columns.value.length}, auto auto) ` : ''
  return `auto ${mid}auto`
})

// Outer bordered container (rounded) wrapping the whole table; fit-content +
// maxWidth 100% so it hugs its content but scrolls (and the sticky action column
// pins to the right) once it grows wider than the stage.
// Scroll container + a small top gutter so the hover drag-grip can straddle the
// table's top border (Notion-style) without being clipped by overflow.
const matrixScroll = css({
  overflowX: 'auto',
  maxWidth: '100%',
  paddingTop: '11px',
})
// Inner bordered box (rounded). fit-content so it hugs content but scrolls inside
// the outer container once it grows wider than the stage.
const matrixBox = css({
  width: 'fit-content',
  border: '1px solid',
  borderColor: 'neutral.400',
  borderRadius: 'md',
})
// alignItems stretch so every cell fills the full row height — the header bg
// then covers the whole row (no gaps above/below the controls).
const matrixGrid = css({
  display: 'grid', alignItems: 'stretch', rowGap: '0', columnGap: '0',
  '& > *': { transition: 'opacity 0.15s ease, box-shadow 0.15s ease, background 0.15s ease' },
})

// Drag interaction states.
const dimDrag = css({ opacity: '0.4' })
const dropColLine = css({ boxShadow: 'inset 3px 0 0 0 var(--mp-colors-border-brand)' })  // insertion line at column's left
const dropRowLine = css({ boxShadow: 'inset 0 3px 0 0 var(--mp-colors-border-brand)' })  // insertion line at row's top

const HEAD_BG = 'background.surface'

// ── Body cells (flex+center so the control sits centered in the full-height cell) ──
const cell = css({ display: 'flex', alignItems: 'center', paddingInline: '3', paddingBlock: '3' })
const groupCell = css({ display: 'flex', alignItems: 'center', gap: '1', paddingInline: '3', paddingBlock: '3', borderRight: '1px solid', borderRightColor: 'border.default' })
const edgeCell = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center', paddingInline: '1', paddingBlock: '3',
  borderRight: '1px solid', borderRightColor: 'border.default',
})

// ── Header cells (shaded background) ──
const headCell = css({
  display: 'flex', alignItems: 'center', gap: '1', paddingInline: '3', paddingBlock: '3',
  background: HEAD_BG, borderRight: '1px solid', borderRightColor: 'border.default',
})
const headSelectCell = css({
  position: 'relative',
  display: 'flex', alignItems: 'center', paddingInline: '3', paddingBlock: '3', background: HEAD_BG,
  // Notion-style: reveal the small drag grip (above the column) only on hover.
  '&:hover [data-col-grip]': { opacity: '1', pointerEvents: 'auto' },
})
// Small grip pill floating at the top-center of the column header.
const colGrip = css({
  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  paddingInline: '1', paddingBlock: '0',
  borderRadius: 'sm', background: 'background.stage',
  border: '1px solid', borderColor: 'border.default',
  color: 'icon.secondary', cursor: 'grab',
  opacity: '0', pointerEvents: 'none', transition: 'opacity 0.12s ease',
  zIndex: '3', _active: { cursor: 'grabbing' },
})
// Shrink the grip glyph so it reads as a subtle handle, not a button.
const colGripIcon = css({ transform: 'scale(0.7)' })
const headEdgeCell = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1', paddingInline: '1', paddingBlock: '3',
  background: HEAD_BG, borderRight: '1px solid', borderRightColor: 'border.default',
})
const headLabel = css({ fontWeight: '600', color: 'text.default' })

// Drag handle (grip) + a matching spacer to keep the header label aligned over the group selects.
const dragHandle = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', flexShrink: '0',
  cursor: 'grab', color: 'icon.secondary', _active: { cursor: 'grabbing' },
})
const handleLane = css({ width: '18px', flexShrink: '0' })

// ── Sticky action column (pinned right while scrolling) ──
const stickyBase = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', paddingInline: '1', paddingBlock: '3',
  position: 'sticky', right: '0', zIndex: '1', borderLeft: '1px solid', borderLeftColor: 'border.default',
} as const
const stickyHead = css({ ...stickyBase, background: HEAD_BG })
const stickyBody = css({ ...stickyBase, background: 'background.stage' })
// Full-span lines: a header underline + a separator under every group row.
const headDivider = css({ gridColumn: '1 / -1', height: '1px', background: 'border.default' })
const rowDivider = css({ gridColumn: '1 / -1', height: '1px', background: 'border.default' })
</script>

<template>
  <div :class="formColumn">

    <!-- ═════ Form-level error banner ═════ -->
    <MpBanner v-if="formError" variant="danger" :class="span12">
      <MpBannerIcon />
      <MpBannerTitle>Couldn't save assignment</MpBannerTitle>
      <MpBannerDescription>{{ formError }}</MpBannerDescription>
    </MpBanner>

    <!-- ═════ Assignment name (with counter) — input: 6 grid col ═════ -->
    <MpFormControl id="assignment-name" :is-required="true" :is-invalid="nameInvalid" :class="span6">
      <div :class="labelRow">
        <MpFormLabel>{{ COPY.nameLabel }}</MpFormLabel>
        <MpText size="label-small" :class="counterText">{{ nameCount }} / {{ NAME_MAX }}</MpText>
      </div>
      <MpInput
        v-model="assignmentName"
        :maxlength="NAME_MAX"
        :class="css({ width: '100%' })"
      />
      <MpFormErrorMessage>Assignment name is required.</MpFormErrorMessage>
    </MpFormControl>

    <!-- ═════ Job position (MpInputTag) — 6 grid col ═════ -->
    <MpFormControl id="job-position" :is-required="true" :is-invalid="positionInvalid" :class="span6">
      <MpFormLabel>{{ COPY.positionLabel }}</MpFormLabel>
      <MpInputTag
        id="job-position-input"
        :placeholder="COPY.positionPlaceholder"
        :suggestions="positionSuggestions"
        suggestion-key="label"
        :is-show-suggestions="true"
        :is-enable-create-new-tag="false"
        :is-show-icon-chevron-down="true"
        :is-invalid="positionInvalid"
        use-portal
        @change="onPositionChange"
      />
      <MpFormHelpText>{{ COPY.positionHelper }}</MpFormHelpText>
      <MpFormErrorMessage>Select at least one job position.</MpFormErrorMessage>
    </MpFormControl>

    <!-- ═════ Scoping attribute — select: 3 grid col ═════ -->
    <MpFormControl id="scope-type" :is-invalid="submitted && !scopeType" :class="span3">
      <MpFormLabel>{{ COPY.scopeLabel }}</MpFormLabel>
      <PxSelectPopover
        v-model="scopeType"
        :options="scopeTypeOptions"
        :placeholder="COPY.scopePlaceholder"
        :width="'100%'"
      />
      <MpFormErrorMessage>Select a scoping attribute.</MpFormErrorMessage>
    </MpFormControl>

    <!-- ═════ Competency groups (matrix) — full width ═════ -->
    <div :class="[sectionHeader, span12]">
      <MpText as="h2" :class="h2Class">{{ COPY.groupsTitle }}</MpText>
      <MpText size="label" :class="captionText">{{ COPY.groupsHelper }}</MpText>
    </div>

    <div :class="[matrixScroll, span12]">
      <div :class="matrixBox">
      <div :class="matrixGrid" :style="{ gridTemplateColumns: matrixTemplate }">

        <!-- Header row -->
        <div :class="headCell">
          <div :class="handleLane" />
          <MpText size="label" :class="headLabel">{{ COPY.groupNameCol }}</MpText>
        </div>
        <template v-for="(col, ci) in columns" :key="`h-${col.cid}`">
          <div
            :class="[headSelectCell, ci === dragColIndex && dimDrag, ci === overColIndex && dropColLine]"
            @dragenter.prevent="onColumnDragEnter(ci)"
            @dragover.prevent
            @drop="onColumnDrop(ci)"
          >
            <div
              :class="colGrip"
              data-col-grip
              draggable="true"
              aria-label="Drag to reorder column"
              @dragstart="onColumnDragStart(ci, $event)"
              @dragend="resetColDrag"
            >
              <MpIcon name="drag" size="sm" :class="colGripIcon" />
            </div>
            <PxSelectPopover
              v-model="col.value"
              :options="columnOptionsFor(col.value)"
              :placeholder="isScoped ? COPY.columnPlaceholder : COPY.columnPlaceholderEmpty"
              :is-disabled="!isScoped"
              :width="RATING_COL"
            />
          </div>
          <div
            :class="[headEdgeCell, ci === dragColIndex && dimDrag]"
            @dragenter.prevent="onColumnDragEnter(ci)"
            @dragover.prevent
            @drop="onColumnDrop(ci)"
          >
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="minus-circular"
              aria-label="Remove column"
              :is-disabled="columns.length === 1"
              @click="removeColumn(col.cid)"
            />
          </div>
        </template>
        <div :class="stickyHead">
          <MpButton
            variant="ghost"
            size="sm"
            left-icon="add"
            aria-label="Add column"
            :is-disabled="!isScoped"
            @click="addColumn"
          />
        </div>
        <!-- Header underline -->
        <div :class="headDivider" />

        <!-- Group rows -->
        <template v-for="(row, idx) in rows" :key="`r-${row.rid}`">
          <div
            :class="[groupCell, idx === dragRowIndex && dimDrag, idx === overRowIndex && dropRowLine]"
            @dragenter.prevent="onRowDragEnter(idx)"
            @dragover.prevent
            @drop="onRowDrop(idx)"
          >
            <div
              :class="dragHandle"
              draggable="true"
              aria-label="Drag to reorder group"
              @dragstart="onRowDragStart(idx, $event)"
              @dragend="resetRowDrag"
            >
              <MpIcon name="drag" size="sm" />
            </div>
            <PxSelectPopover
              v-model="row.groupId"
              :options="groupOptionsFor(row.groupId)"
              :placeholder="COPY.groupPlaceholder"
              :width="GROUP_COL"
              searchable
            />
          </div>
          <template v-for="(col, ci) in columns" :key="`c-${row.rid}-${col.cid}`">
            <div
              :class="[cell, (ci === dragColIndex || idx === dragRowIndex) && dimDrag, idx === overRowIndex && dropRowLine, ci === overColIndex && dropColLine]"
              @dragenter.prevent="onCellDragEnter(ci, idx)"
              @dragover.prevent
              @drop="onCellDrop(ci, idx)"
            >
              <PxSelectPopover
                v-model="row.ratings[col.cid]"
                :options="ratingOptions"
                :placeholder="COPY.ratingPlaceholder"
                :width="RATING_COL"
              />
            </div>
            <div :class="[edgeCell, (ci === dragColIndex || idx === dragRowIndex) && dimDrag]" />
          </template>
          <div :class="[stickyBody, idx === dragRowIndex && dimDrag]">
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="minus-circular"
              aria-label="Remove group"
              :is-disabled="rows.length === 1"
              @click="removeRow(row.rid)"
            />
          </div>
          <!-- Row separator (between rows only; container border closes the bottom) -->
          <div v-if="idx < rows.length - 1" :class="rowDivider" />
        </template>
      </div>
      </div>
    </div>

    <MpFlex :class="span12">
      <MpButton variant="ghost" size="sm" left-icon="add" @click="addRow">
        {{ COPY.addGroup }}
      </MpButton>
    </MpFlex>

    <!-- ═════ Footer ═════ -->
    <MpFlex justify="flex-end" gap="2" :class="[span12, css({ paddingTop: '6' })]">
      <MpButton variant="ghost" @click="onCancel">{{ COPY.cancel }}</MpButton>
      <MpButton variant="primary" @click="onSubmit">{{ COPY.submit }}</MpButton>
    </MpFlex>
  </div>

  <PxVersionSwitcher
    :versions="[
      { label: 'Version 1', to: '/talents/competencies/create' },
      { label: 'Version 2', to: '/talents/competencies/create-v2' },
    ]"
  />
</template>
