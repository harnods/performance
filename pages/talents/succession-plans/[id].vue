<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Succession plan detail
  Replicated from production (talenta-performance:
    src/views/talent-management/succession-pool/Detail.vue).
  Reached from the Key Position table's "View details" action. Lists the pool's
  successor talents: Employee · Organization · Readiness · Assessment date, with
  an organization filter + search, per-row actions, sort, and pagination — all
  mirroring the index tables + the repo table conventions.
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
import { toast } from '@mekari/pixel3'
import { poolById, readinessLabel, assessmentDate, type SuccessorTalent } from '~/utils/succession'
import { POSITION_INFO, scopeOptions, targetsForScopeValue, type ScopeType } from '~/utils/competency'
import { employeeById } from '~/utils/employees'

definePageMeta({
  // Title resolves to the pool's key position via the layout's fallback
  // (successionTitleFallback) — no static title so the fallback wins.
  layout: 'default',
  breadcrumb: { label: 'Succession plans', to: '/talents/succession-plans' },
})

const route = useRoute()
const router = useRouter()
const pool = computed(() => poolById(route.params.id as string))
// Unknown pool → back to the list (the mock only seeds a few).
watchEffect(() => { if (import.meta.client && !pool.value) router.replace('/talents/succession-plans') })

const activeTab = ref<'talents' | 'info'>('talents')

// ─── Succession plan info (competency assignment for the key position) ────────
const SCOPE_LABEL: Record<ScopeType, string> = { 'job-level': 'Job level', grade: 'Grade', class: 'Class' }
const assignment = computed(() => (pool.value ? POSITION_INFO[pool.value.keyPosition] : undefined))
const scopeLabel = computed(() => (assignment.value ? SCOPE_LABEL[assignment.value.scope] : ''))
// The single scope value this plan applies to (chosen in Step 2).
const scopeValueLabel = computed(() => {
  const a = assignment.value
  if (!a || !pool.value) return ''
  return scopeOptions(a.scope).find(o => o.value === pool.value!.scopeValue)?.label ?? pool.value.scopeValue
})
// Competency targets resolved for THAT scope value.
const standardGroups = computed(() => (pool.value && assignment.value ? targetsForScopeValue(pool.value.keyPosition, pool.value.scopeValue) : []))

// Local, reactive copy of the pool's successors so additions/removals reflect
// in the table this session (the module mock isn't reactive/persisted).
const successors = ref<SuccessorTalent[]>([])
watch(pool, (p) => { successors.value = p ? p.successors.map(s => ({ ...s })) : [] }, { immediate: true })

interface Row { id: string, name: string, code: string, title: string, department: string, photo?: string, readiness: string, date: Date }
const allRows = computed<Row[]>(() =>
  successors.value.flatMap((s) => {
    const e = employeeById(s.employeeId)
    if (!e || !pool.value) return []
    return [{ id: e.id, name: e.name, code: e.code, title: e.title, department: e.department, photo: e.photo, readiness: s.readiness, date: assessmentDate(pool.value.id, e.id) }]
  }),
)

// ─── Add successor talent (page-header action) ────────────────────────────────
const isPickerOpen = ref(false)
function onAddContinue(ids: string[]) {
  const existing = new Map(successors.value.map(s => [s.employeeId, s]))
  const before = successors.value.length
  successors.value = ids.map(id => existing.get(id) ?? { employeeId: id, readiness: '' })
  const added = successors.value.length - before
  if (added > 0) toast.notify({ id: 'succ-added', position: 'top-center', variant: 'success', title: `${added} successor talent added` })
}
function removeTalent(id: string) { successors.value = successors.value.filter(s => s.employeeId !== id) }

// ─── Filter ──────────────────────────────────────────────────────────────────
const search = ref('')
const orgFilter = ref('')
const orgOptions = computed(() => [...new Set(allRows.value.map(r => r.department))].sort().map(o => ({ value: o, label: o })))
const filtered = computed(() => allRows.value.filter(r =>
  (!orgFilter.value || r.department === orgFilter.value)
  && (!search.value || r.name.toLowerCase().includes(search.value.toLowerCase()) || r.code.toLowerCase().includes(search.value.toLowerCase())),
))

