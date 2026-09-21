<!--
  IdpActionPlanModal — add / edit one action plan, in a right-side drawer.
  Replicated from production (talenta-performance:
    individual-development/form/ModalActionPlan.vue) with local extensions:
  the drawer conversion and the "Related to" competency link are prototype-only
  additions, not in production.
  Used from both the plan form (drafting a new plan) and the plan detail page
  (managing an existing plan's action plans), so it owns no store access —
  it emits a plain draft and lets the caller decide what to do with it.
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpFlex, MpText, MpButton, MpButtonGroup, MpInput, MpTextarea, MpCheckbox, MpIcon, MpRadio, MpBadge,
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpDatePicker, MpUpload, toast, css,
} from '@mekari/pixel3'
import { ACTION_PLAN_CATEGORIES, type ActionPlanDraft, type ActionPlanRelatedTo } from '~/utils/idp'
import { ALL_COMPETENCIES, COMPETENCY_DESCRIPTIONS } from '~/utils/competency'

const props = defineProps<{
  isOpen: boolean
  /** Editing an existing row; null when adding. */
  draft: ActionPlanDraft | null
  /** Who a newly-added action plan falls to — normally the plan's own employee. */
  defaultAssignees?: string[]
}>()
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  /** `addAnother` keeps the drawer open with a blank form, per the footer checkbox. */
  'save': [draft: ActionPlanDraft, addAnother: boolean]
}>()

const NAME_MAX = 60
const DESC_MAX = 140
// Mirrors production's allowed-upload list; there's no upload backend here, so
// this is the whole of the contract we can still honour.
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'jpg', 'jpeg', 'png']
const MAX_FILE_MB = 10

const isEdit = computed(() => !!props.draft?.id)

const name = ref('')
const category = ref('')
const description = ref('')
const startDate = ref('')
const dueDate = ref('')
const assignees = ref<string[]>([])
const attachments = ref<string[]>([])
const relatedTo = ref<ActionPlanRelatedTo>(null)
const relatedCompetency = ref('')
const addAnother = ref(false)
const submitted = ref(false)
const attachmentError = ref('')

const categoryOptions = ACTION_PLAN_CATEGORIES.map(c => ({ value: c, label: c }))
const competencyOptions = ALL_COMPETENCIES.map(c => ({ value: c, label: c, description: COMPETENCY_DESCRIPTIONS[c] }))

// Radios aren't a native mutually-exclusive group here (no shared `name`,
// selection is driven entirely by `relatedTo`), and clicking an
// already-checked radio fires no `change` — only `click` does — which is what
// lets this click act as a deselect instead of a no-op. Goal isn't selectable
// yet (docs/idp.ts's ActionPlanRelatedTo), so it's disabled with "Coming soon".
function onRelatedToCompetencyClick() {
  relatedTo.value = relatedTo.value === 'competency' ? null : 'competency'
  if (relatedTo.value !== 'competency') relatedCompetency.value = ''
}

function reset(from: ActionPlanDraft | null) {
  name.value = from?.name ?? ''
  category.value = from?.category ?? ''
  description.value = from?.description ?? ''
  startDate.value = from?.startDate ?? ''
  dueDate.value = from?.dueDate ?? ''
  assignees.value = [...(from?.assignees ?? props.defaultAssignees ?? [])]
  attachments.value = [...(from?.attachments ?? [])]
  relatedTo.value = from?.relatedTo ?? null
  relatedCompetency.value = from?.relatedCompetency ?? ''
  submitted.value = false
  attachmentError.value = ''
}
watch(() => props.isOpen, (open) => { if (open) reset(props.draft) }, { immediate: true })

// Production requires the end date be at least one day after the start date —
// a same-day action plan is rejected, not just an inverted one.
const endNotAfterStart = computed(() => !!startDate.value && !!dueDate.value && dueDate.value <= startDate.value)
const errors = computed(() => ({
  category: submitted.value && !category.value.trim() ? 'This field is required' : '',
  name: submitted.value && !name.value.trim() ? 'This field is required' : '',
  startDate: submitted.value && !startDate.value ? 'This field is required' : '',
  dueDate: submitted.value && !dueDate.value
    ? 'This field is required'
    : endNotAfterStart.value ? 'End date must be at least one day after the start date' : '',
  relatedCompetency: submitted.value && relatedTo.value === 'competency' && !relatedCompetency.value ? 'This field is required' : '',
}))

function close() { emit('update:isOpen', false) }

