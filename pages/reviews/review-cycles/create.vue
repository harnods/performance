<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpInput,
  MpInputGroup,
  MpInputRightAddon,
  MpIcon,
  MpText,
  MpToggle,
  MpCheckbox,
  MpRadio,
  MpBadge,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpTooltip,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpBanner,
  MpBannerIcon,
  MpBannerDescription,
  toast,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES } from '~/utils/employees'

definePageMeta({
  title: 'Create new cycle',
  layout: 'default',
  breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' },
})

const route = useRoute()
const router = useRouter()

// Cycle purpose drives which form renders (production Create.vue → EvaluationForm
// for probation, GeneralForm for performance/competency). Default 'performance'
// mirrors production; the Review Cycles list always passes an explicit purpose.
const purpose = ((route.query.purpose as string) || 'performance') as 'performance' | 'competency' | 'evaluation'
const isEvaluation = computed(() => purpose === 'evaluation')

const cycleName = ref((route.query.name as string) || 'Probation Evaluation - Product Designer')
const isEditingName = ref(false)
const nameInput = ref<InstanceType<typeof MpInput> | null>(null)

function startEditName() {
  isEditingName.value = true
  nextTick(() => {
    const el = (nameInput.value as unknown as { $el?: HTMLElement })?.$el
    el?.querySelector('input')?.focus()
  })
}

// Form state
const employmentStatus = ref('probation')
const employmentStatusOptions = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'probation', label: 'Probation' },
  { value: 'intern', label: 'Internship' },
]

// Employee filter — the first row (with "No filter applied") plus any rows
// added via "Add filter". A dimension picked in one row is hidden from every
// other row's options, so the same filter can't be added twice.
const FILTER_DIMENSIONS = [
  { value: 'organization', label: 'Organization' },
  { value: 'branch', label: 'Branch' },
  { value: 'job-position', label: 'Job position' },
  { value: 'job-level', label: 'Job level' },
  { value: 'job-grade', label: 'Job grade' },
  { value: 'job-class', label: 'Job class' },
]
interface FilterRow { id: number, dimension: string, values: string[] }
// Copy (uxw-mekari caption rule: no closing period; with 2 sentences, only the
// first gets one). Same text and spot in every state — Create, with or without
// filters, Edit. It names the status picked in Employment status above, so the
// "no filter" scope reads concretely ("…with Probation status…").
const employmentStatusLabel = computed(() => employmentStatusOptions.find(o => o.value === employmentStatus.value)?.label)
const employeeFilterCaption = computed(() =>
  `Limit this cycle to specific employees. With no filter, all employees with ${employmentStatusLabel.value ? `${employmentStatusLabel.value} status` : 'the selected employment status'} are included`)
const FILTER_LOCKED_TOOLTIP = "Employee filters can't be changed after the cycle is created"
let filterSeq = 0
// PRD D4: on Edit the whole Employee filter section is read-only. The prototype
// has no edit route for evaluation cycles, so `?mode=edit` previews that state
// with a sample saved filter (the demo dev tools switch it without a reload).
const isEdit = computed(() => route.query.mode === 'edit')
function initialFilterRows(): FilterRow[] {
  return isEdit.value
    ? [
        { id: filterSeq++, dimension: 'organization', values: [...new Set(EMPLOYEES.map(e => e.department))].sort().slice(0, 2) },
        { id: filterSeq++, dimension: 'job-level', values: ['Manager'] },
      ]
    : [{ id: filterSeq++, dimension: 'none', values: [] }]
}
const filterRows = ref<FilterRow[]>(initialFilterRows())
watch(isEdit, () => { filterRows.value = initialFilterRows(); submitted.value = false })

