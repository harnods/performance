<!--
  Advanced multi-mode period picker (Year / Semester / Quarter / Month / Week /
  Custom range). Source: Figma — Goals, "Advanced Date Picker" (fileKey
  E5Ab98G8lF0UejH49bBHnU, node 4400:27491).

  Year, Month, Week, and Custom range delegate to the official MpDatePicker
  (type="year"|"month"|"date" is-range) — Pixel3 has no native Semester/Quarter
  granularity, so those two tabs are hand-built grids matching the same visual
  language as MpDatePicker's year grid (selected cell = solid blue.400 / white).
-->
<script setup lang="ts">
import { MpIcon, MpDatePicker, MpPopover, MpPopoverTrigger, MpPopoverContent, css } from '@mekari/pixel3'
import type { PeriodMode, PeriodValue } from '~/utils/periodPicker'
import { customRangeValue, formatDateShort, monthValue, quarterValue, semesterValue, weekValue, yearValue } from '~/utils/periodPicker'

const props = defineProps<{
  modelValue: PeriodValue | null
  placeholder?: string
  width?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: PeriodValue): void }>()

const isOpen = ref(false)
const wrapperStyle = computed(() => ({ width: props.width ?? '100%' }))

const tabs: { key: PeriodMode, label: string }[] = [
  { key: 'year', label: 'Year' },
  { key: 'semester', label: 'Semester' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'custom', label: 'Custom range' },
]
const activeTab = ref<PeriodMode>('semester')

const nowYear = new Date().getFullYear()

// Draft state fed into MpDatePicker instances (native modes)
const yearDraft = ref<Date>(new Date())
const monthDraft = ref<Date>(new Date())
const weekDraft = ref<Date>(new Date())
const customRangeDraft = ref<Date[]>([])

// Draft state for the hand-built grids — single-year nav, same as Month/Week
const semesterYear = ref(nowYear)
const quarterYear = ref(nowYear)

function pick(value: PeriodValue) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function isSelected(candidate: PeriodValue): boolean {
  return !!props.modelValue
    && props.modelValue.startDate === candidate.startDate
    && props.modelValue.endDate === candidate.endDate
    && props.modelValue.mode === candidate.mode
}

function rangeText(v: PeriodValue): string {
  return `${formatDateShort(new Date(v.startDate))} - ${formatDateShort(new Date(v.endDate))}`
}

function onYearPick(v: unknown) {
  const d = Array.isArray(v) ? v[0] : v
  if (d instanceof Date) pick(yearValue(d.getFullYear()))
}
function onMonthPick(v: unknown) {
  const d = Array.isArray(v) ? v[0] : v
  if (d instanceof Date) pick(monthValue(d))
}
function onWeekPick(v: unknown) {
  const d = Array.isArray(v) ? v[0] : v
  if (d instanceof Date) pick(weekValue(d))
}
function onCustomRangePick(v: unknown) {
  if (Array.isArray(v) && v[0] instanceof Date && v[1] instanceof Date) pick(customRangeValue(v[0], v[1]))
}

function syncDraftsFromModelValue() {
  const mv = props.modelValue
  if (!mv) {
    activeTab.value = 'semester'
    return
  }
  activeTab.value = mv.mode
  const start = new Date(mv.startDate)
  if (mv.mode === 'year') yearDraft.value = start
  if (mv.mode === 'month') monthDraft.value = start
  if (mv.mode === 'week') weekDraft.value = start
  if (mv.mode === 'custom') customRangeDraft.value = [start, new Date(mv.endDate)]
  if (mv.mode === 'semester') semesterYear.value = start.getFullYear()
  if (mv.mode === 'quarter') quarterYear.value = start.getFullYear()
}

function toggleOpen() {
  if (!isOpen.value) syncDraftsFromModelValue()
  isOpen.value = !isOpen.value
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const triggerClass = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3',
  width: '100%', paddingInline: '3', paddingBlock: '2',
  background: 'white', border: '1px solid', borderColor: 'border.default', borderRadius: 'md',
  cursor: 'pointer', textAlign: 'left',
})
const valueText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const placeholderText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })

const pickerRoot = css({ display: 'flex', width: '416px', background: 'white', borderRadius: 'md' })
const tabList = css({ display: 'flex', flexDirection: 'column', gap: '0.5', width: '136px', paddingBlock: '3', paddingLeft: '3', paddingRight: '2', flexShrink: '0' })
const tabBase = { display: 'flex', width: '100%', paddingInline: '3', paddingBlock: '2', borderRadius: 'md', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '14px', lineHeight: '20px' } as const
const tabDefault = css({ ...tabBase, background: 'transparent', color: 'text.default' })
const tabActive = css({ ...tabBase, background: 'background.brand.selected', color: 'text.link', fontWeight: 'semiBold' })

const panel = css({ flex: '1 1 0', minWidth: '0', paddingInline: '3', paddingBlock: '2', display: 'flex', flexDirection: 'column', gap: '3' })
const gridHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2' })
const gridHeaderNav = css({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'sm', border: 'none', background: 'transparent', cursor: 'pointer', color: 'icon.default', _hover: { background: 'background.neutral.hovered' } })
const gridHeaderLabel = css({ fontSize: '16px', fontWeight: 'semiBold', color: 'text.default', width: '180px', textAlign: 'center' })
const gridBody = css({ display: 'flex', flexDirection: 'column', gap: '1' })

