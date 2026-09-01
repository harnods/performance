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
  MpBanner,
  MpBannerIcon,
  MpBannerTitle,
  MpBannerDescription,
  MpBannerCloseButton,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES, employeeMeta } from '~/utils/employees'
import { scopeOptions, type ScopeType } from '~/utils/competency'

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

const SCOPE_ATTR_LABEL: Record<ScopeType, string> = {
  'job-level': 'Job level',
  'grade': 'Job grade',
  'class': 'Job class',
}

// ─── Data (from the repo's mini-DB, not hardcoded) ───────────────────────────────
// Job positions come from the employee master, so the dropdown always matches
// real roles. The scope attribute + assessed values come from the competency
// ASSIGNMENT of the picked position — never chosen freely — so a template can
// only be generated for a role that actually has an assessment defined.
const { assignments } = useCompetencyStore()
const { addDownload } = useActivityMonitor()

const jobPositionOptions = [...new Set(EMPLOYEES.map(e => e.title))]
  .sort((a, b) => a.localeCompare(b))
  .map(title => ({ value: title, label: title }))

// ─── Form state (Generate template) ──────────────────────────────────────────────
const assessmentContext = ref<'current' | 'future'>('current')
const jobPosition = ref('')
const scopeValue = ref('')
const vendor = ref('')
const selectedEmployees = ref<string[]>([])

// Employee assessed. For a CURRENT-position assessment only employees who
// actually hold that job position can be assessed; for a FUTURE-position
// (succession) assessment the person is being prepared for a role they don't
// hold yet, so the whole directory stays available.
const assessableEmployees = computed(() =>
  assessmentContext.value === 'current' && jobPosition.value
    ? EMPLOYEES.filter(e => e.title === jobPosition.value)
    : EMPLOYEES,
)
const employeeSuggestions = computed(() =>
  assessableEmployees.value.map(e => ({ id: e.id, label: e.name, value: e.id, meta: employeeMeta(e) })),
)
const restrictEmployeesToPosition = computed(() => assessmentContext.value === 'current' && !!jobPosition.value)

const vendorCount = computed(() => vendor.value.length)

// Future context prefixes labels with "Target": "Job position" → "Target job position".
const isFuture = computed(() => assessmentContext.value === 'future')
function ctxLabel(base: string) {
  return isFuture.value ? `Target ${base.toLowerCase()}` : base
}

// The competency assignment that covers the picked job position. A position can
// appear in a scoped assignment (job level/grade/class) and/or an unscoped
// baseline ("All employees") — prefer the scoped one, since that carries the
// scope attribute the template is generated against.
const positionAssignment = computed(() => {
  if (!jobPosition.value) return undefined
  const matches = assignments.value.filter(a => a.positions.includes(jobPosition.value))
  return matches.find(a => a.scope !== null) ?? matches[0]
})
const hasAssignment = computed(() => !!positionAssignment.value)
// The scope attribute is dictated by the assignment (read-only), not picked.
const scopeType = computed<ScopeType | null>(() => positionAssignment.value?.scope ?? null)
const scopeAttrLabel = computed(() => (scopeType.value ? ctxLabel(SCOPE_ATTR_LABEL[scopeType.value]) : ''))
// Only the scope values the assignment actually assesses are selectable.
const scopeValueOptions = computed(() => {
  const a = positionAssignment.value
  if (!a || !a.scope) return []
  const values = new Set(a.values)
  return scopeOptions(a.scope).filter(o => values.has(o.value))
})
// A scope value only needs to be picked when the assignment is scoped (an
// unscoped baseline covers "All employees" — nothing to pick).
const needsScopeValue = computed(() => hasAssignment.value && scopeType.value !== null)

// Future (succession) context only: on top of the one scope attribute the
// assignment predefines (scopeType), HR can optionally narrow further by
// whichever of the OTHER two attributes aren't already covered — e.g. an
// assignment scoped by Job class leaves Job grade + Job level as two
// independent, optional checkboxes. Each checkbox reveals its own scope
// picker (unconstrained by the assignment, since the assignment doesn't
// cover these dimensions) once checked.
const ALL_SCOPE_TYPES: ScopeType[] = ['job-level', 'grade', 'class']
const extraScopeTypes = computed<ScopeType[]>(() =>
  isFuture.value && needsScopeValue.value ? ALL_SCOPE_TYPES.filter(t => t !== scopeType.value) : [],
)
const extraScopeChecked = reactive<Record<ScopeType, boolean>>({ 'job-level': false, grade: false, class: false })
const extraScopeValue = reactive<Record<ScopeType, string>>({ 'job-level': '', grade: '', class: '' })