function dimensionOptionsFor(index: number) {
  const taken = new Set(filterRows.value.filter((_, i) => i !== index).map(r => r.dimension))
  const dims = FILTER_DIMENSIONS.filter(d => !taken.has(d.value))
  return index === 0 ? [{ value: 'none', label: 'No filter applied' }, ...dims] : dims
}
function setDimension(index: number, value: string) {
  const row = filterRows.value[index]!
  row.dimension = value
  row.values = []
  // Clearing the first row back to "No filter applied" drops the added rows.
  if (index === 0 && value === 'none') filterRows.value = [row]
}
const usedDimensions = computed(() => filterRows.value.map(r => r.dimension).filter(d => d !== 'none'))
const canAddFilter = computed(() =>
  filterRows.value.every(r => r.dimension !== 'none') && usedDimensions.value.length < FILTER_DIMENSIONS.length,
)
// "Add filter ▾" lists only the filter types not used yet; picking one adds its row.
const unusedDimensions = computed(() => FILTER_DIMENSIONS.filter(d => !usedDimensions.value.includes(d.value)))
function addFilter(dimension: string) {
  filterRows.value.push({ id: filterSeq++, dimension, values: [] })
}
function removeFilter(index: number) { filterRows.value.splice(index, 1) }

// Save-time check (no disabled Save): a turned-on filter needs at least one value.
const filterErrors = computed(() => filterRows.value.map(r =>
  submitted.value && r.dimension !== 'none' && !r.values.length
    ? `You must select at least one ${dimensionLabel(r.dimension).toLowerCase()}`
    : '',
))
const hasFilterError = computed(() => filterRows.value.some(r => r.dimension !== 'none' && !r.values.length))

// When a filter dimension is chosen, a multi-select + search picker appears
// beside it to choose the value(s). Options are real where the data supports
// it (Organization = departments, Job position = titles), mock otherwise.
const FILTER_BRANCHES = ['HQ Jakarta', 'Bandung', 'Surabaya']
// Job grade / Job class come from a live, paginated core-HR endpoint in
// production (GET /external-assessments/job-grades, /job-classes). MOCK: pages
// of 10 with a short delay; the picker loads the next page when you scroll to
// its end and shows a spinner meanwhile.
const REMOTE_PAGE = 10
const REMOTE_LISTS: Record<string, { value: string, label: string }[]> = {
  'job-grade': Array.from({ length: 30 }, (_, i) => ({ value: `grade-${i + 1}`, label: `Grade ${i + 1}` })),
  'job-class': ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(c => ({ value: `class-${c.toLowerCase()}`, label: `Class ${c}` })),
}
const remoteLoaded = ref<Record<string, number>>({ 'job-grade': REMOTE_PAGE, 'job-class': REMOTE_PAGE })
const remoteLoading = ref<Record<string, boolean>>({})
function loadMoreRemote(dimension: string) {
  if (remoteLoading.value[dimension]) return
  remoteLoading.value = { ...remoteLoading.value, [dimension]: true }
  setTimeout(() => {
    remoteLoaded.value = { ...remoteLoaded.value, [dimension]: (remoteLoaded.value[dimension] ?? 0) + REMOTE_PAGE }
    remoteLoading.value = { ...remoteLoading.value, [dimension]: false }
  }, 600)
}
// Search runs on the server too (mock: filters the full list after a delay),
// so a value that isn't loaded yet can still be found.
const remoteQuery = ref<Record<string, string>>({})
function searchRemote(dimension: string, q: string) {
  remoteLoading.value = { ...remoteLoading.value, [dimension]: true }
  setTimeout(() => {
    remoteQuery.value = { ...remoteQuery.value, [dimension]: q }
    remoteLoaded.value = { ...remoteLoaded.value, [dimension]: REMOTE_PAGE }
    remoteLoading.value = { ...remoteLoading.value, [dimension]: false }
  }, 400)
}
function remoteResults(dimension: string) {
  const q = (remoteQuery.value[dimension] ?? '').toLowerCase()
  return q ? REMOTE_LISTS[dimension]!.filter(o => o.label.toLowerCase().includes(q)) : REMOTE_LISTS[dimension]!
}
const isRemote = (dimension: string) => dimension in REMOTE_LISTS
const remoteHasMore = (dimension: string) => isRemote(dimension) && (remoteLoaded.value[dimension] ?? 0) < remoteResults(dimension).length
const FILTER_JOB_LEVELS = ['Staff', 'Supervisor', 'Manager', 'Head']
const uniq = (arr: string[]) => [...new Set(arr)].sort().map(v => ({ value: v, label: v }))
const dimensionLabel = (dimension: string) => FILTER_DIMENSIONS.find(d => d.value === dimension)?.label ?? ''
function filterValueConfig(dimension: string) {
  switch (dimension) {
    case 'organization': return { label: 'All organization', options: uniq(EMPLOYEES.map(e => e.department)) }
    case 'branch': return { label: 'All branch', options: FILTER_BRANCHES.map(v => ({ value: v, label: v })) }
    case 'job-position': return { label: 'All job position', options: uniq(EMPLOYEES.map(e => e.title)) }
    case 'job-level': return { label: 'All job level', options: FILTER_JOB_LEVELS.map(v => ({ value: v, label: v })) }
    case 'job-grade':
    case 'job-class':
      return { label: `All ${dimensionLabel(dimension).toLowerCase()}`, options: remoteResults(dimension).slice(0, remoteLoaded.value[dimension]) }
    default: return null
  }
}

