<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Create competency assignment
  Source: Flexible Competency Assignment PRD — US1 (Create Assignment page)
  Token mode: Pixel 2.4
  Patterns used: layout-shell, form-view, conditional fields, dynamic sub-section table
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  STATES INCLUDED:
    - Happy path (scoped + unscoped Set group variants)
    - Conditional reveal: scope value picker appears when "Scope by" ≠ None
    - Empty Set group: illustrated-lite empty block, "+ Add competency group" above it
    - Error: form-level danger banner (missing fields) + uniqueness-conflict banner
    - Null-safe: placeholders, em dash where applicable

  CONFIRMED DECISIONS (from requirement Q&A 2026-06-03):
    - Single value per scoping attribute (e.g. one job level)
    - One "Scope by" dropdown (None / Job level / Grade / Class) + dependent value picker
    - D1: cannot combine two scoping attributes; D3: (position + scope value) unique;
      D4: job position always required; D6: unscoped = existing behavior, unchanged.

  COPY DEFAULTS (PRD didn't specify exact strings — iterate freely):
    - Scope-by label "Scope by", helper as below
    - Submit verb "Create assignment"; success toast "Assignment created" (PRD)
    - Uniqueness error copy (see UNIQUE_ERROR)

  DEVIATIONS / OPEN ITEMS:
    - Success uses an inline success banner on the list page (?created=1) instead of a
      global toast — pixel3 `toast.notify` needs a mounted MpToastManager which this app
      doesn't have yet. Swap to toast once the manager is mounted in the layout.
    - Job position is a multi-select built from MpPopover + MpTag (no dedicated Pixel
      multi-select used in this codebase yet).
    - Unscoped "Group name | Select job level | + Add job level" mirrors existing behavior;
      exact column labels to be reconciled against the current production screenshot.
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpInput,
  MpText,
  MpIcon,
  MpTag,
  MpFormControl,
  MpFormLabel,
  MpFormHelpText,
  MpFormErrorMessage,
  MpBanner,
  MpBannerIcon,
  MpBannerTitle,
  MpBannerDescription,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'

definePageMeta({
  title: 'Create assignment',
  layout: 'default',
  breadcrumb: { label: 'Competency assignment', to: '/talents/competencies' },
})

const router = useRouter()

// ─── Copy constants (iterate freely) ───────────────────────────────────────────
const COPY = {
  nameLabel: 'Assignment name',
  namePlaceholder: 'e.g. Product Manager — Manager level',
  positionLabel: 'Job position',
  positionPlaceholder: 'Select one or more job positions',
  positionHelper: 'Competencies are assigned to everyone in the selected job positions.',
  scopeLabel: 'Scope by',
  scopeHelper: 'Optional. Narrow this assignment to one job level, grade, or class within the selected job position.',
  scopeValuePrefix: 'Select',
  setGroupTitle: 'Set group',
  setGroupHelperScoped: 'Set one target rating per competency group. The level/grade/class is fixed by the scope above.',
  setGroupHelperUnscoped: 'Add competency groups and set a target rating per job level.',
  addGroup: 'Add competency group',
  addLevel: 'Add job level',
  emptyTitle: 'No competency group added yet',
  emptyHelper: 'Add a group from the Add competency group button.',
  submit: 'Create assignment',
  cancel: 'Cancel',
}

const UNIQUE_ERROR = (position: string, value: string) =>
  `An assignment already exists for ${position} and ${value}. Choose a different value, or edit the existing assignment.`

// ─── Option data (mock) ─────────────────────────────────────────────────────────
const jobPositionOptions = [
  { value: 'product-manager', label: 'Product Manager' },
  { value: 'engineering-manager', label: 'Engineering Manager' },
  { value: 'software-engineer', label: 'Software Engineer' },
  { value: 'ux-designer', label: 'UX Designer' },
  { value: 'data-analyst', label: 'Data Analyst' },
  { value: 'sales-executive', label: 'Sales Executive' },
]

// "None" first → reverts the Set group to existing per-level behavior.
const scopeTypeOptions = [
  { value: '', label: 'None (all levels)' },
  { value: 'job-level', label: 'Job level' },
  { value: 'grade', label: 'Grade' },
  { value: 'class', label: 'Class' },
]

const jobLevelOptions = [
  { value: 'staff', label: 'Staff' },
  { value: 'senior', label: 'Senior' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior-manager', label: 'Senior Manager' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
]
const gradeOptions = Array.from({ length: 6 }, (_, i) => ({ value: `grade-${i + 1}`, label: `Grade ${i + 1}` }))
const classOptions = ['A', 'B', 'C', 'D'].map(c => ({ value: `class-${c.toLowerCase()}`, label: `Class ${c}` }))

const competencyGroupOptions = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'communication', label: 'Communication' },
  { value: 'technical-excellence', label: 'Technical excellence' },
  { value: 'product-thinking', label: 'Product thinking' },
  { value: 'stakeholder-management', label: 'Stakeholder management' },
  { value: 'execution', label: 'Execution' },
]
const ratingOptions = [
  { value: '1', label: '1 — Needs development' },
  { value: '2', label: '2 — Developing' },
  { value: '3', label: '3 — Proficient' },
  { value: '4', label: '4 — Advanced' },
  { value: '5', label: '5 — Expert' },
]

