<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Select employees drawer
  Source: Figma — Reviews > Review Cycles (fileKey vAuAKwCkhEUX3zjsfwi1s1,
  node 11863:464786 "Drawer / Assign Employee")

  Reusable two-column pick list: left = everyone not yet picked (click a row
  to add, own search + Select all), right = current picks (own search, Clear
  selection, remove per row). Originally built for the Goals "New goals" flow
  (picking goal owners) and reused for picking goal contributors/viewers
  inside AddGoalDrawer — callers seed `initial-selected`, `exclude-ids` and
  `is-required` to fit each case. "Continue" (not "Save" as in the Figma
  donor) since the owner-picking case moves on to another step, not a final
  save; reused as-is for contributor/viewer pickers too.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpButtonGroup,
  MpIcon,
  MpAvatar,
  MpInput,
  MpDrawer,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpDrawerOverlay,
  MpBanner,
  MpBannerIcon,
  MpBannerDescription,
  css,
} from '@mekari/pixel3'
import { EMPLOYEES, employeeMeta } from '~/utils/employees'

const props = defineProps<{
  isOpen: boolean
  drawerId?: string
  title?: string
  description?: string
  initialSelected?: string[]
  excludeIds?: string[]
  /** When provided, only these employee ids are selectable (candidate whitelist). */
  includeIds?: string[]
  excludeNote?: string
  isRequired?: boolean
  confirmLabel?: string
  /** Past this many picks, block immediately (same payload/close as clicking
   * Continue) instead of waiting for Continue — see useBulkOwnerGate's
   * MANUAL_CREATE_OWNER_LIMIT for the "New goals" case this exists for. */
  maxSelectable?: number
}>()
const emit = defineEmits<{
  'update:isOpen': [boolean]
  'continue': [string[]]
}>()

const resolvedDrawerId = computed(() => props.drawerId ?? 'drawer-select-employees')
const drawerTitle = computed(() => props.title ?? 'Select employees')
const drawerDescription = computed(() => props.description ?? 'Select employees to create this goal for.')
const excluded = computed(() => new Set(props.excludeIds ?? []))
const included = computed(() => (props.includeIds ? new Set(props.includeIds) : null))
const resolvedExcludeNote = computed(() => props.excludeNote
  ?? `The goal owner${(props.excludeIds?.length ?? 0) > 1 ? 's' : ''} won't appear in the list below. They can't be their own contributor or viewer.`)

const selectedIds = ref<string[]>([])
const availableSearch = ref('')
const selectedSearch = ref('')
const hasSelectionError = ref(false)

watch(() => props.isOpen, (open) => {
  if (open) {
    selectedIds.value = [...(props.initialSelected ?? [])]
    availableSearch.value = ''
    selectedSearch.value = ''
    hasSelectionError.value = false
  }
})
watch(selectedIds, () => { hasSelectionError.value = false })

function matches(name: string, code: string, q: string) {
  const query = q.trim().toLowerCase()
  return !query || name.toLowerCase().includes(query) || code.toLowerCase().includes(query)
}

const availableEmployees = computed(() =>
  EMPLOYEES.filter(e => !selectedIds.value.includes(e.id) && !excluded.value.has(e.id)
    && (!included.value || included.value.has(e.id))
    && matches(e.name, e.code, availableSearch.value)),
)
const selectedEmployees = computed(() =>
  selectedIds.value
    .map(id => EMPLOYEES.find(e => e.id === id))
    .filter((e): e is typeof EMPLOYEES[number] => Boolean(e))
    .filter(e => matches(e.name, e.code, selectedSearch.value)),
)

// Block the moment a user pick crosses the limit — don't wait for
// "Continue" — so picking a second employee immediately hands off to the
// caller (which shows the "one at a time, use import" modal). Only called
// from user-driven adds (selectEmployee/selectAllVisible), never from the
// initialSelected pre-fill on open — otherwise re-opening this same drawer
// pre-filled past the limit (e.g. the modal's own "Cancel", which keeps the
// selection to let them trim it) would immediately re-trigger the block and
// loop forever instead of landing back on the picker.
function checkSelectionLimit() {
  if (props.maxSelectable && selectedIds.value.length > props.maxSelectable) {
    emit('continue', [...selectedIds.value])
    close()
    return true
  }
  return false
}

function selectEmployee(id: string) {
  if (selectedIds.value.includes(id)) return
  selectedIds.value = [...selectedIds.value, id]
  checkSelectionLimit()
}
function removeEmployee(id: string) {
  selectedIds.value = selectedIds.value.filter(eid => eid !== id)
}
function selectAllVisible() {
  const ids = availableEmployees.value.map(e => e.id)
  selectedIds.value = [...selectedIds.value, ...ids]
  checkSelectionLimit()
}
function clearSelection() {
  selectedIds.value = []
}

