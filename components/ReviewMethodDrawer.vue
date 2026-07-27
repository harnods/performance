<script setup lang="ts">
import {
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  MpText,
  MpButton,
  MpCheckbox,
  MpRadio,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpBanner,
  MpBannerIcon,
  MpBannerDescription,
  toast,
  css,
} from '@mekari/pixel3'

const props = defineProps<{
  isOpen: boolean
  method?: string
}>()
const emit = defineEmits<{ 'update:isOpen': [boolean]; 'saved': [] }>()

const methodLabel = computed(() => props.method ?? 'Manager review')
const drawerTitle = computed(() => `${methodLabel.value} method`)

// Derive a stable key from the label so per-method logic doesn't depend on copy.
const methodKey = computed<'manager' | '360' | 'team' | 'self'>(() => {
  const l = methodLabel.value.toLowerCase()
  if (l.startsWith('manager')) return 'manager'
  if (l.startsWith('360')) return '360'
  if (l.startsWith('team')) return 'team'
  return 'self'
})
const isManager = computed(() => methodKey.value === 'manager')

const generalDescription = computed(() => ({
  manager: 'Please define indicators and other configurations to design the manager review method.',
  '360': "Review from an employee's subordinates, colleagues, and managers.",
  team: 'Employees review people in their team.',
  self: 'Employees review themselves.',
}[methodKey.value]))

// ─── Tabs (set varies per method, mirroring Performance Cycle) ──────────────────
type TabKey = 'general' | 'goals' | 'attendance' | 'reprimand' | 'weight'
const allTabs: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'goals', label: 'Goals' },
  { key: 'attendance', label: 'Attendance performance' },
  { key: 'reprimand', label: 'Reprimand' },
  { key: 'weight', label: 'Weight' },
]
// Manager review: all five tabs. 360 / Team / Self: General / Goals / Weight only.
const tabs = computed(() =>
  isManager.value ? allTabs : allTabs.filter(t => ['general', 'goals', 'weight'].includes(t.key)))
const activeTab = ref<TabKey>('general')

// ─── General ────────────────────────────────────────────────────────────────────
const template = ref('')
const templateOptions = [
  { value: 'default', label: 'Default template', description: 'Evaluation method: by rating' },
  { value: 'probation', label: 'Probation template', description: 'Evaluation method: by point' },
  { value: 'contract', label: 'Contract template', description: 'Evaluation method: by percentage' },
  { value: 'leadership', label: 'Leadership review', description: 'Evaluation method: by rating' },
]
// Manager review — reviewer resolution (Evaluation Cycle's "Who will review them?")
const reviewer = ref('approval-line')
const reviewerOptions = [
  { value: 'approval-line', label: 'By approval line' },
  { value: 'job-position', label: 'By job position' },
]
const autoAssignManager = ref(false)
const displayResult = ref(false)
// Self
const selfCommentOnly = ref(false)
// Team
const teamDisplayForManager = ref(false)
// 360
const display360ForManager = ref(false)
const pickCoworker = ref(false)
const allowReject = ref(false)

// ─── Goals / Attendance / Reprimand ─────────────────────────────────────────────
const includeGoals = ref(false)
const goalToInclude = ref('')
const goalOptions = [
  { value: 'company', label: 'Company goal' },
  { value: 'team', label: 'Team goal' },
  { value: 'individual', label: 'Individual goal' },
]
const includeAttendance = ref(false)
const includeReprimand = ref(false)
const reprimandDefineScore = ref(false)

// ─── Weight ───────────────────────────────────────────────────────────────────
const finalScoreCalc = ref<'use-weight' | 'simple-sum'>('use-weight')
const weightImplementation = ref<'all' | 'custom'>('all')

// ─── Validation (surfaces only after a save attempt) ────────────────────────────
const submitted = ref(false)
const templateInvalid = computed(() => submitted.value && !template.value)
const goalInvalid = computed(() => submitted.value && includeGoals.value && !goalToInclude.value)

// Reset to the first tab and clear validation whenever the drawer opens or the
// method changes.
watch(() => props.isOpen, (open) => {
  if (open) { activeTab.value = 'general'; submitted.value = false }
})
watch(methodKey, () => { activeTab.value = 'general'; submitted.value = false })

function close() {
  emit('update:isOpen', false)
}
function onSave() {
  submitted.value = true
  if (templateInvalid.value || goalInvalid.value) {
    // Jump to the tab that holds the first error so it's visible.
    activeTab.value = templateInvalid.value ? 'general' : 'goals'
    return
  }
  emit('saved')
  toast.notify({
    id: 'review-method-saved',
    position: 'top-center',
    variant: 'success',
    title: 'Review method saved',
  })
  close()
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
const tabBarWrap = css({
  display: 'flex', gap: '5',
  borderBottom: '1px solid', borderBottomColor: 'border.default',
  marginBottom: '6', overflowX: 'auto',
})
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2',
  paddingBlock: '3', paddingInline: '1', whiteSpace: 'nowrap',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400',
  color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })

