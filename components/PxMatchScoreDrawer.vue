<!--
  PxMatchScoreDrawer — "Match score details" drawer opened from a custom pool's
  Match score cell (pages/talents/talent-directory/index.vue). Mirrors the
  Figma "Candidate score details" drawer (Airene AI scoring explanation banner
  + identity block + score-breakdown card with a donut + per-criterion list),
  adapted to this app's own talent-pool criteria (competency/performance/
  attendance/education/years — utils/matchScore.ts) rather than recruiting
  fields (age/salary/gender) that don't exist in this data model.
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerOverlay,
  MpFlex, MpIcon, MpTooltip, MpTextlink, MpChart,
  MpBanner, MpBannerIcon, MpBannerDescription,
  css,
} from '@mekari/pixel3'
import type { TalentEmployee } from '~/utils/talents'
import { computeMatchScore, type MatchScoreResult } from '~/utils/matchScore'
import type { TalentCriteria } from '~/utils/talentCriteria'

const props = defineProps<{
  isOpen: boolean
  talent: TalentEmployee | null
  criteria: TalentCriteria
}>()
const emit = defineEmits<{ close: [] }>()

const result = computed<MatchScoreResult>(() =>
  props.talent ? computeMatchScore(props.talent, props.criteria) : { overall: 0, breakdown: [] },
)

// Same tiering as the Match score table pill (badges.md tiers): >=70 healthy,
// >=40 middling, else poor — donut-chart.md's "arc colour follows the value" rule.
const COLOR_LIME = '#84CC16'
const COLOR_AMBER = '#F59E0B'
const COLOR_RED = '#EF4444'
const COLOR_TRACK = '#D0D6DD'
const arcColor = computed(() => {
  if (result.value.overall >= 70) return COLOR_LIME
  if (result.value.overall >= 40) return COLOR_AMBER
  return COLOR_RED
})
const chartData = computed(() => ({
  datasets: [{
    cutout: '82%',
    data: [result.value.overall, Math.max(0, 100 - result.value.overall)],
    backgroundColor: [arcColor.value, COLOR_TRACK],
  }],
}))
// Static informational ring (unlike the interactive dashboard donut) — no
// segment click/hover popover to wire, so legend and tooltip both stay off.
const chartOptions = { plugins: { datalabels: { display: false } } }

const identityMeta = computed(() => {
  const t = props.talent
  if (!t) return ''
  return `${t.jobPosition} at ${t.organization}`
})

const infoBanner = css({ marginBottom: '6' })
const identityRow = css({ marginBottom: '6' })
const identityName = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const identityLine = css({ display: 'flex', alignItems: 'center', gap: '2', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })

const breakdownCard = css({
  display: 'flex', flexDirection: 'column', gap: '6',
  padding: '6', background: 'background.neutral',
  border: '1px solid', borderColor: 'border.default', borderRadius: 'lg',
})
const breakdownHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const breakdownTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const howItWorks = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })

const breakdownBody = css({ display: 'flex', gap: '6', alignItems: 'center' })
const pieBlock = css({ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' })
const chartBox = css({ width: '180px', height: '180px' })
const centreLabel = css({ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' })
const centreValue = css({ fontSize: '32px', fontWeight: '600', lineHeight: '40px', letterSpacing: '-0.8px', color: 'text.default', fontVariantNumeric: 'tabular-nums' })
const centreCaption = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary', textAlign: 'center' })

const rowList = css({ display: 'flex', flexDirection: 'column', flex: '1' })
const row = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBlock: '3', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default', _last: { borderBottomWidth: '0' } })
const rowLabel = css({ display: 'flex', alignItems: 'center', gap: '2', color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const rowValue = css({ fontVariantNumeric: 'tabular-nums', color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const overallRowLabel = css({ fontWeight: '600', color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const overallRowValue = css({ fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: 'text.default', fontSize: '14px', lineHeight: '20px' })
</script>

<template>
  <ClientOnly>
    <MpDrawer id="drawer-match-score" :is-open="isOpen" placement="right" size="md" is-keep-alive @close="emit('close')">
      <MpDrawerContent>
        <MpDrawerHeader>
          <MpFlex align="center" gap="2">
            <span>Match score details</span>
            <MpIcon name="airene-brand" :class="css({ color: 'icon.brand' })" />
            <MpTooltip label="Calculated by AI based on how well this talent fits the pool's criteria." use-portal>
              <MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary', cursor: 'help' })" />
            </MpTooltip>
          </MpFlex>
          <MpDrawerCloseButton />
        </MpDrawerHeader>
        <MpDrawerBody>
          <MpBanner variant="info" :class="infoBanner">
            <MpBannerIcon name="info" />
            <MpBannerDescription>
              Airene match scoring can be inaccurate or misleading.
              <MpTextlink as="button">Learn more</MpTextlink>
            </MpBannerDescription>
          </MpBanner>

          <MpFlex v-if="talent" align="center" gap="3" :class="identityRow">
            <PxAvatar :id="talent.id" :name="talent.name" :src="talent.photo" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="1">
              <span :class="identityName">{{ talent.name }}</span>
              <span :class="identityLine"><MpIcon name="briefcase" size="sm" />{{ identityMeta }}</span>
              <span :class="identityLine"><MpIcon name="location" size="sm" />{{ talent.branch }}</span>
            </MpFlex>
          </MpFlex>

          <div :class="breakdownCard">
            <div :class="breakdownHeader">
              <span :class="breakdownTitle">Score breakdown</span>
              <span :class="howItWorks">
                <MpIcon name="info" size="sm" :class="css({ color: 'icon.brand' })" />
                <MpTextlink as="button" size="small">How match score is calculated</MpTextlink>
              </span>
            </div>

            <div :class="breakdownBody">
              <div :class="pieBlock">
                <div :class="chartBox">
                  <MpChart
                    id="match-score-donut"
                    type="doughnut"
                    height-chart="180px"
                    width-chart="180px"
                    :data="chartData"
                    :options="chartOptions"
                    :is-show-legend="false"
                    :is-show-tooltip="false"
                  />
                </div>
                <div :class="centreLabel">
                  <span :class="centreValue">{{ result.overall }}%</span>
                  <span :class="centreCaption">Match score</span>
                </div>
              </div>

              <div :class="rowList">
                <div :class="row">
                  <span :class="overallRowLabel">Match score</span>
                  <span :class="overallRowValue">{{ result.overall }}%</span>
                </div>
                <div v-for="b in result.breakdown" :key="b.key" :class="row">
                  <span :class="rowLabel"><MpIcon :name="b.icon" size="sm" :class="css({ color: 'icon.secondary' })" />{{ b.label }}</span>
                  <span :class="rowValue">{{ b.value }}%</span>
                </div>
              </div>
            </div>
          </div>
        </MpDrawerBody>
      </MpDrawerContent>
      <MpDrawerOverlay />
    </MpDrawer>
  </ClientOnly>
</template>
