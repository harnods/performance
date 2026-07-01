<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Home
  Source: Figma — Home (fileKey l4QLmh10bfyOn5yiT9qOm5, node 4204:2226)
  Token mode: Pixel 2.4
  Patterns used: layout-shell (header + page title from layout), two-column
  dashboard of stat/empty-state cards.

  Header bar + sidebar are intentionally NOT rebuilt here — the prototype's
  existing layout (layouts/default.vue) provides them. The Figma page title
  "Welcome back, Rizal Candra" is rendered by the layout via definePageMeta.

  Layout (matches Figma exactly):
    - Wrapper: two columns, 24px gap.
    - Left col  = 776px : AI summary, Tasks, Goal summary, Review history, 360 breakdown
                          (each its own bordered white card, 24px gap between).
    - Right col = 376px : one bordered white card with three flush sections —
                          Latest goals, All employees, Review feedback.

  STATES INCLUDED:
    - Happy path for AI summary / Tasks / Goal summary / Latest goals / All employees
    - Empty state: Review history ("No review scores yet"), 360 breakdown
      ("No 360 data yet"), Review feedback ("No feedback yet")

  COPY / DATA are mock (dashboard is read-only in this prototype).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpToggle,
  MpAvatar,
  MpTextlink,
  css,
} from '@mekari/pixel3'
// Icons: use the repo's PxIcon wrapper (mp-icon-box) — raw MpIcon only supports
// named sizes (sm/md/…); PxIcon renders exact pixel sizes (16/18/20/24/28/32).

definePageMeta({
  title: 'Welcome back, Rizal Candra',
  layout: 'default',
  boxed: true, // flat grey canvas + standalone stage boxes (no wrapping white panel)
})

// ─── Mock data ───────────────────────────────────────────────────────────────────
const aiSummaries = [
  { lead: 'The summary result for ', strong: '26Q1 PA', tail: ' is complete', time: '20 Apr 2026, 19:00' },
  { lead: 'The summary result for ', strong: '26Q1 PA - Manager Review', tail: ' is complete', time: '20 Apr 2026, 18:45' },
  { lead: 'The summary result for ', strong: '26Q1 PA - Sales', tail: ' is complete', time: '19 Apr 2026, 15:00' },
  { lead: 'The summary result for ', strong: '26Q1 PA - Marketing', tail: ' is complete', time: '19 Apr 2026, 10:00' },
  { lead: 'The summary result for ', strong: '26Q1 PA - Op', tail: ' is complete', time: '19 Apr 2026, 09:30' },
]

const tasks = [
  { name: 'Weekly review: Cinta Ayu', period: 'Review period: 20 - 24 Apr 2026' },
  { name: 'Weekly review: Budi Santoso', period: 'Review period: 27 Apr - 1 May 2026' },
  { name: 'Weekly review: Siti Rahmawati', period: 'Review period: 4 - 8 May 2026' },
]

const stats = [
  { icon: 'goal', value: '11', label: 'Total individual goals' },
  { icon: 'chart-bar', value: '11', label: 'Average goals progress' },
  { icon: 'team', value: '0', label: 'Total team goals' },
]

// Goal status legend (donut + table). Dot colors map to Figma chart palette.
const legend = [
  { dot: null, label: 'Total goals', count: '11', percent: '' },
  { dot: 'gray.100', label: 'Not updated', count: '10', percent: '91%' },
  { dot: 'green.500', label: 'On track', count: '1', percent: '9%' },
  { dot: 'orange.400', label: 'Off track', count: '0', percent: '0%' },
]
const ON_TRACK_PCT = 9 // green arc of the donut

const latestGoals = [
  { title: 'Achieve IDR 500.000.000 in monthly revenue', value: 'Rp437.000.000', percent: 65, green: false, min: 'Rp0', max: 'Rp500.000.000,00' },
  { title: 'Reduce operational cost by 10% through process automation', value: '6%', percent: 60, green: false, min: 'Rp950.000.000', max: 'Rp855.000.000,00' },
  { title: 'Complete Brevet A & B tax certification by Q3', value: '3', percent: 60, green: true, min: '0', max: '5' },
]