// Review period
const reviewPeriodType = ref<'single' | 'multiple'>('single')

const reviewStart = ref('7')
const reviewStartOptions = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: 'custom', label: 'Custom' },
]

const reviewEvery = ref<number | ''>('')
const reviewWindow = ref<number | ''>('')

// Validation surfaces only after a save attempt (mirrors competencies/create.vue).
// Review every / Review window are required (and must be a positive number) when
// the multiple-review-period option is selected.
const submitted = ref(false)
const isMultiple = computed(() => reviewPeriodType.value === 'multiple')
const reviewEveryInvalid = computed(() => submitted.value && isMultiple.value && +reviewEvery.value < 1)
const reviewWindowInvalid = computed(() => submitted.value && isMultiple.value && +reviewWindow.value < 1)

const reIncludeExtended = ref(false)

// ─── Review methods (Performance Cycle parity per PM requirement) ────────────────
// Manager review is on by default (mirrors existing single-method cycles); HR must
// keep at least one method enabled. None are locked.
const methodManager = ref(true)
const method360 = ref(false)
const methodTeam = ref(false)
const methodSelf = ref(false)

const activeMethods = computed(() => ([
  methodManager.value && { key: 'manager', name: 'Manager review' },
  method360.value && { key: '360', name: '360-degree review' },
  methodTeam.value && { key: 'team', name: 'Team review' },
  methodSelf.value && { key: 'self', name: 'Self review' },
].filter(Boolean) as { key: string; name: string }[]))

// A comment-only Self review contributes no score, so it doesn't count toward
// weighting — matching Performance Cycle (needs 2+ *scoring* methods, i.e. 3 when
// Self is comment-only). Set once the Self drawer is saved.
const selfIsCommentOnly = ref(false)
const weightableMethods = computed(() =>
  activeMethods.value.filter(m => !(m.key === 'self' && selfIsCommentOnly.value)))

// "Use weight" combines 2+ scoring methods into one final score (mirrors
// Performance Cycle). Only available once 2 or more weightable methods exist.
const useMethodWeightAvailable = computed(() => weightableMethods.value.length >= 2)
const useMethodWeight = ref(false)
const methodWeights = reactive<Record<string, number | ''>>({ manager: '', '360': '', team: '', self: '' })
const totalMethodWeight = computed(() =>
  weightableMethods.value.reduce((sum, m) => sum + (methodWeights[m.key] === '' ? 0 : Number(methodWeights[m.key])), 0))

// Settings drawer opened from each method's "Manage" button
const methodDrawerOpen = ref(false)
const activeMethodLabel = ref('Manager review')
function openMethodDrawer(label: string) {
  activeMethodLabel.value = label
  // Defer opening to the next tick so the current click event finishes
  // bubbling before the drawer mounts its outside-click listener — otherwise
  // the same click is treated as an outside click and closes it immediately.
  nextTick(() => { methodDrawerOpen.value = true })
}

// A method counts as "configured" once its drawer has been saved at least once.
const labelToKey: Record<string, string> = {
  'Manager review': 'manager', '360-degree review': '360', 'Team review': 'team', 'Self review': 'self',
}
const configuredMethods = reactive(new Set<string>())
function onMethodConfigured(payload?: { selfCommentOnly?: boolean }) {
  const key = labelToKey[activeMethodLabel.value]
  configuredMethods.add(key)
  if (key === 'self') selfIsCommentOnly.value = !!payload?.selfCommentOnly
}

