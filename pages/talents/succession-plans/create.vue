<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Create succession plan (Step 2: Competency criteria)
  Source: Flexible Competency Assignment PRD — US3 (Succession Plan Step 2)
  Token mode: Pixel 2.4
  Patterns used: layout-shell, form-view, conditional adaptive picker, info notice
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️ ASSUMED LAYOUT — no current-UI reference for the existing Succession Plan Step 2
     was available. Structure (read-only position context + adaptive picker + criteria
     placeholder + Back/Next) is a reasonable Mekari form; DESIGN MUST VALIDATE.

  ⚠️ STEP INDICATOR DEVIATION — @mekari/pixel3 v1.0.12 ships NO stepper component.
     The numbered step indicator below is a minimal inline placeholder. Replace with
     the official Pixel stepper when available, and reconcile against the real
     succession create flow. Do NOT treat this indicator as a finished pattern.

  CORE PRD BEHAVIOR (the actual change): the Step-2 attribute picker ADAPTS to the
  scoping attribute of the competency assignment linked to the selected job position:
    - assignment scoped by job level → "Select job level" (existing behavior)
    - scoped by grade  → "Select grade";  job level picker hidden
    - scoped by class  → "Select class";  job level picker hidden
    - unscoped         → "Select job level" (existing behavior)
    - no assignment    → no picker; informational notice (PxNoAssignmentNotice)

  DEMO CONTROL: a "Linked assignment scope" switcher (top of page) simulates what the
  server would resolve, so all variants are reviewable. Remove when wired to real data.

  COPY DEFAULTS (PRD specifies intent, not strings — iterate freely).
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpIcon,
  MpFormControl,
  MpFormLabel,
  MpFormHelpText,
  css,
} from '@mekari/pixel3'

definePageMeta({
  title: 'Create succession plan',
  layout: 'default',
  breadcrumb: { label: 'Succession plans', to: '/talents/succession-plans' },
})

const router = useRouter()

// ─── Demo control: simulated resolved assignment scope for the chosen position ───
type Scope = 'job-level' | 'grade' | 'class' | 'unscoped' | 'none'
const linkedScope = ref<Scope>('job-level')
const scopeSwitcher = [
  { value: 'job-level', label: 'Scoped: job level' },
  { value: 'grade', label: 'Scoped: grade' },
  { value: 'class', label: 'Scoped: class' },
  { value: 'unscoped', label: 'Unscoped' },
  { value: 'none', label: 'No assignment' },
]

// ─── Step-2 picker state ─────────────────────────────────────────────────────────
const attributeValue = ref('')
watch(linkedScope, () => { attributeValue.value = '' })

const jobLevelOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'senior-manager', label: 'Senior Manager' },
  { value: 'director', label: 'Director' },
]
const gradeOptions = Array.from({ length: 6 }, (_, i) => ({ value: `grade-${i + 1}`, label: `Grade ${i + 1}` }))
const classOptions = ['A', 'B', 'C', 'D'].map(c => ({ value: `class-${c.toLowerCase()}`, label: `Class ${c}` }))

// Resolve picker dimension from the linked assignment's scope.
const pickerDimension = computed<'job-level' | 'grade' | 'class' | null>(() => {
  switch (linkedScope.value) {
    case 'grade': return 'grade'
    case 'class': return 'class'
    case 'job-level':
    case 'unscoped': return 'job-level'
    default: return null // 'none'
  }
})
const pickerOptions = computed(() => {
  switch (pickerDimension.value) {
    case 'grade': return gradeOptions
    case 'class': return classOptions
    case 'job-level': return jobLevelOptions
    default: return []
  }
}) as ComputedRef<{ value: string; label: string }[]>

const dimensionLabel = computed(() => ({
  'job-level': 'Job level',
  grade: 'Grade',
  class: 'Class',
}[pickerDimension.value ?? 'job-level']))
const dimensionWord = computed(() => dimensionLabel.value.toLowerCase())
const noticeAttribute = computed<'job level' | 'grade' | 'class' | ''>(() =>
  pickerDimension.value === 'grade' ? 'grade' : pickerDimension.value === 'class' ? 'class' : '',
)

const hasAssignment = computed(() => linkedScope.value !== 'none')

function onBack() { router.push('/talents/succession-plans') }
function onNext() { router.push('/talents/succession-plans') }

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({
  gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' },
  display: 'flex', flexDirection: 'column', gap: '4',
})
const selectWidth = '320px'

