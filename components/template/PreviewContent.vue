<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/PreviewContent.vue
  Component name preserved: TemplatePreviewContent. Props preserved: data,
  isWeight, legends.
  Production blue.50 info box kept as a plain box (no banner icon).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormLabel, MpTextarea, css } from '@mekari/pixel3'
import type { TemplateCategory, TemplateLegend } from '~/utils/reviewTemplate'

defineOptions({ name: 'TemplatePreviewContent' })

interface PreviewData {
  answer_type?: string
  categories?: TemplateCategory[]
  category_freetext?: TemplateCategory
  required_summary?: string | boolean
  is_apply_score_for_goal_only?: boolean
  is_use_freetext_indicator?: boolean | number
  is_use_negative_indicator?: boolean
  legend_name?: string
  [key: string]: unknown
}

const props = withDefaults(defineProps<{ data?: PreviewData, isWeight?: boolean, legends?: TemplateLegend[] }>(), { data: () => ({}), isWeight: false, legends: () => [] })

const isRequiredSummary = computed(() => String(props.data?.required_summary) === 'true')
const legendTitle = computed(() => (props.data.legend_name?.trim() || 'Legends'))
const isLegend = computed(() => ['rating', 'percent', 'point'].includes(props.data.answer_type ?? ''))

const goalNotice = css({ background: 'background.information.subtle', borderRadius: '6px', padding: '12px', fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const col = css({ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' })
</script>

<template>
  <div :class="col">
    <template v-if="data.is_apply_score_for_goal_only">
      <div :class="goalNotice">You are using the Score for goal only template. Here is an example preview when employees fill out the review form for their goals.</div>
      <TemplatePreviewGoal v-for="goal in [1, 2]" :key="goal" :data-qa="`view-settings-template-preview-goal-${goal}`" :number="goal" :template="data" />
    </template>

    <!-- Categories -->
    <template v-else>
      <TemplateCategoryItem
        v-for="(category, catIdx) in data.categories"
        :key="catIdx"
        :data-qa="`view-settings-template-preview-category-${catIdx}`"
        :category="category"
        :answer-type="data.answer_type"
        :is-weight="isWeight"
        :template="data"
        indicators-key="indicators"
        :ratings-key="data.answer_type === 'point' ? 'points' : 'ratings'"
      />
    </template>

    <!-- Free text indicator category -->
    <TemplateCategoryItem
      v-if="data.is_use_freetext_indicator && data.category_freetext"
      is-freetext-indicator
      :category="data.category_freetext"
      answer-type="free-text"
      :template="data"
      indicators-key="indicators"
      ratings-key="ratings"
    />

    <!-- Negative indicator -->
    <TemplateNegativeIndicator v-if="data.is_use_negative_indicator" :answer-type="data.answer_type" />

    <PendingActionSummaryFooter :is-legend="isLegend" :legends="legends" :legend-title="legendTitle">
      <template #addition>
        <MpFormControl id="preview-summary" :is-required="isRequiredSummary">
          <MpFormLabel>Summary</MpFormLabel>
          <MpTextarea :placeholder="isRequiredSummary ? '' : 'Optional'" />
        </MpFormControl>
      </template>
    </PendingActionSummaryFooter>
  </div>
</template>
