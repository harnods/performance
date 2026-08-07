<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Succession plan (list)
  Replicated from production (talenta-performance:
    src/views/talent-management/succession-pool/Index.vue).
  Two views via a segmented control — Key Position & Employee — a left
  Organization filter, and a search box. Pixel3 + talenta-performance-d
  conventions (default layout, #page-header-actions teleport, Default table).
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex, MpButton, MpText, MpIcon, MpAvatar, MpInput, MpInputGroup, MpInputLeftAddon,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  css,
} from '@mekari/pixel3'
import { SUCCESSION_POOLS, employeeRows, readinessLabel, ORGANIZATIONS, poolById } from '~/utils/succession'
import { targetsForScopeValue } from '~/utils/competency'
import type { Employee } from '~/utils/employees'

definePageMeta({ title: 'Succession plans', layout: 'default' })

const router = useRouter()

const tab = ref<'key-position' | 'employee'>('key-position')
const search = ref('')
const orgFilter = ref('')
const orgOptions = ORGANIZATIONS.map(o => ({ value: o, label: o }))

const keyPositionRows = computed(() => SUCCESSION_POOLS.filter(p =>
  (!orgFilter.value || p.organization === orgFilter.value)
  && (!search.value || p.keyPosition.toLowerCase().includes(search.value.toLowerCase())),
))
// Rows removed this session (mock isn't reactive/persisted) — filtered out live.
const removedKeys = ref<Set<string>>(new Set())
const rowKey = (poolId: string, empId: string) => `${poolId}:${empId}`
const empRows = computed(() => employeeRows().filter(r =>
  !removedKeys.value.has(rowKey(r.poolId, r.employee.id))
  && (!orgFilter.value || r.organization === orgFilter.value)
  && (!search.value || r.employee.name.toLowerCase().includes(search.value.toLowerCase())),
))

function openDetail(id: string) { router.push(`/talents/succession-plans/${id}`) }
function openProfile(employeeId: string) { router.push(`/talents/talent-directory/${employeeId}`) }
function openCreate() { router.push('/talents/succession-plans/create') }

// Row action modals (shared components), same set as the plan detail page.
type EmpRow = ReturnType<typeof employeeRows>[number]
const promoteEmp = ref<Employee | null>(null)
const promoteKp = ref<{ value: string, label: string }>({ value: '', label: '' })
const readinessEmp = ref<Employee | null>(null)
const readinessVal = ref('')
const assessEmp = ref<Employee | null>(null)
const assessGroups = ref<{ group: string, target: number }[]>([])
const removeEmp = ref<Employee | null>(null)
const removeKp = ref('')
const removeRow = ref<EmpRow | null>(null)
function confirmRemove() {
  if (removeRow.value) removedKeys.value = new Set(removedKeys.value).add(rowKey(removeRow.value.poolId, removeRow.value.employee.id))
}
function openPromote(r: EmpRow) {
  promoteEmp.value = r.employee
  promoteKp.value = { value: poolById(r.poolId)?.keyPositionValue ?? '', label: r.keyPosition }
}
function openReadiness(r: EmpRow) {
  readinessEmp.value = r.employee
  readinessVal.value = r.readiness
}
function openAssess(r: EmpRow) {
  const p = poolById(r.poolId)
  assessEmp.value = r.employee
  assessGroups.value = p ? targetsForScopeValue(p.keyPosition, p.scopeValue) : []
}
function openRemove(r: EmpRow) {
  removeRow.value = r
  removeEmp.value = r.employee
  removeKp.value = r.keyPosition
}