// Mock of already-existing (position + scope value) combinations — drives the
// uniqueness conflict demo (D3). In production this is a server-side constraint.
const existingCombos = [
  { position: 'product-manager', scopeType: 'job-level', scopeValue: 'manager' },
]

// ─── Form state ──────────────────────────────────────────────────────────────
const assignmentName = ref('')
const selectedPositions = ref<string[]>([])
const scopeType = ref<'' | 'job-level' | 'grade' | 'class'>('')
const scopeValue = ref('')

interface LevelRow { lid: number; levelId: string; rating: string }
interface GroupRow { gid: number; groupId: string; targetRating: string; levels: LevelRow[] }

let uid = 0
const nextId = () => ++uid
const makeLevel = (): LevelRow => ({ lid: nextId(), levelId: '', rating: '' })
const makeGroup = (): GroupRow => ({ gid: nextId(), groupId: '', targetRating: '', levels: [makeLevel()] })

const groups = ref<GroupRow[]>([])

// ─── Derived ───────────────────────────────────────────────────────────────────
const isScoped = computed(() => scopeType.value !== '')

const scopeValueOptions = computed(() => {
  switch (scopeType.value) {
    case 'job-level': return jobLevelOptions
    case 'grade': return gradeOptions
    case 'class': return classOptions
    default: return []
  }
}) as ComputedRef<{ value: string; label: string }[]>

const scopeTypeLabel = computed(() =>
  scopeTypeOptions.find(o => o.value === scopeType.value)?.label.toLowerCase().replace(' (all levels)', '') ?? '',
)
const scopeValuePlaceholder = computed(() =>
  `${COPY.scopeValuePrefix} ${isScoped.value ? scopeTypeLabel.value : 'value'}`,
)

const positionLabelOf = (v: string) => jobPositionOptions.find(o => o.value === v)?.label ?? v

// Reset the dependent value when the type changes.
watch(scopeType, () => { scopeValue.value = '' })

// ─── Multi-select (job position) ────────────────────────────────────────────────
function togglePosition(v: string) {
  const i = selectedPositions.value.indexOf(v)
  if (i === -1) selectedPositions.value.push(v)
  else selectedPositions.value.splice(i, 1)
}
function removePosition(v: string) {
  selectedPositions.value = selectedPositions.value.filter(p => p !== v)
}

// ─── Set group mutations ─────────────────────────────────────────────────────────
function addGroup() { groups.value.push(makeGroup()) }
function removeGroup(gid: number) { groups.value = groups.value.filter(g => g.gid !== gid) }
function addLevel(group: GroupRow) { group.levels.push(makeLevel()) }
function removeLevel(group: GroupRow, lid: number) {
  group.levels = group.levels.filter(l => l.lid !== lid)
}

// ─── Validation ──────────────────────────────────────────────────────────────────
const submitted = ref(false)
const formError = ref('')

const nameInvalid = computed(() => submitted.value && !assignmentName.value.trim())
const positionInvalid = computed(() => submitted.value && selectedPositions.value.length === 0)
const scopeValueInvalid = computed(() => submitted.value && isScoped.value && !scopeValue.value)

function groupInvalid(g: GroupRow): boolean {
  if (!submitted.value) return false
  if (!g.groupId) return true
  if (isScoped.value) return !g.targetRating
  return !g.levels.some(l => l.levelId && l.rating)
}

function validate(): boolean {
  formError.value = ''
  const missing
    = nameInvalid.value
    || positionInvalid.value
    || scopeValueInvalid.value
    || groups.value.length === 0
    || groups.value.some(groupInvalid)

  if (missing) {
    formError.value = 'Please complete the highlighted fields before creating the assignment.'
    return false
  }

  // Uniqueness (D3) — only relevant when scoped.
  if (isScoped.value) {
    const clash = selectedPositions.value.find(p =>
      existingCombos.some(c => c.position === p && c.scopeType === scopeType.value && c.scopeValue === scopeValue.value),
    )
    if (clash) {
      const valueLabel = scopeValueOptions.value.find(o => o.value === scopeValue.value)?.label ?? scopeValue.value
      formError.value = UNIQUE_ERROR(positionLabelOf(clash), valueLabel)
      return false
    }
  }
  return true
}

