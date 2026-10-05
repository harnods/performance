<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migrated from talenta-review (commit 010875214aba):
    src/components/modals/ModalBulkAddEmployee.vue
  Component name preserved: ModalBulkAddEmployee. Only the assign-role flow
  is migrated (is-assign-role-flow, use-employee-status, single-select
  filters, #select-assign-role slot). Props kept: isOpen (+ update:isOpen),
  title, useEmployeeStatus, isAssignRoleFlow, getDisabledTooltip; emits
  `submit` with { selected, done } like production.
  Prototype only: getDataUrl (POST /users/assign-role, 50/page infinite
  scroll) → `users` prop with the full MOCK list, filtered client-side;
  Vuex getUserFilters → options derived from the list.
  Row/list styling reuses SelectEmployeesDrawer.vue (same composition).
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpButton, MpButtonGroup, MpIcon, MpInput, MpTooltip, MpFormControl, MpFormLabel, css,
} from '@mekari/pixel3'
import type { AssignableUser } from '~/utils/manageUser'

defineOptions({ name: 'ModalBulkAddEmployee' })

const props = withDefaults(defineProps<{
  isOpen?: boolean
  title?: string
  users: AssignableUser[]
  useEmployeeStatus?: boolean
  isAssignRoleFlow?: boolean
  getDisabledTooltip?: (u: AssignableUser) => string
}>(), { isOpen: false, title: 'Add employee', useEmployeeStatus: false, isAssignRoleFlow: false, getDisabledTooltip: () => '' })
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  submit: [payload: { selected: AssignableUser[], done: () => void }]
}>()

const initialFilter = { branch: '', organization: '', job_level: '', job_position: '', employee_status: '' }
const filter = ref({ ...initialFilter })
const isShowFilter = ref(false)
const searchVal = ref('')
const selected = ref<AssignableUser[]>([])
const isSubmitting = ref(false)

watch(() => props.isOpen, (val) => {
  if (!val) return
  filter.value = { ...initialFilter }
  isShowFilter.value = false
  searchVal.value = ''
  selected.value = []
})

const distinct = (vals: string[]) => Array.from(new Set(vals.filter(Boolean))).sort()
const toOptions = (vals: string[]) => distinct(vals).map(v => ({ value: v, label: v }))
const branchOptions = computed(() => toOptions(props.users.map(u => u.branch)))
const organizationOptions = computed(() => toOptions(props.users.map(u => u.organization)))
const jobLevelOptions = computed(() => toOptions(props.users.map(u => u.job_level)))
const jobPositionOptions = computed(() => toOptions(props.users.map(u => u.job_position)))
const employeeStatusOptions = computed(() => toOptions(props.users.map(u => u.employment_status)))

const activeFilterCount = computed(() => Object.values(filter.value).filter(Boolean).length)
const isSelectedFilter = computed(() => activeFilterCount.value > 0)

const fullName = (u: AssignableUser) => [u.first_name, u.last_name].join(' ').trim()
const subLine = (u: AssignableUser) => [u.id_employee, u.job?.job ?? ''].filter(Boolean).join(' - ')

const filteredUsers = computed(() => {
  const q = searchVal.value.trim().toLowerCase()
  const f = filter.value
  const selectedIds = new Set(selected.value.map(s => s.id))
  return props.users.filter(u => !selectedIds.has(u.id)
    && (!q || fullName(u).toLowerCase().includes(q) || u.id_employee.toLowerCase().includes(q))
    && (!f.branch || u.branch === f.branch)
    && (!f.organization || u.organization === f.organization)
    && (!f.job_level || u.job_level === f.job_level)
    && (!f.job_position || u.job_position === f.job_position)
    && (!f.employee_status || u.employment_status === f.employee_status))
})
const totalAvailableUsers = computed(() => filteredUsers.value.length)
const pluralize = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function add(user: AssignableUser) {
  if (user.is_disabled) return
  selected.value = [...selected.value, user]
}
function addAll() {
  selected.value = [...selected.value, ...filteredUsers.value.filter(u => !u.is_disabled)]
}
function subtract(user: AssignableUser) {
  selected.value = selected.value.filter(s => s.id !== user.id)
}
function subtractAll() { selected.value = [] }
function resetFilter() { filter.value = { ...initialFilter } }
function toggleFilter() { isShowFilter.value = !isShowFilter.value }

