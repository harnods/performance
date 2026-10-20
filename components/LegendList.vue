<!--
  Migrated from talenta-review (commit 010875214aba): src/components/LegendList.vue
  Component name preserved: LegendList. Props preserved: legends.
  Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import { MpText, css } from '@mekari/pixel3'
import { formatDecimalMax, type TemplateLegend } from '~/utils/reviewTemplate'

defineOptions({ name: 'LegendList' })
withDefaults(defineProps<{ legends: TemplateLegend[], title?: string }>(), { title: 'Legends' })

const titleClass = css({ fontSize: '14px', fontWeight: '600', lineHeight: '24px', marginBottom: '8px' })
const list = css({ display: 'flex', flexWrap: 'wrap', columnGap: '16px', rowGap: '8px' })
const item = css({ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', lineHeight: '20px' })
const swatch = css({ width: '12px', height: '12px', borderRadius: '4px', flexShrink: '0' })
const label = css({ flex: '1', overflowWrap: 'anywhere' })
</script>

<template>
  <div>
    <MpText :class="titleClass">{{ title }}</MpText>
    <div :class="list">
      <div v-for="(legend, legendIdx) in legends" :key="`legend-${legendIdx}`" :class="item" :data-qa="`component-legend-list-item-${legendIdx}`">
        <!-- Legend colour is user-picked data, so it's a dynamic style. -->
        <span :class="swatch" :style="{ backgroundColor: legend.color }" />
        <span :class="label">{{ formatDecimalMax(legend.from) }} - {{ formatDecimalMax(legend.to) }} {{ legend.description }}</span>
      </div>
    </div>
  </div>
</template>
