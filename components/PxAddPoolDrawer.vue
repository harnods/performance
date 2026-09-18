<!--
  PxAddPoolDrawer — "Add pool" / "Edit pool" drawer for the Talent directory pool
  tabs (pages/talents/talent-directory/index.vue).

  Two ways to define the same pool, behind a segmented control
  (docs/patterns/ai-prompt-builder.md):
    • Describe — write the pool in plain language; the badge row under the
      textarea lights up per criteria dimension the description covers, and the
      Build step below is kept in sync with what's typed.
    • Build   — the explicit criteria builder: one MpAccordion section per added
      criterion (docs/patterns/accordion.md), each with its own shape — competency
      compares per group with an operator, performance picks a result per review
      type, education and years are "at least" floors, and attendance caps days.

  A pool's name, scope (job position / branch) and criteria are set together, in
  one drawer — there's no separate empty-state "add criteria" step after creation.
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpText, MpIcon, MpButton, MpInput, MpInputGroup, MpInputLeftAddon, MpInputRightAddon,
  MpCheckbox, MpTextarea, MpAccordion, MpAccordionItem, MpAccordionHeader, MpAccordionPanel, MpAccordionIcon,
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpSegmentedControl, MpBadge,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpTooltip, toast, css,
} from '@mekari/pixel3'
import { EDUCATION_LEVELS, BRANCHES, JOB_POSITIONS } from '~/utils/talents'
import {
  emptyCriteria, cloneCriteria, keyHasValue, CRITERIA_DEFS, CRITERIA_DEF_BY_KEY as DEF_BY_KEY,
  COMPARISON_OPS, type TalentCriteria, type CriteriaKey,
} from '~/utils/talentCriteria'
import {
  COMPETENCY_GROUPS, REVIEW_TYPES, ATTENDANCE_ISSUES, REVIEW_RESULTS,
} from '~/utils/talentAttributes'
import { PROMPT_CRITERIA, parsePrompt, type PromptCriteriaKey } from '~/utils/talentPrompt'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  appliedName: string
  appliedJobPosition: string
  appliedBranch: string
  appliedCriteria: TalentCriteria
}>()
const emit = defineEmits<{
  close: []
  save: [payload: { name: string, jobPosition: string, branch: string, criteria: TalentCriteria }]
}>()

const NAME_MAX = 60

const name = ref('')
const jobPosition = ref('')
const branch = ref('')
const description = ref('')
const form = ref<TalentCriteria>(emptyCriteria())
const addedCriteria = ref<CriteriaKey[]>([])
const step = ref<'describe' | 'build'>('describe')
const submitted = ref(false)
// Suppresses the description→builder sync while the open-watcher reseeds the
// draft, so clearing `description` on open can't wipe an edited pool's criteria.
let isReseeding = false

// (Re)initialize the draft from the applied state each time the drawer opens.
// Editing an existing pool opens straight on Build — its criteria are already
// explicit, so re-describing them in prose would be a step backwards.
watch(() => props.isOpen, (open) => {
  if (!open) return
  isReseeding = true
  name.value = props.appliedName
  jobPosition.value = props.appliedJobPosition
  branch.value = props.appliedBranch
  description.value = ''
  form.value = cloneCriteria(props.appliedCriteria)
  addedCriteria.value = CRITERIA_DEFS.filter(d => keyHasValue(d.key, form.value)).map(d => d.key)
  step.value = props.mode === 'edit' ? 'build' : 'describe'
  submitted.value = false
  nextTick(() => { isReseeding = false })
}, { immediate: true })

const stepOptions = [
  { id: 'pool-step-describe', label: 'Describe', value: 'describe', icon: 'airene-brand' },
  { id: 'pool-step-build', label: 'Build', value: 'build', icon: 'sliders' },
] as const

// ─── Describe mode ──────────────────────────────────────────────────────────
const parsed = computed(() => parsePrompt(description.value))
const detected = computed<PromptCriteriaKey[]>(() => parsed.value.detected)
const jobPositionOptions = computed(() => JOB_POSITIONS.map(p => ({ value: p, label: p })))
const branchOptions = computed(() => BRANCHES.map(b => ({ value: b, label: b })))

