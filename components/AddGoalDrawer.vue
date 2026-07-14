<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Add Goal drawer
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU)
    single-owner: node 4433:76331 · multi-owner: node 4811:47361
  Token mode: Pixel 2.4

  One shared form: filled out once regardless of how many owners were picked
  upstream. On Save, the SAME goal definition is what gets duplicated into
  each owner's row on the "New goals" page (pages/goals/goal-cycles/[id]/new.vue) —
  the only field that varies per owner is "Goal contributor", which is why
  that section alone renders one card per owner once there's more than one.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpIcon,
  MpAvatar,
  MpAvatarGroup,
  MpInput,
  MpTextarea,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
  MpFormControl,
  MpFormLabel,
  MpFormErrorMessage,
  MpCheckbox,
  MpRadio,
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  MpButtonGroup,
  css,
} from '@mekari/pixel3'
import { type Employee, EMPLOYEES, employeeMeta } from '~/utils/employees'
import { GOAL_CATEGORIES, GOAL_TYPE_OPTIONS, MEASUREMENT_UNIT_OPTIONS, REPEAT_INTERVAL_OPTIONS, type MeasurementUnit } from '~/utils/goalTaxonomy'
import { type DraftGoal, type DraftKeyResult, nextGoalCode } from '~/utils/goalDraft'

const props = defineProps<{
  isOpen: boolean
  owners: Employee[]
  alreadyUsedWeight: number
}>()
const emit = defineEmits<{
  'update:isOpen': [boolean]
  'save': [DraftGoal]
}>()

const nameMax = 120
const descriptionMax = 1000

const name = ref('')
const description = ref('')
const goalType = ref('')
const category = ref('')
const subCategory = ref('')
const weight = ref<number | ''>('')
const repeat = ref(false)
const repeatEvery = ref('monthly')
const measurementUnit = ref<MeasurementUnit>('percentage')
const startValue = ref<number | ''>('')
const targetValue = ref<number | ''>('')
const useBaseline = ref(true)
const direction = ref<'higher' | 'lower'>('higher')
const contributorsByOwner = reactive<Record<string, string[]>>({})
const viewerIds = ref<string[]>([])
const keyResults = ref<DraftKeyResult[]>([])

const showKeyResultForm = ref(false)
const keyResultTitle = ref('')
const keyResultTarget = ref('')

const errors = reactive({ name: false, goalType: false, category: false, weight: false })
watch(name, () => { errors.name = false })
watch(goalType, () => { errors.goalType = false })
watch(category, () => { errors.category = false })
watch(weight, () => { errors.weight = false })

function resetForm() {
  errors.name = false
  errors.goalType = false
  errors.category = false
  errors.weight = false
  name.value = ''
  description.value = ''
  goalType.value = ''
  category.value = ''
  subCategory.value = ''
  weight.value = ''
  repeat.value = false
  repeatEvery.value = 'monthly'
  measurementUnit.value = 'percentage'
  startValue.value = ''
  targetValue.value = ''
  useBaseline.value = true
  direction.value = 'higher'
  for (const key of Object.keys(contributorsByOwner)) delete contributorsByOwner[key]
  for (const owner of props.owners) contributorsByOwner[owner.id] = []
  viewerIds.value = []
  keyResults.value = []
  contributorDrawerOwnerId.value = null
  viewerDrawerOpen.value = false
  showKeyResultForm.value = false
  keyResultTitle.value = ''
  keyResultTarget.value = ''
}

watch(() => props.isOpen, (open) => { if (open) resetForm() })

const categoryOptions = computed(() => GOAL_CATEGORIES.map(c => ({ value: c.value, label: c.label })))
const subCategoryOptions = computed(() => {
  const cat = GOAL_CATEGORIES.find(c => c.value === category.value)
  return cat ? cat.subCategories.map(s => ({ value: s.value, label: s.label })) : []
})
watch(category, () => { subCategory.value = '' })

const remainingWeight = computed(() => {
  const current = weight.value === '' ? 0 : Number(weight.value)
  return 100 - props.alreadyUsedWeight - current
})

