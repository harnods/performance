<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Reviews / Pending actions — Goal list modal
  Replica of talenta-review's pending-action ModalGoalList. Opened from a
  History row's "Goal list" action; lists the goals reviewed in that cycle.
  DEMO data from the goals mini-DB.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpText,
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

const props = defineProps<{ isOpen: boolean, cycleName?: string }>()
const emit = defineEmits<{ 'update:isOpen': [v: boolean] }>()

const { individualGoals } = useGoalsStore('seed-26-h1')
const goals = computed(() => individualGoals.value.slice(0, 8))

const STATUS_LABEL: Record<string, string> = { green: 'On track', orange: 'Off track', gray: 'Not started' }
function close() { emit('update:isOpen', false) }

// ─── Column sort (PxColumnSortMenu). Read-only list — sorting only reorders. ──
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = { goal: 'text', weight: 'number', status: 'text' }
function sortValue(g: (typeof goals.value)[number], key: string): string | number {
  if (key === 'goal') return g.title
  if (key === 'weight') return g.weight
  if (key === 'status') return STATUS_LABEL[g.status] ?? g.status
  return ''
}
const sortedGoals = computed(() => {
  if (!sortKey.value) return goals.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...goals.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })

// Golden rule: 8px top/bottom on every cell. Tallest cell is the Goal column
// (code + title) = 2 lines → whole table verticalAlign middle.
const headCell = css({ whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const nameText = css({ fontSize: '14px', color: 'text.default' })
const caption = css({ color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="lg" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Goal list<template v-if="cycleName"> — {{ cycleName }}</template>
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpTableContainer>
            <MpTable :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" class="pg-sort-th" :class="headCell">
                    <span :class="thInner"><span>Goal</span><PxColumnSortMenu col-key="goal" :sort-type="columnSortTypes.goal" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="pg-sort-th" :class="headCell">
                    <span :class="thInner"><span>Weight</span><PxColumnSortMenu col-key="weight" :sort-type="columnSortTypes.weight" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="pg-sort-th" :class="headCell">
                    <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
                  </MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="g in sortedGoals" :key="g.id">
                  <MpTableCell as="td" :class="cell">
                    <div :class="goalCode">{{ g.code }}</div>
                    <div :class="nameText">{{ g.title }}</div>
                  </MpTableCell>
                  <MpTableCell as="td" :class="cell">{{ g.weight }}%</MpTableCell>
                  <MpTableCell as="td" :class="cell">{{ STATUS_LABEL[g.status] }}</MpTableCell>
                </MpTableRow>
                <MpTableRow v-if="!goals.length">
                  <MpTableCell as="td" :colspan="3" :class="[cell, css({ textAlign: 'center', color: 'text.secondary' })]">No goals to display.</MpTableCell>
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
.pg-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