// Which criteria sections a set of detected dimensions maps to. "Job position"
// and "Location" are scope fields at the top of the drawer, not criteria
// sections, so they have no counterpart here.
const PROMPT_TO_CRITERIA: Partial<Record<PromptCriteriaKey, CriteriaKey>> = {
  competency: 'competency',
  performance: 'performance',
  education: 'education',
  attendance: 'attendance',
  years: 'years',
}
const criteriaKeysFor = (keys: PromptCriteriaKey[]) =>
  CRITERIA_DEFS.map(d => d.key).filter(key => keys.some(k => PROMPT_TO_CRITERIA[k] === key))

// Keep the Build step in lock-step with what's being typed: writing "a
// bachelor's degree" sets Education level's floor, "no absents" ticks Absent
// with a 0-day cap, "atleast 2 years of service" fills Year of service. The
// description is the source of truth *while you're in Describe* — deleting a
// phrase takes its criterion back out. Once on Build, hand edits are yours and
// nothing overwrites them.
watch(description, () => {
  if (isReseeding || step.value !== 'describe') return
  const { criteria, jobPosition: parsedPosition, branch: parsedBranch } = parsed.value
  form.value = cloneCriteria(criteria)
  addedCriteria.value = criteriaKeysFor(detected.value)
  // Scope selects are only ever filled in, never cleared — the user may have
  // picked them by hand before writing anything.
  if (parsedPosition) jobPosition.value = parsedPosition
  if (parsedBranch) branch.value = parsedBranch
})

// Rewrites a rough description into an explicit, criteria-by-criteria sentence,
// so the user can see (and edit) exactly what was understood.
function refinePrompt() {
  const labels = PROMPT_CRITERIA.filter(d => detected.value.includes(d.key)).map(d => d.label.toLowerCase())
  if (!labels.length) return
  const subject = jobPosition.value ? `${jobPosition.value.toLowerCase()}s` : 'talents'
  const scope = branch.value ? ` in ${branch.value}` : ''
  description.value = `${description.value.trim().replace(/[.\s]+$/, '')}. Rank ${subject}${scope} on ${labels.join(', ')}.`
}

function goToBuild() {
  if (!validate()) return
  step.value = 'build'
}

// ─── Build mode ─────────────────────────────────────────────────────────────
const availableCriteria = computed(() => CRITERIA_DEFS.filter(d => !addedCriteria.value.includes(d.key)))
const educationOptions = computed(() => EDUCATION_LEVELS.map(l => ({ value: l, label: l })))
const resultOptions = computed(() => REVIEW_RESULTS.map(r => ({ value: r, label: r })))

function addCriteria(key: CriteriaKey) {
  if (!addedCriteria.value.includes(key)) addedCriteria.value = [...addedCriteria.value, key]
}
// Removing a section resets its own values so re-adding it later starts clean.
function removeCriteria(key: CriteriaKey) {
  addedCriteria.value = addedCriteria.value.filter(k => k !== key)
  const blank = emptyCriteria()
  switch (key) {
    case 'competency': form.value.competency = blank.competency; break
    case 'performance': form.value.performance = blank.performance; break
    case 'education': form.value.educationMin = ''; break
    case 'attendance': form.value.attendance = blank.attendance; break
    case 'years': form.value.yearsMin = null; break
  }
}