// Minimal placeholder step indicator (NO Pixel stepper exists in this version)
const stepRow = css({ display: 'flex', alignItems: 'center', gap: '2', marginBottom: '2' })
const stepDotBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '24px', height: '24px', borderRadius: 'full', fontSize: '12px', fontWeight: '600',
} as const
const stepDotDone = css({ ...stepDotBase, background: 'background.brand.bold', color: 'text.inverse' })
const stepDotActive = css({ ...stepDotBase, background: 'background.brand.bold', color: 'text.inverse' })
const stepDotIdle = css({ ...stepDotBase, border: '1px solid', borderColor: 'border.default', color: 'text.secondary' })
const stepLine = css({ width: '32px', height: '1px', background: 'border.default' })
const stepLabelActive = css({ color: 'text.link', fontWeight: '600', fontSize: '14px' })
const stepLabelIdle = css({ color: 'text.secondary', fontSize: '14px' })

const readonlyField = css({
  display: 'flex', alignItems: 'center', minHeight: '40px', width: selectWidth, paddingInline: '3',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'md',
  background: 'background.surface', color: 'text.secondary',
})
const criteriaBlock = css({
  display: 'flex', alignItems: 'center', minHeight: '64px', paddingInline: '4', width: '100%',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'md', background: 'background.surface',
})
const divider = css({ height: '1px', background: 'border.default', marginTop: '4' })
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '4', marginBottom: '2' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2', paddingTop: '6' })
const captionText = css({ color: 'text.secondary' })
const demoBox = css({
  display: 'flex', flexDirection: 'column', gap: '2', padding: '3', marginBottom: '2',
  border: '1px dashed', borderColor: 'border.brand', borderRadius: 'md', background: 'background.surface',
})
</script>

<template>
  <div :class="gridArea">
    <div :class="formColumn">

      <!-- ═════ DEMO control — remove when wired to real assignment data ═════ -->
      <div :class="demoBox">
        <MpText size="label-small" weight="semiBold" :class="css({ color: 'text.link' })">
          DEMO — linked assignment scope (simulates server resolution)
        </MpText>
        <PxSelectPopover v-model="linkedScope" :options="scopeSwitcher" :width="'240px'" />
      </div>

      <!-- ═════ Step indicator (placeholder — no Pixel stepper in v1.0.12) ═════ -->
      <div :class="stepRow">
        <span :class="stepDotDone"><MpIcon name="check" :class="css({ width: '14px', height: '14px' })" /></span>
        <MpText :class="stepLabelIdle">Plan details</MpText>
        <span :class="stepLine" />
        <span :class="stepDotActive">2</span>
        <MpText :class="stepLabelActive">Competency criteria</MpText>
        <span :class="stepLine" />
        <span :class="stepDotIdle">3</span>
        <MpText :class="stepLabelIdle">Review</MpText>
      </div>

      <!-- ═════ Read-only position context (carried from Step 1) ═════ -->
      <MpFormControl id="position-context" :is-read-only="true">
        <MpFormLabel>Job position</MpFormLabel>
        <div :class="readonlyField">
          <MpText size="label">Product Manager</MpText>
        </div>
        <MpFormHelpText>Selected in Step 1.</MpFormHelpText>
      </MpFormControl>

      <!-- ═════ Adaptive attribute picker — follows the assignment's scope ═════ -->
      <MpFormControl v-if="hasAssignment" :id="`attr-${pickerDimension}`">
        <MpFormLabel>{{ dimensionLabel }}</MpFormLabel>
        <PxSelectPopover
          v-model="attributeValue"
          :options="pickerOptions"
          :placeholder="`Select ${dimensionWord}`"
          :width="selectWidth"
          searchable
        />
        <MpFormHelpText>
          The picker dimension follows the competency assignment linked to this job position.
        </MpFormHelpText>
      </MpFormControl>

      <!-- No assignment → informational notice, no picker (shared US2/US4 component) -->
      <PxNoAssignmentNotice v-else :attribute="noticeAttribute" />

      <!-- ═════ Competency criteria (resolved from the matched assignment) ═════ -->
      <div :class="divider" />
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Competency criteria</MpText>
        <MpText size="label" :class="captionText">
          Target competencies are resolved from the matched assignment.
        </MpText>
      </div>
      <div :class="criteriaBlock">
        <MpText size="label" :class="captionText">
          <template v-if="hasAssignment">
            Competency groups and targets for the selected {{ dimensionWord }} will appear here.
          </template>
          <template v-else>
            No competency target to apply — there is no assignment for this job position.
          </template>
        </MpText>
      </div>

      <!-- ═════ Footer ═════ -->
      <div :class="footerBar">
        <MpButton variant="ghost" @click="onBack">Back</MpButton>
        <MpButton variant="primary" @click="onNext">Next</MpButton>
      </div>

    </div>
  </div>
</template>
