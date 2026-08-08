<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Talent profile
  Token mode: Pixel 2.4 (DT2.4)
  Source: Figma "Talent Profile" (node 5577-29365)

  One long page. The nav bar (Profile / Performance / Competencies / History) is
  NOT tabbed content — it is a sticky scroll-spy: clicking scrolls to the section
  and the active item follows the scroll position. Reached from the Talent
  directory. All data is derived per-person and coherent with the employee's
  directory row (see utils/talent-profile.ts). Company: PT Central Perk Indonesia.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpAvatar,
  MpIcon,
  MpTextlink,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  css,
} from '@mekari/pixel3'
import { getProfile } from '~/utils/talent-profile'

const route = useRoute()
const profile = computed(() => getProfile(route.params.id as string))

definePageMeta({
  title: 'Talent profile',
  layout: 'default',
  breadcrumb: { label: 'Talent directory', to: '/talents/talent-directory' },
})

const firstName = computed(() => profile.value?.base.name.split(' ')[0] ?? '')
const mappingCells = computed(() => profile.value?.mapping.cells ?? [])

// Competency assessment picker — switch between assessments assigned to the person.
const assessments = computed(() => profile.value?.competencyAssessments ?? [])
const selectedAssessment = ref(0)
const competency = computed(() => assessments.value[selectedAssessment.value] ?? assessments.value[0])
function selectAssessment(i: number) { selectedAssessment.value = i; openGroups.value = {} }

// ─── Scroll-spy nav (single long page) ─────────────────────────────────────────
const NAV = [
  { key: 'profile', label: 'Profile' },
  { key: 'performance', label: 'Performance' },
  { key: 'competencies', label: 'Competencies' },
  { key: 'history', label: 'History' },
]
const activeSection = ref('profile')
let observer: IntersectionObserver | null = null

function goTo(key: string) {
  document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  const root = document.querySelector('main')
  observer = new IntersectionObserver(
    (entries) => {
      // The last section whose top crosses into the upper band wins.
      for (const e of entries) {
        if (e.isIntersecting) activeSection.value = (e.target as HTMLElement).id.replace('sec-', '')
      }
    },
    { root, rootMargin: '-96px 0px -68% 0px', threshold: 0 },
  )
  NAV.forEach((n) => {
    const el = document.getElementById(`sec-${n.key}`)
    if (el) observer!.observe(el)
  })
})
onBeforeUnmount(() => observer?.disconnect())

// ─── Competency accordions (stats always visible, items toggle) ────────────────
const openGroups = ref<Record<number, boolean>>({})
const toggleGroup = (i: number) => { openGroups.value[i] = !openGroups.value[i] }

// ─── History period filters ────────────────────────────────────────────────────
const transferPeriod = ref('')
const reprimandPeriod = ref('')
const periodOptions = [
  { value: '', label: 'All periods' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
]
const transfers = computed(() =>
  (profile.value?.transfers ?? []).filter(r => !transferPeriod.value || r.date.includes(transferPeriod.value)),
)
const reprimands = computed(() =>
  (profile.value?.reprimands ?? []).filter(r => !reprimandPeriod.value || r.date.includes(reprimandPeriod.value)),
)

// ─── Column sort (behaviour from goal-cycles reference) ──────────────────────
// Each table on this page keeps its own sort state; a shared generic sorter
// mirrors the reference sort exactly. Date columns sort by parsed timestamp,
// numbers numerically, text alphabetically (numeric:true handles numeric prefixes).
function sortRows<T>(rows: T[], key: string, dir: 'asc' | 'desc', get: (r: T, k: string) => string): T[] {
  if (!key) return rows
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) =>
    String(get(a, key)).localeCompare(String(get(b, key)), undefined, { numeric: true, sensitivity: 'base' }) * d,
  )
}
const toTime = (s: string) => String(new Date(s).getTime() || 0)

