<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Import competency results
  Token mode: Pixel 2.4

  Layout:
    - Page title "Import competency results" with 3 tabs OUTSIDE the stage
      (teleported to #page-tabs in layouts/default.vue): Generate template,
      Upload results, Import history.
    - Generate template: 12-col form.
        • Assessment context — 2 radio boxes (Current / Future job position)
          + Job position select.
        • Assessment details — Vendor input (0/60) + Employee assessed
          multi-select.
        • Footer: Cancel (ghost) · Request template (primary).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpInput,
  MpInputTag,
  MpText,
  MpRadio,
  MpCheckbox,
  MpFormControl,
  MpFormLabel,
  MpFormHelpText,
  MpFormErrorMessage,
  toast,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES, employeeMeta } from '~/utils/employees'

definePageMeta({ title: 'Import competency results', layout: 'default' })

// ─── Tabs (outside the stage) ────────────────────────────────────────────────
type TabKey = 'generate' | 'upload' | 'history'
const tabs: { key: TabKey; label: string }[] = [
  { key: 'generate', label: 'Generate template' },
  { key: 'upload', label: 'Upload results' },
  { key: 'history', label: 'Import history' },
]
const activeTab = ref<TabKey>('generate')

// ─── Copy ──────────────────────────────────────────────────────────────────────
const VENDOR_MAX = 60

// ─── Option data (mock) ─────────────────────────────────────────────────────────
const jobPositionOptions = [
  { value: 'product-manager', label: 'Product Manager' },
  { value: 'engineering-manager', label: 'Engineering Manager' },
  { value: 'software-engineer', label: 'Software Engineer' },
  { value: 'ux-designer', label: 'UX Designer' },
  { value: 'data-analyst', label: 'Data Analyst' },
  { value: 'sales-executive', label: 'Sales Executive' },
]

// Scope attributes are multi-select (checkboxes): each ticked attribute reveals
// its own value select below. `base` is the label under "Current job position";
// under "Future job position" it becomes "Target job level" etc. (see ctxLabel).
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

const SCOPE_ATTRS = [
  { key: 'job-level', base: 'Job level', options: jobLevelOptions },
  { key: 'job-grade', base: 'Job grade', options: gradeOptions },
  { key: 'job-class', base: 'Job class', options: classOptions },
] as const

// Employee assessed pulls from the shared subordinate master (coherent mock).
const employeeSuggestions = EMPLOYEES.map(e => ({ id: e.id, label: e.name, value: e.id, meta: employeeMeta(e) }))

// ─── Form state (Generate template) ──────────────────────────────────────────────
const assessmentContext = ref<'current' | 'future'>('current')
const jobPosition = ref('')
const scopeChecked = reactive<Record<string, boolean>>({ 'job-level': false, 'job-grade': false, 'job-class': false })
const scopeValues = reactive<Record<string, string>>({ 'job-level': '', 'job-grade': '', 'job-class': '' })
const vendor = ref('')
const selectedEmployees = ref<string[]>([])

const vendorCount = computed(() => vendor.value.length)

// Future context prefixes labels with "Target": "Job position" → "Target job position".
const isFuture = computed(() => assessmentContext.value === 'future')
function ctxLabel(base: string) {
  return isFuture.value ? `Target ${base.toLowerCase()}` : base
}

// The scope attributes currently ticked (drives the dependent value selects).
const checkedAttrs = computed(() => SCOPE_ATTRS.filter(a => scopeChecked[a.key]))
// Un-ticking an attribute clears its chosen value.
function toggleScope(key: string, on: boolean) {
  scopeChecked[key] = on
  if (!on) scopeValues[key] = ''
}

function onEmployeesChange(data: { value?: string; text?: string }[]) {
  selectedEmployees.value = data.map(d => d.value ?? d.text ?? '').filter(Boolean)
}

// ─── Validation ──────────────────────────────────────────────────────────────────
const submitted = ref(false)
const jobPositionInvalid = computed(() => submitted.value && !jobPosition.value)
const scopeValueInvalid = (key: string) => submitted.value && scopeChecked[key] && !scopeValues[key]
const vendorInvalid = computed(() => submitted.value && !vendor.value.trim())
const employeesInvalid = computed(() => submitted.value && selectedEmployees.value.length === 0)

