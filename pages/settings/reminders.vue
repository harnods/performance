<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Settings › Reminders
  Migrated from talenta-review: src/views/settings/reminders/Form.vue
  (route `settings_reminder`, `/settings/reminder`) — origin/master 6d105236b.
  Token mode: Pixel 2.4

  ⚠ MOCK DATA — nothing here is live. The production page GETs/PUTs
  `{newEndPoint}/reminder-settings` (review-service); this prototype keeps the
  same `contents[]` shape in MOCK_REMINDER_SETTINGS_RESPONSE and only changes
  local state. Stripped from production: axios fetch/put, spinner states,
  `isEnableToEdit` (isSuperAdmin || hasAccess('review-setting')), alertToast
  error paths.

  State names, copy, ids and slugs match production on purpose so a diff against
  Form.vue stays meaningful. Exception: the Goal reminder section is a prototype
  addition (Update goal achievement + Create goal, both over the goal period, see utils/goalReminders.ts) and its
  copy follows the Mekari UX writing library; its values live in
  useGoalRemindersStore so Goal cycle info can show which reminders run.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpToggle,
  MpButton,
  MpButtonGroup,
  MpIcon,
  MpDivider,
  MpCheckbox,
  MpInput,
  MpInputGroup,
  MpInputRightAddon,
  MpFormControl,
  MpFormLabel,
  MpFormHelpText,
  MpFormErrorMessage,
  MpTooltip,
  MpTextlink,
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  toast,
  css,
} from '@mekari/pixel3'

import type { Ref } from 'vue'
import { GOAL_REMINDERS, goalReminderChannelText, goalReminderMeta, goalReminderRepeatText, goalReminderTargetText } from '~/utils/goalReminders'
import type { GoalReminderKey } from '~/utils/goalReminders'

definePageMeta({ title: 'Reminders' })

interface ReminderSetting {
  uuid: string
  is_active: boolean
  time_before_end: number | null
  repeat_reminder: number | null
  reminder_for?: string[]
  notify_via?: string[]
}

type ReminderKey =
  | 'reviewReminderToCompleteReview'
  | 'reviewReminderAddedAsReviewer'
  | 'reviewReminderPickCoworker'
  | 'reviewReminderEndReviewPeriod'
  | 'reviewReminderCycleReadyToPublish'
  | 'goalReminderCreateGoal'
  | 'goalReminderUpdateGoalAchievement'

// ─── MOCK DATA (hardcoded — mirrors GET /reminder-settings `data.contents`) ───
const MOCK_REMINDER_SETTINGS_RESPONSE = {
  status: 200,
  data: {
    contents: [
      { uuid: 'uuid-1', slug: 'before-cycle-end', is_active: 1, time_before_end: 7, repeat_reminder: 1 },
      { uuid: 'uuid-2', slug: 'when-added-to-review', is_active: 0, time_before_end: 0, repeat_reminder: 0 },
      { uuid: 'uuid-3', slug: 'pick-coworker', is_active: 1, time_before_end: 0, repeat_reminder: 2 },
      { uuid: 'uuid-4', slug: 'review-period-end', is_active: 1, time_before_end: 3, repeat_reminder: 999 },
      { uuid: 'uuid-5', slug: 'cycle-is-complete', is_active: 1, time_before_end: 0, repeat_reminder: 0 },
    ],
  },
}

type Content = (typeof MOCK_REMINDER_SETTINGS_RESPONSE)['data']['contents'][number]
const contents: Content[] = MOCK_REMINDER_SETTINGS_RESPONSE.data.contents

function fromContent(slug: string): ReminderSetting {
  const c = contents.find(e => e.slug === slug)!
  return {
    uuid: c.uuid,
    is_active: !!c.is_active,
    time_before_end: c.time_before_end,
    repeat_reminder: c.repeat_reminder,
    ...('reminder_for' in c && c.reminder_for ? { reminder_for: String(c.reminder_for).split(',') } : {}),
  }
}