function onSubmit() {
  submitted.value = true
  if (!validate()) return
  router.push({
    path: '/talents/competencies',
    query: { created: '1', name: assignmentName.value.trim() },
  })
}
function onCancel() {
  router.push('/talents/competencies')
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({
  gridColumn: { base: 'span 12 / span 12', lg: 'span 7 / span 7' },
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
})
const selectWidth = '320px'

const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '6', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const divider = css({ height: '1px', background: 'border.default', marginTop: '6' })

const scopeBox = css({
  display: 'flex', flexDirection: 'column', gap: '3',
  padding: '4',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'md',
  background: 'background.surface',
})

// Multi-select trigger box
const msField = css({
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2',
  minHeight: '40px', width: selectWidth, paddingInline: '3', paddingBlock: '1',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'md',
  cursor: 'pointer', background: 'background.stage',
})
const msFieldInvalid = css({
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2',
  minHeight: '40px', width: selectWidth, paddingInline: '3', paddingBlock: '1',
  border: '1px solid', borderColor: 'border.danger', borderRadius: 'md',
  cursor: 'pointer', background: 'background.stage',
})

const groupCard = css({
  display: 'flex', flexDirection: 'column', gap: '3',
  paddingBlock: '4', borderTop: '1px solid', borderTopColor: 'border.default',
})
const groupHead = css({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4' })
const levelRow = css({ display: 'flex', alignItems: 'flex-end', gap: '3', paddingLeft: '4' })

const emptyBlock = css({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1',
  paddingBlock: '10', border: '1px dashed', borderColor: 'border.default', borderRadius: 'md',
  background: 'background.surface',
})
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2', paddingTop: '6' })
const captionText = css({ color: 'text.secondary' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="ghost" @click="onCancel">{{ COPY.cancel }}</MpButton>
    <MpButton variant="primary" @click="onSubmit">{{ COPY.submit }}</MpButton>
  </Teleport>

  <div :class="gridArea">
    <div :class="formColumn">

      <!-- ═════ Form-level error banner ═════ -->
      <MpBanner v-if="formError" variant="danger">
        <MpBannerIcon />
        <MpBannerTitle>Couldn't create assignment</MpBannerTitle>
        <MpBannerDescription>{{ formError }}</MpBannerDescription>
      </MpBanner>

      <!-- ═════ Assignment name ═════ -->
      <MpFormControl id="assignment-name" :is-required="true" :is-invalid="nameInvalid">
        <MpFormLabel>{{ COPY.nameLabel }}</MpFormLabel>
        <MpInput
          v-model="assignmentName"
          :placeholder="COPY.namePlaceholder"
          :class="css({ width: selectWidth })"
        />
        <MpFormErrorMessage>Assignment name is required.</MpFormErrorMessage>
      </MpFormControl>

      <!-- ═════ Job position (multi-select) ═════ -->
      <MpFormControl id="job-position" :is-required="true" :is-invalid="positionInvalid">
        <MpFormLabel>{{ COPY.positionLabel }}</MpFormLabel>
        <MpPopover is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <div :class="positionInvalid ? msFieldInvalid : msField">
              <template v-if="selectedPositions.length">
                <MpTag
                  v-for="p in selectedPositions"
                  :key="p"
                  variant="primary"
                  @close="removePosition(p)"
                >
                  {{ positionLabelOf(p) }}
                </MpTag>
              </template>
              <MpText v-else size="label" :class="captionText">{{ COPY.positionPlaceholder }}</MpText>
              <MpIcon name="chevron-down" :class="css({ marginLeft: 'auto', color: 'icon.default' })" />
            </div>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem
                v-for="opt in jobPositionOptions"
                :key="opt.value"
                :is-active="selectedPositions.includes(opt.value)"
                @click="togglePosition(opt.value)"
              >
                <MpFlex align="center" justify="space-between" gap="3" :class="css({ width: '100%' })">
                  {{ opt.label }}
                  <MpIcon v-if="selectedPositions.includes(opt.value)" name="check" :class="css({ color: 'icon.brand' })" />
                </MpFlex>
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpFormHelpText>{{ COPY.positionHelper }}</MpFormHelpText>
        <MpFormErrorMessage>Select at least one job position.</MpFormErrorMessage>
      </MpFormControl>

      <!-- ═════ Scope by (NEW) — type dropdown + dependent value picker ═════ -->
      <div :class="scopeBox">
        <MpFormControl id="scope-type">
          <MpFormLabel>{{ COPY.scopeLabel }}</MpFormLabel>
          <MpFlex align="flex-start" gap="3" wrap="wrap">
            <PxSelectPopover
              v-model="scopeType"
              :options="scopeTypeOptions"
              :width="'200px'"
            />
            <!-- Dependent value picker — revealed only when a type is chosen -->
            <PxSelectPopover
              v-if="isScoped"
              v-model="scopeValue"
              :options="scopeValueOptions"
              :placeholder="scopeValuePlaceholder"
              :width="'200px'"
              searchable
            />
          </MpFlex>
          <MpFormHelpText>{{ COPY.scopeHelper }}</MpFormHelpText>
        </MpFormControl>
        <MpText v-if="scopeValueInvalid" size="label-small" :class="css({ color: 'text.danger' })">
          Select a {{ scopeTypeLabel }} value, or set Scope by to None.
        </MpText>
      </div>

      <!-- ═════ Set group ═════ -->
      <div :class="divider" />
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">{{ COPY.setGroupTitle }}</MpText>
        <MpText size="label" :class="captionText">
          {{ isScoped ? COPY.setGroupHelperScoped : COPY.setGroupHelperUnscoped }}
        </MpText>
      </div>

      <!-- Add action sits ABOVE the list (reachable whether empty or populated) -->
      <MpFlex>
        <MpButton variant="secondary" size="sm" left-icon="add" @click="addGroup">
          {{ COPY.addGroup }}
        </MpButton>
      </MpFlex>

      <!-- Empty state -->
      <div v-if="groups.length === 0" :class="emptyBlock">
        <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">{{ COPY.emptyTitle }}</MpText>
        <MpText size="label-small" :class="captionText">
          Add a group from the <strong>{{ COPY.addGroup }}</strong> button.
        </MpText>
      </div>

      <!-- Group rows -->
      <template v-else>
        <div v-for="group in groups" :key="group.gid" :class="groupCard">
          <div :class="groupHead">
            <MpFormControl :id="`group-${group.gid}`" :is-invalid="submitted && !group.groupId">
              <MpFormLabel>Competency group</MpFormLabel>
              <PxSelectPopover
                v-model="group.groupId"
                :options="competencyGroupOptions"
                placeholder="Select group"
                :width="'260px'"
                searchable
              />
            </MpFormControl>

            <!-- Scoped: one rating for the whole group -->
            <MpFormControl
              v-if="isScoped"
              :id="`rating-${group.gid}`"
              :is-invalid="submitted && !group.targetRating"
            >
              <MpFormLabel>Target rating</MpFormLabel>
              <PxSelectPopover
                v-model="group.targetRating"
                :options="ratingOptions"
                placeholder="Select rating"
                :width="'200px'"
              />
            </MpFormControl>

            <MpButton
              variant="ghost"
              size="sm"
              left-icon="delete"
              aria-label="Remove group"
              @click="removeGroup(group.gid)"
            />
          </div>

          <!-- Unscoped: existing per-level target table -->
          <template v-if="!isScoped">
            <div v-for="level in group.levels" :key="level.lid" :class="levelRow">
              <MpFormControl :id="`level-${level.lid}`">
                <MpFormLabel>Job level</MpFormLabel>
                <PxSelectPopover
                  v-model="level.levelId"
                  :options="jobLevelOptions"
                  placeholder="Select job level"
                  :width="'200px'"
                />
              </MpFormControl>
              <MpFormControl :id="`level-rating-${level.lid}`">
                <MpFormLabel>Target rating</MpFormLabel>
                <PxSelectPopover
                  v-model="level.rating"
                  :options="ratingOptions"
                  placeholder="Select rating"
                  :width="'200px'"
                />
              </MpFormControl>
              <MpButton
                variant="ghost"
                size="sm"
                left-icon="delete"
                aria-label="Remove level"
                :is-disabled="group.levels.length === 1"
                @click="removeLevel(group, level.lid)"
              />
            </div>
            <MpFlex :class="css({ paddingLeft: '4' })">
              <MpButton variant="ghost" size="sm" left-icon="add" @click="addLevel(group)">
                {{ COPY.addLevel }}
              </MpButton>
            </MpFlex>
          </template>

          <MpText v-if="groupInvalid(group)" size="label-small" :class="css({ color: 'text.danger' })">
            {{ isScoped ? 'Select a group and a target rating.' : 'Select a group and at least one job level with a rating.' }}
          </MpText>
        </div>
      </template>

      <!-- ═════ Footer ═════ -->
      <div :class="footerBar">
        <MpButton variant="ghost" @click="onCancel">{{ COPY.cancel }}</MpButton>
        <MpButton variant="primary" @click="onSubmit">{{ COPY.submit }}</MpButton>
      </div>

    </div>
  </div>

  <PxVersionSwitcher
    :versions="[
      { label: 'Version 1', to: '/talents/competencies/create' },
      { label: 'Version 2', to: '/talents/competencies/create-v2' },
    ]"
  />
</template>