function close() {
  emit('update:isOpen', false)
}
function continueNext() {
  hasSelectionError.value = (props.isRequired ?? true) && !selectedIds.value.length
  if (hasSelectionError.value) return
  emit('continue', [...selectedIds.value])
  emit('update:isOpen', false)
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const descText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', paddingBottom: '6' })
const excludedNoteWrap = css({ marginBottom: '6', alignItems: 'flex-start', '& svg': { marginRight: '20px' } })
const excludedNoteText = css({ fontSize: '14px', fontWeight: '400', color: 'text.default' })
const columns = css({ display: 'flex', gap: '6', flex: '1', minHeight: '0' })
const column = css({ display: 'flex', flexDirection: 'column', gap: '6', flex: '1', minWidth: '0' })
const divider = css({ width: '1px', background: 'border.default', flexShrink: '0' })

const listHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4' })
const listHeaderTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const listAction = css({
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.link', fontSize: '14px', lineHeight: '20px', textDecoration: 'underline',
})

const searchWrap = css({
  position: 'relative',
  width: '100%',
  '& input': { paddingLeft: '36px' },
})
const searchIcon = css({
  position: 'absolute', left: '3', top: '50%', transform: 'translateY(-50%)',
  color: 'icon.default', pointerEvents: 'none', zIndex: '1',
})

const listScroll = css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', overflowY: 'auto' })
const employeeRow = css({
  display: 'flex', alignItems: 'center', gap: '3',
  paddingBlock: '3', paddingInline: '2',
  borderBottom: '1px solid', borderBottomColor: 'border.default',
})
const employeeRowClickable = css({
  display: 'flex', alignItems: 'center', gap: '3',
  paddingBlock: '3', paddingInline: '2',
  borderBottom: '1px solid', borderBottomColor: 'border.default',
  cursor: 'pointer', background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
  _hover: { background: 'background.neutral.subtle' },
  '& .add-employee-icon': { opacity: '0', transition: 'opacity 0.12s ease' },
  '&:hover .add-employee-icon': { opacity: '1' },
})
const employeeName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const employeeMetaText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const addEmployeeIcon = css({ color: 'icon.brand', flexShrink: '0', marginLeft: 'auto' })
const removeBtn = css({ background: 'transparent', border: 'none', padding: '2', cursor: 'pointer', color: 'icon.secondary', display: 'flex', flexShrink: '0' })
const emptyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary', paddingBlock: '4', textAlign: 'center' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :id="resolvedDrawerId" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="close">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ drawerTitle }}
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>
        <MpDrawerBody :class="css({ display: 'flex', flexDirection: 'column', minHeight: '0' })">
          <MpText :class="descText">{{ drawerDescription }}</MpText>
          <MpBanner v-if="excludeIds?.length" variant="info" is-inline :class="excludedNoteWrap">
            <MpBannerIcon />
            <MpBannerDescription :class="excludedNoteText">{{ resolvedExcludeNote }}</MpBannerDescription>
          </MpBanner>

          <div :class="columns">
            <!-- Available -->
            <div :class="column">
              <div :class="searchWrap">
                <MpIcon name="search" size="sm" :class="searchIcon" />
                <MpInput v-model="availableSearch" placeholder="Search employee name or ID" />
              </div>

              <div :class="css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' })">
                <div :class="listHeader">
                  <span :class="listHeaderTitle">Employees ({{ availableEmployees.length }})</span>
                  <button type="button" :class="listAction" @click="selectAllVisible">Select all</button>
                </div>
                <div :class="listScroll">
                  <button
                    v-for="e in availableEmployees"
                    :key="e.id"
                    type="button"
                    :class="employeeRowClickable"
                    @click="selectEmployee(e.id)"
                  >
                    <PxAvatar :id="e.id" :name="e.name" :src="e.photo" size="lg" variant-color="gray" />
                    <MpFlex direction="column" gap="0">
                      <span :class="employeeName">{{ e.name }}</span>
                      <span :class="employeeMetaText">{{ employeeMeta(e) }}</span>
                    </MpFlex>
                    <MpIcon name="add" size="sm" class="add-employee-icon" :class="addEmployeeIcon" />
                  </button>
                  <p v-if="!availableEmployees.length" :class="emptyText">No employees found</p>
                </div>
              </div>
            </div>

            <div :class="divider" />

            <!-- Selected -->
            <div :class="column">
              <div :class="searchWrap">
                <MpIcon name="search" size="sm" :class="searchIcon" />
                <MpInput v-model="selectedSearch" placeholder="Search employee name or ID" />
              </div>

              <div :class="css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' })">
                <div :class="listHeader">
                  <span :class="listHeaderTitle">Selected employees ({{ selectedIds.length }})</span>
                  <button type="button" :class="listAction" @click="clearSelection">Clear selection</button>
                </div>
                <div :class="listScroll">
                  <MpFlex v-for="e in selectedEmployees" :key="e.id" :class="employeeRow">
                    <PxAvatar :id="e.id" :name="e.name" :src="e.photo" size="lg" variant-color="gray" />
                    <MpFlex direction="column" gap="0" :class="css({ flex: '1' })">
                      <span :class="employeeName">{{ e.name }}</span>
                      <span :class="employeeMetaText">{{ employeeMeta(e) }}</span>
                    </MpFlex>
                    <button type="button" :class="removeBtn" aria-label="Remove" @click="removeEmployee(e.id)">
                      <MpIcon name="minus-circular" size="md" />
                    </button>
                  </MpFlex>
                  <p v-if="!selectedIds.length" :class="emptyText">No employees selected yet</p>
                </div>
              </div>
            </div>
          </div>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpFlex align="center" justify="space-between" :class="css({ width: '100%' })">
            <MpText v-if="hasSelectionError" size="label" :class="css({ color: 'text.danger' })">
              You must select at least one employee
            </MpText>
            <span v-else />
            <MpButtonGroup>
              <MpButton variant="ghost" @click="close">Cancel</MpButton>
              <MpButton variant="primary" @click="continueNext">{{ confirmLabel ?? 'Continue' }}</MpButton>
            </MpButtonGroup>
          </MpFlex>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
