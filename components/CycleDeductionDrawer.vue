<script setup lang="ts">
// ─────────────────────────────────────────────────────────────────────────────
// Deduction score system drawer (production parity: DrawerDeduction). Configures
// how points are deducted from the final review score based on Attendance,
// Reprimand, and Time-off data. Performance cycles only.
// ─────────────────────────────────────────────────────────────────────────────
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpText, MpButton, MpRadio, MpToggle, MpFormControl, MpFormLabel, MpFormErrorMessage,
  MpFlex, MpBanner, MpBannerIcon, MpBannerDescription, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, MpCheckbox,
  toast, css,
} from '@mekari/pixel3'
import {
  ATTENDANCE_GROUPS, DEDUCTION_FORMULA_OPTIONS, DEDUCTION_ASSIGNED_OPTIONS, JOB_LEVELS, JOB_POSITIONS, TIMEOFF_POLICIES,
  makeScoreRow, makeTimeOffBlock,
} from '~/utils/deduction'
import type { DeductionConfig, ScoreRow, TimeOffBlock, EmploymentTag } from '~/utils/deduction'

const props = defineProps<{ isOpen: boolean, config: DeductionConfig }>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'saved': [DeductionConfig] }>()

function cloneRows(rows: ScoreRow[]): ScoreRow[] { return rows.map(r => ({ ...r })) }
function clone(c: DeductionConfig): DeductionConfig {
  const raw = toRaw(c)
  return {
    ...raw,
    employees_tag_value: raw.employees_tag_value.map(t => ({ ...t })),
    absent: cloneRows(raw.absent), no_clock_in: cloneRows(raw.no_clock_in), no_clock_out: cloneRows(raw.no_clock_out),
    late_clock_in: cloneRows(raw.late_clock_in), early_clock_out: cloneRows(raw.early_clock_out), reprimand: cloneRows(raw.reprimand),
    timeoff: raw.timeoff.map(b => ({ ...b, conditions: cloneRows(b.conditions) })),
  }
}
const form = reactive<DeductionConfig>(clone(props.config))

const isPercent = computed(() => form.deduction_formula === 'percentage')
const submitted = ref(false)

// Percentage formula disables Time off entirely (production parity).
watch(isPercent, (v) => { if (v) { form.is_timeoff = false } })
// Changing the assigned type clears the picked employment tags.
watch(() => form.employment_type, () => { form.employees_tag_value = [] })

const employmentOptions = computed(() => (form.employment_type === 'job-position' ? JOB_POSITIONS : JOB_LEVELS))
const employmentLabel = computed(() => (form.employment_type === 'job-position' ? 'Select job position' : 'Select job level'))
function toggleTag(opt: EmploymentTag) {
  const exists = form.employees_tag_value.some(t => t.value === opt.value)
  form.employees_tag_value = exists ? form.employees_tag_value.filter(t => t.value !== opt.value) : [...form.employees_tag_value, opt]
}
const tagsInvalid = computed(() => submitted.value && form.employment_type !== 'all-employee' && form.employees_tag_value.length === 0)

// ─── Attendance / reprimand items ────────────────────────────────────────────────
function rowsFor(key: string): ScoreRow[] { return (form as unknown as Record<string, ScoreRow[]>)[key] }
function toggleItem(isKey: string, key: string, v: boolean) {
  ;(form as unknown as Record<string, boolean>)[isKey] = v
  if (v && rowsFor(key).length === 0) rowsFor(key).push(makeScoreRow())
}

// ─── Time off blocks ─────────────────────────────────────────────────────────────
function toggleTimeoff(v: boolean) {
  form.is_timeoff = v
  if (v && form.timeoff.length === 0) form.timeoff.push(makeTimeOffBlock())
}
const selectedPolicyIds = computed(() => form.timeoff.map(b => b.policy_id).filter(Boolean))
function policyOptions(block: TimeOffBlock) {
  return TIMEOFF_POLICIES.filter(p => !selectedPolicyIds.value.includes(p.id) || p.id === block.policy_id)
    .map(p => ({ value: p.id, label: p.policy_name }))
}
function onPickPolicy(block: TimeOffBlock, id: string) {
  const p = TIMEOFF_POLICIES.find(x => x.id === id)
  if (p) { block.policy_id = p.id; block.policy_code = p.policy_code; block.policy_name = p.policy_name }
}
function addBlock() { form.timeoff.push(makeTimeOffBlock()) }
function removeBlock(i: number) { form.timeoff.splice(i, 1) }

watch(() => props.isOpen, (open) => { if (open) { Object.assign(form, clone(props.config)); submitted.value = false } })

function close() { emit('update:isOpen', false) }
function onApply() {
  submitted.value = true
  if (tagsInvalid.value) return
  emit('saved', clone(form))
  toast.notify({ id: 'deduction-saved', position: 'top-center', variant: 'success', title: 'Deduction settings saved' })
  close()
}

