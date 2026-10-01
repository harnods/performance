<!--
  IdpPlanForm — the create/edit body for a development plan.
  Replicated from production (talenta-performance:
    individual-development/form/Index.vue), which serves both routes from one
  component; same here, with `mode` deciding the title, CTA and Delete action.
-->
<script setup lang="ts">
import {
  MpFlex, MpText, MpButton, MpInput, MpIcon, MpRadio, MpTooltip,
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpFormHelpText,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  toast, css,
} from '@mekari/pixel3'
import { TALENTS } from '~/utils/talents'
import { getProfile } from '~/utils/talent-profile'
import { IDP_OBJECTIVES, JOB_POSITIONS, FOCUS_OPTIONS, type ActionPlanDraft, type IdpFocus, type IdpPlan } from '~/utils/idp'

const props = defineProps<{
  mode: 'create' | 'edit'
  plan?: IdpPlan | null
  /** Deep-linked "Create IDP for this person" — preselects, and drops any saved draft. */
  initialEmployeeId?: string
}>()
const emit = defineEmits<{
  submit: [payload: {
    name: string
    objective: string
    employeeId: string
    focus: IdpFocus
    futureJobPosition: string
    actionPlans: ActionPlanDraft[]
  }]
  cancel: []
  delete: []
}>()

const NAME_MAX = 60

const name = ref('')
const objective = ref('')
const employeeId = ref('')
const focus = ref<IdpFocus>(0)
const futureJobPosition = ref('')
const actionPlans = ref<ActionPlanDraft[]>([])
const submitted = ref(false)

// Seed from the plan being edited; create mode starts blank.
watch(() => props.plan, (plan) => {
  name.value = plan?.name ?? ''
  objective.value = plan?.objective ?? ''
  employeeId.value = plan?.employeeId ?? ''
  focus.value = plan?.focus ?? 0
  futureJobPosition.value = plan?.futureJobPosition ?? ''
  actionPlans.value = (plan?.actionPlans ?? []).map(a => ({
    id: a.id, name: a.name, category: a.category, description: a.description,
    startDate: a.startDate, dueDate: a.dueDate,
    assignees: [...a.assignees], attachments: [...a.attachments],
    relatedTo: a.relatedTo, relatedCompetency: a.relatedCompetency,
  }))
  submitted.value = false
}, { immediate: true })

// ─── Unsaved-draft recovery (create only) ────────────────────────────────────
// Production holds an in-progress create form for 20 minutes so a stray
// navigation or a reload doesn't cost the whole thing. Edit mode never
// autosaves — the plan already exists, and a stale draft would silently fight
// the real record.
const DRAFT_KEY = 'talenta-idp-form-draft'
const DRAFT_TTL_MS = 20 * 60 * 1000

interface FormDraft {
  expiresAt: number
  form: { name: string, objective: string, employeeId: string, focus: IdpFocus, futureJobPosition: string }
  actionPlans: ActionPlanDraft[]
}