// Changing the position (or switching current/future) changes the scope
// values that apply, who can be assessed, and which extra scope checkboxes
// are even offered — reset all of it so nothing stale carries over.
watch([jobPosition, assessmentContext], () => {
  scopeValue.value = ''
  selectedEmployees.value = []
  for (const t of ALL_SCOPE_TYPES) { extraScopeChecked[t] = false; extraScopeValue[t] = '' }
})

function onEmployeesChange(data: { value?: string; text?: string }[]) {
  selectedEmployees.value = data.map(d => d.value ?? d.text ?? '').filter(Boolean)
}

// Success banner shown after a template request (dismissible).
const showBanner = ref(false)
const bannerText = ref('')

// ─── Validation (inline only — never a toast, per the copy library) ───────────────
const submitted = ref(false)
// Selected a role with no competency assignment → template can't be generated.
// Surfaced immediately (not gated on submit) since it explains why import is blocked.
const noAssignment = computed(() => !!jobPosition.value && !hasAssignment.value)
const jobPositionInvalid = computed(() => noAssignment.value || (submitted.value && !jobPosition.value))
const scopeValueInvalid = computed(() => submitted.value && needsScopeValue.value && !scopeValue.value)
const employeesInvalid = computed(() => submitted.value && selectedEmployees.value.length === 0)
function extraScopeInvalid(t: ScopeType) {
  return submitted.value && extraScopeChecked[t] && !extraScopeValue[t]
}

function isValid(): boolean {
  return !!jobPosition.value
    && hasAssignment.value
    && (!needsScopeValue.value || !!scopeValue.value)
    && selectedEmployees.value.length > 0
    && extraScopeTypes.value.every(t => !extraScopeChecked[t] || !!extraScopeValue[t])
}