// ─── Validation (docs/patterns/buttons.md — never disable the primary CTA) ──
const errors = computed(() => ({
  name: submitted.value && !name.value.trim() ? 'Pool name is required' : '',
  jobPosition: submitted.value && !jobPosition.value ? 'Job position is required' : '',
}))
function validate(): boolean {
  submitted.value = true
  if (name.value.trim() && jobPosition.value) return true
  toast.notify({ id: 'pool-form-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
  return false
}
function save() {
  if (!validate()) return
  emit('save', {
    name: name.value.trim(),
    jobPosition: jobPosition.value,
    branch: branch.value,
    criteria: cloneCriteria(form.value),
  })
}

// ─── Styles (DT 2.4) ────────────────────────────────────────────────────────
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const scopeRow = css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6', marginTop: '4' })
const sectionHead = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4', marginTop: '10', marginBottom: '3' })
const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionDesc = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const promptBox = css({ '& textarea': { minHeight: '240px', resize: 'vertical' } })
const promptFooter = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4', marginTop: '3' })
const badgeWrap = css({ display: 'flex', flexWrap: 'wrap', gap: '2', flex: '1' })
const badgeInner = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
const addBtn = css({ display: 'inline-flex', alignItems: 'center', gap: '2', width: 'fit-content', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', background: 'transparent', color: 'text.link', fontWeight: '600', fontSize: '14px', cursor: 'pointer', paddingBlock: '2', paddingInline: '4', marginTop: '4' })
const popPanel = css({ width: '220px', maxHeight: '260px', display: 'flex', flexDirection: 'column', overflowY: 'auto' })
// Accordion header: title left, remove + caret right. The remove button sits
// OUTSIDE MpAccordionHeader's toggle so clicking it can't also collapse.
const accordionRow = css({ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })
const accordionHead = css({ display: 'flex', alignItems: 'center', gap: '1', paddingBlock: '3' })
const accordionTitle = css({ flex: '1', fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const iconBtn = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', flexShrink: '0', border: 'none', background: 'transparent', borderRadius: 'md', cursor: 'pointer', color: 'text.secondary', _hover: { background: 'background.neutral.hovered', color: 'text.default' } })
const caretBtn = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: '0', border: 'none', background: 'transparent', cursor: 'pointer', color: 'text.secondary' })
const panelBody = css({ display: 'flex', flexDirection: 'column', gap: '4', paddingBottom: '4' })
const fieldLabel = css({ display: 'block', fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', marginBottom: '1' })
// Half-width controls (296px of the 616px panel) — the two-column rhythm the
// scope row above uses, kept even when a row holds a single control.
const halfField = css({ width: '100%', maxWidth: '296px' })
const twoCol = css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6' })
const inlineRow = css({ display: 'flex', alignItems: 'center', gap: '4' })
const inlineLabel = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', flexShrink: '0' })
// The operator sits in the input's left addon, as one joined control. The addon
// is sized for short prefixes ("Rp") and renders 32px wide, so it has to be told
// to fit its select; the input then takes the remaining width. Hooking Pixel's
// stable `mp-*__root` classes is the same escape hatch PxSelectPopover uses.
const opAddon = css({
  '& .mp-input-addon__root': {
    width: 'auto', minWidth: 'fit-content', flexShrink: '0',
    paddingInline: '2', background: 'background.neutral.subtle',
  },
  '& .mp-input__root': { flex: '1', minWidth: '0' },
  '& select': { border: 'none', background: 'transparent', fontWeight: '600', cursor: 'pointer', paddingRight: '5' },
})
// "Is between" needs a second value, so the row gets more than the 296px a
// single-value row uses: the operator + first value flex, the second is fixed.
const betweenRow = css({
  display: 'flex', alignItems: 'center', gap: '2', maxWidth: '420px',
  '& > *:first-child': { flex: '1', minWidth: '0' },
})
const betweenTo = css({ width: '120px', flexShrink: '0' })
const rangeSep = css({ color: 'text.secondary' })
const checkboxList = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const daysField = css({ maxWidth: '232px', marginTop: '2', marginLeft: '6' })
const footerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '3' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-add-pool" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="emit('close')">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ mode === 'create' ? 'Add pool' : 'Edit pool' }}
          <MpDrawerCloseButton />
        </MpDrawerHeader>
        <MpDrawerBody>
          <MpFormControl id="pool-name" is-required :is-invalid="!!errors.name">
            <div :class="labelRow">
              <MpFormLabel>Name</MpFormLabel>
              <span :class="charCount">{{ name.length }} / {{ NAME_MAX }}</span>
            </div>
            <MpInput v-model="name" :maxlength="NAME_MAX" placeholder="Enter pool name" />
            <MpFormErrorMessage>{{ errors.name }}</MpFormErrorMessage>
          </MpFormControl>

          <div :class="scopeRow">
            <MpFormControl id="pool-job-position" is-required :is-invalid="!!errors.jobPosition">
              <MpFormLabel>Job position</MpFormLabel>
              <PxSelectPopover
                v-model="jobPosition"
                :options="jobPositionOptions"
                placeholder="Select job position"
                searchable
                search-placeholder="Search job position..."
                is-clearable
              />
              <MpFormErrorMessage>{{ errors.jobPosition }}</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl id="pool-branch">
              <MpFormLabel>Branch</MpFormLabel>
              <PxSelectPopover
                v-model="branch"
                :options="branchOptions"
                placeholder="Select branch"
                searchable
                search-placeholder="Search branch..."
                is-clearable
              />
            </MpFormControl>
          </div>

          <div :class="sectionHead">
            <div>
              <MpText :class="sectionTitle">Talent criteria</MpText>
              <MpText :class="sectionDesc">Set the talent criteria you're looking for</MpText>
            </div>
            <MpSegmentedControl v-model="step" :data="stepOptions" name="pool-step" />
          </div>

          <template v-if="step === 'describe'">
            <div :class="promptBox">
              <MpTextarea
                v-model="description"
                is-full-width
                placeholder="e.g. High performing accountant staff with atleast 95% attendance and a bachelor's degree"
              />
            </div>
            <div :class="promptFooter">
              <div :class="badgeWrap">
                <MpBadge
                  v-for="d in PROMPT_CRITERIA"
                  :key="d.key"
                  for="tableStatus"
                  :type="detected.includes(d.key) ? 'completed' : 'announcement'"
                >
                  <span :class="badgeInner">
                    <MpIcon
                      v-if="detected.includes(d.key)"
                      name="done"
                      variant="fill"
                      size="sm"
                      color="green.500"
                    />
                    <MpIcon v-else name="indicator-circle" variant="outline" size="sm" />
                    {{ d.label }}
                  </span>
                </MpBadge>
              </div>
              <MpButton variant="secondary" :is-disabled="!detected.length" @click="refinePrompt">Refine prompt</MpButton>
            </div>
          </template>

          <template v-else>
            <MpAccordion v-if="addedCriteria.length" is-allow-multiple is-allow-toggle>
              <MpAccordionItem v-for="key in addedCriteria" :key="key" is-default-open :class="accordionRow">
                <div :class="accordionHead">
                  <MpText :class="accordionTitle">{{ DEF_BY_KEY[key].label }}</MpText>
                  <MpTooltip label="Remove" use-portal>
                    <span :class="iconBtn" role="button" :aria-label="`Remove ${DEF_BY_KEY[key].label}`" @click="removeCriteria(key)">
                      <MpIcon name="minus-circular" size="sm" />
                    </span>
                  </MpTooltip>
                  <MpAccordionHeader :class="caretBtn" :aria-label="`Collapse ${DEF_BY_KEY[key].label}`">
                    <MpAccordionIcon />
                  </MpAccordionHeader>
                </div>

                <MpAccordionPanel>
                  <div :class="panelBody">
                    <!-- Competency score — one operator + value per group -->
                    <template v-if="key === 'competency'">
                      <div v-for="g in COMPETENCY_GROUPS" :key="g.key">
                        <MpText :class="fieldLabel">{{ g.label }}</MpText>
                        <div v-if="form.competency[g.key].op === 'between'" :class="betweenRow">
                          <MpInputGroup :class="opAddon">
                            <MpInputLeftAddon>
                              <select v-model="form.competency[g.key].op" :aria-label="`${g.label} comparison`">
                                <option v-for="op in COMPARISON_OPS" :key="op.value" :value="op.value">{{ op.label }}</option>
                              </select>
                            </MpInputLeftAddon>
                            <MpInput v-model="form.competency[g.key].from" type="number" />
                          </MpInputGroup>
                          <span :class="rangeSep">–</span>
                          <div :class="betweenTo">
                            <MpInput v-model="form.competency[g.key].to" type="number" />
                          </div>
                        </div>
                        <MpInputGroup v-else :class="[opAddon, halfField]">
                          <MpInputLeftAddon>
                            <select v-model="form.competency[g.key].op" :aria-label="`${g.label} comparison`">
                              <option v-for="op in COMPARISON_OPS" :key="op.value" :value="op.value">{{ op.label }}</option>
                            </select>
                          </MpInputLeftAddon>
                          <MpInput v-model="form.competency[g.key].from" type="number" />
                        </MpInputGroup>
                      </div>
                    </template>

                    <!-- Performance result — one result select per review type -->
                    <div v-else-if="key === 'performance'" :class="twoCol">
                      <div v-for="r in REVIEW_TYPES" :key="r.key">
                        <MpText :class="fieldLabel">{{ r.label }}</MpText>
                        <PxSelectPopover
                          v-model="form.performance[r.key]"
                          :options="resultOptions"
                          placeholder="Select result"
                          is-clearable
                        />
                      </div>
                    </div>

                    <!-- Education level — an "at least" floor -->
                    <div v-else-if="key === 'education'" :class="inlineRow">
                      <span :class="inlineLabel">Atleast</span>
                      <div :class="halfField">
                        <PxSelectPopover
                          v-model="form.educationMin"
                          :options="educationOptions"
                          placeholder="Select education level"
                          is-clearable
                        />
                      </div>
                    </div>

                    <!-- Attendance — tick an issue, then cap its days -->
                    <div v-else-if="key === 'attendance'" :class="checkboxList">
                      <div v-for="a in ATTENDANCE_ISSUES" :key="a.key">
                        <MpCheckbox
                          :is-checked="form.attendance[a.key].enabled"
                          @update:is-checked="(v: boolean) => (form.attendance[a.key].enabled = v)"
                        >
                          {{ a.label }}
                        </MpCheckbox>
                        <div v-if="form.attendance[a.key].enabled" :class="daysField">
                          <MpInputGroup>
                            <MpInput v-model="form.attendance[a.key].maxDays" type="number" :aria-label="`${a.label} days`" />
                            <MpInputRightAddon>Days</MpInputRightAddon>
                          </MpInputGroup>
                        </div>
                      </div>
                    </div>

                    <!-- Year of service — an "at least" floor, in years -->
                    <div v-else :class="inlineRow">
                      <span :class="inlineLabel">Atleast</span>
                      <div :class="halfField">
                        <MpInputGroup>
                          <MpInput v-model="form.yearsMin" type="number" aria-label="Minimum years of service" />
                          <MpInputRightAddon>Years</MpInputRightAddon>
                        </MpInputGroup>
                      </div>
                    </div>
                  </div>
                </MpAccordionPanel>
              </MpAccordionItem>
            </MpAccordion>

            <MpPopover is-close-on-select use-portal placement="bottom-start">
              <MpPopoverTrigger>
                <button type="button" :class="addBtn" :disabled="!availableCriteria.length">
                  <MpIcon name="add" size="sm" />Add criteria
                </button>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <div :class="popPanel">
                  <MpPopoverList>
                    <MpPopoverListItem v-for="d in availableCriteria" :key="d.key" @click="addCriteria(d.key)">{{ d.label }}</MpPopoverListItem>
                    <MpText v-if="!availableCriteria.length" :class="[sectionDesc, css({ paddingInline: '3', paddingBlock: '2', textAlign: 'center' })]">All criteria added</MpText>
                  </MpPopoverList>
                </div>
              </MpPopoverContent>
            </MpPopover>
          </template>
        </MpDrawerBody>
        <MpDrawerFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
            <MpButton v-if="step === 'describe'" variant="primary" @click="goToBuild">Next</MpButton>
            <MpButton v-else variant="primary" @click="save">{{ mode === 'edit' ? 'Save changes' : 'Save' }}</MpButton>
          </div>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
