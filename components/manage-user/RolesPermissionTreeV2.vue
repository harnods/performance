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
  toggleDefault?: boolean
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
    key: 'goals', label: 'Goals', actions: ALL,
    children: [
      { key: 'goals-company', label: 'Company goals', actions: ALL },
      { key: 'goals-organization', label: 'Organization goals', actions: ALL },
    ],
  },
  {
    key: 'report', label: 'Report', actions: VIEW_CREATE,
    children: [
      {
        key: 'report-results', label: 'Review results', actions: VIEW_CREATE,
        children: [
          {
            key: 'report-results-rc', label: 'Review cycle', actions: VIEW_CREATE,
            toggleLabel: 'Same scope as review cycle module setting',
            children: purposes('report-rc', VIEW_CREATE),
          },
        ],
      },
      { key: 'report-goals', label: 'Goals result', actions: VIEW_CREATE },
      { key: 'report-9box', label: '9-box matrix', actions: VIEW_CREATE },
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
      {
        key: 'dashboard-goals', label: 'Goals', actions: VIEW,
        toggleLabel: 'Same scope as goals module setting',
        toggleDefault: true,
        children: [
          { key: 'dashboard-goals-company', label: 'Company goals', actions: VIEW },
          { key: 'dashboard-goals-organization', label: 'Organization goals', actions: VIEW },
        ],
      },
    ],
  },
]

// ─── State ──────────────────────────────────────────────────────────────────
const collapsed = ref<Record<string, boolean>>({})
const applied = ref<Record<string, boolean>>({})
const granted = ref<Record<string, boolean>>({})
const cellKey = (node: TreeNode, action: Action) => `${node.key}:${action}`

;(function seedToggles(nodes: TreeNode[]) {
  nodes.forEach((n) => {
    if (n.toggleLabel) applied.value[n.key] = !!n.toggleDefault
    if (n.children) seedToggles(n.children)
  })
})(TREE)

/** A node whose toggle is on stands for its whole subtree: no caret, no children. */
const hasChildren = (node: TreeNode) => !!node.children?.length && !applied.value[node.key]
const isOpen = (node: TreeNode) => hasChildren(node) && !collapsed.value[node.key]
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
  walk(TREE, 0)
  return out
})

// ─── Checkbox state (a parent's box reflects its whole subtree) ─────────────
const cellsOf = (node: TreeNode, action: Action) => subtree(node).filter(n => n.actions.includes(action))
function cellState(node: TreeNode, action: Action) {
  const cells = cellsOf(node, action)
  const on = cells.filter(n => granted.value[cellKey(n, action)]).length
  return { checked: on === cells.length && on > 0, indeterminate: on > 0 && on < cells.length }
}
function setCell(node: TreeNode, action: Action, value: boolean) {
  cellsOf(node, action).forEach((n) => { granted.value[cellKey(n, action)] = value })
}
function moduleState(node: TreeNode) {
  const states = ACTIONS.filter(a => node.actions.includes(a.key)).map(a => cellState(node, a.key))
  const checked = states.every(s => s.checked)
  return { checked, indeterminate: !checked && states.some(s => s.checked || s.indeterminate) }
}
const setModule = (node: TreeNode, value: boolean) => node.actions.forEach(a => setCell(node, a, value))

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
const toggleBlock = css({ marginTop: '2' })
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
                <MpCheckbox
                  :id="`roles-v2-module-${node.key}`"
                  :is-checked="moduleState(node).checked"
                  :is-indeterminate="moduleState(node).indeterminate"
                  @update:is-checked="(v: boolean) => setModule(node, v)"
                >
                  <span :class="depth === 0 && groupLabel">{{ node.label }}</span>
                </MpCheckbox>
                <div v-if="node.toggleLabel" :class="toggleBlock">
                  <MpToggle :id="`roles-v2-apply-${node.key}`" :is-checked="applied[node.key]" @update:is-checked="(v: boolean) => setApplied(node, v)">
                    {{ node.toggleLabel }}
                  </MpToggle>
                </div>
              </div>
            </div>
          </MpTableCell>
          <MpTableCell v-for="a in ACTIONS" :key="`${node.key}-${a.key}`" as="td" :class="[cell, actionCol, depth === 0 ? groupCell : childCell]">
            <!-- An open parent hands its boxes to its children -->
            <div v-if="node.actions.includes(a.key) && !isOpen(node)" :class="actionBox">
              <MpCheckbox
                :id="`roles-v2-${node.key}-${a.key}`"
                :is-checked="cellState(node, a.key).checked"
                :is-indeterminate="cellState(node, a.key).indeterminate"
                :aria-label="`${a.label} ${node.label}`"
                @update:is-checked="(v: boolean) => setCell(node, a.key, v)"
              />
            </div>
          </MpTableCell>
        </MpTableRow>
      </MpTableBody>
    </MpTable>
  </MpTableContainer>
</template>
