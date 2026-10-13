<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Assign role (list)
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/manage-user/assign-role/Index.vue
  Component name preserved: AssignRolesIndex. Route: production
  settings_assign_role (/settings/manage-user/assign-role) →
  /settings/manage-users/assign-role (menu label "Assign roles").
  Prototype only — removed: Vuex `settings/{getAssignedRoles,getAndStoreRoles,
  submitAssignRole}`, getUserFilters, getGrantAccess (isQuotaBased /
  isQuotaRestricted), and the $axios calls (PUT /role-users,
  POST /role-users/bulk-delete-access-role, GET /role-users/specialist,
  GET /role-users/quota). Data is the MOCK in utils/manageUser.ts via
  useManageUserStore; search/sort/pagination run client-side. Permission
  checks (isSuperAdmin / hasAccess('manage-users.*'), role_id !== 1) removed —
  every action is shown.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon, MpCheckbox, MpDivider, MpBadge,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpButtonGroup, MpFormControl, MpFormLabel, MpFormHelpText, MpFormErrorMessage, MpTooltip, toast, css,
} from '@mekari/pixel3'
import type { AssignableUser, QuotaData, RoleUserRow } from '~/utils/manageUser'
import { AssignRoleError } from '~/composables/useManageUserStore'

defineOptions({ name: 'AssignRolesIndex' })
definePageMeta({ title: 'Assign role', layout: 'default' })

const {
  roleList, employeeRows, specialistRows, assignable, quota, isQuotaBased, isQuotaRestricted,
  submitAssignRole: postAssignRole, editRoleUsers, removeRoleUsers,
} = useManageUserStore()

// ─── Tabs (Employee / Specialist) ────────────────────────────────────────────
const tabs = [{ label: 'Employee' }, { label: 'Specialist' }]
const activeTab = ref(0)
const isSpecialist = computed(() => activeTab.value === 1)
function updateTab(idx: number) {
  activeTab.value = idx
  selected.value = []
  searchKey.value = ''
  sortKey.value = ''
  currentPage.value = 1
}

// Production shows "Add user" for quota-based subscriptions (also the page
// title there); here the title is static — see the migration notes.
const title = computed(() => (isQuotaBased ? 'Add user' : 'Assign role'))
const pageDescription = computed(() => (isSpecialist.value
  ? { title: 'Here is list of the specialist', desc: 'This user has been invited from company group or Mekari consultant as a performance consultant for your company.' }
  : { title: 'Here is list of your employee', desc: 'This user has been invited and has access to the performance management module.' }))

// ─── List / search / sort ────────────────────────────────────────────────────
const searchKey = ref('')
const source = computed(() => (isSpecialist.value ? specialistRows.value : employeeRows.value))
const fullName = (item: RoleUserRow) => item.users.full_name || `${item.users.first_name} ${item.users.last_name}`
const roleName = (item: RoleUserRow) => item.role_name || item.roles.name
const subLine = (item: RoleUserRow) => `${isSpecialist.value ? item.users.company_name || 'No company name' : item.users.id_employee || 'No organization'} | ${item.users.organization_name || 'No job'} | ${item.users.job || '-'}`
const filtered = computed(() => {
  const q = searchKey.value.trim().toLowerCase()
  return q ? source.value.filter(i => fullName(i).toLowerCase().includes(q)) : source.value
})
const isBlankSlate = computed(() => !source.value.length && !searchKey.value)

const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  const value = (i: RoleUserRow) => (sortKey.value === 'role' ? roleName(i) : fullName(i))
  return [...filtered.value].sort((a, b) => value(a).localeCompare(value(b), undefined, { sensitivity: 'base' }) * dir)
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sorted.value.slice(showingFrom.value - 1, showingTo.value))
watch(searchKey, () => { currentPage.value = 1 })
watch(totalPages, (n) => { if (currentPage.value > n) currentPage.value = n })

// ─── Selection (Employee tab only; kept across pages) ───────────────────────
const selected = ref<RoleUserRow[]>([])
const selectedIds = computed(() => new Set(selected.value.map(e => e.id)))
const pageIds = computed(() => paged.value.map(e => e.id))
const isSelectedAll = computed(() => pageIds.value.length > 0 && pageIds.value.every(id => selectedIds.value.has(id)))
function toggleRow(item: RoleUserRow) {
  selected.value = selectedIds.value.has(item.id) ? selected.value.filter(e => e.id !== item.id) : [...selected.value, item]
}
function checkAll() {
  selected.value = isSelectedAll.value
    ? selected.value.filter(e => !pageIds.value.includes(e.id))
    : [...selected.value, ...paged.value.filter(e => !selectedIds.value.has(e.id))]
}
function clearSelection() { selected.value = [] }
function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && selected.value.length) clearSelection() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
// Rows that no longer exist (removed) drop out of the selection.
watch(employeeRows, (rows) => {
  const ids = new Set(rows.map(r => r.id))
  selected.value = selected.value.filter(e => ids.has(e.id)).map(e => rows.find(r => r.id === e.id)!)
})

