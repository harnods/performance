<script setup lang="ts">
// ─────────────────────────────────────────────────────────────────────────────
// Cycle-master detail for Performance / Competency review cycles (production
// parity: Detail.vue). Shows the cycle-info panel + repeat-cycle block + the
// timeframe/period table. Each period row → the per-instance member list.
// Data comes from the review-cycles mini-DB (real config for created cycles),
// expanded into coherent coffee-business periods via utils/cycleDetail.
// ─────────────────────────────────────────────────────────────────────────────
import {
  MpFlex, MpText, MpButton, MpBadge, MpDivider, MpToggle, MpIcon, MpInput, MpTooltip,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  MpProgress, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpCheckbox, MpRadio, MpFormControl, MpFormLabel, MpDatePicker,
  toast, css,
} from '@mekari/pixel3'
import { useReviewCyclesStore } from '~/composables/useReviewCyclesStore'
import { periodsFor, membersFor } from '~/utils/cycleDetail'
import type { CyclePeriod } from '~/utils/cycleDetail'

const props = defineProps<{ cycleName: string, purpose: string }>()

const router = useRouter()
const route = useRoute()
const { cycles, renameCycle } = useReviewCyclesStore()

const isCompetency = computed(() => props.purpose === 'competency')
const cycle = computed(() => cycles.value.find(c => c.name === props.cycleName))
const config = computed(() => cycle.value?.config ?? null)

// Fallback shape so a directly-opened / unknown cycle still renders coherently.
const cycleLike = computed(() => cycle.value ?? {
  name: props.cycleName, purpose: props.purpose, total: 3, done: 1, repeat: 'Repeats quarterly', config: null,
})
const periods = ref<CyclePeriod[]>(periodsFor(cycleLike.value))
watch(cycleLike, v => { periods.value = periodsFor(v) })
const members = computed(() => membersFor(cycleLike.value))

// ── Review methods (from real config, else a sensible default) ──────────────────
const methodLabels = computed<string[]>(() => {
  const c = config.value as Record<string, { is_active?: boolean }> | null
  if (!c) return isCompetency.value ? ['Manager review'] : ['Manager review', 'Self review']
  const map: [string, string][] = [
    ['manager_review', 'Manager review'], ['threesixty_review', '360-degree review'],
    ['peer_to_peer', 'Team review'], ['self_review', 'Self review'],
  ]
  const active = map.filter(([k]) => c[k]?.is_active).map(([, l]) => l)
  return active.length ? active : ['Manager review']
})

const assessmentLabel = computed(() => (config.value?.assessment_purpose === 2 ? 'Succession planning' : 'Individual development'))
const keyPositionLabel = computed(() => {
  const map: Record<string, string> = { 'kp-eng': 'Head of Engineering', 'kp-sales': 'Sales Director', 'kp-ops': 'Head of Operations', 'kp-fin': 'Head of Accounting', 'kp-mkt': 'Head of Marketing' }
  return config.value?.key_position_id ? (map[config.value.key_position_id] || '-') : '-'
})
const nineBoxOn = computed(() => !!config.value?.is_nine_box_convert_score)

// ── Inline cycle-name edit ───────────────────────────────────────────────────────
const editingName = ref(false)
const nameDraft = ref('')
function startEditName() { nameDraft.value = props.cycleName; editingName.value = true }
function saveName() {
  const v = nameDraft.value.trim()
  if (!v || !cycle.value) { editingName.value = false; return }
  renameCycle(cycle.value.id, v)
  editingName.value = false
  // keep the page title / query in sync
  router.replace({ path: `/reviews/review-cycles/${encodeURIComponent(v)}`, query: { name: v, purpose: props.purpose } })
  toast.notify({ id: 'cycle-renamed', position: 'top-center', variant: 'success', title: 'Cycle name updated' })
}

// ── Repeat cycle ─────────────────────────────────────────────────────────────────
const isRepeat = computed(() => (config.value ? !!config.value.is_recursive : cycleLike.value.repeat !== 'Does not repeat'))
const latestPeriod = computed(() => {
  const done = periods.value.filter(p => p.status !== 'upcoming')
  const p = done[done.length - 1] || periods.value[0]
  return p ? `${p.start} - ${p.end}` : '-'
})
const nextPeriod = computed(() => {
  const up = periods.value.find(p => p.status === 'upcoming')
  return up ? `${up.start} - ${up.end}` : 'To be scheduled'
})

// ── Row actions: Publish / Extend / Delete ───────────────────────────────────────
const activePeriod = ref<CyclePeriod | null>(null)
const publishOpen = ref(false)
const extendOpen = ref(false)
const deleteOpen = ref(false)