// Semester/Quarter rows: label (H1/Q1) + date range, full-width list row
const listRowBase = {
  display: 'flex', alignItems: 'center', gap: '3', width: '100%',
  paddingInline: '3', paddingBlock: '2', borderRadius: 'sm', border: 'none',
  cursor: 'pointer', textAlign: 'left',
} as const
const listRow = css({ ...listRowBase, background: 'transparent', _hover: { background: 'background.neutral.hovered' } })
const listRowActive = css({ ...listRowBase, background: 'blue.400' })
const listRowLabel = css({ fontSize: '14px', fontWeight: 'semiBold', color: 'text.default', minWidth: '28px', flexShrink: '0' })
const listRowLabelActive = css({ fontSize: '14px', fontWeight: 'semiBold', color: 'white', minWidth: '28px', flexShrink: '0' })
const listRowRange = css({ fontSize: '14px', color: 'text.secondary' })
const listRowRangeActive = css({ fontSize: '14px', color: 'white' })
</script>

<template>
  <div :style="wrapperStyle">
    <MpPopover id="popover-advanced-date-picker" is-manual :is-open="isOpen" use-portal placement="bottom-start" @close="isOpen = false">
      <MpPopoverTrigger>
        <button type="button" :class="triggerClass" @click="toggleOpen">
          <span :class="modelValue ? valueText : placeholderText">{{ modelValue?.label ?? placeholder ?? 'Select period' }}</span>
          <MpIcon name="chevrons-down" size="sm" :class="css({ color: 'icon.secondary', flexShrink: '0' })" />
        </button>
      </MpPopoverTrigger>

      <MpPopoverContent :class="css({ padding: '0', overflow: 'hidden' })">
        <div :class="pickerRoot" @click.stop>
          <!-- Left: mode tabs -->
          <div :class="tabList">
            <button
              v-for="t in tabs"
              :key="t.key"
              type="button"
              :class="activeTab === t.key ? tabActive : tabDefault"
              @click="activeTab = t.key"
            >
              {{ t.label }}
            </button>
          </div>

          <!-- Right: mode panel -->
          <div :class="panel">
            <template v-if="activeTab === 'year'">
              <MpDatePicker v-model="yearDraft" type="year" value-type="date" is-inline @update:model-value="onYearPick" />
            </template>

            <template v-else-if="activeTab === 'semester'">
              <div :class="gridHeader">
                <button type="button" :class="gridHeaderNav" aria-label="Previous year" @click="semesterYear -= 1">
                  <MpIcon name="chevrons-left" size="sm" />
                </button>
                <span :class="gridHeaderLabel">{{ semesterYear }}</span>
                <button type="button" :class="gridHeaderNav" aria-label="Next year" @click="semesterYear += 1">
                  <MpIcon name="chevrons-right" size="sm" />
                </button>
              </div>
              <div :class="gridBody">
                <button
                  v-for="half in ([1, 2] as const)"
                  :key="half"
                  type="button"
                  :class="isSelected(semesterValue(semesterYear, half)) ? listRowActive : listRow"
                  @click="pick(semesterValue(semesterYear, half))"
                >
                  <span :class="isSelected(semesterValue(semesterYear, half)) ? listRowLabelActive : listRowLabel">H{{ half }}</span>
                  <span :class="isSelected(semesterValue(semesterYear, half)) ? listRowRangeActive : listRowRange">{{ rangeText(semesterValue(semesterYear, half)) }}</span>
                </button>
              </div>
            </template>

            <template v-else-if="activeTab === 'quarter'">
              <div :class="gridHeader">
                <button type="button" :class="gridHeaderNav" aria-label="Previous year" @click="quarterYear -= 1">
                  <MpIcon name="chevrons-left" size="sm" />
                </button>
                <span :class="gridHeaderLabel">{{ quarterYear }}</span>
                <button type="button" :class="gridHeaderNav" aria-label="Next year" @click="quarterYear += 1">
                  <MpIcon name="chevrons-right" size="sm" />
                </button>
              </div>
              <div :class="gridBody">
                <button
                  v-for="q in ([1, 2, 3, 4] as const)"
                  :key="q"
                  type="button"
                  :class="isSelected(quarterValue(quarterYear, q)) ? listRowActive : listRow"
                  @click="pick(quarterValue(quarterYear, q))"
                >
                  <span :class="isSelected(quarterValue(quarterYear, q)) ? listRowLabelActive : listRowLabel">Q{{ q }}</span>
                  <span :class="isSelected(quarterValue(quarterYear, q)) ? listRowRangeActive : listRowRange">{{ rangeText(quarterValue(quarterYear, q)) }}</span>
                </button>
              </div>
            </template>

            <template v-else-if="activeTab === 'month'">
              <MpDatePicker v-model="monthDraft" type="month" value-type="date" is-inline @update:model-value="onMonthPick" />
            </template>

            <template v-else-if="activeTab === 'week'">
              <MpDatePicker v-model="weekDraft" type="week" value-type="date" is-inline @update:model-value="onWeekPick" />
            </template>

            <template v-else-if="activeTab === 'custom'">
              <MpDatePicker
                v-model="customRangeDraft"
                type="date"
                value-type="date"
                is-range
                is-inline
                @update:model-value="onCustomRangePick"
              />
            </template>
          </div>
        </div>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>
