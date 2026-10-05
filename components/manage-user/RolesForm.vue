<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Role form (add / edit)
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/manage-user/roles/Form.vue
  Component name preserved: RolesForm. One component for both routes, same as
  production (settings_roles_add / settings_roles_edit) — edit mode is
  detected from the route's :id param.
  Prototype only: Vuex `settings/{fetchPermissions,fetchRole,createRole,
  updateRole,deleteRole}` + GET /helpers/user-filter removed (see
  useManageUserStore); vuelidate → local validation. Permission checks
  (hasAccess('manage-users.delete')) removed.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpText, MpButton, MpInput, MpTextarea, MpInputTag, MpCheckbox,
  MpFormControl, MpFormLabel, MpFormErrorMessage,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  toast, css,
} from '@mekari/pixel3'
import {
  CYCLE_PURPOSES, EVALUATION_EMPLOYMENT_STATUSES, SCOPED_PERMISSION_IDS, SCOPED_PERMISSION_DESCRIPTIONS,
  REPORT_PERMISSION_ID, DASHBOARD_PERMISSION_ID, fullScope,
  type CyclePurpose, type PermissionScope,
} from '~/utils/manageUser'

defineOptions({ name: 'RolesForm' })

// `scope` is set only on purpose-scoped groups (Review cycle) — PROPOSED, PRD S1.
interface PermissionNode { id: number, checked: boolean, name: string, description: string, scope?: PermissionScope }
interface PermissionParent extends PermissionNode { children: PermissionNode[], scoped: boolean }

const route = useRoute()
const router = useRouter()
const { permissions: permissionsSettings, branches, roleById, createRole, updateRole, deleteRole, rolesFormVersion } = useManageUserStore()
// Dev scenario: v1 = Access + Permission list, v2 = one checkbox column per action.
const isV2 = computed(() => rolesFormVersion.value === 'v2')

const DESCRIPTION_MAX = 255
const ROLES_PATH = '/settings/manage-users/roles'

const roleId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => roleId.value != null)

const form = ref({
  role_id: '' as number | '',
  name: '',
  description: '',
  permissions: [] as PermissionParent[],
  branch_id: [] as number[],
})
const touched = ref({ name: false, description: false })
// PROPOSED (PRD S2): one scope for the whole Report group, by default Review cycle's.
const reportScope = ref<PermissionScope>({ purposes: [], employment_statuses: [], same_as_review_cycle: true })
const isModalDelete = ref(false)

// ─── Load (fetchPermissions → fetchRole) ────────────────────────────────────
const emptyScope = (): PermissionScope => ({ purposes: [], employment_statuses: [] })
function fetchPermissions() {
  form.value.permissions = permissionsSettings.map((item) => {
    const scoped = SCOPED_PERMISSION_IDS.includes(item.id)
    return {
      id: item.id,
      checked: false,
      name: item.name,
      description: item.description,
      scoped,
      ...(scoped ? { scope: emptyScope() } : {}),
      children: item.child_permissions.map(child => ({
        id: child.id, checked: false, name: child.name, description: child.description,
        ...(scoped ? { scope: emptyScope() } : {}),
      })),
    }
  })
}
// A scoped grant saved before scoping existed means "every purpose, every status" (PRD §5.4).
function applyScope(node: PermissionNode, scope?: PermissionScope) {
  if (node.scope) node.scope = scope ? { purposes: [...scope.purposes], employment_statuses: [...scope.employment_statuses] } : fullScope()
}
function fetchRole(id: number) {
  const roleData = roleById(id)
  if (!roleData) {
    toast.notify({ id: 'role-not-found', position: 'top-center', variant: 'error', title: 'Role not found' })
    router.push(ROLES_PATH)
    return
  }
  form.value.name = roleData.name
  form.value.description = roleData.description
  form.value.role_id = roleData.id
  form.value.branch_id = roleData.role_branches.map(item => item.branch_id)
  const reportGrant = roleData.permission_roles.find(r => r.scope && (r.permission_id === REPORT_PERMISSION_ID || r.permissions.parent_permission_id === REPORT_PERMISSION_ID))
  if (reportGrant?.scope) reportScope.value = { ...reportGrant.scope, purposes: [...reportGrant.scope.purposes], employment_statuses: [...reportGrant.scope.employment_statuses], same_as_review_cycle: reportGrant.scope.same_as_review_cycle ?? true }
  roleData.permission_roles.forEach((currentRole) => {
    const parentPermission = form.value.permissions.find(item => item.id === currentRole.permission_id)
    if (parentPermission) { parentPermission.checked = true; applyScope(parentPermission, currentRole.scope); return }
    const parent = form.value.permissions.find(item => item.id === currentRole.permissions.parent_permission_id)
    const childPermission = parent?.children.find(child => child.id === currentRole.permission_id)
    if (childPermission) { childPermission.checked = true; applyScope(childPermission, currentRole.scope) }
  })
}
fetchPermissions()
if (isEdit.value && roleId.value != null) fetchRole(roleId.value)

