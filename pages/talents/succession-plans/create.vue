<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Create succession plan (3-step wizard)
  Replicated from production (talenta-performance:
    src/views/talent-management/succession-pool/components/FormSuccessionPlan.vue
    + FormStep1/2/3.vue). Steps: Employment criteria → Competency criteria →
    Successor talent. Flat form sections per the repo design doc — NO gray
    card/box wrappers around form fields.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpRadio, MpAvatar, MpTooltip,
  MpFormControl, MpFormLabel, MpFormHelpText, MpFormErrorMessage,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpButtonGroup,
  toast, css,
} from '@mekari/pixel3'
import {
  KEY_POSITIONS, ORGANIZATIONS, MIN_SERVICE_LENGTH_OPTIONS, EMPLOYMENT_STATUS_OPTIONS,
  READINESS_OPTIONS, candidateIds,
} from '~/utils/succession'
import { POSITION_INFO, scopeOptions, targetsForScopeValue, type ScopeType } from '~/utils/competency'

definePageMeta({
  title: 'Create succession plan',
  layout: 'default',
  breadcrumb: { label: 'Succession plans', to: '/talents/succession-plans' },
})

const router = useRouter()

const STEPS = ['Position & criteria', 'Competency assessment', 'Successor talent']
const step = ref(0)

// Inline validation: `submitted` flips true when the user tries to advance an
// incomplete step; per-field computeds surface the error under each field.
// Reset when the step advances so the next step starts clean.
const submitted = ref(false)

// ─── Step 1 — employment criteria ─────────────────────────────────────────────
const keyPosition = ref('')
const organization = ref('')
const serviceLength = ref('')
const employeeStatus = ref('')
const keyPositionOptions = KEY_POSITIONS.map(k => ({ value: k.value, label: k.job }))
const orgOptions = ORGANIZATIONS.map(o => ({ value: o, label: o }))
const selectedKeyPosition = computed(() => KEY_POSITIONS.find(k => k.value === keyPosition.value))
// Prod parity: Key position & Organization are independent selects (no auto-fill,
// no cross-filter) — the two fields do not constrain each other.
const keyPositionInvalid = computed(() => submitted.value && !keyPosition.value)
const organizationInvalid = computed(() => submitted.value && !organization.value)

// ─── Step 2 — competency assessment ──────────────────────────────────────────
// The competency standard for a position is resolved from the REAL competency
// data (utils/competency.ts): the position's scope attribute (job level / grade
// / class), the scope values that actually have an assessment, and the
// department's competency groups + target scores. A position with no assessment
// defined shows a no-assignment notice.
const assessmentType = ref<'talenta' | 'manual'>('talenta')
const scopeValue = ref('')
const SCOPE_LABEL: Record<ScopeType, string> = { 'job-level': 'Job level', grade: 'Grade', class: 'Class' }
const assignment = computed(() => {
  const title = selectedKeyPosition.value?.job
  return title ? POSITION_INFO[title] : undefined
})
const hasAssignment = computed(() => !!assignment.value)
const scopeLabel = computed(() => (assignment.value ? SCOPE_LABEL[assignment.value.scope] : ''))
const scopeValueOptions = computed(() => {
  const a = assignment.value
  if (!a) return [] as { value: string, label: string }[]
  return scopeOptions(a.scope).filter(o => a.values.includes(o.value))
})
const scopeValueLabel = computed(() => scopeValueOptions.value.find(o => o.value === scopeValue.value)?.label ?? '')
// Competency targets resolve for the CHOSEN scope value — change it and the
// target column changes (higher scope value → higher targets).
const resolvedTargets = computed(() => {
  const title = selectedKeyPosition.value?.job
  return title && scopeValue.value ? targetsForScopeValue(title, scopeValue.value) : []
})
const scopeValueInvalid = computed(() => submitted.value && hasAssignment.value && !scopeValue.value)
// Changing the key position invalidates the chosen scope value.
watch(keyPosition, () => { scopeValue.value = '' })

// ─── Step 3 — successor talent (optional; can be filled in later) ─────────────
interface Chosen { employeeId: string, readiness: string }
const selectedTalents = ref<Chosen[]>([])
const isPickerOpen = ref(false)
// Only employees matching the Step 1 criteria (service length + employment
// status) are selectable as candidates.
const candidateIdList = computed(() => candidateIds(serviceLength.value, employeeStatus.value))
function openPicker() { isPickerOpen.value = true }
// Drawer returns the full selected id set; merge to preserve readiness already
// set on talents that stay, seed empty readiness for newly added ones.
function onSelectContinue(ids: string[]) {
  const existing = new Map(selectedTalents.value.map(t => [t.employeeId, t]))
  selectedTalents.value = ids.map(id => existing.get(id) ?? { employeeId: id, readiness: '' })
}
function removeTalent(id: string) { selectedTalents.value = selectedTalents.value.filter(t => t.employeeId !== id) }
// Step 3 is optional; if talent IS added, each should carry a readiness.
const readinessInvalid = computed(() => submitted.value && selectedTalents.value.some(t => !t.readiness))

