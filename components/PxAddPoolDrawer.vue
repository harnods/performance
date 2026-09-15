<!--
  PxAddPoolDrawer — "Add pool" / "Edit pool" drawer for the Talent directory pool
  tabs (pages/talents/talent-directory/index.vue). Same shell + scope-picker
  mechanic as PxAllFiltersDrawer (docs/patterns/filter-bar.md "Fixed-criteria
  drawer" section): "Add criteria" opens a popover listing the five fixed
  criteria types; picking one adds a removable, definable row to the list.
  A pool's name and its criteria are set together, in one drawer, in one step —
  there's no separate empty-state "Add criteria" step after creation.
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpFlex, MpText, MpIcon, MpButton, MpInput, MpInputGroup, MpInputRightAddon, MpCheckbox,
  MpFormControl, MpFormLabel, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpTooltip, css,
} from '@mekari/pixel3'
import { EDUCATION_LEVELS, type EducationLevel } from '~/utils/talents'
import {
  emptyCriteria, keyHasValue, CRITERIA_DEFS, CRITERIA_DEF_BY_KEY as DEF_BY_KEY, RANGE_FIELDS,
  type TalentCriteria, type CriteriaKey, type RangeCriteriaKey as RangeKey,
} from '~/utils/talentCriteria'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  appliedName: string
  appliedCriteria: TalentCriteria
}>()
const emit = defineEmits<{ close: [], save: [payload: { name: string, criteria: TalentCriteria }] }>()

const name = ref('')
const form = ref<TalentCriteria>(emptyCriteria())
const addedCriteria = ref<CriteriaKey[]>([])

// (Re)initialize the draft from the applied state each time the drawer opens.
watch(() => props.isOpen, (open) => {
  if (!open) return
  name.value = props.appliedName
  form.value = { ...props.appliedCriteria, educationLevels: [...props.appliedCriteria.educationLevels] }
  addedCriteria.value = CRITERIA_DEFS.filter(d => keyHasValue(d.key, form.value)).map(d => d.key)
}, { immediate: true })

const availableCriteria = computed(() => CRITERIA_DEFS.filter(d => !addedCriteria.value.includes(d.key)))

function addCriteria(key: CriteriaKey) {
  if (!addedCriteria.value.includes(key)) addedCriteria.value = [...addedCriteria.value, key]
}
function removeCriteria(key: CriteriaKey) {
  addedCriteria.value = addedCriteria.value.filter(k => k !== key)
  if (key === 'education') {
    form.value.educationLevels = []
  }
  else {
    const { min, max } = RANGE_FIELDS[key as RangeKey]
    ;(form.value as any)[min] = null
    ;(form.value as any)[max] = null
  }
}
function toggleEducation(level: EducationLevel) {
  form.value.educationLevels = form.value.educationLevels.includes(level)
    ? form.value.educationLevels.filter(l => l !== level)
    : [...form.value.educationLevels, level]
}

const canSave = computed(() => name.value.trim().length > 0)
function save() {
  if (!canSave.value) return
  emit('save', { name: name.value.trim(), criteria: { ...form.value, educationLevels: [...form.value.educationLevels] } })
}