// ─── Quota ───────────────────────────────────────────────────────────────────
const quotaOverride = ref<Partial<QuotaData> | null>(null)
const quotaData = computed<Partial<QuotaData>>(() => ({ ...quota.value, ...quotaOverride.value }))
const isRequestSent = ref(false)
const isModalRequestQuota = ref(false)
const isModalEqual = ref(false)
const isModalExceed = ref(false)
const isModalRestricted = ref(false)

// ─── Assign role (header CTA → ModalBulkAddEmployee) ────────────────────────
const isModalAdd = ref(false)
const filterAssignRole = ref<{ selectedRole: string }>({ selectedRole: '' })
const assignRoleTouched = ref(false)
const roleOptions = computed(() => roleList.value.map(r => ({ value: String(r.id), label: r.name })))

function onAddUser() {
  quotaOverride.value = null
  if (isQuotaBased) {
    const { active_user: active, limit } = quota.value
    if (active === limit) isModalEqual.value = true
    else if (active > limit && isQuotaRestricted) isModalRestricted.value = true
    else if (active > limit) isModalExceed.value = true
    else openAssignModal()
  }
  else openAssignModal()
}
function openAssignModal() {
  filterAssignRole.value = { selectedRole: '' }
  assignRoleTouched.value = false
  isModalAdd.value = true
}
const getDisabledTooltip = (u: AssignableUser) => `This user is already assigned to the ${u.role_name} role.`

function submitAssignRole({ selected: picked, done }: { selected: AssignableUser[], done: () => void }) {
  assignRoleTouched.value = true
  if (!filterAssignRole.value.selectedRole || !picked.length) {
    toast.notify({ id: 'assign-role-error', position: 'top-center', variant: 'error', title: picked.length ? 'Select a role to assign' : 'Select at least one employee' })
    done()
    return
  }
  try {
    // MOCK of POST /role-users
    postAssignRole({ role_id: Number(filterAssignRole.value.selectedRole), user_ids: picked.map(e => e.id) })
    toast.notify({ id: 'assign-role-success', position: 'top-center', variant: 'success', title: 'Role is assigned successfully' })
    isModalAdd.value = false
  }
  catch (err) {
    if (err instanceof AssignRoleError && err.data.is_action_restricted) {
      isModalAdd.value = false
      quotaOverride.value = { active_user: err.data.active_user, limit: err.data.limit }
      isModalExceed.value = true
    }
    toast.notify({ id: 'assign-role-failed', position: 'top-center', variant: 'error', title: (err as Error).message || 'Failed to assign roles' })
  }
  finally {
    done()
  }
}

// ─── Edit role drawer (single / bulk) ───────────────────────────────────────
const isBulk = ref(false)
const isDrawerEdit = ref(false)
const selectedItem = ref<RoleUserRow | null>(null)
const selectedRole = ref('')
const editTouched = ref(false)
const editTargets = computed(() => (isBulk.value ? selected.value : selectedItem.value ? [selectedItem.value] : []))
const TAGS_SHOWN = 6
function showEditModal(item: RoleUserRow) {
  isBulk.value = false
  selectedItem.value = item
  selectedRole.value = String(item.role_id)
  editTouched.value = false
  isDrawerEdit.value = true
}
function showBulkEditModal() {
  isBulk.value = true
  selectedRole.value = ''
  editTouched.value = false
  isDrawerEdit.value = true
}
function onEdit() {
  editTouched.value = true
  if (!selectedRole.value) return
  // MOCK of PUT /role-users
  editRoleUsers({ role_id: Number(selectedRole.value), user_ids: editTargets.value.map(e => e.user_id) })
  toast.notify({ id: 'edit-role-success', position: 'top-center', variant: 'success', title: 'Role is edited successfully' })
  if (isBulk.value) selected.value = []
  isDrawerEdit.value = false
}