// ─── Validation (surfaces only after a save attempt) ────────────────────────────
const cycleNameInvalid = computed(() => submitted.value && !cycleName.value.trim())
const noMethodSelected = computed(() => submitted.value && activeMethods.value.length === 0)
const unconfiguredMethods = computed(() =>
  submitted.value ? activeMethods.value.filter(m => !configuredMethods.has(m.key)) : [])
const weightTotalInvalid = computed(() =>
  submitted.value && useMethodWeight.value && useMethodWeightAvailable.value && totalMethodWeight.value !== 100)

// Publish score after (Performance Cycle parity)
const publishScoreAfter = ref('complete-review')
const publishScoreOptions = [
  { value: 'complete-review', label: 'Complete review' },
  { value: 'cycle-end', label: 'Review period end' },
  { value: 'both', label: 'Both' },
]

// Score adjustment
const deductionScore = ref(false)

// Review outcome
const reviewerCanDecide = ref(false)
const lockReview = ref(false)

// ─── Layout ───────────────────────────────────────────────────────────────────
const gridArea = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(12, 1fr)',
  gap: '6',
})

// Desktop: 6/12 cols, capped at 656px on very wide screens.
// Tablet/mobile (< lg / < 1024px): full 12/12 cols, uncapped.
const formColumn = css({
  gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' },
  maxWidth: { lg: '656px' },
  display: 'flex',
  flexDirection: 'column',
})

// Select width: 50% of formColumn on desktop (3/12 grid),
// full width (12/12) on tablet & mobile. Passed via :class (not :width)
// because a responsive width needs media queries, which inline style can't do.
// Every MpSelect uses the standard 3/12-grid width (~264px) — consistent width
// for Employment status, Employee filter, and every other select in the form.
const selectWidth = css({ width: { base: '100%', lg: '264px' } })
// Each filter row stays on one line: dimension + value (12px apart), then the
// remove button 24px after the value. Each select is 264px on lg, shares the
// row below it.
const filterRowsWrap = css({ display: 'flex', flexDirection: 'column', gap: '4', width: { base: '100%', lg: 'fit-content' } })
const filterRow = css({ display: 'flex', alignItems: 'flex-start', gap: '3', width: '100%' })
const filterSelect = css({ flex: { base: '1 1 0', lg: '0 0 264px' }, minWidth: '0' })
const filterValueRow = css({ display: 'flex', alignItems: 'flex-start', gap: '24px', flex: { base: '1 1 0', lg: '0 0 auto' }, minWidth: '0' })
// "—— and ——" between filter rows: solid 1px border.default lines, label-small "and".
const removeSpacer = css({ width: '38px', flexShrink: '0' })
// The divider ends at the value field. The remove slot after the value field is
// 62px (24px gap + 38px button); the divider's own 12px gap + this 50px spacer
// match it, so the line stops exactly where the value field does.
const andTrailing = css({ width: '50px', flexShrink: '0' })
const filterHint = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const andDivider = css({ display: 'flex', alignItems: 'center', gap: '3', width: '100%' })
const andLine = css({ flex: '1', height: '1px', background: 'border.default' })
const andText = css({ color: 'gray.400' })

// Inline validation error text (matches MpFormErrorMessage sizing)
const errorText = css({ color: 'text.danger', fontSize: '12px', lineHeight: '16px' })

// pxl-space-md (16px) between fields
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })

// Section header: 40px top gap (pxl-space-3xl), 12px bottom spacer before fields
const sectionHeader = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  marginTop: '10',
  marginBottom: '3',
})

// H2 = 20px/600/lh32 (Heading/H2 per foundations.md)
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
// H3 = 16px/600/lh24 (Heading/H3 per foundations.md)
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })

// Toggle row: border-bottom separator, no card border
const toggleRow = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '6',
  paddingTop: '2',
  paddingBottom: '4',
  borderBottom: '1px solid',
  borderBottomColor: 'border.default',
})

