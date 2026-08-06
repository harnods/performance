<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Dashboard — pending actions list modal
  Replica of talenta-review's ModalPendingActionList.vue. Title
  "Pending actions' {name}", a single "Review cycle" column (MpTable) with
  expandable cycle rows → per review-method rows each showing the method name +
  "N pending action(s)" and inline Draft / Not started counters. Data (the
  `cycles` prop) is the reviewer's real pending breakdown from
  useReviewSubmissionsStore.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpText,
  MpIcon,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  css,
} from '@mekari/pixel3'

interface MethodBreakdown { method: string, draft: number, notStarted: number }
interface CycleBreakdown { cycleName: string, methods: MethodBreakdown[] }

const props = defineProps<{ isOpen: boolean, employeeName: string, cycles: CycleBreakdown[] }>()
const emit = defineEmits<{ 'update:isOpen': [v: boolean] }>()

const collapsed = reactive<Record<string, boolean>>({}) // default = expanded
function toggle(name: string) { collapsed[name] = !collapsed[name] }
function isExpanded(name: string) { return !collapsed[name] }
function close() { emit('update:isOpen', false) }

// ─── Column sort (PxColumnSortMenu — reorders the cycle groups; each cycle's
// method sub-rows stay nested with it, and collapsed state is keyed by
// cycleName so reordering never corrupts expand/collapse). ────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = { cycle: 'text' }
const sortedCycles = computed(() => {
  if (!sortKey.value) return props.cycles
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.cycles].sort((a, b) =>
    String(a.cycleName).localeCompare(String(b.cycleName), undefined, { numeric: true, sensitivity: 'base' }) * dir,
  )
})

const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cycleCell = css({ display: 'flex', alignItems: 'center', gap: '2', cursor: 'pointer' })
const cycleName = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
// Golden rule: 8px top/bottom on every text cell; cycle row is 1 line → middle.
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Full-bleed styled block (own paddingBlock + brand border-left) — keep padding 0.
const methodTd = css({ padding: '0' })
const methodInner = css({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4',
  paddingBlock: '3', paddingInline: '4',
  background: 'background.neutral.subtle',
  borderLeft: '3px solid', borderLeftColor: 'border.brand',
})
const methodLeft = css({ display: 'flex', flexDirection: 'column', gap: '0.5' })
const methodName = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const methodSub = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const counters = css({ display: 'flex', gap: '8' })
const counterCol = css({ display: 'flex', flexDirection: 'column', gap: '1', minWidth: '72px' })
const counterLabel = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const counterVal = css({ display: 'flex', alignItems: 'center', gap: '1.5', fontSize: '16px', fontWeight: '600', color: 'text.default', fontVariantNumeric: 'tabular-nums' })
const draftIcon = css({ color: 'orange.500' })
const todoIcon = css({ color: 'icon.secondary' })
const emptyCell = css({ textAlign: 'center', padding: '6', color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="lg" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Pending actions' {{ employeeName }}
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpTableContainer>
            <MpTable :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" class="pa-sort-th" :class="tightCell">
                    <span :class="thInner"><span>Review cycle</span><PxColumnSortMenu col-key="cycle" :sort-type="columnSortTypes.cycle" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                  </MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <template v-for="c in sortedCycles" :key="c.cycleName">
                  <MpTableRow @click="toggle(c.cycleName)">
                    <MpTableCell as="td" :class="tightCell">
                      <span :class="cycleCell">
                        <MpIcon :name="isExpanded(c.cycleName) ? 'caret-down' : 'caret-right'" size="sm" />
                        <span :class="cycleName">{{ c.cycleName }}</span>
                      </span>
                    </MpTableCell>
                  </MpTableRow>
                  <template v-if="isExpanded(c.cycleName)">
                    <MpTableRow v-for="m in c.methods" :key="m.method">
                      <MpTableCell as="td" :class="methodTd">
                        <div :class="methodInner">
                          <div :class="methodLeft">
                            <span :class="methodName">{{ m.method }}</span>
                            <span :class="methodSub">{{ m.draft + m.notStarted }} pending action{{ (m.draft + m.notStarted) === 1 ? '' : 's' }}</span>
                          </div>
                          <div :class="counters">
                            <div :class="counterCol">
                              <span :class="counterLabel">Draft</span>
                              <span :class="counterVal"><MpIcon name="task-on-progress" size="sm" :class="draftIcon" /> {{ m.draft }}</span>
                            </div>
                            <div :class="counterCol">
                              <span :class="counterLabel">Not started</span>
                              <span :class="counterVal"><MpIcon name="task-todo" size="sm" :class="todoIcon" /> {{ m.notStarted }}</span>
                            </div>
                          </div>
                        </div>
                      </MpTableCell>
                    </MpTableRow>
                  </template>
                </template>
                <MpTableRow v-if="!cycles.length">
                  <MpTableCell as="td" :class="emptyCell">No pending actions.</MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* Reveal the column sort icon on header hover — UNLAYERED (see goal-cycles/index.vue). */
.pa-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