// Competency accordion items (shared state → sorts within each group the same way)
const compSortKey = ref('')
const compSortDir = ref<'asc' | 'desc'>('asc')
function onCompSort(key: string, dir: 'asc' | 'desc') { compSortKey.value = key; compSortDir.value = dir }
function compValue(it: { name: string; score: number; rating: string }, key: string): string {
  if (key === 'item') return it.name
  if (key === 'score') return String(it.score)
  if (key === 'rating') return it.rating
  return ''
}
const sortedItems = (items: { name: string; score: number; rating: string }[]) =>
  sortRows(items, compSortKey.value, compSortDir.value, compValue)

// Transfer history
const trSortKey = ref('')
const trSortDir = ref<'asc' | 'desc'>('asc')
function onTrSort(key: string, dir: 'asc' | 'desc') { trSortKey.value = key; trSortDir.value = dir }
const sortedTransfers = computed(() =>
  sortRows(transfers.value, trSortKey.value, trSortDir.value, (r, k) =>
    k === 'date' ? toTime(r.date) : k === 'type' ? r.type : k === 'notes' ? r.notes : '',
  ),
)

// Reprimand history
const rpSortKey = ref('')
const rpSortDir = ref<'asc' | 'desc'>('asc')
function onRpSort(key: string, dir: 'asc' | 'desc') { rpSortKey.value = key; rpSortDir.value = dir }
const sortedReprimands = computed(() =>
  sortRows(reprimands.value, rpSortKey.value, rpSortDir.value, (r, k) =>
    k === 'date' ? toTime(r.date) : k === 'type' ? r.type : k === 'reason' ? r.reason : k === 'status' ? r.status : '',
  ),
)

// Learning & development
const lnSortKey = ref('')
const lnSortDir = ref<'asc' | 'desc'>('asc')
function onLnSort(key: string, dir: 'asc' | 'desc') { lnSortKey.value = key; lnSortDir.value = dir }
const sortedLearning = computed(() =>
  sortRows(profile.value?.learning ?? [], lnSortKey.value, lnSortDir.value, (r, k) =>
    k === 'course' ? r.course : k === 'org' ? r.org : k === 'completed' ? toTime(r.completed) : k === 'certificate' ? (r.certificate ? 'Yes' : 'No') : '',
  ),
)

// ─── Performance history chart (custom, to match the design exactly) ───────────
// Grouped thin rounded bars, no numeric y-axis, faint horizontal gridlines,
// two-line x labels (period + date range), circle legend at the bottom.
const REVIEWS = [
  { key: 'self', label: 'Self review', color: '#FBA94C' },
  { key: 'review360', label: '360 review', color: '#F87171' },
  { key: 'team', label: 'Team review', color: '#5EEAD4' },
  { key: 'manager', label: 'Manager review', color: '#3B82F6' },
] as const
const perfHistory = computed(() => profile.value?.performance.history ?? [])
const CHART_MAX = 6 // scores are out of 5; the extra headroom matches the design
const barH = (score: number) => `${(score / CHART_MAX) * 100}%`

function saveToPdf() { if (import.meta.client) window.print() }

// ─── Styles ────────────────────────────────────────────────────────────────────
const headerRow = css({ display: 'flex', alignItems: 'flex-start', gap: '4' })
const nameCol = css({ display: 'flex', flexDirection: 'column', gap: '1' })
const nameText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '28px', color: 'text.default' })
const metaText = css({ color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })
const linkRow = css({ display: 'flex', alignItems: 'center', gap: '5', marginTop: '2', flexWrap: 'wrap' })
const linkItem = css({ whiteSpace: 'nowrap' })

// Sticky scroll-spy nav
const navBar = css({
  position: 'sticky', top: '0', zIndex: '30', background: 'background.neutral',
  display: 'flex', gap: '6', alignItems: 'stretch',
  borderBottom: '1px solid', borderBottomColor: 'border.default',
  marginTop: '5', marginBottom: '2',
})
const navItem = css({
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  paddingBlock: '3', fontSize: '14px', fontWeight: '600', color: 'text.secondary',
  borderBottom: '2px solid', borderBottomColor: 'transparent', marginBottom: '-1px',
  transition: 'color 120ms',
})
const navItemActive = css({ color: 'text.selected', borderBottomColor: 'border.selected' })

const sectionTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionH3 = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const caption = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const valueText = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px' })

// key/value row
const kvRow = css({ display: 'flex', alignItems: 'flex-start', gap: '4', paddingBlock: '1.5' })
const kvLabel = css({ width: '180px', flexShrink: '0', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })
const kvValueWrap = css({ display: 'flex', flexDirection: 'column', gap: '0.5' })
const kvValueLine = css({ display: 'flex', alignItems: 'center', gap: '2', flexWrap: 'wrap' })
const badgePill = css({
  display: 'inline-flex', alignItems: 'center', paddingInline: '2', paddingBlock: '0.5',
  background: 'background.neutral.subtle', color: 'text.secondary', borderRadius: 'sm',
  fontSize: '12px', lineHeight: '16px',
})

const section = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingTop: '8' })
const anchor = css({ scrollMarginTop: '88px' })
const kvList = css({ display: 'flex', flexDirection: 'column' })

// 9-box
const boxOuter = css({ display: 'flex', gap: '2', marginTop: '2' })
const yAxis = css({ display: 'flex', gap: '1', flexShrink: '0' })
const yTitle = css({
  writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center',
  color: 'text.default', fontSize: '12px', fontWeight: '600', lineHeight: '16px', paddingBlock: '1',
})
const yTicks = css({ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'flex-end', width: '64px' })
const yTick = css({ color: 'text.secondary', fontSize: '10px', lineHeight: '12px', letterSpacing: '0.04em' })
const grid = css({ flex: '1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '1.5', minHeight: '300px' })
const boxCell = css({ position: 'relative', borderRadius: 'md', padding: '3', display: 'flex', flexDirection: 'column', gap: '1', overflow: 'hidden' })
const boxTitle = css({ color: '#232933', fontSize: '14px', fontWeight: '600', lineHeight: '20px' })
const boxSub = css({ color: '#626B79', fontSize: '12px', lineHeight: '16px' })
const boxMarker = css({ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', borderRadius: 'full', border: '2px solid', borderColor: 'background.neutral', boxShadow: 'sm' })
const xAxis = css({ display: 'flex', marginTop: '2' })
const xSpacer = css({ width: '72px', flexShrink: '0' })
const xTicks = css({ flex: '1', display: 'flex', justifyContent: 'space-around', color: 'text.secondary', fontSize: '10px', letterSpacing: '0.04em' })
const xTitle = css({ textAlign: 'center', color: 'text.default', fontSize: '12px', fontWeight: '600', marginTop: '1', paddingLeft: '72px' })

// performance
const ratingScore = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const perfHistTitle = css({ fontSize: '14px', fontWeight: '600', color: 'text.default', marginBottom: '4' })
// custom bar chart
const chart = css({ width: '100%' })
const plot = css({ position: 'relative', height: '240px', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const gridline = css({ position: 'absolute', left: '0', right: '0', height: '1px', background: '#EDF0F2' })
const plotGroups = css({ position: 'relative', zIndex: '1', height: '100%', display: 'flex', alignItems: 'flex-end' })
const plotGroup = css({ flex: '1', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '3px' })
const bar = css({ width: '11px', borderTopLeftRadius: '3px', borderTopRightRadius: '3px', flexShrink: '0' })
const xLabels = css({ display: 'flex', marginTop: '2' })
const xLabel = css({ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5', textAlign: 'center' })
const xPeriod = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const xRange = css({ fontSize: '12px', color: 'text.secondary' })
const legend = css({ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '5', marginTop: '4' })
const legendItem = css({ display: 'inline-flex', alignItems: 'center', gap: '2', fontSize: '12px', color: 'text.secondary' })
const legendDot = css({ width: '10px', height: '10px', borderRadius: 'full', flexShrink: '0' })

// competency
const assessTrigger = css({
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '1', padding: '0',
})
const compWrap = css({ display: 'flex', flexDirection: 'column' })
// No divider between/under groups — spacing only. When expanded, the table's own
// row borders provide the structure.
const compGroup = css({ paddingBlock: '4', display: 'flex', flexDirection: 'column', gap: '3' })
const compHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' })
const statRow = css({ display: 'flex', gap: '16' })
const statCol = css({ display: 'flex', flexDirection: 'column', gap: '0.5' })
const chevronBtn = css({ transition: 'transform 150ms', color: 'icon.default' })
const chevronOpen = css({ transform: 'rotate(180deg)' })

// tables
const headCell = css({ whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2' })
// Header label + sort menu inline (mirrors goal-cycles reference).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cellMid = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
const cellTop = css({ verticalAlign: 'top', paddingTop: '2', paddingBottom: '2' })
// transfer item: stacked changed components (field label on top, before → after below)
const transferItems = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const transferItem = css({ display: 'flex', flexDirection: 'column', gap: '0' })
const transferField = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const transferChange = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const numGreen = css({ color: 'text.success' })
const numRed = css({ color: 'text.danger' })
const footerNote = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px', paddingTop: '10', paddingBottom: '4' })
const emptyText = css({ color: 'text.secondary', textAlign: 'center', paddingBlock: '8' })
const periodSelect = css({ width: '200px', marginBottom: '3' })
</script>

<template>
  <div v-if="profile">
    <!-- ═════ Profile header ═════ -->
    <div :class="headerRow">
      <MpAvatar :id="`profile-${profile.base.id}`" :name="profile.base.name" :src="profile.base.photo" size="xl" variant-color="gray" />
      <div :class="nameCol">
        <span :class="nameText">{{ profile.base.name }}</span>
        <span :class="metaText">{{ profile.base.code }} | {{ profile.base.jobPosition }} | {{ profile.base.organization }}</span>
        <span :class="metaText">{{ profile.education }}</span>
        <div :class="linkRow">
          <MpTextlink as="button" left-icon="employment" :class="linkItem" @click="() => {}">
            View {{ firstName }}'s profile on Talenta
          </MpTextlink>
          <MpTextlink as="button" left-icon="download" :class="linkItem" @click="saveToPdf">
            Save to PDF
          </MpTextlink>
        </div>
      </div>
    </div>

    <!-- ═════ Sticky scroll-spy nav ═════ -->
    <nav :class="navBar">
      <button
        v-for="n in NAV"
        :key="n.key"
        type="button"
        :class="[navItem, activeSection === n.key && navItemActive]"
        @click="goTo(n.key)"
      >
        {{ n.label }}
      </button>
    </nav>

    <!-- ─────────── PROFILE ─────────── -->
    <section id="sec-profile" :class="[section, anchor]">
      <MpText :class="sectionTitle">General information</MpText>
      <div :class="kvList">
        <div v-for="kv in profile.general" :key="kv.label" :class="kvRow">
          <span :class="kvLabel">{{ kv.label }}</span>
          <div :class="kvValueWrap">
            <div :class="kvValueLine">
              <span :class="valueText">{{ kv.value }}</span>
              <span v-if="kv.badge" :class="badgePill">{{ kv.badge }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section :class="section">
      <MpText :class="sectionTitle">Employment information</MpText>
      <div :class="kvList">
        <div v-for="kv in profile.employment" :key="kv.label" :class="kvRow">
          <span :class="kvLabel">{{ kv.label }}</span>
          <div :class="kvValueWrap">
            <div :class="kvValueLine">
              <span :class="valueText">{{ kv.value }}</span>
              <span v-if="kv.badge" :class="badgePill">{{ kv.badge }}</span>
            </div>
            <span v-if="kv.sub" :class="caption">{{ kv.sub }}</span>
          </div>
        </div>
      </div>
    </section>

    <section :class="section">
      <MpText :class="sectionTitle">Talent mapping</MpText>
      <div>
        <MpFlex align="center" gap="1">
          <MpText :class="sectionH3">{{ profile.mapping.cycle }}</MpText>
          <MpIcon name="chevrons-down" :class="css({ color: 'icon.default' })" />
        </MpFlex>
        <MpText :class="caption">{{ profile.mapping.generated }}</MpText>
      </div>

      <div :class="boxOuter">
        <div :class="yAxis">
          <div :class="yTitle">Potential assessment</div>
          <div :class="yTicks">
            <span :class="yTick">HIGH</span>
            <span :class="yTick">MODERATE</span>
            <span :class="yTick">LOW</span>
          </div>
        </div>
        <div :class="grid">
          <div v-for="c in mappingCells" :key="c.key" :class="boxCell" :style="{ backgroundColor: c.color }">
            <span :class="boxTitle">{{ c.title }}</span>
            <span :class="boxSub">{{ c.subtitle }}</span>
            <MpAvatar
              v-if="c.key === profile.mapping.activeKey"
              :id="`marker-${profile.base.id}`"
              :name="profile.base.name"
              :src="profile.base.photo"
              size="lg"
              variant-color="gray"
              :class="boxMarker"
            />
          </div>
        </div>
      </div>
      <div :class="xAxis">
        <div :class="xSpacer" />
        <div :class="xTicks"><span>LOW</span><span>MODERATE</span><span>HIGH</span></div>
      </div>
      <div :class="xTitle">Performance assessment</div>
    </section>

    <!-- ─────────── PERFORMANCE ─────────── -->
    <section id="sec-performance" :class="[section, anchor]">
      <MpText :class="sectionTitle">Performance</MpText>
      <div>
        <MpText :class="sectionH3">Latest performance rating ({{ profile.performance.period }})</MpText>
        <MpText :class="caption">{{ profile.performance.basis }}</MpText>
        <MpText :class="ratingScore">{{ profile.performance.label }} ({{ profile.performance.score }})</MpText>
      </div>
      <div>
        <MpText :class="perfHistTitle">Performance history</MpText>
        <div :class="chart">
          <div :class="plot">
            <span v-for="n in 5" :key="n" :class="gridline" :style="{ bottom: `${(n / CHART_MAX) * 100}%` }" />
            <div :class="plotGroups">
              <div v-for="p in perfHistory" :key="p.label" :class="plotGroup">
                <div
                  v-for="r in REVIEWS"
                  :key="r.key"
                  :class="bar"
                  :style="{ height: barH(p[r.key]), background: r.color }"
                />
              </div>
            </div>
          </div>
          <div :class="xLabels">
            <div v-for="p in perfHistory" :key="p.label" :class="xLabel">
              <span :class="xPeriod">{{ p.label }}</span>
              <span :class="xRange">{{ p.range }}</span>
            </div>
          </div>
          <div :class="legend">
            <span v-for="r in REVIEWS" :key="r.key" :class="legendItem">
              <span :class="legendDot" :style="{ background: r.color }" />
              {{ r.label }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ─────────── COMPETENCIES ─────────── -->
    <section id="sec-competencies" :class="[section, anchor]">
      <MpText :class="sectionTitle">Competencies</MpText>
      <div>
        <MpPopover is-close-on-select use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <button type="button" :class="assessTrigger">
              <span :class="sectionH3">{{ competency.assessment }}</span>
              <MpIcon name="chevrons-down" :class="css({ color: 'icon.default' })" />
            </button>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem
                v-for="(a, ai) in assessments"
                :key="ai"
                :is-active="ai === selectedAssessment"
                @click="selectAssessment(ai)"
              >
                {{ a.assessment }}
              </MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpText :class="caption">Completed on {{ competency.completed }}</MpText>
      </div>

      <div :class="statRow">
        <div :class="statCol">
          <span :class="caption">Job position</span>
          <span :class="valueText">{{ competency.position }}</span>
        </div>
        <div v-if="competency.scope" :class="statCol">
          <span :class="caption">{{ competency.scope.label }}</span>
          <span :class="valueText">{{ competency.scope.value }}</span>
        </div>
      </div>

      <div :class="compWrap">
      <div
        v-for="(g, gi) in competency.groups"
        :key="g.name"
        :class="compGroup"
      >
        <div :class="compHeader" @click="toggleGroup(gi)">
          <MpText :class="sectionH3">{{ g.name }}</MpText>
          <MpIcon name="chevrons-down" :class="[chevronBtn, openGroups[gi] && chevronOpen]" />
        </div>
        <div :class="statRow">
          <div :class="statCol">
            <span :class="caption">Target score</span>
            <span :class="valueText">{{ g.target.toFixed(1) }}</span>
          </div>
          <div :class="statCol">
            <span :class="caption">Average score</span>
            <span :class="valueText">{{ g.average.toFixed(1) }}</span>
          </div>
          <div :class="statCol">
            <span :class="caption">Gap</span>
            <span :class="[valueText, g.gap < 0 ? numRed : numGreen]">{{ g.gap > 0 ? '+' : '' }}{{ g.gap.toFixed(1) }}</span>
          </div>
        </div>
        <MpTableContainer v-if="openGroups[gi]">
          <MpTable :is-hoverable="false">
            <MpTableHead>
              <MpTableRow>
                <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                  <span :class="thInner"><span>Competency item</span><PxColumnSortMenu col-key="item" sort-type="text" :sort-key="compSortKey" :sort-dir="compSortDir" @sort-change="onCompSort" /></span>
                </MpTableCell>
                <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                  <span :class="thInner"><span>Actual score</span><PxColumnSortMenu col-key="score" sort-type="number" :sort-key="compSortKey" :sort-dir="compSortDir" @sort-change="onCompSort" /></span>
                </MpTableCell>
                <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                  <span :class="thInner"><span>Rating</span><PxColumnSortMenu col-key="rating" sort-type="text" :sort-key="compSortKey" :sort-dir="compSortDir" @sort-change="onCompSort" /></span>
                </MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="it in sortedItems(g.items)" :key="it.name">
                <MpTableCell as="td" :class="cellMid">{{ it.name }}</MpTableCell>
                <MpTableCell as="td" :class="[cellMid, css({ fontVariantNumeric: 'tabular-nums' })]">{{ it.score.toFixed(1) }}</MpTableCell>
                <MpTableCell as="td" :class="cellMid">{{ it.rating }}</MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </div>
      </div>
    </section>

    <!-- ─────────── HISTORY ─────────── -->
    <section id="sec-history" :class="[section, anchor]">
      <MpText :class="sectionTitle">Transfer history</MpText>
      <div :class="periodSelect">
        <PxSelectPopover v-model="transferPeriod" :options="periodOptions" placeholder="Period" />
      </div>
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Date</span><PxColumnSortMenu col-key="date" sort-type="date" :sort-key="trSortKey" :sort-dir="trSortDir" @sort-change="onTrSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Transfer type</span><PxColumnSortMenu col-key="type" sort-type="text" :sort-key="trSortKey" :sort-dir="trSortDir" @sort-change="onTrSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" :class="headCell">Transfer item</MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Notes</span><PxColumnSortMenu col-key="notes" sort-type="text" :sort-key="trSortKey" :sort-dir="trSortDir" @sort-change="onTrSort" /></span>
              </MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(r, i) in sortedTransfers" :key="i">
              <MpTableCell as="td" :class="cellTop">{{ r.date }}</MpTableCell>
              <MpTableCell as="td" :class="cellTop">{{ r.type }}</MpTableCell>
              <MpTableCell as="td" :class="cellTop">
                <div :class="transferItems">
                  <div v-for="(it, j) in r.items" :key="j" :class="transferItem">
                    <span :class="transferField">{{ it.field }}</span>
                    <span :class="transferChange">{{ it.change }}</span>
                  </div>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="cellTop">{{ r.notes }}</MpTableCell>
            </MpTableRow>
            <MpTableRow v-if="transfers.length === 0">
              <MpTableCell as="td" :colspan="4" :class="emptyText">No transfer records.</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
    </section>

    <section :class="section">
      <MpText :class="sectionTitle">Reprimand history</MpText>
      <div :class="periodSelect">
        <PxSelectPopover v-model="reprimandPeriod" :options="periodOptions" placeholder="Period" />
      </div>
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Date</span><PxColumnSortMenu col-key="date" sort-type="date" :sort-key="rpSortKey" :sort-dir="rpSortDir" @sort-change="onRpSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Reprimand type</span><PxColumnSortMenu col-key="type" sort-type="text" :sort-key="rpSortKey" :sort-dir="rpSortDir" @sort-change="onRpSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Reason</span><PxColumnSortMenu col-key="reason" sort-type="text" :sort-key="rpSortKey" :sort-dir="rpSortDir" @sort-change="onRpSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" sort-type="text" :sort-key="rpSortKey" :sort-dir="rpSortDir" @sort-change="onRpSort" /></span>
              </MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(r, i) in sortedReprimands" :key="i">
              <MpTableCell as="td" :class="cellMid">{{ r.date }}</MpTableCell>
              <MpTableCell as="td" :class="cellMid">{{ r.type }}</MpTableCell>
              <MpTableCell as="td" :class="cellMid">{{ r.reason }}</MpTableCell>
              <MpTableCell as="td" :class="cellMid">
                <div :class="css({ display: 'flex', flexDirection: 'column', gap: '0.5' })">
                  <span :class="valueText">{{ r.status }}</span>
                  <span :class="caption">{{ r.statusNote }}</span>
                </div>
              </MpTableCell>
            </MpTableRow>
            <MpTableRow v-if="reprimands.length === 0">
              <MpTableCell as="td" :colspan="4" :class="emptyText">No reprimand records.</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
    </section>

    <section :class="section">
      <MpText :class="sectionTitle">Learning &amp; development history</MpText>
      <MpTableContainer>
        <MpTable :is-hoverable="false">
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Course</span><PxColumnSortMenu col-key="course" sort-type="text" :sort-key="lnSortKey" :sort-dir="lnSortDir" @sort-change="onLnSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Issuing organization</span><PxColumnSortMenu col-key="org" sort-type="text" :sort-key="lnSortKey" :sort-dir="lnSortDir" @sort-change="onLnSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Completed date</span><PxColumnSortMenu col-key="completed" sort-type="date" :sort-key="lnSortKey" :sort-dir="lnSortDir" @sort-change="onLnSort" /></span>
              </MpTableCell>
              <MpTableCell as="th" class="tp-sort-th" :class="headCell">
                <span :class="thInner"><span>Certificate</span><PxColumnSortMenu col-key="certificate" sort-type="text" :sort-key="lnSortKey" :sort-dir="lnSortDir" @sort-change="onLnSort" /></span>
              </MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(r, i) in sortedLearning" :key="i">
              <MpTableCell as="td" :class="cellMid">{{ r.course }}</MpTableCell>
              <MpTableCell as="td" :class="cellMid">{{ r.org }}</MpTableCell>
              <MpTableCell as="td" :class="cellMid">{{ r.completed }}</MpTableCell>
              <MpTableCell as="td" :class="cellMid">{{ r.certificate ? 'Yes' : 'No' }}</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
    </section>

    <div :class="footerNote">Last updated on 20 Nov 2025, 15:00 · Data refreshes every 6 hours</div>
  </div>

  <div v-else :class="css({ padding: '20', textAlign: 'center', color: 'text.secondary' })">
    Employee not found.
  </div>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered `visibility: hidden` on specificity. */
.tp-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
