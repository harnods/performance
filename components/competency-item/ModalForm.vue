<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migrated from talenta-review (commit 010875214aba):
    src/views/talent-management/competencies/setup/competency-item/ModalForm.vue
  Component name preserved: ModalCreateCompetencyItem. Props/events preserved:
  isOpen (+ update:isOpen), uuid, data; emits `updated`, `delete`.
  Full-size modal (Pixel 3 MpModal size="full"), same as production.
  Prototype only — Vuex/API removed (see useCompetencyItemStore), vuelidate →
  local validation. Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpButton, MpInput, MpTextarea, MpTextlink,
  MpFormControl, MpFormLabel, MpFormErrorMessage,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  toast, css,
} from '@mekari/pixel3'
import type { CompetencyItem, CompetencyItemRecord, RatingScale } from '~/utils/competencyItem'

defineOptions({ name: 'ModalCreateCompetencyItem' })

const props = withDefaults(defineProps<{ isOpen: boolean, uuid?: string, data?: CompetencyItem | '' }>(), { uuid: '', data: '' })
const emit = defineEmits<{ 'update:isOpen': [value: boolean], updated: [item?: CompetencyItemRecord], delete: [] }>()

const { itemByUuid, defaultRatings, isNameTaken, createItem, editItem } = useCompetencyItemStore()

const NAME_MAX = 60
const form = ref<{ name: string, description: string, rating_scales: RatingScale[] }>({ name: '', description: '', rating_scales: [] })
const defaults = ref<RatingScale[]>([])
const touched = ref(false)

const isEdit = computed(() => Boolean(props.uuid))
const title = computed(() => (isEdit.value ? 'Edit item' : 'Create item'))
const submitText = computed(() => (isEdit.value ? 'Save changes' : 'Add competency'))
const nameError = computed(() => (touched.value && !form.value.name.trim() ? 'This field is required' : ''))

// Same as production's isOpen watcher: edit → load the item; create → blank
// form prefilled with the company's default rating descriptions.
watch(() => props.isOpen, (open) => {
  if (!open) return
  touched.value = false
  defaults.value = defaultRatings()
  const item = props.uuid ? itemByUuid(props.uuid) : undefined
  form.value = item
    ? { name: item.name, description: item.description ?? '', rating_scales: JSON.parse(JSON.stringify(item.rating_scales)) }
    : { name: '', description: '', rating_scales: defaultRatings() }
}, { immediate: true })

// ─── Rating description modal ────────────────────────────────────────────────
const isModalRating = ref(false)
const selectedRating = ref({ idx: 0, desc: '', default: '' })
function editRating(idx: number, description: string) {
  selectedRating.value = {
    idx,
    desc: description,
    // Create flow: a blank description falls back to the predefined default.
    default: isEdit.value ? '' : (defaults.value[idx]?.description ?? ''),
  }
  isModalRating.value = true
}
function updateRating(val: string) {
  const r = form.value.rating_scales[selectedRating.value.idx]
  if (r) r.description = val
}

function close() { emit('update:isOpen', false) }
function submit() {
  touched.value = true
  if (!form.value.name.trim()) {
    toast.notify({ id: 'competency-item-error', position: 'top-center', variant: 'error', title: "Please check the form's error" })
    return
  }
  // MOCK of POST/PUT /competencies. Duplicate name → API 400, which the FE
  // store throws as a bare string, so production toasts its fallback text.
  if (isNameTaken(form.value.name, props.uuid)) {
    toast.notify({ id: 'competency-item-error', position: 'top-center', variant: 'error', title: 'Failed to post competency item' })
    return
  }
  // Toast copy is hard-coded in the FE store (succession-plan.js).
  if (isEdit.value) {
    editItem(props.uuid, form.value)
    toast.notify({ id: 'competency-item-saved', position: 'top-center', variant: 'success', title: 'Competency item successfully updated' })
    emit('updated')
  }
  else {
    const item = createItem(form.value)
    toast.notify({ id: 'competency-item-created', position: 'top-center', variant: 'success', title: 'Competency item successfully created' })
    emit('updated', item)
  }
  close()
}
function onDelete() {
  close()
  emit('delete')
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const bodyWrap = css({ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1152px', width: '100%', marginInline: 'auto' })
const formCol = css({ display: 'flex', flexDirection: 'column', gap: '20px', width: '448px', maxWidth: '100%' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionDesc = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
// Rating descriptions wrap to several lines → whole table top-aligned (table.md).
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top', color: 'text.secondary', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const thInner = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', width: '100%' })
const defaultText = css({ fontStyle: 'italic' })
// Equal-width rating columns, like production's calc(100% / n).
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3', width: '100%' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="full" class="competency-item-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          {{ title }}
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <div :class="bodyWrap">
            <div :class="formCol">
              <MpFormControl id="competency-item-name" is-required :is-invalid="!!nameError">
                <div :class="labelRow">
                  <MpFormLabel>Item name</MpFormLabel>
                  <span :class="charCount">{{ form.name.length }} / {{ NAME_MAX }}</span>
                </div>
                <MpInput v-model="form.name" :maxlength="NAME_MAX" data-qa="input-name-competency-item" @blur="touched = true" />
                <MpFormErrorMessage>{{ nameError }}</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl id="competency-item-description">
                <MpFormLabel>Description</MpFormLabel>
                <MpTextarea v-model="form.description" placeholder="Optional" is-full-width data-qa="input-description-competency-item" />
              </MpFormControl>

              <div>
                <MpText :class="sectionTitle">Set rating scale</MpText>
                <MpText :class="sectionDesc">
                  Add rating scale along with the description as a guideline to provide subjective score. You can also set default description from
                  <MpTextlink href="/talents/competencies/rating-scale" target="_blank">here</MpTextlink>.
                </MpText>
              </div>
            </div>

            <MpTableContainer>
              <MpTable :is-hoverable="false" :class="fixedTable">
                <MpTableHead>
                  <MpTableRow>
                    <MpTableCell
                      v-for="(rating, idx) in form.rating_scales"
                      :key="rating.rating"
                      as="th"
                      :class="[headCell, css({ width: `calc(100% / ${form.rating_scales.length})` })]"
                    >
                      <span :class="thInner">
                        <span>{{ rating.rating }}</span>
                        <MpButton variant="ghost" left-icon="edit" :aria-label="`Edit rating ${rating.rating} description`" @click="editRating(idx, rating.description)" />
                      </span>
                    </MpTableCell>
                  </MpTableRow>
                </MpTableHead>
                <MpTableBody>
                  <MpTableRow>
                    <MpTableCell v-for="rating in form.rating_scales" :key="rating.rating" as="td" :class="cell">
                      <span v-if="rating.description">{{ rating.description }}</span>
                      <span v-else :class="defaultText">Default description</span>
                    </MpTableCell>
                  </MpTableRow>
                </MpTableBody>
              </MpTable>
            </MpTableContainer>
          </div>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerBar">
            <MpButton v-if="isEdit" variant="ghost" @click="onDelete">Delete item</MpButton>
            <MpButton variant="primary" data-qa="modal-comptency-item-submit" @click="submit">{{ submitText }}</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <RatingScaleModalForm
      v-model:is-open="isModalRating"
      :is-required="isEdit"
      :description="selectedRating.desc"
      :default-desc="selectedRating.default"
      @updated="updateRating"
    />
  </ClientOnly>
</template>
