<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goals dashboard — "Unassigned employees" drawer
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2644:87590)
  Token mode: Pixel 2.4

  Opened by clicking the GREY arc of the "Assigned employees" donut. Lists every
  active employee with no goal in the current scope, filterable by organization
  and direct report, and lets the admin send them a reminder.

  Drawer (not modal/page) per docs/patterns/page-form.md: a read-and-act list
  that never leaves the dashboard. ClientOnly wraps it for the same reason
  goal-cycles/index.vue does — Pixel's slide-in is animejs-driven and only plays
  on a fresh client mount.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpAvatar,
  MpCheckbox,
  MpInput,
  MpIcon,
  MpDrawer,
  MpDrawerOverlay,
  MpDrawerContent,
  MpDrawerHeader,
  MpDrawerCloseButton,
  MpDrawerBody,
  MpDrawerFooter,
  MpTableContainer,
  MpTable,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  toast,
  css,
} from '@mekari/pixel3'
import type { Employee } from '~/utils/employees'
import { employeeById, employeeMeta } from '~/utils/employees'
import { EMPLOYEE_MANAGER } from '~/composables/useGoalsStore'

const props = defineProps<{
  isOpen: boolean
  employees: Employee[]
  totalEmployees: number
}>()
const emit = defineEmits<{ (e: 'update:isOpen', v: boolean): void }>()

function close() { emit('update:isOpen', false) }

// ─── Filters ─────────────────────────────────────────────────────────────────
const organization = ref('')
const directReport = ref('')
const search = ref('')

