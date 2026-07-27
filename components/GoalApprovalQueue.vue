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

// ─── Styles — mirrors pages/goals/goal-cycles/index.vue's own filter-bar +
// table classes exactly, so this reads as the same index-page pattern.
const wrap = css({ display: 'flex', flexDirection: 'column', gap: '6' })
const typeFieldClass = css({ width: '200px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
// Matches MpTable's own default (non-narrow) th/td padding (paddingY: '4')
// — a flatter '2' reads as the narrow/dense table variant and made
// single-line rows look too short.
const tightCell = css({ paddingTop: '4', paddingBottom: '4' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
// A button already carries its own vertical padding (md size ≈ 36px tall
// including it) — stacking the full 16px text-cell padding on top of that
// made the row noticeably taller than its plain-text siblings. 8px here
// instead brings the button cell's total height back in line with theirs.
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap' })
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
            <MpTableCell as="th">Employee</MpTableCell>
            <MpTableCell as="th">Type</MpTableCell>
            <MpTableCell as="th">Date</MpTableCell>
            <MpTableCell as="th" :class="actionHead" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-if="filteredSubmissions.length === 0">
            <MpTableCell as="td" colspan="4" :class="[tightCell, emptyStateWrap]">
              <MpText size="label" :class="captionText">Nothing waiting on your approval right now.</MpText>
            </MpTableCell>
          </MpTableRow>
          <MpTableRow v-for="submission in filteredSubmissions" :key="submission.id">
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