function close() {
  if (isSubmitting.value) return
  emit('update:isOpen', false)
}
function save() {
  isSubmitting.value = true
  emit('submit', { selected: [...selected.value], done: () => { isSubmitting.value = false } })
}

// ─── Styles (DT 2.4) — rows mirror SelectEmployeesDrawer.vue ────────────────
const frame = css({ display: 'flex', height: '460px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'md', overflow: 'hidden' })
const pane = css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '4', minWidth: '0', minHeight: '0' })
const filterPane = css({ width: '45%', flexShrink: '0', background: 'background.surface', borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const listPane = css({ width: '55%', flexShrink: '0' })
const listPaneBordered = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' })
const selectedPane = css({ flex: '1' })
const paneHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', minHeight: '32px' })
const paneTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const listAction = css({ background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', color: 'text.link', fontSize: '14px', lineHeight: '20px', textDecoration: 'underline', _disabled: { color: 'text.disabled', cursor: 'not-allowed', textDecoration: 'none' } })
const searchWrap = css({ position: 'relative', flex: '1', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '3', top: '50%', transform: 'translateY(-50%)', color: 'icon.default', pointerEvents: 'none', zIndex: '1' })
const listScroll = css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', overflowY: 'auto' })
const employeeRowBase = {
  display: 'flex', alignItems: 'center', gap: '3', width: '100%', textAlign: 'left',
  paddingBlock: '3', paddingInline: '2', background: 'transparent', border: 'none',
  borderBottom: '1px solid', borderBottomColor: 'border.default',
} as const
const employeeRowClickable = css({
  ...employeeRowBase, cursor: 'pointer',
  _hover: { background: 'background.neutral.subtle' },
  '& .row-action-icon': { opacity: '0', transition: 'opacity 0.12s ease' },
  '&:hover .row-action-icon': { opacity: '1' },
})
const employeeRowDisabled = css({ ...employeeRowBase, cursor: 'not-allowed', opacity: '0.5' })
const employeeName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const employeeMetaText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', overflowWrap: 'anywhere' })
const rowIcon = css({ color: 'icon.brand', flexShrink: '0', marginLeft: 'auto' })
const removeIcon = css({ color: 'icon.secondary', flexShrink: '0', marginLeft: 'auto' })
const emptyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary', paddingBlock: '4', textAlign: 'center' })
const footerCol = css({ display: 'flex', flexDirection: 'column', gap: '4', width: '100%' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="xl" class="bulk-add-employee-modal" :is-close-on-overlay-click="!isSubmitting" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          {{ title }}
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <div :class="frame">
            <!-- Filter -->
            <div v-if="isShowFilter" :class="[pane, filterPane]">
              <div :class="paneHeader">
                <MpFlex align="center" gap="1">
                  <MpTooltip label="Hide filter" use-portal>
                    <MpButton variant="ghost" size="sm" left-icon="chevrons-left" aria-label="Hide filter" @click="toggleFilter" />
                  </MpTooltip>
                  <span :class="paneTitle">Filter</span>
                </MpFlex>
                <button type="button" :class="listAction" :disabled="!isSelectedFilter" data-qa="reset-filter" @click="resetFilter">Reset filter</button>
              </div>
              <MpFlex direction="column" gap="3" :class="css({ overflowY: 'auto' })">
                <MpFormControl id="filter-branch">
                  <MpFormLabel>Branch</MpFormLabel>
                  <PxSelectPopover v-model="filter.branch" :options="branchOptions" placeholder="All branches" width="100%" is-clearable />
                </MpFormControl>
                <MpFormControl id="filter-organization">
                  <MpFormLabel>Organization</MpFormLabel>
                  <PxSelectPopover v-model="filter.organization" :options="organizationOptions" placeholder="All organizations" width="100%" is-clearable data-qa="filter-organization" />
                </MpFormControl>
                <MpFormControl id="filter-job-level">
                  <MpFormLabel>Job Level</MpFormLabel>
                  <PxSelectPopover v-model="filter.job_level" :options="jobLevelOptions" placeholder="All levels" width="100%" is-clearable data-qa="filter-job-level" />
                </MpFormControl>
                <MpFormControl id="filter-job-position">
                  <MpFormLabel>Job Position</MpFormLabel>
                  <PxSelectPopover v-model="filter.job_position" :options="jobPositionOptions" placeholder="All positions" width="100%" is-clearable searchable data-qa="filter-job-position" />
                </MpFormControl>
                <MpFormControl v-if="useEmployeeStatus" id="filter-employment-status">
                  <MpFormLabel>Employment Status</MpFormLabel>
                  <PxSelectPopover v-model="filter.employee_status" :options="employeeStatusOptions" placeholder="All statuses" width="100%" is-clearable data-qa="filter-employement-status" />
                </MpFormControl>
              </MpFlex>
            </div>

            <!-- Users list -->
            <div :class="[pane, listPane, !isShowFilter && listPaneBordered]">
              <div :class="paneHeader">
                <span :class="paneTitle">Total {{ pluralize(totalAvailableUsers, 'employee', 'employees') }}</span>
                <button v-if="totalAvailableUsers > 0" type="button" :class="listAction" data-qa="add-all-employee" @click="addAll">Add all</button>
              </div>
              <MpFlex align="center" gap="2">
                <div :class="searchWrap">
                  <MpIcon name="search" size="sm" :class="searchIcon" />
                  <MpInput v-model="searchVal" placeholder="Search employee name or ID" data-qa="search-employee" />
                </div>
                <MpButton variant="secondary" left-icon="filter" data-qa="show-filter" @click="toggleFilter">
                  Filter{{ isSelectedFilter ? ` (${activeFilterCount})` : '' }}
                </MpButton>
              </MpFlex>
              <div :class="listScroll">
                <template v-for="(user, idx) in filteredUsers" :key="`user_container_${user.id}`">
                  <MpTooltip v-if="user.is_disabled" :label="getDisabledTooltip(user)" use-portal placement="top">
                    <div :class="employeeRowDisabled" :data-qa="`add-employee-${idx}`" aria-disabled="true">
                      <PxAvatar :id="user.employee_key" :name="fullName(user)" :src="user.avatar" size="lg" variant-color="gray" />
                      <MpFlex direction="column" gap="0">
                        <span :class="employeeName">{{ fullName(user) }}</span>
                        <span :class="employeeMetaText">{{ subLine(user) }}</span>
                      </MpFlex>
                    </div>
                  </MpTooltip>
                  <button v-else type="button" :class="employeeRowClickable" :data-qa="`add-employee-${idx}`" @click="add(user)">
                    <PxAvatar :id="user.employee_key" :name="fullName(user)" :src="user.avatar" size="lg" variant-color="gray" />
                    <MpFlex direction="column" gap="0">
                      <span :class="employeeName">{{ fullName(user) }}</span>
                      <span :class="employeeMetaText">{{ subLine(user) }}</span>
                    </MpFlex>
                    <MpIcon name="add-circular" size="sm" class="row-action-icon" :class="rowIcon" />
                  </button>
                </template>
                <p v-if="!filteredUsers.length" :class="emptyText">No employee found</p>
              </div>
            </div>

            <!-- Selected users list -->
            <div v-if="!isShowFilter" :class="[pane, selectedPane]">
              <div :class="paneHeader">
                <span :class="paneTitle">{{ pluralize(selected.length, 'employee', 'employee(s)') }} selected</span>
                <button type="button" :class="listAction" data-qa="reset-all" @click="subtractAll">Reset all</button>
              </div>
              <div :class="listScroll">
                <button v-for="user in selected" :key="`selected_employee_${user.id}`" type="button" :class="employeeRowClickable" data-qa="remove-employee" @click="subtract(user)">
                  <PxAvatar :id="user.employee_key" :name="fullName(user)" :src="user.avatar" size="lg" variant-color="gray" />
                  <MpFlex direction="column" gap="0">
                    <span :class="employeeName">{{ fullName(user) }}</span>
                    <span :class="employeeMetaText">{{ subLine(user) }}</span>
                  </MpFlex>
                  <MpIcon name="minus-circular" size="sm" :class="removeIcon" />
                </button>
                <p v-if="!selected.length" :class="emptyText">No employees selected yet</p>
              </div>
            </div>
          </div>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerCol">
            <slot name="select-assign-role" />
            <MpFlex justify="flex-end">
              <MpButtonGroup>
                <MpButton variant="ghost" data-qa="cancel" @click="close">Cancel</MpButton>
                <MpButton variant="primary" :is-loading="isSubmitting" data-qa="save" @click="save">Save</MpButton>
              </MpButtonGroup>
            </MpFlex>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.bulk-add-employee-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
