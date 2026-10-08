<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Roles (list)
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/manage-user/roles/Index.vue
  Component name preserved: SettingsRoleIndex. Route: production settings_roles
  (/settings/manage-user/roles) → /settings/manage-users/roles.
  Prototype only: Vuex `settings/getRolesPaginated` + DELETE /roles/:id removed;
  data is the MOCK in utils/manageUser.ts via useManageUserStore. Search, sort
  and pagination run client-side (production does them server-side).
  Permission checks (isSuperAdmin / hasAccess('manage-users.*')) removed —
  every action is shown.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon, MpBadge, MpDivider,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpTooltip, toast, css,
} from '@mekari/pixel3'
import type { RoleRow } from '~/utils/manageUser'

defineOptions({ name: 'SettingsRoleIndex' })
definePageMeta({ title: 'Roles', layout: 'default' })

const router = useRouter()
const { roleList, deleteRole } = useManageUserStore()

const searchKeyword = ref('')
// Production swaps the table for a blank slate when the (searched) list is
// empty; here only the genuinely-empty list does (docs/patterns/table.md §empty).
const isBlankSlate = computed(() => !roleList.value.length && !searchKeyword.value)

const rows = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase()
  return q ? roleList.value.filter(r => r.name.toLowerCase().includes(q)) : roleList.value
})

// ─── Column sort (production sortMixin: name) ────────────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const sorted = computed(() => {
  if (!sortKey.value) return rows.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir)
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => rows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sorted.value.slice(showingFrom.value - 1, showingTo.value))
watch(searchKeyword, () => { currentPage.value = 1 })
watch(totalPages, (n) => { if (currentPage.value > n) currentPage.value = n })

const isDefaultRole = (role: RoleRow) => role.company_id === 0

const { canManageRoles } = useRoleActor()
const ADD_ROLE_LOCKED_TIP = 'Contact your admin to get access to add roles'
function goToAdd() { router.push('/settings/manage-users/roles/add') }
function goToEdit(role: RoleRow) { router.push(`/settings/manage-users/roles/edit/${role.id}`) }

// ─── Delete ──────────────────────────────────────────────────────────────────
const isModalDelete = ref(false)
const selectedRole = ref<number | null>(null)
function onDeleteRole(id: number) {
  selectedRole.value = id
  isModalDelete.value = true
}
function confirmDelete() {
  // MOCK of DELETE /roles/:id
  if (selectedRole.value != null) deleteRole(selectedRole.value)
  isModalDelete.value = false
  currentPage.value = 1
  toast.notify({ id: 'role-deleted', position: 'top-center', variant: 'success', title: 'Role successfully deleted' })
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle', textAlign: 'right' })
const colHalf = css({ width: '40%' })
const captionText = css({ color: 'text.secondary' })
const dangerText = css({ color: 'text.danger' })
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
const bodyText = css({ color: 'text.default' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <!-- A disabled button fires no mouse events, so the tooltip hangs off a wrapper. -->
    <MpTooltip :label="ADD_ROLE_LOCKED_TIP" :is-manual="canManageRoles" :is-open="false" use-portal>
      <div>
        <MpButton variant="primary" left-icon="add" data-qa="roles-index-create" :is-disabled="!canManageRoles" @click="goToAdd">Add role</MpButton>
      </div>
    </MpTooltip>
  </Teleport>

  <!-- No roles at all → blank slate replaces filter + table -->
  <MpFlex v-if="isBlankSlate" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
    <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
    <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
      <MpText :class="emptyTitle">No roles yet</MpText>
      <MpText size="label" :class="captionText">Create a new role to begin.</MpText>
    </MpFlex>
    <MpTooltip :label="ADD_ROLE_LOCKED_TIP" :is-manual="canManageRoles" :is-open="false" use-portal>
      <div>
        <MpButton variant="secondary" left-icon="add" :is-disabled="!canManageRoles" @click="goToAdd">Add role</MpButton>
      </div>
    </MpTooltip>
  </MpFlex>

  <div v-else :class="page">
    <!-- Filter -->
    <div :class="filterBar">
      <MpInputGroup :class="css({ width: '260px' })">
        <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
        <MpInput v-model="searchKeyword" placeholder="Search role name..." data-qa="settings-roles-input-search" />
      </MpInputGroup>
    </div>

    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="sort-th" :class="[headCell, colHalf]" data-qa="roles-index-sort-name">
                <span :class="thInner"><span>Role name</span><PxColumnSortMenu col-key="name" sort-type="text" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" :class="[headCell, colHalf]">Description</MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="role in paged" :key="`role${role.id}`" :data-qa="`roles-index-row-${role.id}`">
              <MpTableCell as="td" :class="cell">
                <MpFlex align="center" gap="2" wrap="wrap">
                  <span>{{ role.name }}</span>
                  <MpBadge v-if="isDefaultRole(role)" for="tableStatus" type="announcement" size="sm">Default</MpBadge>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">{{ role.description || '-' }}</MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover v-if="!isDefaultRole(role)" is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="`Actions for ${role.name}`" />
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem :data-qa="`roles-index-edit-${role.id}`" @click="goToEdit(role)">Edit role</MpPopoverListItem>
                      <MpDivider />
                      <MpPopoverListItem :data-qa="`roles-index-delete-${role.id}`" @click="onDeleteRole(role.id)"><span :class="dangerText">Delete role</span></MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
            <!-- Search matched nothing → keep the shell, single centered row -->
            <MpTableRow v-if="!rows.length">
              <MpTableCell as="td" :colspan="3" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                No result found. You can try searching different keywords.
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
  </div>

  <!-- Delete confirmation -->
  <ClientOnly>
    <MpModal :is-open="isModalDelete" class="roles-confirm-modal" @close="isModalDelete = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Delete role?
          <MpModalCloseButton @click="isModalDelete = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">By deleting the role, you cannot recover it.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="isModalDelete = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* Reveal the column sort icon on header hover (same as competencies/items). */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
/* docs/patterns/modal.md — top-center at 80px. */
:global(.roles-confirm-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
