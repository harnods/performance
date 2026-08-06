<script setup lang="ts">
// ─────────────────────────────────────────────────────────────────────────────
// Cycle-instance detail = member list (production parity: DetailCycle.vue) for a
// Performance / Competency review cycle's period. Tabs per active review method,
// cycle-info, a member table (reviewers / status / result), and result + reviewer
// modals. Data is the coherent coffee-business roster from utils/cycleDetail.
// ─────────────────────────────────────────────────────────────────────────────
import {
  MpFlex, MpText, MpButton, MpBadge, MpAvatar, MpIcon, MpInput, MpInputGroup, MpInputLeftAddon, MpTooltip,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpProgress, toast, css,
} from '@mekari/pixel3'
import { useReviewCyclesStore } from '~/composables/useReviewCyclesStore'
import { membersFor } from '~/utils/cycleDetail'
import { employeeMeta } from '~/utils/employees'
import type { Employee } from '~/utils/employees'

definePageMeta({ layout: 'default', breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' } })

const route = useRoute()
const cycleName = computed(() => String(route.query.name || ''))
const purpose = computed(() => String(route.query.purpose || 'performance'))
const periodLabel = computed(() => String(route.query.period || 'Current period'))
const isCompetency = computed(() => purpose.value === 'competency')

const { cycles } = useReviewCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.name === cycleName.value))
const config = computed(() => cycle.value?.config ?? null)
const cycleLike = computed(() => cycle.value ?? { name: cycleName.value, purpose: purpose.value, total: 3, done: 1, repeat: 'Repeats quarterly', config: null })
const members = computed(() => membersFor(cycleLike.value))

// ── Tabs (active review methods) ─────────────────────────────────────────────────
const methodTabs = computed<string[]>(() => {
  const c = config.value as Record<string, { is_active?: boolean }> | null
  if (!c) return isCompetency.value ? ['Manager review'] : ['Manager review', 'Self review']
  const map: [string, string][] = [['manager_review', 'Manager review'], ['threesixty_review', '360-degree review'], ['peer_to_peer', 'Team review'], ['self_review', 'Self review']]
  const active = map.filter(([k]) => c[k]?.is_active).map(([, l]) => l)
  return active.length ? active : ['Manager review']
})
const activeTab = ref('')
watch(methodTabs, (t) => { if (!t.includes(activeTab.value)) activeTab.value = t[0] }, { immediate: true })
const isSelfTab = computed(() => activeTab.value === 'Self review')
const isManagerTab = computed(() => activeTab.value === 'Manager review')

// ── Deterministic per-member review data (coherent, stable) ──────────────────────
function seedNum(s: string, mod: number) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % mod }
interface MemberRow { emp: Employee, reviewers: number, total: number, submitted: number, score: number, hasResult: boolean }
const search = ref('')
const memberRows = computed<MemberRow[]>(() =>
  members.value
    .filter(e => !search.value || e.name.toLowerCase().includes(search.value.toLowerCase()))
    .map((emp) => {
      const reviewers = isSelfTab.value ? 1 : 2 + seedNum(emp.id + activeTab.value, 3) // 2..4
      const submitted = Math.min(reviewers, 1 + seedNum(emp.id, reviewers + 1))
      const score = isCompetency.value ? 3 + (seedNum(emp.id, 20) / 10) : 70 + seedNum(emp.id + 'p', 30) // 3.0–5.0 or 70–99
      return { emp, reviewers, total: reviewers, submitted, score, hasResult: submitted > 0 }
    }),
)