// Weight input row: label left, input+% right, border-bottom separator
const weightRow = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBlock: '3',
  borderBottom: '1px solid',
  borderBottomColor: 'border.default',
})

// Toggle row for sections without separator (score adjustment)
const toggleRowPlain = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '6',
  paddingTop: '2',
  paddingBottom: '4',
})

const footerBar = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '2',
  paddingTop: '4',
})

function onCancel() {
  router.push('/reviews/review-cycles')
}
function onSave() {
  submitted.value = true
  if (isEvaluation.value && !isEdit.value && hasFilterError.value) {
    toast.notify({ id: 'cycle-form-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
    nextTick(() => document.getElementById('employee-filter-label')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    return
  }
  const anyMethodUnconfigured = activeMethods.value.some(m => !configuredMethods.has(m.key))
  if (
    cycleNameInvalid.value
    || noMethodSelected.value
    || anyMethodUnconfigured
    || weightTotalInvalid.value
    || (isMultiple.value && (reviewEveryInvalid.value || reviewWindowInvalid.value))
  ) return
  toast.notify({
    id: 'review-cycle-created',
    position: 'top-center',
    variant: 'success',
    title: 'Review cycle created',
  })
  router.push('/reviews/review-cycles')
}
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="secondary" right-icon="caret-down">Help</MpButton>
  </Teleport>

  <!-- Performance / Competency review use the shared General form (production
       parity: Create.vue → GeneralForm). Evaluation keeps its own form below. -->
  <CycleGeneralForm
    v-if="!isEvaluation"
    :purpose="purpose"
    :initial-name="(route.query.name as string) || ''"
  />

  <div v-else :class="gridArea">
    <div :class="formColumn">

      <!-- ── Cycle name & basics ──────────────────────────────────────── -->
      <div :class="fields">
        <MpFlex direction="column" gap="0">
          <MpFlex align="center" gap="4">
            <template v-if="!isEditingName">
              <MpText :class="h2Class">{{ cycleName || 'Untitled cycle' }}</MpText>
              <MpTooltip label="Rename cycle" use-portal>
                <MpButton variant="ghost" left-icon="edit" @click="startEditName" />
              </MpTooltip>
            </template>
            <template v-else>
              <MpInput
                ref="nameInput"
                v-model="cycleName"
                :class="css({ width: '320px' })"
                @keydown.enter="isEditingName = false"
              />
              <MpButton variant="ghost" @click="isEditingName = false">Cancel</MpButton>
              <MpButton variant="primary" @click="isEditingName = false">Save changes</MpButton>
            </template>
          </MpFlex>
          <MpText v-if="cycleNameInvalid" size="label" :class="css({ color: 'text.danger' })">
            You must fill in Cycle name
          </MpText>
          <MpText :class="h3Class">Cycle type: Evaluation</MpText>
        </MpFlex>

        <MpFormControl id="employment-status">
          <MpFlex align="center" gap="1">
            <MpFormLabel>Employment status</MpFormLabel>
            <MpTooltip label="Limit this cycle to specific employment statuses" use-portal>
              <MpIcon name="info" :class="css({ color: 'icon.secondary', width: '16px', height: '16px' })" />
            </MpTooltip>
          </MpFlex>
          <PxSelectPopover
            v-model="employmentStatus"
            :options="employmentStatusOptions"
            placeholder="Select status"
            :class="selectWidth"
          />
        </MpFormControl>

        <MpFormControl id="employee-filter" :is-disabled="isEdit">
          <MpFormLabel>Employee filter</MpFormLabel>
          <!-- One caption, same copy and same spot (under the label) in every state,
               so it never jumps as rows are added/removed or the cycle is edited.
               PRD logic: AND across filters ("narrows this down"), OR within one
               filter's values (the trigger lists them by name). -->
          <MpText :class="[filterHint, css({ marginBottom: '2' })]">
            {{ employeeFilterCaption }}
          </MpText>
          <div :class="filterRowsWrap">
            <template v-for="(row, i) in filterRows" :key="row.id">
              <div v-if="i > 0" :class="andDivider" aria-hidden="true">
                <span :class="andLine" />
                <MpText size="label-small" :class="andText">and</MpText>
                <span :class="andLine" />
                <span v-if="!isEdit" :class="andTrailing" />
              </div>
              <div :class="filterRow">
                <!-- On Edit, hovering a disabled field explains why (tooltip only
                     fires on Edit: is-manual + closed otherwise). -->
                <MpTooltip :label="FILTER_LOCKED_TOOLTIP" :is-manual="!isEdit" :is-open="false" use-portal>
                  <div :class="filterSelect">
                    <PxSelectPopover
                      :model-value="row.dimension"
                      :options="dimensionOptionsFor(i)"
                      :width="'100%'"
                      :is-disabled="isEdit"
                      @update:model-value="(v: string) => setDimension(i, v)"
                    />
                  </div>
                </MpTooltip>
                <!-- Value picker + (added rows only) remove button, 24px apart -->
                <div v-if="filterValueConfig(row.dimension)" :class="filterValueRow">
                  <!-- Not an MpFormControl: its invalid state would flow into the
                       popover (search box + checkboxes turn red). Only the trigger
                       is marked invalid; the message uses the inline errorText. -->
                  <MpTooltip :label="FILTER_LOCKED_TOOLTIP" :is-manual="!isEdit" :is-open="false" use-portal>
                    <div :class="[filterSelect, css({ display: 'flex', flexDirection: 'column', gap: '1' })]">
                      <DashMultiSelectSearch
                        v-model="row.values"
                        :options="filterValueConfig(row.dimension)!.options"
                        :all-label="filterValueConfig(row.dimension)!.label"
                        :placeholder="`Select ${dimensionLabel(row.dimension).toLowerCase()}`"
                        :width="'100%'"
                        summarize
                        search-on-field
                        :is-disabled="isEdit"
                        :is-invalid="!!filterErrors[i]"
                        :has-more="remoteHasMore(row.dimension)"
                        :is-loading-more="!!remoteLoading[row.dimension]"
                        :remote-search="isRemote(row.dimension)"
                        @load-more="loadMoreRemote(row.dimension)"
                        @search="(q: string) => searchRemote(row.dimension, q)"
                      />
                      <span v-if="filterErrors[i]" :class="errorText">{{ filterErrors[i] }}</span>
                    </div>
                  </MpTooltip>
                  <template v-if="!isEdit">
                    <MpTooltip v-if="i > 0" label="Remove" use-portal>
                      <MpButton variant="ghost" left-icon="minus-circular" aria-label="Remove filter" @click="removeFilter(i)" />
                    </MpTooltip>
                    <!-- First row has no remove button; reserve its width once rows are
                         added so every row's value field lines up. -->
                    <span v-else-if="filterRows.length > 1" :class="removeSpacer" aria-hidden="true" />
                  </template>
                </div>
              </div>
            </template>
            <!-- Dropdown button: pick the filter type to add (same button + popover
                 pairing as the IDP column settings). -->
            <div v-if="canAddFilter && !isEdit" :class="css({ width: 'fit-content' })">
              <MpPopover is-close-on-select use-portal placement="bottom-start">
                <MpPopoverTrigger>
                  <MpButton variant="secondary" right-icon="chevrons-down">Add filter</MpButton>
                </MpPopoverTrigger>
                <MpPopoverContent>
                  <MpPopoverList>
                    <MpPopoverListItem v-for="d in unusedDimensions" :key="d.value" @click="addFilter(d.value)">
                      {{ d.label }}
                    </MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </div>
          </div>
        </MpFormControl>

      </div>

      <!-- ── Review period ───────────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Review period</MpText>
        <MpText size="label" color="text.secondary">
          The review timeframe is automatically set based on each employee's join date and employment end date.
        </MpText>
      </div>
      <div :class="fields">
        <!-- Single review radio -->
        <MpRadio
          name="review-period-type"
          value="single"
          :is-checked="reviewPeriodType === 'single'"
          @update:is-checked="reviewPeriodType = 'single'"
        >
          Single review
          <template #description>One review is generated before the employee's end date.</template>
        </MpRadio>

        <!-- Review start — indented, visible only when single -->
        <div v-if="reviewPeriodType === 'single'" :class="css({ paddingLeft: '8' })">
          <MpFormControl id="review-start">
            <MpFormLabel>Review start</MpFormLabel>
            <MpFlex align="center" gap="4">
              <PxSelectPopover v-model="reviewStart" :options="reviewStartOptions" :class="selectWidth" />
              <MpText size="label" color="text.default">before the employee's end date</MpText>
            </MpFlex>
          </MpFormControl>
        </div>

        <!-- Multiple review periods radio -->
        <MpRadio
          name="review-period-type"
          value="multiple"
          :is-checked="reviewPeriodType === 'multiple'"
          @update:is-checked="reviewPeriodType = 'multiple'"
        >
          Multiple review periods
          <template #description>Reviews are generated at regular intervals throughout the employment period.</template>
        </MpRadio>

        <!-- Review every + Review window — indented, visible only when multiple -->
        <template v-if="reviewPeriodType === 'multiple'">
          <div :class="css({ paddingLeft: '8', display: 'flex', flexDirection: 'column', gap: '4' })">
            <!-- Two fields side by side -->
            <MpFlex gap="4">
              <MpFormControl id="review-every" :is-invalid="reviewEveryInvalid" :class="css({ flex: '1' })">
                <MpFormLabel>Review every</MpFormLabel>
                <MpInputGroup>
                  <MpInput v-model="reviewEvery" type="number" min="1" />
                  <MpInputRightAddon>Months</MpInputRightAddon>
                </MpInputGroup>
                <MpFormErrorMessage>You must fill in Review every</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl id="review-windows" :is-invalid="reviewWindowInvalid" :class="css({ flex: '1' })">
                <MpFormLabel>Review window</MpFormLabel>
                <MpInputGroup>
                  <MpInput v-model="reviewWindow" type="number" min="1" />
                  <MpInputRightAddon>Days</MpInputRightAddon>
                </MpInputGroup>
                <MpFormErrorMessage>You must fill in Review window</MpFormErrorMessage>
              </MpFormControl>
            </MpFlex>

            <!-- Warning banner: shown when review every = 1 month -->
            <MpBanner v-if="+reviewEvery === 1" variant="warning" is-inline>
              <MpBannerIcon />
              <MpBannerDescription>This configuration may generate a high number of review periods per employee depending on their contract duration.</MpBannerDescription>
            </MpBanner>
          </div>
        </template>

        <MpCheckbox :is-checked="reIncludeExtended" @update:is-checked="(v) => (reIncludeExtended = v)">
          <MpFlex align="center" gap="2">
            Re-include employees with extended employment period
            <MpBadge type="critical" size="sm">New</MpBadge>
          </MpFlex>
          <template #description>
            Employees whose employment period is extended via an approved transfer will be added to a new review timeframe in the same cycle.
          </template>
        </MpCheckbox>
      </div>

      <!-- ── Review methods ──────────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Review methods</MpText>
        <MpText size="label" color="text.secondary">
          Select the review method that you want to provide to your employees.
        </MpText>
      </div>
      <div :class="css({ display: 'flex', flexDirection: 'column', gap: '0' })">
        <div :class="toggleRow">
          <MpToggle :is-checked="methodManager" @update:is-checked="(v) => (methodManager = v)">Manager review</MpToggle>
          <MpButton variant="secondary" :is-disabled="!methodManager" @click="openMethodDrawer('Manager review')">Manage</MpButton>
        </div>
        <div :class="toggleRow">
          <MpToggle :is-checked="method360" @update:is-checked="(v) => (method360 = v)">360-degree review</MpToggle>
          <MpButton variant="secondary" :is-disabled="!method360" @click="openMethodDrawer('360-degree review')">Manage</MpButton>
        </div>
        <div :class="toggleRow">
          <MpToggle :is-checked="methodTeam" @update:is-checked="(v) => (methodTeam = v)">Team review</MpToggle>
          <MpButton variant="secondary" :is-disabled="!methodTeam" @click="openMethodDrawer('Team review')">Manage</MpButton>
        </div>
        <div :class="toggleRow">
          <MpToggle :is-checked="methodSelf" @update:is-checked="(v) => (methodSelf = v)">Self review</MpToggle>
          <MpButton variant="secondary" :is-disabled="!methodSelf" @click="openMethodDrawer('Self review')">Manage</MpButton>
        </div>
      </div>

      <!-- Review methods validation -->
      <MpText v-if="noMethodSelected" :class="[errorText, css({ paddingTop: '2' })]">
        You must select at least one review method
      </MpText>
      <MpText v-else-if="unconfiguredMethods.length" :class="[errorText, css({ paddingTop: '2' })]">
        You must set up {{ unconfiguredMethods.map(m => m.name).join(', ') }}. Please open Manage to configure
      </MpText>

      <!-- Use weight — appears once 2+ methods are enabled -->
      <template v-if="useMethodWeightAvailable">
        <MpFlex :class="css({ paddingTop: '4' })">
          <MpCheckbox :is-checked="useMethodWeight" @update:is-checked="(v) => (useMethodWeight = v)">
            Use weight
            <template #description>
              Your review score is calculated from the weights you set.
            </template>
          </MpCheckbox>
        </MpFlex>
        <div v-if="useMethodWeight" :class="css({ marginTop: '3', marginLeft: '8' })">
          <div v-for="m in weightableMethods" :key="m.key" :class="weightRow">
            <MpText size="label" color="text.default">{{ m.name }}</MpText>
            <MpInputGroup :class="css({ width: '104px' })">
              <MpInput v-model="methodWeights[m.key]" type="number" />
              <MpInputRightAddon>%</MpInputRightAddon>
            </MpInputGroup>
          </div>
          <MpFlex justify="flex-end" :class="css({ paddingTop: '2' })">
            <MpText size="label" :class="weightTotalInvalid ? errorText : css({ color: 'text.secondary' })">{{ totalMethodWeight }}% of 100%</MpText>
          </MpFlex>
          <MpText v-if="weightTotalInvalid" :class="errorText">Total weight must be 100%</MpText>
        </div>
      </template>

      <!-- ── Publish score after ─────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Publish score after</MpText>
        <MpText size="label" color="text.secondary">
          Choose when the final review score becomes visible.
        </MpText>
      </div>
      <div :class="fields">
        <MpRadio
          v-for="opt in publishScoreOptions"
          :key="opt.value"
          name="publish-score-after"
          :value="opt.value"
          :is-checked="publishScoreAfter === opt.value"
          @update:is-checked="publishScoreAfter = opt.value"
        >
          {{ opt.label }}
        </MpRadio>
      </div>

      <!-- ── Score adjustment ────────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Score adjustment</MpText>
        <MpText size="label" color="text.secondary">
          Automatically adjust the final score based on attendance, time off, or reprimand data.
        </MpText>
      </div>
      <div :class="fields">
        <div :class="toggleRowPlain">
          <MpToggle :is-checked="deductionScore" @update:is-checked="(v) => (deductionScore = v)">
            Score deduction
            <template #description>
              Deduct points from the final score based on attendance, time off, and reprimand data.
            </template>
          </MpToggle>
          <MpButton variant="secondary" :is-disabled="!deductionScore">Manage</MpButton>
        </div>
      </div>

      <!-- ── Review outcome ──────────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Review outcome</MpText>
        <MpText size="label" color="text.secondary">
          Decide whether reviewers can determine an employee's employment status after completing the review.
        </MpText>
      </div>
      <div :class="fields">
        <MpCheckbox :is-checked="reviewerCanDecide" @update:is-checked="(v) => (reviewerCanDecide = v)">
          Reviewer can decide the employment status
        </MpCheckbox>
        <MpCheckbox :is-checked="lockReview" @update:is-checked="(v) => (lockReview = v)">
          Lock review after submission
        </MpCheckbox>
      </div>

      <!-- ── Footer ─────────────────────────────────────────────────── -->
      <div :class="footerBar">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="primary" @click="onSave">Save</MpButton>
      </div>

    </div>

    <ReviewMethodDrawer
      v-model:is-open="methodDrawerOpen"
      :method="activeMethodLabel"
      :manager-active="methodManager"
      @saved="onMethodConfigured"
    />
  </div>
</template>
