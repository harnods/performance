<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Competency item (list)
  Migrated from talenta-review (commit 010875214aba):
    src/views/talent-management/competencies/setup/competency-item/Index.vue
  Component name preserved: CompetencyItemIndex. Route: production
  competency_item_index (…/competencies/setup/item) → /talents/competencies/items.
  Prototype only: Vuex `successionPlan/*` + API removed; data is the MOCK in
  utils/competencyItem.ts via useCompetencyItemStore. Search, sort and
  pagination run client-side (production does them server-side).
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon, MpCheckbox, MpDivider,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpButtonGroup, MpTooltip, toast, css,
} from '@mekari/pixel3'
import { verifyBulkDelete, type CompetencyItem, type VerifyBulkDelete } from '~/utils/competencyItem'

defineOptions({ name: 'CompetencyItemIndex' })
definePageMeta({ title: 'Competency item', layout: 'default' })

const router = useRouter()
const route = useRoute()
const { list: storeList, deleteItems } = useCompetencyItemStore()
const { plans: idpPlans } = useIdpStore()

// An IDP "applies" a competency item when any of its action plans relates to it
// (relatedTo === 'competency'). Each IDP counts once, however many action plans
// point at the item. Counts toward Applied and blocks deletion.
const list = computed<CompetencyItem[]>(() => storeList.value.map((i) => {
  const idps = idpPlans.value
    .filter(p => p.actionPlans.some(a => a.relatedTo === 'competency' && a.relatedCompetency === i.name))
    .map(p => p.name)
  return { ...i, idp_plans: idps, applied: i.applied + idps.length, deletion: i.deletion && !idps.length }
}))
// "Applied to" labels: the kinds of record using the item (groups, IDPs).
const appliedTo = (i: CompetencyItem) => [
  i.competency_management_groups.length && 'Competency group',
  i.idp_plans?.length && 'IDP',
].filter(Boolean) as string[]
const itemByUuid = (uuid: string) => list.value.find(i => i.uuid === uuid)

// Production shows the blank slate only when there are no items AND no keyword.
const keyword = ref('')
const isBlankSlate = computed(() => !list.value.length && !keyword.value)

const rows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return q ? list.value.filter(i => i.name.toLowerCase().includes(q)) : list.value
})

// ─── Column sort (production sortMixin: item_name / description / applied) ───
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number'> = { item_name: 'text', description: 'text', applied: 'number' }
function sortValue(i: CompetencyItem, key: string): string | number {
  if (key === 'item_name') return i.name
  if (key === 'description') return i.description ?? ''
  if (key === 'applied') return i.applied
  return ''
}
const sorted = computed(() => {
  if (!sortKey.value) return rows.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((a, b) => {
    const va = sortValue(a, sortKey.value)
    const vb = sortValue(b, sortKey.value)
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' }) * dir
  })
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
watch(keyword, () => { currentPage.value = 1 })
watch(totalPages, (n) => { if (currentPage.value > n) currentPage.value = n })

// ─── Selection (kept across pages, like production's dataSelected) ───────────
const selected = ref<Set<string>>(new Set())
const selectedCount = computed(() => selected.value.size)
const pageIds = computed(() => paged.value.map(i => i.uuid))
const selectedOnPage = computed(() => pageIds.value.filter(id => selected.value.has(id)).length)
const isPageAllSelected = computed(() => pageIds.value.length > 0 && selectedOnPage.value === pageIds.value.length)
function toggleRow(uuid: string) {
  const next = new Set(selected.value)
  next.has(uuid) ? next.delete(uuid) : next.add(uuid)
  selected.value = next
}
function toggleSelectAll() {
  const next = new Set(selected.value)
  if (isPageAllSelected.value) pageIds.value.forEach(id => next.delete(id))
  else pageIds.value.forEach(id => next.add(id))
  selected.value = next
}
function clearSelection() { selected.value = new Set() }
function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && selectedCount.value) clearSelection() }
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // Deep link from the IDP action plan picker's "Add competency item".
  if (route.query.create === '1') openForm('')
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
// Selected ids that no longer exist (deleted, scenario switch) drop out.
watch(list, (l) => {
  const ids = new Set(l.map(i => i.uuid))
  const next = new Set([...selected.value].filter(id => ids.has(id)))
  if (next.size !== selected.value.size) selected.value = next
})

// ─── Create / edit modal ─────────────────────────────────────────────────────
const isModalForm = ref(false)
const selectedData = ref<CompetencyItem | ''>('')
function openForm(item: CompetencyItem | '') {
  selectedData.value = item
  isModalForm.value = true
}