const organizationOptions = computed(() =>
  [...new Set(props.employees.map(e => e.department))].sort().map(d => ({ value: d, label: d })),
)
// "Direct report" here means "reports to" — the manager the row rolls up to.
const managerOptions = computed(() => {
  const ids = [...new Set(props.employees.map(e => EMPLOYEE_MANAGER[e.id]).filter(Boolean))]
  return ids
    .map(id => ({ value: id, label: employeeById(id)?.name ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const filtered = computed(() => {
  let rows = props.employees
  if (organization.value) rows = rows.filter(e => e.department === organization.value)
  if (directReport.value) rows = rows.filter(e => EMPLOYEE_MANAGER[e.id] === directReport.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q))
  }
  return rows
})

// ─── Grouping by direct report (rowspan) ─────────────────────────────────────
// Everyone reporting to the same manager is one visual group: the Direct report
// cell is rendered once and spans the group. Rows are ordered so a group is
// always contiguous — a rowspan can only merge adjacent rows.
//
// ⚠️ Organization merges over the SAME span or not at all (docs/patterns/table.md):
// if every member of the group shares a department the cell spans the whole
// group, otherwise each row gets its own. Never a partial overlap — two columns
// disagreeing about how many physical rows they cover silently shifts every
// later <td> into the wrong column.
interface GroupedRow {
  employee: Employee
  showManager: boolean
  managerRowspan: number
  showOrg: boolean
  orgRowspan: number
}
const groupedRows = computed<GroupedRow[]>(() => {
  const byManager = new Map<string, Employee[]>()
  for (const e of filtered.value) {
    // Employees with no manager each stand alone rather than pooling into one
    // meaningless "no manager" block.
    const key = EMPLOYEE_MANAGER[e.id] ?? `__none__${e.id}`
    if (!byManager.has(key)) byManager.set(key, [])
    byManager.get(key)!.push(e)
  }

  const out: GroupedRow[] = []
  for (const members of byManager.values()) {
    const sameOrg = members.every(m => m.department === members[0].department)
    members.forEach((employee, i) => {
      out.push({
        employee,
        showManager: i === 0,
        managerRowspan: members.length,
        showOrg: sameOrg ? i === 0 : true,
        orgRowspan: sameOrg ? members.length : 1,
      })
    })
  }
  return out
})

// ─── Selection ───────────────────────────────────────────────────────────────
const selected = ref<Set<string>>(new Set())
const visibleIds = computed(() => filtered.value.map(e => e.id))
const isAllSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every(id => selected.value.has(id)))
const selectedCount = computed(() => selected.value.size)

function toggleSelect(id: string) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
function toggleSelectAll() {
  const next = new Set(selected.value)
  if (isAllSelected.value) visibleIds.value.forEach(id => next.delete(id))
  else visibleIds.value.forEach(id => next.add(id))
  selected.value = next
}

// Reset every time the drawer opens — a stale selection from a previous open
// would silently target people the admin can no longer see.
watch(() => props.isOpen, (open) => {
  if (!open) return
  selected.value = new Set()
  organization.value = ''
  directReport.value = ''
  search.value = ''
})

// The primary CTA is never disabled (docs/patterns/buttons.md) — nothing to
// remind is validated here and reported as an error toast instead.
function sendReminder() {
  const count = selectedCount.value || filtered.value.length
  if (count === 0) {
    toast.notify({
      id: 'goals-dash-unassigned-reminder-error',
      position: 'top-center',
      variant: 'error',
      title: 'Select at least one employee to remind',
    })
    return
  }
  close()
  toast.notify({
    id: 'goals-dash-unassigned-reminder',
    position: 'top-center',
    variant: 'success',
    title: count === 1 ? 'Reminder sent' : `Reminder sent to ${count} employees`,
  })
}

function managerNameFor(id: string) {
  const managerId = EMPLOYEE_MANAGER[id]
  return managerId ? employeeById(managerId) : undefined
}

// ─── Styles ──────────────────────────────────────────────────────────────────
// NOTE: drawer width comes from `size` only — MpModalContent writes
// `maxWidth: baseSizes[size]` as an INLINE style, which no class can override.
// The scale is sm 330 / md 448 / lg 684 / xl 920 / 2xl 1152 / full 100%.
// `xl` (920px) is the first step that fits the 816px table plus body padding
// without horizontal scrolling.
const description = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const filterRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', flexWrap: 'wrap', marginTop: '3', marginBottom: '4' })
const filterCluster = css({ display: 'flex', alignItems: 'center', gap: '6' })
const selectWidth = '240px'
const searchBox = css({ position: 'relative', width: '240px', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'icon.secondary', zIndex: '1', pointerEvents: 'none' })
// Custom table (docs/patterns/table.md): merged rowspan cells + a right divider
// on every column, so it takes the rounded outer border and verticalAlign top —
// a merged cell spanning several rows must sit against the first of them.
const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: '6px', overflow: 'hidden' })
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '816px' })
const colEmployee = css({ width: '318px' })
const colManager = css({ width: '318px' })
const colOrg = css({ width: '180px' })
const cellBase = { paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' } as const
const colDivider = { borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default' } as const
const headCell = css({ ...cellBase, ...colDivider })
const headCellLast = css({ ...cellBase })
const tightCell = css({ ...cellBase, ...colDivider })
const tightCellLast = css({ ...cellBase })
const personName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const personMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const plainCell = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const emptyCell = css({ textAlign: 'center', paddingBlock: '8' })
const captionText = css({ color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
    <MpDrawer
      id="drawer-unassigned-employees"
      :is-open="isOpen"
      placement="right"
      size="xl"
      is-keep-alive
      @close="close"
    >
      <MpDrawerOverlay />
      <MpDrawerContent>
        <MpDrawerHeader>
          Unassigned employees ({{ employees.length }})
          <MpDrawerCloseButton @click="close" />
        </MpDrawerHeader>

        <MpDrawerBody>
          <MpText :class="description">
            {{ employees.length }} of {{ totalEmployees }} active employees have no goal set for this cycle.
          </MpText>

          <div :class="filterRow">
            <div :class="filterCluster">
              <PxSelectPopover
                v-model="organization"
                :options="organizationOptions"
                placeholder="Organization"
                :width="selectWidth"
                :is-clearable="true"
              />
              <PxSelectPopover
                v-model="directReport"
                :options="managerOptions"
                placeholder="Direct report"
                :width="selectWidth"
                :is-clearable="true"
              />
            </div>
            <div :class="searchBox">
              <MpIcon name="search" size="sm" :class="searchIcon" />
              <MpInput v-model="search" placeholder="Search..." />
            </div>
          </div>

          <div :class="tableOuterBorder">
            <MpTableContainer>
              <MpTable :is-hoverable="false" :class="fixedTable">
                <colgroup>
                  <col :class="colEmployee">
                  <col :class="colManager">
                  <col :class="colOrg">
                </colgroup>
                <MpTableHead>
                  <MpTableRow>
                    <MpTableCell as="th" :class="headCell">
                      <MpFlex align="center" gap="2">
                        <MpCheckbox :is-checked="isAllSelected" aria-label="Select all employees" @update:is-checked="toggleSelectAll" />
                        <span>Employee</span>
                      </MpFlex>
                    </MpTableCell>
                    <MpTableCell as="th" :class="headCell">Direct report</MpTableCell>
                    <MpTableCell as="th" :class="headCellLast">Organization</MpTableCell>
                  </MpTableRow>
                </MpTableHead>

                <MpTableBody>
                  <MpTableRow v-if="groupedRows.length === 0">
                    <MpTableCell as="td" :colspan="3" :class="[tightCellLast, emptyCell]">
                      <MpText size="label" :class="captionText">No employees match your filters.</MpText>
                    </MpTableCell>
                  </MpTableRow>

                  <MpTableRow v-for="row in groupedRows" :key="row.employee.id">
                    <MpTableCell as="td" :class="tightCell">
                      <MpFlex align="center" gap="2">
                        <MpCheckbox
                          :is-checked="selected.has(row.employee.id)"
                          :aria-label="`Select ${row.employee.name}`"
                          @update:is-checked="toggleSelect(row.employee.id)"
                        />
                        <MpAvatar :id="row.employee.id" :name="row.employee.name" :src="row.employee.photo" size="lg" variant-color="gray" />
                        <MpFlex direction="column" gap="0">
                          <span :class="personName">{{ row.employee.name }}</span>
                          <span :class="personMeta">{{ employeeMeta(row.employee) }}</span>
                        </MpFlex>
                      </MpFlex>
                    </MpTableCell>

                    <!-- Rendered once per manager group, spanning its rows -->
                    <MpTableCell v-if="row.showManager" as="td" :rowspan="row.managerRowspan" :class="tightCell">
                      <MpFlex v-if="managerNameFor(row.employee.id)" align="center" gap="2">
                        <MpAvatar
                          :id="managerNameFor(row.employee.id)!.id"
                          :name="managerNameFor(row.employee.id)!.name"
                          :src="managerNameFor(row.employee.id)!.photo"
                          size="lg"
                          variant-color="gray"
                        />
                        <MpFlex direction="column" gap="0">
                          <span :class="personName">{{ managerNameFor(row.employee.id)!.name }}</span>
                          <span :class="personMeta">{{ employeeMeta(managerNameFor(row.employee.id)!) }}</span>
                        </MpFlex>
                      </MpFlex>
                      <span v-else :class="personMeta">—</span>
                    </MpTableCell>

                    <MpTableCell v-if="row.showOrg" as="td" :rowspan="row.orgRowspan" :class="tightCellLast">
                      <span :class="plainCell">{{ row.employee.department }}</span>
                    </MpTableCell>
                  </MpTableRow>
                </MpTableBody>
              </MpTable>
            </MpTableContainer>
          </div>
        </MpDrawerBody>

        <MpDrawerFooter>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="sendReminder">Send reminder</MpButton>
        </MpDrawerFooter>
      </MpDrawerContent>
    </MpDrawer>
  </ClientOnly>
</template>
