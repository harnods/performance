<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Employee directory (full-screen modal)
  Token mode: Pixel 2.4

  Opens from the Home "All employees" stage. Full-screen overlay:
    - Header: "All employees" title (left) · employee-name search (center) · close (right)
    - Body (two columns):
        · Left  = 264px : list of the logged-in user's subordinates (search-filtered, selectable)
        · Right = flex   : grey canvas holding a white stage box for the selected employee
                           (detail content TBD — scaffolded with the employee identity header)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpButton,
  MpAvatar,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpFormControl,
  MpFormLabel,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  css,
} from '@mekari/pixel3'

import { type Employee, employeeMeta } from '~/utils/employees'
import { POSITION_INFO, SUCCESSION_TARGETS, scopeOptions, getAssessmentResult } from '~/utils/competency'

const props = defineProps<{
  isOpen: boolean
  employees: Employee[]
  selectedIndex?: number
}>()
const emit = defineEmits<{
  'update:isOpen': [boolean]
  'update:selectedIndex': [number]
}>()

const query = ref('')
const localSelected = ref(props.selectedIndex ?? 0)

watch(() => props.selectedIndex, (v) => { if (typeof v === 'number') localSelected.value = v })
watch(() => props.isOpen, (open) => {
  if (open) query.value = ''
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.employees
    .map((e, i) => ({ ...e, i }))
    .filter(e => !q || e.name.toLowerCase().includes(q))
})
const selected = computed(() => props.employees[localSelected.value])

function pick(i: number) {
  localSelected.value = i
  emit('update:selectedIndex', i)
}
function close() { emit('update:isOpen', false) }

// ─── Competency assessments (driven by the selected employee's real position) ────────
// The job position dropdown lists this employee's current position + any positions
// they're assessed against for promotion; the scope filter and results come from
// the shared competency mock (~/utils/competency).
const currentPosition = computed(() => selected.value?.title ?? '')
// Only identified successors have a future-job assessment (keyed by employee id).
const otherPositions = computed(() => (selected.value ? SUCCESSION_TARGETS[selected.value.id] ?? [] : []))
const positionOptions = computed(() => [
  ...(currentPosition.value ? [{ value: currentPosition.value, label: currentPosition.value, group: 'Assessment for current job position' }] : []),
  ...otherPositions.value.map(t => ({ value: t, label: t, group: 'Assessment for other job position' })),
])

const jobPosition = ref('')
const scopeValue = ref('')
const resultShown = ref(false)
const resultLoading = ref(false)
let resultTimer: ReturnType<typeof setTimeout> | null = null
function clearResult() {
  if (resultTimer) { clearTimeout(resultTimer); resultTimer = null }
  resultLoading.value = false
  resultShown.value = false
}
// Changing a filter resets its dependents but does NOT hide an already-loaded
// result — the result only changes when "Show result" is clicked again.
watch(jobPosition, () => { scopeValue.value = '' })
// Switching employee is a full context change → reset filters and clear the result.
watch(localSelected, () => { jobPosition.value = ''; scopeValue.value = ''; clearResult() })

const scopeType = computed(() => POSITION_INFO[jobPosition.value]?.scope ?? '')
const scopeLabel = computed(() => {
  switch (scopeType.value) {
    case 'job-level': return 'job level'
    case 'grade': return 'job grade'
    case 'class': return 'job class'
    default: return ''
  }
})
// Only the scope values that actually have an assessment for this position.
const scopeValueOptions = computed(() => {
  const info = POSITION_INFO[jobPosition.value]
  if (!info) return []
  return scopeOptions(info.scope).filter(o => info.values.includes(o.value))
}) as ComputedRef<{ value: string, label: string }[]>
const scopePlaceholder = computed(() =>
  jobPosition.value ? `Select ${scopeLabel.value}` : 'Select job position first',
)
const canShowResult = computed(() => !!jobPosition.value && !!scopeValue.value)
function onShowResult() {
  if (!canShowResult.value) return
  // Keep any existing result mounted behind the skeleton; swap it in when done.
  resultLoading.value = true
  if (resultTimer) clearTimeout(resultTimer)
  resultTimer = setTimeout(() => {
    resultLoading.value = false
    resultShown.value = true
    resultTimer = null
  }, 900)
}
onBeforeUnmount(() => { if (resultTimer) clearTimeout(resultTimer) })

