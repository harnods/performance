<!--
  Roles form — Version 2 permission table (Figma: Settings > Access Role,
  "Table / Custom role performance"). A collapsible module tree with one checkbox
  column per action. Prototype only: local state, not wired to the role payload.
  Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpCheckbox, MpIcon, MpToggle,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  css,
} from '@mekari/pixel3'

defineOptions({ name: 'RolesPermissionTreeV2' })
// Who is editing and what they may grant (Super Admin: all; delegated user: own scope; others: nothing).
const actor = useRoleActor()

type Action = 'view' | 'create' | 'edit' | 'delete'
const ACTIONS: { key: Action, label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
]

interface TreeNode {
  key: string
  label: string
  actions: Action[]
  children?: TreeNode[]
  /** "Same scope as … module" — when on, the node's own checkboxes cover the whole subtree. */
  toggleLabel?: string
  /** All-or-nothing module (the backend can't store partial access): every action cell beneath it is ticked / unticked together. */
  allOrNothing?: boolean
}

const ALL: Action[] = ['view', 'create', 'edit', 'delete']
const VIEW_CREATE: Action[] = ['view', 'create']
const VIEW: Action[] = ['view']

const purposes = (prefix: string, actions: Action[]): TreeNode[] => [
  { key: `${prefix}-competency`, label: 'Competency review', actions },
  { key: `${prefix}-performance`, label: 'Performance review', actions },
  {
    key: `${prefix}-evaluation`, label: 'Evaluation review', actions,
    children: ['Internship', 'Probation', 'Contract'].map(s => ({ key: `${prefix}-evaluation-${s.toLowerCase()}`, label: s, actions })),
  },
]

const TREE: TreeNode[] = [
  { key: 'review-cycle', label: 'Review cycle', actions: ALL, children: purposes('rc', ALL) },
  {
    // Each goal type is picked on its own; within one, every action goes together.
    key: 'goals', label: 'Goals', actions: ALL,
    children: [
      { key: 'goals-company', label: 'Company goals', actions: ALL, allOrNothing: true },
      { key: 'goals-organization', label: 'Organization goals', actions: ALL, allOrNothing: true },
    ],
  },
  {
    key: 'report', label: 'Report', actions: VIEW_CREATE,
    children: [
      // The toggle sits right under Review results (no extra "Review cycle" level); purpose keys keep their 'report-rc' prefix so saved roles still load.
      {
        key: 'report-results', label: 'Review results', actions: VIEW_CREATE,
        toggleLabel: 'Same scope as review cycle module setting',
        children: purposes('report-rc', VIEW_CREATE),
      },
      // All or nothing, like the Goals module: View and Create go together.
      { key: 'report-goals', label: 'Goals result', actions: VIEW_CREATE, allOrNothing: true },
      {
        key: 'report-9box', label: '9-box matrix', actions: VIEW_CREATE,
        toggleLabel: 'Same scope as review cycle module setting',
        children: purposes('report-9box', VIEW_CREATE),
      },
    ],
  },
  {
    key: 'dashboard', label: 'Dashboard', actions: VIEW_CREATE,
    children: [
      {
        key: 'dashboard-rc', label: 'Review cycle', actions: VIEW,
        toggleLabel: 'Same scope as review cycle module setting',
        children: purposes('dashboard-rc', VIEW),
      },
    ],
  },
]

// ─── State ──────────────────────────────────────────────────────────────────
/** A node and every node beneath it, whatever is shown. */
const everyNode = (n: TreeNode): TreeNode[] => [n, ...(n.children ?? []).flatMap(everyNode)]
const collapsed = ref<Record<string, boolean>>({})
const applied = ref<Record<string, boolean>>({})
const granted = ref<Record<string, boolean>>({})
const cellKey = (node: TreeNode, action: Action) => `${node.key}:${action}`

;(function seedToggles(nodes: TreeNode[]) {
  nodes.forEach((n) => {
    if (n.toggleLabel) applied.value[n.key] = true
    if (n.children) seedToggles(n.children)
  })
})(TREE)

// The parent form owns the saved selection so it survives Save → Edit (and a Version 1 / 2 switch).
const props = defineProps<{ search?: string }>()
const model = defineModel<{ granted: Record<string, boolean>, applied: Record<string, boolean> }>()
if (model.value) {
  granted.value = { ...model.value.granted }
  applied.value = { ...applied.value, ...model.value.applied }
}
watch([granted, applied], () => { model.value = { granted: { ...granted.value }, applied: { ...applied.value } } }, { deep: true })