function isValid(): boolean {
  return !!jobPosition.value
    && checkedAttrs.value.every(a => !!scopeValues[a.key])
    && !!vendor.value.trim()
    && selectedEmployees.value.length > 0
}

// Buttons are never disabled (project rule): validate on click and surface a
// toast + inline errors when something is missing.
function onRequestTemplate() {
  submitted.value = true
  if (!isValid()) {
    toast.notify({
      id: 'import-template-invalid',
      position: 'top-center',
      variant: 'danger',
      title: 'Complete the required fields',
      description: 'Fill in job position, vendor, and at least one employee before requesting the template.',
    })
    return
  }
  toast.notify({
    id: 'import-template-requested',
    position: 'top-center',
    variant: 'success',
    title: 'Template requested',
    description: 'Your assessment template is being generated and will appear under Import history.',
  })
  activeTab.value = 'history'
}

function onCancel() {
  navigateTo('/talents/competencies')
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItem = css({
  display: 'inline-flex', alignItems: 'center',
  paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400',
  color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
  _hover: { color: 'text.default' },
})
const tabItemActive = css({ color: 'text.brand', fontWeight: '600', borderBottomColor: 'border.brand' })

// 12-column form grid (mirrors create.vue).
const formColumn = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', columnGap: '6', rowGap: '4' })
const span6 = css({ gridColumn: { base: '1 / -1', lg: '1 / span 6' } })
const span3 = css({ gridColumn: { base: '1 / -1', lg: '1 / span 3' } })
const span12 = css({ gridColumn: '1 / -1' })

const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '6', marginBottom: '3' })
// First section sits right under the stage padding — no extra top margin.
const sectionHeaderFirst = css({ display: 'flex', flexDirection: 'column', gap: '1', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const counterText = css({ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' })

// Radio boxes — two selectable bordered cards, side by side.
const radioRow = css({ display: 'flex', gap: '4' })
const radioBox = css({
  flex: '1', display: 'flex',
  padding: '4', borderRadius: 'md',
  border: '1px solid', borderColor: 'border.default', background: 'background.stage',
  cursor: 'pointer', transition: 'border-color 0.12s ease, background 0.12s ease',
  _hover: { borderColor: 'border.hover' },
})
const radioBoxActive = css({ borderColor: 'border.brand', background: 'background.brand.subtle' })

// Scope-value select: sits under its checkbox, indented to line up with the
// checkbox label text (checkbox box width + gap). marginBottom + the column's
// 12px flex gap add up to a 20px gap before the next checkbox.
const scopeValueSlot = css({ paddingLeft: '6', paddingTop: '2', marginBottom: '2' })
</script>

<template>
  <!-- Tabs live outside the stage, teleported to #page-tabs in the layout -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        :class="[tabItem, activeTab === t.key && tabItemActive]"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>
  </Teleport>

  <!-- ═════════════════ Generate template ═════════════════ -->
  <div v-if="activeTab === 'generate'" :class="formColumn">

    <!-- ── Assessment context ─────────────────────────────────── -->
    <div :class="[sectionHeaderFirst, span12]">
      <MpText as="h2" :class="h2Class">Assessment context</MpText>
      <MpText size="label" :class="captionText">Choose which role the competencies are assessed against.</MpText>
    </div>

    <div :class="[radioRow, span6]">
      <label :class="[radioBox, assessmentContext === 'current' && radioBoxActive]" @click="assessmentContext = 'current'">
        <MpRadio
          name="assessment-context"
          value="current"
          :is-checked="assessmentContext === 'current'"
          @update:is-checked="assessmentContext = 'current'"
        >
          Current job position
          <template #description>Assess competency in their current role</template>
        </MpRadio>
      </label>
      <label :class="[radioBox, assessmentContext === 'future' && radioBoxActive]" @click="assessmentContext = 'future'">
        <MpRadio
          name="assessment-context"
          value="future"
          :is-checked="assessmentContext === 'future'"
          @update:is-checked="assessmentContext = 'future'"
        >
          Future job position
          <template #description>Assess competency for a role they’re being prepared for</template>
        </MpRadio>
      </label>
    </div>

    <!-- Job position (label becomes "Target job position" for future context) -->
    <MpFormControl id="job-position" :is-required="true" :is-invalid="jobPositionInvalid" :class="span3">
      <MpFormLabel>{{ ctxLabel('Job position') }}</MpFormLabel>
      <PxSelectPopover
        v-model="jobPosition"
        :options="jobPositionOptions"
        :placeholder="`Select ${ctxLabel('Job position').toLowerCase()}`"
        :width="'100%'"
        searchable
        :search-placeholder="`Search ${ctxLabel('Job position').toLowerCase()}...`"
      />
      <MpFormErrorMessage>Select a {{ ctxLabel('Job position').toLowerCase() }}.</MpFormErrorMessage>
    </MpFormControl>

    <!-- Scope attribute — multi-select via checkboxes; a ticked attribute reveals
         its value select directly underneath, indented to line up with the label. -->
    <MpFormControl id="scope-attribute" :class="span6">
      <MpFormLabel>Scope attribute</MpFormLabel>
      <MpFlex direction="column" gap="3" :class="css({ paddingTop: '1' })">
        <div v-for="attr in SCOPE_ATTRS" :key="attr.key">
          <MpCheckbox
            :is-checked="scopeChecked[attr.key]"
            @update:is-checked="toggleScope(attr.key, $event)"
          >
            {{ ctxLabel(attr.base) }}
          </MpCheckbox>
          <div v-if="scopeChecked[attr.key]" :class="scopeValueSlot">
            <MpFormControl :id="`scope-value-${attr.key}`" :is-required="true" :is-invalid="scopeValueInvalid(attr.key)">
              <PxSelectPopover
                v-model="scopeValues[attr.key]"
                :options="attr.options"
                :placeholder="`Select ${ctxLabel(attr.base).toLowerCase()}`"
                :width="'264px'"
                searchable
                :search-placeholder="`Search ${ctxLabel(attr.base).toLowerCase()}...`"
              />
              <MpFormErrorMessage>Select a {{ ctxLabel(attr.base).toLowerCase() }}.</MpFormErrorMessage>
            </MpFormControl>
          </div>
        </div>
      </MpFlex>
    </MpFormControl>

    <!-- ── Assessment details ─────────────────────────────────── -->
    <div :class="[sectionHeader, span12]">
      <MpText as="h2" :class="h2Class">Assessment details</MpText>
    </div>

    <!-- Vendor (0/60) -->
    <MpFormControl id="vendor" :is-required="true" :is-invalid="vendorInvalid" :class="span6">
      <div :class="labelRow">
        <MpFormLabel>Vendor</MpFormLabel>
        <MpText size="label-small" :class="counterText">{{ vendorCount }} / {{ VENDOR_MAX }}</MpText>
      </div>
      <MpInput v-model="vendor" placeholder="Vendor name" :maxlength="VENDOR_MAX" :class="css({ width: '100%' })" />
      <MpFormErrorMessage>Vendor is required.</MpFormErrorMessage>
    </MpFormControl>

    <!-- Employee assessed -->
    <MpFormControl id="employee-assessed" :is-required="true" :is-invalid="employeesInvalid" :class="span6">
      <MpFormLabel>Employee assessed</MpFormLabel>
      <MpInputTag
        id="employee-assessed-input"
        :placeholder="'Select employees'"
        :suggestions="employeeSuggestions"
        suggestion-key="label"
        :is-show-suggestions="true"
        :is-enable-create-new-tag="false"
        :is-show-icon-chevron-down="true"
        :is-invalid="employeesInvalid"
        use-portal
        @change="onEmployeesChange"
      />
      <MpFormHelpText>You can select multiple employees to include in the template.</MpFormHelpText>
      <MpFormErrorMessage>Select at least one employee.</MpFormErrorMessage>
    </MpFormControl>

    <!-- Footer — action buttons align to the 6-col form width -->
    <MpFlex justify="flex-end" gap="2" :class="[span6, css({ paddingTop: '6' })]">
      <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
      <MpButton variant="primary" @click="onRequestTemplate">Request template</MpButton>
    </MpFlex>
  </div>

  <!-- ═════════════════ Upload results (blank — to be designed) ═════════════════ -->
  <div v-else-if="activeTab === 'upload'" />

  <!-- ═════════════════ Import history (blank — to be designed) ═════════════════ -->
  <div v-else />
</template>