function formatThousands(v: number | ''): string {
  return v === '' ? '' : Number(v).toLocaleString('en-US')
}
function parseThousands(str: string): number | '' {
  const digits = str.replace(/[^\d]/g, '')
  return digits === '' ? '' : Number(digits)
}
const startValueAmountDisplay = computed({
  get: () => formatThousands(startValue.value),
  set: (v: string) => { startValue.value = parseThousands(v) },
})
const targetValueAmountDisplay = computed({
  get: () => formatThousands(targetValue.value),
  set: (v: string) => { targetValue.value = parseThousands(v) },
})

function employeeById(id: string): Employee | undefined {
  return EMPLOYEES.find(e => e.id === id)
}

const contributorDrawerOwnerId = ref<string | null>(null)
const viewerDrawerOpen = ref(false)

function removeContributor(ownerId: string, employeeId: string) {
  contributorsByOwner[ownerId] = (contributorsByOwner[ownerId] ?? []).filter(id => id !== employeeId)
}
function removeViewer(employeeId: string) {
  viewerIds.value = viewerIds.value.filter(id => id !== employeeId)
}

function addKeyResult() {
  if (!keyResultTitle.value.trim()) return
  keyResults.value = [...keyResults.value, { id: `kr-${keyResults.value.length}-${Date.now()}`, title: keyResultTitle.value.trim(), target: keyResultTarget.value.trim() }]
  keyResultTitle.value = ''
  keyResultTarget.value = ''
  showKeyResultForm.value = false
}
function removeKeyResult(id: string) {
  keyResults.value = keyResults.value.filter(kr => kr.id !== id)
}

function close() {
  emit('update:isOpen', false)
}

function save() {
  errors.name = !name.value.trim()
  errors.goalType = !goalType.value
  errors.category = !category.value
  errors.weight = weight.value === '' || Number(weight.value) <= 0
  if (errors.name || errors.goalType || errors.category || errors.weight) return
  const categoryLabel = GOAL_CATEGORIES.find(c => c.value === category.value)?.label ?? category.value
  const subCategoryLabel = subCategoryOptions.value.find(s => s.value === subCategory.value)?.label ?? ''
  const goalTypeLabel = GOAL_TYPE_OPTIONS.find(t => t.value === goalType.value)?.label ?? goalType.value
  const repeatEveryLabel = REPEAT_INTERVAL_OPTIONS.find(r => r.value === repeatEvery.value)?.label ?? repeatEvery.value

  const draft: DraftGoal = {
    id: `goal-${Date.now()}`,
    code: nextGoalCode(),
    category: categoryLabel,
    subCategory: subCategoryLabel,
    name: name.value.trim(),
    description: description.value.trim(),
    goalType: goalTypeLabel,
    weight: Number(weight.value),
    repeat: repeat.value,
    repeatEvery: repeatEveryLabel,
    measurementUnit: measurementUnit.value,
    startValue: startValue.value === '' ? 0 : Number(startValue.value),
    targetValue: targetValue.value === '' ? 0 : Number(targetValue.value),
    useBaseline: useBaseline.value,
    baselineValue: startValue.value === '' ? 0 : Number(startValue.value),
    direction: direction.value,
    contributorsByOwner: JSON.parse(JSON.stringify(contributorsByOwner)),
    viewerIds: [...viewerIds.value],
    keyResults: [...keyResults.value],
  }
  emit('save', draft)
  emit('update:isOpen', false)
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const fields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const section = css({ display: 'flex', flexDirection: 'column', gap: '4', paddingBottom: '5' })
const sectionLast = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1' })
const sectionTitle = css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionDesc = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const requiredMark = css({ color: 'text.danger' })
const radioIndent = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingLeft: '8' })
const noSpinner = css({
  appearance: 'none',
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { display: 'none', margin: '0' },
})
const helperText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })

const ownerBox = css({
  display: 'flex', alignItems: 'center', gap: '2',
  padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default',
  background: 'background.neutral.subtle',
})