// ─── Module search: a module shows when its name or any row beneath it matches ─
const query = computed(() => (props.search ?? '').trim().toLowerCase())
const labelMatches = (n: TreeNode) => n.label.toLowerCase().includes(query.value)
const descendantMatches = (n: TreeNode): boolean => !!query.value && (n.children ?? []).some(c => labelMatches(c) || descendantMatches(c))
const visibleTree = computed(() => (query.value ? TREE.filter(n => labelMatches(n) || descendantMatches(n)) : TREE))

/** A node whose toggle is on stands for its whole subtree: no caret, no children. */
const hasChildren = (node: TreeNode) => !!node.children?.length && !applied.value[node.key]
// A search hit beneath a node opens it, whatever the caret says.
const isOpen = (node: TreeNode) => hasChildren(node) && (descendantMatches(node) || !collapsed.value[node.key])
/** The node plus every descendant that is currently part of the tree. */
function subtree(node: TreeNode): TreeNode[] {
  return [node, ...(hasChildren(node) ? node.children!.flatMap(subtree) : [])]
}

interface Row { node: TreeNode, depth: number }
const rows = computed(() => {
  const out: Row[] = []
  const walk = (nodes: TreeNode[], depth: number) => nodes.forEach((n) => {
    out.push({ node: n, depth })
    if (isOpen(n)) walk(n.children!, depth + 1)
  })
  walk(visibleTree.value, 0)
  return out
})

// ─── What the acting user may grant ──────────────────────────────────────────
// Reason one cell is locked ('' = free). Node keys encode the module, purpose and
// employment status (e.g. "rc-evaluation-intern", "report-9box", "dashboard-rc").
// PRD S3: Dashboard follows Review cycle's scope, so it stays off until something in Review cycle is granted.
const NO_REVIEW_TYPE = 'Select at least one review type in Review cycle first'
const reviewCycleNode = TREE.find(n => n.key === 'review-cycle')!
const hasReviewCycleGrant = computed(() => everyNode(reviewCycleNode).some(n => n.actions.some(a => granted.value[cellKey(n, a)])))
watch(hasReviewCycleGrant, (on) => {
  if (!on) everyNode(TREE.find(n => n.key === 'dashboard')!).forEach((n) => { n.actions.forEach((a) => { granted.value[cellKey(n, a)] = false }) })
})
function nodeReason(node: TreeNode, action: Action) {
  if (node.key.startsWith('dashboard')) return actor.dashboardReason() || (hasReviewCycleGrant.value ? '' : NO_REVIEW_TYPE)
  const purpose = /-(competency|performance|evaluation)$/.exec(node.key)?.[1]
  const status = /-evaluation-(\w+)$/.exec(node.key)?.[1]
  return actor.actionReason(action)
    || (node.key.startsWith('report-9box') ? actor.reportReason('9-box matrix') : '')
    || (purpose ? actor.purposeReason(purpose) : '')
    || (status ? actor.statusReason(status) : '')
}

// ─── Checkbox state (a parent's box reflects its whole subtree) ─────────────
// Only cells the acting user may grant count: a parent's box ticks / unticks just those.
const cellsOf = (node: TreeNode, action: Action) => subtree(node).filter(n => n.actions.includes(action) && !nodeReason(n, action))
function cellState(node: TreeNode, action: Action) {
  const cells = cellsOf(node, action)
  const on = cells.filter(n => granted.value[cellKey(n, action)]).length
  return { checked: on === cells.length && on > 0, indeterminate: on > 0 && on < cells.length }
}
function setCell(node: TreeNode, action: Action, value: boolean) {
  cellsOf(node, action).forEach((n) => { granted.value[cellKey(n, action)] = value })
}
// All-or-nothing modules (Goals): the backend stores either every action or none, so any box beneath
// the owner ticks / unticks all of them together. A hover tooltip says why.
const AON_HINT = 'Goals access applies to View, Create, Edit and Delete together'
const aonOwner: Record<string, TreeNode> = {}
;(function mapOwners(nodes: TreeNode[], owner?: TreeNode) {
  nodes.forEach((n) => {
    const o = n.allOrNothing ? n : owner
    if (o) aonOwner[n.key] = o
    if (n.children) mapOwners(n.children, o)
  })
})(TREE)
/** The all-or-nothing groups a box drives: its own owner, or (for a parent whose children are all all-or-nothing, like Goals) those children. */
const aonParent = (node: TreeNode) => !!node.children?.length && node.children.every(c => c.allOrNothing)
const aonOwners = (node: TreeNode): TreeNode[] => (aonOwner[node.key] ? [aonOwner[node.key]!] : aonParent(node) ? node.children! : [])
const GOALS_RESULT_HINT = 'Goals result access applies to View and Create together'
const aonHint = (node: TreeNode) => {
  const owners = aonOwners(node)
  if (!owners.length) return ''
  return owners.every(o => o.key === 'report-goals') ? GOALS_RESULT_HINT : AON_HINT
}
/** No partial grants: if the user can't grant every cell beneath an owner, the whole group is locked. */
const aonReason = (node: TreeNode) => aonOwners(node).flatMap(everyNode).flatMap(n => n.actions.map(a => nodeReason(n, a))).find(Boolean) ?? ''
function setAllOrNothing(owners: TreeNode[], value: boolean) {
  owners.flatMap(everyNode).forEach((n) => { n.actions.forEach((a) => { granted.value[cellKey(n, a)] = value }) })
  syncAonParents()
}
// A parent of all-or-nothing groups (Goals) holds an action only when every group beneath it does.
function syncAonParents() {
  everyNode({ key: '', label: '', actions: [], children: TREE }).forEach((p) => {
    const groups = aonParent(p) ? p.children! : []
    if (groups.length) p.actions.forEach((a) => { granted.value[cellKey(p, a)] = groups.every(g => granted.value[cellKey(g, a)]) })
  })
}