// ─── Navigation / validation ─────────────────────────────────────────────────
// Errors surface inline in the form (never as a toast). `submitted` is flipped
// on each advance attempt and reset once the step passes.
function step1Valid() { return !!keyPosition.value && !!organization.value }
function step2Valid() { return hasAssignment.value && !!scopeValue.value }
function step3Valid() { return selectedTalents.value.every(t => t.readiness) }
function next() {
  submitted.value = true
  if (step.value === 0 && !step1Valid()) return
  if (step.value === 1 && !step2Valid()) return
  submitted.value = false
  step.value = Math.min(step.value + 1, STEPS.length - 1)
}
function back() { submitted.value = false; step.value = Math.max(step.value - 1, 0) }
function cancel() { router.push('/talents/succession-plans') }
function submit() {
  submitted.value = true
  if (!step3Valid()) return
  const kp = selectedKeyPosition.value
  if (!kp) return
  // Persist the new plan to the mini-DB so it shows up in the index/detail.
  useSuccessionStore().addPool({
    keyPositionValue: kp.value,
    keyPosition: kp.job,
    organization: organization.value,
    scopeValue: scopeValue.value,
    assessmentType: assessmentType.value,
    successors: selectedTalents.value.map(t => ({ employeeId: t.employeeId, readiness: t.readiness })),
  })
  const n = selectedTalents.value.length
  toast.notify({ id: 'sp-created', position: 'top-center', variant: 'success', title: `Succession plan created${n ? ` with ${n} successor${n > 1 ? 's' : ''}` : ' — add successor talent anytime'}` })
  router.push('/talents/succession-plans')
}

// ─── Styles (DT 2.4) — flat form sections, no card/box wrappers ────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '6', maxWidth: '860px' })
const section = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const h2Text = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const h3Text = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const sectionCaption = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const reqMark = css({ color: 'text.danger' })
const selectWidth = '360px'
// Step indicator
// Numbered stepper (Pixel variant): outline number circle, connector line to
// the right, label left-aligned below. Active = brand outline + brand label.
const stepRow = css({ display: 'flex', alignItems: 'flex-start', width: '100%' })
const stepItem = css({ flex: '1', display: 'flex', flexDirection: 'column', gap: '2', minWidth: '0' })
const topRow = css({ display: 'flex', alignItems: 'center', width: '100%' })
const stepLine = css({ flex: '1', height: '1px', background: 'border.default', marginInline: '3' })
const dotBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'full', fontSize: '14px', fontWeight: '600', flexShrink: '0' } as const
const dotDone = css({ ...dotBase, background: 'background.brand.bold', color: 'text.inverse' })
const dotActive = css({ ...dotBase, border: '1.5px solid', borderColor: 'border.brand', color: 'text.link', background: 'transparent' })
const dotIdle = css({ ...dotBase, border: '1px solid', borderColor: 'border.default', color: 'text.secondary', background: 'transparent' })
const stepLabelOn = css({ color: 'text.link', fontWeight: '600', fontSize: '14px', textAlign: 'left' })
const stepLabelOff = css({ color: 'text.secondary', fontSize: '14px', textAlign: 'left' })
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2', paddingTop: '4' })
const cellHLeft = css({ paddingTop: '2', paddingBottom: '2', fontSize: '12px', fontWeight: '600', color: 'text.secondary', textAlign: 'left', verticalAlign: 'middle' })
const cellHRight = css({ paddingTop: '2', paddingBottom: '2', fontSize: '12px', fontWeight: '600', color: 'text.secondary', textAlign: 'right', verticalAlign: 'middle' })
const cellB = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Contained table — not full-bleed, so it carries an outer border. The last body
// row drops its bottom border so it doesn't double up with the container border.
const borderedTable = css({
  border: '1px solid',
  borderColor: 'border.default',
  borderRadius: 'md',
  overflow: 'hidden',
  '& tbody tr:last-child td': { borderBottom: 'none' },
})
const nameText = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const subText = css({ fontSize: '12px', color: 'text.secondary' })
// Empty state (docs/empty-state.md)
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
</script>