// ─── Remove modal (single / bulk) ───────────────────────────────────────────
const isModalDelete = ref(false)
function showDeleteModal(item: RoleUserRow) {
  isBulk.value = false
  selectedItem.value = item
  isModalDelete.value = true
}
function showBulkDeleteModal() {
  isBulk.value = true
  isModalDelete.value = true
}
function onDelete() {
  // MOCK of POST /role-users/bulk-delete-access-role
  removeRoleUsers({ user_ids: (isBulk.value ? selected.value : selectedItem.value ? [selectedItem.value] : []).map(e => e.user_id) })
  toast.notify({ id: 'delete-role-success', position: 'top-center', variant: 'success', title: 'Role is deleted successfully' })
  if (isBulk.value) selected.value = []
  isModalDelete.value = false
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const descRow = css({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '3', flexWrap: 'wrap' })
const h3Class = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2', paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400', color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent', marginBottom: '-1px',
  transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', verticalAlign: 'middle', textAlign: 'right' })
const nameCol = css({ width: '40%' })
const bulkCell = css({ paddingTop: '1', paddingBottom: '1', verticalAlign: 'middle' })
const bulkBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '40px' })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const captionText = css({ color: 'text.secondary' })
const dangerText = css({ color: 'text.danger' })
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
const drawerSection = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingBottom: '5', marginBottom: '5', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="primary" left-icon="add" data-qa="settings-assign-role-btn-add-user" @click="onAddUser">{{ title }}</MpButton>
  </Teleport>

  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <button v-for="(tab, idx) in tabs" :key="tab.label" type="button" :class="activeTab === idx ? tabItemActive : tabItem" @click="updateTab(idx)">{{ tab.label }}</button>
    </div>
  </Teleport>

  <div :class="page">
    <ManageUserQuotaInfo v-if="isQuotaBased" :data="quotaData" :is-request-sent="isRequestSent" @request-quota="isModalRequestQuota = true" />

    <!-- No records at all → blank slate replaces description + table -->
    <MpFlex v-if="isBlankSlate" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1">
        <MpText :class="emptyTitle">There is no data to display</MpText>
        <MpText size="label" :class="captionText">Your role assignment will display here</MpText>
      </MpFlex>
      <MpButton v-if="!isSpecialist" variant="secondary" left-icon="add" @click="onAddUser">{{ title }}</MpButton>
    </MpFlex>

    <template v-else>
      <div :class="descRow">
        <MpFlex direction="column" gap="0" :class="css({ maxWidth: '544px' })">
          <MpText as="h3" :class="h3Class">{{ pageDescription.title }}</MpText>
          <MpText size="label" color="text.secondary">{{ pageDescription.desc }}</MpText>
        </MpFlex>
        <MpInputGroup :class="css({ width: '260px' })">
          <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
          <MpInput :key="activeTab" v-model="searchKey" placeholder="Search user..." data-qa="settings-assign-role-input-search" />
        </MpInputGroup>
      </div>

      <MpFlex direction="column">
        <MpTableContainer>
          <MpTable :is-hoverable="false" :class="fixedTable">
            <!-- Widths locked so the body doesn't shift when the header swaps to the bulk bar. -->
            <colgroup>
              <col :class="nameCol">
              <col>
              <col :class="css({ width: '128px' })">
            </colgroup>
            <MpTableHead>
              <!-- 1+ selected → the header row becomes the bulk bar (docs/patterns/checkbox.md §3) -->
              <MpTableRow v-if="selected.length && !isSpecialist">
                <MpTableCell as="th" :colspan="3" :class="bulkCell">
                  <div :class="bulkBar">
                    <MpFlex align="center" gap="4">
                      <MpFlex align="center" gap="2">
                        <MpCheckbox :is-checked="isSelectedAll" :is-indeterminate="!isSelectedAll" aria-label="Select all" data-qa="settings-assign-role-checkbox-all" @update:is-checked="checkAll" />
                        <MpText size="label" weight="semiBold">{{ selected.length }} employee(s) selected</MpText>
                      </MpFlex>
                      <MpPopover is-close-on-select use-portal placement="bottom-start">
                        <MpPopoverTrigger>
                          <MpButton variant="primary" right-icon="caret-down" data-qa="settings-assign-role-btn-bulk-actions">Actions</MpButton>
                        </MpPopoverTrigger>
                        <MpPopoverContent :class="css({ minWidth: '160px' })">
                          <MpPopoverList>
                            <MpPopoverListItem data-qa="settings-assign-role-btn-bulk-edit" @click="showBulkEditModal">Edit role</MpPopoverListItem>
                            <MpDivider />
                            <MpPopoverListItem data-qa="settings-assign-role-btn-bulk-remove" @click="showBulkDeleteModal"><span :class="dangerText">Remove</span></MpPopoverListItem>
                          </MpPopoverList>
                        </MpPopoverContent>
                      </MpPopover>
                    </MpFlex>
                    <MpText size="label" :class="captionText">Press esc to deselect</MpText>
                  </div>
                </MpTableCell>
              </MpTableRow>
              <MpTableRow v-else>
                <MpTableCell as="th" class="sort-th" :class="headCell" data-qa="settings-assign-role-sort-name">
                  <MpFlex align="center" gap="2">
                    <MpCheckbox v-if="!isSpecialist" :key="activeTab" :is-checked="false" :is-disabled="!paged.length" aria-label="Select all" data-qa="settings-assign-role-checkbox-all" @update:is-checked="checkAll" />
                    <span :class="thInner"><span>Employee name</span><PxColumnSortMenu col-key="name" sort-type="text" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                  </MpFlex>
                </MpTableCell>
                <MpTableCell v-if="isSpecialist" as="th" :class="headCell">Role</MpTableCell>
                <MpTableCell v-else as="th" class="sort-th" :class="headCell" data-qa="settings-assign-role-sort-role">
                  <span :class="thInner"><span>Role</span><PxColumnSortMenu col-key="role" sort-type="text" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                </MpTableCell>
                <MpTableCell as="th" :class="actionHead" />
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="item in paged" :key="item.id" :data-qa="`view-settings-assign-role-item-${item.id}`">
                <MpTableCell as="td" :class="cell">
                  <MpFlex align="center" gap="2">
                    <MpCheckbox v-if="!isSpecialist" :is-checked="selectedIds.has(item.id)" :aria-label="`Select ${fullName(item)}`" @update:is-checked="toggleRow(item)" />
                    <MpFlex align="center" gap="3" :class="css({ minWidth: '0' })">
                      <PxAvatar :id="item.employee_key ?? String(item.user_id)" :name="fullName(item)" :src="item.users.avatar ?? undefined" size="lg" variant-color="gray" />
                      <MpFlex direction="column" gap="0" :class="css({ minWidth: '0' })">
                        <span :class="personName">{{ fullName(item) }}</span>
                        <span :class="personMeta">{{ subLine(item) }}</span>
                      </MpFlex>
                    </MpFlex>
                  </MpFlex>
                </MpTableCell>
                <MpTableCell as="td" :class="cell">{{ roleName(item) }}</MpTableCell>
                <MpTableCell as="td" :class="actionCell">
                  <MpPopover v-if="!isSpecialist" :key="activeTab" is-close-on-select use-portal placement="bottom-end">
                    <MpPopoverTrigger>
                      <MpButton variant="secondary" right-icon="caret-down" :data-qa="`settings-assign-role-btn-actions-${item.id}`">Actions</MpButton>
                    </MpPopoverTrigger>
                    <MpPopoverContent :class="css({ minWidth: '160px' })">
                      <MpPopoverList>
                        <MpPopoverListItem :data-qa="`settings-assign-role-btn-edit-${item.id}`" @click="showEditModal(item)">Edit role</MpPopoverListItem>
                        <MpDivider />
                        <MpPopoverListItem :data-qa="`settings-assign-role-btn-remove-${item.id}`" @click="showDeleteModal(item)"><span :class="dangerText">Remove</span></MpPopoverListItem>
                      </MpPopoverList>
                    </MpPopoverContent>
                  </MpPopover>
                </MpTableCell>
              </MpTableRow>
              <!-- Search matched nothing → keep the shell, single centered row -->
              <MpTableRow v-if="!filtered.length">
                <MpTableCell as="td" :colspan="3" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                  There is no data to display
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>

        <!-- Pagination footer -->
        <div v-if="totalRows" :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
          <MpFlex align="center" gap="3">
            <MpText size="label" :class="captionText">Rows per page</MpText>
            <MpPopover is-close-on-select use-portal placement="bottom-start">
              <MpPopoverTrigger>
                <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem v-for="opt in rowsPerPageOptions" :key="opt" :is-active="opt === rowsPerPage" @click="rowsPerPage = opt; currentPage = 1">{{ opt }}</MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </MpPopover>
            <MpText size="label" :class="captionText">Showing {{ showingFrom }}–{{ showingTo }} of {{ totalRows }}</MpText>
          </MpFlex>
          <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
            <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
            <MpTooltip label="Prev page" use-portal>
              <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
            </MpTooltip>
            <MpTooltip label="Next page" use-portal>
              <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
            </MpTooltip>
          </div>
        </div>
      </MpFlex>
    </template>
  </div>

  <ManageUserDrawerRequestQuota v-model:is-open="isModalRequestQuota" :quota="quotaData" @sent="isRequestSent = true" />

  <ManageUserModalBulkAddEmployee
    v-model:is-open="isModalAdd"
    :title="title"
    :users="assignable"
    use-employee-status
    is-assign-role-flow
    :get-disabled-tooltip="getDisabledTooltip"
    @submit="submitAssignRole"
  >
    <template #select-assign-role>
      <MpFormControl id="select-assign-role" :is-invalid="assignRoleTouched && !filterAssignRole.selectedRole" :class="css({ width: '320px' })">
        <MpFormLabel>Select role</MpFormLabel>
        <PxSelectPopover v-model="filterAssignRole.selectedRole" :options="roleOptions" placeholder="Select role" width="100%" searchable data-qa="settings-assign-role-input-select-role" />
        <MpFormErrorMessage>You must select a role</MpFormErrorMessage>
      </MpFormControl>
    </template>
  </ManageUserModalBulkAddEmployee>

  <ClientOnly>
    <!-- Remove member -->
    <MpModal :is-open="isModalDelete" class="assign-role-confirm-modal" @close="isModalDelete = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Remove member
          <MpModalCloseButton @click="isModalDelete = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpFlex direction="column" gap="1">
            <MpText v-if="isBulk" weight="semiBold">Are you sure remove {{ selected.length }} employee(s) ?</MpText>
            <MpText :class="css({ color: 'text.default' })">Removed employee will have no access on performance review features and also it will reduce your quota limit.</MpText>
          </MpFlex>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" data-qa="settings-assign-role-btn-modal-delete-cancel" @click="isModalDelete = false">Cancel</MpButton>
            <MpButton variant="danger" data-qa="settings-assign-role-btn-modal-delete" @click="onDelete">Delete</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Edit role (single / bulk) -->
    <MpDrawer id="drawer-edit-role" :is-open="isDrawerEdit" placement="right" size="md" is-keep-alive @close="isDrawerEdit = false">
      <MpDrawerContent>
        <MpDrawerHeader>
          {{ isBulk ? 'Bulk edit role' : 'Edit role' }}
          <MpDrawerCloseButton @click="isDrawerEdit = false" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <div :class="drawerSection">
            <MpFlex align="flex-start" gap="2">
              <MpIcon name="roles" />
              <MpFlex direction="column" gap="0">
                <MpText :class="h3Class">Assign role</MpText>
                <MpText size="label" color="text.secondary">All roles assigned to the employee will be replaced with the selected role below.</MpText>
              </MpFlex>
            </MpFlex>
            <MpFormControl id="edit-role-select" :is-invalid="editTouched && !selectedRole">
              <MpFormLabel>Role</MpFormLabel>
              <PxSelectPopover v-model="selectedRole" :options="roleOptions" placeholder="Select role" width="100%" searchable data-qa="settings-assign-role-select-role-drawer" />
              <MpFormHelpText v-if="!(editTouched && !selectedRole)">Selected roles will be assigned to employee(s).</MpFormHelpText>
              <MpFormErrorMessage>You must select a role</MpFormErrorMessage>
            </MpFormControl>
          </div>
          <MpFlex direction="column" gap="2">
            <MpText weight="semiBold">{{ editTargets.length }} employee(s) selected</MpText>
            <MpFlex wrap="wrap" gap="2">
              <MpBadge v-for="e in editTargets.slice(0, TAGS_SHOWN)" :key="e.id" for="tableStatus" type="announcement">{{ e.users.first_name }} {{ e.users.last_name }}</MpBadge>
              <MpBadge v-if="editTargets.length > TAGS_SHOWN" for="tableStatus" type="announcement">+{{ editTargets.length - TAGS_SHOWN }} more</MpBadge>
            </MpFlex>
          </MpFlex>
        </MpDrawerBody>
        <MpDrawerFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" data-qa="settings-assign-role-btn-drawer-cancel" @click="isDrawerEdit = false">Cancel</MpButton>
            <MpButton variant="primary" data-qa="settings-assign-role-btn-drawer-save" @click="onEdit">Save</MpButton>
          </MpButtonGroup>
        </MpDrawerFooter>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>

  <ManageUserModalWarnQuota v-model:is-open="isModalEqual" title="Add user" :data="quotaData" @request-quota="isModalRequestQuota = true" />
  <ManageUserModalWarnQuota v-model:is-open="isModalExceed" title="Add user" is-exceed :data="quotaData" />
  <ManageUserModalWarnQuota v-model:is-open="isModalRestricted" title="Add user" is-restricted />
</template>

<style scoped>
/* Reveal the column sort icon on header hover (same as competencies/items). */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
/* docs/patterns/modal.md — top-center at 80px. */
:global(.assign-role-confirm-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
