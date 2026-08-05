<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal approval queue

  Renders in place of the goals table on every goal-level page's "Awaiting
  approval" tab — same filter-bar-then-table index shape as
  pages/goals/goal-cycles/index.vue. Each row is one submission (a batch of
  1+ goal actions from a direct report, e.g. "3 new goals" created in one
  go, whose weights only sum to 100% together); View details opens the
  review page where the whole batch gets approved or rejected as one unit,
  never goal-by-goal.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpButton,
  MpSelect,
  MpInputGroup,
  MpInputLeftAddon,
  MpInput,
  MpIcon,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTableContainer,
  MpTable,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  css,
} from '@mekari/pixel3'
import { employeeById } from '~/utils/employees'
import type { Submission } from '~/composables/useGoalApprovalsStore'

const props = defineProps<{ cycleId: string }>()
const router = useRouter()

const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === props.cycleId))
const { submissions } = useGoalApprovalsStore(props.cycleId)

// "Goal progress update" has no real submissions yet — that feature isn't
// built anywhere in the app to produce one — but the filter/column already
// accounts for it so nothing here needs to change once it exists.
const TYPE_OPTIONS = ['Goal creation', 'Goal progress update', 'Goal update'] as const

function typeLabelFor(submission: Submission): string {
  return submission.items.some(i => i.type === 'create') ? 'Goal creation' : 'Goal update'
}

// Only once a submission is approved (and committed) does it drop off this
// list — a rejected-but-not-yet-resubmitted batch stays visible so the
// manager can still reopen it.
const openSubmissions = computed(() => submissions.value.filter(s => s.status !== 'approved'))

const typeFilter = ref('')
const search = ref('')
const filteredSubmissions = computed(() => {
  let result = openSubmissions.value
  if (typeFilter.value) result = result.filter(s => typeLabelFor(s) === typeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(s => (employeeById(s.ownerId)?.name ?? '').toLowerCase().includes(q))
  }
  return result.slice().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function openSubmission(id: string) {
  // ?cycleName= feeds the layout's intermediate breadcrumb ("Goal cycles / <cycle name>")
  router.push({ path: `/goals/goal-cycles/${props.cycleId}/awaiting-approval/${id}`, query: { cycleName: cycle.value?.name } })
}

// ─── Column sort (PxColumnSortMenu). sortKey '' = default (submittedAt asc). ──
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = { employee: 'text', type: 'text', date: 'date' }
function sortValue(s: Submission, key: string): string {
  if (key === 'employee') return employeeById(s.ownerId)?.name ?? s.ownerId
  if (key === 'type') return typeLabelFor(s)
  if (key === 'date') return s.submittedAt
  return ''
}
const sortedSubmissions = computed(() => {
  if (!sortKey.value) return filteredSubmissions.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filteredSubmissions.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// ─── Styles — mirrors pages/goals/goal-cycles/index.vue's own filter-bar +
// table classes exactly, so this reads as the same index-page pattern.
const wrap = css({ display: 'flex', flexDirection: 'column', gap: '6' })
const typeFieldClass = css({ width: '200px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
// Golden rule: 8px top/bottom on every cell. Tallest body cell is the Employee
// column (name + "code · title") = 2 lines → whole table verticalAlign middle.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '1%', whiteSpace: 'nowrap' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const emptyStateWrap = css({ paddingY: '16', textAlign: 'center' })
</script>

<template>
  <div :class="wrap">
    <!-- Filter bar -->
    <MpFlex align="center" justify="space-between" gap="4">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="typeFieldClass">
            <MpSelect v-model="typeFilter" placeholder="Type" is-clearable tabindex="-1" aria-hidden="true">
              <option v-for="opt in TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem v-for="opt in TYPE_OPTIONS" :key="opt" :is-active="opt === typeFilter" @click="typeFilter = opt">
              {{ opt }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpFlex :class="css({ width: '200px' })">
        <MpInputGroup>
          <MpInputLeftAddon>
            <MpIcon name="search" />
          </MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search employee..." />
        </MpInputGroup>
      </MpFlex>
    </MpFlex>

    <!-- Table -->
    <MpTableContainer>
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" class="gaq-sort-th" :class="headCell">
              <span :class="thInner"><span>Employee</span><PxColumnSortMenu col-key="employee" :sort-type="columnSortTypes.employee" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="gaq-sort-th" :class="headCell">
              <span :class="thInner"><span>Type</span><PxColumnSortMenu col-key="type" :sort-type="columnSortTypes.type" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="gaq-sort-th" :class="headCell">
              <span :class="thInner"><span>Date</span><PxColumnSortMenu col-key="date" :sort-type="columnSortTypes.date" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" :class="[headCell, actionHead]" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-if="filteredSubmissions.length === 0">
            <MpTableCell as="td" colspan="4" :class="[tightCell, emptyStateWrap]">
              <MpText size="label" :class="captionText">Nothing waiting on your approval right now.</MpText>
            </MpTableCell>
          </MpTableRow>
          <MpTableRow v-for="submission in sortedSubmissions" :key="submission.id">
            <MpTableCell as="td" :class="tightCell">
              <MpFlex direction="column" gap="0">
                <MpText size="label" :class="valueText">{{ employeeById(submission.ownerId)?.name ?? submission.ownerId }}</MpText>
                <MpText size="label-small" :class="captionText">{{ employeeById(submission.ownerId)?.code }} · {{ employeeById(submission.ownerId)?.title }}</MpText>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <MpText size="label" :class="valueText">{{ typeLabelFor(submission) }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <MpText size="label" :class="valueText">{{ formatDate(submission.submittedAt) }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="actionCell">
              <MpButton variant="secondary" @click="openSubmission(submission.id)">View details</MpButton>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>
  </div>
</template>

<style scoped>
/* Reveal the column sort icon on header hover — UNLAYERED (see goal-cycles/index.vue). */
.gaq-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
