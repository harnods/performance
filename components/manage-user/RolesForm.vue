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
<script lang="ts">
// Module scope: the role form switches to Rizal only on its first open per page load.
let openedAsSuperAdmin = false
</script>

<script setup lang="ts">
import {
  MpFlex, MpText, MpButton, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon, MpTextarea, MpInputTag, MpCheckbox, MpToggle,
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

import type { RoleUiState } from '~/composables/useManageUserStore'
import RolesPermissionTreeV2 from '~/components/manage-user/RolesPermissionTreeV2.vue'

defineOptions({ name: 'RolesForm' })

// `scope` is set only on purpose-scoped groups (Review cycle) — PROPOSED, PRD S1.
interface PermissionNode { id: number, checked: boolean, name: string, description: string, scope?: PermissionScope }
interface PermissionParent extends PermissionNode { children: PermissionNode[], scoped: boolean }

const route = useRoute()
const router = useRouter()
const { permissions: permissionsSettings, branches, roleById, createRole, updateRole, deleteRole, rolesFormVersion } = useManageUserStore()
// Dev scenario: v1 = Access + Permission list, v2 = module tree with one checkbox column per action (own component).
const isV2 = computed(() => rolesFormVersion.value === 'v2')
// Only the Super Admin persona (Rizal Candra) can change permissions; everyone else gets locked checkboxes.
// Who is editing and what they may grant (Super Admin: all; delegated user: own scope; others: nothing).
const actor = useRoleActor()
// The role form opens as Rizal (Super Admin) once per page load; the header's "View as" can still switch to Rio.
const { setCurrentUser } = useCurrentUser()
onMounted(() => {
  if (openedAsSuperAdmin) return
  openedAsSuperAdmin = true
  setCurrentUser('rizal')
})

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
const dashboardScope = ref<PermissionScope>({ purposes: [], employment_statuses: [], same_as_review_cycle: true })
// The 9-box matrix has its own Report scope (PRD S2: the 9-box report is scoped the same way).
const nineboxScope = ref<PermissionScope>({ purposes: [], employment_statuses: [], same_as_review_cycle: true })
const isModalDelete = ref(false)
// Version 2 tree selection (see RoleUiState); kept here so it round-trips through Save → Edit.
const v2State = ref<RoleUiState['v2']>()

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
// Production hides the 'Edit Result' child.
// Report (PRD S2) has no View either — its checkboxes are the two report types.
const showView = (item: PermissionParent) => item.id !== REPORT_PERMISSION_ID
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
// Goals is all-or-nothing per goal type: its action boxes tick / untick together (hover tooltip says so).
const AON_HINT = 'Goals access applies to View, Create, Edit and Delete together'
const isAllOrNothing = (item: PermissionParent) => item.name === 'Goals'
const aonLockReason = (item: PermissionParent) => (isAllOrNothing(item) ? permissionRows(item).map(r => actor.permissionReason(r.label)).find(Boolean) ?? '' : '')
// Goals splits into Organization / Company goals sub-rows (like Review cycle's purposes).
// Each goal type is picked on its own, but its View / Create / Edit / Delete go together.
const GOALS_SCOPES = [
  { key: 'organization', label: 'Organization goals' },
  { key: 'company', label: 'Company goals' },
]
const goalsOn = ref<Record<string, boolean>>({})
const goalsState = computed(() => {
  const on = GOALS_SCOPES.filter(s => goalsOn.value[s.key]).length
  return { checked: on === GOALS_SCOPES.length, indeterminate: on > 0 && on < GOALS_SCOPES.length }
})
const setGoals = (keys: string[], value: boolean) => keys.forEach((k) => { goalsOn.value[k] = value })
const toggleAllGoals = () => setGoals(GOALS_SCOPES.map(s => s.key), !goalsState.value.checked)
// The production payload has one Goals permission set: granted when any goal type is.
function applyGoalsState() {
  const goals = form.value.permissions.find(isAllOrNothing)
  if (!goals) return
  const any = GOALS_SCOPES.some(s => goalsOn.value[s.key])
  goals.checked = any
  goals.children.forEach((child) => { child.checked = any })
}
const goalsDescription = (row: PermissionRow, scope: { label: string }) => row.description.replace('goals', scope.label.toLowerCase())
/** Why a permission row is disabled ('' = free). */
const rowReason = (item: PermissionParent, row: PermissionRow) => (isDashboard(item) ? actor.dashboardReason() : aonLockReason(item) || actor.permissionReason(row.label))
const rowTip = (item: PermissionParent, row: PermissionRow) => rowReason(item, row) || (isAllOrNothing(item) ? AON_HINT : '')
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

// Rows the acting user is allowed to hand out (a delegated user can't grant Delete, etc.).
const grantableRows = (item: PermissionParent) => permissionRows(item).filter(r => !actor.permissionReason(r.label))
const grantableStatuses = computed(() => ALL_STATUSES.filter(s => !actor.statusReason(s)))
const isPurposeAll = (item: PermissionParent, p: CyclePurpose) => grantableRows(item).every(r => hasPurpose(r.node, p))
const isPurposeSome = (item: PermissionParent, p: CyclePurpose) => permissionRows(item).some(r => hasPurpose(r.node, p))

/** Description with the purpose spelled out, e.g. "View performance review cycles and their progress." */
/** Display name of a Review cycle purpose row: "Performance review". */
const purposeLabel = (p: { label: string }) => `${p.label} review`
const scopedDescription = (row: PermissionRow, p: { value: CyclePurpose, label: string }) =>
  SCOPED_PERMISSION_DESCRIPTIONS[row.node.id]?.(p.label.toLowerCase()) ?? row.description

function setPurpose(node: PermissionNode, p: CyclePurpose, value: boolean) {
  const scope = node.scope
  if (!scope) return
  scope.purposes = ALL_PURPOSES.filter(x => (x === p ? value : scope.purposes.includes(x)))
  // Evaluation starts on "All employment status"; removing it clears the statuses.
  if (p === 'evaluation') scope.employment_statuses = value ? (scope.employment_statuses.length ? scope.employment_statuses : [...grantableStatuses.value]) : []
  node.checked = scope.purposes.length > 0
}
// Purpose checkbox (Access column) — grants/removes every permission for that purpose.
function togglePurpose(item: PermissionParent, p: CyclePurpose) {
  const value = !isPurposeAll(item, p)
  const statuses = p === 'evaluation' ? evaluationStatuses(item) : []
  grantableRows(item).forEach(r => setPurpose(r.node, p, value))
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

// ─── Report / Dashboard scope (PRD S2 / S3) ──────────────────────────────────────────────────
const isReport = (item: PermissionParent) => item.id === REPORT_PERMISSION_ID
type ScopeGroup = 'report' | 'ninebox' | 'dashboard'
const SCOPE_REFS = { report: reportScope, ninebox: nineboxScope, dashboard: dashboardScope }
const SCOPE_NAMES: Record<ScopeGroup, string> = { report: 'Review results', ninebox: '9-box matrix', dashboard: 'Dashboard' }
const scopeRef = (g: ScopeGroup) => SCOPE_REFS[g]
const isScopeCustom = (g: ScopeGroup) => !scopeRef(g).value.same_as_review_cycle
// Switching the toggle either way starts from nothing selected.
const onSameScope = (g: ScopeGroup, value: boolean) => { scopeRef(g).value = { purposes: [], employment_statuses: [], same_as_review_cycle: value } }
const hasScopePurpose = (g: ScopeGroup, p: CyclePurpose) => scopeRef(g).value.purposes.includes(p)
function toggleScopePurpose(g: ScopeGroup, p: CyclePurpose, value: boolean) {
  const scope = scopeRef(g).value
  scope.purposes = ALL_PURPOSES.filter(x => (x === p ? value : scope.purposes.includes(x)))
  if (p === 'evaluation') scope.employment_statuses = value ? [...grantableStatuses.value] : []
}
const hasScopeStatus = (g: ScopeGroup, status: string) => scopeRef(g).value.employment_statuses.includes(status)
function toggleScopeStatus(g: ScopeGroup, status: string, value: boolean) {
  const next = ALL_STATUSES.filter(s => (s === status ? value : hasScopeStatus(g, s)))
  if (next.length) scopeRef(g).value.employment_statuses = next
  else toggleScopePurpose(g, 'evaluation', false)
}
// Review results (Report) and Review cycle (Dashboard) own the scoped checkboxes.
const scopedRowGranted = (g: ScopeGroup) => {
  const row = g === 'dashboard' ? dashboardRows.value[0] : REPORT_ROWS.find(r => r.key === (g === 'ninebox' ? 'ninebox' : 'results'))
  return !!row && rowKeys(g === 'dashboard' ? 'dashboard' : 'report', row).some(k => subOn.value[k])
}
const reportScopeError = computed(() => {
  const bad = (Object.keys(SCOPE_REFS) as ScopeGroup[]).find(g => scopedRowGranted(g) && isScopeCustom(g) && !scopeRef(g).value.purposes.length)
  return bad ? `Select at least one purpose for ${SCOPE_NAMES[bad]}` : ''
})
// Caption under the "Same scope" toggle: what the group inherits from Review cycle right now.
function sameScopeCaption(g: ScopeGroup) {
  const { purposes, employment_statuses: statuses } = effectiveScope(g)
  if (!purposes.length) return ''
  const list = purposes.map((p) => {
    const label = CYCLE_PURPOSES.find(x => x.value === p)?.label ?? p
    const names = p === 'evaluation' ? statuses.map(v => EVALUATION_EMPLOYMENT_STATUSES.find(x => x.value === v)?.label ?? v) : []
    return names.length ? `${label} (${names.join(', ')})` : label
  })
  return list.join(', ')
}
const effectiveScope = (g: ScopeGroup): PermissionScope => (isScopeCustom(g)
  ? { ...scopeRef(g).value, purposes: [...scopeRef(g).value.purposes], employment_statuses: [...scopeRef(g).value.employment_statuses] }
  : { ...reviewCycleScope.value, same_as_review_cycle: true })

// ─── Collapsible groups + Report / Dashboard sub-rows (Version 1) ───────────
// Review cycle, Report and Dashboard have rows beneath the group row, with a caret to fold them.
const collapsedGroups = ref<Record<number, boolean>>({})
const isCollapsible = (item: PermissionParent) => item.scoped || isReport(item) || isDashboard(item) || isAllOrNothing(item)
// A search hit on a sub-row opens its group, whatever the caret says.
const isGroupOpen = (item: PermissionParent) => subRowMatches(item) || !collapsedGroups.value[item.id]
const hasOpenSubRows = (item: PermissionParent) => isCollapsible(item) && isGroupOpen(item)
const toggleGroup = (item: PermissionParent) => { collapsedGroups.value[item.id] = !collapsedGroups.value[item.id] }

/** A module row beneath Report / Dashboard, each with its own permission checkboxes. */
interface SubPerm { key: string, label: string, description: string }
interface SubRow { key: string, label: string, perms: SubPerm[], scoped?: boolean, allOrNothing?: boolean }
const viewCreate = (view: string, create: string): SubPerm[] => [
  { key: 'view', label: 'View', description: view },
  { key: 'create', label: 'Create', description: create },
]
const REPORT_ROWS: SubRow[] = [
  { key: 'results', label: 'Review results', scoped: true, perms: viewCreate('View and export review results.', 'Generate review results.') },
  { key: 'goals', label: 'Goals result', allOrNothing: true, perms: viewCreate('View goals results.', 'Generate goals results.') },
  { key: 'ninebox', label: '9-box matrix', scoped: true, perms: viewCreate('View the 9-box matrix and its configuration.', 'Generate the 9-box matrix.') },
]
// Dashboard is view only: one Review cycle row (key kept as 'performance' + Review cycle's View id, so saved roles still load).
const dashboardRows = computed<SubRow[]>(() => {
  const cycle = reviewCycleItem.value
  return [
    { key: 'performance', label: 'Review cycle', scoped: true, perms: cycle ? [{ key: String(cycle.id), label: 'View', description: 'View dashboard for review cycles.' }] : [] },
  ]
})
const subRowsOf = (item: PermissionParent): SubRow[] => (isReport(item) ? REPORT_ROWS : isDashboard(item) ? dashboardRows.value : [])
const subGroup = (item: PermissionParent) => (isReport(item) ? 'report' : 'dashboard')
/** Which scope a scoped sub-row edits: Review results and Dashboard use their group's, the 9-box matrix its own. */
const rowScope = (item: PermissionParent, row: SubRow): ScopeGroup => (row.key === 'ninebox' ? 'ninebox' : subGroup(item))
const subOn = ref<Record<string, boolean>>({})
const subKey = (group: string, row: SubRow, perm: SubPerm) => `${group}:${row.key}:${perm.key}`
const rowKeys = (group: string, row: SubRow) => row.perms.map(p => subKey(group, row, p))
const groupKeys = (item: PermissionParent) => subRowsOf(item).flatMap(r => rowKeys(subGroup(item), r))
function subState(keys: string[]) {
  const on = keys.filter(k => subOn.value[k]).length
  return { checked: on === keys.length && on > 0, indeterminate: on > 0 && on < keys.length }
}
// Create / Edit / Delete need View (the row's first permission): ticking one also ticks View; unticking View clears the rest.
function setSubPerm(group: string, row: SubRow, perm: SubPerm, value: boolean) {
  // Goals result is all or nothing, like the Goals module: View and Create go together.
  if (row.allOrNothing) return setSub(rowKeys(group, row), value)
  const view = row.perms[0]
  subOn.value[subKey(group, row, perm)] = value
  if (!view) return
  if (value && perm !== view) subOn.value[subKey(group, row, view)] = true
  if (!value && perm === view) row.perms.forEach((p) => { subOn.value[subKey(group, row, p)] = false })
}
const setSub = (keys: string[], value: boolean) => keys.forEach((k) => { subOn.value[k] = value })

// The sub-row checkboxes live locally; map them onto the store's permissions on load / submit.
function hydrateSubState() {
  const report = form.value.permissions.find(isReport)
  REPORT_ROWS.forEach((row) => {
    if (report?.children.find(c => c.name === row.label)?.checked) subOn.value[subKey('report', row, row.perms[0])] = true
  })
  const dashboard = form.value.permissions.find(isDashboard)
  const first = dashboardRows.value[0]
  if (dashboard?.checked && first?.perms[0]) subOn.value[subKey('dashboard', first, first.perms[0])] = true
}
function applySubState() {
  const report = form.value.permissions.find(isReport)
  if (report) {
    report.children.forEach((child) => {
      const row = REPORT_ROWS.find(r => r.label === child.name)
      if (row) child.checked = rowKeys('report', row).some(k => subOn.value[k])
    })
    report.checked = groupKeys(report).some(k => subOn.value[k])
  }
  const dashboard = form.value.permissions.find(isDashboard)
  if (dashboard) dashboard.checked = groupKeys(dashboard).some(k => subOn.value[k])
}

// ─── Dashboard (PRD S3): always Review cycle's scope ─────────────────────────
const isDashboard = (item: PermissionParent) => item.id === DASHBOARD_PERMISSION_ID
// PRD S3: Dashboard follows Review cycle's scope, so it stays off until Review cycle has a review type.
const NO_REVIEW_TYPE = 'Select at least one review type in Review cycle first'
const dashboardLockReason = computed(() => actor.dashboardReason() || (reviewCycleScope.value.purposes.length ? '' : NO_REVIEW_TYPE))
watch(() => reviewCycleScope.value.purposes.length, (n) => {
  const dashboard = form.value.permissions.find(isDashboard)
  if (!n && dashboard) setSub(groupKeys(dashboard), false)
})
// Why a Report / Dashboard sub-row is locked for the acting user ('' = free).
// An all-or-nothing row locks whole when any of its actions can't be granted.
const subRowReason = (group: string, row: SubRow) => (group === 'dashboard'
  ? dashboardLockReason.value
  : actor.reportReason(row.label) || (row.allOrNothing ? row.perms.map(p => actor.permissionReason(p.label)).find(Boolean) ?? '' : ''))
const GOALS_RESULT_HINT = 'Goals result access applies to View and Create together'
const permTip = (group: string, row: SubRow, perm: SubPerm) => subRowReason(group, row) || actor.permissionReason(perm.label) || (row.allOrNothing ? GOALS_RESULT_HINT : '')
// A group's own checkbox covers every row beneath it, so it stays locked while any of them is.
const parentReason = (item: PermissionParent) => {
  if (isDashboard(item)) return dashboardLockReason.value
  if (isReport(item)) return REPORT_ROWS.map(r => actor.reportReason(r.label)).find(Boolean) ?? ''
  const rows = permissionRows(item).map(r => actor.permissionReason(r.label)).find(Boolean)
  return rows || (item.scoped ? CYCLE_PURPOSES.map(p => actor.purposeReason(p.value)).find(Boolean) ?? '' : '')
}

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

// ─── Module search ──────────────────────────────────────────────────────────
// Matches a module's name or any row beneath it (purposes, report types, goals scopes).
const search = ref('')
const query = computed(() => search.value.trim().toLowerCase())
const subRowLabels = (item: PermissionParent): string[] => {
  if (item.scoped) return CYCLE_PURPOSES.map(purposeLabel)
  if (isAllOrNothing(item)) return GOALS_SCOPES.map(s => s.label)
  return subRowsOf(item).map(r => r.label)
}
const subRowMatches = (item: PermissionParent) => !!query.value && subRowLabels(item).some(l => l.toLowerCase().includes(query.value))
const matchesSearch = (item: PermissionParent) => !query.value || item.name.toLowerCase().includes(query.value) || subRowMatches(item)
const hasSearchResult = computed(() => form.value.permissions.some(matchesSearch))

// Group checkbox — V1 only; Version 2 is its own component (RolesPermissionTreeV2).
const hasSubRowState = (item: PermissionParent) => isReport(item) || isDashboard(item)
const groupChecked = (item: PermissionParent) => (isAllOrNothing(item) ? goalsState.value.checked : hasSubRowState(item) ? subState(groupKeys(item)).checked : isParentChecked(item))
const groupIndeterminate = (item: PermissionParent) => (isAllOrNothing(item) ? goalsState.value.indeterminate : hasSubRowState(item) ? subState(groupKeys(item)).indeterminate : isParentIndeterminate(item))
const onGroupChange = (item: PermissionParent, index: number, value: boolean) => {
  if (isAllOrNothing(item)) toggleAllGoals()
  else if (hasSubRowState(item)) setSub(groupKeys(item), !subState(groupKeys(item)).checked)
  else checkParent(index, value)
}

// Saved UI-only state (Version 2 tree, Report / Dashboard sub-rows, scope toggles); needs the refs defined above.
const savedUi = isEdit.value && roleId.value != null ? roleById(roleId.value)?.ui_state : undefined
if (savedUi) {
  v2State.value = savedUi.v2
  if (savedUi.subOn) subOn.value = { ...savedUi.subOn }
  if (savedUi.reportScope) reportScope.value = savedUi.reportScope
  if (savedUi.dashboardScope) dashboardScope.value = savedUi.dashboardScope
  if (savedUi.nineboxScope) nineboxScope.value = savedUi.nineboxScope
  if (savedUi.goalsOn) goalsOn.value = { ...savedUi.goalsOn }
}
// A role saved without the split (or seeded) holds Goals as a whole: both goal types.
if (!savedUi?.goalsOn && form.value.permissions.find(isAllOrNothing)?.checked) setGoals(GOALS_SCOPES.map(s => s.key), true)
hydrateSubState() // after fetchRole: reads the computed rows defined above

function generatePayload() {
  applySubState()
  applyGoalsState()
  const permissionData: Record<number, boolean> = {}
  const permissionScopes: Record<number, PermissionScope> = {}
  form.value.permissions.forEach((parent) => {
    if (parent.checked) {
      permissionData[parent.id] = true
      if (parent.scope) permissionScopes[parent.id] = { ...parent.scope }
      if (isReport(parent)) permissionScopes[parent.id] = effectiveScope('report')
      if (isDashboard(parent)) permissionScopes[parent.id] = effectiveScope('dashboard')
      parent.children.forEach((child) => {
        permissionData[child.id] = child.checked || false
        if (child.checked && child.scope) permissionScopes[child.id] = { ...child.scope }
        if (child.checked && isReport(parent)) permissionScopes[child.id] = effectiveScope(child.name === '9-box matrix' ? 'ninebox' : 'report')
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
    ui_state: {
      v2: v2State.value,
      subOn: { ...subOn.value },
      reportScope: reportScope.value,
      dashboardScope: dashboardScope.value,
      nineboxScope: nineboxScope.value,
      goalsOn: { ...goalsOn.value },
    },
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
// The permission table runs the full content width; the detail fields keep the form column's width.
const fullColumn = css({ gridColumn: 'span 12 / span 12', display: 'flex', flexDirection: 'column' })
const detailWidth = css({ width: '100%', maxWidth: '656px' })
const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginBottom: '3' })
const sectionHeaderNext = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '10', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// Access column stacks View + up to 4 children (≥3 lines) → whole table top.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const accessCol = css({ width: '440px' })
// Parent (module) rows: semibold title.
const groupLabel = css({ fontWeight: '600' })
// Fixed layout so Access keeps its 40% (the Employment Status checkboxes live there).
const fixedTable = css({ tableLayout: 'fixed', width: '100%' })
const permissionList = css({ display: 'flex', flexDirection: 'column', gap: '4' })
// Every Module cell is [20px caret slot][checkbox]; sub-rows step in 24px (same as Version 2).
// Row dividers are always full width.
const moduleLine = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
const caretSlot = css({ width: '20px', height: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' })
const caretButton = css({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '24px', cursor: 'pointer', color: 'text.secondary' })
const subIndent = css({ paddingLeft: '24px' })
const moduleStack = css({ display: 'flex', flexDirection: 'column', minWidth: '0' })
// The table cell is nowrap; let the toggle label and caption wrap inside the Module column.
const toggleBlock = css({ marginTop: '2', whiteSpace: 'normal' })
// Report scope checkboxes: aligned with the toggle's title (control width + gap).
const scopeIndent = css({ paddingLeft: '42px', marginTop: '4' })
const purposeAccess = css({ display: 'flex', flexDirection: 'column', gap: '16px' })
// Employment Status: 32px in from the Evaluation checkbox (docs/patterns/form.md reveal indent).
const statusLabel = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
// 4px from the label to the first checkbox, 12px between checkboxes.
const statusGroup = css({ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '32px' })
const statusList = css({ display: 'flex', flexDirection: 'column', gap: '12px' })
// Module search: right-aligned above the table, like the Roles list's filter bar (docs/patterns/filter-bar.md).
const searchBar = css({ display: 'flex', justifyContent: 'flex-end', marginBottom: '3' })
const searchField = css({ width: '280px' })
const noResult = css({ textAlign: 'center', paddingBlock: '8' })
const footerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', marginTop: '8' })
const dangerText = css({ color: 'text.danger' })
const confirmWidth = css({ width: '400px', maxWidth: '90vw' })
</script>

<template>
  <div :class="gridArea">
    <form :class="fullColumn" novalidate @submit.prevent="handleFormSubmit">
      <!-- Role detail -->
      <div :class="[sectionHeader, detailWidth]">
        <MpText as="h2" :class="h2Class">Role detail</MpText>
      </div>
      <div :class="[fields, detailWidth]">
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
      <div :class="searchBar">
        <MpInputGroup :class="searchField">
          <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
          <MpInput id="roles-permission-search" v-model="search" placeholder="Search module name..." data-qa="settings-roles-form-input-search" />
        </MpInputGroup>
      </div>
      <RolesPermissionTreeV2 v-if="isV2" v-model="v2State" :search="search" />
      <MpTableContainer v-else>
        <MpTable :is-hoverable="false" :class="fixedTable">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" :class="[headCell, accessCol]">Module</MpTableCell>
              <MpTableCell as="th" :class="headCell">Permission</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <template v-for="(item, idx) in form.permissions" :key="`p-${idx}`">
              <template v-if="matchesSearch(item)">
              <MpTableRow :data-qa="`view-settings-roles-form-permission-${idx}`">
                <MpTableCell as="td" :class="[cell, accessCol]">
                  <div :class="moduleLine">
                    <span :class="caretSlot">
                      <button
                        v-if="isCollapsible(item)"
                        type="button"
                        :class="caretButton"
                        :aria-label="`${isGroupOpen(item) ? 'Collapse' : 'Expand'} ${item.name}`"
                        :aria-expanded="isGroupOpen(item)"
                        @click="toggleGroup(item)"
                      >
                        <MpIcon :name="isGroupOpen(item) ? 'caret-down' : 'caret-right'" size="sm" />
                      </button>
                    </span>
                    <ManageUserRolesLock :reason="parentReason(item) || (isAllOrNothing(item) ? AON_HINT : '')"><MpCheckbox :is-disabled="!!(parentReason(item))"
                      :id="`parent-${idx}`"
                      :is-checked="groupChecked(item)"
                      :is-indeterminate="groupIndeterminate(item)"
                      :data-qa="`view-settings-roles-form-permission-parent-${idx}`"
                      @update:is-checked="(v: boolean) => onGroupChange(item, idx, v)"
                    >
                      <span :class="groupLabel">{{ item.name }}</span>
                    </MpCheckbox></ManageUserRolesLock>
                  </div>
                </MpTableCell>
                <MpTableCell as="td" :class="[cell]">
                  <template v-if="!item.scoped">
                    <div v-if="item.children.length && !isReport(item) && !isAllOrNothing(item)" :class="permissionList">
                      <ManageUserRolesLock :reason="rowTip(item, row)"
                        v-for="row in permissionRows(item)"
                        :key="`row-${idx}-${row.node.id}`"><MpCheckbox :is-disabled="!!rowReason(item, row)"
                        :id="`child-${idx}-${row.node.id}`"
                        :is-checked="row.node.checked"
                        :data-qa="`view-settings-roles-form-permission-child-${idx}-${row.node.id}`"
                        @update:is-checked="(v: boolean) => onCheckedRow(row, v, idx)"
                      >
                        {{ row.label }}
                        <template #description>{{ row.description }}</template>
                      </MpCheckbox></ManageUserRolesLock>
                    </div>
                  </template>
                </MpTableCell>
              </MpTableRow>

              <!-- PROPOSED (PRD S1): one sub-row per cycle purpose -->
              <template v-if="item.scoped && isGroupOpen(item)">
                <MpTableRow v-for="(p, pi) in CYCLE_PURPOSES" :key="`p-${idx}-${p.value}`" :data-qa="`view-settings-roles-form-purpose-${p.value}`">
                  <MpTableCell as="td" :class="[cell, accessCol]">
                    <div :class="[moduleLine, subIndent]">
                    <span :class="caretSlot" />
                    <div :class="purposeAccess">
                      <ManageUserRolesLock :reason="actor.purposeReason(p.value)"><MpCheckbox :is-disabled="!!(actor.purposeReason(p.value))"
                        :id="`purpose-${idx}-${p.value}`"
                        :is-checked="isPurposeAll(item, p.value)"
                        :is-indeterminate="isPurposeSome(item, p.value) && !isPurposeAll(item, p.value)"
                        @update:is-checked="togglePurpose(item, p.value)"
                      >
                        {{ purposeLabel(p) }}
                      </MpCheckbox></ManageUserRolesLock>
                      <!-- Only Evaluation is scoped by employment status (PRD §5.1) -->
                      <div
                        v-if="p.value === 'evaluation' && isPurposeSome(item, 'evaluation')"
                        :id="`employment-status-${idx}`"
                        role="group"
                        aria-label="Employment status"
                        :class="statusGroup"
                      >
                        <span :class="statusLabel">Employment status</span>
                        <div :class="statusList">
                          <ManageUserRolesLock :reason="actor.statusReason(s.value)"
                            v-for="s in EVALUATION_EMPLOYMENT_STATUSES"
                            :key="`status-${idx}-${s.value}`"><MpCheckbox :is-disabled="!!(actor.statusReason(s.value))"
                            :id="`employment-status-${idx}-${s.value}`"
                            :is-checked="hasStatus(item, s.value)"
                            @update:is-checked="(v: boolean) => toggleStatus(item, s.value, v)"
                          >
                            {{ s.label }}
                          </MpCheckbox></ManageUserRolesLock>
                        </div>
                      </div>
                    </div>
                    </div>
                  </MpTableCell>
                  <MpTableCell as="td" :class="cell">
                    <div :class="permissionList">
                      <ManageUserRolesLock :reason="actor.permissionReason(row.label) || actor.purposeReason(p.value)"
                        v-for="row in permissionRows(item)"
                        :key="`purpose-${idx}-${p.value}-${row.node.id}`"><MpCheckbox :is-disabled="!!(actor.permissionReason(row.label) || actor.purposeReason(p.value))"
                        :id="`purpose-${idx}-${p.value}-${row.node.id}`"
                        :is-checked="hasPurpose(row.node, p.value)"
                        @update:is-checked="(v: boolean) => togglePurposePermission(item, row, p.value, v)"
                      >
                        {{ row.label }}
                        <template #description>{{ scopedDescription(row, p) }}</template>
                      </MpCheckbox></ManageUserRolesLock>
                    </div>
                  </MpTableCell>
                </MpTableRow>
              </template>

              <!-- Goals: Organization / Company goals sub-rows, all or nothing -->
              <template v-if="isAllOrNothing(item) && isGroupOpen(item)">
                <MpTableRow v-for="scope in GOALS_SCOPES" :key="`goals-${idx}-${scope.key}`" :data-qa="`view-settings-roles-form-goals-${scope.key}`">
                  <MpTableCell as="td" :class="[cell, accessCol]">
                    <div :class="[moduleLine, subIndent]">
                      <span :class="caretSlot" />
                      <ManageUserRolesLock :reason="parentReason(item) || AON_HINT"><MpCheckbox :is-disabled="!!parentReason(item)"
                        :id="`goals-${idx}-${scope.key}`"
                        :is-checked="!!goalsOn[scope.key]"
                        @update:is-checked="(v: boolean) => setGoals([scope.key], v)"
                      >
                        {{ scope.label }}
                      </MpCheckbox></ManageUserRolesLock>
                    </div>
                  </MpTableCell>
                  <MpTableCell as="td" :class="cell">
                    <div :class="permissionList">
                      <ManageUserRolesLock :reason="rowTip(item, row)"
                        v-for="row in permissionRows(item)"
                        :key="`goals-${idx}-${scope.key}-${row.node.id}`"><MpCheckbox :is-disabled="!!rowReason(item, row)"
                        :id="`goals-${idx}-${scope.key}-${row.node.id}`"
                        :is-checked="!!goalsOn[scope.key]"
                        @update:is-checked="(v: boolean) => setGoals([scope.key], v)"
                      >
                        {{ row.label }}
                        <template #description>{{ goalsDescription(row, scope) }}</template>
                      </MpCheckbox></ManageUserRolesLock>
                    </div>
                  </MpTableCell>
                </MpTableRow>
              </template>

              <!-- Report (PRD S2) / Dashboard (PRD S3): one row per module, each with its own permissions -->
              <template v-if="hasSubRowState(item) && isGroupOpen(item)">
                <MpTableRow
                  v-for="(row, ri) in subRowsOf(item)"
                  :key="`sub-${idx}-${row.key}`"
                  :data-qa="`view-settings-roles-form-${subGroup(item)}-${row.key}`"
                >
                  <MpTableCell as="td" :class="[cell, accessCol]">
                    <div :class="[moduleLine, subIndent]">
                      <span :class="caretSlot" />
                      <div :class="moduleStack">
                        <ManageUserRolesLock :reason="subRowReason(subGroup(item), row) || (row.allOrNothing ? GOALS_RESULT_HINT : '')"><MpCheckbox :is-disabled="!!(subRowReason(subGroup(item), row))"
                          :id="`sub-${subGroup(item)}-${row.key}`"
                          :is-checked="subState(rowKeys(subGroup(item), row)).checked"
                          :is-indeterminate="subState(rowKeys(subGroup(item), row)).indeterminate"
                          @update:is-checked="(v: boolean) => setSub(rowKeys(subGroup(item), row), v)"
                        >
                          {{ row.label }}
                        </MpCheckbox></ManageUserRolesLock>
                        <!-- Scoped rows (Review results / 9-box matrix / Dashboard's Review cycle): Review cycle's scope by default, or their own purposes -->
                        <template v-if="row.scoped">
                          <div :class="toggleBlock">
                            <MpToggle
                              :id="`${rowScope(item, row)}-same-scope-${idx}`"
                              :is-checked="!!scopeRef(rowScope(item, row)).value.same_as_review_cycle"
                              @update:is-checked="(v: boolean) => onSameScope(rowScope(item, row), v)"
                            >
                              Same scope as review cycle module setting
                              <template v-if="!isScopeCustom(rowScope(item, row)) && sameScopeCaption(rowScope(item, row))" #description>{{ sameScopeCaption(rowScope(item, row)) }}</template>
                            </MpToggle>
                          </div>
                          <div v-if="isScopeCustom(rowScope(item, row))" :class="[purposeAccess, scopeIndent]" :data-qa="`view-settings-roles-form-${rowScope(item, row)}-scope`">
                            <template v-for="p in CYCLE_PURPOSES" :key="`rp-${p.value}`">
                              <ManageUserRolesLock :reason="actor.purposeReason(p.value)"><MpCheckbox :is-disabled="!!(actor.purposeReason(p.value))"
                                :id="`${rowScope(item, row)}-purpose-${p.value}`"
                                :is-checked="hasScopePurpose(rowScope(item, row), p.value)"
                                @update:is-checked="(v: boolean) => toggleScopePurpose(rowScope(item, row), p.value, v)"
                              >
                                {{ purposeLabel(p) }}
                              </MpCheckbox></ManageUserRolesLock>
                              <div v-if="p.value === 'evaluation' && hasScopePurpose(rowScope(item, row), 'evaluation')" role="group" aria-label="Employment status" :class="statusGroup">
                                <span :class="statusLabel">Employment status</span>
                                <div :class="statusList">
                                  <ManageUserRolesLock :reason="actor.statusReason(s.value)"
                                    v-for="s in EVALUATION_EMPLOYMENT_STATUSES"
                                    :key="`${rowScope(item, row)}-status-${s.value}`"><MpCheckbox :is-disabled="!!(actor.statusReason(s.value))"
                                    :id="`${rowScope(item, row)}-employment-status-${s.value}`"
                                    :is-checked="hasScopeStatus(rowScope(item, row), s.value)"
                                    @update:is-checked="(v: boolean) => toggleScopeStatus(rowScope(item, row), s.value, v)"
                                  >
                                    {{ s.label }}
                                  </MpCheckbox></ManageUserRolesLock>
                                </div>
                              </div>
                            </template>
                          </div>
                        </template>
                      </div>
                    </div>
                  </MpTableCell>
                  <MpTableCell as="td" :class="cell">
                    <div :class="permissionList">
                      <ManageUserRolesLock :reason="permTip(subGroup(item), row, perm)"
                        v-for="perm in row.perms"
                        :key="subKey(subGroup(item), row, perm)"><MpCheckbox :is-disabled="!!(subRowReason(subGroup(item), row) || actor.permissionReason(perm.label))"
                        :id="`sub-${subGroup(item)}-${row.key}-${perm.key}`"
                        :is-checked="!!subOn[subKey(subGroup(item), row, perm)]"
                        @update:is-checked="(v: boolean) => setSubPerm(subGroup(item), row, perm, v)"
                      >
                        {{ perm.label }}
                        <template #description>{{ perm.description }}</template>
                      </MpCheckbox></ManageUserRolesLock>
                    </div>
                  </MpTableCell>
                </MpTableRow>
              </template>
              </template>
            </template>
            <MpTableRow v-if="!hasSearchResult">
              <MpTableCell as="td" :colspan="2" :class="noResult">
                No result found. You can try searching different keywords.
              </MpTableCell>
            </MpTableRow>
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