// ─── Delete flows (production: single, single-blocked, bulk-all, bulk-partial) ─
type UnableType = '' | 'single' | 'bulk-all' | 'bulk-partial'
const isModalDelete = ref(false)
const isModalUnableDelete = ref(false)
const unableDeleteType = ref<UnableType>('')
const deleteUuids = ref<string[]>([])
const singleItem = ref<CompetencyItem | null>(null)
const bulkVerify = ref<VerifyBulkDelete | null>(null)

const unableDeleteDetail = computed(() => {
  const type = unableDeleteType.value
  const detail = {
    title: 'Unable to delete item',
    desc: 'You cannot delete this competency item because it is included in ',
    cancelOnly: true,
  }
  if (type === 'single') detail.title = 'Unable to delete'
  if (type === 'bulk-partial') {
    detail.desc = 'You cannot delete the following competency items because it is applied in '
    detail.cancelOnly = false
  }
  if (type === 'bulk-all') detail.desc = 'You cannot delete this item because it is applied in '
  return detail
})
function joinAnd(parts: string[]) {
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}` : parts[0] ?? ''
}
function deleteTextSingle(isGroup: number, isIdp: number) {
  const parts = [isGroup && 'group', isIdp && 'IDP'].filter(Boolean) as string[]
  if (parts.length > 1) return `these ${joinAnd(parts)}`
  return parts[0] === 'group' ? 'competency group, please check the following' : parts[0]
}
function deleteTextBulk(isGroup: boolean, isIdp: boolean) {
  const parts = [isGroup && 'group', isIdp && 'IDP'].filter(Boolean) as string[]
  if (parts.length === 1) return parts[0] === 'group' ? 'competency group' : 'IDP'
  return joinAnd(parts)
}

function deleteCompetency(item: CompetencyItem) {
  singleItem.value = item
  deleteUuids.value = [item.uuid]
  if (item.deletion && !item.idp_plans?.length) isModalDelete.value = true
  else {
    unableDeleteType.value = 'single'
    isModalUnableDelete.value = true
  }
}
function onBulk(type: 'edit' | 'delete') {
  const uuids = [...selected.value]
  if (type === 'edit') {
    router.push({ path: '/talents/competencies/items/bulk-edit', query: { uuids: uuids.toString() } })
    return
  }
  // MOCK of POST /competencies/available-delete-item
  const data = verifyBulkDelete(list.value.filter(i => uuids.includes(i.uuid)))
  bulkVerify.value = data
  deleteUuids.value = data.eligible.map(e => e.uuid)
  if (!data.not_eligible.length) isModalDelete.value = true
  else {
    unableDeleteType.value = data.not_eligible.length === uuids.length ? 'bulk-all' : 'bulk-partial'
    isModalUnableDelete.value = true
  }
}
function confirmDelete() {
  // MOCK of POST /competencies/delete
  deleteItems(deleteUuids.value)
  // Toast copy is hard-coded in the FE store (succession-plan.js), same for bulk.
  toast.notify({ id: 'competency-item-deleted', position: 'top-center', variant: 'success', title: 'Competency item successfully deleted' })
  closeDeleteModals()
  clearSelection()
}
function closeDeleteModals() {
  isModalDelete.value = false
  isModalUnableDelete.value = false
  unableDeleteType.value = ''
  deleteUuids.value = []
  singleItem.value = null
  bulkVerify.value = null
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const descCol = css({ width: '240px', maxWidth: '240px' })
// A real min-width: table cells ignore `min-width` on the cell itself.
const appliedInner = css({ minWidth: '190px' })
const appliedHead = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '220px', minWidth: '180px', paddingRight: '4', whiteSpace: 'nowrap' })
const appliedCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '220px', minWidth: '180px', paddingRight: '4', whiteSpace: 'nowrap' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const nameCol = css({ width: '30%' })
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
// Bulk bar replaces the header row (docs/patterns/checkbox.md §3).
const bulkCell = css({ paddingTop: '1', paddingBottom: '1', verticalAlign: 'middle' })
const bulkBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '40px' })
const captionText = css({ color: 'text.secondary' })
const dangerText = css({ color: 'text.danger' })
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
const unableWidth = css({ width: '560px', maxWidth: '90vw' })
const singleSections = computed(() => {
  const it = singleItem.value
  if (!it) return []
  return [
    { label: 'Group', qa: 'group', names: it.competency_management_groups },
    { label: 'IDP', qa: 'idp', names: it.idp_plans ?? [] },
  ].filter(sec => sec.names.length)
})
const bulletList = css({ listStyleType: 'disc', paddingLeft: '5', display: 'flex', flexDirection: 'column', gap: '1' })
const bodyText = css({ color: 'text.default' })
const listScroll = css({ display: 'flex', flexDirection: 'column', gap: '2', maxHeight: '400px', overflowY: 'auto' })
const listGroupLabel = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', fontWeight: '600' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpFlex gap="3" align="center">
      <MpButton variant="secondary" left-icon="upload" @click="router.push('/talents/competencies/items/upload')">Upload .xlsx</MpButton>
      <MpButton variant="primary" left-icon="add" @click="openForm('')">Create item</MpButton>
    </MpFlex>
  </Teleport>

  <!-- No items and no keyword → blank slate replaces filter + table -->
  <MpFlex v-if="isBlankSlate" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
    <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
    <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
      <MpText :class="emptyTitle">No data yet</MpText>
      <MpText size="label" :class="captionText">Your data will appear here.</MpText>
    </MpFlex>
    <MpButton variant="secondary" left-icon="add" @click="openForm('')">Create item</MpButton>
  </MpFlex>

  <div v-else :class="page">
    <!-- Filter -->
    <div :class="filterBar">
      <MpInputGroup :class="css({ width: '260px' })">
        <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
        <MpInput v-model="keyword" placeholder="Search item name..." data-qa="talent-competency-item-index-input-search" />
      </MpInputGroup>
    </div>

    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false" :class="fixedTable">
          <!-- Widths locked here so the body doesn't shift when the header
               swaps to the bulk bar (docs/patterns/checkbox.md §3). -->
          <colgroup>
            <col :class="nameCol">
            <col>
            <col :class="css({ width: '120px' })">
            <col :class="css({ width: '72px' })">
          </colgroup>
          <MpTableHead>
            <!-- 1+ selected → the header row becomes the bulk bar -->
            <MpTableRow v-if="selectedCount > 0">
              <MpTableCell as="th" :colspan="4" :class="bulkCell">
                <div :class="bulkBar">
                  <MpFlex align="center" gap="4">
                    <MpFlex align="center" gap="2">
                      <MpCheckbox
                        :is-checked="isPageAllSelected"
                        :is-indeterminate="!isPageAllSelected"
                        aria-label="Select all"
                        data-qa="talent-competency-item-index-checkbox-select-all"
                        @update:is-checked="toggleSelectAll"
                      />
                      <MpText size="label" weight="semiBold">{{ selectedCount }} item{{ selectedCount === 1 ? '' : 's' }} selected</MpText>
                    </MpFlex>
                    <MpPopover is-close-on-select use-portal placement="bottom-start">
                      <MpPopoverTrigger>
                        <MpButton variant="primary" right-icon="caret-down" data-qa="talent-competency-item-index-dropdown-bulk-actions">Actions</MpButton>
                      </MpPopoverTrigger>
                      <MpPopoverContent>
                        <MpPopoverList>
                          <MpPopoverListItem @click="onBulk('edit')">Edit bulk item</MpPopoverListItem>
                          <MpDivider />
                          <MpPopoverListItem @click="onBulk('delete')"><span :class="dangerText">Delete bulk item</span></MpPopoverListItem>
                        </MpPopoverList>
                      </MpPopoverContent>
                    </MpPopover>
                  </MpFlex>
                  <MpText size="label" :class="captionText">Press esc to deselect</MpText>
                </div>
              </MpTableCell>
            </MpTableRow>
            <MpTableRow v-else>
              <MpTableCell as="th" class="sort-th" :class="[headCell, nameCol]">
                <MpFlex align="center" gap="2">
                  <MpCheckbox
                    :is-checked="false"
                    aria-label="Select all"
                    :is-disabled="!pageIds.length"
                    data-qa="talent-competency-item-index-checkbox-select-all"
                    @update:is-checked="toggleSelectAll"
                  />
                  <span :class="thInner"><span>Item name</span><PxColumnSortMenu col-key="item_name" :sort-type="columnSortTypes.item_name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="[headCell, descCol]">
                <span :class="thInner"><span>Description</span><PxColumnSortMenu col-key="description" :sort-type="columnSortTypes.description" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="appliedHead">
                <span :class="[thInner, appliedInner]"><span>Applied to</span><PxColumnSortMenu col-key="applied" :sort-type="columnSortTypes.applied" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="item in paged" :key="`row-competency-${item.uuid}`" :data-qa="`view-talent-competency-item-index-item-${item.uuid}`">
              <MpTableCell as="td" :class="[cell, nameCol]">
                <MpFlex align="center" gap="2">
                  <MpCheckbox :is-checked="selected.has(item.uuid)" :aria-label="`Select ${item.name}`" @update:is-checked="toggleRow(item.uuid)" />
                  <span>{{ item.name }}</span>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="[cell, descCol]">{{ item.description || '-' }}</MpTableCell>
              <MpTableCell as="td" :class="appliedCell">
                <div :class="appliedInner">
                  <ul v-if="appliedTo(item).length > 1" :class="bulletList">
                    <li v-for="label in appliedTo(item)" :key="label">{{ label }}</li>
                  </ul>
                  <template v-else>{{ appliedTo(item)[0] ?? '-' }}</template>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="`Actions for ${item.name}`" />
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem @click="openForm(item)">Edit</MpPopoverListItem>
                      <MpDivider />
                      <MpPopoverListItem :id="`btn-delete-competency-${item.uuid}`" @click="deleteCompetency(item)"><span :class="dangerText">Delete</span></MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
            <!-- Search matched nothing → keep the shell, single centered row -->
            <MpTableRow v-if="!rows.length">
              <MpTableCell as="td" :colspan="4" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                There's no data found.
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
    <MpModal :is-open="isModalDelete" class="competency-item-confirm-modal" @close="closeDeleteModals">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Delete competency item?
          <MpModalCloseButton @click="closeDeleteModals" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">Once the competency item is deleted you will not be able to undo this action.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="closeDeleteModals">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Unable to delete (single / bulk-all / bulk-partial) -->
    <MpModal :is-open="isModalUnableDelete" class="competency-item-confirm-modal" @close="closeDeleteModals">
      <MpModalOverlay />
      <MpModalContent :class="unableWidth">
        <MpModalHeader>
          {{ unableDeleteDetail.title }}
          <MpModalCloseButton @click="closeDeleteModals" />
        </MpModalHeader>
        <MpModalBody>
          <div :class="listScroll">
            <template v-if="unableDeleteType === 'single' && singleItem">
              <MpText :class="bodyText">
                {{ unableDeleteDetail.desc }}{{ deleteTextSingle(singleItem.competency_management_groups.length, singleItem.idp_plans?.length ?? 0) }}:
              </MpText>
              <div v-for="sec in singleSections" :key="sec.label">
                <MpText v-if="singleSections.length > 1" :class="listGroupLabel">{{ sec.label }}:</MpText>
                <ul :class="bulletList">
                  <li v-for="(name, idx) in sec.names" :key="idx" :data-qa="`view-talent-competency-item-index-${sec.qa}-${idx}`"><MpText :class="bodyText">{{ name }}</MpText></li>
                </ul>
              </div>
            </template>
            <template v-else-if="bulkVerify">
              <MpText :class="bodyText">{{ unableDeleteDetail.desc }}{{ deleteTextBulk(bulkVerify.has_group, bulkVerify.has_idp) }}:</MpText>
              <ul :class="bulletList">
                <template v-for="item in bulkVerify.not_eligible" :key="item.uuid">
                  <li v-for="group in item.competency_management_groups" :key="`g-${group}`"><MpText :class="bodyText">{{ item.name }} - {{ group }}</MpText></li>
                  <li v-for="idp in item.idps" :key="`i-${idp}`"><MpText :class="bodyText">{{ item.name }} - IDP of {{ idp }}</MpText></li>
                </template>
              </ul>
            </template>
          </div>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton v-if="unableDeleteDetail.cancelOnly" variant="primary" @click="closeDeleteModals">OK, understand</MpButton>
            <template v-else>
              <MpButton variant="ghost" @click="closeDeleteModals">Cancel</MpButton>
              <MpButton variant="danger" @click="confirmDelete">Delete {{ deleteUuids.length }} eligible item{{ deleteUuids.length === 1 ? '' : 's' }}</MpButton>
            </template>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <CompetencyItemModalForm
    v-model:is-open="isModalForm"
    :uuid="selectedData ? selectedData.uuid : ''"
    :data="selectedData"
    @delete="selectedData && deleteCompetency(itemByUuid(selectedData.uuid) ?? selectedData)"
  />

  <!-- Dev-only: Filled / Empty scenarios -->
  <CompetencyItemScenarioControl />
</template>

<style scoped>
/* Reveal the column sort icon on header hover (same as idps/index.vue). */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
/* docs/patterns/modal.md — top-center at 80px. */
:global(.competency-item-confirm-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