// ─── Column sort (behaviour from goal-cycles/index.vue) ───────────────────────
// sortKey '' = default order. Keys differ per tab, so the tab watcher resets it.
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const kpSortTypes: Record<string, 'text' | 'number'> = { keyPosition: 'text', organization: 'text', successors: 'number' }
const empSortTypes: Record<string, 'text' | 'number'> = { employee: 'text', keyPosition: 'text', organization: 'text', readiness: 'number' }
function kpSortValue(p: typeof keyPositionRows.value[number], key: string): string | number {
  if (key === 'keyPosition') return p.keyPosition
  if (key === 'organization') return p.organization
  if (key === 'successors') return p.successors.length
  return ''
}
function empSortValue(r: typeof empRows.value[number], key: string): string | number {
  if (key === 'employee') return r.employee.name
  if (key === 'keyPosition') return r.keyPosition
  if (key === 'organization') return r.organization
  if (key === 'readiness') return r.readiness === '99' ? 0 : Number(r.readiness) // Ready now = most ready → sorts first asc
  return ''
}
function sortRows<T>(rows: T[], valueOf: (r: T, k: string) => string | number): T[] {
  if (!sortKey.value) return rows
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) =>
    String(valueOf(a, sortKey.value)).localeCompare(String(valueOf(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' }) * dir,
  )
}
const sortedKeyPositionRows = computed(() => sortRows(keyPositionRows.value, kpSortValue))
const sortedEmpRows = computed(() => sortRows(empRows.value, empSortValue))

// ─── Pagination (matches goal-cycles/index.vue) ───────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => (tab.value === 'key-position' ? keyPositionRows.value.length : empRows.value.length))
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const pagedKeyPositionRows = computed(() => sortedKeyPositionRows.value.slice(showingFrom.value - 1, showingTo.value))
const pagedEmpRows = computed(() => sortedEmpRows.value.slice(showingFrom.value - 1, showingTo.value))
watch([search, orgFilter], () => { currentPage.value = 1 })
// Switching tab resets both sort (columns differ) and page.
watch(tab, () => { sortKey.value = ''; currentPage.value = 1 })

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', flexWrap: 'wrap' })
// Page-level tabs (behaviour/style from reviews/pending-actions/index.vue).
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2', paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400', color: 'text.secondary',
  background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', fontSize: '12px', fontWeight: '600', color: 'text.secondary', textAlign: 'left', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const nameText = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const kpLink = css({ fontSize: '14px', fontWeight: '400', lineHeight: '20px', color: 'text.link', cursor: 'pointer', width: 'fit-content', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const subText = css({ fontSize: '12px', color: 'text.secondary' })
const avatarGroup = css({ display: 'flex', alignItems: 'center' })
const avatarWrap = css({ marginLeft: '-8px', border: '2px solid', borderColor: 'background.stage', borderRadius: 'full', _first: { marginLeft: '0' } })
const moreAvatar = css({ marginLeft: '-8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: 'full', background: 'background.neutral.subtle', border: '2px solid', borderColor: 'background.stage', fontSize: '12px', fontWeight: '600', color: 'text.secondary' })
const emptyBlock = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1', paddingBlock: '16', textAlign: 'center' })
const captionText = css({ color: 'text.secondary' })
// Header label + sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
// Avatar hover coachmark (behaviour from goals goal detail).
const coachCardBase = { position: 'absolute', left: '0', zIndex: '30', display: 'flex', alignItems: 'center', gap: '3', background: 'white', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'md', boxShadow: '0px 4px 16px rgba(16, 24, 40, 0.12)', paddingInline: '3', paddingBlock: '2', whiteSpace: 'nowrap' } as const
const coachCard = css({ ...coachCardBase, top: 'calc(100% + 8px)' })
// Last row opens the card upward so it isn't clipped by the table container.
const coachCardUp = css({ ...coachCardBase, bottom: 'calc(100% + 8px)' })
const coachText = css({ display: 'flex', flexDirection: 'column', gap: '0' })
const coachName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const coachMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const avatarItem = css({ position: 'relative', display: 'inline-flex' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="primary" left-icon="add" @click="openCreate">Create succession plan</MpButton>
  </Teleport>

  <!-- Page-level tabs: two views of the same succession data -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <button type="button" :class="tab === 'key-position' ? tabItemActive : tabItem" @click="tab = 'key-position'">Key positions</button>
      <button type="button" :class="tab === 'employee' ? tabItemActive : tabItem" @click="tab = 'employee'">Successor talents</button>
    </div>
  </Teleport>

  <div :class="page">
    <!-- Filter bar -->
    <div :class="filterBar">
      <MpFlex align="center" gap="2">
        <div :class="css({ width: '240px' })">
          <PxSelectPopover v-model="orgFilter" :options="orgOptions" placeholder="Organizations" :width="'240px'" searchable is-clearable />
        </div>
      </MpFlex>
      <MpFlex align="center" gap="3">
        <MpInputGroup :class="css({ width: '260px' })">
          <MpInputLeftAddon><MpIcon name="search" size="sm" /></MpInputLeftAddon>
          <MpInput v-model="search" :placeholder="tab === 'key-position' ? 'Search key position...' : 'Search employee...'" />
        </MpInputGroup>
      </MpFlex>
    </div>

    <!-- Table + pagination grouped flush (gap 0), like other index pages -->
    <MpFlex direction="column">
    <!-- Key Position view -->
    <MpTableContainer v-if="tab === 'key-position'">
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Key position</span><PxColumnSortMenu col-key="keyPosition" :sort-type="kpSortTypes.keyPosition" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Organization</span><PxColumnSortMenu col-key="organization" :sort-type="kpSortTypes.organization" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Successor talents</span><PxColumnSortMenu col-key="successors" :sort-type="kpSortTypes.successors" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" :class="headCell" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="(p, pi) in pagedKeyPositionRows" :key="p.id">
            <MpTableCell as="td" :class="cell">
              <span :class="kpLink" @click="openDetail(p.id)">{{ p.keyPosition }}</span>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">{{ p.organization }}</MpTableCell>
            <MpTableCell as="td" :class="cell">
              <div :class="avatarGroup">
                <span v-for="s in p.successors.slice(0, 5)" :key="s.employeeId" class="avatar-item" :class="[avatarWrap, avatarItem]">
                  <MpAvatar :id="`pool-${p.id}-${s.employeeId}`" :name="employeeById(s.employeeId)?.name" :src="employeeById(s.employeeId)?.photo" size="lg" variant-color="gray" />
                  <div class="coach-card" :class="pi === pagedKeyPositionRows.length - 1 ? coachCardUp : coachCard">
                    <MpAvatar :id="`pool-coach-${p.id}-${s.employeeId}`" :name="employeeById(s.employeeId)?.name" :src="employeeById(s.employeeId)?.photo" size="md" variant-color="gray" />
                    <div :class="coachText">
                      <span :class="coachName">{{ employeeById(s.employeeId)?.name }}</span>
                      <span :class="coachMeta">{{ employeeById(s.employeeId)?.code }} | {{ employeeById(s.employeeId)?.title }} | {{ employeeById(s.employeeId)?.department }}</span>
                    </div>
                  </div>
                </span>
                <span v-if="p.successors.length > 5" :class="moreAvatar">+{{ p.successors.length - 5 }}</span>
              </div>
            </MpTableCell>
            <MpTableCell as="td" :class="[cell, css({ textAlign: 'right' })]">
              <MpButton variant="secondary" @click="openDetail(p.id)">View details</MpButton>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
      <div v-if="!keyPositionRows.length" :class="emptyBlock">
        <MpIcon name="briefcase" size="lg" :class="css({ color: 'icon.secondary' })" />
        <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">No succession plan yet</MpText>
      </div>
    </MpTableContainer>

    <!-- Employee view -->
    <MpTableContainer v-else>
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Employee</span><PxColumnSortMenu col-key="employee" :sort-type="empSortTypes.employee" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Key position</span><PxColumnSortMenu col-key="keyPosition" :sort-type="empSortTypes.keyPosition" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Organization</span><PxColumnSortMenu col-key="organization" :sort-type="empSortTypes.organization" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Readiness</span><PxColumnSortMenu col-key="readiness" :sort-type="empSortTypes.readiness" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell as="th" :class="headCell" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="(r, i) in pagedEmpRows" :key="`${r.poolId}-${r.employee.id}-${i}`">
            <MpTableCell as="td" :class="cell">
              <MpFlex align="center" gap="2">
                <span class="avatar-item" :class="avatarItem">
                  <MpAvatar :id="`emp-${r.poolId}-${r.employee.id}`" :name="r.employee.name" :src="r.employee.photo" size="lg" variant-color="gray" />
                  <div class="coach-card" :class="i === pagedEmpRows.length - 1 ? coachCardUp : coachCard">
                    <MpAvatar :id="`emp-coach-${r.poolId}-${r.employee.id}`" :name="r.employee.name" :src="r.employee.photo" size="md" variant-color="gray" />
                    <div :class="coachText">
                      <span :class="coachName">{{ r.employee.name }}</span>
                      <span :class="coachMeta">{{ r.employee.code }} | {{ r.employee.title }} | {{ r.employee.department }}</span>
                    </div>
                  </div>
                </span>
                <MpFlex direction="column" gap="0">
                  <span :class="nameText">{{ r.employee.name }}</span>
                  <span :class="subText">{{ r.employee.code }} | {{ r.employee.title }} | {{ r.employee.department }}</span>
                </MpFlex>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">{{ r.keyPosition }}</MpTableCell>
            <MpTableCell as="td" :class="cell">{{ r.organization }}</MpTableCell>
            <MpTableCell as="td" :class="cell">{{ readinessLabel(r.readiness) }}</MpTableCell>
            <MpTableCell as="td" :class="[cell, css({ textAlign: 'right' })]">
              <MpPopover is-close-on-select use-portal placement="bottom-end">
                <MpPopoverTrigger>
                  <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                </MpPopoverTrigger>
                <MpPopoverContent :class="css({ minWidth: '180px' })">
                  <MpPopoverList>
                    <MpPopoverListItem @click="openPromote(r)">Promote</MpPopoverListItem>
                    <MpPopoverListItem v-if="poolById(r.poolId)?.assessmentType === 'manual'" @click="openAssess(r)">Update assessment</MpPopoverListItem>
                    <MpPopoverListItem @click="openReadiness(r)">Update readiness</MpPopoverListItem>
                    <MpPopoverListItem @click="openProfile(r.employee.id)">View details</MpPopoverListItem>
                    <MpPopoverListItem @click="openRemove(r)"><span :class="css({ color: 'text.danger' })">Remove from pool</span></MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
      <div v-if="!empRows.length" :class="emptyBlock">
        <MpIcon name="employee" size="lg" :class="css({ color: 'icon.secondary' })" />
        <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">No successor talent yet</MpText>
      </div>
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
        <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
        <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
      </div>
    </div>
    </MpFlex>
  </div>

  <!-- Row action modals (shared) -->
  <SuccessionPromoteModal
    :is-open="!!promoteEmp"
    :employee="promoteEmp"
    :key-position-value="promoteKp.value"
    :key-position-label="promoteKp.label"
    @update:is-open="v => { if (!v) promoteEmp = null }"
  />
  <SuccessionReadinessModal
    :is-open="!!readinessEmp"
    :employee="readinessEmp"
    :readiness="readinessVal"
    @update:is-open="v => { if (!v) readinessEmp = null }"
  />
  <SuccessionAssessmentModal
    :is-open="!!assessEmp"
    :employee="assessEmp"
    :groups="assessGroups"
    @update:is-open="v => { if (!v) assessEmp = null }"
  />
  <SuccessionRemoveModal
    :is-open="!!removeEmp"
    :employee="removeEmp"
    :key-position="removeKp"
    @update:is-open="v => { if (!v) removeEmp = null }"
    @confirm="confirmRemove"
  />
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered scoped `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }

/* Avatar hover coachmark — unlayered so it beats Panda's @layer utilities. */
.avatar-item .coach-card {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.12s ease, transform 0.12s ease, visibility 0.12s;
}
.avatar-item:hover { z-index: 20; }
.avatar-item:hover .coach-card {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
</style>