const enableToDelete = computed(() => isEdit.value)

// ─── Validation (production: name required, description maxLength 255) ──────
const nameError = computed(() => (touched.value.name && !form.value.name.trim() ? 'This field is required' : ''))
const descriptionError = computed(() => (touched.value.description && form.value.description.length > DESCRIPTION_MAX ? `This field can only contain ${DESCRIPTION_MAX} characters` : ''))
const isInvalid = computed(() => !form.value.name.trim() || form.value.description.length > DESCRIPTION_MAX || !!reportScopeError.value)

// ─── Branch multi-select (MpInputTag, string suggestions — ReviewMethodDrawer pattern) ─
const branchSuggestions = branches.map(b => b.name)
const branchTags = computed(() => form.value.branch_id
  .map(id => branches.find(b => b.id === id))
  .filter((b): b is NonNullable<typeof b> => Boolean(b))
  .map(b => ({ id: String(b.id), text: b.name, value: b.id })))
function onBranchChange(data: { text?: string }[]) {
  form.value.branch_id = data.map(d => branches.find(b => b.name === d.text)?.id).filter((id): id is number => id != null)
}
const branchPlaceholder = computed(() => (form.value.branch_id.length === branches.length ? 'All' : 'Select'))

// ─── Permission checkboxes (production rules) ───────────────────────────────
// Production hides the View row for 'Manage Goal' and the 'Edit Result' child.
// Report (PRD S2) has no View either — its checkboxes are the two report types.
const showView = (item: PermissionParent) => item.name !== 'Manage Goal' && item.id !== REPORT_PERMISSION_ID
const visibleChildren = (item: PermissionParent) => item.children.filter(child => child.name !== 'Edit Result')

/** The Permission column's rows: View (the parent itself) + its visible children. */
interface PermissionRow { node: PermissionNode, label: string, description: string, isView: boolean }
function permissionRows(item: PermissionParent): PermissionRow[] {
  return [
    ...(showView(item) ? [{ node: item as PermissionNode, label: 'View', description: item.description, isView: true }] : []),
    ...visibleChildren(item).map(child => ({ node: child, label: child.name, description: child.description, isView: false })),
  ]
}

function setNodeChecked(node: PermissionNode, value: boolean) {
  node.checked = value
  if (node.scope) node.scope = value ? fullScope() : emptyScope()
}

// Unscoped groups — production rules, unchanged.
const isParentChecked = (item: PermissionParent) => (item.scoped ? isScopedAll(item) : item.children.every(child => child.checked) && item.checked)
function isParentIndeterminate(item: PermissionParent) {
  if (item.scoped) return isScopedSome(item) && !isScopedAll(item)
  const checkedChildren = item.children.filter(child => child.checked).length
  return checkedChildren > 0 && checkedChildren < item.children.length
}
function onCheckedView(index: number, value: boolean) {
  const parent = form.value.permissions[index]
  parent.checked = value
  if (!value) parent.children.forEach((element) => { element.checked = false })
}
function onCheckedChildren(child: PermissionNode, value: boolean, indexParent: number) {
  child.checked = value
  if (value) form.value.permissions[indexParent].checked = value
}
function onCheckedRow(row: PermissionRow, value: boolean, index: number) {
  if (row.isView) onCheckedView(index, value)
  else onCheckedChildren(row.node, value, index)
}
function checkParent(index: number, value: boolean) {
  const parent = form.value.permissions[index]
  // Read once: re-reading isScopedAll per node flips after the first one changes.
  if (parent.scoped) { const next = !isScopedAll(parent); scopedNodes(parent).forEach(n => setNodeChecked(n, next)); return }
  parent.checked = value
  if (parent.children.length) {
    const allChecked = parent.children.every(child => child.checked)
    parent.children.forEach((item) => { item.checked = !allChecked })
  }
}