/** A box is locked when nothing beneath it can be granted; the first reason found explains it. */
function cellReason(node: TreeNode, action: Action) {
  if (aonReason(node)) return aonReason(node)
  if (cellsOf(node, action).length) return ''
  return subtree(node).filter(n => n.actions.includes(action)).map(n => nodeReason(n, action)).find(Boolean) ?? ''
}
const grantableActions = (node: TreeNode) => ACTIONS.filter(a => node.actions.includes(a.key) && cellsOf(node, a.key).length)
function moduleState(node: TreeNode) {
  const states = grantableActions(node).map(a => cellState(node, a.key))
  const checked = states.length > 0 && states.every(s => s.checked)
  return { checked, indeterminate: !checked && states.some(s => s.checked || s.indeterminate) }
}
// Create / Edit / Delete need View: ticking one also ticks View; unticking View clears the rest.
function toggleCell(node: TreeNode, action: Action, value: boolean) {
  if (aonOwners(node).length) return setAllOrNothing(aonOwners(node), value)
  setCell(node, action, value)
  if (action !== 'view' && value && node.actions.includes('view')) setCell(node, 'view', true)
  if (action === 'view' && !value) node.actions.forEach(a => setCell(node, a, false))
}
const setModule = (node: TreeNode, value: boolean) => (aonOwners(node).length ? setAllOrNothing(aonOwners(node), value) : node.actions.forEach(a => setCell(node, a, value)))
const moduleReason = (node: TreeNode) => aonReason(node) || (grantableActions(node).length ? '' : node.actions.map(a => cellReason(node, a)).find(Boolean) ?? '')

