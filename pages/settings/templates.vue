<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Settings → Templates (list)
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/Index.vue (route settings_template, /settings/template)
  Component name preserved: SettingsTemplateIndex. Route here: /settings/templates
  (the sidebar entry already pointed at the plural path).
  Prototype only: Vuex `settings/*` + API removed; data is the MOCK in
  utils/reviewTemplate.ts via useReviewTemplateStore. Search and pagination run
  client-side (production does them server-side). Role checks
  (isSuperAdmin / hasAccess('review-setting.*')) removed — renders as Super Admin.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon, MpBadge, MpToggle, MpDivider,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpTooltip, toast, css,
} from '@mekari/pixel3'
import { answerTypeName, pluralize, type ReviewTemplateListItem } from '~/utils/reviewTemplate'

defineOptions({ name: 'SettingsTemplateIndex' })
definePageMeta({ title: 'Templates', layout: 'default' })

const { list, getTemplate, updateStatusTemplate, deleteTemplate } = useReviewTemplateStore()

// ─── Search + pagination (client-side) ───────────────────────────────────────────
const keyword = ref('')
const rows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return q ? list.value.filter(t => t.name.toLowerCase().includes(q)) : list.value
})
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => rows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => rows.value.slice(showingFrom.value - 1, showingTo.value))
watch(keyword, () => { currentPage.value = 1 })
watch(totalPages, (n) => { if (currentPage.value > n) currentPage.value = n })

const isDefault = (t: ReviewTemplateListItem) => t.company_id === 0
const questionType = (t: ReviewTemplateListItem) => {
  const withWeight = t.calculate_type === 'weight' && (t.answer_type === 'percent' || t.answer_type === 'rating')
  return `${answerTypeName(t.answer_type)}${withWeight ? ' with weight' : ''}`
}
const showDeleteButton = (t: ReviewTemplateListItem) => !isDefault(t) && !t.total_cycle

// ─── Status toggle ───────────────────────────────────────────────────────────────
function updateStatus(t: ReviewTemplateListItem, val: boolean) {
  // MOCK of PUT /review-templates/update-status/{uuid}
  updateStatusTemplate(t.uuid, val)
  toast.notify({ id: 'template-status-updated', position: 'top-center', variant: 'success', title: 'Status updated' })
}

// ─── Builder modal (create / view & edit) ────────────────────────────────────────
const isModalForm = ref(false)
const isModalPresetFeedback = ref(false)
const selectedTemplateUuid = ref('')
const hasEditAccess = ref(false)
function onOpenForm(uuid: string, companyId?: number) {
  selectedTemplateUuid.value = uuid
  hasEditAccess.value = companyId !== 0
  isModalForm.value = true
}
function onUpdatedTemplate(isShowPresetFeedback = false) {
  isModalPresetFeedback.value = isShowPresetFeedback
}

// ─── Usage cycles ────────────────────────────────────────────────────────────────
const isModalCycleList = ref(false)
const modalCycleListTemplateUuid = ref('')
function openCycleListModal(uuid: string) {
  modalCycleListTemplateUuid.value = uuid
  isModalCycleList.value = true
}

// ─── Delete ──────────────────────────────────────────────────────────────────────
const isModalDelete = ref(false)
const selectedTemplate = ref<ReviewTemplateListItem | null>(null)
function askDelete(t: ReviewTemplateListItem) {
  selectedTemplate.value = t
  isModalDelete.value = true
}
function confirmDelete() {
  if (!selectedTemplate.value) return
  // MOCK of DELETE /review-templates/{uuid}
  deleteTemplate(selectedTemplate.value.uuid)
  toast.notify({ id: 'template-deleted', position: 'top-center', variant: 'success', title: 'Template deleted' })
  isModalDelete.value = false
}

