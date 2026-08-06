<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Add / edit key result (sub-drawer)
  Token mode: Pixel 2.4

  Opened on top of the Add Goal drawer. The measurement block mirrors the Add
  Goal drawer exactly: a "Measurement unit" radio (Percentage / Number / Amount
  / Deadline) with inline per-unit fields, a "Goal direction" (Higher / Lower is
  better) field, plus a KR-only "Progress update method" (copy shared with the
  goal cycle form). Deadline uses the same MpDatePicker + deadline-rules block.

  Guard: any close (Esc / close button / Cancel) confirms via "Leave without
  saving?" when the form is dirty; overlay-click never closes. Read-only demo —
  on save it emits the drafted key result to the Add Goal drawer.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpFlex, MpText, MpIcon, MpButton, MpButtonGroup,
  MpFormControl, MpFormLabel, MpFormErrorMessage,
  MpInput, MpInputGroup, MpInputLeftAddon, MpInputRightAddon, MpTextarea,
  MpRadio, MpCheckbox, MpDatePicker,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  toast, css,
} from '@mekari/pixel3'
import { CURRENCY_OPTIONS, type CurrencyCode, MEASUREMENT_UNIT_OPTIONS, type MeasurementUnit } from '~/utils/goalTaxonomy'
import { type DeadlineRule, MAX_DEADLINE_RULES, validateDeadlineRules } from '~/utils/goalDeadline'
import { toDate, toISO } from '~/utils/goalSchedule'
import { formatDateShort } from '~/utils/periodPicker'
import type { DraftKeyResult } from '~/utils/goalDraft'

const props = defineProps<{ isOpen: boolean, editing: DraftKeyResult | null }>()
const emit = defineEmits<{ 'update:isOpen': [boolean], save: [DraftKeyResult] }>()

const NAME_MAX = 255

const id = ref('')
const name = ref('')
const description = ref('')
const kpiDirection = ref<'higher' | 'lower'>('higher')
const measurementUnit = ref<MeasurementUnit>('percentage')
const currency = ref<CurrencyCode>('IDR')
const useBaseline = ref(true)
const startValue = ref<number | ''>(0)
const targetValue = ref<number | ''>(100)
const deadlineDate = ref<Date | null>(null)
const deadlineRulesEnabled = ref(false)
const deadlineRules = ref<DeadlineRule[]>([])
const progressMechanism = ref<'manual' | 'log-based'>('manual')

const errors = reactive({ name: false, target: false, startValue: false, deadlineDate: false })
const nameError = ref('')
const targetError = ref('')
const startError = ref('')
const deadlineError = ref('')
const ruleErrors = ref<{ index: number, message: string }[]>([])

const isEdit = computed(() => !!props.editing)
const isDeadline = computed(() => measurementUnit.value === 'deadline')
const currencySymbol = computed(() => CURRENCY_OPTIONS.find(c => c.value === currency.value)?.symbol ?? '')

function formatThousands(v: number | ''): string {
  return v === '' ? '' : Number(v).toLocaleString('en-US')
}
function parseThousands(str: string): number | '' {
  const digits = str.replace(/[^\d]/g, '')
  return digits === '' ? '' : Number(digits)
}
const startValueAmountDisplay = computed({
  get: () => formatThousands(startValue.value),
  set: (v: string) => { startValue.value = parseThousands(v) },
})
const targetValueAmountDisplay = computed({
  get: () => formatThousands(targetValue.value),
  set: (v: string) => { targetValue.value = parseThousands(v) },
})