const reviewReminderToCompleteReview = ref<ReminderSetting>(fromContent('before-cycle-end'))
const reviewReminderAddedAsReviewer = ref<ReminderSetting>(fromContent('when-added-to-review'))
const reviewReminderPickCoworker = ref<ReminderSetting>(fromContent('pick-coworker'))
const reviewReminderEndReviewPeriod = ref<ReminderSetting>(fromContent('review-period-end'))
const reviewReminderCycleReadyToPublish = ref<ReminderSetting>(fromContent('cycle-is-complete'))

// Goal reminders come from the shared store (see header comment), copied so the drawer can
// edit freely and Cancel can restore; only Save changes / toggle-off writes back.
const { goalReminders, saveGoalReminder, turnOffGoalCreation } = useGoalRemindersStore()
// Create goal depends on the new Goals interface (Goal settings): off there = disabled and off here.
const newInterface = useCookie<boolean>('goals-new-interface', { default: () => true })
if (!newInterface.value) turnOffGoalCreation()
// Only a Super Admin edits reminders (stand-in for the Reminder edit permission); everyone else is view-only.
const { currentUserId } = useCurrentUser()
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const canEdit = computed(() => !mounted.value || isSuperAdmin(currentUserId.value))
function isRowLocked(key: GoalReminderKey) { return !canEdit.value || (key === 'creation' && !newInterface.value) }
function fromStore(k: GoalReminderKey): ReminderSetting {
  const r = goalReminders.value[k]
  return { uuid: r.uuid, is_active: r.is_active, time_before_end: r.time_before_end, repeat_reminder: r.repeat_reminder, reminder_for: [...r.reminder_for], notify_via: [...r.notify_via] }
}
const goalReminderCreateGoal = ref<ReminderSetting>(fromStore('creation'))
const goalReminderUpdateGoalAchievement = ref<ReminderSetting>(fromStore('progress'))
const GOAL_KEY: Partial<Record<ReminderKey, GoalReminderKey>> = {
  goalReminderCreateGoal: 'creation',
  goalReminderUpdateGoalAchievement: 'progress',
}
const goalRows = GOAL_REMINDERS.map(meta => ({
  meta,
  key: (Object.keys(GOAL_KEY) as ReminderKey[]).find(k => GOAL_KEY[k] === meta.key)!,
}))

const reminders: Record<ReminderKey, Ref<ReminderSetting>> = {
  reviewReminderToCompleteReview,
  reviewReminderAddedAsReviewer,
  reviewReminderPickCoworker,
  reviewReminderEndReviewPeriod,
  reviewReminderCycleReadyToPublish,
  goalReminderCreateGoal,
  goalReminderUpdateGoalAchievement,
}

const DRAWER_TITLES: Partial<Record<ReminderKey, string>> = {
  goalReminderCreateGoal: 'Create goal',
  goalReminderUpdateGoalAchievement: 'Update goal achievement',
  reviewReminderEndReviewPeriod: 'End review period',
  reviewReminderPickCoworker: 'Pick co-worker',
  reviewReminderToCompleteReview: 'Reminder to review',
}

// ─── Drawer state ────────────────────────────────────────────────────────────
const isDrawerReminder = ref(false)
const titleDrawer = ref('')
const activeReminder = ref<ReminderKey | ''>('')
const tempReminder = ref<ReminderSetting | null>(null)
const startValidation = ref(false)

const active = computed(() => (activeReminder.value ? reminders[activeReminder.value].value : null))
// Goal drawers use the UX-writing-library copy; review drawers keep production's.
const activeGoalMeta = computed(() => {
  const k = activeReminder.value ? GOAL_KEY[activeReminder.value] : undefined
  return k ? goalReminderMeta(k) : null
})

// Digits only, 1–999 (production: oninput clamps to Math.abs and type=number max=999).
function toPositiveInt(v: string | number | null | undefined): number | null {
  const n = Math.abs(Math.trunc(Number(v)))
  return n > 0 ? Math.min(n, 999) : null
}

const repeatInvalid = computed(() => startValidation.value && !active.value?.repeat_reminder)
// Lead-time field: End review period only (goal reminders just repeat over the goal period).
const hasBeforeEnd = computed(() => activeReminder.value === 'reviewReminderEndReviewPeriod')
const beforeEndInvalid = computed(() => startValidation.value && !active.value?.time_before_end)
const targetInvalid = computed(() => startValidation.value && !active.value?.reminder_for?.length)