// ─── Purpose-scoped group (Review cycle) — PROPOSED, PRD S1 ─────────────────
// Rendered as one sub-row per cycle purpose, each listing the group's
// permissions. Stored per permission as scope.purposes (+ Evaluation statuses).
const ALL_PURPOSES = CYCLE_PURPOSES.map(p => p.value)
const ALL_STATUSES = EVALUATION_EMPLOYMENT_STATUSES.map(s => s.value)
const scopedNodes = (item: PermissionParent) => [item as PermissionNode, ...item.children]
const hasPurpose = (node: PermissionNode, p: CyclePurpose) => !!node.scope?.purposes.includes(p)
const isFull = (node: PermissionNode) => !!node.scope
  && node.scope.purposes.length === ALL_PURPOSES.length && node.scope.employment_statuses.length === ALL_STATUSES.length
const isScopedAll = (item: PermissionParent) => scopedNodes(item).every(isFull)
const isScopedSome = (item: PermissionParent) => scopedNodes(item).some(n => n.checked)

const isPurposeAll = (item: PermissionParent, p: CyclePurpose) => permissionRows(item).every(r => hasPurpose(r.node, p))
const isPurposeSome = (item: PermissionParent, p: CyclePurpose) => permissionRows(item).some(r => hasPurpose(r.node, p))

/** Description with the purpose spelled out, e.g. "View performance review cycles and their progress." */
const scopedDescription = (row: PermissionRow, p: { value: CyclePurpose, label: string }) =>
  SCOPED_PERMISSION_DESCRIPTIONS[row.node.id]?.(p.label.toLowerCase()) ?? row.description

function setPurpose(node: PermissionNode, p: CyclePurpose, value: boolean) {
  const scope = node.scope
  if (!scope) return
  scope.purposes = ALL_PURPOSES.filter(x => (x === p ? value : scope.purposes.includes(x)))
  // Evaluation starts on "All employment status"; removing it clears the statuses.
  if (p === 'evaluation') scope.employment_statuses = value ? (scope.employment_statuses.length ? scope.employment_statuses : [...ALL_STATUSES]) : []
  node.checked = scope.purposes.length > 0
}
// Purpose checkbox (Access column) — grants/removes every permission for that purpose.
function togglePurpose(item: PermissionParent, p: CyclePurpose) {
  const value = !isPurposeAll(item, p)
  const statuses = p === 'evaluation' ? evaluationStatuses(item) : []
  permissionRows(item).forEach(r => setPurpose(r.node, p, value))
  if (p === 'evaluation' && value && statuses.length) applyEvaluationStatuses(item, statuses)
}
// Permission checkbox inside a purpose row. Production's "child implies View"
// rule applies per purpose.
function togglePurposePermission(item: PermissionParent, row: PermissionRow, p: CyclePurpose, value: boolean) {
  const statuses = evaluationStatuses(item)
  setPurpose(row.node, p, value)
  if (row.isView && !value) item.children.forEach(child => setPurpose(child, p, false))
  if (!row.isView && value) setPurpose(item, p, true)
  if (p === 'evaluation' && value && statuses.length) applyEvaluationStatuses(item, statuses)
}

// ─── Review cycle's overall scope — what Report (by default) and Dashboard follow ─
const reviewCycleItem = computed(() => form.value.permissions.find(p => p.scoped))
const reviewCycleScope = computed<PermissionScope>(() => {
  const item = reviewCycleItem.value
  if (!item) return emptyScope()
  const purposes = ALL_PURPOSES.filter(p => isPurposeSome(item, p))
  return { purposes, employment_statuses: purposes.includes('evaluation') ? [...evaluationStatuses(item)] : [] }
})
const hasReviewCyclePurpose = computed(() => reviewCycleScope.value.purposes.length > 0)
/** "Performance, Evaluation (Contract, Internship)" — statuses only when not all of them. */
function scopeSummary(scope: PermissionScope) {
  return CYCLE_PURPOSES.filter(p => scope.purposes.includes(p.value)).map((p) => {
    if (p.value !== 'evaluation' || scope.employment_statuses.length === ALL_STATUSES.length) return p.label
    const labels = EVALUATION_EMPLOYMENT_STATUSES.filter(s => scope.employment_statuses.includes(s.value)).map(s => s.label)
    return `${p.label} (${labels.join(', ')})`
  }).join(', ')
}
const reviewCycleScopeText = computed(() => (hasReviewCyclePurpose.value ? scopeSummary(reviewCycleScope.value) : 'No Review cycle purpose selected yet'))

