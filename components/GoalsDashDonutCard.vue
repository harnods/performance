<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goals dashboard — distribution donut card
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2641:59407)
  Token mode: Pixel 2.4 · chart via Pixel 3 MpChart (type="doughnut")

  A single share-of-total figure: bordered white card, H2 + description, then a
  240px ring with the percentage stacked over its hole.

  Both ring segments are INTERACTIVE: hovering either one shows a pill popover
  naming that segment and its count; clicking one emits `segment-click` with the
  segment key so the parent can route or open a drawer. The legend stays off —
  the hover popover is the legend. Pattern doc: docs/patterns/donut-chart.md.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpChart, css } from '@mekari/pixel3'

const props = defineProps<{
  id: string
  title: string
  description: string
  percent: number
  caption: string
  // Segment 1 = the filled arc, segment 2 = the grey remainder.
  filledLabel: string
  filledCount: number
  remainderLabel: string
  remainderCount: number
}>()
const emit = defineEmits<{ (e: 'segment-click', segment: 'filled' | 'remainder'): void }>()

// Chart.js needs real colour values (it paints to a canvas and can't read a
// Panda token), so chart series carry hex here — the same exception
// DashCycleOverview.vue already makes. Figma: Chart/$lime-400, Chart/$amber-400,
// and its red sibling; track Gray/$gray-100.
const COLOR_LIME = '#84CC16'
const COLOR_AMBER = '#F59E0B'
const COLOR_RED = '#EF4444'
const COLOR_TRACK = '#D0D6DD'

// The arc colour is driven by the VALUE, not by which card this is: healthy
// share reads green, middling amber, poor red, and an all-zero ring is grey
// only (no coloured arc to mis-read as "a little bit good").
const arcColor = computed(() => {
  if (props.percent >= 70) return COLOR_LIME
  if (props.percent >= 40) return COLOR_AMBER
  return COLOR_RED
})

// Structure mirrors the Pixel docs' "Progress" doughnut exactly (chart.html →
// Doughnut Chart → Progress): `cutout` on the DATASET, a two-entry
// backgroundColor, and NO borderWidth override — Chart.js's default 2px white
// arc border is what draws the gap between the coloured and grey arcs. Setting
// borderWidth: 0 removes that gap.
const chartData = computed(() => ({
  labels: [props.filledLabel, props.remainderLabel],
  datasets: [{
    cutout: '82%',
    data: [props.percent, Math.max(0, 100 - props.percent)],
    backgroundColor: [arcColor.value, COLOR_TRACK],
  }],
}))

// 240px outer with a 22px ring = a 196px hole (Figma's proportions).
//
// ⚠️ `hover` MUST be restored here. MpChart's own base options hard-set
// `hover: { mode: null }`, which makes Chart.js's _getActiveElements() resolve
// Interaction.modes[null] → undefined → ALWAYS an empty array. Every onHover /
// onClick then receives `elements: []` and no segment is ever identifiable.
// (The tooltip is unaffected — the tooltip plugin runs its own hit-test, which
// is why hovering can show a popover while clicks silently do nothing.)
const chartOptions = computed(() => ({
  hover: { mode: 'nearest', intersect: true },
  plugins: { datalabels: { display: false } },
  onHover: (event: { native?: { target?: HTMLElement } }, elements: unknown[]) => {
    const target = event?.native?.target
    if (target) target.style.cursor = elements.length ? 'pointer' : 'default'
  },
  onClick: (_e: unknown, elements: { index: number }[]) => {
    if (!elements.length) return
    emit('segment-click', elements[0].index === 0 ? 'filled' : 'remainder')
  },
}))

// The hover popover's contents, resolved from the hovered arc index.
function tooltipRow(tooltip: { dataPoints?: { dataIndex: number }[] }) {
  const i = tooltip?.dataPoints?.[0]?.dataIndex ?? 0
  return i === 0
    ? { label: props.filledLabel, count: props.filledCount }
    : { label: props.remainderLabel, count: props.remainderCount }
}

const card = css({
  display: 'flex', flexDirection: 'column', gap: '6',
  padding: '6', background: 'white',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'lg',
})
const headerList = css({ display: 'flex', flexDirection: 'column' })
const cardTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const cardDescription = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })

const pieBlock = css({ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: '6' })
const chartBox = css({ width: '240px', height: '240px' })
const centreLabel = css({
  position: 'absolute', inset: '0',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  pointerEvents: 'none',
})
const centreValue = css({
  fontSize: '40px', fontWeight: '600', lineHeight: '40px', letterSpacing: '-0.8px',
  color: 'text.default', fontVariantNumeric: 'tabular-nums',
})
const centreCaption = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })

// Hover popover — one rounded pill: label then bold count.
const tip = css({ display: 'flex', alignItems: 'center', gap: '6', paddingBlock: '3', paddingInline: '4' })
const tipLabel = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', whiteSpace: 'nowrap' })
const tipCount = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', fontVariantNumeric: 'tabular-nums' })
</script>

<template>
  <div :class="card">
    <div :class="headerList">
      <span :class="cardTitle">{{ title }}</span>
      <span :class="cardDescription">{{ description }}</span>
    </div>

    <div :class="pieBlock">
      <div :class="chartBox">
        <MpChart
          :id="id"
          type="doughnut"
          height-chart="240px"
          width-chart="240px"
          :data="chartData"
          :options="chartOptions"
          :is-show-legend="false"
        >
          <template #tooltip="tooltip">
            <div :class="tip">
              <span :class="tipLabel">{{ tooltipRow(tooltip)?.label }}</span>
              <span :class="tipCount">{{ tooltipRow(tooltip)?.count }}</span>
            </div>
          </template>
        </MpChart>
      </div>
      <div :class="centreLabel">
        <span :class="centreValue">{{ percent }}%</span>
        <span :class="centreCaption">{{ caption }}</span>
      </div>
    </div>
  </div>
</template>
