<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — "No matching competency assignment" notice
  Source: Flexible Competency Assignment PRD — US2 (Gap Chart) & US4 (Review Form)
  Token mode: Pixel 2.4
  Patterns used: form-view notice / inline informational state
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Shared, logic-only surface. US2 and US4 resolve the matching assignment
  server-side (scoped > unscoped). When no assignment matches the employee's
  (job position + level/grade/class), both surfaces render THIS notice instead
  of a target/competency list. Per D5: no fallback to a different assignment.

  Usage:
    <PxNoAssignmentNotice :attribute="'grade'" contact-hr />
  attribute: 'job level' | 'grade' | 'class' | '' — interpolated into the copy.
-->
<script setup lang="ts">
import { MpBanner, MpBannerIcon, MpBannerTitle, MpBannerDescription, css } from '@mekari/pixel3'

const props = withDefaults(defineProps<{
  /** Scoping dimension the employee is missing, e.g. 'grade'. Empty = generic. */
  attribute?: '' | 'job level' | 'grade' | 'class'
  /** Append the "Contact your HR Admin." guidance (gap chart variant). */
  contactHr?: boolean
}>(), {
  attribute: '',
  contactHr: false,
})

// ── Copy (PRD specifies intent, not exact strings — iterate freely) ──
const TITLE = 'No competency assignment found'
const description = computed(() => {
  const tail = props.attribute ? ` and ${props.attribute}` : ''
  const base = `No competency assignment matches this role${tail}.`
  return props.contactHr ? `${base} Contact your HR Admin.` : base
})

const wrap = css({ width: '100%' })
</script>

<template>
  <div :class="wrap">
    <MpBanner variant="info">
      <MpBannerIcon />
      <MpBannerTitle>{{ TITLE }}</MpBannerTitle>
      <MpBannerDescription>{{ description }}</MpBannerDescription>
    </MpBanner>
  </div>
</template>