// ─── Column sort (behaviour from index.vue) ───────────────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const sortTypes: Record<string, 'text' | 'number' | 'date'> = { employee: 'text', organization: 'text', readiness: 'number', date: 'date' }
function sortValue(r: Row, key: string): string | number {
  if (key === 'employee') return r.name
  if (key === 'organization') return r.department
  if (key === 'readiness') return Number(r.readiness)
  if (key === 'date') return r.date.getTime()
  return ''
}
const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' }) * dir,
  )
})

// ─── Pagination (matches index.vue) ───────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const currentPage = ref(1)
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => sorted.value.slice(showingFrom.value - 1, showingTo.value))
watch([search, orgFilter], () => { currentPage.value = 1 })

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const page = css({ display: 'flex', flexDirection: 'column', gap: '5' })
// Page-level tabs (style from index/pending-actions).
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
// Info tab (flat key-value rows, no card).
const infoTabRow = css({ display: 'flex', alignItems: 'flex-start', gap: '6' })
const infoSection = css({ display: 'flex', flexDirection: 'column', gap: '4', flex: '1', maxWidth: '640px' })
const kvRow = css({ display: 'flex', gap: '4' })
const kvLabel = css({ flex: '0 0 200px', fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const kvValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', fontWeight: '400' })
const h3Text = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const borderedTable = css({ border: '1px solid', borderColor: 'border.default', borderRadius: 'md', overflow: 'hidden', '& tbody tr:last-child td': { borderBottom: 'none' } })
const cellHRight = css({ paddingTop: '2', paddingBottom: '2', fontSize: '12px', fontWeight: '600', color: 'text.secondary', textAlign: 'right', verticalAlign: 'middle' })
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3', flexWrap: 'wrap' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', fontSize: '12px', fontWeight: '600', color: 'text.secondary', textAlign: 'left', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const nameText = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const subText = css({ fontSize: '12px', color: 'text.secondary' })
const captionText = css({ color: 'text.secondary' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const emptyBlock = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1', paddingBlock: '16', textAlign: 'center' })
// Avatar hover coachmark (behaviour from index.vue).
const coachCardBase = { position: 'absolute', left: '0', zIndex: '30', display: 'flex', alignItems: 'center', gap: '3', background: 'white', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'md', boxShadow: '0px 4px 16px rgba(16, 24, 40, 0.12)', paddingInline: '3', paddingBlock: '2', whiteSpace: 'nowrap' } as const
const coachCard = css({ ...coachCardBase, top: 'calc(100% + 8px)' })
const coachCardUp = css({ ...coachCardBase, bottom: 'calc(100% + 8px)' })
const coachText = css({ display: 'flex', flexDirection: 'column', gap: '0' })
const coachName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const coachMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const avatarItem = css({ position: 'relative', display: 'inline-flex' })
</script>

<template>
  <Teleport to="#page-header-actions" defer>
    <MpButton variant="primary" left-icon="add" @click="isPickerOpen = true">Add successor talent</MpButton>
  </Teleport>

  <!-- Page-level tabs -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <button type="button" :class="activeTab === 'talents' ? tabItemActive : tabItem" @click="activeTab = 'talents'">Successor talents</button>
      <button type="button" :class="activeTab === 'info' ? tabItemActive : tabItem" @click="activeTab = 'info'">Succession plan info</button>
    </div>
  </Teleport>

  <div v-if="pool" :class="page">
    <!-- ── Successor talents tab ── -->
    <template v-if="activeTab === 'talents'">
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
          <MpInput v-model="search" placeholder="Search employee..." />
        </MpInputGroup>
      </MpFlex>
    </div>

    <!-- Table + pagination grouped flush -->
    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Employee</span><PxColumnSortMenu col-key="employee" :sort-type="sortTypes.employee" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Organization</span><PxColumnSortMenu col-key="organization" :sort-type="sortTypes.organization" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Readiness</span><PxColumnSortMenu col-key="readiness" :sort-type="sortTypes.readiness" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" class="sort-th" :class="headCell"><span :class="thInner"><span>Assessment date</span><PxColumnSortMenu col-key="date" :sort-type="sortTypes.date" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
              <MpTableCell as="th" :class="headCell" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(r, i) in paged" :key="r.id">
              <MpTableCell as="td" :class="cell">
                <MpFlex align="center" gap="2">
                  <span class="avatar-item" :class="avatarItem">
                    <MpAvatar :id="`succ-${r.id}`" :name="r.name" :src="r.photo" size="lg" variant-color="gray" />
                    <div class="coach-card" :class="i === paged.length - 1 ? coachCardUp : coachCard">
                      <MpAvatar :id="`succ-coach-${r.id}`" :name="r.name" :src="r.photo" size="md" variant-color="gray" />
                      <div :class="coachText">
                        <span :class="coachName">{{ r.name }}</span>
                        <span :class="coachMeta">{{ r.code }} | {{ r.title }} | {{ r.department }}</span>
                      </div>
                    </div>
                  </span>
                  <MpFlex direction="column" gap="0">
                    <span :class="nameText">{{ r.name }}</span>
                    <span :class="subText">{{ r.code }} | {{ r.title }}</span>
                  </MpFlex>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="cell">{{ r.department }}</MpTableCell>
              <MpTableCell as="td" :class="cell">{{ readinessLabel(r.readiness) }}</MpTableCell>
              <MpTableCell as="td" :class="cell">{{ formatDate(r.date) }}</MpTableCell>
              <MpTableCell as="td" :class="[cell, css({ textAlign: 'right' })]">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Action</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '180px' })">
                    <MpPopoverList>
                      <MpPopoverListItem>Promote</MpPopoverListItem>
                      <MpPopoverListItem>Update assessment</MpPopoverListItem>
                      <MpPopoverListItem>Edit readiness</MpPopoverListItem>
                      <MpPopoverListItem>View details</MpPopoverListItem>
                      <MpPopoverListItem @click="removeTalent(r.id)"><span :class="css({ color: 'text.danger' })">Remove from pool</span></MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
        <div v-if="!totalRows" :class="emptyBlock">
          <MpIcon name="employee" size="lg" :class="css({ color: 'icon.secondary' })" />
          <MpText size="label" weight="semiBold" :class="css({ color: 'text.default' })">No successor talent to display.</MpText>
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
    </template>

    <!-- ── Succession plan info tab ── -->
    <div v-else :class="infoTabRow">
    <div :class="infoSection">
      <div :class="kvRow"><span :class="kvLabel">Key position</span><span :class="kvValue">{{ pool.keyPosition }}</span></div>
      <div :class="kvRow"><span :class="kvLabel">Organization</span><span :class="kvValue">{{ pool.organization }}</span></div>
      <div :class="kvRow"><span :class="kvLabel">Successor talents</span><span :class="kvValue">{{ allRows.length }}</span></div>

      <template v-if="assignment">
        <div :class="kvRow"><span :class="kvLabel">Competency scope</span><span :class="kvValue">{{ scopeLabel }}</span></div>
        <div :class="kvRow"><span :class="kvLabel">Applies to</span><span :class="kvValue">{{ scopeValueLabel }}</span></div>
      </template>

      <template v-if="assignment">
        <MpText as="h3" :class="[h3Text, css({ marginTop: '2' })]">Competency standard</MpText>
        <MpTableContainer :class="borderedTable">
          <MpTable :is-hoverable="false">
            <MpTableHead>
              <MpTableRow>
                <MpTableCell as="th" :class="headCell">Competency group</MpTableCell>
                <MpTableCell as="th" :class="cellHRight">Target score</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="g in standardGroups" :key="g.group">
                <MpTableCell as="td" :class="cell">{{ g.group }}</MpTableCell>
                <MpTableCell as="td" :class="[cell, css({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })]">{{ g.target.toFixed(1) }}</MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </template>
      <PxNoAssignmentNotice v-if="!assignment" contact-hr />
    </div>
      <MpButton variant="ghost" left-icon="edit" :class="css({ flexShrink: '0' })">Edit</MpButton>
    </div>
  </div>

  <!-- Add successor talent — shared two-column employee select drawer -->
  <SelectEmployeesDrawer
    :is-open="isPickerOpen"
    drawer-id="drawer-add-successors"
    title="Add successor talent"
    description="Select employees to add to this succession pool."
    :initial-selected="successors.map(s => s.employeeId)"
    :is-required="false"
    confirm-label="Add talent"
    @update:is-open="isPickerOpen = $event"
    @continue="onAddContinue"
  />
</template>

<style scoped>
/* Reveal the column sort icon on header hover. */
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