// ─── Duplicate — production loads the detail into a hidden TemplateForm
// (is-duplicate) and posts its payload; same here. ───────────────────────────────
interface DuplicateFormRef {
  assignData: (data: ReturnType<typeof getTemplate>) => void
  preparePayload: () => Parameters<ReturnType<typeof useReviewTemplateStore>['createUpdateTemplate']>[0]
  post: (payload: ReturnType<DuplicateFormRef['preparePayload']>) => void
}
const formTemplate = ref<DuplicateFormRef | null>(null)
const isModalDuplicate = ref(false)
function openDuplicateModal(uuid: string) {
  selectedTemplateUuid.value = uuid
  isModalDuplicate.value = true
  try {
    // MOCK of GET /review-templates/detail/{uuid}
    formTemplate.value?.assignData(getTemplate(uuid))
  }
  catch (err) {
    toast.notify({ id: 'template-duplicate-error', position: 'top-center', variant: 'error', title: (err as { message?: string })?.message ?? 'Failed to fetch template' })
  }
}
function handleDuplicate() {
  const payload = formTemplate.value?.preparePayload()
  if (!payload) return
  payload.uuid = selectedTemplateUuid.value || ''
  formTemplate.value?.post(payload)
}
function onSuccessDuplicate() { isModalDuplicate.value = false }

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const nameHead = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '350px', maxWidth: '35%' })
const nameCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '350px', maxWidth: '35%', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const nameInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', flexWrap: 'wrap' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle', textAlign: 'right' })
const linkText = css({ display: 'inline', color: 'text.link', cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', padding: '0', _hover: { textDecoration: 'underline' } })
const toggleLabel = css({ whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const dangerText = css({ color: 'text.danger' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
const bodyText = css({ color: 'text.default' })
const hiddenForm = css({ display: 'none' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="primary" left-icon="add" data-qa="settings-template-btn-create" @click="onOpenForm('')">Add new template</MpButton>
  </Teleport>

  <div :class="page">
    <!-- Filter -->
    <div :class="filterBar">
      <MpInputGroup :class="css({ width: '280px' })">
        <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
        <MpInput v-model="keyword" placeholder="Search template name..." data-qa="settings-template-input-search" />
      </MpInputGroup>
    </div>

    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" :class="nameHead">Template name</MpTableCell>
              <MpTableCell as="th" :class="headCell">Question type</MpTableCell>
              <MpTableCell as="th" :class="headCell">Usage</MpTableCell>
              <MpTableCell as="th" :class="headCell">Status</MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="template in paged" :key="`role${template.id}`" :data-qa="`view-settings-template-template-${template.id}`">
              <MpTableCell as="td" :class="nameCell">
                <span :class="nameInner">
                  <span>{{ template.name }}</span>
                  <MpBadge v-if="isDefault(template)" for="tableStatus" type="information">Default</MpBadge>
                </span>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">{{ questionType(template) }}</MpTableCell>
              <MpTableCell as="td" :class="cell">
                <button v-if="template.total_cycle > 0" type="button" :class="linkText" data-qa="settings-template-btn-view-cycles" @click="openCycleListModal(template.uuid)">
                  {{ pluralize(template.total_cycle, 'cycle', 'cycles') }}
                </button>
                <template v-else>{{ pluralize(template.total_cycle, 'cycle', 'cycles') }}</template>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">
                <MpToggle v-if="isDefault(template)" :id="`template-status-${template.id}`" is-disabled is-checked>
                  <span :class="toggleLabel">Active</span>
                </MpToggle>
                <MpToggle
                  v-else
                  :id="`template-status-${template.id}`"
                  :is-checked="Boolean(template.is_active)"
                  data-qa="settings-template-toggle-status"
                  @update:is-checked="(v: boolean) => updateStatus(template, v)"
                >
                  <span :class="toggleLabel">{{ template.is_active === 1 ? 'Active' : 'Not active' }}</span>
                </MpToggle>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="`Actions for ${template.name}`" />
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '160px' })">
                    <MpPopoverList>
                      <MpPopoverListItem data-qa="settings-template-btn-view-edit" @click="onOpenForm(template.uuid, template.company_id)">View and edit</MpPopoverListItem>
                      <MpPopoverListItem data-qa="settings-template-btn-duplicate" @click="openDuplicateModal(template.uuid)">Duplicate</MpPopoverListItem>
                      <template v-if="showDeleteButton(template)">
                        <MpDivider />
                        <MpPopoverListItem data-qa="settings-template-btn-delete" @click="askDelete(template)"><span :class="dangerText">Delete</span></MpPopoverListItem>
                      </template>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
            <!-- Search matched nothing → keep the shell, single centered row -->
            <MpTableRow v-if="!rows.length">
              <MpTableCell as="td" :colspan="5" :class="css({ textAlign: 'center', paddingBlock: '8' })">No matching records found</MpTableCell>
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

  <ClientOnly>
    <!-- Delete confirmation -->
    <MpModal :is-open="isModalDelete" class="template-index-confirm-modal" @close="isModalDelete = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Delete template?
          <MpModalCloseButton @click="isModalDelete = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">By deleting the template, you cannot recover it.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="isModalDelete = false">Cancel</MpButton>
            <MpButton variant="danger" data-qa="settings-template-btn-confirm-delete" @click="confirmDelete">Delete</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Duplicate confirmation -->
    <MpModal :is-open="isModalDuplicate" class="template-index-confirm-modal" @close="isModalDuplicate = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Duplicate template
          <MpModalCloseButton @click="isModalDuplicate = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="bodyText">Do you want to duplicate this template?</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="isModalDuplicate = false">Cancel</MpButton>
            <MpButton variant="primary" data-qa="settings-template-btn-confirm-duplicate" @click="handleDuplicate">Yes, duplicate template</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Hidden form used to build the duplicate payload (same as production). -->
  <div :class="hiddenForm" aria-hidden="true">
    <TemplateForm ref="formTemplate" is-duplicate :uuid="selectedTemplateUuid" @updated="onSuccessDuplicate" />
  </div>

  <TemplateModalForm v-model:is-open="isModalForm" :uuid="selectedTemplateUuid" :has-edit-access="hasEditAccess" @updated="onUpdatedTemplate" />
  <TemplateModalPresetFeedback v-model:is-open="isModalPresetFeedback" />
  <TemplateModalCycleList v-model:is-open="isModalCycleList" :template-uuid="modalCycleListTemplateUuid" />
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.template-index-confirm-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
