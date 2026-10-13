<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/CategoryItem.vue
  Component name preserved: CategoryItem. Props/events preserved:
  isFreetextIndicator, category, isWeight, isView, answerType, template,
  indicatorsKey, ratingsKey, isForm, isExcludeScoring, resultData, errors;
  emits `updated`. Slot preserved: #comment-input.
  Only the template-preview use is migrated (isForm review flow not wired).
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormLabel, MpFormErrorMessage, MpTextarea, MpText, css } from '@mekari/pixel3'
import type { TemplateCategory, TemplateIndicator } from '~/utils/reviewTemplate'

defineOptions({ name: 'CategoryItem' })

const props = withDefaults(defineProps<{
  isFreetextIndicator?: boolean | number
  category: TemplateCategory
  isWeight?: boolean
  isView?: boolean
  answerType?: string
  template?: Record<string, unknown>
  indicatorsKey?: string
  ratingsKey?: string
  isForm?: boolean
  isExcludeScoring?: boolean
  errors?: Record<string, string[]>
}>(), { isFreetextIndicator: false, isWeight: false, isView: false, answerType: '', template: () => ({}), indicatorsKey: 'private_indicators', ratingsKey: 'private_ratings', isForm: false, isExcludeScoring: false, errors: () => ({}) })

defineEmits<{ updated: [type: string, category: unknown, indicator: unknown, val: unknown] }>()

const indicators = computed(() => ((props.category as unknown as Record<string, TemplateIndicator[]>)[props.indicatorsKey] ?? []))
const isRequiredComment = computed(() => Boolean(props.category.required_comment) || props.isExcludeScoring)
const commentErrors = computed(() => props.errors[`categories.${props.category.id}.comment`] ?? [])
const round2 = (v: string | number) => Math.round(Number(v || 0) * 100) / 100

const card = css({ border: '1px solid', borderColor: 'gray.100', background: 'background.neutral', borderRadius: '6px' })
const head = css({ background: 'gray.25', padding: '16px', borderTopRadius: '6px' })
const title = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default', whiteSpace: 'pre-wrap', wordBreak: 'break-word' })
const weightText = css({ color: 'violet.400' })
const caption = css({ color: 'text.secondary', fontSize: '14px', lineHeight: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' })
const body = css({ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' })
const viewBox = css({ background: 'gray.25', padding: '16px', borderRadius: '6px' })
const smallBold = css({ fontWeight: '600', fontSize: '12px', lineHeight: '16px' })
const blockGap = css({ marginTop: '8px' })
const indicatorText = css({ fontSize: '14px', lineHeight: '24px', color: 'text.default', whiteSpace: 'pre-wrap', wordBreak: 'break-word' })
</script>

<template>
  <div :class="card">
    <!-- Category info -->
    <div :class="head">
      <MpText :class="title">{{ category.name }}<span v-if="isWeight" :class="weightText"> ({{ round2(category.weight) }}%)</span></MpText>
      <MpText v-if="category.description" :class="caption">{{ category.description }}</MpText>
    </div>

    <div :class="body">
      <!-- Indicators -->
      <div
        v-for="(indicator, indIdx) in indicators"
        :key="indIdx"
        :class="isView && viewBox"
        :data-qa="`view-settings-template-category-item-indicator-${indIdx}`"
      >
        <MpText v-if="isExcludeScoring" :class="smallBold">Indicator {{ indIdx + 1 }}</MpText>
        <MpText :class="indicatorText">{{ indicator.name }}<span v-if="isWeight" :class="weightText"> ({{ round2(indicator.weight) }}%)</span></MpText>

        <div v-if="!isView && !isExcludeScoring" :class="blockGap">
          <PendingActionReviewFormBlock
            v-if="answerType === 'custom'"
            :answer-type="indicator.answer_type ?? ''"
            :template="template"
            :indicator="indicator"
            :ratings-key="ratingsKey"
          />
          <PendingActionReviewFormBlock
            v-else-if="answerType"
            :answer-type="answerType"
            :template="template"
            :indicator="indicator"
            :ratings-key="ratingsKey"
          />
        </div>
      </div>

      <MpFormControl
        v-if="!isFreetextIndicator && !isView"
        :id="`preview-category-${category.id}-comment`"
        :is-required="isRequiredComment"
        :is-invalid="commentErrors.length > 0"
      >
        <MpFormLabel>Comment</MpFormLabel>
        <slot name="comment-input">
          <MpTextarea :placeholder="isRequiredComment ? 'Please write your comment here' : 'Optional'" />
        </slot>
        <MpFormErrorMessage v-for="(error, errIdx) in commentErrors" :key="errIdx">{{ error.includes('required') ? 'This field is required' : error }}</MpFormErrorMessage>
      </MpFormControl>
    </div>
  </div>
</template>
