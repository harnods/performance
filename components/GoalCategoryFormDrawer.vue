<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal category form drawer (add / edit)
  Token mode: Pixel 2.4

  Replica of talenta-review's DrawerCategoryForm.vue. Add or edit a goal
  category: name (required, /60), description (/255), and a dynamic list of
  sub-categories (each required, /60, unique within the category). A
  sub-category already used by goals can't be removed (icon disabled with a
  tooltip). Editing a category that has linked goals asks for confirmation
  first, since the change cascades to those goals. Reused by the list page and
  the category detail page.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpButton,
  MpButtonGroup,
  MpInput,
  MpTextarea,
  MpTooltip,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  css,
} from '@mekari/pixel3'
import type { GoalCategoryRecord, GoalCategorySubItem } from '~/composables/useGoalCategoriesStore'

const props = defineProps<{
  isOpen: boolean
  category: GoalCategoryRecord | null
  // other categories' names (lowercased) to guard duplicates
  existingNames: string[]
}>()
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  save: [payload: { name: string, description: string, subCategories: GoalCategorySubItem[] }]
}>()

const { subCategoryUsage, linkedGoalCount } = useGoalCategoriesStore()

const NAME_MAX = 60
const DESC_MAX = 255
const SUB_MAX = 60

interface SubRow { id: string, name: string, usageCount: number }

const isEdit = computed(() => !!props.category)
const drawerTitle = computed(() => (isEdit.value ? 'Edit goal category' : 'Add goal category'))

const name = ref('')
const description = ref('')
const subs = ref<SubRow[]>([])
const errors = reactive({ name: '', subs: {} as Record<number, string> })

let tmpSeq = 0
function tmpId() {
  tmpSeq += 1
  return `new-sub-${tmpSeq}`
}

function reset() {
  errors.name = ''
  errors.subs = {}
  if (props.category) {
    name.value = props.category.name
    description.value = props.category.description
    subs.value = props.category.subCategories.map(s => ({ id: s.id, name: s.name, usageCount: subCategoryUsage(s.name) }))
  }
  else {
    name.value = ''
    description.value = ''
    subs.value = []
  }
}

watch(() => props.isOpen, (open) => { if (open) reset() })

function close() {
  emit('update:isOpen', false)
}

function addSubCategory() {
  subs.value = [...subs.value, { id: tmpId(), name: '', usageCount: 0 }]
}
function removeSubCategory(i: number) {
  if (subs.value[i].usageCount > 0) return
  subs.value = subs.value.filter((_, idx) => idx !== i)
}

watch(name, () => { errors.name = '' })

function validate(): boolean {
  errors.name = ''
  errors.subs = {}
  let ok = true

  const trimmed = name.value.trim()
  if (!trimmed) { errors.name = 'You must fill in goal category name'; ok = false }
  else if (trimmed.length > NAME_MAX) { errors.name = `Goal category name must have at most ${NAME_MAX} characters`; ok = false }
  else if (props.existingNames.includes(trimmed.toLowerCase())) { errors.name = 'Goal category name already exists. Please use a different name.'; ok = false }

  const seen = new Set<string>()
  subs.value.forEach((s, i) => {
    const t = s.name.trim()
    if (!t) { errors.subs[i] = 'You must fill in sub-categories'; ok = false; return }
    if (t.length > SUB_MAX) { errors.subs[i] = `Sub-category name must have at most ${SUB_MAX} characters`; ok = false; return }
    const key = t.toLowerCase()
    if (seen.has(key)) { errors.subs[i] = 'Subcategory title already exists under this category'; ok = false; return }
    seen.add(key)
  })
  return ok
}

const isConfirmOpen = ref(false)

function submit() {
  if (!validate()) return
  // Editing a category already used by goals cascades the change — confirm first.
  if (isEdit.value && props.category && linkedGoalCount(props.category.name) > 0) {
    isConfirmOpen.value = true
    return
  }
  doSave()
}

function doSave() {
  emit('save', {
    name: name.value.trim(),
    description: description.value.trim(),
    subCategories: subs.value.map(s => ({ id: s.id.startsWith('new-sub-') ? '' : s.id, name: s.name.trim() })),
  })
  isConfirmOpen.value = false
  close()
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const fields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const reqStar = css({ color: 'text.danger' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const subHeader = css({ fontSize: '14px', fontWeight: '600', color: 'text.default', marginBottom: '2' })
const subRow = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
const removeBtn = css({ flexShrink: '0', marginTop: '1' })
const addLink = css({ display: 'inline-flex', alignItems: 'center', gap: '1', marginTop: '2', background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', color: 'text.link', fontSize: '14px', lineHeight: '20px' })
const valueText = css({ color: 'text.default' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-goal-category" :is-open="isOpen" placement="right" size="md" is-keep-alive @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ drawerTitle }}
          <MpDrawerCloseButton />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div :class="fields">
            <MpFormControl id="category-name" :is-invalid="!!errors.name">
              <div :class="labelRow">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal category name</MpFormLabel>
                  <MpText size="label" :class="reqStar">*</MpText>
                </MpFlex>
                <span :class="charCount">{{ name.length }} / {{ NAME_MAX }}</span>
              </div>
              <MpInput v-model="name" :maxlength="NAME_MAX" placeholder="e.g. Financial" />
              <MpFormErrorMessage>{{ errors.name }}</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl id="category-description">
              <div :class="labelRow">
                <MpFormLabel>Description</MpFormLabel>
                <span :class="charCount">{{ description.length }} / {{ DESC_MAX }}</span>
              </div>
              <MpTextarea v-model="description" :maxlength="DESC_MAX" placeholder="Describe what this category groups" />
            </MpFormControl>

            <div>
              <MpText :class="subHeader">Sub-categories</MpText>
              <MpFlex direction="column" gap="3">
                <MpFormControl v-for="(sub, i) in subs" :id="`sub-${i}`" :key="sub.id" :is-invalid="!!errors.subs[i]">
                  <div :class="subRow">
                    <div :class="css({ flex: '1' })">
                      <MpInput v-model="sub.name" :maxlength="SUB_MAX" placeholder="Sub-category name" />
                      <MpFormErrorMessage>{{ errors.subs[i] }}</MpFormErrorMessage>
                    </div>
                    <MpTooltip v-if="sub.usageCount > 0" label="Cannot delete. This sub-category has linked goals." placement="top">
                      <MpButton :class="removeBtn" variant="ghost" left-icon="minus-circular" is-disabled aria-label="Remove sub-category" />
                    </MpTooltip>
                    <MpButton v-else :class="removeBtn" variant="ghost" left-icon="minus-circular" aria-label="Remove sub-category" @click="removeSubCategory(i)" />
                  </div>
                </MpFormControl>
              </MpFlex>
              <button type="button" :class="addLink" @click="addSubCategory">
                <MpIcon name="add-circular" size="sm" />
                Add sub-category
              </button>
            </div>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="submit">{{ isEdit ? 'Save changes' : 'Save' }}</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>

  <!-- Save-changes confirmation (only when editing a category in use) -->
  <ClientOnly>
    <MpModal :is-open="isConfirmOpen" is-centered @close="isConfirmOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Save changes to this category?
          <MpModalCloseButton @click="isConfirmOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="valueText">
            This category is currently used by existing goals. Any changes you make will automatically update on all linked goals.
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isConfirmOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="doSave">Update</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>
