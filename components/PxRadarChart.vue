<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PxRadarChart — lightweight SVG spider/radar chart (no chart lib).
  Plots two series (score + target) across N axes.
  Token mode: Pixel 2.4 (colours via --mp-colors-* vars).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { css } from '@mekari/pixel3'

const props = withDefaults(defineProps<{
  data: { label: string, score: number, target: number }[]
  max?: number
}>(), { max: 5 })

const SIZE = 400
const C = SIZE / 2
const R = 130

function point(index: number, value: number) {
  const n = props.data.length
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n
  const r = R * (value / props.max)
  return { x: C + r * Math.cos(angle), y: C + r * Math.sin(angle) }
}
const poly = (values: number[]) =>
  values.map((v, i) => { const p = point(i, v); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')

const rings = computed(() =>
  Array.from({ length: props.max }, (_, i) => i + 1).map(level => poly(props.data.map(() => level))),
)
const axisEnds = computed(() => props.data.map((_, i) => point(i, props.max)))
const scorePoly = computed(() => poly(props.data.map(d => d.score)))
const targetPoly = computed(() => poly(props.data.map(d => d.target)))
const scoreDots = computed(() => props.data.map((d, i) => point(i, d.score)))
// Vertices are marked with letters (A, B, C…) to avoid cramming long group
// names around the chart; the legend maps each letter to its competency group.
const marker = (i: number) => String.fromCharCode(65 + i)
const vertexLabels = computed(() => props.data.map((d, i) => {
  const p = point(i, props.max + 0.4)
  const anchor = Math.abs(p.x - C) < 2 ? 'middle' : p.x > C ? 'start' : 'end'
  return { x: p.x, y: p.y, marker: marker(i), anchor }
}))
const groupLegend = computed(() => props.data.map((d, i) => ({ marker: marker(i), label: d.label })))

// Hover tooltip — shows the competency, its score and target.
const hovered = ref<number | null>(null)
const tooltip = computed(() => {
  if (hovered.value === null) return null
  const d = props.data[hovered.value]
  const p = point(hovered.value, d.score)
  return { left: (p.x / SIZE) * 100, top: (p.y / SIZE) * 100, label: d.label, score: d.score, target: d.target }
})
const num1 = (n: number) => n.toFixed(1)
// Scale numbers (1..max) up the top axis, so the rings are readable.
const scaleMarks = computed(() =>
  Array.from({ length: props.max }, (_, i) => i + 1).map(level => ({ level, y: point(0, level).y })),
)

const chartInner = css({ position: 'relative', width: '100%', maxWidth: '440px', margin: '0 auto' })
const chart = css({ width: '100%', display: 'block', overflow: 'visible' })
const hit = css({ cursor: 'pointer' })
const tip = css({
  position: 'absolute', transform: 'translate(-50%, calc(-100% - 10px))', zIndex: '5',
  pointerEvents: 'none', whiteSpace: 'nowrap',
  background: 'var(--mp-colors-text-default)', color: 'white',
  borderRadius: 'md', paddingInline: '3', paddingBlock: '2',
  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
})
const tipTitle = css({ fontSize: '12px', fontWeight: '600', lineHeight: '16px' })
const tipMeta = css({ fontSize: '12px', lineHeight: '16px', opacity: '0.85' })
const markerText = css({ fontSize: '13px', lineHeight: '14px', fontWeight: '700' })
const scaleText = css({ fontSize: '10px', lineHeight: '12px' })

// Chart + legend sit side by side (legend to the right of the chart).
const wrap = css({ display: 'flex', alignItems: 'center', gap: '6', width: '100%', flexWrap: 'wrap' })
const chartBox = css({ flex: '1 1 400px', minWidth: '320px' })
const legendPanel = css({ display: 'flex', flexDirection: 'column', gap: '4', width: '190px', flexShrink: '0' })
const legendSection = css({ display: 'flex', flexDirection: 'column', gap: '2' })
// Series section sits under the groups, separated by a divider.
const seriesSection = css({ display: 'flex', flexDirection: 'column', gap: '2', paddingTop: '3', borderTop: '1px solid', borderTopColor: 'border.default' })
const sectionLabel = css({ fontSize: '11px', lineHeight: '16px', fontWeight: '600', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.02em' })
const legendItem = css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: '13px', lineHeight: '18px', color: 'text.default' })
const swatchBox = css({ width: '16px', height: '16px', borderRadius: 'sm', flexShrink: '0' })
const swatchDashed = css({ width: '20px', height: '0', borderTopWidth: '2px', borderTopStyle: 'dashed', flexShrink: '0' })
const groupItem = css({ display: 'flex', alignItems: 'center', gap: '2', minWidth: '0' })
const groupBadge = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  width: '20px', height: '20px', borderRadius: 'full',
  background: 'background.neutral.subtle', color: 'text.default',
  fontSize: '11px', fontWeight: '700', lineHeight: '1',
})
const groupName = css({ fontSize: '13px', lineHeight: '18px', color: 'text.default' })
</script>

