<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal categories (settings)
  Token mode: Pixel 2.4

  Replica of talenta-review's src/views/goals/categories/Index.vue. Manage the
  goal categories used across the performance goals: filter by status, search,
  and a table with per-row Actions (View details / Edit / Archive|Activate /
  Delete). Add/edit happens in GoalCategoryFormDrawer; sub-categories and
  linked goals open in modals. All data persists via useGoalCategoriesStore
  (localStorage), and Linked goals counts are real — derived from the goals
  mini-DB by matching Goal.category to the category name.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpBadge,
  MpIcon,
  MpSelect,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpTooltip,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpButtonGroup,
  toast,
  css,
} from '@mekari/pixel3'
import type { GoalCategoryRecord } from '~/composables/useGoalCategoriesStore'

definePageMeta({ title: 'Goal categories' })

const router = useRouter()
const {
  categories,
  addCategory,
  updateCategory,
  setStatus,
  deleteCategory,
  linkedGoalCount,
} = useGoalCategoriesStore()

// ─── Filter + search ──────────────────────────────────────────────────────────
const statusOptions = [
  { value: 'all', label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const statusFilter = ref('all')
const search = ref('')

const filtered = computed(() => categories.value
  .filter(c => statusFilter.value === 'all' || c.status === statusFilter.value)
  .filter(c => !search.value || c.name.toLowerCase().includes(search.value.toLowerCase())))

const hasFilter = computed(() => statusFilter.value !== 'all' || !!search.value)

// ─── Column sort (behaviour from goal-cycles/index.vue) ───────────────────────
// sortKey '' = default order (the store's own order).
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  name: 'text',
  subCategories: 'number',
  linkedGoals: 'number',
  status: 'text',
  modified: 'date', // sort chronologically by updatedAt (underlying ISO)
}
function sortValue(c: GoalCategoryRecord, key: string): string | number {
  if (key === 'name') return c.name
  if (key === 'subCategories') return c.subCategories.length
  if (key === 'linkedGoals') return linkedGoalCount(c.name)
  if (key === 'status') return c.status
  if (key === 'modified') return c.updatedAt ?? ''
  return ''
}
const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// ─── Pagination (matches goal-cycles/index.vue) ───────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => sorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sorted.value.slice(showingFrom.value - 1, showingTo.value))
watch([statusFilter, search], () => { currentPage.value = 1 })

// ─── Last modified formatting (table golden rule: dd/mm/yyyy, HH:mm) ──────────
function formatModified(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Add / edit drawer ────────────────────────────────────────────────────────
const isDrawerOpen = ref(false)
const editingCategory = ref<GoalCategoryRecord | null>(null)
const existingNames = computed(() => categories.value
  .filter(c => c.id !== editingCategory.value?.id)
  .map(c => c.name.toLowerCase()))

function openAdd() {
  editingCategory.value = null
  isDrawerOpen.value = true
}
function openEdit(cat: GoalCategoryRecord) {
  editingCategory.value = cat
  isDrawerOpen.value = true
}
function onSave(payload: { name: string, description: string, subCategories: { id: string, name: string }[] }) {
  if (editingCategory.value) {
    updateCategory(editingCategory.value.id, payload)
    toast.notify({ id: 'cat-saved', position: 'top-center', variant: 'success', title: 'Goal category saved' })
  }
  else {
    addCategory(payload)
    toast.notify({ id: 'cat-added', position: 'top-center', variant: 'success', title: 'Goal category added' })
  }
}

// ─── Archive / activate ───────────────────────────────────────────────────────
const archiveTarget = ref<GoalCategoryRecord | null>(null)
const isArchiveOpen = ref(false)
function onChangeStatus(cat: GoalCategoryRecord) {
  if (cat.status === 'inactive') {
    setStatus(cat.id, 'active')
    toast.notify({ id: 'cat-activated', position: 'top-center', variant: 'success', title: 'Goal category activated' })
    return
  }
  archiveTarget.value = cat
  isArchiveOpen.value = true
}
function confirmArchive() {
  if (!archiveTarget.value) return
  setStatus(archiveTarget.value.id, 'inactive')
  toast.notify({ id: 'cat-archived', position: 'top-center', variant: 'success', title: 'Goal category archived' })
  isArchiveOpen.value = false
  archiveTarget.value = null
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteTarget = ref<GoalCategoryRecord | null>(null)
const isDeleteOpen = ref(false)
function askDelete(cat: GoalCategoryRecord) {
  deleteTarget.value = cat
  isDeleteOpen.value = true
}
function confirmDelete() {
  if (!deleteTarget.value) return
  deleteCategory(deleteTarget.value.id)
  toast.notify({ id: 'cat-deleted', position: 'top-center', variant: 'success', title: 'Category deleted' })
  isDeleteOpen.value = false
  deleteTarget.value = null
}

// ─── Sub-categories view modal ────────────────────────────────────────────────
const subModalCat = ref<GoalCategoryRecord | null>(null)
const isSubModalOpen = ref(false)
function openSubModal(cat: GoalCategoryRecord) {
  subModalCat.value = cat
  isSubModalOpen.value = true
}

function viewDetails(cat: GoalCategoryRecord) {
  router.push({ path: `/goals/goal-categories/detail/${cat.id}` })
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const nameCol = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '320px' })
const modifiedCol = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '220px' })
// Header label + sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const nameLink = css({ color: 'text.link', cursor: 'pointer', fontSize: '14px', lineHeight: '20px', textDecoration: 'none', width: 'fit-content', _hover: { textDecoration: 'underline' } })
const descText = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const linkText = css({ color: 'text.link', cursor: 'pointer', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const mutedDash = css({ color: 'text.secondary' })
const statusFieldClass = css({ width: '160px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })

const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '200px', width: 'auto' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
// Bulleted list — real <ul>/<li> with disc markers (do NOT use display:flex on
// the ul, that suppresses the markers).
const subList = css({ margin: '0', paddingLeft: '5', listStyleType: 'disc' })
const subItem = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px', marginBottom: '1', _last: { marginBottom: '0' } })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="primary" left-icon="add" @click="openAdd">Add goal category</MpButton>
    </Teleport>

    <!-- Filter bar -->
    <MpFlex align="center" justify="space-between" gap="4">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="statusFieldClass">
            <MpSelect :placeholder="statusOptions.find(o => o.value === statusFilter)?.label" tabindex="-1" aria-hidden="true">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem v-for="opt in statusOptions" :key="opt.value" :is-active="opt.value === statusFilter" @click="statusFilter = opt.value">
              {{ opt.label }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpFlex :class="css({ width: '280px' })">
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search category name..." />
        </MpInputGroup>
      </MpFlex>
    </MpFlex>

    <!-- Empty state -->
    <MpFlex v-if="totalRows === 0" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1">
        <MpText :class="emptyTitle">{{ hasFilter ? 'No category result found' : 'Goal categories will appear here' }}</MpText>
        <MpText size="label" :class="captionText">
          {{ hasFilter ? 'Check the keyword and try to search again.' : 'Add categories to group goals in performance reviews.' }}
        </MpText>
      </MpFlex>
      <MpButton v-if="!hasFilter" variant="primary" left-icon="add" @click="openAdd">Add goal category</MpButton>
    </MpFlex>

    <!-- Table + pagination -->
    <MpFlex v-else direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="cat-sort-th" :class="nameCol">
                <span :class="thInner"><span>Goal category name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="cat-sort-th" :class="headCell">
                <span :class="thInner"><span>Sub-categories</span><PxColumnSortMenu col-key="subCategories" :sort-type="columnSortTypes.subCategories" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="cat-sort-th" :class="headCell">
                <span :class="thInner"><span>Linked goals</span><PxColumnSortMenu col-key="linkedGoals" :sort-type="columnSortTypes.linkedGoals" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="cat-sort-th" :class="headCell">
                <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="cat-sort-th" :class="modifiedCol">
                <span :class="thInner"><span>Last modified</span><PxColumnSortMenu col-key="modified" :sort-type="columnSortTypes.modified" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="cat in paged" :key="cat.id">
              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="0.5">
                  <span :class="nameLink" @click="viewDetails(cat)">{{ cat.name }}</span>
                  <span :class="descText">{{ cat.description || '-' }}</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <span v-if="cat.subCategories.length" :class="linkText" @click="openSubModal(cat)">
                  {{ cat.subCategories.length }} {{ cat.subCategories.length === 1 ? 'item' : 'items' }}
                </span>
                <span v-else :class="mutedDash">—</span>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <span v-if="linkedGoalCount(cat.name) > 0" :class="valueText">
                  {{ linkedGoalCount(cat.name) }} {{ linkedGoalCount(cat.name) === 1 ? 'goal' : 'goals' }}
                </span>
                <span v-else :class="mutedDash">—</span>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpBadge for="tableStatus" :type="cat.status === 'active' ? 'completed' : 'announcement'">
                  {{ cat.status === 'active' ? 'Active' : 'Inactive' }}
                </MpBadge>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex direction="column" gap="0">
                  <span :class="valueText">{{ formatModified(cat.updatedAt) }}</span>
                  <span v-if="cat.updatedBy" :class="descText">by {{ cat.updatedBy }}</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '180px' })">
                    <MpPopoverList>
                      <MpPopoverListItem @click="viewDetails(cat)">View details</MpPopoverListItem>
                      <MpPopoverListItem @click="openEdit(cat)">Edit</MpPopoverListItem>
                      <MpPopoverListItem @click="onChangeStatus(cat)">{{ cat.status === 'active' ? 'Archive' : 'Activate' }}</MpPopoverListItem>
                      <MpTooltip v-if="linkedGoalCount(cat.name) > 0" label="Cannot delete. This category has linked goals." placement="left">
                        <MpPopoverListItem is-disabled>
                          <span :class="mutedDash">Delete</span>
                        </MpPopoverListItem>
                      </MpTooltip>
                      <MpPopoverListItem v-else @click="askDelete(cat)">
                        <span :class="css({ color: 'text.danger' })">Delete</span>
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer -->
      <div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
        <MpFlex align="center" gap="3">
          <MpText size="label" :class="captionText">Rows per page</MpText>
          <MpPopover is-close-on-select use-portal placement="bottom-start">
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem v-for="opt in rowsPerPageOptions" :key="opt" :is-active="opt === rowsPerPage" @click="rowsPerPage = opt; currentPage = 1">
                  {{ opt }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
          <MpText size="label" :class="captionText">Showing {{ showingFrom }}–{{ showingTo }} of {{ totalRows }}</MpText>
        </MpFlex>
        <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
          <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
          <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
          <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
        </div>
      </div>
    </MpFlex>
  </MpFlex>

  <!-- Add / edit drawer -->
  <GoalCategoryFormDrawer
    v-model:is-open="isDrawerOpen"
    :category="editingCategory"
    :existing-names="existingNames"
    @save="onSave"
  />

  <!-- Delete confirmation -->
  <ClientOnly>
    <MpModal :is-open="isDeleteOpen" @close="isDeleteOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Delete this category?
          <MpModalCloseButton @click="isDeleteOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="valueText">Deleted goal category cannot be restored.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isDeleteOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Archive confirmation -->
  <ClientOnly>
    <MpModal :is-open="isArchiveOpen" @close="isArchiveOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Archive this category?
          <MpModalCloseButton @click="isArchiveOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="valueText">
            <template v-if="archiveTarget && linkedGoalCount(archiveTarget.name) > 0">
              Archiving it will prevent employees from selecting it for new goals, but existing goals will remain unaffected. You can restore this category anytime.
            </template>
            <template v-else>
              Once archived, this category will be hidden from the selection list. No new goals can be created using this category.
            </template>
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isArchiveOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmArchive">Archive</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Sub-categories view modal -->
  <ClientOnly>
    <MpModal :is-open="isSubModalOpen" @close="isSubModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          {{ subModalCat?.name }}
          <MpModalCloseButton @click="isSubModalOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpFlex direction="column" gap="3">
            <MpText v-if="subModalCat?.description" size="label" :class="captionText">{{ subModalCat.description }}</MpText>
            <div>
              <MpText size="label" :class="css({ fontWeight: '600', color: 'text.default', marginBottom: '1' })">Sub-categories:</MpText>
              <ul :class="subList">
                <li v-for="sub in subModalCat?.subCategories" :key="sub.id" :class="subItem">{{ sub.name }}</li>
              </ul>
            </div>
          </MpFlex>
        </MpModalBody>
        <MpModalFooter>
          <MpButton variant="ghost" @click="isSubModalOpen = false">Close</MpButton>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule (not a
   Panda css() @layer utility) so it beats PxColumnSortMenu's unlayered scoped
   `visibility: hidden` on specificity — see goal-cycles/index.vue. */
.cat-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