// Publish form
const publishMethods = ref<string[]>([])
const publishResultSummary = ref(false)
const scoreDisclosure = ref('detailed')
const scoreDisclosureOptions = [
  { value: 'detailed', label: 'Detailed scores' },
  { value: 'final-per-method', label: 'Final score per review method' },
  { value: 'category-per-method', label: 'Score category per review method' },
  { value: 'adjusted', label: 'Adjusted score and reason' },
  { value: 'weighted-final', label: 'Weighted final score' },
]
function openPublish(p: CyclePeriod) {
  activePeriod.value = p
  publishMethods.value = [...methodLabels.value]
  publishResultSummary.value = false
  scoreDisclosure.value = 'detailed'
  publishOpen.value = true
}
function confirmPublish() {
  if (!activePeriod.value) return
  if (publishMethods.value.length === 0) {
    toast.notify({ id: 'publish-err', position: 'top-center', variant: 'error', title: 'Select at least one review method' })
    return
  }
  activePeriod.value.published = true
  activePeriod.value.status = 'completed'
  activePeriod.value.submitted = activePeriod.value.totalMember
  publishOpen.value = false
  toast.notify({ id: 'published', position: 'top-center', variant: 'success', title: 'Review result published' })
}

// Extend
const extendRange = ref<Date[]>([])
function openExtend(p: CyclePeriod) { activePeriod.value = p; extendRange.value = []; extendOpen.value = true }
function confirmExtend() {
  if (activePeriod.value && extendRange.value.length === 2) {
    activePeriod.value.extended = true
    toast.notify({ id: 'extended', position: 'top-center', variant: 'success', title: 'Review period extended' })
  }
  extendOpen.value = false
}

// Delete
function openDelete(p: CyclePeriod) { activePeriod.value = p; deleteOpen.value = true }
function confirmDelete() {
  if (activePeriod.value) periods.value = periods.value.filter(p => p.id !== activePeriod.value!.id)
  deleteOpen.value = false
}

function goInstance(p: CyclePeriod) {
  router.push({
    path: `/reviews/review-cycles/${encodeURIComponent(props.cycleName)}/instance/${p.id}`,
    query: { name: props.cycleName, purpose: props.purpose, period: p.label },
  })
}
function goEditCycle() {
  router.push({ path: '/reviews/review-cycles/create', query: { name: props.cycleName, purpose: props.purpose } })
}

function pct(p: CyclePeriod) { return p.totalMember > 0 ? Math.round((p.submitted / p.totalMember) * 100) : 0 }