const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const sectionHead = css({ display: 'flex', flexDirection: 'column', gap: '1', marginBottom: '4' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const subLabel = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', marginTop: '5', marginBottom: '2' })
const selectWidth = css({ width: { base: '100%', lg: '50%' } })
const indent = css({ marginLeft: '8', display: 'flex', flexDirection: 'column', gap: '4' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-review-method" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ drawerTitle }}
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>

        <MpDrawerBody :class="css({ display: 'flex', flexDirection: 'column', minHeight: '0' })">
          <!-- Tabs -->
          <div :class="tabBarWrap">
            <button
              v-for="t in tabs"
              :key="t.key"
              type="button"
              :class="activeTab === t.key ? tabItemActive : tabItem"
              @click="activeTab = t.key"
            >
              {{ t.label }}
            </button>
          </div>

          <!-- ── General ─────────────────────────────────────────────── -->
          <template v-if="activeTab === 'general'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">{{ methodLabel }}</MpText>
              <MpText size="label" color="text.secondary">{{ generalDescription }}</MpText>
            </div>

            <div :class="fields">
              <MpFormControl id="method-template" :is-invalid="templateInvalid">
                <PxSelectPopover
                  v-model="template"
                  :options="templateOptions"
                  placeholder="Select template"
                  :class="selectWidth"
                  searchable
                  search-placeholder="Search template"
                />
                <MpFormErrorMessage>You must select a template</MpFormErrorMessage>
              </MpFormControl>

              <!-- Manager review -->
              <template v-if="methodKey === 'manager'">
                <MpFormControl id="reviewer">
                  <MpFormLabel>Reviewer</MpFormLabel>
                  <PxSelectPopover v-model="reviewer" :options="reviewerOptions" :class="selectWidth" />
                </MpFormControl>
                <MpCheckbox :is-checked="autoAssignManager" @update:is-checked="(v) => (autoAssignManager = v)">
                  Automatically assign the employee manager to each selected member
                </MpCheckbox>
                <MpCheckbox :is-checked="displayResult" @update:is-checked="(v) => (displayResult = v)">
                  Display review result in details
                </MpCheckbox>
              </template>

              <!-- Self review -->
              <template v-else-if="methodKey === 'self'">
                <MpCheckbox :is-checked="selfCommentOnly" @update:is-checked="(v) => (selfCommentOnly = v)">
                  Review using comment only
                  <template #description>
                    Employees do not need to input scores, the review form is to be filled with comments only.
                  </template>
                </MpCheckbox>
              </template>

              <!-- Team review -->
              <template v-else-if="methodKey === 'team'">
                <MpCheckbox :is-checked="teamDisplayForManager" @update:is-checked="(v) => (teamDisplayForManager = v)">
                  Display team review result for manager
                  <template #description>
                    By enabling this option, manager can see Team review result of their subordinate on review form or pending action page.
                  </template>
                </MpCheckbox>
              </template>

              <!-- 360-degree review -->
              <template v-else>
                <MpCheckbox :is-checked="display360ForManager" @update:is-checked="(v) => (display360ForManager = v)">
                  Display 360-degree result for manager
                  <template #description>
                    By enabling this option, manager can see 360-degree result of their subordinate on review form or pending action page.
                  </template>
                </MpCheckbox>
                <MpCheckbox :is-checked="pickCoworker" @update:is-checked="(v) => (pickCoworker = v)">
                  Let members pick their own co-workers
                </MpCheckbox>
                <MpCheckbox :is-checked="allowReject" @update:is-checked="(v) => (allowReject = v)">
                  Allow reviewers to reject review tasks
                  <template #description>Reviewer can reject during review period.</template>
                </MpCheckbox>
              </template>
            </div>
          </template>

          <!-- ── Goals ───────────────────────────────────────────────── -->
          <template v-else-if="activeTab === 'goals'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">Goals</MpText>
              <MpText size="label" color="text.secondary">
                You can include the goals of each employee as a review indicator.
              </MpText>
            </div>
            <div :class="fields">
              <MpCheckbox :is-checked="includeGoals" @update:is-checked="(v) => (includeGoals = v)">
                Include goals
                <template #description>
                  You can include the goals of each employee as a review indicator.
                </template>
              </MpCheckbox>
              <template v-if="includeGoals">
                <MpFormControl id="goal-included" :is-invalid="goalInvalid">
                  <MpFormLabel>Goal to include</MpFormLabel>
                  <PxSelectPopover v-model="goalToInclude" :options="goalOptions" placeholder="Select goal" :class="selectWidth" />
                  <MpFormErrorMessage>You must select a goal to include</MpFormErrorMessage>
                </MpFormControl>
                <MpBanner variant="warning" is-inline>
                  <MpBannerIcon />
                  <MpBannerDescription>
                    This option can be used if the question type from the template is rating, percentage, or point.
                  </MpBannerDescription>
                </MpBanner>
              </template>
            </div>
          </template>

          <!-- ── Attendance performance (Manager only) ───────────────── -->
          <template v-else-if="activeTab === 'attendance'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">Attendance performance</MpText>
              <MpText size="label" color="text.secondary">
                Automatically calculate an employee's attendance score based on their attendance data during this review period.
              </MpText>
            </div>
            <div :class="fields">
              <MpCheckbox :is-checked="includeAttendance" @update:is-checked="(v) => (includeAttendance = v)">
                Include attendance data
                <template #description>
                  Use attendance records from the attendance module to calculate this score automatically.
                </template>
              </MpCheckbox>
              <MpBanner v-if="includeAttendance" variant="info" is-inline>
                <MpBannerIcon />
                <MpBannerDescription>
                  Attendance data is calculated based on the employee's active period — from their join date (if joined during this cycle) up to their last working day (if resigned).
                </MpBannerDescription>
              </MpBanner>
            </div>
          </template>

          <!-- ── Reprimand (Manager only) ────────────────────────────── -->
          <template v-else-if="activeTab === 'reprimand'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h2Class">Reprimand</MpText>
              <MpText size="label" color="text.secondary">
                You can include the reprimand history data as a review indicator, with a maximum range of one year.
              </MpText>
            </div>
            <div :class="fields">
              <MpCheckbox :is-checked="includeReprimand" @update:is-checked="(v) => (includeReprimand = v)">
                Include reprimand data
                <template #description>
                  The system will display employees' reprimand history on the review form. You can choose either to define the score based on the reprimand type or not by enabling the option below.
                </template>
              </MpCheckbox>
              <div v-if="includeReprimand" :class="indent">
                <MpCheckbox :is-checked="reprimandDefineScore" @update:is-checked="(v) => (reprimandDefineScore = v)">
                  Define a score or rating for reprimand
                </MpCheckbox>
              </div>
            </div>
          </template>

          <!-- ── Weight ──────────────────────────────────────────────── -->
          <template v-else-if="activeTab === 'weight'">
            <div :class="sectionHead">
              <MpText as="h2" :class="h3Class">Weight</MpText>
              <MpText size="label" color="text.secondary">
                Please define the weight of each category so the system can calculate the rating into the final score.
              </MpText>
            </div>

            <MpText :class="subLabel">Final score calculation</MpText>
            <div :class="fields">
              <MpRadio
                name="final-score-calc"
                value="use-weight"
                :is-checked="finalScoreCalc === 'use-weight'"
                @update:is-checked="finalScoreCalc = 'use-weight'"
              >
                Use weight
                <template #description>Final score will be calculated by the aspect score weight.</template>
              </MpRadio>
              <MpRadio
                name="final-score-calc"
                value="simple-sum"
                :is-checked="finalScoreCalc === 'simple-sum'"
                @update:is-checked="finalScoreCalc = 'simple-sum'"
              >
                Simple sum
                <template #description>Final score will be a sum of the aspect score.</template>
              </MpRadio>
            </div>

            <template v-if="finalScoreCalc === 'use-weight'">
              <MpText :class="subLabel">Weight implementation</MpText>
              <div :class="fields">
                <MpRadio
                  name="weight-implementation"
                  value="all"
                  :is-checked="weightImplementation === 'all'"
                  @update:is-checked="weightImplementation = 'all'"
                >
                  All employees
                </MpRadio>
                <MpRadio
                  name="weight-implementation"
                  value="custom"
                  :is-checked="weightImplementation === 'custom'"
                  @update:is-checked="weightImplementation = 'custom'"
                >
                  Custom
                </MpRadio>
              </div>

              <MpText :class="subLabel">Aspects</MpText>
              <MpText size="label" color="text.secondary">
                The employee performance aspects will be evaluated in this {{ methodLabel.toLowerCase() }}. Total weight per aspect must be 100%.
              </MpText>
            </template>
          </template>
        </MpDrawerBody>

        <MpDrawerFooter>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="onSave">Save</MpButton>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