function onChangeToggle(val: boolean | 'edit', typeReminder: ReminderKey) {
  if (val) {
    isDrawerReminder.value = true
    activeReminder.value = typeReminder
    titleDrawer.value = DRAWER_TITLES[typeReminder] ?? ''
    // temp copy for cancel; is_active based on edit (a toggle-on that is cancelled stays off)
    const current = reminders[typeReminder].value
    tempReminder.value = { ...current, reminder_for: current.reminder_for && [...current.reminder_for], notify_via: current.notify_via && [...current.notify_via], is_active: val === 'edit' }
  } else {
    saveReminder(typeReminder)
  }
}

function onToggle(typeReminder: ReminderKey, checked: boolean, opensDrawer: boolean) {
  reminders[typeReminder].value.is_active = checked
  if (opensDrawer) onChangeToggle(checked, typeReminder)
  else saveReminder(typeReminder)
}

async function saveReminder(typeReminder: ReminderKey | '') {
  if (!typeReminder) return
  startValidation.value = true
  await nextTick()
  const r = reminders[typeReminder].value
  const needsBeforeEnd = typeReminder === 'reviewReminderEndReviewPeriod'
  const needsTarget = !!GOAL_KEY[typeReminder]
  const drawerOpen = isDrawerReminder.value
  if (drawerOpen && (!r.repeat_reminder || (needsBeforeEnd && !r.time_before_end) || (needsTarget && !r.reminder_for?.length))) return
  // Mock "PUT /reminder-settings/{uuid}" — local state only (goal reminders also go to the shared store).
  const goalKey = GOAL_KEY[typeReminder]
  if (goalKey) saveGoalReminder(goalKey, { uuid: r.uuid, is_active: r.is_active, time_before_end: r.time_before_end, repeat_reminder: r.repeat_reminder, reminder_for: r.reminder_for ?? [], notify_via: r.notify_via ?? [] })
  isDrawerReminder.value = false
  startValidation.value = false
  toast.notify({ id: 'reminder-saved', position: 'top-center', variant: 'success', title: goalKey ? 'Reminder changes saved' : 'Reminder successfully updated' })
}

function onClose() {
  isDrawerReminder.value = false
  startValidation.value = false
  // cancel → restore the state from before the drawer opened
  if (activeReminder.value && tempReminder.value) reminders[activeReminder.value].value = tempReminder.value
}

function repeatText(r: ReminderSetting) {
  return r.repeat_reminder === 1 ? 'everyday' : `every ${r.repeat_reminder} day(s)`
}

// Divider gap depends on whether the row above shows a summary block (production behaviour).
function dividerClass(key: ReminderKey, hasSummary: boolean) {
  return reminders[key].value.is_active && hasSummary ? dividerAfterSummary : dividerAfterPlain
}

// Scroll to the Goal reminder section when opened from Goal cycle info (#goal-reminder).
const route = useRoute()
onMounted(() => {
  if (route.hash === '#goal-reminder') nextTick(() => document.getElementById('goal-reminder')?.scrollIntoView({ block: 'start' }))
})

// ─── Layout (DT 2.4) ─────────────────────────────────────────────────────────
// Measured on review.talenta.co/settings/reminder: 684px form column; header → first row 16px;
// last row caption → next H2 44px; rows split by a 1px divider with 12px margins.
const gridArea = css({ width: '100%', maxWidth: '684px' })
const formColumn = css({ display: 'flex', flexDirection: 'column' })
const firstSectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '4' })
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '44px', marginBottom: '4' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
// Divider gap above: 24px under a plain row's caption, 12px under a summary block; 14px below
// (production's toggle label carries 4px of its own padding).
const dividerAfterPlain = css({ paddingTop: '6', paddingBottom: '14px' })
const dividerAfterSummary = css({ paddingTop: '3', paddingBottom: '14px' })
const dividerFlat = css({ margin: '0 !important' })
const toggleRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4' })
const editButton = css({ marginTop: '2', flexShrink: '0' })
const summary = css({ display: 'flex', flexDirection: 'column', gap: '2', paddingLeft: '10', marginTop: '5' })
const summaryLine = css({ display: 'flex', alignItems: 'center', gap: '2', minHeight: '24px' })
const unitText = css({ paddingX: '2' })
const drawerFields = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const notifyVia = css({ display: 'flex', flexDirection: 'column', gap: '2', marginTop: '5' })
</script>