let hydrating = false
watch(() => props.isOpen, (open) => {
  if (!open) return
  hydrating = true
  errors.name = errors.target = errors.startValue = errors.deadlineDate = false
  nameError.value = targetError.value = startError.value = deadlineError.value = ''
  ruleErrors.value = []
  const d = props.editing
  if (d) {
    id.value = d.id
    name.value = d.title
    description.value = d.description ?? ''
    kpiDirection.value = d.kpiDirection ?? 'higher'
    measurementUnit.value = d.measurementUnit ?? 'percentage'
    currency.value = d.currency ?? 'IDR'
    useBaseline.value = d.useBaseline ?? true
    startValue.value = d.startValue ?? ''
    targetValue.value = d.targetValue ?? ''
    deadlineDate.value = d.deadlineDate ? toDate(d.deadlineDate) : null
    deadlineRules.value = d.deadlineRules ? d.deadlineRules.map(r => ({ ...r })) : []
    deadlineRulesEnabled.value = deadlineRules.value.length > 0
    progressMechanism.value = d.progressMechanism ?? 'manual'
  }
  else {
    id.value = ''
    name.value = ''
    description.value = ''
    kpiDirection.value = 'higher'
    measurementUnit.value = 'percentage'
    currency.value = 'IDR'
    useBaseline.value = true
    startValue.value = 0
    targetValue.value = 100
    deadlineDate.value = null
    deadlineRulesEnabled.value = false
    deadlineRules.value = []
    progressMechanism.value = 'manual'
  }
  isLeaveOpen.value = false
  initialSnapshot.value = snapshot()
  nextTick(() => { hydrating = false })
})

// Switching unit: deadline forces Increase direction (no baseline/target);
// percentage defaults to 0 → 100; other numeric scales start blank. Skipped
// while loading so edit values aren't clobbered.
watch(measurementUnit, (unit) => {
  if (hydrating) return
  if (unit === 'deadline') {
    kpiDirection.value = 'higher'
    startValue.value = ''
    targetValue.value = ''
    return
  }
  deadlineDate.value = null
  deadlineRulesEnabled.value = false
  deadlineRules.value = []
  startValue.value = unit === 'percentage' ? 0 : ''
  targetValue.value = unit === 'percentage' ? 100 : ''
})

function addRule() {
  if (deadlineRules.value.length >= MAX_DEADLINE_RULES) return
  deadlineRules.value = [...deadlineRules.value, { id: `kr-rule-${deadlineRules.value.length}-${Date.now()}`, daysExceed: '', percentage: '' }]
}
function removeRule(rid: string) {
  deadlineRules.value = deadlineRules.value.filter(r => r.id !== rid)
}

function fmt(v: number | '') { return v === '' ? '0' : String(v) }
function summary(): string {
  if (isDeadline.value) return deadlineDate.value ? `By ${formatDateShort(deadlineDate.value)}` : 'Deadline'
  const s = useBaseline.value ? fmt(startValue.value) : null
  const t = fmt(targetValue.value)
  if (measurementUnit.value === 'amount') {
    const sym = currencySymbol.value
    return s === null ? `${sym}${t}` : `${sym}${s} → ${sym}${t}`
  }
  const suffix = measurementUnit.value === 'percentage' ? '%' : ''
  return s === null ? `${t}${suffix}` : `${s}${suffix} → ${t}${suffix}`
}

// ─── Unsaved-changes guard ──────────────────────────────────────────────────
const isLeaveOpen = ref(false)
function snapshot() {
  return JSON.stringify({
    name: name.value, description: description.value, kpiDirection: kpiDirection.value,
    measurementUnit: measurementUnit.value, currency: currency.value, useBaseline: useBaseline.value,
    startValue: startValue.value, targetValue: targetValue.value,
    deadlineDate: deadlineDate.value, deadlineRulesEnabled: deadlineRulesEnabled.value,
    deadlineRules: deadlineRules.value, progressMechanism: progressMechanism.value,
  })
}
const initialSnapshot = ref('')
function isDirty() { return snapshot() !== initialSnapshot.value }
function doClose() { emit('update:isOpen', false) }
// The "Leave without saving?" alert fires ONLY on Esc, and only when dirty.
// Cancel, the close (×) button, and overlay just close directly.
function requestClose() { if (isDirty()) isLeaveOpen.value = true; else doClose() }
function cancelLeave() { isLeaveOpen.value = false }
function discardAndClose() { isLeaveOpen.value = false; doClose() }
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) { e.preventDefault(); requestClose() }
}
onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

