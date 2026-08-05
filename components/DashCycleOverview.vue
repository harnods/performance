<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dashboard widget — Cycle overview (stacked bar)
  Token mode: Pixel 2.4 · Pixel 3 MpChart

  Replica of talenta-review's CycleOverviewChart.vue. One stacked bar per
  department: Submit (green) vs Not submit (grey), 0–100%. Custom hover tooltip
  ("{n} reviewers" / Submit / Not submit/ Draft / Total review tasks). "View
  percentage on chart" toggles the % value labels. DEMO MOCK data.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpFlex, MpText, MpCheckbox, MpChart, MpDivider, css } from '@mekari/pixel3'

interface CycleRow { org: string, reviewers: number, submit: number, notSubmit: number }
const props = defineProps<{ rows: CycleRow[] }>()

function pct(n: number, total: number) { return total ? Math.round((n / total) * 100) : 0 }
const enriched = computed(() => props.rows.map(r => ({
  ...r,
  total: r.submit + r.notSubmit,
  submitPct: pct(r.submit, r.submit + r.notSubmit),
  notSubmitPct: 100 - pct(r.submit, r.submit + r.notSubmit),
})))

const showPercent = ref(false)

const COLOR_SUBMIT = '#22C55E'
const COLOR_NOT_SUBMIT = '#E4E7EC'

const chartData = computed(() => ({
  labels: enriched.value.map(r => r.org),
  datasets: [
    // borderWidth 0 — no white border around/between bar segments (it was
    // breaking up the gridline behind the bars).
    { label: 'Submit', data: enriched.value.map(r => r.submitPct), backgroundColor: COLOR_SUBMIT, borderWidth: 0, borderColor: 'transparent' },
    { label: 'Not submit', data: enriched.value.map(r => r.notSubmitPct), backgroundColor: COLOR_NOT_SUBMIT, borderWidth: 0, borderColor: 'transparent' },
  ],
}))
const chartOptions = computed(() => ({
  // Extra top padding so the data label above the full-height (100%) bar
  // isn't clipped at the top of the plot area.
  layout: { padding: { top: 20 } },
  scales: { y: { min: 0, max: 100, ticks: { stepSize: 25, callback: (v: number) => `${v}%` } } },
  plugins: {
    datalabels: {
      display: showPercent.value,
      color: '#1B2126',
      formatter: (v: number) => (v ? `${v}%` : ''),
    },
  },
}))

const isBlank = computed(() => enriched.value.length === 0)

// Custom tooltip data by category index.
function ttRow(tooltip: { dataPoints?: { dataIndex: number }[] }) {
  const i = tooltip?.dataPoints?.[0]?.dataIndex ?? 0
  return enriched.value[i]
}

const heading = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const headerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', marginBottom: '4' })
const emptyWrap = css({ padding: '10', textAlign: 'center' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })

// Tooltip styles
const tt = css({ display: 'flex', flexDirection: 'column', gap: '2', padding: '3', minWidth: '220px' })
const ttTitle = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const ttLine = css({ display: 'flex', alignItems: 'center', gap: '2' })
const ttSwatch = css({ width: '12px', height: '12px', borderRadius: '2px', flexShrink: '0' })
const ttLabel = css({ fontSize: '14px', color: 'text.default', flex: '1' })
const ttCount = css({ fontSize: '14px', fontWeight: '600', color: 'text.default', fontVariantNumeric: 'tabular-nums' })
const ttPct = css({ fontSize: '14px', fontWeight: '600', color: 'text.default', fontVariantNumeric: 'tabular-nums', width: '48px', textAlign: 'right' })
const ttTotalRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
</script>

<template>
  <div>
    <div :class="headerRow">
      <MpText :class="heading">Cycle overview</MpText>
      <MpCheckbox id="view-percentage" v-model:is-checked="showPercent" :is-disabled="isBlank">View percentage on chart</MpCheckbox>
    </div>

    <MpChart
      v-if="!isBlank"
      id="cycle-overview-chart"
      type="bar"
      height-chart="320px"
      :data="chartData"
      :options="chartOptions"
      :is-stacked="true"
      :is-show-data-labels="true"
      legend-position="bottom"
      legend-direction="center"
    >
      <template #tooltip="tooltip">
        <div :class="tt">
          <span :class="ttTitle">{{ ttRow(tooltip)?.reviewers }} reviewers</span>
          <div :class="ttLine">
            <span :class="ttSwatch" :style="{ background: COLOR_SUBMIT }" />
            <span :class="ttLabel">Submit</span>
            <span :class="ttCount">{{ ttRow(tooltip)?.submit }}</span>
            <span :class="ttPct">{{ ttRow(tooltip)?.submitPct }}%</span>
          </div>
          <div :class="ttLine">
            <span :class="ttSwatch" :style="{ background: COLOR_NOT_SUBMIT }" />
            <span :class="ttLabel">Not submit/ Draft</span>
            <span :class="ttCount">{{ ttRow(tooltip)?.notSubmit }}</span>
            <span :class="ttPct">{{ ttRow(tooltip)?.notSubmitPct }}%</span>
          </div>
          <MpDivider />
          <div :class="ttTotalRow">
            <span :class="ttLabel">Total review tasks</span>
            <span :class="ttCount">{{ ttRow(tooltip)?.total }}</span>
          </div>
        </div>
      </template>
    </MpChart>

    <MpFlex v-else direction="column" align="center" gap="1" :class="emptyWrap">
      <MpText :class="emptyTitle">No data to display yet</MpText>
      <MpText size="label" :class="captionText">Review submissions across departments will appear here once reviews are submitted.</MpText>
    </MpFlex>
  </div>
</template>