// Latest assessment resolved for the selected employee + job position.
const latestAssessment = computed(() => ({
  name: jobPosition.value ? `${jobPosition.value} — Competency Assessment` : '',
  cycle: '26Q1 PA',
  method: 'Self review, Manager review',
  timeframe: '1 Jan 2026 – 31 Mar 2026',
  window: '16 Apr 2026 – 22 Apr 2026',
}))
const assessmentFields = computed(() => [
  { label: 'Assessment name', value: latestAssessment.value.name },
  { label: 'Review cycle', value: latestAssessment.value.cycle },
  { label: 'Review method', value: latestAssessment.value.method },
  { label: 'Review timeframe', value: latestAssessment.value.timeframe },
  { label: 'Review period / window', value: latestAssessment.value.window },
])

// ─── Assessment result (column 2) — real scores vs targets for this employee ────────
const RATING_MAX = 5
const assessmentResult = computed(() => {
  if (!selected.value || !jobPosition.value) return []
  return getAssessmentResult(selected.value.id, jobPosition.value)
    .map(r => ({ ...r, gap: +(r.score - r.target).toFixed(1) }))
})
const competencyScore = computed(() => {
  const rows = assessmentResult.value
  return rows.length ? +(rows.reduce((s, r) => s + r.score, 0) / rows.length).toFixed(1) : 0
})
// ─── Column sort for the results table (PxColumnSortMenu). Sorts only the table
// rows — the radar (radarData) keeps consuming assessmentResult unsorted. ──────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = { group: 'text', score: 'number', target: 'number', gap: 'number' }
function sortValue(r: { group: string, score: number, target: number, gap: number }, key: string): string | number {
  if (key === 'group') return r.group
  if (key === 'score') return r.score
  if (key === 'target') return r.target
  if (key === 'gap') return r.gap
  return ''
}
const sortedResult = computed(() => {
  if (!sortKey.value) return assessmentResult.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...assessmentResult.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})
// Radar expects { label, score, target } — map `group` → `label`.
const radarData = computed(() => assessmentResult.value.map(r => ({ label: r.group, score: r.score, target: r.target })))
const gapLabel = (g: number) => `${g > 0 ? '+' : ''}${g.toFixed(1)}`
const num1 = (n: number) => n.toFixed(1)

// Readiness — read-only display with inline edit + save (admin-editable).
// "Not set" until it's been set. Defaults per employee are just mock.
const readinessOptions = [
  { value: 'not-set', label: 'Not set' },
  { value: 'ready-now', label: 'Ready now' },
  { value: 'ready-1', label: 'Ready in 1 year' },
  { value: 'ready-2', label: 'Ready in 2 years' },
  { value: 'ready-3', label: 'Ready in 3 years' },
  { value: 'ready-4', label: 'Ready in 4 years' },
  { value: 'ready-5', label: 'Ready in 5 years' },
]
const readiness = ref('not-set')
const readinessEditing = ref(false)
const readinessDraft = ref('not-set')
const readinessLabel = computed(() => readinessOptions.find(o => o.value === readiness.value)?.label ?? 'Not set')
function editReadiness() { readinessDraft.value = readiness.value; readinessEditing.value = true }
function saveReadiness() { readiness.value = readinessDraft.value; readinessEditing.value = false }
function cancelReadiness() { readinessEditing.value = false }
watch(localSelected, () => { readiness.value = 'not-set'; readinessEditing.value = false })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) close()
}
onMounted(() => { if (import.meta.client) window.addEventListener('keydown', onKeydown) })
onBeforeUnmount(() => {
  if (import.meta.client) { window.removeEventListener('keydown', onKeydown); document.body.style.overflow = '' }
})

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
// Dark scrim behind the panel; 12px padding gives the panel a 12px margin all round.
const backdrop = css({
  position: 'fixed', inset: '0', zIndex: '1000',
  background: 'rgba(0, 0, 0, 0.8)', display: 'flex', padding: '3',
})
const panel = css({
  flex: '1 1 0', minWidth: '0', display: 'flex', flexDirection: 'column',
  background: 'white', borderRadius: 'lg', overflow: 'hidden',
})