// ─── Report scope (PRD S2) ──────────────────────────────────────────────────
const isReport = (item: PermissionParent) => item.id === REPORT_PERMISSION_ID
const isReportCustom = computed(() => !reportScope.value.same_as_review_cycle)
function onReportSameScope(value: boolean) {
  // Customizing starts from what it was tracking.
  if (!value) reportScope.value = { ...reviewCycleScope.value, same_as_review_cycle: false }
  else reportScope.value = { purposes: [], employment_statuses: [], same_as_review_cycle: true }
}
const hasReportPurpose = (p: CyclePurpose) => reportScope.value.purposes.includes(p)
function toggleReportPurpose(p: CyclePurpose, value: boolean) {
  const scope = reportScope.value
  scope.purposes = ALL_PURPOSES.filter(x => (x === p ? value : scope.purposes.includes(x)))
  if (p === 'evaluation') scope.employment_statuses = value ? [...ALL_STATUSES] : []
}
const hasReportStatus = (status: string) => reportScope.value.employment_statuses.includes(status)
function toggleReportStatus(status: string, value: boolean) {
  const next = ALL_STATUSES.filter(s => (s === status ? value : hasReportStatus(s)))
  if (next.length) reportScope.value.employment_statuses = next
  else toggleReportPurpose('evaluation', false)
}
/** Report scope rows under the group: "Use the same scope…" + (custom) one per purpose. */
const reportScopeRowCount = computed(() => 1 + (isReportCustom.value ? CYCLE_PURPOSES.length : 0))
const isReportGranted = (item: PermissionParent) => item.checked || item.children.some(c => c.checked)
const reportScopeError = computed(() => {
  const item = form.value.permissions.find(isReport)
  if (!item || !isReportGranted(item) || !isReportCustom.value) return ''
  return reportScope.value.purposes.length ? '' : 'Select at least one purpose for Report'
})
const effectiveReportScope = (): PermissionScope => (isReportCustom.value
  ? { ...reportScope.value, purposes: [...reportScope.value.purposes], employment_statuses: [...reportScope.value.employment_statuses] }
  : { ...reviewCycleScope.value, same_as_review_cycle: true })

// ─── Dashboard (PRD S3): always Review cycle's scope; off until it has a purpose ─
const isDashboard = (item: PermissionParent) => item.id === DASHBOARD_PERMISSION_ID
const isGroupDisabled = (item: PermissionParent) => isDashboard(item) && !hasReviewCyclePurpose.value
const dashboardNote = computed(() => (hasReviewCyclePurpose.value
  ? `Scoped to Review cycle: ${reviewCycleScopeText.value}.`
  : 'Select a Review cycle purpose first. Dashboard always follows Review cycle\'s scope.'))
watch(hasReviewCyclePurpose, (has) => {
  const dashboard = form.value.permissions.find(isDashboard)
  if (!has && dashboard) dashboard.checked = false
})

// One set of Employment Status checkboxes for the whole Evaluation row.
function evaluationStatuses(item: PermissionParent): string[] {
  return scopedNodes(item).find(n => hasPurpose(n, 'evaluation'))?.scope?.employment_statuses ?? []
}
function applyEvaluationStatuses(item: PermissionParent, statuses: string[]) {
  scopedNodes(item).forEach((n) => { if (hasPurpose(n, 'evaluation') && n.scope) n.scope.employment_statuses = [...statuses] })
}
const hasStatus = (item: PermissionParent, status: string) => evaluationStatuses(item).includes(status)
// Evaluation access needs at least one status: unticking the last one removes Evaluation.
function toggleStatus(item: PermissionParent, status: string, value: boolean) {
  const next = ALL_STATUSES.filter(s => (s === status ? value : hasStatus(item, s)))
  if (next.length) applyEvaluationStatuses(item, next)
  else permissionRows(item).forEach(r => setPurpose(r.node, 'evaluation', false))
}

// ─── V2: one checkbox column per action ─────────────────────────────────────
type ActionColumn = 'view' | 'create' | 'edit' | 'delete'
// No Report column: Report is its own section now (PRD S2), so nothing maps to it.
const ACTION_COLUMNS: { key: ActionColumn, label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
]
const CHILD_COLUMN: Record<string, ActionColumn> = { Add: 'create', Edit: 'edit', Delete: 'delete' }
const rowColumn = (row: PermissionRow) => (row.isView ? 'view' : CHILD_COLUMN[row.node.name])
const columnRow = (item: PermissionParent, col: ActionColumn) => permissionRows(item).find(r => rowColumn(r) === col)
/** Children that aren't an action (Manage Goal's company / organization goals) get their own sub-rows. */
const unmappedRows = (item: PermissionParent) => permissionRows(item).filter(r => !rowColumn(r))
const hasSubRows = (item: PermissionParent) => item.scoped || isReport(item) || (isV2.value && unmappedRows(item).length > 0)
// Unscoped group checkbox in V2 reflects every checkbox in its row.
const isRowAll = (item: PermissionParent) => permissionRows(item).every(r => r.node.checked)
const isRowSome = (item: PermissionParent) => permissionRows(item).some(r => r.node.checked)
function toggleRow(item: PermissionParent) {
  const value = !isRowAll(item)
  item.checked = value
  item.children.forEach((child) => { child.checked = value })
}