// Subordinates of the logged-in user (shared mock — see ~/utils/employees).
// The card shows the first 5; the directory modal lists all of them.
const employees = EMPLOYEES
const topEmployees = computed(() => employees.slice(0, 5))

// ─── Employee directory modal ──────────────────────────────────────────────────────
const dirOpen = ref(false)
const dirSelected = ref(0)
function openDirectory(i = 0) {
  dirSelected.value = i
  dirOpen.value = true
}

const axis = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

// ─── Filter controls (display-only) ────────────────────────────────────────────────
const goalStatus = ref('ongoing')
const goalRange = ref('apr')
const reviewCycle = ref('26q1')
const breakdownCycle = ref('26q1')
const feedbackCycle = ref('26q1')

const statusOptions = [{ value: 'ongoing', label: 'Ongoing' }, { value: 'all', label: 'All status' }]
const rangeOptions = [{ value: 'apr', label: '23 Mar - 22 Apr 2026' }, { value: 'mar', label: '23 Feb - 22 Mar 2026' }]
const cycleOptions = [{ value: '26q1', label: '26Q1 PA' }, { value: '25q4', label: '25Q4 PA' }]

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────────
// Boxed layout: the stage sits flush top-left; add a 24px gutter on the right and
// bottom so the boxes don't touch the viewport edge.
const wrapper = css({ display: 'flex', gap: '6', alignItems: 'flex-start', width: '100%', paddingRight: '6', paddingBottom: '6' })
// Left column fills all remaining width; right column stays a fixed 376px pinned right.
const leftCol = css({ display: 'flex', flexDirection: 'column', gap: '6', flex: '1 1 0', minWidth: '0' })
const rightCol = css({
  display: 'flex', flexDirection: 'column', width: '376px', flexShrink: '0',
  background: 'white', border: '1px solid', borderColor: 'border.default', borderRadius: 'md',
})

const card = css({
  background: 'white', border: '1px solid', borderColor: 'border.default',
  borderRadius: 'md', padding: '6', overflow: 'hidden',
})
const cardStack = css({
  background: 'white', border: '1px solid', borderColor: 'border.default',
  borderRadius: 'md', padding: '6', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', gap: '6',
})
const rightSection = css({ padding: '6', display: 'flex', flexDirection: 'column' })

const cardTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const bodyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const bodyStrong = css({ fontSize: '14px', lineHeight: '20px', fontWeight: '600', color: 'text.default' })
const metaText = css({ fontSize: '12px', lineHeight: '20px', color: 'text.secondary' })
const timeText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const axisText = css({ fontSize: '10px', lineHeight: '12px', color: 'gray.400' })

const divider = css({ borderBottom: '1px solid', borderBottomColor: 'gray.50' })
const listRow = css({ display: 'flex', alignItems: 'flex-start', gap: '2', width: '100%' })
const rowBlock = css({ display: 'flex', flexDirection: 'column', gap: '1', flex: '1 0 0', minWidth: '0', paddingBlock: '3' })
const chevronBtn = css({ display: 'flex', alignItems: 'center', alignSelf: 'center', color: 'icon.secondary', cursor: 'pointer' })

const headerRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4', width: '100%' })
const filterGroup = css({ flexShrink: '0' })

// Stats
const statsRow = css({ display: 'flex', alignItems: 'flex-start', width: '100%' })
const statCell = css({ display: 'flex', flexDirection: 'column', gap: '1', flex: '1 0 0', minWidth: '0', padding: '4' })
const statNumber = css({ fontSize: '24px', fontWeight: '600', lineHeight: '32px', color: 'text.default', letterSpacing: '-0.48px' })

// Donut
const donutWrap = css({ display: 'flex', flex: '1 0 0', minWidth: '160px', alignItems: 'center', justifyContent: 'center', position: 'relative' })
const donutCenter = css({
  position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
})

