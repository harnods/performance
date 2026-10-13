<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/PreviewGoal.vue
  Component name preserved: PreviewGoal. Props preserved: number, template.
  Static placeholder content ("xxxx") is production's own copy.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpFormControl, MpFormLabel, MpTextarea, MpText, MpIcon, MpBadge, MpProgress, css } from '@mekari/pixel3'
import type { TemplateRating } from '~/utils/reviewTemplate'

defineOptions({ name: 'PreviewGoal' })

withDefaults(defineProps<{
  number?: number
  template?: { answer_type?: string, ratings?: TemplateRating[], is_layered_scoring?: boolean, is_required_comment_goal?: boolean, is_allow_value?: boolean | number }
}>(), { number: 1, template: () => ({}) })

const value = ref('')

const card = css({ display: 'flex', flexDirection: 'column', gap: '4', background: 'background.neutral', border: '1px solid', borderColor: 'border.default', borderRadius: 'md', padding: '4' })
const top = css({ display: 'flex', width: '100%', gap: '4' })
const grow = css({ flex: '1', minWidth: '0' })
const title = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const meta = css({ display: 'flex', gap: '4', marginTop: '1', color: 'text.secondary' })
const metaItem = css({ display: 'inline-flex', alignItems: 'center', gap: '1' })
const scoreCol = css({ width: '160px', flexShrink: '0' })
const caption = css({ color: 'text.secondary' })
const progressHead = css({ display: 'flex', alignItems: 'center', gap: '1', marginBottom: '2' })
const progressFoot = css({ display: 'flex', justifyContent: 'space-between', marginTop: '2', fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'teal.400' } })
</script>

<template>
  <div :class="card">
    <div :class="top">
      <div :class="grow">
        <MpText :class="title">Goal example {{ number }}</MpText>
        <div :class="meta">
          <span :class="metaItem"><MpIcon name="goal" size="sm" /> Goal type</span>
          <span :class="metaItem"><MpIcon name="calendar" size="sm" /> Goal date</span>
          <span :class="metaItem"><MpIcon name="increase-kpi" size="sm" /> KPI type</span>
        </div>
      </div>
      <div :class="scoreCol">
        <CycleInputRatingPercent v-if="template.answer_type === 'percent'" :template="template" />
      </div>
    </div>

    <MpText :class="caption">Here will appear a description of the ongoing employee goal.</MpText>

    <div>
      <div :class="progressHead">
        <span>xxxx</span>
        <MpBadge for="tableStatus" type="completed" size="sm">xx%</MpBadge>
      </div>
      <MpProgress variant="linear" size="sm" value="25" :class="tealProgress" />
      <div :class="progressFoot">
        <span>xxxx</span>
        <span>xxxx</span>
      </div>
    </div>

    <FormRatings
      v-if="template.answer_type === 'rating'"
      prevent-validation
      :ratings="template.ratings ?? []"
      :is-layered="Boolean(template.is_layered_scoring)"
      :selected-val="value"
      @updated="(v) => (value = v)"
    />

    <MpFormControl :id="`preview-goal-${number}-comment`" :is-required="Boolean(template.is_required_comment_goal)">
      <MpFormLabel>Comment</MpFormLabel>
      <MpTextarea :placeholder="template.is_required_comment_goal ? '' : 'Optional'" />
    </MpFormControl>
  </div>
</template>
