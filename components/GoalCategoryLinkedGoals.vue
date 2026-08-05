<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Linked goals table (goal category)
  Token mode: Pixel 2.4

  Replica of talenta-review's LinkedGoalTable.vue — reused by both the
  "Linked goals" modal (ModalLinkedGoals) and the category Detail page. Lists
  every goal whose `category` matches this category's name (real data from the
  goals mini-DB via useGoalCategoriesStore.linkedGoalsOf), with a goal-type
  filter + name search, and a "View goal" action that opens the goal detail.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpBadge,
  MpButton,
  MpAvatar,
  MpSelect,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  css,
} from '@mekari/pixel3'
import { ownerOf } from '~/utils/goalRows'
import { employeeById } from '~/utils/employees'

const props = defineProps<{ categoryName: string }>()

const router = useRouter()
const { linkedGoalsOf } = useGoalCategoriesStore()

const GOAL_TYPE_LABEL: Record<string, string> = {
  company: 'Company goal',
  organization: 'Organization goal',
  team: 'Team goal',
  individual: 'Individual goal',
}
const STATUS_LABEL: Record<string, string> = { green: 'On track', orange: 'Off track', gray: 'Not started' }

const typeFilter = ref('')
const search = ref('')

const typeOptions = [
  { value: '', label: 'All goal type' },
  { value: 'company', label: 'Company goal' },
  { value: 'organization', label: 'Organization goal' },
  { value: 'team', label: 'Team goal' },
  { value: 'individual', label: 'Individual goal' },
]

const rows = computed(() => linkedGoalsOf(props.categoryName)
  .filter(g => !typeFilter.value || g.level === typeFilter.value)
  .filter(g => !search.value || g.title.toLowerCase().includes(search.value.toLowerCase()))
  .map(g => ({
    id: g.id,
    cycleId: g.cycleId,
    code: g.code,
    title: g.title,
    level: g.level,
    subCategory: g.subCategory,
    status: g.status,
    owner: ownerOf(g.ownerId),
    photo: employeeById(g.ownerId)?.photo,
  })))

const hasFilter = computed(() => !!typeFilter.value || !!search.value)

// ─── Column sort (PxColumnSortMenu). Read-only list — sorting only reorders. ──
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  type: 'text', name: 'text', subCategory: 'text', owner: 'text', status: 'text',
}
function sortValue(row: (typeof rows.value)[number], key: string): string {
  if (key === 'type') return GOAL_TYPE_LABEL[row.level] ?? row.level
  if (key === 'name') return row.title
  if (key === 'subCategory') return row.subCategory
  if (key === 'owner') return row.owner.name
  if (key === 'status') return STATUS_LABEL[row.status] ?? row.status
  return ''
}
const sortedRows = computed(() => {
  if (!sortKey.value) return rows.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

function viewGoal(cycleId: string, id: string) {
  router.push({ path: `/goals/goal-cycles/${cycleId}/goals/${id}` })
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const filterBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', marginBottom: '4', flexWrap: 'wrap' })
const selectWidth = css({ width: '180px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })
const searchWidth = css({ width: '260px' })
// Golden rule: 8px top/bottom on every cell. Tallest body cells (Goal name =
// code + title; Goal owner = name + "id | title") are 2 lines → middle.
const headCell = css({ whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cell = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const linkText = css({ color: 'text.link', cursor: 'pointer', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const ownerCell = css({ display: 'flex', alignItems: 'center', gap: '2' })
const emptyWrap = css({ paddingBlock: '10', textAlign: 'center' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '2', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
function statusClass(s: string) {
  return s === 'green' ? statusPillGreen : s === 'orange' ? statusPillOrange : statusPillGray
}
</script>

<template>
  <div>
    <div :class="filterBar">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="selectWidth">
            <MpSelect :placeholder="typeOptions.find(o => o.value === typeFilter)?.label" tabindex="-1" aria-hidden="true">
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem v-for="opt in typeOptions" :key="opt.value" :is-active="opt.value === typeFilter" @click="typeFilter = opt.value">
              {{ opt.label }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpFlex :class="searchWidth">
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search goal name..." />
        </MpInputGroup>
      </MpFlex>
    </div>

    <MpTableContainer v-if="rows.length">
      <MpTable :is-hoverable="false">
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" class="lg-sort-th" :class="headCell">
              <span :class="thInner"><span>Goal type</span><PxColumnSortMenu col-key="type" :sort-type="columnSortTypes.type" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="lg-sort-th" :class="headCell">
              <span :class="thInner"><span>Goal name</span><PxColumnSortMenu col-key="name" :sort-type="columnSortTypes.name" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="lg-sort-th" :class="headCell">
              <span :class="thInner"><span>Sub-category</span><PxColumnSortMenu col-key="subCategory" :sort-type="columnSortTypes.subCategory" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="lg-sort-th" :class="headCell">
              <span :class="thInner"><span>Goal owner</span><PxColumnSortMenu col-key="owner" :sort-type="columnSortTypes.owner" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="lg-sort-th" :class="headCell">
              <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" :class="headCell" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="row in sortedRows" :key="row.id">
            <MpTableCell as="td" :class="cell">
              <MpBadge for="tableStatus" type="announcement">{{ GOAL_TYPE_LABEL[row.level] }}</MpBadge>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">
              <MpFlex direction="column" gap="0.5">
                <span :class="goalCode">{{ row.code }}</span>
                <span :class="linkText" @click="viewGoal(row.cycleId, row.id)">{{ row.title }}</span>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">{{ row.subCategory }}</MpTableCell>
            <MpTableCell as="td" :class="cell">
              <div :class="ownerCell">
                <MpAvatar :id="`lg-owner-${row.id}`" :name="row.owner.name" :src="row.photo" size="lg" variant-color="gray" />
                <MpFlex direction="column" gap="0">
                  <MpText size="label" :class="valueText">{{ row.owner.name }}</MpText>
                  <MpText size="label-small" :class="captionText">{{ row.owner.id }} | {{ row.owner.title }}</MpText>
                </MpFlex>
              </div>
            </MpTableCell>
            <MpTableCell as="td" :class="cell"><span :class="statusClass(row.status)">{{ STATUS_LABEL[row.status] }}</span></MpTableCell>
            <MpTableCell as="td" :class="cell">
              <MpButton variant="secondary" @click="viewGoal(row.cycleId, row.id)">View goal</MpButton>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <MpFlex v-else direction="column" align="center" gap="1" :class="emptyWrap">
      <MpText :class="emptyTitle">{{ hasFilter ? 'No goal found' : 'No linked goals yet' }}</MpText>
      <MpText size="label" :class="captionText">
        {{ hasFilter ? 'Check the keyword and try to search again.' : 'Linked goals will appear here.' }}
      </MpText>
    </MpFlex>
  </div>
</template>

<style scoped>
/* Reveal the column sort icon on header hover — UNLAYERED (see goal-cycles/index.vue). */
.lg-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