// Legend table
const legendCol = css({ display: 'flex', flexDirection: 'column', width: '240px', maxWidth: '100%' })
const legendRow = css({ display: 'flex', alignItems: 'center', gap: '2', width: '100%', paddingBlock: '2', borderBottom: '1px solid', borderBottomColor: 'gray.50' })
const legendName = css({ display: 'flex', alignItems: 'center', gap: '2', flex: '1 0 0', minWidth: '0' })
const legendNum = css({ width: '40px', textAlign: 'right', fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const legendPct = css({ width: '40px', textAlign: 'right', fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })

// Chart empty state
const chartWrap = css({ position: 'relative', width: '100%', minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '2' })
const baseline = css({ display: 'flex', flexDirection: 'column', gap: '6', width: '100%', paddingBlock: '2' })
const baselineLine = css({ borderTop: '1px dashed', borderTopColor: 'gray.100', width: '100%', height: '0' })
const axisRow = css({ display: 'flex', justifyContent: 'space-between', width: '100%' })
const emptyOverlay = css({ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4' })
const emptyCard = css({
  display: 'flex', flexDirection: 'column', gap: '1', maxWidth: '300px',
  background: 'white', border: '1px solid', borderColor: 'border.default',
  borderRadius: 'md', padding: '4',
  boxShadow: '0 10px 10px -5px rgba(0,0,0,0.04), 0 20px 25px -5px rgba(0,0,0,0.10)',
})
const emptyTitle = css({ fontSize: '14px', lineHeight: '20px', fontWeight: '600', color: 'text.default' })

// Latest goals
const goalItem = css({ display: 'flex', flexDirection: 'column', gap: '2', paddingBlock: '3' })
const goalProgress = css({ display: 'flex', flexDirection: 'column', gap: '1.5' })
const progressTrack = css({ width: '100%', height: '6px', borderRadius: 'full', background: 'gray.50', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full', background: 'teal.400' })
const badgeBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'sm', paddingInline: '1.5', paddingBlock: '0.5', fontSize: '12px', lineHeight: '16px', fontWeight: '600' } as const
const badgeNeutral = css({ ...badgeBase, background: 'gray.50', color: 'text.secondary' })
const badgeGreen = css({ ...badgeBase, background: 'green.50', color: 'green.700' })

// Links
const viewAllRow = css({ display: 'flex', alignItems: 'center', paddingBlock: '3' })

// All employees row
const empContent = css({ display: 'flex', flexDirection: 'column', gap: '0.5', flex: '1 0 0', minWidth: '0' })
const empRow = css({
  display: 'flex', alignItems: 'center', gap: '2', width: '100%',
  paddingBlock: '2', paddingInline: '2', marginInline: '-2', borderRadius: 'md',
  cursor: 'pointer', _hover: { background: 'background.neutral.hovered' },
})

// Review feedback empty state
const feedbackEmpty = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2', textAlign: 'center', paddingBlock: '6' })

const dotClass = (color: string) => css({ width: '8px', height: '8px', borderRadius: 'full', flexShrink: '0', background: color })
</script>

<template>
  <div :class="wrapper">
    <!-- ═════════════════════════ LEFT COLUMN ═════════════════════════ -->
    <div :class="leftCol">

      <!-- ═════ AI summary ═════ -->
      <section :class="card">
        <MpFlex align="center" gap="3" :class="css({ marginBottom: '3' })">
          <PxIcon name="airene-brand" :size="20" />
          <MpText as="h2" :class="cardTitle">AI summary</MpText>
        </MpFlex>
        <div>
          <div v-for="(item, i) in aiSummaries" :key="i" :class="[listRow, divider]">
            <div :class="rowBlock">
              <p :class="bodyText">
                {{ item.lead }}<span :class="bodyStrong">{{ item.strong }}</span>{{ item.tail }}
              </p>
              <span :class="timeText">{{ item.time }}</span>
            </div>
            <span :class="chevronBtn"><PxIcon name="chevrons-right" :size="20" color="icon.secondary" /></span>
          </div>
        </div>
      </section>

      <!-- ═════ Tasks ═════ -->
      <section :class="card">
        <MpText as="h2" :class="cardTitle">Tasks</MpText>
        <div>
          <div v-for="(t, i) in tasks" :key="i" :class="[listRow, divider]">
            <div :class="rowBlock">
              <span :class="bodyText">{{ t.name }}</span>
              <span :class="metaText">{{ t.period }}</span>
            </div>
            <span :class="chevronBtn"><PxIcon name="chevrons-right" :size="20" color="icon.secondary" /></span>
          </div>
        </div>
        <div :class="viewAllRow">
          <MpTextlink as="button">
            <MpFlex align="center" gap="1">View all tasks <PxIcon name="arrows-right" :size="16" color="icon.brand" /></MpFlex>
          </MpTextlink>
        </div>
      </section>

      <!-- ═════ Goal summary ═════ -->
      <section :class="cardStack">
        <div :class="headerRow">
          <MpText as="h2" :class="cardTitle">Goal summary</MpText>
          <MpFlex gap="4" align="center" :class="filterGroup">
            <PxSelectPopover v-model="goalStatus" :options="statusOptions" :width="'160px'" />
            <PxSelectPopover v-model="goalRange" :options="rangeOptions" :width="'200px'" />
          </MpFlex>
        </div>

        <!-- Stats -->
        <div :class="statsRow">
          <div v-for="(s, i) in stats" :key="i" :class="statCell">
            <MpFlex align="center" gap="2">
              <PxIcon :name="s.icon" :size="24" color="icon.default" />
              <span :class="statNumber">{{ s.value }}</span>
            </MpFlex>
            <span :class="metaText">{{ s.label }}</span>
          </div>
        </div>

        <!-- Donut + legend -->
        <MpFlex align="flex-start" :class="css({ width: '100%', paddingBottom: '5' })" gap="6" wrap="wrap">
          <div :class="donutWrap">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="72" fill="none" stroke="var(--mp-colors-gray-100)" stroke-width="16" />
              <circle
                cx="80" cy="80" r="72" fill="none"
                stroke="var(--mp-colors-green-500)" stroke-width="16"
                :stroke-dasharray="`${(ON_TRACK_PCT / 100) * 452.39} 452.39`"
                transform="rotate(-90 80 80)"
              />
            </svg>
            <div :class="donutCenter">
              <span :class="statNumber">11</span>
              <span :class="bodyText">goals</span>
            </div>
          </div>

          <div :class="legendCol">
            <div v-for="(l, i) in legend" :key="i" :class="legendRow">
              <div :class="legendName">
                <span v-if="l.dot" :class="dotClass(l.dot)" />
                <span :class="i === 0 ? bodyStrong : bodyText">{{ l.label }}</span>
              </div>
              <span :class="legendNum">{{ l.count }}</span>
              <span :class="legendPct">{{ l.percent }}</span>
            </div>
          </div>
        </MpFlex>
      </section>

      <!-- ═════ Review history (empty) ═════ -->
      <section :class="cardStack">
        <div :class="headerRow">
          <MpText as="h2" :class="cardTitle">Review history</MpText>
          <MpFlex gap="4" align="center" :class="filterGroup">
            <MpToggle id="rh-final" :is-checked="false" is-disabled>Final score only</MpToggle>
            <PxSelectPopover v-model="reviewCycle" :options="cycleOptions" :width="'160px'" />
          </MpFlex>
        </div>
        <div :class="chartWrap">
          <div :class="baseline">
            <div v-for="n in 7" :key="n" :class="baselineLine" />
          </div>
          <div :class="axisRow">
            <span v-for="a in axis" :key="a" :class="axisText">{{ a }}</span>
          </div>
          <div :class="emptyOverlay">
            <div :class="emptyCard">
              <span :class="emptyTitle">No review scores yet</span>
              <span :class="metaText">Scores will appear here once employees complete their reviews for this cycle.</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ═════ 360 breakdown (empty) ═════ -->
      <section :class="cardStack">
        <div :class="headerRow">
          <MpText as="h2" :class="cardTitle">360 breakdown</MpText>
          <MpFlex gap="4" align="center" :class="filterGroup">
            <MpToggle id="b360-final" :is-checked="false" is-disabled>Final score only</MpToggle>
            <PxSelectPopover v-model="breakdownCycle" :options="cycleOptions" :width="'160px'" />
          </MpFlex>
        </div>
        <div :class="chartWrap">
          <div :class="baseline">
            <div v-for="n in 7" :key="n" :class="baselineLine" />
          </div>
          <div :class="axisRow">
            <span v-for="a in axis" :key="a" :class="axisText">{{ a }}</span>
          </div>
          <div :class="emptyOverlay">
            <div :class="emptyCard">
              <span :class="emptyTitle">No 360 data yet</span>
              <span :class="metaText">Scores broken down by reviewer type will appear once 360 reviews have been submitted.</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ═════════════════════════ RIGHT COLUMN (one card, three sections) ═════════════════════════ -->
    <div :class="rightCol">

      <!-- ═════ Latest goals ═════ -->
      <section :class="rightSection">
        <MpText as="h2" :class="[cardTitle, css({ marginBottom: '2' })]">Latest goals</MpText>
        <div>
          <div v-for="(g, i) in latestGoals" :key="i" :class="goalItem">
            <span :class="bodyStrong">{{ g.title }}</span>
            <MpFlex align="center" gap="1">
              <PxIcon name="increase-kpi" :size="20" color="icon.secondary" />
              <span :class="metaText">Increase KPI</span>
            </MpFlex>
            <div :class="goalProgress">
              <MpFlex align="center" gap="2">
                <span :class="bodyStrong">{{ g.value }}</span>
                <span :class="g.green ? badgeGreen : badgeNeutral">{{ g.percent }}%</span>
              </MpFlex>
              <div :class="progressTrack">
                <div :class="progressFill" :style="{ width: g.percent + '%' }" />
              </div>
              <MpFlex align="center" justify="space-between">
                <span :class="axisText">{{ g.min }}</span>
                <span :class="axisText">{{ g.max }}</span>
              </MpFlex>
            </div>
          </div>
        </div>
        <div :class="viewAllRow">
          <MpTextlink as="button">
            <MpFlex align="center" gap="1">View all goals <PxIcon name="arrows-right" :size="16" color="icon.brand" /></MpFlex>
          </MpTextlink>
        </div>
      </section>

      <!-- ═════ All employees ═════ -->
      <section :class="rightSection">
        <MpText as="h2" :class="cardTitle">All employees</MpText>
        <span :class="[metaText, css({ marginBottom: '3' })]">Only employees who have been invited in Performance management are on this list.</span>
        <div>
          <div
            v-for="(e, i) in topEmployees"
            :key="i"
            :class="empRow"
            role="button"
            tabindex="0"
            @click="openDirectory(i)"
            @keydown.enter="openDirectory(i)"
          >
            <MpAvatar :id="`emp-${i}`" :name="e.name" :src="e.photo" size="lg" variant-color="gray" />
            <div :class="empContent">
              <span :class="bodyStrong">{{ e.name }}</span>
              <span :class="metaText">{{ employeeMeta(e) }}</span>
            </div>
            <span :class="chevronBtn"><PxIcon name="chevrons-right" :size="20" color="icon.secondary" /></span>
          </div>
        </div>
        <div :class="viewAllRow">
          <MpTextlink as="button" @click="openDirectory(0)">
            <MpFlex align="center" gap="1">View all employees <PxIcon name="arrows-right" :size="16" color="icon.brand" /></MpFlex>
          </MpTextlink>
        </div>
      </section>

      <!-- ═════ Review feedback (empty) ═════ -->
      <section :class="rightSection">
        <MpText as="h2" :class="[cardTitle, css({ marginBottom: '4' })]">Review feedback</MpText>
        <PxSelectPopover v-model="feedbackCycle" :options="cycleOptions" :width="'100%'" />
        <div :class="feedbackEmpty">
          <PxIcon name="chat" :size="32" color="icon.brand" />
          <span :class="emptyTitle">No feedback yet</span>
          <span :class="metaText">Feedback will appear here once reviews are submitted for this cycle.</span>
        </div>
      </section>
    </div>
  </div>

  <!-- ═════ Full-screen employee directory (opens from All employees) ═════ -->
  <EmployeeDirectoryModal
    v-model:is-open="dirOpen"
    v-model:selected-index="dirSelected"
    :employees="employees"
  />
</template>