// docs/patterns/buttons.md — never disable the primary CTA; validate + toast.
function save() {
  submitted.value = true
  const relatedCompetencyMissing = relatedTo.value === 'competency' && !relatedCompetency.value
  if (!name.value.trim() || !category.value.trim() || !startDate.value || !dueDate.value || endNotAfterStart.value || relatedCompetencyMissing) {
    toast.notify({ id: 'idp-action-plan-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
    return
  }
  emit('save', {
    id: props.draft?.id,
    name: name.value.trim(),
    category: category.value.trim(),
    description: description.value.trim(),
    startDate: startDate.value,
    dueDate: dueDate.value,
    assignees: [...assignees.value],
    attachments: [...attachments.value],
    relatedTo: relatedTo.value,
    relatedCompetency: relatedTo.value === 'competency' ? relatedCompetency.value : '',
  }, addAnother.value && !isEdit.value)
  if (addAnother.value && !isEdit.value) {
    toast.notify({ id: 'idp-action-plan-added', position: 'top-center', variant: 'success', title: 'Action plan added' })
    reset(null)
  }
  else { close() }
}

// Attachments are names only — there's no upload backend in this prototype, so
// "adding" one records the file name the same way the real uploader would. The
// type and size checks still run, because those are the user's rules, not the
// backend's (docs/patterns/upload.md — inline error, never a toast).
const ACCEPT = ACCEPTED_EXTENSIONS.map(ext => `.${ext}`).join(',')
function onPickFiles(payload: unknown) {
  const raw = (payload as { target?: { files?: FileList } })?.target?.files ?? payload
  const picked: File[] = raw instanceof FileList ? Array.from(raw) : Array.isArray(raw) ? raw as File[] : []
  const accepted: string[] = []
  const rejected: string[] = []
  for (const f of picked) {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.includes(ext)) rejected.push(`${f.name} — file format is not supported`)
    else if (f.size > MAX_FILE_MB * 1024 * 1024) rejected.push(`${f.name} — larger than ${MAX_FILE_MB}MB`)
    else accepted.push(f.name)
  }
  attachments.value = [...attachments.value, ...accepted]
  attachmentError.value = rejected.join('; ')
}
function removeAttachment(i: number) {
  attachments.value = attachments.value.filter((_, idx) => idx !== i)
  attachmentError.value = ''
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const fields = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const twoCol = css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6' })
const helperText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', marginTop: '1' })
const fileRow = css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: '14px', paddingBlock: '1' })
const fileName = css({ flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.default' })
const footerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '3' })
// No shared `gap` on the outer row — Competency's own group and the Goal
// radio need different spacing above them (4px vs 20px), so each piece
// carries its own margin instead of one flex gap trying to fit both.
const radioRow = css({ display: 'flex', flexDirection: 'column' })
const competencyGroup = css({ display: 'flex', flexDirection: 'column', gap: '1' }) // 4px: radio → its revealed select
const competencyFieldIndent = css({ marginLeft: '8' }) // 32px indent under the Competency radio
const goalGapDefault = css({ marginTop: '2' }) // 8px — unchanged spacing when nothing is revealed
const goalGapSelected = css({ marginTop: '5' }) // 20px — extra room once the competency select is showing above it
</script>

