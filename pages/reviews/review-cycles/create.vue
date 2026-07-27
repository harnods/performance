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
  MpBanner,
  MpBannerIcon,
  MpBannerDescription,
  toast,
  css,
} from '@mekari/pixel3'

definePageMeta({
  title: 'Create new cycle',
  layout: 'default',
  breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' },
})

const route = useRoute()
const router = useRouter()

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

const employeeFilter = ref('none')
const employeeFilterOptions = [
  { value: 'none', label: 'No filter applied' },
  { value: 'organization', label: 'Organization' },
  { value: 'branch', label: 'Branch' },
  { value: 'job-position', label: 'Job position' },
  { value: 'job-level', label: 'Job level' },
]

const template = ref('default')
const templateOptions = [
  { value: 'default', label: 'Default template', description: 'Evaluation method: by rating' },
  { value: 'probation', label: 'Probation template', description: 'Evaluation method: by point' },
  { value: 'contract', label: 'Contract template', description: 'Evaluation method: by percentage' },
  { value: 'leadership', label: 'Leadership review', description: 'Evaluation method: by rating' },
  { value: 'sales', label: 'Sales performance', description: 'Evaluation method: by percentage' },
  { value: 'engineering', label: 'Engineering competency', description: 'Evaluation method: by point' },
  { value: 'customer-success', label: 'Customer success', description: 'Evaluation method: by rating' },
  { value: 'design', label: 'Design team review', description: 'Evaluation method: by point' },
  { value: 'operations', label: 'Operations evaluation', description: 'Evaluation method: by percentage' },
  { value: 'intern', label: 'Internship evaluation', description: 'Evaluation method: by rating' },
]

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

// "Use weight" combines 2+ methods' scores into one final score. Only available
// once 2 or more methods are enabled (mirrors Performance Cycle).
const useMethodWeightAvailable = computed(() => activeMethods.value.length >= 2)
const useMethodWeight = ref(false)
const methodWeights = reactive<Record<string, number | ''>>({ manager: '', '360': '', team: '', self: '' })
const totalMethodWeight = computed(() =>
  activeMethods.value.reduce((sum, m) => sum + (methodWeights[m.key] === '' ? 0 : Number(methodWeights[m.key])), 0))

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

// Publish score after (Performance Cycle parity)
const publishScoreAfter = ref('complete-review')
const publishScoreOptions = [
  { value: 'complete-review', label: 'Complete review' },
  { value: 'cycle-end', label: 'Review period end' },
  { value: 'both', label: 'Both' },
]

// Require approval after each review submission
const requireApproval = ref(false)

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
const selectWidth = css({ width: { base: '100%', lg: '50%' } })

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

// Multiple review period banner
const bannerBox = css({
  background: 'background.neutral.subtle',
  border: '1px solid',
  borderColor: 'border.default',
  borderRadius: 'md',
  padding: '4',
})

const timelineWrapper = css({
  position: 'relative',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '2',
  paddingTop: '1',
})

const timelineConnector = css({
  position: 'absolute',
  top: '9px',
  left: '16%',
  right: '16%',
  height: '2px',
  background: 'background.brand.bold',
})

const timelineDot = css({
  width: '10px',
  height: '10px',
  borderRadius: 'full',
  background: 'background.brand.bold',
  marginBottom: '2',
  flexShrink: '0',
})

const timelineCol = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0',
  flex: '1',
})

function onCancel() {
  router.push('/reviews/review-cycles')
}
function onSave() {
  submitted.value = true
  if (reviewEveryInvalid.value || reviewWindowInvalid.value) return
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

  <div :class="gridArea">
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

        <MpFormControl id="employee-filter">
          <MpFormLabel>Employee filter</MpFormLabel>
          <PxSelectPopover v-model="employeeFilter" :options="employeeFilterOptions" :class="selectWidth" />
        </MpFormControl>

        <MpFormControl id="template">
          <MpFormLabel>Select template</MpFormLabel>
          <PxSelectPopover
            v-model="template"
            :options="templateOptions"
            :class="selectWidth"
            searchable
            search-placeholder="Search template"
          />
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

            <!-- Explanatory banner -->
            <div :class="bannerBox">
              <MpText size="label" :class="css({ fontWeight: '600', color: 'text.default', display: 'block', marginBottom: '3' })">
                6-month contract example
              </MpText>

              <!-- Timeline -->
              <div :class="timelineWrapper">
                <div :class="timelineConnector" />
                <div :class="timelineCol">
                  <div :class="timelineDot" />
                  <MpText size="label-small" :class="css({ fontWeight: '600', color: 'text.default', textAlign: 'center' })">Period 1</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center' })">Month 2</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center', marginTop: '1' })">Review period</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center' })">3 days after month 2</MpText>
                </div>
                <div :class="timelineCol">
                  <div :class="timelineDot" />
                  <MpText size="label-small" :class="css({ fontWeight: '600', color: 'text.default', textAlign: 'center' })">Period 2</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center' })">Month 4</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center', marginTop: '1' })">Review period</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center' })">3 days after month 4</MpText>
                </div>
                <div :class="timelineCol">
                  <div :class="timelineDot" />
                  <MpText size="label-small" :class="css({ fontWeight: '600', color: 'text.default', textAlign: 'center' })">Final</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center' })">Month 6</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center', marginTop: '1' })">Review period</MpText>
                  <MpText size="label-small" color="text.secondary" :class="css({ textAlign: 'center' })">3 days before end</MpText>
                </div>
              </div>

              <MpText size="label-small" color="text.secondary">
                3 review timeframes generated for a 6-month contract. Each timeframe covers a 3-days review period.
              </MpText>
            </div>
          </div>
        </template>

        <MpCheckbox :is-checked="reIncludeExtended" @update:is-checked="(v) => (reIncludeExtended = v)">
          <MpFlex align="center" gap="2">
            Re-include employees with extended employment period
            <MpBadge type="critical" size="sm">NEW</MpBadge>
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

      <!-- Use weight — appears once 2+ methods are enabled -->
      <template v-if="useMethodWeightAvailable">
        <MpFlex :class="css({ paddingTop: '4' })">
          <MpCheckbox :is-checked="useMethodWeight" @update:is-checked="(v) => (useMethodWeight = v)">
            Use weight
            <template #description>
              The score of your review will calculate by the weight you're set up.
            </template>
          </MpCheckbox>
        </MpFlex>
        <div v-if="useMethodWeight" :class="css({ marginTop: '3', marginLeft: '8' })">
          <div v-for="m in activeMethods" :key="m.key" :class="weightRow">
            <MpText size="label" color="text.default">{{ m.name }}</MpText>
            <MpInputGroup :class="css({ width: '104px' })">
              <MpInput v-model="methodWeights[m.key]" type="number" />
              <MpInputRightAddon>%</MpInputRightAddon>
            </MpInputGroup>
          </div>
          <MpFlex justify="flex-end" :class="css({ paddingTop: '2' })">
            <MpText size="label" color="text.secondary">{{ totalMethodWeight }}% of 100%</MpText>
          </MpFlex>
        </div>
      </template>

      <!-- Require approval after each review submission -->
      <MpFlex :class="css({ paddingTop: '4' })">
        <MpCheckbox :is-checked="requireApproval" @update:is-checked="(v) => (requireApproval = v)">
          Require approval after each review submission
          <template #description>
            After a reviewer submits a review, HR admin must approve it before the result is finalized.
          </template>
        </MpCheckbox>
      </MpFlex>

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

    <ReviewMethodDrawer v-model:is-open="methodDrawerOpen" :method="activeMethodLabel" />
  </div>
</template>