// styles
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', marginTop: '6', marginBottom: '2' })
const sectionHead = css({ display: 'flex', flexDirection: 'column', gap: '1', marginBottom: '4' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const selectWidth = css({ width: { base: '100%', lg: '60%' } })
const itemBox = css({ borderBottom: '1px solid', borderBottomColor: 'border.default', paddingBlock: '3' })
const itemReveal = css({ marginLeft: '6', marginTop: '3', display: 'flex', flexDirection: 'column', gap: '2' })
const blockBox = css({ background: 'background.neutral.subtle', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', padding: '4', marginBottom: '3', display: 'flex', flexDirection: 'column', gap: '3' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-deduction" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          Manage deduction
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>

        <MpDrawerBody :class="css({ display: 'flex', flexDirection: 'column', minHeight: '0' })">
          <!-- Deduction formula -->
          <div :class="sectionHead">
            <MpText as="h2" :class="h2Class">Deduction</MpText>
            <MpText size="label" color="text.secondary">Define how the deduction is applied to the final review score.</MpText>
          </div>
          <MpText :class="h3Class">Deduction formula</MpText>
          <div :class="fields">
            <MpRadio v-for="o in DEDUCTION_FORMULA_OPTIONS" :key="o.value" name="deduction-formula" :value="o.value" :is-checked="form.deduction_formula === o.value" @update:is-checked="form.deduction_formula = o.value as any">{{ o.label }}</MpRadio>
          </div>

          <!-- Deduction assigned -->
          <MpText :class="h3Class">Deduction assigned to</MpText>
          <div :class="fields">
            <MpRadio v-for="o in DEDUCTION_ASSIGNED_OPTIONS" :key="o.value" name="deduction-assigned" :value="o.value" :is-checked="form.employment_type === o.value" @update:is-checked="form.employment_type = o.value as any">{{ o.label }}</MpRadio>
            <MpFormControl v-if="form.employment_type !== 'all-employee'" id="employment-tags" :is-invalid="tagsInvalid">
              <MpFormLabel>{{ employmentLabel }}</MpFormLabel>
              <MpPopover use-portal placement="bottom-start">
                <MpPopoverTrigger>
                  <MpButton variant="secondary" right-icon="caret-down" :class="selectWidth">
                    {{ form.employees_tag_value.map(t => t.label).join(', ') || employmentLabel }}
                  </MpButton>
                </MpPopoverTrigger>
                <MpPopoverContent>
                  <MpPopoverList>
                    <MpPopoverListItem v-for="o in employmentOptions" :key="o.value">
                      <MpCheckbox :is-checked="form.employees_tag_value.some(t => t.value === o.value)" @update:is-checked="() => toggleTag(o)">{{ o.label }}</MpCheckbox>
                    </MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
              <MpFormErrorMessage>You must select at least one option</MpFormErrorMessage>
              <MpText size="label-small" color="text.secondary">You can select more than one option</MpText>
            </MpFormControl>
          </div>

          <!-- Attendance -->
          <div :class="sectionHead" :style="{ marginTop: '24px' }">
            <MpText as="h2" :class="h2Class">Attendance</MpText>
            <MpText size="label" color="text.secondary">Deduct points based on attendance data during the review period.</MpText>
          </div>
          <div>
            <div v-for="g in ATTENDANCE_GROUPS" :key="g.key" :class="itemBox">
              <MpToggle :is-checked="(form as any)['is_' + g.key]" @update:is-checked="(v) => toggleItem('is_' + g.key, g.key, v)">{{ g.title }}</MpToggle>
              <div v-if="(form as any)['is_' + g.key]" :class="itemReveal">
                <DeductionScoreRows :rows="rowsFor(g.key)" :type="g.type" :is-percent="isPercent" />
              </div>
            </div>
          </div>

          <!-- Reprimand -->
          <div :class="sectionHead" :style="{ marginTop: '24px' }">
            <MpText as="h2" :class="h2Class">Reprimand</MpText>
            <MpText size="label" color="text.secondary">Deduct points based on the employee's reprimand history.</MpText>
          </div>
          <div :class="itemBox">
            <MpToggle :is-checked="form.is_reprimand" @update:is-checked="(v) => toggleItem('is_reprimand', 'reprimand', v)">Reprimand data</MpToggle>
            <div v-if="form.is_reprimand" :class="itemReveal">
              <DeductionScoreRows :rows="form.reprimand" type="reprimand" :is-percent="isPercent" />
            </div>
          </div>

          <!-- Time off -->
          <div :class="sectionHead" :style="{ marginTop: '24px' }">
            <MpText as="h2" :class="h2Class">Time off</MpText>
            <MpText size="label" color="text.secondary">Deduct points based on time-off usage per policy.</MpText>
          </div>
          <MpBanner v-if="isPercent" variant="info" is-inline :class="css({ marginBottom: '3' })">
            <MpBannerIcon />
            <MpBannerDescription>Time-off deduction is not available when the deduction formula is percentage.</MpBannerDescription>
          </MpBanner>
          <div :class="itemBox">
            <MpToggle :is-checked="form.is_timeoff" :is-disabled="isPercent" @update:is-checked="toggleTimeoff">Time off policy deduction</MpToggle>
            <div v-if="form.is_timeoff && !isPercent" :class="itemReveal">
              <div v-for="(block, i) in form.timeoff" :key="i" :class="blockBox">
                <MpFormControl :id="`timeoff-policy-${i}`">
                  <MpFormLabel>Time off policy</MpFormLabel>
                  <PxSelectPopover
                    :model-value="block.policy_id"
                    :options="policyOptions(block)"
                    placeholder="Select policy name"
                    :class="selectWidth"
                    @update:model-value="(v) => onPickPolicy(block, v)"
                  />
                </MpFormControl>
                <DeductionScoreRows :rows="block.conditions" type="timeoff" :is-percent="isPercent" />
                <MpFlex justify="flex-end">
                  <MpButton variant="ghost" left-icon="minus-circular" :is-disabled="form.timeoff.length === 1" @click="removeBlock(i)">Remove policy</MpButton>
                </MpFlex>
              </div>
              <MpButton variant="ghost" left-icon="add-circular" @click="addBlock">Add policy</MpButton>
            </div>
          </div>
        </MpDrawerBody>

        <MpDrawerFooter>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="onApply">Apply</MpButton>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