<template>
  <div :class="gridArea">
    <div :class="formColumn">
      <!-- ── Review reminder ─────────────────────────────────────────── -->
      <div :class="firstSectionHeader">
        <MpText as="h2" :class="h2Class">Review reminder</MpText>
        <MpText size="label" color="text.secondary">You can set reminders for each event that occurs during the performance review.</MpText>
      </div>

      <!-- Reminder to complete review -->
      <div>
        <div :class="toggleRow">
          <MpToggle
            id="reminder-to-complete-review-toggle"
            :is-checked="reviewReminderToCompleteReview.is_active"
            :is-disabled="!canEdit"
            @update:is-checked="(v: boolean) => onToggle('reviewReminderToCompleteReview', v, true)"
          >
            Reminder to complete review
            <template #description>Notify employee to complete a review</template>
          </MpToggle>
          <MpButton v-if="reviewReminderToCompleteReview.is_active" variant="secondary" size="sm" :class="editButton" @click="onChangeToggle('edit', 'reviewReminderToCompleteReview')">Edit</MpButton>
        </div>
        <div v-if="reviewReminderToCompleteReview.is_active" :class="summary">
          <div :class="summaryLine">
            <MpIcon name="refresh" size="sm" />
            <MpText color="text.secondary">Repeat reminder <MpText as="span" weight="semiBold" color="text.default">{{ repeatText(reviewReminderToCompleteReview) }}</MpText></MpText>
          </div>
        </div>
      </div>
      <div :class="dividerClass('reviewReminderToCompleteReview', true)"><MpDivider :class="dividerFlat" /></div>

      <!-- Added as a reviewer -->
      <div>
        <MpToggle
          id="added-as-a-reviewer-toggle"
          :is-checked="reviewReminderAddedAsReviewer.is_active"
          :is-disabled="!canEdit"
            @update:is-checked="(v: boolean) => onToggle('reviewReminderAddedAsReviewer', v, false)"
        >
          Added as a reviewer
          <template #description>Notify employee when they are assigned as reviewer</template>
        </MpToggle>
      </div>
      <div :class="dividerAfterPlain"><MpDivider :class="dividerFlat" /></div>

      <!-- Pick co-worker -->
      <div>
        <div :class="toggleRow">
          <MpToggle
            id="pick-co-worker-toggle"
            :is-checked="reviewReminderPickCoworker.is_active"
            :is-disabled="!canEdit"
            @update:is-checked="(v: boolean) => onToggle('reviewReminderPickCoworker', v, true)"
          >
            Pick co-worker
            <template #description>Notify employee to pick-coworker in review period</template>
          </MpToggle>
          <MpButton v-if="reviewReminderPickCoworker.is_active" variant="secondary" size="sm" :class="editButton" @click="onChangeToggle('edit', 'reviewReminderPickCoworker')">Edit</MpButton>
        </div>
        <div v-if="reviewReminderPickCoworker.is_active" :class="summary">
          <div :class="summaryLine">
            <MpIcon name="refresh" size="sm" />
            <MpText color="text.secondary">Repeat reminder <MpText as="span" weight="semiBold" color="text.default">{{ repeatText(reviewReminderPickCoworker) }}</MpText></MpText>
          </div>
        </div>
      </div>
      <div :class="dividerClass('reviewReminderPickCoworker', true)"><MpDivider :class="dividerFlat" /></div>

      <!-- End review period -->
      <div>
        <div :class="toggleRow">
          <MpToggle
            id="end-review-periode-toggle"
            :is-checked="reviewReminderEndReviewPeriod.is_active"
            :is-disabled="!canEdit"
            @update:is-checked="(v: boolean) => onToggle('reviewReminderEndReviewPeriod', v, true)"
          >
            End review period
            <template #description>Notify HR when review period come to end</template>
          </MpToggle>
          <MpButton v-if="reviewReminderEndReviewPeriod.is_active" variant="secondary" size="sm" :class="editButton" @click="onChangeToggle('edit', 'reviewReminderEndReviewPeriod')">Edit</MpButton>
        </div>
        <div v-if="reviewReminderEndReviewPeriod.is_active" :class="summary">
          <div :class="summaryLine">
            <MpIcon name="calendar" size="sm" />
            <MpText color="text.secondary">Remind <MpText as="span" weight="semiBold" color="text.default">{{ `${reviewReminderEndReviewPeriod.time_before_end} day(s)` }}</MpText> before review period end</MpText>
          </div>
          <div :class="summaryLine">
            <MpIcon name="refresh" size="sm" />
            <MpText color="text.secondary">Repeat reminder <MpText as="span" weight="semiBold" color="text.default">{{ repeatText(reviewReminderEndReviewPeriod) }}</MpText></MpText>
          </div>
        </div>
      </div>
      <div :class="dividerClass('reviewReminderEndReviewPeriod', true)"><MpDivider :class="dividerFlat" /></div>

      <!-- Cycle ready to publish -->
      <div>
        <MpToggle
          id="cycle-ready-to-publish-toggle"
          :is-checked="reviewReminderCycleReadyToPublish.is_active"
          :is-disabled="!canEdit"
            @update:is-checked="(v: boolean) => onToggle('reviewReminderCycleReadyToPublish', v, false)"
        >
          Cycle ready to publish
          <template #description>Notify HR when review cycle is ready to publish</template>
        </MpToggle>
      </div>

      <!-- ── Goal reminder (Goal creation + Update goal progress) ─────── -->
      <div id="goal-reminder" :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Goal reminder</MpText>
        <MpText size="label" color="text.secondary">You can set reminders for each event that occurs during the goal management.</MpText>
      </div>

      <template v-for="(row, i) in goalRows" :key="row.key">
        <div>
          <div :class="toggleRow">
            <MpTooltip v-if="row.meta.key === 'creation' && !newInterface" label="Only available in the new Goals interface" :show-delay="0" placement="top" use-portal>
              <span><!-- wrapper keeps hover alive on the disabled toggle -->
                <MpToggle
                  :id="row.meta.toggleId"
                  :is-checked="false"
                  is-disabled
                >
                  {{ row.meta.title }}
                  <template #description>
                    {{ row.meta.description }}.<br>Turn on the new Goals interface in <MpTextlink as="a" href="/goals/goal-settings" target="_blank" rel="noopener">Goal settings</MpTextlink> to use it
                  </template>
                </MpToggle>
              </span>
            </MpTooltip>
            <MpToggle
              v-else
              :id="row.meta.toggleId"
              :is-checked="reminders[row.key].value.is_active"
              :is-disabled="isRowLocked(row.key)"
              @update:is-checked="(v: boolean) => onToggle(row.key, v, true)"
            >
              {{ row.meta.title }}
              <template #description>{{ row.meta.description }}</template>
            </MpToggle>
            <MpButton v-if="reminders[row.key].value.is_active" variant="secondary" size="sm" :class="editButton" @click="onChangeToggle('edit', row.key)">{{ canEdit ? 'Edit' : 'View' }}</MpButton>
          </div>
          <div v-if="reminders[row.key].value.is_active" :class="summary">
            <div :class="summaryLine">
              <MpIcon name="employee" size="sm" />
              <MpText color="text.secondary">{{ goalReminderTargetText(row.meta.key, reminders[row.key].value.reminder_for ?? []) }}</MpText>
            </div>
            <div :class="summaryLine">
              <MpIcon name="refresh" size="sm" />
              <MpText color="text.secondary">Repeat reminder <MpText as="span" weight="semiBold" color="text.default">{{ goalReminderRepeatText(reminders[row.key].value.repeat_reminder) }}</MpText> during the goal cycle</MpText>
            </div>
            <div :class="summaryLine">
              <MpIcon name="notification" size="sm" />
              <MpText color="text.secondary">Notify via <MpText as="span" weight="semiBold" color="text.default">{{ goalReminderChannelText(reminders[row.key].value.notify_via ?? []) }}</MpText></MpText>
            </div>
          </div>
        </div>
        <div v-if="i < goalRows.length - 1" :class="dividerClass(row.key, true)"><MpDivider :class="dividerFlat" /></div>
      </template>
    </div>
  </div>

  <!-- ── Edit drawer ──────────────────────────────────────────────────── -->
  <ClientOnly>
    <MpDrawer id="drawer-reminder" :is-open="isDrawerReminder" placement="right" size="md" @close="onClose">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ titleDrawer }}
          <MpDrawerCloseButton />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div v-if="active" :class="drawerFields">
            <!-- End review period: lead time -->
            <MpFormControl v-if="hasBeforeEnd" id="reminder-before-end" :is-invalid="beforeEndInvalid">
              <MpFormLabel>Before review period end</MpFormLabel>
              <MpInputGroup>
                <MpInput
                  type="number"
                  min="1"
                  max="999"
                  :is-disabled="!canEdit"
                  :model-value="active.time_before_end ?? ''"
                  @update:model-value="(v: string | number) => (active!.time_before_end = toPositiveInt(v))"
                />
                <MpInputRightAddon><MpText weight="bold" :class="unitText">Day(s)</MpText></MpInputRightAddon>
              </MpInputGroup>
              <MpFormHelpText>Send reminder when review period come to end.</MpFormHelpText>
              <MpFormErrorMessage>This field is required</MpFormErrorMessage>
            </MpFormControl>

            <!-- Repeat every (all four editable reminders) -->
            <MpFormControl id="reminder-repeat-every" :is-invalid="repeatInvalid">
              <MpFormLabel>Repeat every</MpFormLabel>
              <MpInputGroup>
                <MpInput
                  type="number"
                  min="1"
                  max="999"
                  :is-disabled="!canEdit"
                  :model-value="active.repeat_reminder ?? ''"
                  @update:model-value="(v: string | number) => (active!.repeat_reminder = toPositiveInt(v))"
                />
                <MpInputRightAddon><MpText weight="bold" :class="unitText">Day(s)</MpText></MpInputRightAddon>
              </MpInputGroup>
              <MpFormHelpText>{{ activeGoalMeta ? activeGoalMeta.stopHint : 'Reminder will stop when review period ends.' }}</MpFormHelpText>
              <MpFormErrorMessage>{{ activeGoalMeta ? 'You must fill in Repeat every' : 'This field is required' }}</MpFormErrorMessage>
            </MpFormControl>

            <!-- Goal reminders only: who gets it -->
            <MpFormControl v-if="activeGoalMeta" id="reminder-target" :is-invalid="targetInvalid">
              <MpFormLabel>Reminder target</MpFormLabel>
              <MpFlex direction="column" gap="2">
                <MpCheckbox
                  v-for="t in activeGoalMeta.targets"
                  :id="`reminder-target-${activeGoalMeta.key}-${t.value}`"
                  :key="t.value"
                  v-model="active.reminder_for"
                  :value="t.value"
                  :is-disabled="!canEdit"
                  name="reminder-target"
                >
                  {{ t.label }}
                  <template #description>{{ t.description }}</template>
                </MpCheckbox>
              </MpFlex>
              <MpFormErrorMessage>You must select at least one</MpFormErrorMessage>
            </MpFormControl>
          </div>

          <div :class="notifyVia">
            <MpText weight="semiBold">Notify via</MpText>
            <div :class="summaryLine">
              <MpIcon name="envelope" />
              <MpText color="text.secondary">Email notification</MpText>
            </div>
            <div :class="summaryLine">
              <MpIcon name="notification" />
              <MpText color="text.secondary">Mobile push notification</MpText>
            </div>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton v-if="!canEdit" variant="secondary" @click="onClose">Close</MpButton>
            <MpButton v-if="canEdit" variant="ghost" @click="onClose">Cancel</MpButton>
            <MpButton v-if="canEdit" variant="primary" @click="saveReminder(activeReminder)">{{ activeGoalMeta ? 'Save changes' : 'Submit' }}</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