// ─── Column sort (PxColumnSortMenu) — display-only over `periods` (Publish /
// Extend / Delete keep mutating the underlying ref; rows are keyed by id so
// reordering never corrupts row state or the active-period actions). ──────────
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  timeframe: 'date', reviewperiod: 'date', members: 'number', review: 'number',
}
function sortValue(p: CyclePeriod, key: string): string | number {
  if (key === 'timeframe') return Date.parse(p.start) || 0
  if (key === 'reviewperiod') return Date.parse(p.reviewStart) || 0
  if (key === 'members') return p.totalMember
  if (key === 'review') return pct(p)
  return ''
}
const sortedPeriods = computed(() => {
  if (!sortKey.value) return periods.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...periods.value].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// styles
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const labelText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const infoRow = css({ display: 'flex', alignItems: 'flex-start', gap: '4' })
const labelCol = css({ width: '200px', flexShrink: '0' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
// Golden rule: 8px top/bottom padding on every cell; tallest body cell here is
// 2 lines (Time frame = label + date range) → whole table verticalAlign middle.
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const completedText = css({ color: 'text.success', fontWeight: '600' })
// Review submit progress = teal fill (matches the evaluation detail / production).
const tealProgress = css({ '& .mp-progress__linear': { backgroundColor: 'teal.400' } })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <!-- ── Cycle info ─────────────────────────────────────────────────── -->
    <MpFlex direction="column" gap="4" :class="css({ maxWidth: '684px' })">
      <MpText as="h2" :class="h2Class">Cycle info</MpText>

      <!-- Cycle name (inline edit) -->
      <div :class="infoRow">
        <MpText size="label" :class="[labelText, labelCol]">Cycle name</MpText>
        <template v-if="!editingName">
          <MpText size="label" :class="valueText">{{ cycleName }}</MpText>
          <MpButton variant="ghost" left-icon="edit" :class="css({ minWidth: 'auto', padding: '0' })" @click="startEditName" />
        </template>
        <MpFlex v-else direction="column" gap="2" :class="css({ flex: '1' })">
          <MpInput v-model="nameDraft" :class="css({ maxWidth: '360px' })" @keydown.enter="saveName" />
          <MpFlex gap="2">
            <MpButton variant="ghost" @click="editingName = false">Cancel</MpButton>
            <MpButton variant="primary" @click="saveName">Save</MpButton>
          </MpFlex>
        </MpFlex>
      </div>

      <!-- Purpose -->
      <div :class="infoRow">
        <MpText size="label" :class="[labelText, labelCol]">Cycle purpose</MpText>
        <MpText size="label" :class="valueText">{{ isCompetency ? 'Competency review' : 'Performance review' }}</MpText>
      </div>

      <!-- Competency-only info -->
      <template v-if="isCompetency">
        <div :class="infoRow">
          <MpText size="label" :class="[labelText, labelCol]">Assessment objective</MpText>
          <MpText size="label" :class="valueText">{{ assessmentLabel }}</MpText>
        </div>
        <div v-if="assessmentLabel === 'Succession planning'" :class="infoRow">
          <MpText size="label" :class="[labelText, labelCol]">Key position</MpText>
          <MpText size="label" :class="valueText">{{ keyPositionLabel }}</MpText>
        </div>
      </template>

      <!-- Review method -->
      <div :class="infoRow">
        <MpText size="label" :class="[labelText, labelCol]">Review method</MpText>
        <MpFlex gap="1" wrap="wrap">
          <MpBadge v-for="m in methodLabels" :key="m" for="tableStatus" type="announcement">{{ m }}</MpBadge>
        </MpFlex>
      </div>

      <!-- Competency 9-box -->
      <div v-if="isCompetency" :class="infoRow">
        <MpText size="label" :class="[labelText, labelCol]">9-box convert score</MpText>
        <MpText size="label" :class="valueText">{{ nineBoxOn ? 'Enabled' : 'Disabled' }}</MpText>
      </div>

      <MpDivider />

      <!-- Repeat cycle -->
      <MpFlex direction="column" gap="1">
        <MpToggle :is-checked="isRepeat" is-disabled>Repeat cycle automatically after the cycle ends</MpToggle>
        <template v-if="isRepeat">
          <MpFlex align="center" gap="2" :class="css({ marginTop: '2' })">
            <MpIcon name="calendar" :class="css({ color: 'icon.secondary', width: '16px', height: '16px' })" />
            <MpText size="label" :class="labelText">Latest period: <MpText as="span" size="label" :class="valueText">{{ latestPeriod }}</MpText></MpText>
          </MpFlex>
          <MpFlex align="center" gap="2">
            <MpIcon name="refresh" :class="css({ color: 'icon.secondary', width: '16px', height: '16px' })" />
            <MpText size="label" :class="labelText">Next cycle: <MpText as="span" size="label" :class="valueText">{{ nextPeriod }}</MpText></MpText>
          </MpFlex>
        </template>
      </MpFlex>
    </MpFlex>

    <!-- ── Timeframe table ────────────────────────────────────────────── -->
    <MpTableContainer>
      <MpTable>
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th" class="cd-sort-th" :class="headCell">
              <span :class="thInner"><span>Time frame</span><PxColumnSortMenu col-key="timeframe" :sort-type="columnSortTypes.timeframe" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="cd-sort-th" :class="headCell">
              <span :class="thInner"><span>Review period</span><PxColumnSortMenu col-key="reviewperiod" :sort-type="columnSortTypes.reviewperiod" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="cd-sort-th" :class="headCell">
              <span :class="thInner"><span>Employee(s)</span><PxColumnSortMenu col-key="members" :sort-type="columnSortTypes.members" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell as="th" class="cd-sort-th" :class="headCell">
              <span :class="thInner"><span>Review</span><PxColumnSortMenu col-key="review" :sort-type="columnSortTypes.review" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
            </MpTableCell>
            <MpTableCell v-if="!isCompetency" as="th" :class="headCell" />
            <MpTableCell as="th" :class="[headCell, actionHead]" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="p in sortedPeriods" :key="p.id">
            <MpTableCell as="td" :class="cell">
              <MpFlex direction="column" gap="0">
                <MpText size="label" :class="valueText">{{ p.label }}</MpText>
                <MpText size="label-small" :class="labelText">{{ p.start }} - {{ p.end }}</MpText>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">
              <MpFlex align="center" gap="2">
                <MpText size="label" :class="valueText">{{ p.reviewStart }} - {{ p.reviewEnd }}</MpText>
                <MpBadge v-if="p.extended" for="tableStatus" type="success">Extended</MpBadge>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="cell">{{ p.totalMember }}</MpTableCell>
            <MpTableCell as="td" :class="cell">
              <MpFlex direction="column" gap="1" :class="css({ minWidth: '160px' })">
                <MpProgress variant="linear" size="sm" :class="tealProgress" :value="pct(p)" />
                <MpText size="label-small" :class="labelText">Submit {{ p.submitted }} of {{ p.totalMember }}</MpText>
              </MpFlex>
            </MpTableCell>
            <MpTableCell v-if="!isCompetency" as="td" :class="cell">
              <MpFlex v-if="p.aiSummarized" align="center" gap="1">
                <MpIcon name="airene-brand" :class="css({ color: 'icon.brand', flexShrink: '0', width: '16px', height: '16px' })" />
                <MpText size="label-small" :class="css({ color: 'text.brand', whiteSpace: 'nowrap' })">Summarized by AI</MpText>
              </MpFlex>
            </MpTableCell>
            <MpTableCell as="td" :class="[cell, actionHead]">
              <MpFlex align="center" gap="2" justify="flex-end">
                <MpText v-if="p.published" size="label" :class="completedText">Completed</MpText>
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent>
                    <MpPopoverList>
                      <MpPopoverListItem v-if="!p.published" @click="openPublish(p)">Publish score</MpPopoverListItem>
                      <MpPopoverListItem @click="goInstance(p)">Detail</MpPopoverListItem>
                      <MpPopoverListItem @click="goEditCycle">{{ p.published ? 'View cycle' : 'Edit cycle' }}</MpPopoverListItem>
                      <MpPopoverListItem v-if="!p.published" @click="openExtend(p)">Extend period</MpPopoverListItem>
                      <MpPopoverListItem v-if="!p.published && periods.length > 1" @click="openDelete(p)">Delete</MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpFlex>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <!-- ── Publish modal ──────────────────────────────────────────────── -->
    <ClientOnly>
      <MpModal :is-open="publishOpen" :size="isCompetency ? 'md' : 'lg'" @close="publishOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>Publish review result<MpModalCloseButton @click="publishOpen = false" /></MpModalHeader>
          <MpModalBody>
            <MpFlex direction="column" gap="4" :class="css({ paddingBottom: '2' })">
              <!-- Performance: score disclosure -->
              <template v-if="!isCompetency">
                <MpText size="label" :class="css({ fontWeight: '600', color: 'text.default' })">Score disclosure</MpText>
                <MpRadio
                  v-for="o in scoreDisclosureOptions"
                  :key="o.value"
                  name="score-disclosure"
                  :value="o.value"
                  :is-checked="scoreDisclosure === o.value"
                  @update:is-checked="scoreDisclosure = o.value"
                >{{ o.label }}</MpRadio>
              </template>
              <MpText size="label" :class="css({ fontWeight: '600', color: 'text.default' })">Review methods to publish</MpText>
              <MpCheckbox
                v-for="m in methodLabels"
                :key="m"
                :is-checked="publishMethods.includes(m)"
                @update:is-checked="(v) => (v ? publishMethods.push(m) : (publishMethods = publishMethods.filter(x => x !== m)))"
              >{{ m }}</MpCheckbox>
              <MpCheckbox v-if="!isCompetency" :is-checked="publishResultSummary" @update:is-checked="(v) => (publishResultSummary = v)">
                Review summary (AI)
              </MpCheckbox>
            </MpFlex>
          </MpModalBody>
          <MpModalFooter>
            <MpButton variant="ghost" @click="publishOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmPublish">Publish</MpButton>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>

      <!-- Extend modal -->
      <MpModal :is-open="extendOpen" size="md" @close="extendOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>Extend period<MpModalCloseButton @click="extendOpen = false" /></MpModalHeader>
          <MpModalBody>
            <MpFormControl id="extend-range" :class="css({ paddingBottom: '2' })">
              <MpFormLabel>Extend review period</MpFormLabel>
              <MpDatePicker v-model="extendRange" value-type="date" format="D MMM YYYY" placeholder="Start date - end date" is-range use-portal :is-show-shortcut="false" />
            </MpFormControl>
          </MpModalBody>
          <MpModalFooter>
            <MpButton variant="ghost" @click="extendOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmExtend">Extend</MpButton>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>

      <!-- Delete modal -->
      <MpModal :is-open="deleteOpen" size="sm" @close="deleteOpen = false">
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>Delete cycle?<MpModalCloseButton @click="deleteOpen = false" /></MpModalHeader>
          <MpModalBody><MpText size="label" :class="css({ paddingBottom: '2' })">Are you sure you want to delete this review timeframe? This action cannot be undone.</MpText></MpModalBody>
          <MpModalFooter>
            <MpButton variant="ghost" @click="deleteOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>
    </ClientOnly>
  </MpFlex>
</template>

<style scoped>
/* Reveal the column sort icon on header hover — UNLAYERED (see goal-cycles/index.vue). */
.cd-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