<template>
  <ClientOnly>
    <MpDrawer :is-open="isOpen" placement="right" size="md" is-keep-alive :is-close-on-overlay-click="false" @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ isEdit ? 'Edit' : 'Add' }} action plan
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div :class="fields">
            <!-- Category is an open vocabulary in production (typed, with
                 suggestions), which is why it carries a character counter. -->
            <MpFormControl id="ap-category" is-required :is-invalid="!!errors.category">
              <div :class="labelRow">
                <MpFormLabel>Category</MpFormLabel>
                <span :class="charCount">{{ category.length }} / {{ NAME_MAX }}</span>
              </div>
              <PxSelectPopover
                v-model="category"
                :options="categoryOptions"
                placeholder="Select or type a category"
                width="100%"
                search-on-field
                allow-custom-value
                :maxlength="NAME_MAX"
              />
              <MpFormErrorMessage>{{ errors.category }}</MpFormErrorMessage>
            </MpFormControl>

            <!-- Relate this action plan to a competency it develops. Radios,
                 not a closed choice: clicking the already-selected Competency
                 radio deselects it (see onRelatedToCompetencyClick) since
                 "no relation" is a valid state. Goal isn't selectable yet —
                 badge, not #description, flags it as "Coming soon" (see
                 docs/patterns/form.md's inline-MpBadge exception). -->
            <MpFormControl id="ap-related-to">
              <MpFormLabel>Relates to</MpFormLabel>
              <div :class="radioRow">
                <div :class="competencyGroup">
                  <MpRadio :is-checked="relatedTo === 'competency'" @click="onRelatedToCompetencyClick">
                    Competency
                  </MpRadio>
                  <!-- No MpFormLabel — the Competency radio right above it
                       already names this field; a repeated "Competency"
                       label would be pure duplication (docs/patterns/form.md). -->
                  <MpFormControl v-if="relatedTo === 'competency'" id="ap-related-competency" :class="competencyFieldIndent" :is-invalid="!!errors.relatedCompetency">
                    <PxSelectPopover
                      v-model="relatedCompetency"
                      :options="competencyOptions"
                      placeholder="Select competency"
                      width="100%"
                      search-on-field
                    />
                    <MpFormErrorMessage>{{ errors.relatedCompetency }}</MpFormErrorMessage>
                  </MpFormControl>
                </div>
                <!-- Wrapper div, not :class on MpRadio directly — MpRadio's
                     :class lands on its hidden <input>, not the visible
                     <label> (same gotcha as MpCheckbox). -->
                <div :class="relatedTo === 'competency' ? goalGapSelected : goalGapDefault">
                  <MpRadio :is-checked="false" is-disabled>
                    <MpFlex as="span" align="center" gap="1">
                      Goal
                      <MpBadge for="tableStatus" type="announcement" size="sm">Coming soon</MpBadge>
                    </MpFlex>
                  </MpRadio>
                </div>
              </div>
            </MpFormControl>

            <MpFormControl id="ap-name" is-required :is-invalid="!!errors.name">
              <div :class="labelRow">
                <MpFormLabel>Action plan name</MpFormLabel>
                <span :class="charCount">{{ name.length }} / {{ NAME_MAX }}</span>
              </div>
              <MpInput v-model="name" :maxlength="NAME_MAX" placeholder="e.g. Complete leadership fundamentals course" />
              <MpFormErrorMessage>{{ errors.name }}</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl id="ap-description">
              <div :class="labelRow">
                <MpFormLabel>Description</MpFormLabel>
                <span :class="charCount">{{ description.length }} / {{ DESC_MAX }}</span>
              </div>
              <MpTextarea v-model="description" :maxlength="DESC_MAX" is-full-width />
            </MpFormControl>

            <div :class="twoCol">
              <!-- value-type="string" + an ISO format keeps the model a plain
                   yyyy-mm-dd string, which is what the store stores. -->
              <MpFormControl id="ap-start-date" is-required :is-invalid="!!errors.startDate">
                <MpFormLabel>Start date</MpFormLabel>
                <MpDatePicker v-model="startDate" value-type="string" format="YYYY-MM-DD" placeholder="Select date" use-portal :is-show-shortcut="false" />
                <MpFormErrorMessage>{{ errors.startDate }}</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl id="ap-due-date" is-required :is-invalid="!!errors.dueDate">
                <MpFormLabel>End date</MpFormLabel>
                <MpDatePicker v-model="dueDate" value-type="string" format="YYYY-MM-DD" placeholder="Select date" use-portal :is-show-shortcut="false" />
                <MpFormErrorMessage>{{ errors.dueDate }}</MpFormErrorMessage>
              </MpFormControl>
            </div>

            <!-- MpFormLabel injects from MpFormControl and throws without one,
                 so even a non-validated field gets the wrapper. -->
            <MpFormControl id="ap-attachment" :is-invalid="!!attachmentError">
              <MpFormLabel>Attachment</MpFormLabel>
              <MpUpload :is-multiple="true" is-full-width :accept="ACCEPT" @change="onPickFiles" />
              <MpText :class="helperText">Maximum file size is {{ MAX_FILE_MB }}MB</MpText>
              <MpFlex v-if="attachments.length" direction="column" gap="0" :class="css({ marginTop: '2' })">
                <div v-for="(file, i) in attachments" :key="`${file}-${i}`" :class="fileRow">
                  <MpIcon name="attachment" size="sm" />
                  <span :class="fileName" :title="file">{{ file }}</span>
                  <MpButton variant="ghost" size="sm" left-icon="close" :aria-label="`Remove ${file}`" @click="removeAttachment(i)" />
                </div>
              </MpFlex>
              <MpFormErrorMessage>{{ attachmentError }}</MpFormErrorMessage>
            </MpFormControl>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <div :class="footerRow">
            <MpCheckbox v-if="!isEdit" :is-checked="addAnother" @update:is-checked="(v: boolean) => (addAnother = v)">
              <MpText :class="css({ color: 'text.secondary' })">Add new action plan after saving</MpText>
            </MpCheckbox>
            <span v-else />
            <MpButtonGroup>
              <MpButton variant="ghost" @click="close">Cancel</MpButton>
              <MpButton variant="primary" @click="save">{{ isEdit ? 'Save' : 'Add' }}</MpButton>
            </MpButtonGroup>
          </div>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