// Group checkbox — scoped groups behave the same in both versions.
const groupChecked = (item: PermissionParent) => (isV2.value && !item.scoped ? isRowAll(item) : isParentChecked(item))
const groupIndeterminate = (item: PermissionParent) => (isV2.value && !item.scoped ? isRowSome(item) && !isRowAll(item) : isParentIndeterminate(item))
function onGroupChange(item: PermissionParent, index: number, value: boolean) {
  if (isV2.value && !item.scoped) toggleRow(item)
  else checkParent(index, value)
}

function generatePayload() {
  const permissionData: Record<number, boolean> = {}
  const permissionScopes: Record<number, PermissionScope> = {}
  form.value.permissions.forEach((parent) => {
    if (parent.checked) {
      permissionData[parent.id] = true
      if (parent.scope) permissionScopes[parent.id] = { ...parent.scope }
      if (isReport(parent)) permissionScopes[parent.id] = effectiveReportScope()
      if (isDashboard(parent)) permissionScopes[parent.id] = { ...reviewCycleScope.value }
      parent.children.forEach((child) => {
        permissionData[child.id] = child.checked || false
        if (child.checked && child.scope) permissionScopes[child.id] = { ...child.scope }
        if (child.checked && isReport(parent)) permissionScopes[child.id] = effectiveReportScope()
      })
    }
  })
  return {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    permissions: permissionData,
    permission_scopes: permissionScopes,
    role_id: form.value.role_id ? form.value.role_id : undefined,
    branches: form.value.branch_id,
  }
}