<template>
  <div :class="wrap">
    <div :class="chartBox">
    <div :class="chartInner">
    <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" :class="chart" role="img" aria-label="Competency score versus target radar chart">
      <!-- grid rings -->
      <polygon v-for="(ring, i) in rings" :key="`ring-${i}`" :points="ring" fill="none" stroke="var(--mp-colors-gray-100)" stroke-width="1" />
      <!-- axes -->
      <line v-for="(p, i) in axisEnds" :key="`axis-${i}`" :x1="C" :y1="C" :x2="p.x" :y2="p.y" stroke="var(--mp-colors-gray-100)" stroke-width="1" />
      <!-- target series (dashed outline) -->
      <polygon :points="targetPoly" fill="none" stroke="var(--mp-colors-gray-400)" stroke-width="2" stroke-dasharray="4 4" />
      <!-- score series (filled) -->
      <polygon :points="scorePoly" fill="var(--mp-colors-blue-400)" fill-opacity="0.15" stroke="var(--mp-colors-blue-400)" stroke-width="2" />
      <circle v-for="(p, i) in scoreDots" :key="`dot-${i}`" :cx="p.x" :cy="p.y" r="3" fill="var(--mp-colors-blue-400)" />
      <!-- scale numbers (up the top axis) -->
      <text
        v-for="m in scaleMarks"
        :key="`scale-${m.level}`"
        :x="C - 5"
        :y="m.y"
        text-anchor="end"
        dominant-baseline="middle"
        fill="var(--mp-colors-gray-400)"
        :class="scaleText"
      >{{ m.level }}</text>
      <!-- vertex markers (A, B, C…) -->
      <text
        v-for="(l, i) in vertexLabels"
        :key="`lbl-${i}`"
        :x="l.x"
        :y="l.y"
        :text-anchor="l.anchor"
        dominant-baseline="middle"
        fill="var(--mp-colors-text-default)"
        :class="markerText"
      >{{ l.marker }}</text>
      <!-- hover hit targets (invisible) over each score point -->
      <circle
        v-for="(p, i) in scoreDots"
        :key="`hit-${i}`"
        :cx="p.x"
        :cy="p.y"
        r="16"
        fill="transparent"
        :class="hit"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
      />
    </svg>
    <div v-if="tooltip" :class="tip" :style="{ left: `${tooltip.left}%`, top: `${tooltip.top}%` }">
      <div :class="tipTitle">{{ tooltip.label }}</div>
      <div :class="tipMeta">Score {{ num1(tooltip.score) }} · Target {{ num1(tooltip.target) }}</div>
    </div>
    </div>
    </div>

    <!-- legend panel (right of chart): competency groups, then series below -->
    <div :class="legendPanel">
      <div :class="legendSection">
        <span :class="sectionLabel">Competency groups</span>
        <div v-for="g in groupLegend" :key="g.marker" :class="groupItem">
          <span :class="groupBadge">{{ g.marker }}</span>
          <span :class="groupName">{{ g.label }}</span>
        </div>
      </div>
      <div :class="seriesSection">
        <span :class="sectionLabel">Series</span>
        <span :class="legendItem"><span :class="swatchBox" :style="{ background: 'var(--mp-colors-blue-400)' }" />Score</span>
        <span :class="legendItem"><span :class="swatchDashed" :style="{ borderTopColor: 'var(--mp-colors-gray-400)' }" />Target</span>
      </div>
    </div>
  </div>
</template>