// Caption under the "Same scope" toggle: the parts of the referenced module (Review cycle / Goals)
// that have something granted. Empty until the user picks something there, and then no caption.
const isGranted = (n: TreeNode) => everyNode(n).some(d => ACTIONS.some(a => granted.value[cellKey(d, a.key)]))
function scopeCaption(node: TreeNode) {
  const name = /as (.+?) module/.exec(node.toggleLabel ?? '')?.[1]
  const source = TREE.find(t => t.label.toLowerCase() === name)
  const included = (source?.children ?? []).filter(isGranted).map(c => c.label.toLowerCase())
  return included.length ? `Includes ${new Intl.ListFormat('en').format(included)}` : ''
}
const toggleOpen = (node: TreeNode) => { collapsed.value[node.key] = !collapsed.value[node.key] }
// On: the node's own boxes stand for everything beneath it (see `subtree`).
const setApplied = (node: TreeNode, value: boolean) => { applied.value[node.key] = value }

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
// Indent is 24px per level, the same at every depth (the Figma drifts).
// Literal values: Panda extracts css() at build time, so these can't be computed.
const indentClass = [
  css({ paddingLeft: '0px' }),
  css({ paddingLeft: '24px' }),
  css({ paddingLeft: '48px' }),
  css({ paddingLeft: '72px' }),
  css({ paddingLeft: '96px' }),
  css({ paddingLeft: '120px' }),
]
// The tallest Permission cell is 2 lines (label + toggle), so the whole table is middle-aligned.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Group rows (bold title) sit on the surface tone; every row beneath them is neutral.
const groupCell = css({ background: 'background.surface' })
const childCell = css({ background: 'background.neutral' })
const permissionCol = css({ width: '440px' })
const actionCol = css({ textAlign: 'center' })
const actionBox = css({ display: 'flex', justifyContent: 'center' })
const table = css({ tableLayout: 'fixed', width: '100%' })
const line = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
// The caret slot is always reserved so sibling checkboxes line up with or without one.
const caretSlot = css({ width: '20px', height: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' })
const caretButton = css({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '24px', cursor: 'pointer', color: 'text.secondary' })
const groupLabel = css({ fontWeight: '600' })
// The table cell is nowrap; let the toggle label and caption wrap inside the Module column.
const moduleBody = css({ flex: '1', minWidth: '0' })
const toggleBlock = css({ marginTop: '2', whiteSpace: 'normal' })
const noResult = css({ textAlign: 'center', paddingBlock: '8' })
</script>

<template>
  <MpTableContainer>
    <MpTable :is-hoverable="false" :class="table">
      <MpTableHead>
        <MpTableRow>
          <MpTableCell as="th" :class="[headCell, permissionCol]">
            Module
          </MpTableCell>
          <MpTableCell v-for="a in ACTIONS" :key="`h-${a.key}`" as="th" :class="[headCell, actionCol]">{{ a.label }}</MpTableCell>
        </MpTableRow>
      </MpTableHead>
      <MpTableBody>
        <MpTableRow v-for="{ node, depth } in rows" :key="node.key" :data-qa="`roles-v2-row-${node.key}`">
          <MpTableCell as="td" :class="[cell, permissionCol, depth === 0 ? groupCell : childCell]">
            <div :class="[line, indentClass[depth]]">
              <span :class="caretSlot">
                <button
                  v-if="hasChildren(node)"
                  type="button"
                  :class="caretButton"
                  :aria-label="`${isOpen(node) ? 'Collapse' : 'Expand'} ${node.label}`"
                  :aria-expanded="isOpen(node)"
                  @click="toggleOpen(node)"
                >
                  <MpIcon :name="isOpen(node) ? 'caret-down' : 'caret-right'" size="sm" />
                </button>
              </span>
              <div>
                <ManageUserRolesLock :reason="moduleReason(node) || aonHint(node)"><MpCheckbox :is-disabled="!!moduleReason(node)"
                  :id="`roles-v2-module-${node.key}`"
                  :is-checked="moduleState(node).checked"
                  :is-indeterminate="moduleState(node).indeterminate"
                  @update:is-checked="(v: boolean) => setModule(node, v)"
                >
                  <span :class="depth === 0 && groupLabel">{{ node.label }}</span>
                </MpCheckbox></ManageUserRolesLock>
                <div v-if="node.toggleLabel" :class="toggleBlock">
                  <ManageUserRolesLock :reason="moduleReason(node)">
                    <MpToggle :id="`roles-v2-apply-${node.key}`" :is-checked="applied[node.key]" :is-disabled="!!moduleReason(node)" @update:is-checked="(v: boolean) => setApplied(node, v)">
                      {{ node.toggleLabel }}
                      <template v-if="applied[node.key] && !moduleReason(node) && scopeCaption(node)" #description>{{ scopeCaption(node) }}</template>
                    </MpToggle>
                  </ManageUserRolesLock>
                </div>
              </div>
            </div>
          </MpTableCell>
          <MpTableCell v-for="a in ACTIONS" :key="`${node.key}-${a.key}`" as="td" :class="[cell, actionCol, depth === 0 ? groupCell : childCell]">
            <!-- An open parent hands its boxes to its children -->
            <div v-if="node.actions.includes(a.key) && !isOpen(node)" :class="actionBox">
              <ManageUserRolesLock :reason="cellReason(node, a.key) || aonHint(node)"><MpCheckbox :is-disabled="!!cellReason(node, a.key)"
                :id="`roles-v2-${node.key}-${a.key}`"
                :is-checked="cellState(node, a.key).checked"
                :is-indeterminate="cellState(node, a.key).indeterminate"
                :aria-label="`${a.label} ${node.label}`"
                @update:is-checked="(v: boolean) => toggleCell(node, a.key, v)"
              /></ManageUserRolesLock>
            </div>
          </MpTableCell>
        </MpTableRow>
        <MpTableRow v-if="!rows.length">
          <MpTableCell as="td" :colspan="ACTIONS.length + 1" :class="noResult">
            No result found. You can try searching different keywords.
          </MpTableCell>
        </MpTableRow>
      </MpTableBody>
    </MpTable>
  </MpTableContainer>
</template>