function submit() {
  errors.name = errors.target = errors.startValue = errors.deadlineDate = false
  nameError.value = targetError.value = startError.value = deadlineError.value = ''
  ruleErrors.value = []
  let ok = true

  if (!name.value.trim()) { errors.name = true; nameError.value = 'This field is required'; ok = false }

  if (isDeadline.value) {
    if (!deadlineDate.value) { errors.deadlineDate = true; deadlineError.value = 'You must fill the value'; ok = false }
    if (deadlineRulesEnabled.value) {
      ruleErrors.value = validateDeadlineRules(deadlineRules.value)
      if (ruleErrors.value.length) ok = false
    }
  }
  else {
    const start = startValue.value === '' ? null : Number(startValue.value)
    const target = targetValue.value === '' ? null : Number(targetValue.value)
    if (target === null) { errors.target = true; targetError.value = 'This field is required'; ok = false }
    if (useBaseline.value && start !== null && target !== null) {
      if (kpiDirection.value === 'higher' && start >= target) { errors.target = true; targetError.value = 'Target should be higher than Baseline'; ok = false }
      if (kpiDirection.value === 'lower' && start <= target) { errors.target = true; targetError.value = 'Target should be lower than Baseline'; ok = false }
    }
  }

  if (!ok) {
    toast.notify({ id: 'kr-form-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
    return
  }

  emit('save', {
    id: id.value || `kr-${Date.now()}`,
    title: name.value.trim(),
    target: summary(),
    description: description.value.trim(),
    kpiDirection: kpiDirection.value,
    measurementUnit: measurementUnit.value,
    currency: currency.value,
    useBaseline: useBaseline.value,
    startValue: startValue.value,
    targetValue: targetValue.value,
    deadlineDate: isDeadline.value && deadlineDate.value ? toISO(deadlineDate.value) : '',
    deadlineRules: isDeadline.value && deadlineRulesEnabled.value ? deadlineRules.value.map(r => ({ ...r })) : [],
    progressMechanism: progressMechanism.value,
  })
  doClose()
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const body = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const reqStar = css({ color: 'text.danger' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const helperText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const noSpinner = css({ '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: '0' }, '&[type=number]': { MozAppearance: 'textfield' } })
const radioCol = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const radioIndent = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingLeft: '8' })
const deadlineRulesBox = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingTop: '2' })
const deadlineRuleRow = css({ display: 'flex', alignItems: 'flex-end', gap: '3' })
const deadlineRuleError = css({ fontSize: '12px', lineHeight: '16px', color: 'text.danger' })
const removeBtn = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'text.secondary', _hover: { color: 'text.danger' } })
const addLink = css({ display: 'inline-flex', alignItems: 'center', gap: '2', width: 'fit-content', border: 'none', background: 'transparent', color: 'text.link', fontSize: '14px', lineHeight: '20px', cursor: 'pointer', paddingBlock: '1', _disabled: { color: 'text.secondary', cursor: 'not-allowed' } })
</script>

<template>
  <ClientOnly>
    <MpDrawer :is-open="isOpen" placement="right" size="lg" is-keep-alive :is-close-on-overlay-click="false" :is-close-on-esc="false" @close="doClose">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ isEdit ? 'Edit key result' : 'Add key result' }}
          <MpDrawerCloseButton @click="doClose" />
        </MpDrawerHeader>

        <MpDrawerBody>
          <div :class="body">
            <!-- Name -->
            <MpFormControl id="kr-name" :is-invalid="errors.name">
              <div :class="labelRow">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Key result name</MpFormLabel>
                  <MpText size="label" :class="reqStar">*</MpText>
                </MpFlex>
                <span :class="charCount">{{ name.length }} / {{ NAME_MAX }}</span>
              </div>
              <MpInput v-model="name" :maxlength="NAME_MAX" placeholder="e.g. Close 20 enterprise deals" />
              <MpFormErrorMessage>{{ nameError }}</MpFormErrorMessage>
            </MpFormControl>

            <!-- Description -->
            <MpFormControl id="kr-description">
              <MpFormLabel>Description <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></MpFormLabel>
              <MpTextarea v-model="description" placeholder="Optional" />
            </MpFormControl>

            <!-- Measurement unit (+ inline per-unit fields — mirrors Add Goal) -->
            <MpFormControl id="kr-unit">
              <MpFlex align="center" gap="1">
                <MpFormLabel>Measurement unit</MpFormLabel>
                <MpText size="label" :class="reqStar">*</MpText>
              </MpFlex>
              <MpFlex :class="radioCol">
                <template v-for="opt in MEASUREMENT_UNIT_OPTIONS" :key="opt.value">
                  <MpRadio name="kr-unit" :value="opt.value" :is-checked="measurementUnit === opt.value" @update:is-checked="measurementUnit = opt.value">
                    {{ opt.label }}
                  </MpRadio>
                  <div v-if="measurementUnit === opt.value" :class="radioIndent">
                    <!-- Deadline: date + optional graduated achievement rules -->
                    <template v-if="opt.value === 'deadline'">
                      <MpFlex gap="4">
                        <MpFormControl id="kr-deadline" :class="css({ flex: '1' })" :is-invalid="errors.deadlineDate">
                          <MpFormLabel>Deadline date</MpFormLabel>
                          <MpDatePicker v-model="deadlineDate" value-type="date" format="D MMM YYYY" placeholder="Select deadline date" use-portal :is-show-shortcut="false" />
                          <MpFormErrorMessage>{{ deadlineError }}</MpFormErrorMessage>
                          <span v-if="!errors.deadlineDate" :class="helperText">Achievement is 100% if updated on or before the deadline, 0% if updated after — unless deadline rules below are set.</span>
                        </MpFormControl>
                        <div :class="css({ flex: '1' })" />
                      </MpFlex>
                      <MpCheckbox id="kr-deadline-rules" v-model:is-checked="deadlineRulesEnabled">Set deadline rules</MpCheckbox>
                      <div v-if="deadlineRulesEnabled" :class="deadlineRulesBox">
                        <div v-for="(rule, index) in deadlineRules" :key="rule.id">
                          <div :class="deadlineRuleRow">
                            <MpFormControl :id="`kr-rule-days-${rule.id}`" :class="css({ flex: '1' })">
                              <MpFormLabel>Days exceeded</MpFormLabel>
                              <MpInputGroup>
                                <MpInput v-model="rule.daysExceed" type="number" min="0" :class="noSpinner" />
                                <MpInputRightAddon>days</MpInputRightAddon>
                              </MpInputGroup>
                            </MpFormControl>
                            <MpFormControl :id="`kr-rule-pct-${rule.id}`" :class="css({ flex: '1' })">
                              <MpFormLabel>Achievement</MpFormLabel>
                              <MpInputGroup>
                                <MpInput v-model="rule.percentage" type="number" min="0" max="100" :class="noSpinner" />
                                <MpInputRightAddon>%</MpInputRightAddon>
                              </MpInputGroup>
                            </MpFormControl>
                            <MpFormControl :class="css({ flexShrink: '0' })">
                              <MpFormLabel :class="css({ visibility: 'hidden' })">&nbsp;</MpFormLabel>
                              <button type="button" :class="removeBtn" aria-label="Remove rule" @click="removeRule(rule.id)"><MpIcon name="minus-circular" size="sm" /></button>
                            </MpFormControl>
                          </div>
                          <span v-for="err in ruleErrors.filter(e => e.index === index)" :key="err.message" :class="deadlineRuleError">{{ err.message }}</span>
                        </div>
                        <button type="button" :class="addLink" :disabled="deadlineRules.length >= MAX_DEADLINE_RULES" @click="addRule">
                          <MpIcon name="add" size="sm" /> Add rule
                        </button>
                        <span v-if="deadlineRules.length >= MAX_DEADLINE_RULES" :class="helperText">Maximum {{ MAX_DEADLINE_RULES }} rules.</span>
                      </div>
                    </template>

                    <!-- Percentage / Number / Amount: baseline + target on a numeric scale -->
                    <template v-else>
                      <MpCheckbox id="kr-use-baseline" v-model:is-checked="useBaseline">Use baseline</MpCheckbox>
                      <MpFlex gap="4">
                        <MpFormControl v-if="opt.value === 'amount'" id="kr-currency" :class="css({ flex: '1' })">
                          <MpFormLabel>Currency</MpFormLabel>
                          <PxSelectPopover v-model="currency" :options="CURRENCY_OPTIONS" width="100%" />
                        </MpFormControl>
                        <MpFormControl v-if="useBaseline" id="kr-baseline" :class="css({ flex: '1' })" :is-invalid="errors.startValue">
                          <MpFormLabel>Baseline</MpFormLabel>
                          <MpInputGroup v-if="opt.value === 'amount'">
                            <MpInputLeftAddon>{{ currencySymbol }}</MpInputLeftAddon>
                            <MpInput v-model="startValueAmountDisplay" type="text" inputmode="numeric" />
                          </MpInputGroup>
                          <MpInputGroup v-else>
                            <MpInput v-model="startValue" type="number" :class="noSpinner" />
                            <MpInputRightAddon>{{ opt.value === 'percentage' ? '%' : '#' }}</MpInputRightAddon>
                          </MpInputGroup>
                          <MpFormErrorMessage>{{ startError }}</MpFormErrorMessage>
                        </MpFormControl>
                        <MpFormControl id="kr-target" :class="css({ flex: '1' })" :is-invalid="errors.target">
                          <MpFlex align="center" gap="1">
                            <MpFormLabel>Target</MpFormLabel>
                            <MpText size="label" :class="reqStar">*</MpText>
                          </MpFlex>
                          <MpInputGroup v-if="opt.value === 'amount'">
                            <MpInputLeftAddon>{{ currencySymbol }}</MpInputLeftAddon>
                            <MpInput v-model="targetValueAmountDisplay" type="text" inputmode="numeric" />
                          </MpInputGroup>
                          <MpInputGroup v-else>
                            <MpInput v-model="targetValue" type="number" :class="noSpinner" />
                            <MpInputRightAddon>{{ opt.value === 'percentage' ? '%' : '#' }}</MpInputRightAddon>
                          </MpInputGroup>
                          <MpFormErrorMessage>{{ targetError }}</MpFormErrorMessage>
                        </MpFormControl>
                      </MpFlex>
                    </template>
                  </div>
                </template>
              </MpFlex>
            </MpFormControl>

            <!-- Goal direction (mirrors Add Goal) — hidden for Deadline -->
            <MpFormControl v-if="!isDeadline" id="kr-direction">
              <MpFlex align="center" gap="1">
                <MpFormLabel>Goal direction</MpFormLabel>
                <MpText size="label" :class="reqStar">*</MpText>
              </MpFlex>
              <MpFlex :class="radioCol">
                <MpRadio name="kr-direction" value="higher" :is-checked="kpiDirection === 'higher'" @update:is-checked="kpiDirection = 'higher'">
                  Higher is better
                  <template #description>Achievement increases as the value goes up — e.g. revenue, satisfaction score.</template>
                </MpRadio>
                <MpRadio name="kr-direction" value="lower" :is-checked="kpiDirection === 'lower'" @update:is-checked="kpiDirection = 'lower'">
                  Lower is better
                  <template #description>Achievement increases as the value goes down — e.g. cost, defect rate, response time.</template>
                </MpRadio>
              </MpFlex>
            </MpFormControl>

            <!-- Progress update method — stays visible for every unit (incl. Deadline) -->
            <MpFormControl v-if="kpiDirection === 'higher'" id="kr-mechanism">
              <MpFormLabel>Progress update method</MpFormLabel>
              <MpFlex :class="radioCol">
                <MpRadio name="kr-mechanism" :is-checked="progressMechanism === 'manual'" @update:is-checked="progressMechanism = 'manual'">
                  Manual entry
                  <template #description>Update total progress manually by entering achievement values.</template>
                </MpRadio>
                <MpRadio name="kr-mechanism" :is-checked="progressMechanism === 'log-based'" @update:is-checked="progressMechanism = 'log-based'">
                  Log-based
                  <template #description>Achievement entries are automatically summed to update total progress.</template>
                </MpRadio>
              </MpFlex>
            </MpFormControl>
          </div>
        </MpDrawerBody>

        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="doClose">Cancel</MpButton>
            <MpButton variant="primary" @click="submit">{{ isEdit ? 'Save changes' : 'Save' }}</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>

    <!-- Unsaved-changes confirmation -->
    <MpModal :is-open="isLeaveOpen" @close="cancelLeave">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Leave without saving?
          <MpModalCloseButton @click="cancelLeave" />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="css({ color: 'text.default' })">Your changes to this key result haven't been saved and will be lost if you leave.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="cancelLeave">Cancel</MpButton>
            <MpButton variant="primary" @click="discardAndClose">Discard</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