const blankWrap = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '10', marginBottom: '3' })
const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionDesc = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const addBtn = css({ display: 'inline-flex', alignItems: 'center', gap: '2', width: 'fit-content', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', background: 'transparent', color: 'text.link', fontWeight: '600', fontSize: '14px', cursor: 'pointer', paddingBlock: '2', paddingInline: '4', marginTop: '4' })
const popPanel = css({ width: '220px', maxHeight: '260px', display: 'flex', flexDirection: 'column', overflowY: 'auto' })
const criteriaRow = css({ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default', paddingBlock: '4' })
const criteriaHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2' })
const iconBtn = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: 'none', background: 'transparent', borderRadius: 'md', cursor: 'pointer', color: 'text.secondary', _hover: { background: 'background.neutral.hovered', color: 'text.default' } })
const rangeRow = css({ display: 'flex', alignItems: 'center', gap: '2' })
const rangeSep = css({ color: 'text.secondary' })
const checkboxList = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const footerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '3' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-add-pool" :is-open="isOpen" placement="right" size="md" is-keep-alive @close="emit('close')">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ mode === 'create' ? 'Add pool' : 'Edit pool' }}
          <MpDrawerCloseButton />
        </MpDrawerHeader>
        <MpDrawerBody>
          <MpFormControl is-required>
            <MpFormLabel>Name</MpFormLabel>
            <MpInput v-model="name" placeholder="Enter pool name" />
          </MpFormControl>

          <div :class="blankWrap">
            <MpText :class="sectionTitle">Pool criteria</MpText>
            <MpText :class="sectionDesc">Filter your talents based on their criteria</MpText>
          </div>

          <div v-if="addedCriteria.length">
            <div v-for="key in addedCriteria" :key="key" :class="criteriaRow">
              <div :class="criteriaHeader">
                <MpText weight="semiBold" :class="css({ color: 'text.default' })">{{ DEF_BY_KEY[key].label }}</MpText>
                <MpTooltip label="Remove" use-portal>
                  <span :class="iconBtn" role="button" aria-label="Remove criteria" @click="removeCriteria(key)"><MpIcon name="minus-circular" size="sm" /></span>
                </MpTooltip>
              </div>

              <div v-if="DEF_BY_KEY[key].type === 'range'" :class="rangeRow">
                <MpInputGroup v-if="DEF_BY_KEY[key].unit">
                  <MpInput v-model="(form as any)[RANGE_FIELDS[key as RangeKey].min]" type="number" placeholder="Min" />
                  <MpInputRightAddon>{{ DEF_BY_KEY[key].unit }}</MpInputRightAddon>
                </MpInputGroup>
                <MpInput v-else v-model="(form as any)[RANGE_FIELDS[key as RangeKey].min]" type="number" placeholder="Min" />
                <span :class="rangeSep">–</span>
                <MpInputGroup v-if="DEF_BY_KEY[key].unit">
                  <MpInput v-model="(form as any)[RANGE_FIELDS[key as RangeKey].max]" type="number" placeholder="Max" />
                  <MpInputRightAddon>{{ DEF_BY_KEY[key].unit }}</MpInputRightAddon>
                </MpInputGroup>
                <MpInput v-else v-model="(form as any)[RANGE_FIELDS[key as RangeKey].max]" type="number" placeholder="Max" />
              </div>

              <MpFlex v-else direction="column" :class="checkboxList">
                <MpCheckbox
                  v-for="level in EDUCATION_LEVELS"
                  :key="level"
                  :is-checked="form.educationLevels.includes(level)"
                  @update:is-checked="() => toggleEducation(level)"
                >
                  {{ level }}
                </MpCheckbox>
              </MpFlex>
            </div>
          </div>

          <MpPopover is-close-on-select use-portal placement="bottom-start">
            <MpPopoverTrigger>
              <button type="button" :class="addBtn" :disabled="!availableCriteria.length">
                <MpIcon name="add" size="sm" />Add criteria
              </button>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <div :class="popPanel">
                <MpPopoverList>
                  <MpPopoverListItem v-for="d in availableCriteria" :key="d.key" @click="addCriteria(d.key)">{{ d.label }}</MpPopoverListItem>
                  <MpText v-if="!availableCriteria.length" :class="[sectionDesc, css({ paddingInline: '3', paddingBlock: '2', textAlign: 'center' })]">All criteria added</MpText>
                </MpPopoverList>
              </div>
            </MpPopoverContent>
          </MpPopover>
        </MpDrawerBody>
        <MpDrawerFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
            <MpButton variant="primary" :is-disabled="!canSave" @click="save">Save</MpButton>
          </div>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