const addLink = css({
  display: 'inline-flex', alignItems: 'center', gap: '2',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.link', fontSize: '14px', lineHeight: '20px',
})
const personCard = css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default' })
const personRow = css({ display: 'flex', alignItems: 'center', gap: '3' })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const removeBtn = css({ background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', color: 'icon.secondary', display: 'flex' })

const krRow = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
const krForm = css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '3', borderRadius: '6px', border: '1px solid', borderColor: 'border.default' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-add-goal" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          Add goal
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div :class="fields">
            <!-- Goal details -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal details</span>
                <span :class="sectionDesc">What this goal is and where it fits.</span>
              </div>

              <MpFormControl id="goal-owner">
                <MpFormLabel>Goal owner</MpFormLabel>
                <div :class="ownerBox">
                  <MpAvatarGroup v-if="owners.length > 1" id="goal-owner-avatars" size="sm" :max="owners.length">
                    <MpAvatar v-for="o in owners" :key="o.id" :id="o.id" :name="o.name" :src="o.photo" variant-color="gray" />
                  </MpAvatarGroup>
                  <MpAvatar v-else-if="owners[0]" :id="owners[0].id" :name="owners[0].name" :src="owners[0].photo" size="sm" variant-color="gray" />
                  <MpText size="label" :class="css({ color: owners.length ? 'text.default' : 'text.secondary' })">
                    <template v-if="owners.length === 1">{{ owners[0].name }} ({{ owners[0].code }})</template>
                    <template v-else>{{ owners.length }} goal owners — {{ owners.map(o => o.name).join(', ') }}</template>
                  </MpText>
                </div>
              </MpFormControl>

              <MpFormControl id="goal-name" :is-invalid="errors.name">
                <MpFlex align="center" justify="space-between">
                  <MpFlex align="center" gap="1">
                    <MpFormLabel>Goal name</MpFormLabel>
                    <MpText size="label" :class="requiredMark">*</MpText>
                  </MpFlex>
                  <span :class="charCount">{{ name.length }} / {{ nameMax }}</span>
                </MpFlex>
                <MpInput v-model="name" :maxlength="nameMax" />
                <MpFormErrorMessage>Goal name is required.</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl id="goal-description">
                <MpFlex align="center" justify="space-between">
                  <MpFormLabel>Description</MpFormLabel>
                  <span :class="charCount">{{ description.length }} / {{ descriptionMax }}</span>
                </MpFlex>
                <MpTextarea v-model="description" :maxlength="descriptionMax" />
              </MpFormControl>

              <MpFormControl id="goal-type" :is-invalid="errors.goalType">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal type</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <PxSelectPopover v-model="goalType" :options="GOAL_TYPE_OPTIONS" placeholder="Select goal type" width="100%" />
                <MpFormErrorMessage>Goal type is required.</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl id="goal-category" :is-invalid="errors.category">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal category</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <PxSelectPopover v-model="category" :options="categoryOptions" placeholder="Select goal category" width="100%" />
                <MpFormErrorMessage>Goal category is required.</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl v-if="category" id="goal-sub-category">
                <MpFormLabel>Goal sub-category</MpFormLabel>
                <PxSelectPopover v-model="subCategory" :options="subCategoryOptions" placeholder="Select goal sub-category" width="100%" />
              </MpFormControl>

              <MpFormControl id="goal-weight" :is-invalid="errors.weight">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal weight</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <MpInputGroup>
                  <MpInput v-model="weight" type="number" min="0" max="100" />
                  <MpInputRightAddon>%</MpInputRightAddon>
                </MpInputGroup>
                <MpFormErrorMessage>Goal weight is required and must be greater than 0.</MpFormErrorMessage>
                <span v-if="!errors.weight" :class="helperText">{{ remainingWeight }}% remaining from total weight</span>
              </MpFormControl>
            </div>

            <!-- Goal schedule -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal schedule</span>
                <span :class="sectionDesc">Define when this goal is active within the goal cycle.</span>
              </div>
              <MpCheckbox id="repeat-goal" v-model:is-checked="repeat">Repeat this goal</MpCheckbox>
              <MpFormControl v-if="repeat" id="repeat-every">
                <MpFormLabel>Repeat every</MpFormLabel>
                <PxSelectPopover v-model="repeatEvery" :options="REPEAT_INTERVAL_OPTIONS" width="100%" />
              </MpFormControl>
            </div>

            <!-- Goal measurement -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal measurement</span>
                <span :class="sectionDesc">How progress is tracked and what success looks like.</span>
              </div>

              <MpFormControl id="measurement-unit">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Measurement unit</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <MpFlex direction="column" gap="2">
                  <template v-for="opt in MEASUREMENT_UNIT_OPTIONS" :key="opt.value">
                    <MpRadio
                      name="measurement-unit"
                      :value="opt.value"
                      :is-checked="measurementUnit === opt.value"
                      @update:is-checked="measurementUnit = opt.value"
                    >
                      {{ opt.label }}
                    </MpRadio>
                    <div v-if="measurementUnit === opt.value" :class="radioIndent">
                      <MpCheckbox id="use-baseline" v-model:is-checked="useBaseline">Use baseline</MpCheckbox>
                      <MpFlex gap="4">
                        <MpFormControl v-if="useBaseline" id="start-value" :class="css({ flex: '1' })">
                          <MpFormLabel>Start value</MpFormLabel>
                          <MpInputGroup v-if="opt.value === 'amount'">
                            <MpInputLeftAddon>Rp</MpInputLeftAddon>
                            <MpInput v-model="startValueAmountDisplay" type="text" inputmode="numeric" />
                          </MpInputGroup>
                          <MpInputGroup v-else>
                            <MpInput v-model="startValue" type="number" :class="noSpinner" />
                            <MpInputRightAddon>{{ opt.value === 'percentage' ? '%' : '#' }}</MpInputRightAddon>
                          </MpInputGroup>
                        </MpFormControl>
                        <MpFormControl id="target-value" :class="css({ flex: '1' })">
                          <MpFormLabel>Target value</MpFormLabel>
                          <MpInputGroup v-if="opt.value === 'amount'">
                            <MpInputLeftAddon>Rp</MpInputLeftAddon>
                            <MpInput v-model="targetValueAmountDisplay" type="text" inputmode="numeric" />
                          </MpInputGroup>
                          <MpInputGroup v-else>
                            <MpInput v-model="targetValue" type="number" :class="noSpinner" />
                            <MpInputRightAddon>{{ opt.value === 'percentage' ? '%' : '#' }}</MpInputRightAddon>
                          </MpInputGroup>
                        </MpFormControl>
                      </MpFlex>
                    </div>
                  </template>
                </MpFlex>
              </MpFormControl>

              <MpFormControl id="goal-direction">
                <MpFlex align="center" gap="1">
                  <MpFormLabel>Goal direction</MpFormLabel>
                  <MpText size="label" :class="requiredMark">*</MpText>
                </MpFlex>
                <MpFlex direction="column" gap="2">
                  <MpRadio name="goal-direction" value="higher" :is-checked="direction === 'higher'" @update:is-checked="direction = 'higher'">Higher is better</MpRadio>
                  <MpRadio name="goal-direction" value="lower" :is-checked="direction === 'lower'" @update:is-checked="direction = 'lower'">Lower is better</MpRadio>
                </MpFlex>
              </MpFormControl>
            </div>

            <!-- Goal contributor -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal contributor <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">People who contribute to this goal's progress.</span>
              </div>

              <!-- Single owner: one flat contributor list -->
              <template v-if="owners.length === 1">
                <MpFlex v-for="id in (contributorsByOwner[owners[0].id] ?? [])" :key="id" :class="personRow">
                  <MpAvatar :id="id" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" size="md" variant-color="gray" />
                  <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                    <span :class="personName">{{ employeeById(id)?.name }}</span>
                    <span :class="personMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                  </MpFlex>
                  <button type="button" :class="removeBtn" aria-label="Remove contributor" @click="removeContributor(owners[0].id, id)">
                    <MpIcon name="minus-circular" size="sm" />
                  </button>
                </MpFlex>
                <button type="button" :class="addLink" @click="contributorDrawerOwnerId = owners[0].id">
                  <MpIcon name="add" size="sm" />
                  Add goal contributor
                </button>
              </template>

              <!-- Multiple owners: one card per owner, contributor picked per owner -->
              <template v-else>
                <div v-for="owner in owners" :key="owner.id" :class="personCard">
                  <div :class="personRow">
                    <MpAvatar :id="owner.id" :name="owner.name" :src="owner.photo" size="md" variant-color="gray" />
                    <MpFlex direction="column" gap="0">
                      <span :class="personName">{{ owner.name }}</span>
                      <span :class="personMeta">{{ employeeMeta(owner) }}</span>
                    </MpFlex>
                  </div>

                  <MpFlex v-for="id in (contributorsByOwner[owner.id] ?? [])" :key="id" :class="personRow">
                    <MpAvatar :id="id" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" size="sm" variant-color="gray" />
                    <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                      <span :class="personName">{{ employeeById(id)?.name }}</span>
                      <span :class="personMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                    </MpFlex>
                    <button type="button" :class="removeBtn" aria-label="Remove contributor" @click="removeContributor(owner.id, id)">
                      <MpIcon name="minus-circular" size="sm" />
                    </button>
                  </MpFlex>

                  <button type="button" :class="addLink" @click="contributorDrawerOwnerId = owner.id">
                    <MpIcon name="add" size="sm" />
                    Add goal contributor
                  </button>
                </div>
              </template>
            </div>

            <!-- Goal viewers -->
            <div :class="section">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Goal viewers <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">People who can view this goal and align their goals to it.</span>
              </div>
              <MpFlex v-for="id in viewerIds" :key="id" :class="personRow">
                <MpAvatar :id="id" :name="employeeById(id)?.name" :src="employeeById(id)?.photo" size="md" variant-color="gray" />
                <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                  <span :class="personName">{{ employeeById(id)?.name }}</span>
                  <span :class="personMeta">{{ employeeById(id) ? employeeMeta(employeeById(id)!) : '' }}</span>
                </MpFlex>
                <button type="button" :class="removeBtn" aria-label="Remove viewer" @click="removeViewer(id)">
                  <MpIcon name="minus-circular" size="sm" />
                </button>
              </MpFlex>
              <button type="button" :class="addLink" @click="viewerDrawerOpen = true">
                <MpIcon name="add" size="sm" />
                Add goal viewers
              </button>
            </div>

            <!-- Key results -->
            <div :class="sectionLast">
              <div :class="sectionHeader">
                <span :class="sectionTitle">Key results <MpText size="label" :class="css({ color: 'text.secondary', fontWeight: '400' })">Optional</MpText></span>
                <span :class="sectionDesc">Specific outcomes that automatically update goal progress.</span>
              </div>
              <div v-for="kr in keyResults" :key="kr.id" :class="krRow">
                <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                  <span :class="personName">{{ kr.title }}</span>
                  <span v-if="kr.target" :class="personMeta">Target: {{ kr.target }}</span>
                </MpFlex>
                <button type="button" :class="removeBtn" aria-label="Remove key result" @click="removeKeyResult(kr.id)">
                  <MpIcon name="minus-circular" size="sm" />
                </button>
              </div>
              <div v-if="showKeyResultForm" :class="krForm">
                <MpFormControl id="kr-title">
                  <MpFormLabel>Key result title</MpFormLabel>
                  <MpInput v-model="keyResultTitle" />
                </MpFormControl>
                <MpFormControl id="kr-target">
                  <MpFormLabel>Target</MpFormLabel>
                  <MpInput v-model="keyResultTarget" />
                </MpFormControl>
                <MpButtonGroup>
                  <MpButton variant="ghost" @click="showKeyResultForm = false">Cancel</MpButton>
                  <MpButton variant="primary" @click="addKeyResult">Add</MpButton>
                </MpButtonGroup>
              </div>
              <button v-else type="button" :class="addLink" @click="showKeyResultForm = true">
                <MpIcon name="add" size="sm" />
                Add key result
              </button>
            </div>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="save">Save</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>

  <SelectEmployeesDrawer
    :is-open="!!contributorDrawerOwnerId"
    title="Select goal contributor"
    description="People who contribute to this goal's progress."
    :initial-selected="contributorDrawerOwnerId ? (contributorsByOwner[contributorDrawerOwnerId] ?? []) : []"
    :exclude-ids="contributorDrawerOwnerId ? [contributorDrawerOwnerId] : []"
    :is-required="false"
    @update:is-open="(v) => { if (!v) contributorDrawerOwnerId = null }"
    @continue="(ids) => { if (contributorDrawerOwnerId) contributorsByOwner[contributorDrawerOwnerId] = ids }"
  />
  <SelectEmployeesDrawer
    :is-open="viewerDrawerOpen"
    title="Select goal viewers"
    description="People who can view this goal and align their goals to it."
    :initial-selected="viewerIds"
    :is-required="false"
    @update:is-open="viewerDrawerOpen = $event"
    @continue="(ids) => { viewerIds = ids }"
  />
</template>
