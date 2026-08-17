<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goals dashboard — On track / Off track / Not started summary cards
  Source: Figma — Dashboard v2.0 (fileKey 7pwBIQUOhUCwdu0S3ZNjhI, node 2641:46007)
  Token mode: Pixel 2.4

  Three equal-width tinted stat cards. Each = tinted surface + matching border,
  a bottom-bordered header block (title + 40px figure + delta + employee
  coverage) and a 4-row level breakdown. Pattern doc: docs/patterns/stat-card.md.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import { MpIcon, css } from '@mekari/pixel3'
import type { SummaryBucket } from '~/composables/useGoalsDashboard'

defineProps<{
  onTrack: SummaryBucket
  offTrack: SummaryBucket
  notStarted: SummaryBucket
}>()
const emit = defineEmits<{ (e: 'open', status: 'green' | 'orange' | 'gray'): void }>()

// Direction only — higher than last cycle is green + caret-up, lower is red +
// caret-down, on every card. The colour reports which way the number moved; it
// does not judge whether that movement is good for this particular bucket.
function isUp(deltaPct: number) { return deltaPct >= 0 }

const grid = css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: 'repeat(3, 1fr)' }, gap: '6' })

const cardBase = {
  display: 'flex', flexDirection: 'column', gap: '3',
  padding: '6', borderRadius: 'lg', borderWidth: '1px', borderStyle: 'solid',
} as const
const cardGreen = css({ ...cardBase, background: 'green.50', borderColor: 'green.400' })
const cardOrange = css({ ...cardBase, background: 'orange.50', borderColor: 'orange.400' })
const cardGray = css({ ...cardBase, background: 'gray.25', borderColor: 'border.default' })

// Divider = a MUTED tint of the card, not its (much stronger) border colour:
// a full-strength border across the middle cuts the card in two. Figma node
// 2641:46006. paddingBottom is spacing/sm (12px), not xs.
const headerListBase = { display: 'flex', flexDirection: 'column', gap: '2', paddingBottom: '3', borderBottom: '1px solid' } as const
const headerListGreen = css({ ...headerListBase, borderBottomColor: '#B4CCB8' })
const headerListOrange = css({ ...headerListBase, borderBottomColor: '#D9D1B8' })
const headerListGray = css({ ...headerListBase, borderBottomColor: 'gray.100' })
const titleRow = css({ display: 'flex', alignItems: 'flex-start', gap: '2' })
const cardTitle = css({ flex: '1', fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const openBtn = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer',
})

const valueRow = css({ display: 'flex', alignItems: 'flex-end', gap: '2' })
const bigNumberBase = {
  fontSize: '40px', fontWeight: '600', lineHeight: '44px', letterSpacing: '-0.8px',
  whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
} as const
const numberGreen = css({ ...bigNumberBase, color: 'green.700' })
const numberOrange = css({ ...bigNumberBase, color: 'orange.700' })
const numberGray = css({ ...bigNumberBase, color: 'text.default' })

const deltaBlock = css({ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' })
const deltaRow = css({ display: 'flex', alignItems: 'center' })
const deltaBase = { fontSize: '12px', fontWeight: '600', lineHeight: '16px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } as const
// Semantic success/danger — deliberately lighter than the green.1000/red.1000
// end of the scale, which reads almost black at 12px.
const deltaUp = css({ ...deltaBase, color: 'text.success' })
const deltaDown = css({ ...deltaBase, color: 'text.danger' })
const deltaCaption = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', whiteSpace: 'nowrap' })

// Coverage line is plain body text on every card — regular weight, default
// colour. It used to be semibold + tinted per tone, which competed with the
// 40px figure directly above it.
const coverage = css({ fontSize: '14px', fontWeight: '400', lineHeight: '20px', color: 'text.default' })

const listGroup = css({ display: 'flex', flexDirection: 'column' })
const listRow = css({ display: 'flex', alignItems: 'center', paddingBottom: '2', _last: { paddingBottom: '0' } })
// On the tinted cards the label AND its value share one desaturated ink — only
// the weight differs. No DT 2.4 token resolves to either, so these stay literal
// (see docs/patterns/stat-card.md). The neutral card keeps real tokens:
// gray.600 label (#626B79 exactly) + text.default value.
const rowLabelBase = { flex: '1', fontSize: '14px', lineHeight: '20px' } as const
const rowLabelGreen = css({ ...rowLabelBase, color: '#405244' })
const rowLabelOrange = css({ ...rowLabelBase, color: '#61533F' })
const rowLabelMuted = css({ ...rowLabelBase, color: 'gray.600' })

const rowValueBase = { fontSize: '14px', fontWeight: '600', lineHeight: '20px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } as const
const rowValueGreen = css({ ...rowValueBase, color: '#405244' })
const rowValueOrange = css({ ...rowValueBase, color: '#61533F' })
const rowValueDefault = css({ ...rowValueBase, color: 'text.default' })

const cards = computed(() => [
  { key: 'green' as const, title: 'On track', card: cardGreen, header: headerListGreen, number: numberGreen, rowLabel: rowLabelGreen, rowValue: rowValueGreen },
  { key: 'orange' as const, title: 'Off track', card: cardOrange, header: headerListOrange, number: numberOrange, rowLabel: rowLabelOrange, rowValue: rowValueOrange },
  { key: 'gray' as const, title: 'Not started', card: cardGray, header: headerListGray, number: numberGray, rowLabel: rowLabelMuted, rowValue: rowValueDefault },
])
</script>

<template>
  <div :class="grid">
    <div
      v-for="c in cards"
      :key="c.key"
      :class="c.card"
    >
      <template v-for="bucket in [c.key === 'green' ? onTrack : c.key === 'orange' ? offTrack : notStarted]" :key="bucket.status">
        <div :class="c.header">
          <div :class="titleRow">
            <span :class="cardTitle">{{ c.title }}</span>
            <button type="button" :class="openBtn" :aria-label="`Open ${c.title} goals`" @click="emit('open', c.key)">
              <MpIcon name="newtab" size="sm" color="gray.600" />
            </button>
          </div>

          <div :class="valueRow">
            <span :class="c.number">{{ bucket.count }}</span>
            <div v-if="bucket.deltaPct !== null" :class="deltaBlock">
              <div :class="deltaRow">
                <MpIcon
                  :name="isUp(bucket.deltaPct) ? 'caret-up' : 'caret-down'"
                  size="sm"
                  :color="isUp(bucket.deltaPct) ? 'text.success' : 'text.danger'"
                />
                <span :class="isUp(bucket.deltaPct) ? deltaUp : deltaDown">
                  {{ Math.abs(bucket.deltaPct) }}%
                </span>
              </div>
              <span :class="deltaCaption">vs. last cycle</span>
            </div>
          </div>

          <span :class="coverage">{{ bucket.employeePct }}% out of {{ bucket.employeeTotal }} employees</span>
        </div>

        <div :class="listGroup">
          <div v-for="row in bucket.breakdown" :key="row.label" :class="listRow">
            <span :class="c.rowLabel">{{ row.label }}</span>
            <span :class="c.rowValue">{{ row.value }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