<template>
  <div :class="page">
    <!-- Step indicator — number on top, label centered below, connectors between -->
    <div :class="stepRow">
      <div v-for="(s, i) in STEPS" :key="s" :class="stepItem">
        <div :class="topRow">
          <span :class="i < step ? dotDone : i === step ? dotActive : dotIdle">
            <MpIcon v-if="i < step" name="check" size="sm" color="text.inverse" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span v-if="i < STEPS.length - 1" :class="stepLine" />
        </div>
        <MpText :class="i === step ? stepLabelOn : stepLabelOff">{{ s }}</MpText>
      </div>
    </div>

    <!-- STEP 1 — Employment criteria -->
    <div v-if="step === 0" :class="section">
      <MpFlex direction="column" gap="1">
        <MpText as="h2" :class="h2Text">Position</MpText>
        <MpText :class="sectionCaption">Choose the position you're planning a successor for, then set the criteria candidates must meet.</MpText>
      </MpFlex>
      <MpFormControl id="key-position" :is-invalid="keyPositionInvalid">
        <MpFormLabel>Key position <MpText as="span" :class="reqMark">*</MpText></MpFormLabel>
        <PxSelectPopover v-model="keyPosition" :options="keyPositionOptions" placeholder="Select key position" :width="selectWidth" searchable />
        <MpFormHelpText>The role you want to prepare a successor for.</MpFormHelpText>
        <MpFormErrorMessage>You must select key position</MpFormErrorMessage>
      </MpFormControl>
      <MpFormControl id="organization" :is-invalid="organizationInvalid">
        <MpFormLabel>Organization <MpText as="span" :class="reqMark">*</MpText></MpFormLabel>
        <PxSelectPopover v-model="organization" :options="orgOptions" placeholder="Select organization" :width="selectWidth" searchable />
        <MpFormHelpText>The organization this position is for.</MpFormHelpText>
        <MpFormErrorMessage>You must select organization</MpFormErrorMessage>
      </MpFormControl>
      <MpFlex direction="column" gap="1" :class="css({ marginTop: '4' })">
        <MpText as="h2" :class="h2Text">Criteria</MpText>
        <MpText :class="sectionCaption">Only employees who match these criteria will appear as candidates.</MpText>
      </MpFlex>
      <MpFormControl id="min-service-length">
        <MpFormLabel>Minimum service length</MpFormLabel>
        <PxSelectPopover v-model="serviceLength" :options="MIN_SERVICE_LENGTH_OPTIONS" placeholder="Select minimum service length" :width="selectWidth" />
      </MpFormControl>
      <MpFormControl id="employment-status">
        <MpFormLabel>Employment status</MpFormLabel>
        <PxSelectPopover v-model="employeeStatus" :options="EMPLOYMENT_STATUS_OPTIONS" placeholder="Select employment status" :width="selectWidth" />
      </MpFormControl>
    </div>

    <div v-if="step === 1" :class="section">
      <MpFlex direction="column" gap="1">
        <MpText as="h2" :class="h2Text">Set competency assessment</MpText>
        <MpText :class="sectionCaption">Set the competency standard candidates must meet for this position.</MpText>
      </MpFlex>
      <MpFormControl id="assessment-type">
        <MpFlex align="center" gap="1">
          <MpFormLabel>Where do candidate scores come from?</MpFormLabel>
          <MpTooltip label="Manual input is for assessment done on a third-party platform. You'll enter those scores per candidate after the plan is created." placement="top" use-portal><MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary', cursor: 'help' })" /></MpTooltip>
        </MpFlex>
        <MpFlex direction="column" gap="3">
          <MpRadio name="assessment-type" :is-checked="assessmentType === 'talenta'" @update:is-checked="assessmentType = 'talenta'">
            From Talenta Performance
            <template #description>Use competency scores already recorded in Talenta Performance.</template>
          </MpRadio>
          <MpRadio name="assessment-type" :is-checked="assessmentType === 'manual'" @update:is-checked="assessmentType = 'manual'">
            Manual input
            <template #description>Competencies were assessed outside Talenta Performance. You'll enter the scores manually.</template>
          </MpRadio>
        </MpFlex>
      </MpFormControl>
      <!-- No competency assessment defined for this position -->
      <PxNoAssignmentNotice v-if="!hasAssignment" contact-hr />

      <template v-else>
        <!-- Scope dimension for this position (job level / grade / class) -->
        <MpFormControl id="scope-value" :is-invalid="scopeValueInvalid">
          <MpFormLabel>{{ scopeLabel }} <MpText as="span" :class="reqMark">*</MpText></MpFormLabel>
          <PxSelectPopover v-model="scopeValue" :options="scopeValueOptions" :placeholder="`Select ${scopeLabel.toLowerCase()}`" :width="selectWidth" />
          <MpFormHelpText>Only {{ scopeLabel.toLowerCase() }} values with a competency assessment for this role are shown.</MpFormHelpText>
          <MpFormErrorMessage>You must select {{ scopeLabel.toLowerCase() }}</MpFormErrorMessage>
        </MpFormControl>

        <!-- Resolved competency standard — targets for the CHOSEN scope value -->
        <MpFormControl id="competency-standard">
          <MpFormLabel>Competency standard</MpFormLabel>
          <MpTableContainer v-if="scopeValue" :class="[borderedTable, css({ marginTop: '1' })]">
            <MpTable :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" :class="cellHLeft">Competency group</MpTableCell>
                  <MpTableCell as="th" :class="cellHRight">Target score · {{ scopeValueLabel }}</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="g in resolvedTargets" :key="g.group">
                  <MpTableCell as="td" :class="cellB">{{ g.group }}</MpTableCell>
                  <MpTableCell as="td" :class="[cellB, css({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })]">{{ g.target.toFixed(1) }}</MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else size="label" :class="css({ color: 'text.secondary', paddingBlock: '3', display: 'block' })">Select a {{ scopeLabel.toLowerCase() }} above to see its competency targets.</MpText>
          <MpFormHelpText>Targets come from the competency assessment for this role at the selected {{ scopeLabel.toLowerCase() }} — candidates are measured against them.</MpFormHelpText>
        </MpFormControl>
      </template>
    </div>

    <div v-if="step === 2" :class="section">
      <MpFlex justify="space-between" align="flex-start" gap="4">
        <MpFlex direction="column" gap="1">
          <MpText :class="h3Text">Select successor talent</MpText>
          <MpText size="label" :class="captionText">Optional — you can create the pool now and add talent later. Only employees who match your Step 1 criteria appear as candidates.</MpText>
        </MpFlex>
        <MpButton v-if="selectedTalents.length" variant="secondary" left-icon="add" :class="css({ flexShrink: '0' })" @click="openPicker">Add successor talent</MpButton>
      </MpFlex>

      <MpText v-if="readinessInvalid" size="label" :class="css({ color: 'text.danger' })">You must select readiness for each successor talent</MpText>

      <MpTableContainer v-if="selectedTalents.length" :class="borderedTable">
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" :class="[cellHLeft, css({ width: '55%' })]">Employee</MpTableCell>
              <MpTableCell as="th" :class="cellHLeft">Readiness</MpTableCell>
              <MpTableCell as="th" :class="cellHLeft" aria-label="Actions" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="t in selectedTalents" :key="t.employeeId">
              <MpTableCell as="td" :class="cellB">
                <MpFlex align="center" gap="2">
                  <MpAvatar :id="`t-${t.employeeId}`" :name="employeeById(t.employeeId)?.name" :src="employeeById(t.employeeId)?.photo" size="md" variant-color="gray" />
                  <MpFlex direction="column" gap="0">
                    <span :class="nameText">{{ employeeById(t.employeeId)?.name }}</span>
                    <span :class="subText">{{ employeeById(t.employeeId)?.title }}</span>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="cellB">
                <PxSelectPopover v-model="t.readiness" :options="READINESS_OPTIONS" placeholder="Select readiness" :width="'200px'" />
              </MpTableCell>
              <MpTableCell as="td" :class="[cellB, css({ textAlign: 'right' })]">
                <button type="button" :class="css({ border: 'none', background: 'transparent', cursor: 'pointer', color: 'text.secondary', _hover: { color: 'text.danger' } })" aria-label="Remove" @click="removeTalent(t.employeeId)">
                  <MpIcon name="minus-circular" size="sm" />
                </button>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
      <!-- Empty state (docs/empty-state.md) — replaces the list when no talent picked -->
      <MpFlex v-else direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
        <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
        <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
          <MpText :class="emptyTitle">No successor talent yet</MpText>
          <MpText size="label" :class="captionText">Add employees you're grooming for this position, or create the pool now and add them later.</MpText>
        </MpFlex>
        <MpButton variant="secondary" left-icon="add" @click="openPicker">Add successor talent</MpButton>
      </MpFlex>
    </div>

    <!-- Footer — Cancel · Back · Next/Create (Cancel & Back ghost) -->
    <div :class="footerBar">
      <MpButtonGroup>
        <MpButton variant="ghost" @click="cancel">Cancel</MpButton>
        <MpButton v-if="step > 0" variant="ghost" @click="back">Back</MpButton>
        <MpButton v-if="step < STEPS.length - 1" variant="primary" @click="next">Next</MpButton>
        <MpButton v-else variant="primary" @click="submit">Create</MpButton>
      </MpButtonGroup>
    </div>
  </div>

  <!-- Add talent picker — shared two-column employee select drawer -->
  <SelectEmployeesDrawer
    :is-open="isPickerOpen"
    drawer-id="drawer-select-successors"
    title="Add successor talent"
    description="Only employees who match your Step 1 criteria (service length and employment status) are listed."
    :initial-selected="selectedTalents.map(t => t.employeeId)"
    :include-ids="candidateIdList"
    :is-required="false"
    confirm-label="Add successor talent"
    @update:is-open="isPickerOpen = $event"
    @continue="onSelectContinue"
  />
</template>