const header = css({
  display: 'flex', alignItems: 'center', gap: '4', height: '64px', flexShrink: '0',
  paddingInline: '6', borderBottom: '1px solid', borderBottomColor: 'border.default',
})
const headerSide = css({ display: 'flex', alignItems: 'center', flex: '1 1 0', minWidth: '0' })
const headerSideEnd = css({ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: '1 1 0', minWidth: '0' })
const title = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const searchWrap = css({ width: '400px', maxWidth: '40vw', flexShrink: '0' })

const body = css({ display: 'flex', flex: '1 1 0', minHeight: '0', overflow: 'hidden' })

const leftPanel = css({
  width: '264px', flexShrink: '0', overflowY: 'auto', padding: '2',
  display: 'flex', flexDirection: 'column', gap: '1', background: 'white',
  borderRight: '1px solid', borderRightColor: 'border.default',
})
const empItem = css({
  display: 'flex', alignItems: 'center', gap: '2', width: '100%', padding: '2',
  borderRadius: 'md', cursor: 'pointer', textAlign: 'left', border: 'none', background: 'transparent',
  _hover: { background: 'background.neutral.hovered' },
})
const empItemActive = css({ background: 'background.brand.selected', _hover: { background: 'background.brand.selected' } })
const empText = css({ display: 'flex', flexDirection: 'column', gap: '0.5', flex: '1 1 0', minWidth: '0' })
const truncate = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' } as const
const empName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', ...truncate })
const empMeta = css({ fontSize: '12px', lineHeight: '20px', color: 'text.secondary', ...truncate })
const emptyList = css({ padding: '4', fontSize: '14px', color: 'text.secondary', textAlign: 'center' })

const rightPanel = css({
  flex: '1 1 0', minWidth: '0', overflowY: 'auto', padding: '6',
  background: 'var(--mp-colors-background)',
  display: 'flex', flexDirection: 'column', gap: '4',
})
// Page title (selected employee) above the stage box.
const pageTitle = css({ display: 'flex', flexDirection: 'column', gap: '1' })
const pageTitleName = css({ fontSize: '24px', fontWeight: '600', lineHeight: '32px', color: 'text.default', letterSpacing: '-0.48px' })
const pageTitleMeta = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const stageBox = css({
  background: 'white', border: '1px solid', borderColor: 'border.default', borderRadius: 'md',
  padding: '6', display: 'flex', flexDirection: 'column', gap: '6',
})
const stageHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', width: '100%' })
const stageTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const filterBar = css({ display: 'flex', alignItems: 'flex-end', gap: '3', width: '100%', flexWrap: 'wrap' })
const fieldWrap = css({ width: '240px' })
// Result area: a "Latest assessment" header above a 3-column row.
const resultWrap = css({ display: 'flex', flexDirection: 'column', gap: '4', width: '100%' })
const resultSection = css({ display: 'flex', alignItems: 'flex-start', gap: '6', width: '100%', flexWrap: 'wrap' })
const resultCol1 = css({ display: 'flex', flexDirection: 'column', gap: '4', width: '264px', flexShrink: '0' })
const resultCol2 = css({ display: 'flex', flexDirection: 'column', gap: '4', flex: '1 1 420px', minWidth: '0', maxWidth: '540px' })
const resultCol3 = css({ display: 'flex', flexDirection: 'column', gap: '4', width: '640px', flexShrink: '0' })
// Visible skeleton block (background.neutral.subtle is near-white, so use gray.100).
const skelBox = css({ width: '100%', height: '280px', borderRadius: 'md', background: 'gray.100', animation: 'px-skeleton-pulse 1.4s ease-in-out infinite' })
const subHeader = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const kvGrid = css({ display: 'flex', flexDirection: 'column', gap: '4', width: '100%' })
const kvItem = css({ display: 'flex', flexDirection: 'column', gap: '0', minWidth: '0' })
const kvLabel = css({ fontSize: '12px', lineHeight: '20px', color: 'text.secondary' })
const kvValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })

// Competency Score + Readiness summary (side by side above the table)
const summaryRow = css({ display: 'flex', alignItems: 'flex-start', gap: '6', flexWrap: 'wrap' })
const summaryBlock = css({ display: 'flex', flexDirection: 'column', gap: '1', minWidth: '0' })
const scoreValueRow = css({ display: 'flex', alignItems: 'baseline', gap: '1' })
const readinessRow = css({ display: 'flex', alignItems: 'center', gap: '2', minHeight: '40px' })
const readinessValue = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const scoreBig = css({ fontSize: '24px', fontWeight: '600', lineHeight: '32px', color: 'text.default', letterSpacing: '-0.48px' })
const scoreMax = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })

// Result table (numeric columns right-aligned; gap cell tinted by sign)
// Golden rule: 8px top/bottom on every cell; tallest cell is 1 line → middle.
const numHead = css({ textAlign: 'right', whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Header label + sort menu inline; right-aligned numeric headers reverse so the
// icon sits to the left of the (right-anchored) label.
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const thInnerRight = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle', flexDirection: 'row-reverse' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const numCellBase = { paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } as const
const numCell = css(numCellBase)
const gapNeg = css({ ...numCellBase, background: 'red.50', color: 'red.700' })
const gapPos = css({ ...numCellBase, background: 'green.50', color: 'green.700' })
const gapCellClass = (g: number) => (g < 0 ? gapNeg : g > 0 ? gapPos : numCell)
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" :class="backdrop" @click.self="close">
      <div :class="panel" role="dialog" aria-modal="true" aria-label="All employees">
      <!-- ═════ Header ═════ -->
      <header :class="header">
        <div :class="headerSide">
          <MpText :class="title">All employees</MpText>
        </div>
        <div :class="searchWrap">
          <MpInputGroup>
            <MpInputLeftAddon>
              <PxIcon name="search" :size="20" color="icon.secondary" />
            </MpInputLeftAddon>
            <MpInput v-model="query" placeholder="Search employee name..." />
          </MpInputGroup>
        </div>
        <div :class="headerSideEnd">
          <MpButton variant="ghost" left-icon="close" aria-label="Close" @click="close" />
        </div>
      </header>

      <!-- ═════ Body ═════ -->
      <div :class="body">
        <!-- Left: subordinate list -->
        <aside :class="leftPanel">
          <button
            v-for="e in filtered"
            :key="e.i"
            type="button"
            :class="[empItem, e.i === localSelected && empItemActive]"
            @click="pick(e.i)"
          >
            <MpAvatar :id="`dir-${e.i}`" :name="e.name" :src="e.photo" size="lg" variant-color="gray" />
            <div :class="empText">
              <span :class="empName">{{ e.name }}</span>
              <span :class="empMeta">{{ employeeMeta(e) }}</span>
            </div>

          </button>
          <div v-if="filtered.length === 0" :class="emptyList">No employees found.</div>
        </aside>

        <!-- Right: stage boxes -->
        <section :class="rightPanel">
          <!-- Page title — selected employee -->
          <div :class="pageTitle">
            <MpText as="h1" :class="pageTitleName">{{ selected?.name }}</MpText>
            <span v-if="selected" :class="pageTitleMeta">{{ employeeMeta(selected) }}</span>
          </div>

          <!-- Stage box 1 — Competency assessments (full width) -->
          <div :class="stageBox">
            <div :class="stageHeader">
              <MpText :class="stageTitle">Competency assessments</MpText>
              <MpPopover is-close-on-select use-portal placement="bottom-end">
                <MpPopoverTrigger>
                  <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                </MpPopoverTrigger>
                <MpPopoverContent>
                  <MpPopoverList>
                    <MpPopoverListItem>Create IDP</MpPopoverListItem>
                    <MpPopoverListItem>Promote employee</MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </div>
            <!-- Filter bar: job position + scope-adaptive filter + Show result -->
            <div :class="filterBar">
              <MpFormControl id="assessment-job-position" :class="fieldWrap">
                <MpFormLabel>Assessment job position</MpFormLabel>
                <PxSelectPopover
                  v-model="jobPosition"
                  :options="positionOptions"
                  placeholder="Select job position"
                  :width="'240px'"
                />
              </MpFormControl>
              <PxSelectPopover
                v-model="scopeValue"
                :options="scopeValueOptions"
                :placeholder="scopePlaceholder"
                :is-disabled="!jobPosition"
                :width="'200px'"
              />
              <MpButton variant="primary" :is-disabled="!canShowResult" @click="onShowResult">
                Show result
              </MpButton>
            </div>
            <!-- Result (hidden while loading so the skeleton shows) -->
            <div v-if="resultShown && !resultLoading" :class="resultWrap">
              <MpText :class="subHeader">Latest assessment results</MpText>
              <div :class="resultSection">
              <!-- Column 1 — assessment details -->
              <div :class="resultCol1">
                <div :class="kvGrid">
                  <div v-for="f in assessmentFields" :key="f.label" :class="kvItem">
                    <span :class="kvLabel">{{ f.label }}</span>
                    <span :class="kvValue">{{ f.value }}</span>
                  </div>
                </div>
              </div>

              <!-- Column 2 — Result -->
              <div :class="resultCol2">
                <div :class="summaryRow">
                  <div :class="summaryBlock">
                    <span :class="kvLabel">Competency Score</span>
                    <div :class="scoreValueRow">
                      <span :class="scoreBig">{{ num1(competencyScore) }}</span>
                      <span :class="scoreMax">/ {{ num1(RATING_MAX) }}</span>
                    </div>
                  </div>
                  <div :class="summaryBlock">
                    <span :class="kvLabel">Readiness</span>
                    <div :class="readinessRow">
                      <template v-if="!readinessEditing">
                        <span :class="readinessValue">{{ readinessLabel }}</span>
                        <MpButton variant="ghost" left-icon="edit" aria-label="Edit readiness" @click="editReadiness" />
                      </template>
                      <template v-else>
                        <PxSelectPopover v-model="readinessDraft" :options="readinessOptions" :width="'200px'" />
                        <MpButton variant="primary" @click="saveReadiness">Save</MpButton>
                        <MpButton variant="ghost" @click="cancelReadiness">Cancel</MpButton>
                      </template>
                    </div>
                  </div>
                </div>
                <MpTableContainer>
                  <MpTable :is-hoverable="false">
                    <MpTableHead>
                      <MpTableRow>
                        <MpTableCell as="th" class="ed-sort-th" :class="tightCell">
                          <span :class="thInner"><span>Competency group</span><PxColumnSortMenu col-key="group" :sort-type="columnSortTypes.group" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                        </MpTableCell>
                        <MpTableCell as="th" class="ed-sort-th" :class="numHead">
                          <span :class="thInnerRight"><span>Score</span><PxColumnSortMenu col-key="score" :sort-type="columnSortTypes.score" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                        </MpTableCell>
                        <MpTableCell as="th" class="ed-sort-th" :class="numHead">
                          <span :class="thInnerRight"><span>Target</span><PxColumnSortMenu col-key="target" :sort-type="columnSortTypes.target" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                        </MpTableCell>
                        <MpTableCell as="th" class="ed-sort-th" :class="numHead">
                          <span :class="thInnerRight"><span>Gap</span><PxColumnSortMenu col-key="gap" :sort-type="columnSortTypes.gap" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                        </MpTableCell>
                      </MpTableRow>
                    </MpTableHead>
                    <MpTableBody>
                      <MpTableRow v-for="r in sortedResult" :key="r.group">
                        <MpTableCell as="td" :class="tightCell">{{ r.group }}</MpTableCell>
                        <MpTableCell as="td" :class="numCell">{{ num1(r.score) }}</MpTableCell>
                        <MpTableCell as="td" :class="numCell">{{ num1(r.target) }}</MpTableCell>
                        <MpTableCell as="td" :class="gapCellClass(r.gap)">{{ gapLabel(r.gap) }}</MpTableCell>
                      </MpTableRow>
                    </MpTableBody>
                  </MpTable>
                </MpTableContainer>
              </div>

              <!-- Column 3 — radar -->
              <div :class="resultCol3">
                <PxRadarChart :data="radarData" :max="RATING_MAX" />
              </div>
              </div>
            </div>
            <div v-else-if="resultLoading" :class="resultSection">
              <div :class="resultCol1"><div :class="skelBox" /></div>
              <div :class="resultCol2"><div :class="skelBox" /></div>
              <div :class="resultCol3"><div :class="skelBox" /></div>
            </div>
            <!-- ▸ Further result content goes here (to be defined) -->
          </div>
        </section>
      </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Reveal the column sort icon on header hover — UNLAYERED (see goal-cycles/index.vue). */
.ed-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