function clearDraft() {
  if (import.meta.client) localStorage.removeItem(DRAFT_KEY)
}
function saveDraft() {
  if (props.mode !== 'create' || !import.meta.client) return
  const draft: FormDraft = {
    expiresAt: Date.now() + DRAFT_TTL_MS,
    form: {
      name: name.value,
      objective: objective.value,
      employeeId: employeeId.value,
      focus: focus.value,
      futureJobPosition: futureJobPosition.value,
    },
    actionPlans: actionPlans.value,
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

// localStorage is client-only, so restoring has to wait for mount — reading it
// during setup would make the server and the client's first render disagree.
onMounted(() => {
  if (props.mode !== 'create') return
  if (props.initialEmployeeId) {
    // An explicit "create for this person" beats whatever was half-typed before.
    clearDraft()
    employeeId.value = props.initialEmployeeId
    return
  }
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return
  try {
    const draft = JSON.parse(raw) as FormDraft
    if (!draft?.expiresAt || draft.expiresAt < Date.now()) { clearDraft(); return }
    name.value = draft.form.name ?? ''
    objective.value = draft.form.objective ?? ''
    employeeId.value = draft.form.employeeId ?? ''
    focus.value = draft.form.focus ?? 0
    futureJobPosition.value = draft.form.futureJobPosition ?? ''
    actionPlans.value = Array.isArray(draft.actionPlans) ? draft.actionPlans : []
  }
  catch { clearDraft() }
})

watch([name, objective, employeeId, focus, futureJobPosition, actionPlans], saveDraft, { deep: true })

const objectiveOptions = IDP_OBJECTIVES.map(o => ({ value: o, label: o }))
const employeeOptions = computed(() => TALENTS.map(t => ({ value: t.id, label: t.name, description: t.jobPosition, photo: t.photo })))
const jobPositionOptions = JOB_POSITIONS.map(p => ({ value: p, label: p }))
const selectedEmployee = computed(() => TALENTS.find(t => t.id === employeeId.value))

// ─── Informal education ──────────────────────────────────────────────────────
// The selected employee's learning history, pulled straight out of the talent
// profile so this table and the profile page can't drift apart. Production
// paginates this list; the seed here tops out at four courses per person, so
// there is nothing to page through — add the Load-more bar from
// docs/patterns/pagination.md if the seed ever grows.
const informalEducation = computed(() => (employeeId.value ? getProfile(employeeId.value)?.learning ?? [] : []))

// ─── Action plan modal ───────────────────────────────────────────────────────
const isModalOpen = ref(false)
const editingIndex = ref<number | null>(null)
const editingDraft = ref<ActionPlanDraft | null>(null)

function openAdd() {
  editingIndex.value = null
  editingDraft.value = null
  isModalOpen.value = true
}
function openEdit(i: number) {
  editingIndex.value = i
  editingDraft.value = { ...actionPlans.value[i] }
  isModalOpen.value = true
}
function onSaveActionPlan(draft: ActionPlanDraft) {
  if (editingIndex.value === null) actionPlans.value = [...actionPlans.value, draft]
  else actionPlans.value = actionPlans.value.map((a, i) => (i === editingIndex.value ? draft : a))
  editingIndex.value = null
}
function removeActionPlan(i: number) { actionPlans.value = actionPlans.value.filter((_, idx) => idx !== i) }

// ─── Validation (docs/patterns/buttons.md — never disable the primary CTA) ───
const errors = computed(() => ({
  name: submitted.value && !name.value.trim() ? 'This field is required' : '',
  objective: submitted.value && !objective.value.trim() ? 'This field is required' : '',
  employeeId: submitted.value && !employeeId.value ? 'This field is required' : '',
  futureJobPosition: submitted.value && focus.value === 1 && !futureJobPosition.value ? 'This field is required' : '',
  actionPlans: submitted.value && !actionPlans.value.length ? 'Add at least one action plan' : '',
}))
function onSubmit() {
  submitted.value = true
  if (Object.values(errors.value).some(Boolean)) {
    toast.notify({ id: 'idp-form-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
    return
  }
  clearDraft()
  emit('submit', {
    name: name.value.trim(),
    objective: objective.value.trim(),
    employeeId: employeeId.value,
    focus: focus.value,
    futureJobPosition: focus.value === 1 ? futureJobPosition.value : '',
    actionPlans: actionPlans.value,
  })
}
function onCancel() {
  clearDraft()
  emit('cancel')
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const formCol = css({ display: 'flex', flexDirection: 'column', gap: '6' })
// Plain inputs stay a normal form column width; tables (informal education,
// action plans) break out of it to run the page's full width, same as the
// index page's own tables — a 4/5-column table cramped into 625px reads as
// broken, not "compact."
const narrowCol = css({ display: 'flex', flexDirection: 'column', gap: '6', maxWidth: '625px' })
const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionDesc = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const selectWidth = css({ width: '264px' })
const radioRow = css({ display: 'flex', flexDirection: 'column', gap: '2' })
// No explicit font/color here — the MpTable recipe supplies the th's own
// 14px/600/text.default styling. Only padding + alignment are ours to set
// (docs/patterns/table.md's "Header (th) styling" rule).
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Trailing action column (Edit/Remove) shrinks to its content instead of
// stretching (docs/patterns/table.md's numeric-cols idiom).
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const subText = css({ fontSize: '12px', color: 'text.secondary' })
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', paddingTop: '4' })
</script>

<template>
  <div :class="formCol">
    <div :class="narrowCol">
      <div>
        <MpText :class="sectionTitle">{{ mode === 'edit' ? 'Development plan' : 'New development plan' }}</MpText>
        <MpText :class="sectionDesc">This plan helps you to achieve greater opportunities for your career.</MpText>
      </div>

      <MpFormControl id="idp-name" is-required :is-invalid="!!errors.name">
        <div :class="labelRow">
          <MpFormLabel>Development plan name</MpFormLabel>
          <span :class="charCount">{{ name.length }} / {{ NAME_MAX }}</span>
        </div>
        <MpInput v-model="name" :maxlength="NAME_MAX" placeholder="e.g. Leadership training" />
        <MpFormErrorMessage>{{ errors.name }}</MpFormErrorMessage>
      </MpFormControl>

      <!-- Objective is an open vocabulary in production — the list is suggestions,
           the user can type anything, hence the character counter. -->
      <MpFormControl id="idp-objective" is-required :is-invalid="!!errors.objective">
        <div :class="labelRow">
          <MpFormLabel>Objective</MpFormLabel>
          <span :class="charCount">{{ objective.length }} / {{ NAME_MAX }}</span>
        </div>
        <PxSelectPopover
          v-model="objective"
          :options="objectiveOptions"
          placeholder="Search or type an objective"
          width="100%"
          search-on-field
          allow-custom-value
          :maxlength="NAME_MAX"
        />
        <MpFormErrorMessage>{{ errors.objective }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="idp-employee" is-required :is-invalid="!!errors.employeeId">
        <MpFormLabel>Employee</MpFormLabel>
        <PxSelectPopover
          v-model="employeeId"
          :options="employeeOptions"
          placeholder="Select employee name"
          width="100%"
          searchable
          search-placeholder="Search employee..."
          is-clearable
        />
        <MpFormHelpText>The informal education from Talenta will be shown below.</MpFormHelpText>
        <MpFormErrorMessage>{{ errors.employeeId }}</MpFormErrorMessage>
      </MpFormControl>
    </div>

    <!-- Informal education — read-only context on what this employee has already
         done, so the plan isn't drafted blind. Full page width, like the
         action-plan table below and the index page's own tables — not capped
         to narrowCol, or a 4-column table reads cramped. Reveals 5 at a time
         (docs/patterns/pagination.md). -->
    <div v-if="employeeId">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" :class="headCell">Informal education</MpTableCell>
              <MpTableCell as="th" :class="headCell">Held by</MpTableCell>
              <MpTableCell as="th" :class="headCell">Completed date</MpTableCell>
              <MpTableCell as="th" :class="headCell">Certificate</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(r, i) in informalEducation" :key="`${r.course}-${i}`">
              <MpTableCell as="td" :class="cell">{{ r.course || '-' }}</MpTableCell>
              <MpTableCell as="td" :class="cell">{{ r.org || '-' }}</MpTableCell>
              <MpTableCell as="td" :class="cell">{{ r.completed || '-' }}</MpTableCell>
              <MpTableCell as="td" :class="cell">{{ r.certificate ? 'Yes' : 'No' }}</MpTableCell>
            </MpTableRow>
            <MpTableRow v-if="!informalEducation.length">
              <MpTableCell as="td" :colspan="4" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                No informal education recorded for this employee.
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
    </div>

    <!-- Focus only makes sense once we know whose position we're anchoring to. -->
    <MpFlex v-if="employeeId" direction="column" gap="3" :class="narrowCol">
      <div>
        <MpText :class="sectionTitle">Focus plan</MpText>
        <MpText :class="sectionDesc">Set the focus to keep your plan on the right track based on your job position.</MpText>
      </div>

      <MpFormControl id="idp-focus">
        <MpFormLabel>Select focus</MpFormLabel>
        <div :class="radioRow">
          <MpRadio
            v-for="opt in FOCUS_OPTIONS"
            :key="opt.value"
            :is-checked="focus === opt.value"
            @update:is-checked="() => (focus = opt.value)"
          >
            {{ opt.label }}
            <template #description>
              {{ opt.value === 0 ? selectedEmployee?.jobPosition : 'A role this talent is growing toward' }}
            </template>
          </MpRadio>
        </div>
      </MpFormControl>

      <MpFormControl v-if="focus === 1" id="idp-future-position" is-required :is-invalid="!!errors.futureJobPosition">
        <MpFormLabel>Select job position</MpFormLabel>
        <PxSelectPopover
          v-model="futureJobPosition"
          :options="jobPositionOptions"
          placeholder="Select future job position"
          :class="selectWidth"
          searchable
          search-placeholder="Search job position..."
          is-clearable
        />
        <MpFormErrorMessage>{{ errors.futureJobPosition }}</MpFormErrorMessage>
      </MpFormControl>
    </MpFlex>

    <MpFormControl id="idp-action-plans" :is-invalid="!!errors.actionPlans">
      <MpText :class="sectionTitle">Action plan</MpText>
      <MpText :class="sectionDesc">Work out your development program progressively with action plans.</MpText>

      <MpTableContainer v-if="actionPlans.length" :class="css({ marginTop: '4' })">
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" :class="headCell">Action plan</MpTableCell>
              <MpTableCell as="th" :class="headCell">Category</MpTableCell>
              <MpTableCell as="th" :class="headCell">Relation</MpTableCell>
              <MpTableCell as="th" :class="headCell">Period</MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(a, i) in actionPlans" :key="a.id ?? `new-${i}`">
              <MpTableCell as="td" :class="cell">
                <MpFlex direction="column" gap="0">
                  <span>{{ a.name }}</span>
                  <span v-if="a.description" :class="subText">{{ a.description }}</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">{{ a.category }}</MpTableCell>
              <MpTableCell as="td" :class="cell">
                <MpFlex v-if="a.relatedTo === 'competency' && a.relatedCompetency" direction="column" gap="0">
                  <span :class="subText">Competency</span>
                  <span>{{ a.relatedCompetency }}</span>
                </MpFlex>
                <span v-else>-</span>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">{{ formatDate(a.startDate) }} – {{ formatDate(a.dueDate) }}</MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpTooltip label="Edit" use-portal>
                  <MpButton variant="ghost" size="sm" left-icon="edit" aria-label="Edit action plan" @click="openEdit(i)" />
                </MpTooltip>
                <MpTooltip label="Remove" use-portal>
                  <MpButton variant="ghost" size="sm" left-icon="delete" aria-label="Remove action plan" @click="removeActionPlan(i)" />
                </MpTooltip>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <MpButton variant="secondary" left-icon="add" :class="css({ marginTop: '4', width: 'fit-content' })" @click="openAdd">
        Add action plan
      </MpButton>
      <MpFormErrorMessage>{{ errors.actionPlans }}</MpFormErrorMessage>
    </MpFormControl>

    <div :class="footerBar">
      <MpButton v-if="mode === 'edit'" variant="ghost" @click="emit('delete')">
        <span :class="css({ color: 'text.danger' })">Delete</span>
      </MpButton>
      <span v-else />
      <MpFlex align="center" gap="3">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="primary" @click="onSubmit">{{ mode === 'edit' ? 'Save changes' : 'Submit' }}</MpButton>
      </MpFlex>
    </div>

    <IdpActionPlanModal
      :is-open="isModalOpen"
      :draft="editingDraft"
      :default-assignees="employeeId ? [employeeId] : []"
      @update:is-open="(v: boolean) => (isModalOpen = v)"
      @save="onSaveActionPlan"
    />
  </div>
</template>