// ── Column sort (PxColumnSortMenu) ────────────────────────────────────────────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  employee: 'text',
  organization: 'text',
  reviewers: 'number',
  status: 'number',
  score: 'number',
}
function memberSortValue(m: MemberRow, key: string): string | number {
  if (key === 'employee') return m.emp.name
  if (key === 'organization') return m.emp.department ?? ''
  if (key === 'reviewers') return m.reviewers
  if (key === 'status') return m.total > 0 ? m.submitted / m.total : 0
  if (key === 'score') return m.hasResult ? m.score : -1
  return ''
}
const sortedMemberRows = computed<MemberRow[]>(() => {
  if (!sortKey.value) return memberRows.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...memberRows.value].sort((a, b) =>
    String(memberSortValue(a, sortKey.value)).localeCompare(
      String(memberSortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// ── Cycle-info ───────────────────────────────────────────────────────────────────
const templateName = computed(() => {
  const t = (config.value as Record<string, { template_uuid?: string }> | null)?.manager_review?.template_uuid
  const map: Record<string, string> = { 'perf-rating': 'Performance rating template', 'perf-percentage': 'Performance percentage template', 'perf-point': 'Point-based template', 'leadership-rating': 'Leadership review' }
  return t ? (map[t] || 'Custom template') : (isCompetency.value ? 'Competency framework' : 'Performance rating template')
})

// ── Result modal ─────────────────────────────────────────────────────────────────
const resultOpen = ref(false)
const resultMember = ref<MemberRow | null>(null)
function openResult(m: MemberRow) { resultMember.value = m; resultOpen.value = true }
const scoreText = (m: MemberRow) => (isCompetency.value ? `${m.score.toFixed(1)} / 5.0` : `${Math.round(m.score)}%`)

// ── Reviewer list modal (lightweight) ────────────────────────────────────────────
const reviewerOpen = ref(false)
const reviewerMember = ref<MemberRow | null>(null)
function openReviewers(m: MemberRow) { reviewerMember.value = m; reviewerOpen.value = true }
const reviewerRoster = computed(() => {
  if (!reviewerMember.value) return []
  const pool = members.value.filter(e => e.id !== reviewerMember.value!.emp.id)
  const n = reviewerMember.value.reviewers
  const start = seedNum(reviewerMember.value.emp.id, Math.max(1, pool.length - n))
  return pool.slice(start, start + n)
})

function onNotWired(label: string) {
  toast.notify({ id: 'instance-todo', position: 'top-center', variant: 'info', title: `${label} — opens in the full member workspace` })
}

// styles
const labelText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const infoRow = css({ display: 'flex', alignItems: 'flex-start', gap: '4' })
const labelCol = css({ width: '200px', flexShrink: '0' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const actionHead = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap', verticalAlign: 'middle' })
const tabBar = css({ display: 'flex', gap: '5', borderBottom: '1px solid', borderBottomColor: 'border.default', overflowX: 'auto' })
const tabBase = { display: 'inline-flex', alignItems: 'center', paddingBlock: '3', paddingInline: '1', whiteSpace: 'nowrap', fontSize: '14px', lineHeight: '20px', fontWeight: '400', color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent', marginBottom: '-1px' } as const
const tabItem = css({ ...tabBase, _hover: { color: 'text.default' } })
const tabActive = css({ ...tabBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'teal.400' } })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <!-- Header actions -->
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="secondary" right-icon="caret-down" @click="onNotWired('Add member')">Add member</MpButton>
    </Teleport>

    <MpText :class="css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })">
      {{ cycleName }} — {{ periodLabel }}
    </MpText>

    <!-- Tabs -->
    <div :class="tabBar">
      <button v-for="t in methodTabs" :key="t" type="button" :class="activeTab === t ? tabActive : tabItem" @click="activeTab = t">{{ t }}</button>
    </div>

    <!-- Cycle info -->
    <MpFlex direction="column" gap="3" :class="css({ maxWidth: '684px' })">
      <div :class="infoRow">
        <MpText size="label" :class="[labelText, labelCol]">Template</MpText>
        <MpText size="label" :class="valueText">{{ templateName }}</MpText>
      </div>
      <div :class="infoRow">
        <MpText size="label" :class="[labelText, labelCol]">Assessment period</MpText>
        <MpText size="label" :class="valueText">{{ periodLabel }}</MpText>
      </div>
      <div :class="infoRow">
        <MpText size="label" :class="[labelText, labelCol]">Review method</MpText>
        <MpText size="label" :class="valueText">{{ activeTab }}</MpText>
      </div>
    </MpFlex>

    <!-- Filter -->
    <MpFlex justify="flex-end">
      <MpInputGroup :class="css({ width: '280px' })">
        <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
        <MpInput v-model="search" placeholder="Search employee..." />
      </MpInputGroup>
    </MpFlex>

    <!-- Member table -->
    <MpTableContainer>
      <MpTable>
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Employee name</span><PxColumnSortMenu col-key="employee" :sort-type="columnSortTypes.employee" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Organization</span><PxColumnSortMenu col-key="organization" :sort-type="columnSortTypes.organization" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell v-if="!isSelfTab" as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Reviewers</span><PxColumnSortMenu col-key="reviewers" :sort-type="columnSortTypes.reviewers" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell v-if="!isSelfTab" as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="sort-th" :class="headCell">
              <span :class="thInner"><span>Score</span><PxColumnSortMenu col-key="score" :sort-type="columnSortTypes.score" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" :class="actionHead" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="m in sortedMemberRows" :key="m.emp.id">
            <MpTableCell as="td" :class="cell">
              <MpFlex align="center" gap="3">
                <MpAvatar :name="m.emp.name" :src="m.emp.photo" size="lg" />
                <MpFlex direction="column" gap="0">
                  <MpText size="label" :class="valueText">{{ m.emp.name }}</MpText>
                  <MpText size="label-small" :class="labelText">{{ employeeMeta(m.emp) }}</MpText>
                </MpFlex>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">{{ m.emp.department }}</MpTableCell>
            <MpTableCell v-if="!isSelfTab" as="td" :class="cell">
              <MpButton variant="ghost" :class="css({ padding: '0', minWidth: 'auto', color: 'text.link' })" @click="openReviewers(m)">{{ m.reviewers }} Reviewers</MpButton>
            </MpTableCell>
            <MpTableCell v-if="!isSelfTab" as="td" :class="cell">
              <MpFlex direction="column" gap="1" :class="css({ minWidth: '140px' })">
                <MpProgress variant="linear" size="sm" :class="tealProgress" :value="Math.round((m.submitted / m.total) * 100)" />
                <MpText size="label-small" :class="labelText">{{ m.submitted }}/{{ m.total }} submitted</MpText>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">
              <MpText size="label" :class="m.hasResult ? valueText : labelText">{{ m.hasResult ? scoreText(m) : '-' }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="actionHead">
              <MpFlex align="center" gap="2" justify="flex-end">
                <MpButton v-if="m.hasResult" variant="secondary" @click="openResult(m)">View result</MpButton>
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger><MpButton variant="secondary" right-icon="caret-down" /></MpPopoverTrigger>
                  <MpPopoverContent>
                    <MpPopoverList>
                      <MpPopoverListItem v-if="!isSelfTab" @click="openReviewers(m)">Reviewer list</MpPopoverListItem>
                      <MpPopoverListItem @click="onNotWired('Edit reviewer')">Edit reviewer</MpPopoverListItem>
                      <MpPopoverListItem @click="onNotWired('Download PDF')">Download result as PDF</MpPopoverListItem>
                      <MpPopoverListItem @click="onNotWired('Delete member')">Delete member</MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpFlex>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <!-- Result modal -->
    <ClientOnly>
      <MpModal :is-open="resultOpen" size="lg" @close="resultOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>Review result<MpModalCloseButton @click="resultOpen = false" /></MpModalHeader>
          <MpModalBody>
            <MpFlex v-if="resultMember" direction="column" gap="4" :class="css({ paddingBottom: '2' })">
              <MpFlex align="center" gap="3">
                <MpAvatar :name="resultMember.emp.name" :src="resultMember.emp.photo" size="lg" />
                <MpFlex direction="column" gap="0">
                  <MpText :class="css({ fontWeight: '600', color: 'text.default' })">{{ resultMember.emp.name }}</MpText>
                  <MpText size="label-small" :class="labelText">{{ employeeMeta(resultMember.emp) }}</MpText>
                </MpFlex>
                <MpFlex direction="column" align="flex-end" :class="css({ marginLeft: 'auto' })">
                  <MpText size="label-small" :class="labelText">Final score</MpText>
                  <MpText :class="css({ fontSize: '20px', fontWeight: '700', color: 'text.default' })">{{ scoreText(resultMember) }}</MpText>
                </MpFlex>
              </MpFlex>

              <!-- Competency accordion (competency only) -->
              <template v-if="isCompetency">
                <MpText :class="css({ fontWeight: '600', color: 'text.default' })">Competency</MpText>
                <MpFlex v-for="comp in ['Customer service', 'Coffee product knowledge', 'Teamwork', 'Wholesale account handling']" :key="comp" justify="space-between" :class="css({ paddingBlock: '2', borderBottom: '1px solid', borderBottomColor: 'border.default' })">
                  <MpText size="label" :class="valueText">{{ comp }}</MpText>
                  <MpText size="label" :class="labelText">{{ (3 + seedNum(resultMember.emp.id + comp, 20) / 10).toFixed(1) }} / 5.0</MpText>
                </MpFlex>
                <MpText :class="css({ fontWeight: '600', color: 'text.default', marginTop: '2' })">Additional questions</MpText>
              </template>

              <!-- 9-box (performance only) -->
              <template v-else>
                <MpFlex align="center" gap="3" :class="css({ padding: '3', background: 'background.neutral.subtle', borderRadius: 'md' })">
                  <MpBadge for="tableStatus" type="success">9-box</MpBadge>
                  <MpText size="label" :class="valueText">Performance rating {{ (resultMember.score / 20).toFixed(1) }} · Potential rating {{ (3 + seedNum(resultMember.emp.id + 'pot', 20) / 10).toFixed(1) }}</MpText>
                  <MpButton variant="ghost" :class="css({ marginLeft: 'auto', color: 'text.link' })" @click="onNotWired('9-box mapping')">View result mapping</MpButton>
                </MpFlex>
                <MpText :class="css({ fontWeight: '600', color: 'text.default', marginTop: '2' })">Review</MpText>
              </template>

              <MpFlex v-for="ind in ['Punctuality & attendance', 'Quality of work', 'Initiative']" :key="ind" justify="space-between" :class="css({ paddingBlock: '2', borderBottom: '1px solid', borderBottomColor: 'border.default' })">
                <MpText size="label" :class="valueText">{{ ind }}</MpText>
                <MpText size="label" :class="labelText">{{ isCompetency ? (3 + seedNum(resultMember.emp.id + ind, 20) / 10).toFixed(1) + ' / 5.0' : (70 + seedNum(resultMember.emp.id + ind, 30)) + '%' }}</MpText>
              </MpFlex>
            </MpFlex>
          </MpModalBody>
          <MpModalFooter><MpButton variant="primary" @click="resultOpen = false">Close</MpButton></MpModalFooter>
        </MpModalContent>
      </MpModal>

      <!-- Reviewer list modal -->
      <MpModal :is-open="reviewerOpen" size="md" @close="reviewerOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>Reviewers<MpModalCloseButton @click="reviewerOpen = false" /></MpModalHeader>
          <MpModalBody>
            <MpFlex v-if="reviewerMember" direction="column" gap="0" :class="css({ paddingBottom: '2' })">
              <MpFlex v-for="r in reviewerRoster" :key="r.id" align="center" justify="space-between" :class="css({ paddingBlock: '3', borderBottom: '1px solid', borderBottomColor: 'border.default' })">
                <MpFlex align="center" gap="3">
                  <MpAvatar :name="r.name" :src="r.photo" size="lg" />
                  <MpFlex direction="column" gap="0">
                    <MpText size="label" :class="valueText">{{ r.name }}</MpText>
                    <MpText size="label-small" :class="labelText">{{ employeeMeta(r) }}</MpText>
                  </MpFlex>
                </MpFlex>
                <MpText size="label" :class="labelText">{{ Math.round(100 / reviewerRoster.length) }}%</MpText>
              </MpFlex>
            </MpFlex>
          </MpModalBody>
          <MpModalFooter><MpButton variant="primary" @click="reviewerOpen = false">Close</MpButton></MpModalFooter>
        </MpModalContent>
      </MpModal>
    </ClientOnly>
  </MpFlex>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered scoped `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