// ─── Submit / delete ────────────────────────────────────────────────────────
// Production disables Submit while $v.$invalid; here the primary CTA stays
// enabled and validates on click (docs/patterns/buttons.md).
function handleFormSubmit() {
  touched.value = { name: true, description: true }
  if (isInvalid.value) {
    toast.notify({ id: 'role-form-error', position: 'top-center', variant: 'error', title: reportScopeError.value || "Please check the form's error" })
    return
  }
  const payload = generatePayload()
  if (isEdit.value) {
    // MOCK of PUT /roles/:id
    updateRole(payload)
    toast.notify({ id: 'role-updated', position: 'top-center', variant: 'success', title: 'Role successfully updated' })
  }
  else {
    // MOCK of POST /roles
    createRole(payload)
    toast.notify({ id: 'role-created', position: 'top-center', variant: 'success', title: 'Role successfully created' })
  }
  router.push(ROLES_PATH)
}
function confirmDelete() {
  // MOCK of DELETE /roles/:id
  if (form.value.role_id) deleteRole(form.value.role_id)
  isModalDelete.value = false
  toast.notify({ id: 'role-deleted', position: 'top-center', variant: 'success', title: 'Role successfully deleted' })
  router.push(ROLES_PATH)
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({ gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' }, maxWidth: { lg: '656px' }, display: 'flex', flexDirection: 'column' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginBottom: '3' })
const sectionHeaderNext = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '10', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// Access column stacks View + up to 4 children (≥3 lines) → whole table top.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const accessCol = css({ width: '40%' })
const actionCol = css({ width: '12%', textAlign: 'center' })
const actionCheckbox = css({ display: 'flex', justifyContent: 'center' })
// Fixed layout so Access keeps its 40% (the Employment Status checkboxes live there).
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
// A group row with sub-rows below it has no line under it.
const noDivider = css({ borderBottomColor: 'transparent' })
const permissionList = css({ display: 'flex', flexDirection: 'column', gap: '4' })
// Purpose sub-rows sit 32px in from the group checkbox. Their divider starts at
// that indent too (drawn on the Access cell); the last purpose row keeps the
// table's normal full-width row border.
const purposeCell = css({ paddingLeft: '40px' }) // cell's own 8px + 32px indent
const indentedDivider = css({
  borderBottomColor: 'transparent',
  backgroundImage: 'linear-gradient(var(--mp-colors-border-default), var(--mp-colors-border-default))',
  backgroundSize: 'calc(100% - 40px) 1px',
  backgroundPosition: 'right bottom',
  backgroundRepeat: 'no-repeat',
})
const purposeAccess = css({ display: 'flex', flexDirection: 'column', gap: '16px' })
// Employment Status: 32px in from the Evaluation checkbox (docs/patterns/form.md reveal indent).
const statusGroup = css({ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '32px' })
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', marginTop: '8' })
const dangerText = css({ color: 'text.danger' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
</script>

<template>
  <div :class="gridArea">
    <form :class="formColumn" novalidate @submit.prevent="handleFormSubmit">
      <!-- Role detail -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Role detail</MpText>
      </div>
      <div :class="fields">
        <MpFormControl id="roleName" is-required :is-invalid="!!nameError">
          <MpFormLabel>Name</MpFormLabel>
          <MpInput v-model="form.name" data-qa="settings-roles-form-input-name" @blur="touched.name = true" />
          <MpFormErrorMessage>{{ nameError }}</MpFormErrorMessage>
        </MpFormControl>

        <MpFormControl id="description" :is-invalid="!!descriptionError">
          <div :class="labelRow">
            <MpFormLabel>Description</MpFormLabel>
            <span :class="charCount">{{ form.description.length }} / {{ DESCRIPTION_MAX }}</span>
          </div>
          <MpTextarea v-model="form.description" data-qa="settings-roles-form-textarea-description" @blur="touched.description = true" />
          <MpFormErrorMessage>{{ descriptionError }}</MpFormErrorMessage>
        </MpFormControl>

        <MpFormControl id="branch">
          <MpFormLabel>Branch</MpFormLabel>
          <MpInputTag
            id="branch-tags"
            :data="branchTags"
            :suggestions="branchSuggestions"
            :is-enable-create-new-tag="false"
            :is-show-suggestions="true"
            :is-show-icon-chevron-down="true"
            :placeholder="branchPlaceholder"
            use-portal
            @change="onBranchChange"
          />
        </MpFormControl>
      </div>

      <!-- Permissions -->
      <div :class="sectionHeaderNext">
        <MpText as="h2" :class="h2Class">Permissions</MpText>
        <MpText size="label" color="text.secondary">Only people who have a specific role can change permissions.</MpText>
      </div>
      <MpTableContainer>
        <MpTable :is-hoverable="false" :class="fixedTable">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" :class="[headCell, accessCol]">Access</MpTableCell>
              <template v-if="isV2">
                <MpTableCell v-for="col in ACTION_COLUMNS" :key="`h-${col.key}`" as="th" :class="[headCell, actionCol]">{{ col.label }}</MpTableCell>
              </template>
              <MpTableCell v-else as="th" :class="headCell">Permission</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <template v-for="(item, idx) in form.permissions" :key="`p-${idx}`">
              <MpTableRow :data-qa="`view-settings-roles-form-permission-${idx}`">
                <MpTableCell as="td" :class="[cell, accessCol, hasSubRows(item) && noDivider]">
                  <MpCheckbox
                    :id="`parent-${idx}`"
                    :is-checked="groupChecked(item)"
                    :is-indeterminate="groupIndeterminate(item)"
                    :is-disabled="isGroupDisabled(item)"
                    :data-qa="`view-settings-roles-form-permission-parent-${idx}`"
                    @update:is-checked="(v: boolean) => onGroupChange(item, idx, v)"
                  >
                    {{ item.name }}
                    <!-- V2 has no description column: Dashboard's scope note sits under its label -->
                    <template v-if="isV2 && isDashboard(item)" #description>{{ dashboardNote }}</template>
                  </MpCheckbox>
                </MpTableCell>
                <!-- V2: one checkbox per action column -->
                <template v-if="isV2">
                  <MpTableCell v-for="col in ACTION_COLUMNS" :key="`c-${idx}-${col.key}`" as="td" :class="[cell, actionCol, hasSubRows(item) && noDivider]">
                    <div v-if="!item.scoped && columnRow(item, col.key)" :class="actionCheckbox">
                      <MpCheckbox
                        :id="`action-${idx}-${col.key}`"
                        :is-checked="columnRow(item, col.key)!.node.checked"
                        :is-disabled="isGroupDisabled(item)"
                        :aria-label="`${col.label} ${item.name}`"
                        @update:is-checked="(v: boolean) => onCheckedRow(columnRow(item, col.key)!, v, idx)"
                      />
                    </div>
                  </MpTableCell>
                </template>
                <MpTableCell v-else as="td" :class="[cell, hasSubRows(item) && noDivider]">
                  <template v-if="!item.scoped">
                    <div v-if="item.children.length" :class="permissionList">
                      <MpCheckbox
                        v-for="row in permissionRows(item)"
                        :id="`child-${idx}-${row.node.id}`"
                        :key="`row-${idx}-${row.node.id}`"
                        :is-checked="row.node.checked"
                        :data-qa="`view-settings-roles-form-permission-child-${idx}-${row.node.id}`"
                        @update:is-checked="(v: boolean) => onCheckedRow(row, v, idx)"
                      >
                        {{ row.label }}
                        <template #description>{{ row.description }}</template>
                      </MpCheckbox>
                    </div>
                    <MpFlex v-else direction="column" gap="1">
                      <MpText size="label" color="text.secondary">{{ item.description }}</MpText>
                      <MpText v-if="isDashboard(item)" size="label" color="text.secondary">{{ dashboardNote }}</MpText>
                    </MpFlex>
                  </template>
                </MpTableCell>
              </MpTableRow>

              <!-- PROPOSED (PRD S1): one sub-row per cycle purpose -->
              <template v-if="item.scoped">
                <MpTableRow v-for="(p, pi) in CYCLE_PURPOSES" :key="`p-${idx}-${p.value}`" :data-qa="`view-settings-roles-form-purpose-${p.value}`">
                  <MpTableCell as="td" :class="[cell, accessCol, purposeCell, pi < CYCLE_PURPOSES.length - 1 && indentedDivider]">
                    <div :class="purposeAccess">
                      <MpCheckbox
                        :id="`purpose-${idx}-${p.value}`"
                        :is-checked="isPurposeAll(item, p.value)"
                        :is-indeterminate="isPurposeSome(item, p.value) && !isPurposeAll(item, p.value)"
                        @update:is-checked="togglePurpose(item, p.value)"
                      >
                        {{ p.label }}
                      </MpCheckbox>
                      <!-- Only Evaluation is scoped by employment status (PRD §5.1) -->
                      <div
                        v-if="p.value === 'evaluation' && isPurposeSome(item, 'evaluation')"
                        :id="`employment-status-${idx}`"
                        role="group"
                        aria-label="Employment status"
                        :class="statusGroup"
                      >
                        <MpCheckbox
                          v-for="s in EVALUATION_EMPLOYMENT_STATUSES"
                          :id="`employment-status-${idx}-${s.value}`"
                          :key="`status-${idx}-${s.value}`"
                          :is-checked="hasStatus(item, s.value)"
                          @update:is-checked="(v: boolean) => toggleStatus(item, s.value, v)"
                        >
                          {{ s.label }}
                        </MpCheckbox>
                      </div>
                    </div>
                  </MpTableCell>
                  <template v-if="isV2">
                    <MpTableCell v-for="col in ACTION_COLUMNS" :key="`pc-${idx}-${p.value}-${col.key}`" as="td" :class="[cell, actionCol]">
                      <div v-if="columnRow(item, col.key)" :class="actionCheckbox">
                        <MpCheckbox
                          :id="`purpose-${idx}-${p.value}-${col.key}`"
                          :is-checked="hasPurpose(columnRow(item, col.key)!.node, p.value)"
                          :aria-label="`${col.label} ${p.label.toLowerCase()} ${item.name.toLowerCase()}`"
                          @update:is-checked="(v: boolean) => togglePurposePermission(item, columnRow(item, col.key)!, p.value, v)"
                        />
                      </div>
                    </MpTableCell>
                  </template>
                  <MpTableCell v-else as="td" :class="cell">
                    <div :class="permissionList">
                      <MpCheckbox
                        v-for="row in permissionRows(item)"
                        :id="`purpose-${idx}-${p.value}-${row.node.id}`"
                        :key="`purpose-${idx}-${p.value}-${row.node.id}`"
                        :is-checked="hasPurpose(row.node, p.value)"
                        @update:is-checked="(v: boolean) => togglePurposePermission(item, row, p.value, v)"
                      >
                        {{ row.label }}
                        <template #description>{{ scopedDescription(row, p) }}</template>
                      </MpCheckbox>
                    </div>
                  </MpTableCell>
                </MpTableRow>
              </template>

              <!-- V2: children that aren't an action (Manage Goal, Report) become sub-rows -->
              <template v-if="isV2 && !item.scoped">
                <MpTableRow v-for="(row, ri) in unmappedRows(item)" :key="`u-${idx}-${row.node.id}`">
                  <MpTableCell as="td" :class="[cell, accessCol, purposeCell, (ri < unmappedRows(item).length - 1 || isReport(item)) && indentedDivider]">
                    <MpCheckbox
                      :id="`child-${idx}-${row.node.id}`"
                      :is-checked="row.node.checked"
                      @update:is-checked="(v: boolean) => onCheckedRow(row, v, idx)"
                    >
                      {{ row.label }}
                    </MpCheckbox>
                  </MpTableCell>
                  <MpTableCell v-for="col in ACTION_COLUMNS" :key="`uc-${idx}-${row.node.id}-${col.key}`" as="td" :class="[cell, actionCol]" />
                </MpTableRow>
              </template>

              <!-- PROPOSED (PRD S2): Report scope — Review cycle's by default, or its own -->
              <template v-if="isReport(item)">
                <MpTableRow :data-qa="'view-settings-roles-form-report-scope'">
                  <MpTableCell as="td" :class="[cell, accessCol, purposeCell, reportScopeRowCount > 1 && indentedDivider]">
                    <MpCheckbox
                      :id="`report-same-scope-${idx}`"
                      :is-checked="!!reportScope.same_as_review_cycle"
                      @update:is-checked="onReportSameScope"
                    >
                      Same scope as Review cycle
                      <template #description>{{ reviewCycleScopeText }}</template>
                    </MpCheckbox>
                  </MpTableCell>
                  <template v-if="isV2">
                    <MpTableCell v-for="col in ACTION_COLUMNS" :key="`rs-${col.key}`" as="td" :class="[cell, actionCol]" />
                  </template>
                  <MpTableCell v-else as="td" :class="cell" />
                </MpTableRow>
                <template v-if="isReportCustom">
                  <MpTableRow v-for="(p, pi) in CYCLE_PURPOSES" :key="`rp-${p.value}`" :data-qa="`view-settings-roles-form-report-purpose-${p.value}`">
                    <MpTableCell as="td" :class="[cell, accessCol, purposeCell, pi < CYCLE_PURPOSES.length - 1 && indentedDivider]">
                      <div :class="purposeAccess">
                        <MpCheckbox
                          :id="`report-purpose-${p.value}`"
                          :is-checked="hasReportPurpose(p.value)"
                          @update:is-checked="(v: boolean) => toggleReportPurpose(p.value, v)"
                        >
                          {{ p.label }}
                        </MpCheckbox>
                        <div v-if="p.value === 'evaluation' && hasReportPurpose('evaluation')" role="group" aria-label="Employment status" :class="statusGroup">
                          <MpCheckbox
                            v-for="s in EVALUATION_EMPLOYMENT_STATUSES"
                            :id="`report-employment-status-${s.value}`"
                            :key="`report-status-${s.value}`"
                            :is-checked="hasReportStatus(s.value)"
                            @update:is-checked="(v: boolean) => toggleReportStatus(s.value, v)"
                          >
                            {{ s.label }}
                          </MpCheckbox>
                        </div>
                      </div>
                    </MpTableCell>
                    <template v-if="isV2">
                      <MpTableCell v-for="col in ACTION_COLUMNS" :key="`rpc-${p.value}-${col.key}`" as="td" :class="[cell, actionCol]" />
                    </template>
                    <MpTableCell v-else as="td" :class="cell" />
                  </MpTableRow>
                </template>
              </template>
            </template>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Action button -->
      <div :class="footerBar">
        <MpButton v-if="enableToDelete" variant="ghost" @click="isModalDelete = true"><span :class="dangerText">Delete role</span></MpButton>
        <MpFlex gap="3" :class="css({ marginLeft: 'auto' })">
          <MpButton variant="ghost" @click="router.push(ROLES_PATH)">Cancel</MpButton>
          <MpButton variant="primary" type="submit">{{ isEdit ? 'Save changes' : 'Submit' }}</MpButton>
        </MpFlex>
      </div>
    </form>
  </div>

  <ClientOnly>
    <MpModal :is-open="isModalDelete" class="roles-form-confirm-modal" @close="isModalDelete = false">
      <MpModalOverlay />
      <MpModalContent :class="confirmWidth">
        <MpModalHeader>
          Delete role?
          <MpModalCloseButton @click="isModalDelete = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="css({ color: 'text.default' })">By deleting the assigned role, you cannot recover it.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpFlex justify="flex-end" gap="3" :class="css({ width: '100%' })">
            <MpButton variant="ghost" @click="isModalDelete = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
          </MpFlex>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.roles-form-confirm-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>
