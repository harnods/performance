<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/reviews/performance-review/pending-action/components/SummaryFooter.vue
  Component name preserved: SummaryFooter. Props preserved: isRating, ratings,
  isLegend, legends, isLayered. Slot preserved: #addition.
  The approval-status list (isApprovalList/statuses) belongs to the review
  submission flow and is not migrated.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell, css } from '@mekari/pixel3'
import type { TemplateLegend, TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'SummaryFooter' })

withDefaults(defineProps<{
  isRating?: boolean
  ratings?: TemplateRating[]
  isLegend?: boolean
  legends?: TemplateLegend[]
  isLayered?: boolean
  legendTitle?: string
}>(), { isRating: false, ratings: () => [], isLegend: false, legends: () => [], isLayered: false })

// Production frames this block (1px border, rounded, white) like the category
// cards above it in the preview.
const box = css({ display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid', borderColor: 'gray.100', borderRadius: '6px', padding: '16px', background: 'background.neutral' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const pointCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '1%' })
const ratingRow = css({ display: 'flex', gap: '1' })
</script>

<template>
  <div :class="box">
    <slot name="addition" />

    <MpTableContainer v-if="isRating && ratings.length">
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" :class="headCell">Rating</MpTableCell>
            <MpTableCell v-if="isLayered" as="th" :class="headCell">Point</MpTableCell>
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="(rating, ratingIdx) in ratings" :key="ratingIdx" :data-qa="`view-review-summary-footer-rating-${ratingIdx}`">
            <MpTableCell as="td" :class="cell">
              <span :class="ratingRow"><span>{{ rating.value }}.</span><span>{{ rating.name }}</span></span>
            </MpTableCell>
            <MpTableCell v-if="isLayered" as="td" :class="pointCell">{{ rating.from }} - {{ rating.to }} point</MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <LegendList v-if="isLegend" :legends="legends" :title="legendTitle || 'Legends'" />
  </div>
</template>