// Buttons are never disabled (project rule): validate on click and surface inline
// errors. Errors never use a toast — only the success confirmation does.
function onRequestTemplate() {
  submitted.value = true
  if (!isValid()) return
  // Generating a template produces a downloadable file — hand it to the header
  // activity monitor (Download tab), which pops open so the user can grab the
  // finished template right there once it's ready.
  const slug = jobPosition.value.toLowerCase().replace(/\s+/g, '-')
  const scope = scopeValue.value ? `-${scopeValue.value}` : ''
  const extras = extraScopeTypes.value
    .filter(t => extraScopeChecked[t] && extraScopeValue[t])
    .map(t => `-${extraScopeValue[t]}`)
    .join('')
  addDownload(`competency-template-${slug}${scope}${extras}.xlsx`)
  // Confirm with a dismissible success banner at the top of the tab, captured at
  // submit time so it holds even if the form is edited afterwards.
  const n = selectedEmployees.value.length
  bannerText.value = `${jobPosition.value} template - ${n} ${n === 1 ? 'employee' : 'employees'}`
  showBanner.value = true
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

// Extra scope checkboxes (future/succession) — vertically stacked, each
// followed immediately by its own revealed field when checked.
const extraScopeGroup = css({ display: 'flex', flexDirection: 'column', gap: '4' })
// extraScopeGroup's flex gap (16px) spaces every child uniformly, but the
// gap from a checkbox down to its OWN revealed field should read tighter
// (8px) than the gap up to the NEXT checkbox row — pull it up with a
// negative margin rather than restructuring the group into per-row wrappers.
const extraScopeIndent = css({ marginLeft: '8', marginTop: '-2' })

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
const radioBoxActive = css({ borderColor: 'border.brand', background: 'background.brand' })

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

    <!-- Success banner after a template request (dismissible) -->
    <MpBanner v-if="showBanner" variant="success" :class="span12">
      <MpBannerIcon />
      <MpBannerTitle>Template request submitted</MpBannerTitle>
      <MpBannerDescription>{{ bannerText }}</MpBannerDescription>
      <MpBannerCloseButton @click="showBanner = false" />
    </MpBanner>

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

    <!-- Job position — sourced from the employee master (DB), so it matches real
         roles and their competency assignments. -->
    <MpFormControl id="job-position" :is-required="true" :is-invalid="jobPositionInvalid" :class="span3">
      <MpFormLabel>{{ ctxLabel('Job position') }}</MpFormLabel>
      <PxSelectPopover
        v-model="jobPosition"
        :options="jobPositionOptions"
        :placeholder="`Select ${ctxLabel('Job position').toLowerCase()}`"
        :width="'100%'"
        search-on-field
      />
      <MpFormErrorMessage v-if="noAssignment">This job position has no competency assignment. Please create one before generating a template</MpFormErrorMessage>
      <MpFormErrorMessage v-else>You must select a {{ ctxLabel('Job position').toLowerCase() }}</MpFormErrorMessage>
    </MpFormControl>

    <!-- Scope value — the scope attribute (job level/grade/class) is dictated by
         the position's competency assignment and is reflected in this field's
         label; only the values that assignment actually assesses are selectable.
         Shown only for a scoped assignment (an unscoped "All employees" baseline
         has no scope value to pick). -->
    <MpFormControl v-if="needsScopeValue" id="scope-value" :is-required="true" :is-invalid="scopeValueInvalid" :class="span3">
      <MpFormLabel>{{ scopeAttrLabel }}</MpFormLabel>
      <PxSelectPopover
        v-model="scopeValue"
        :options="scopeValueOptions"
        :placeholder="`Select ${scopeAttrLabel.toLowerCase()}`"
        :width="'100%'"
        search-on-field
      />
      <MpFormHelpText>Only values assessed for this position are available.</MpFormHelpText>
      <MpFormErrorMessage>You must select a {{ scopeAttrLabel.toLowerCase() }}</MpFormErrorMessage>
    </MpFormControl>

    <!-- Extra scope narrowing (future/succession only) — the assignment
         already predefines one scope attribute above; these are the other
         two, each an independent optional checkbox that reveals its own
         picker (indented 32px, matching CycleGeneralForm.vue's checkbox →
         revealed-content indent) once checked. -->
    <div v-if="extraScopeTypes.length" :class="[span12, extraScopeGroup]">
      <template v-for="t in extraScopeTypes" :key="t">
        <MpCheckbox
          :id="`extra-scope-${t}`"
          :is-checked="extraScopeChecked[t]"
          @update:is-checked="(v) => (extraScopeChecked[t] = v)"
        >
          {{ ctxLabel(SCOPE_ATTR_LABEL[t]) }}
        </MpCheckbox>
        <MpFormControl
          v-if="extraScopeChecked[t]"
          :id="`extra-scope-value-${t}`"
          :is-required="true"
          :is-invalid="extraScopeInvalid(t)"
          :class="[span6, extraScopeIndent]"
        >
          <!-- No MpFormLabel — the checkbox directly above already labels
               this row (e.g. "Target job level"); repeating it here read as
               redundant. -->
          <PxSelectPopover
            v-model="extraScopeValue[t]"
            :options="scopeOptions(t)"
            :placeholder="`Select ${ctxLabel(SCOPE_ATTR_LABEL[t]).toLowerCase()}`"
            :width="'100%'"
            search-on-field
          />
          <MpFormErrorMessage>You must select a {{ ctxLabel(SCOPE_ATTR_LABEL[t]).toLowerCase() }}</MpFormErrorMessage>
        </MpFormControl>
      </template>
    </div>

    <!-- ── Assessment details ─────────────────────────────────── -->
    <div :class="[sectionHeader, span12]">
      <MpText as="h2" :class="h2Class">Assessment details</MpText>
    </div>

    <!-- Vendor (0/60) — optional -->
    <MpFormControl id="vendor" :class="span6">
      <div :class="labelRow">
        <MpFormLabel>Competency assessment provider</MpFormLabel>
        <MpText size="label-small" :class="counterText">{{ vendorCount }} / {{ VENDOR_MAX }}</MpText>
      </div>
      <MpInput v-model="vendor" :maxlength="VENDOR_MAX" :class="css({ width: '100%' })" />
    </MpFormControl>

    <!-- Employee assessed -->
    <MpFormControl id="employee-assessed" :is-required="true" :is-invalid="employeesInvalid" :class="span6">
      <MpFormLabel>Employee assessed</MpFormLabel>
      <!-- Keyed by context + position so the chosen chips reset when the
           assessable set changes (a stale employee from another role can't linger). -->
      <MpInputTag
        :key="`${assessmentContext}-${jobPosition}`"
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
      <MpFormHelpText>
        {{ restrictEmployeesToPosition
          ? `Only employees in the ${jobPosition} position can be assessed.`
          : 'You can select multiple employees to include in the template.' }}
      </MpFormHelpText>
      <MpFormErrorMessage>You must select at least one employee</MpFormErrorMessage>
    </MpFormControl>

    <!-- Footer — action buttons align to the 6-col form width -->
    <MpFlex justify="flex-end" gap="2" :class="[span6, css({ paddingTop: '6' })]">
      <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
      <MpButton variant="primary" @click="onRequestTemplate">Request template</MpButton>
    </MpFlex>
  </div>

  <!-- ═════════════════ Upload results ═════════════════ -->
  <CompetencyUploadResults
    v-else-if="activeTab === 'upload'"
    @go-generate="activeTab = 'generate'"
    @uploaded="activeTab = 'history'"
  />

  <!-- ═════════════════ Import history ═════════════════ -->
  <CompetencyImportHistory v-else />
</template>
