<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal details
  Token mode: Pixel 2.4 (DT2.4)

  Reached by clicking a goal's name (or Actions → View details) inside a goal
  cycle. Replicates the production "Goal details" page
  (talenta-review src/views/goals/general/Detail.vue): a main column
  (name + weight + status, description, goal progress, then Key results OR
  Aligned goals for company-level goals) beside a right info sidebar
  (owner, period, measurement, category, contributors, alignment).

  All data reads from the goals mini-DB (useGoalsStore) by cycle + goal id.
  Update progress, Edit, Delete and Key result add/edit/delete all persist
  back through the same store (localStorage "talenta-goals-db"), reusing the
  shared useGoalEditor / useGoalDeleter flows the goal lists already use.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpAvatar,
  MpAvatarGroup,
  MpBadge,
  MpIcon,
  MpButton,
  MpButtonGroup,
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
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  toast,
  css,
} from '@mekari/pixel3'
import type { Goal, GoalStatus } from '~/composables/useGoalsStore'
import type { DraftKeyResult } from '~/utils/goalDraft'
import { ownerOf, alignedGoalsOf } from '~/utils/goalRows'
import { EMPLOYEES, employeeById } from '~/utils/employees'

definePageMeta({
  layout: 'default',
  title: 'Goal details',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
})

const route = useRoute()
const router = useRouter()
const cycleId = computed(() => route.params.id as string)
const goalId = computed(() => route.params.goalId as string)

const { goals, updateGoal } = useGoalsStore(cycleId.value)
const { cycles } = useGoalCyclesStore()
const { logActivity } = useGoalActivityStore()
const { createSubmission } = useGoalApprovalsStore()
const cycle = computed(() => cycles.value.find(c => c.id === cycleId.value))
const goal = computed(() => goals.value.find(g => g.id === goalId.value))

// Link back to the cycle for the second breadcrumb crumb (layouts/default.vue
// renders "Goal cycles / <cycleName>" when ?cycleName= is present).
const cycleName = computed(() => (route.query.cycleName as string) || cycle.value?.name || '')

// ─── Derived display ──────────────────────────────────────────────────────────
const owner = computed(() => (goal.value ? employeeById(goal.value.ownerId) : undefined))
const ownerMeta = computed(() => (owner.value ? ownerOf(owner.value.id) : null))

const MEASUREMENT_UNIT_LABEL: Record<NonNullable<Goal['unit']>, string> = {
  currency: 'Amount',
  percent: 'Percentage (%)',
  count: 'Number',
  deadline: 'Deadline',
}
const measurementUnitLabel = computed(() => (goal.value?.unit ? MEASUREMENT_UNIT_LABEL[goal.value.unit] : '—'))
const GOAL_TYPE_LABEL: Record<string, string> = { company: 'Company goal', organization: 'Organization goal', team: 'Team goal', individual: 'Individual goal' }
const goalTypeLabel = computed(() => (goal.value ? (GOAL_TYPE_LABEL[goal.value.level] ?? goal.value.level) : '—'))
// Two wordings for the same direction, matching the Figma: the Goal owner card
// reads "Higher / Lower is better"; the Alignment card reads "Increase /
// Decrease KPI".
function betterLabel(dir?: 'higher' | 'lower') {
  // Measurement type is always present — default to "Higher is better".
  return dir === 'lower' ? 'Lower is better' : 'Higher is better'
}
const measurementTypeLabel = computed(() => betterLabel(goal.value?.direction))

const STATUS_LABEL: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not updated' }
// The achievement % badge on a progress bar takes the goal's status colour:
// green = on track, red = off track, neutral = not updated.
const STATUS_BADGE_TYPE: Record<GoalStatus, 'completed' | 'critical' | 'announcement'> = {
  green: 'completed',
  orange: 'critical',
  gray: 'announcement',
}
function statusBadgeType(s: GoalStatus) { return STATUS_BADGE_TYPE[s] }

// Whether this goal repeats within the cycle. Our cycles are half-year
// semesters, so a repeating goal reads "Repeats half yearly" (Figma).
const repeatLabel = 'Repeats half yearly'

// ─── Description (View more) ────────────────────────────────────────────────
// The description is stored as one string; paragraphs are split on blank
// lines. Collapsed shows only the first paragraph; "View more" reveals the
// rest — shown only when there's more than one paragraph.
const descParas = computed(() => (goal.value?.description ?? '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean))
const descExpanded = ref(false)
const visibleParas = computed(() => (descExpanded.value ? descParas.value : descParas.value.slice(0, 1)))
const hasMoreDesc = computed(() => descParas.value.length > 1)

// ─── Parent (alignment) card ──────────────────────────────────────────────────
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
const parentOwner = computed(() => (parentGoal.value ? employeeById(parentGoal.value.ownerId) : undefined))
const parentLevelLabel = computed(() => (parentGoal.value ? `${capitalize(parentGoal.value.level)} goal` : ''))
const parentDateRange = computed(() => {
  const p = parentGoal.value
  if (!p) return ''
  // Goals created via the New-goals flow carry their own start/end; the seeded
  // ones inherit the cycle's period.
  return p.startDate && p.endDate ? `${p.startDate} – ${p.endDate}` : (cycle.value?.period || '—')
})

// ─── Comments ──────────────────────────────────────────────────────────────────
const { currentUserId } = useCurrentUser()
const currentUser = computed(() => employeeById(currentUserId.value))
const { comments, count: commentCount, addComment } = useGoalCommentsStore(goalId.value)
const newComment = ref('')
function postComment() {
  const body = newComment.value.trim()
  if (!body) return
  addComment(currentUserId.value, body)
  newComment.value = ''
  closeMention()
}

// ─── @mention autocomplete (chat-style) ───────────────────────────────────────
// Typing "@" (at the start or after a space) opens a picker of employees,
// filtered by what's typed after it. ↑/↓ to move, Enter/Tab to insert, Esc to
// dismiss; clicking a row inserts "@Full Name ". No spaces inside the query.
const composerRef = ref<HTMLTextAreaElement>()
const mentionOpen = ref(false)
const mentionQuery = ref('')
const mentionStart = ref(-1)
const mentionIndex = ref(0)
const mentionMatches = computed(() => {
  if (!mentionOpen.value) return []
  const q = mentionQuery.value.toLowerCase()
  // Match on any name word start (so "ri" → Rio / Rizal, not "Christin"), or code.
  return EMPLOYEES.filter(e =>
    e.name.toLowerCase().split(/\s+/).some(w => w.startsWith(q)) || e.code.toLowerCase().startsWith(q),
  ).slice(0, 6)
})
function closeMention() { mentionOpen.value = false; mentionQuery.value = ''; mentionStart.value = -1; mentionIndex.value = 0 }
function detectMention() {
  const el = composerRef.value
  if (!el) return
  const caret = el.selectionStart ?? 0
  const upto = newComment.value.slice(0, caret)
  const at = upto.lastIndexOf('@')
  if (at === -1) return closeMention()
  const before = at === 0 ? ' ' : upto[at - 1]
  if (!/\s/.test(before)) return closeMention() // '@' must start a word
  const query = upto.slice(at + 1)
  if (/\s/.test(query) || query.length > 30) return closeMention()
  mentionStart.value = at
  mentionQuery.value = query
  mentionOpen.value = true
  if (mentionIndex.value >= mentionMatches.value.length) mentionIndex.value = 0
}
function selectMention(emp: typeof EMPLOYEES[number]) {
  const el = composerRef.value
  const caret = el?.selectionStart ?? newComment.value.length
  const head = newComment.value.slice(0, mentionStart.value)
  const tail = newComment.value.slice(caret)
  const insert = `@${emp.name} `
  newComment.value = head + insert + tail
  closeMention()
  nextTick(() => {
    const pos = (head + insert).length
    el?.focus()
    el?.setSelectionRange(pos, pos)
  })
}
function onComposerKeydown(e: KeyboardEvent) {
  if (!mentionOpen.value || !mentionMatches.value.length) return
  if (e.key === 'ArrowDown') { e.preventDefault(); mentionIndex.value = (mentionIndex.value + 1) % mentionMatches.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mentionIndex.value = (mentionIndex.value - 1 + mentionMatches.value.length) % mentionMatches.value.length }
  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(mentionMatches.value[mentionIndex.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); closeMention() }
}
// Split a comment body into plain-text / @mention segments so mentions can be
// tinted without v-html. Matches "@" + a known employee's full name.
const MENTION_NAMES = EMPLOYEES.map(e => e.name).sort((a, b) => b.length - a.length)
function commentSegments(body: string): { text: string, mention: boolean }[] {
  const out: { text: string, mention: boolean }[] = []
  let i = 0
  while (i < body.length) {
    if (body[i] === '@') {
      const rest = body.slice(i + 1)
      const hit = MENTION_NAMES.find(n => rest.startsWith(n))
      if (hit) {
        out.push({ text: `@${hit}`, mention: true })
        i += hit.length + 1
        continue
      }
    }
    const last = out[out.length - 1]
    if (last && !last.mention) last.text += body[i]
    else out.push({ text: body[i], mention: false })
    i += 1
  }
  return out
}

const contributors = computed(() =>
  (goal.value?.contributorIds ?? []).map(id => employeeById(id)).filter(Boolean) as NonNullable<ReturnType<typeof employeeById>>[],
)
// Goal members (Team/Organization goals only) — people who can view the goal
// and align theirs to it. Shown in the sidebar only when the goal has any.
const members = computed(() =>
  (goal.value?.viewerIds ?? []).map(id => employeeById(id)).filter(Boolean) as NonNullable<ReturnType<typeof employeeById>>[],
)

// Alignment — the parent goal this one cascades from, plus its own children
// (every goal whose alignedToId points back at this one).
const parentGoal = computed(() => (goal.value?.alignedToId ? goals.value.find(g => g.id === goal.value!.alignedToId) : undefined))
// When this goal aligns to a specific key result of its parent, resolve it.
const parentKr = computed(() => {
  if (!parentGoal.value || !goal.value?.alignedToKrId) return undefined
  return (parentGoal.value.keyResults ?? []).find(k => k.id === goal.value!.alignedToKrId)
})
const alignedChildren = computed(() => (goal.value ? alignedGoalsOf(goal.value, goals.value) : []))

const keyResults = computed<DraftKeyResult[]>(() => goal.value?.keyResults ?? [])
const isCompany = computed(() => goal.value?.level === 'company')

// ─── Column sort (per table; behaviour from goal-cycles/index.vue) ─────────────
// Aligned goals table (company level).
const alSortKey = ref('')
const alSortDir = ref<'asc' | 'desc'>('asc')
function onAlSortChange(key: string, dir: 'asc' | 'desc') { alSortKey.value = key; alSortDir.value = dir }
const alColumnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  goal: 'text',
  weight: 'number',
  owner: 'text',
  status: 'text',
}
function alSortValue(g: Goal, key: string): string | number {
  if (key === 'goal') return g.title
  if (key === 'weight') return g.weight ?? 0
  if (key === 'owner') return ownerOf(g.ownerId).name
  if (key === 'status') return STATUS_LABEL[g.status]
  return ''
}
const sortedAligned = computed(() => {
  if (!alSortKey.value) return alignedChildren.value
  const dir = alSortDir.value === 'asc' ? 1 : -1
  return [...alignedChildren.value].sort((a, b) =>
    String(alSortValue(a, alSortKey.value)).localeCompare(
      String(alSortValue(b, alSortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

// Key results table (rows keyed by stable kr.id; add/edit happens in a drawer,
// so sorting a copy for display can't corrupt any inline entry state).
const krSortKey = ref('')
const krSortDir = ref<'asc' | 'desc'>('asc')
function onKrSortChange(key: string, dir: 'asc' | 'desc') { krSortKey.value = key; krSortDir.value = dir }
const krColumnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  title: 'text',
  target: 'text',
}
function krSortValue(kr: DraftKeyResult, key: string): string {
  if (key === 'title') return kr.title
  if (key === 'target') return kr.target ?? ''
  return ''
}
const sortedKeyResults = computed(() => {
  if (!krSortKey.value) return keyResults.value
  const dir = krSortDir.value === 'asc' ? 1 : -1
  return [...keyResults.value].sort((a, b) =>
    String(krSortValue(a, krSortKey.value)).localeCompare(
      String(krSortValue(b, krSortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}
function formatValue(unit: Goal['unit'], v: number | undefined): string {
  if (v == null) return '—'
  if (unit === 'currency') return `Rp${formatNumber(v)}`
  if (unit === 'percent') return `${v}%`
  return `${formatNumber(v)}`
}
function goalHref(id: string) {
  return { path: `/goals/goal-cycles/${cycleId.value}/goals/${id}`, query: { cycleName: cycleName.value } }
}

// ─── Update progress (opens the shared UpdateProgressDrawer component) ──────
const isUpdateOpen = ref(false)
function openUpdate() { isUpdateOpen.value = true }
// Activity log (history) drawer for this goal.
const isActivityLogOpen = ref(false)

// ─── Edit (reuse the shared drawer flow) ──────────────────────────────────────
const { isEditDrawerOpen, editingDraft, editingOwners, alreadyUsedWeightForEdit, openEditGoal, saveEdit } = useGoalEditor()
function editGoal() {
  if (goal.value) openEditGoal(goal.value)
}

// ─── Delete (reuse the shared flow) — return to the cycle once it's gone ──────
const { isDeleteModalOpen, goalToDelete, askDeleteGoal, confirmDeleteGoal } = useGoalDeleter()
function deleteGoalAction() {
  if (goal.value) askDeleteGoal(goal.value)
}
const { isCloseModalOpen, goalToClose, askCloseGoal, confirmCloseGoal } = useGoalCloser()
function closeGoalAction() {
  if (goal.value) askCloseGoal(goal.value)
}
const isRemoveAlignOpen = ref(false)
function removeAlignment() { isRemoveAlignOpen.value = true }
function confirmRemoveAlignment() {
  if (goal.value) {
    updateGoal(goal.value.id, { alignedToId: undefined, alignedToKrId: undefined })
    logActivity(goal.value.id, { type: 'event', wording: 'removed the goal alignment.' })
  }
  toast.notify({ id: 'goal-alignment-removed', position: 'top-center', variant: 'success', title: 'Alignment removed' })
  isRemoveAlignOpen.value = false
}
// An actual delete removes the record from the store; a direct report's delete
// only submits for approval and keeps the goal live. Redirect back to the
// cycle only when the goal really disappears.
watch(goal, (v) => {
  if (!v) router.push({ path: `/goals/goal-cycles/${cycleId.value}`, query: { name: cycleName.value } })
})

// ─── Key results (add / edit / delete) ────────────────────────────────────────
// Reuses the shared AddKeyResultDrawer (the full measurement form) instead of a
// bespoke title+target drawer, so a KR captures direction / unit / baseline /
// target exactly like it does in the New-goals flow.
const isKrDrawerOpen = ref(false)
const editingKr = ref<DraftKeyResult | null>(null)
function openAddKr() {
  editingKr.value = null
  isKrDrawerOpen.value = true
}
function openEditKr(kr: DraftKeyResult) {
  editingKr.value = kr
  isKrDrawerOpen.value = true
}
const KR_UNIT_LABEL: Record<string, string> = { percentage: 'Percentage', number: 'Number', amount: 'Amount', deadline: 'Deadline' }
function krMechLabel(m?: string) { return m === 'log-based' ? 'Log-based' : 'Manual entry' }
// Human-readable "what changed, from → to" list for an edited key result.
function describeKrChanges(a: DraftKeyResult, b: DraftKeyResult): string[] {
  const out: string[] = []
  if (a.title !== b.title) out.push(`name “${a.title}” → “${b.title}”`)
  if ((a.measurementUnit ?? '') !== (b.measurementUnit ?? '')) out.push(`measurement unit ${KR_UNIT_LABEL[a.measurementUnit ?? ''] ?? '—'} → ${KR_UNIT_LABEL[b.measurementUnit ?? ''] ?? '—'}`)
  if ((a.kpiDirection ?? '') !== (b.kpiDirection ?? '')) out.push(`direction ${betterLabel(a.kpiDirection)} → ${betterLabel(b.kpiDirection)}`)
  if (Number(a.startValue) !== Number(b.startValue)) out.push(`baseline ${krFmt(a, a.startValue)} → ${krFmt(b, b.startValue)}`)
  if (Number(a.targetValue) !== Number(b.targetValue)) out.push(`target ${krFmt(a, a.targetValue)} → ${krFmt(b, b.targetValue)}`)
  if ((a.deadlineDate ?? '') !== (b.deadlineDate ?? '')) out.push(`deadline ${a.deadlineDate || '—'} → ${b.deadlineDate || '—'}`)
  if ((a.progressMechanism ?? '') !== (b.progressMechanism ?? '')) out.push(`progress method ${krMechLabel(a.progressMechanism)} → ${krMechLabel(b.progressMechanism)}`)
  return out
}
function onKrSave(kr: DraftKeyResult) {
  if (!goal.value) return
  const list = [...keyResults.value]
  const i = list.findIndex(k => k.id === kr.id)
  const editing = i !== -1
  const changes = editing ? describeKrChanges(list[i], kr) : []
  // A freshly-added KR starts at its baseline (0% progress); an edited one
  // keeps whatever current value it already had.
  const currentValue = editing ? (list[i].currentValue ?? (typeof kr.startValue === 'number' ? kr.startValue : undefined)) : (typeof kr.startValue === 'number' ? kr.startValue : undefined)
  const status = editing ? list[i].status : undefined
  const merged: DraftKeyResult = { ...kr, currentValue, status }
  if (editing) list[i] = merged
  else list.push(merged)
  // A direct report's KR change routes to approval (submitted as a goal edit);
  // everyone else applies it immediately.
  if (needsApproval(goal.value.ownerId)) {
    submitGoalEdit({ keyResults: list })
    toast.notify({ id: 'kr-submitted', position: 'top-center', variant: 'success', title: 'Key result change sent for approval' })
    return
  }
  updateGoal(goal.value.id, { keyResults: list })
  logActivity(goal.value.id, {
    type: 'event',
    wording: editing
      ? `edited the key result “${kr.title}”${changes.length ? ` — ${changes.join(', ')}` : ''}.`
      : `added the key result “${kr.title}”.`,
  })
  toast.notify({ id: 'kr-saved', position: 'top-center', variant: 'success', title: editing ? 'Key result updated' : 'Key result added' })
}
// Submit a goal edit (partial patch) to the approval queue for a direct report.
function submitGoalEdit(patch: Partial<Goal>) {
  if (!goal.value) return
  const { cycleId, ...rest } = goal.value
  createSubmission(
    [{ type: 'edit', goalId: goal.value.id, ownerId: goal.value.ownerId, cycleId: goal.value.cycleId, before: goal.value, after: { ...rest, ...patch } }],
    goal.value.ownerId,
    goal.value.cycleId,
  )
}

// ─── Key result progress bar ────────────────────────────────────────────────
// A KR with a numeric target draws its own progress bar (current value against
// baseline → target, honoring direction). One without measurement falls back to
// its short `target` summary string.
function krIsMeasured(kr: DraftKeyResult) {
  return typeof kr.targetValue === 'number' && typeof kr.currentValue === 'number'
}
function krPct(kr: DraftKeyResult): number {
  const base = kr.useBaseline && typeof kr.startValue === 'number' ? kr.startValue : 0
  const target = Number(kr.targetValue)
  const cur = Number(kr.currentValue)
  const span = kr.kpiDirection === 'lower' ? base - target : target - base
  if (!span) return 0
  const done = kr.kpiDirection === 'lower' ? base - cur : cur - base
  return Math.max(0, Math.min(100, Math.round((done / span) * 100)))
}
function krFmt(kr: DraftKeyResult, v: number | '' | undefined): string {
  if (v === '' || v == null) return '—'
  if (kr.measurementUnit === 'amount') return `Rp${formatNumber(Number(v))}`
  if (kr.measurementUnit === 'percentage') return `${v}%`
  return formatNumber(Number(v))
}
// A KR belongs to its goal, so every KR bar takes the GOAL's status colour —
// you can't have an off-track goal with an on-track (teal) key result. Widths
// still differ per KR (each KR's own %), only the colour is uniform.
function krFillClass(_kr?: DraftKeyResult) {
  const s = goal.value?.status
  return s === 'orange' ? krFillOrange : s === 'gray' ? krFillGray : krFillTeal
}

const krToDelete = ref<DraftKeyResult | null>(null)
const isKrDeleteOpen = ref(false)
function askDeleteKr(kr: DraftKeyResult) {
  krToDelete.value = kr
  isKrDeleteOpen.value = true
}
function confirmDeleteKr() {
  if (!goal.value || !krToDelete.value) return
  const title = krToDelete.value.title
  const nextList = keyResults.value.filter(k => k.id !== krToDelete.value!.id)
  isKrDeleteOpen.value = false
  krToDelete.value = null
  if (needsApproval(goal.value.ownerId)) {
    submitGoalEdit({ keyResults: nextList })
    toast.notify({ id: 'kr-delete-submitted', position: 'top-center', variant: 'success', title: 'Key result change sent for approval' })
    return
  }
  updateGoal(goal.value.id, { keyResults: nextList })
  logActivity(goal.value.id, { type: 'event', wording: `deleted the key result “${title}”.` })
  toast.notify({ id: 'kr-deleted', position: 'top-center', variant: 'success', title: 'Key result deleted' })
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
// The page fills the stage so the right rail can run full height.
const pageRoot = css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' })
// 12-column grid: main content spans 8, the right info rail spans 4 (Figma).
const bodyRow = css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: 'repeat(12, minmax(0, 1fr))' }, alignItems: 'stretch', gap: '0', flex: '1', minHeight: '0' })
const mainCol = css({ gridColumn: { base: 'auto', lg: 'span 8' }, minWidth: '0', paddingRight: { base: '0', lg: '6' } })
// Right rail sits on a #F9F9F9 panel (exact Figma value — no Pixel token maps
// to it), and on desktop breaks out of the stage's 24px padding so it sits
// flush to the stage's top / right / bottom edges and runs full height.
const sideCol = css({
  gridColumn: { base: 'auto', lg: 'span 4' },
  display: 'flex', flexDirection: 'column', gap: '4',
  background: '#F9F9F9',
  padding: '4',
  marginTop: { base: '6', lg: '-6' },
  marginRight: { base: '0', lg: '-6' },
  marginBottom: { base: '0', lg: '-6' },
  minHeight: { lg: 'calc(100% + 48px)' },
})

const nameText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const weightText = css({ fontSize: '20px', fontWeight: '600', lineHeight: '28px', color: 'text.link' })
const sectionH2 = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const sectionH3 = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const progressValue = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const descText = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const emptyMuted = css({ color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })

const divider = css({ height: '1px', background: 'border.default', marginBlock: '6' })

// Progress bar — same shape as the goal lists' inline progress cell.
const progressTrack = css({ width: '100%', maxWidth: '360px', height: '8px', borderRadius: 'full', background: 'border.default', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })
const fillGray = css({ background: 'gray.400' })
const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })
const pillRose = css({ ...pillBase, background: 'red.50', color: 'red.700' })
const pillGray = css({ ...pillBase, background: 'gray.100', color: 'gray.600' })
// Achievement badge colour tracks the (manual) status — never mix green with a red bar.
function pillClass(s?: GoalStatus) { return s === 'orange' ? pillRose : s === 'gray' ? pillGray : pillGreen }
const goalPillClass = computed(() => pillClass(goal.value?.status))
const rangeRow = css({ display: 'flex', justifyContent: 'space-between', maxWidth: '360px', marginTop: '1' })
const rangeMin = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const rangeMax = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '2', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
function statusClass(s: GoalStatus) {
  return s === 'green' ? statusPillGreen : s === 'orange' ? statusPillOrange : statusPillGray
}

// Sidebar key/value
const kvRow = css({ display: 'flex', flexDirection: 'column', gap: '0.5' })
const kvLabel = css({ color: 'text.secondary', fontSize: '12px', lineHeight: '16px' })
const kvValue = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const infoBanner = css({ display: 'flex', alignItems: 'flex-start', gap: '2', padding: '3', borderRadius: '6px', background: 'background.information.subtle', border: '1px solid', borderColor: 'border.information' })
const ownerRow = css({ display: 'flex', alignItems: 'center', gap: '2' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const linkReset = css({ color: 'text.link', cursor: 'pointer', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
const addKrRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2' })
const krFields = css({ display: 'flex', flexDirection: 'column', gap: '5', width: '100%' })
const headCell = css({ whiteSpace: 'nowrap', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Header label + sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const cell = css({ verticalAlign: 'middle', paddingTop: '2', paddingBottom: '2' })
const actionCell = css({ width: '1%', whiteSpace: 'nowrap', textAlign: 'right', paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const alignCard = css({ display: 'flex', flexDirection: 'column', gap: '1' })

// KR progress bars reuse progressTrack/progressFill; extra tints below.
const krFillTeal = css({ background: 'teal.400' })
const krFillOrange = css({ background: 'rose.400' })
const krFillGray = css({ background: 'gray.400' })
const krName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const krSub = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// "+ Add key result" text link (Figma) — not a button.
const addKrLink = css({ display: 'inline-flex', alignItems: 'center', gap: '1', border: 'none', background: 'transparent', color: 'text.link', fontSize: '14px', fontWeight: '600', lineHeight: '20px', cursor: 'pointer', padding: '0', _hover: { textDecoration: 'underline' } })
const krHeaderRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4' })

// ─── Sidebar cards ──────────────────────────────────────────────────────────
const card = css({ display: 'flex', flexDirection: 'column', gap: '4', background: 'white', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'md', padding: '5' })
const cardLabel = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
// Goal-type badge — same colour for every level (tableStatus look): purple
// bg #E8E0FF / text #4829A6.
const badgePill = css({ display: 'inline-flex', alignItems: 'center', width: 'fit-content', borderRadius: 'sm', paddingInline: '2', paddingBlock: '0.5', fontSize: '12px', lineHeight: '16px', fontWeight: '500', background: '#E8E0FF', color: '#4829A6' })
// Badge + goal name + period sit tight together (8px), separate from the
// key/value rows below.
const alignHeadGroup = css({ display: 'flex', flexDirection: 'column', gap: '2' })
// Alignment goal name: black 14/semibold, clickable but never underlined.
const alignGoalName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', cursor: 'pointer', textDecoration: 'none', _hover: { textDecoration: 'none' } })
const alignDivider = css({ height: '1px', background: 'border.default', marginBlock: '3' })
// Goal-level "Last updated by … on …" — a link (opens the update log) pinned
// to the very bottom of the rail.
const lastUpdatedLink = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', textDecoration: 'underline', cursor: 'pointer', _hover: { color: 'text.link' } })
const cardHeadRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2' })
const alignTitleRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2' })
// Name + period stacked 8px apart; the tall avatar sits beside them so it no
// longer inflates the space between name and period.
const alignTitleCol = css({ display: 'flex', flexDirection: 'column', gap: '2', minWidth: '0', flex: '1' })
const dateRow = css({ display: 'flex', alignItems: 'center', gap: '1', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })
const iconBtn = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'text.secondary', borderRadius: 'sm', _hover: { background: 'background.neutral.subtle' } })

// Contributor avatars — overlapping row of lg avatars, each with a white hover
// coachmark (avatar + name + "employeeID | job title | organization"), styled
// after the Talenta master user popover.
const contribRow = css({ display: 'flex', alignItems: 'center', flexWrap: 'wrap' })
const contribItem = css({ position: 'relative', display: 'inline-flex', '&:not(:first-child)': { marginLeft: '-8px' } })
const contribAvatar = css({ display: 'inline-flex', borderRadius: 'full', boxShadow: '0 0 0 2px #F9F9F9' })
const coachCardBase = { position: 'absolute', top: 'calc(100% + 8px)', zIndex: '30', display: 'flex', alignItems: 'center', gap: '3', background: 'white', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'md', boxShadow: '0px 4px 16px rgba(16, 24, 40, 0.12)', paddingInline: '3', paddingBlock: '2', whiteSpace: 'nowrap' } as const
// Left-anchored for the contributor row; right-anchored for the owner avatar
// (which sits at the rail's right edge) so the card opens inward, not off-screen.
const coachCard = css({ ...coachCardBase, left: '0' })
const coachCardEnd = css({ ...coachCardBase, right: '0' })
const coachText = css({ display: 'flex', flexDirection: 'column', gap: '0' })
const coachName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const coachMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })

// ─── Comments ──────────────────────────────────────────────────────────────────
const composerRow = css({ display: 'flex', gap: '3', marginTop: '3' })
const composerCol = css({ display: 'flex', flexDirection: 'column', gap: '2', flex: '1', minWidth: '0' })
const composerBox = css({ position: 'relative', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'md', padding: '3', display: 'flex', flexDirection: 'column', gap: '2', _focusWithin: { borderColor: 'border.focus', boxShadow: '0 0 0 1px var(--mp-colors-border-focus, #4B61DD)' } })
// @mention picker dropdown, anchored under the composer box.
const mentionPopover = css({ position: 'absolute', top: 'calc(100% + 4px)', left: '0', zIndex: '40', width: '100%', maxWidth: '320px', maxHeight: '240px', overflowY: 'auto', background: 'white', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', borderRadius: 'md', boxShadow: '0px 4px 16px rgba(16, 24, 40, 0.12)', padding: '1', display: 'flex', flexDirection: 'column' })
const mentionItem = css({ display: 'flex', alignItems: 'center', gap: '2', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', paddingInline: '2', paddingBlock: '2', borderRadius: 'sm' })
const mentionItemActive = css({ background: 'background.neutral.subtle' })
const mentionText = css({ display: 'flex', flexDirection: 'column', gap: '0', minWidth: '0' })
const mentionName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const mentionMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
const composerTextarea = css({ border: 'none', outline: 'none', resize: 'vertical', width: '100%', minHeight: '48px', fontSize: '14px', lineHeight: '20px', color: 'text.default', background: 'transparent', fontFamily: 'inherit', '&::placeholder': { color: 'text.secondary' } })
const composerBar = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const postRow = css({ display: 'flex', justifyContent: 'flex-end' })

const commentRow = css({ display: 'flex', gap: '3', marginTop: '5' })
const commentCol = css({ display: 'flex', flexDirection: 'column', gap: '1', flex: '1', minWidth: '0' })
const commentHead = css({ display: 'flex', alignItems: 'center', gap: '2' })
const commentAuthor = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const commentTime = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const commentBody = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const mentionSpan = css({ color: 'text.link', fontWeight: '500' })
// Attachment: PDF file glyph + name/size stacked, no bordered card (Figma).
const attachmentRow = css({ display: 'inline-flex', alignItems: 'center', gap: '2', width: 'fit-content', marginTop: '1' })
const attachmentIcon = css({ width: '28px', height: '28px', flexShrink: '0' })
const attachmentName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const attachmentSize = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
</script>

<template>
  <div v-if="goal" :class="pageRoot">
    <!-- Page header actions — single "Actions" dropdown (Figma) -->
    <Teleport to="#page-header-actions" defer>
      <MpPopover is-close-on-select use-portal placement="bottom-end">
        <MpPopoverTrigger>
          <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
        </MpPopoverTrigger>
        <MpPopoverContent :class="css({ minWidth: '180px' })">
          <MpPopoverList>
            <MpPopoverListItem v-if="!goal.isClosed" @click="openUpdate">Update progress</MpPopoverListItem>
            <MpPopoverListItem @click="isActivityLogOpen = true">Activity log</MpPopoverListItem>
            <MpPopoverListItem v-if="!goal.isClosed" @click="editGoal">Edit goal</MpPopoverListItem>
            <MpPopoverListItem v-if="!goal.isClosed" @click="closeGoalAction">Close goal</MpPopoverListItem>
            <MpPopoverListItem @click="deleteGoalAction">
              <span :class="css({ color: 'text.danger' })">Delete goal</span>
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
    </Teleport>

    <div :class="bodyRow">
      <!-- ═════ Main column ═════ -->
      <div :class="mainCol">
        <!-- Title + status -->
        <MpFlex align="center" gap="2" wrap="wrap">
          <span :class="nameText">{{ goal.title }}</span>
          <span :class="statusClass(goal.status)">{{ STATUS_LABEL[goal.status] }}</span>
          <!-- Carried-over badge hidden for now (flag retained in the store):
          <MpBadge v-if="goal.carriedOver" for="tableStatus" type="announcement" size="sm">Carried over</MpBadge> -->
        </MpFlex>

        <!-- Description (+ View more) -->
        <div :class="css({ marginTop: '2' })">
          <template v-if="descParas.length">
            <MpText v-for="(para, i) in visibleParas" :key="i" :class="[descText, i > 0 && css({ marginTop: '2' })]">{{ para }}</MpText>
            <button v-if="hasMoreDesc" type="button" :class="[addKrLink, css({ marginTop: '2' })]" @click="descExpanded = !descExpanded">
              {{ descExpanded ? 'View less' : 'View more' }}
            </button>
          </template>
          <MpText v-else :class="emptyMuted">No description.</MpText>
        </div>

        <!-- Goal progress -->
        <div :class="css({ marginTop: '6' })">
          <MpText :class="sectionH2">Goal progress</MpText>
          <div v-if="goal.unit && goal.unit !== 'deadline'" :class="css({ marginTop: '2' })">
            <MpFlex align="center" gap="2">
              <MpText :class="progressValue">{{ formatValue(goal.unit, goal.value) }}</MpText>
              <MpBadge for="tableStatus" :type="statusBadgeType(goal.status)" size="sm">{{ goal.pill ?? 0 }}%</MpBadge>
            </MpFlex>
            <div :class="[progressTrack, css({ marginTop: '1', maxWidth: 'none' })]">
              <div :class="[progressFill, goal.status === 'green' ? fillGreen : goal.status === 'orange' ? fillOrange : fillGray]" :style="{ width: `${Math.min(goal.pill ?? 0, 100)}%` }" />
            </div>
            <div :class="[rangeRow, css({ maxWidth: 'none' })]">
              <span :class="rangeMin">{{ formatValue(goal.unit, goal.min ?? 0) }}</span>
              <span :class="rangeMax">{{ formatValue(goal.unit, goal.max) }}</span>
            </div>
          </div>
          <MpText v-else-if="goal.unit === 'deadline'" size="label" :class="[valueText, css({ marginTop: '2' })]">
            Deadline: {{ goal.deadlineDate || '—' }}
          </MpText>
          <MpText v-else size="label" :class="[emptyMuted, css({ marginTop: '2' })]">
            No measurable progress — tracked by status only.
          </MpText>
        </div>

        <div :class="css({ height: '8' })" />

        <!-- Aligned goals (company) OR Key results -->
        <template v-if="isCompany">
          <MpText :class="sectionH3">Aligned goals<template v-if="alignedChildren.length"> ({{ alignedChildren.length }})</template></MpText>
          <MpTableContainer v-if="alignedChildren.length" class="gd-bordered-table" :class="css({ marginTop: '3' })">
            <MpTable :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Goal</span><PxColumnSortMenu col-key="goal" :sort-type="alColumnSortTypes.goal" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Weight</span><PxColumnSortMenu col-key="weight" :sort-type="alColumnSortTypes.weight" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Goal owner</span><PxColumnSortMenu col-key="owner" :sort-type="alColumnSortTypes.owner" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" :class="[headCell, css({ width: '32%' })]"><span :class="thInner"><span>Progress</span></span></MpTableCell>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="alColumnSortTypes.status" :sort-key="alSortKey" :sort-dir="alSortDir" @sort-change="onAlSortChange" /></span>
                  </MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="c in sortedAligned" :key="c.id">
                  <MpTableCell as="td" :class="cell">
                    <MpFlex direction="column" gap="0">
                      <span :class="goalCode">{{ c.code }}</span>
                      <span :class="linkReset" @click="router.push(goalHref(c.id))">{{ c.title }}</span>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="td" :class="cell">{{ c.weight }}%</MpTableCell>
                  <MpTableCell as="td" :class="cell">
                    <MpFlex align="flex-start" gap="2">
                      <MpAvatar :id="`al-${c.id}`" :name="ownerOf(c.ownerId).name" :src="ownerOf(c.ownerId).photo" size="lg" variant-color="gray" :class="css({ flexShrink: '0' })" />
                      <MpFlex direction="column" gap="0" :class="css({ minWidth: '0' })">
                        <MpText size="label" :class="css({ color: 'text.default' })">{{ ownerOf(c.ownerId).name }}</MpText>
                        <MpText size="label-small" :class="css({ color: 'text.secondary' })">{{ ownerOf(c.ownerId).id }} · {{ ownerOf(c.ownerId).title }} · {{ ownerOf(c.ownerId).department }}</MpText>
                      </MpFlex>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[cell, css({ width: '32%' })]">
                    <template v-if="c.unit && typeof c.pill === 'number'">
                      <MpFlex align="center" gap="1">
                        <MpText :class="progressValue">{{ formatValue(c.unit, c.value ?? 0) }}</MpText>
                        <span :class="pillClass(c.status)">{{ c.pill }}%</span>
                      </MpFlex>
                      <div :class="[progressTrack, css({ marginTop: '1', maxWidth: 'none' })]">
                        <div :class="[progressFill, c.status === 'orange' ? fillOrange : c.status === 'gray' ? fillGray : fillGreen]" :style="{ width: `${Math.min(c.pill, 100)}%` }" />
                      </div>
                      <div :class="[rangeRow, css({ maxWidth: 'none' })]">
                        <span :class="rangeMin">{{ formatValue(c.unit, c.min ?? 0) }}</span>
                        <span :class="rangeMax">{{ formatValue(c.unit, c.max) }}</span>
                      </div>
                    </template>
                    <span v-else :class="kvValue">—</span>
                  </MpTableCell>
                  <MpTableCell as="td" :class="cell"><span :class="statusClass(c.status)">{{ STATUS_LABEL[c.status] }}</span></MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else :class="[emptyMuted, css({ marginTop: '2' })]">No aligned goal found.</MpText>
        </template>

        <template v-else>
          <div :class="krHeaderRow">
            <div>
              <MpText :class="sectionH2">Key Results<template v-if="keyResults.length"> ({{ keyResults.length }})</template></MpText>
              <MpText size="label" :class="captionText">
                Key Results track specific outcomes that automatically update the goal progress.
              </MpText>
            </div>
            <button v-if="!goal.isClosed" type="button" :class="addKrLink" @click="openAddKr">
              <MpIcon name="add" size="sm" />
              Add key result
            </button>
          </div>

          <MpTableContainer v-if="keyResults.length" class="gd-bordered-table" :class="css({ marginTop: '3' })">
            <MpTable :is-hoverable="false">
              <MpTableHead>
                <MpTableRow>
                  <MpTableCell as="th" class="gd-sort-th" :class="headCell">
                    <span :class="thInner"><span>Key result name</span><PxColumnSortMenu col-key="title" :sort-type="krColumnSortTypes.title" :sort-key="krSortKey" :sort-dir="krSortDir" @sort-change="onKrSortChange" /></span>
                  </MpTableCell>
                  <MpTableCell as="th" :class="headCell"><span>Progress</span></MpTableCell>
                  <MpTableCell as="th" :class="[headCell, actionCell]" />
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="kr in sortedKeyResults" :key="kr.id">
                  <MpTableCell as="td" :class="cell">
                    <MpFlex direction="column" gap="0">
                      <span :class="krName">{{ kr.title }}</span>
                      <span v-if="kr.kpiDirection" :class="krSub">{{ betterLabel(kr.kpiDirection) }}</span>
                    </MpFlex>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[cell, css({ width: '46%' })]">
                    <template v-if="krIsMeasured(kr)">
                      <MpFlex align="center" gap="1">
                        <MpText :class="progressValue">{{ krFmt(kr, kr.currentValue) }}</MpText>
                        <span :class="goalPillClass">{{ krPct(kr) }}%</span>
                      </MpFlex>
                      <div :class="[progressTrack, css({ marginTop: '1', maxWidth: 'none' })]">
                        <div :class="[progressFill, krFillClass(kr)]" :style="{ width: `${krPct(kr)}%` }" />
                      </div>
                      <div :class="[rangeRow, css({ maxWidth: 'none' })]">
                        <span :class="rangeMin">{{ krFmt(kr, kr.startValue) }}</span>
                        <span :class="rangeMax">{{ krFmt(kr, kr.targetValue) }}</span>
                      </div>
                    </template>
                    <span v-else :class="kvValue">{{ kr.target || '—' }}</span>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[cell, actionCell]">
                    <MpPopover v-if="!goal.isClosed" is-close-on-select use-portal placement="bottom-end">
                      <MpPopoverTrigger>
                        <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Key result actions" />
                      </MpPopoverTrigger>
                      <MpPopoverContent :class="css({ minWidth: '140px' })">
                        <MpPopoverList>
                          <MpPopoverListItem @click="openEditKr(kr)">Edit</MpPopoverListItem>
                          <MpPopoverListItem @click="askDeleteKr(kr)">
                            <span :class="css({ color: 'text.danger' })">Delete</span>
                          </MpPopoverListItem>
                        </MpPopoverList>
                      </MpPopoverContent>
                    </MpPopover>
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpFlex v-else direction="column" gap="1" :class="css({ marginTop: '4', paddingBlock: '6', textAlign: 'center' })">
            <MpText :class="css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })">No key results found.</MpText>
            <MpText size="label" :class="captionText">Add a key result to start tracking outcomes for this goal.</MpText>
          </MpFlex>
        </template>

        <!-- ═════ Comments ═════ -->
        <MpText :class="[sectionH2, css({ marginTop: '8' })]">Comments</MpText>

        <!-- Composer -->
        <div :class="composerRow">
          <MpAvatar v-if="currentUser" :id="`me-${currentUser.id}`" :name="currentUser.name" :src="currentUser.photo" size="lg" variant-color="gray" />
          <div :class="composerCol">
            <div :class="composerBox">
              <textarea
                ref="composerRef"
                v-model="newComment"
                :class="composerTextarea"
                rows="2"
                placeholder="Leave comment or @ mention someone"
                @input="detectMention"
                @click="detectMention"
                @keyup="detectMention"
                @keydown="onComposerKeydown"
                @blur="closeMention"
              />
              <div :class="composerBar">
                <button type="button" :class="iconBtn" aria-label="Attach file"><MpIcon name="attachment" size="sm" /></button>
              </div>

              <!-- @mention picker -->
              <div v-if="mentionOpen && mentionMatches.length" :class="mentionPopover">
                <button
                  v-for="(emp, i) in mentionMatches"
                  :key="emp.id"
                  type="button"
                  :class="[mentionItem, i === mentionIndex && mentionItemActive]"
                  @mousedown.prevent="selectMention(emp)"
                  @mouseenter="mentionIndex = i"
                >
                  <MpAvatar :id="`mention-${emp.id}`" :name="emp.name" :src="emp.photo" size="sm" variant-color="gray" />
                  <div :class="mentionText">
                    <span :class="mentionName">{{ emp.name }}</span>
                    <span :class="mentionMeta">{{ emp.code }} | {{ emp.title }} | {{ emp.department }}</span>
                  </div>
                </button>
              </div>
            </div>
            <div :class="postRow">
              <MpButton variant="primary" @click="postComment">Post</MpButton>
            </div>
          </div>
        </div>

        <!-- Thread -->
        <div v-for="c in comments" :key="c.id" :class="commentRow">
          <MpAvatar :id="`c-${c.id}`" :name="employeeById(c.authorId)?.name" :src="employeeById(c.authorId)?.photo" size="lg" variant-color="gray" />
          <div :class="commentCol">
            <div :class="commentHead">
              <span :class="commentAuthor">{{ employeeById(c.authorId)?.name }}</span>
              <span :class="commentTime">{{ c.createdLabel }}</span>
            </div>
            <div :class="commentBody">
              <template v-for="(seg, i) in commentSegments(c.body)" :key="i"><span v-if="seg.mention" :class="mentionSpan">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template>
            </div>
            <div v-if="c.attachment" :class="attachmentRow">
              <MpIcon name="pdf-document" :class="attachmentIcon" />
              <MpFlex direction="column" gap="0">
                <span :class="attachmentName">{{ c.attachment.name }}</span>
                <span :class="attachmentSize">{{ c.attachment.sizeLabel }}</span>
              </MpFlex>
            </div>
          </div>
        </div>
      </div>

      <!-- ═════ Right info sidebar (two cards) ═════ -->
      <aside :class="sideCol">
        <!-- Card 1 — Goal owner + meta -->
        <div :class="card">
          <div :class="kvRow">
            <span :class="cardLabel">Goal owner</span>
            <div :class="[ownerRow, css({ marginTop: '1' })]">
              <MpAvatar v-if="owner" :id="`goal-owner-${owner.id}`" :name="owner.name" :src="owner.photo" size="lg" variant-color="gray" />
              <MpFlex direction="column" gap="0">
                <MpText size="label" :class="valueText">{{ owner?.name }}</MpText>
                <MpText size="label-small" :class="captionText">{{ owner?.code }} | {{ owner?.title }} | {{ owner?.department }}</MpText>
              </MpFlex>
            </div>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Goal period</span>
            <span :class="kvValue">{{ cycle?.period || '—' }}</span>
            <span v-if="goal.repeat" :class="captionText">{{ repeatLabel }}</span>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Goal type</span>
            <span :class="kvValue">{{ goalTypeLabel }}</span>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Goal weight</span>
            <span :class="kvValue">{{ goal.weight }}%</span>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Goal category</span>
            <span :class="kvValue">{{ goal.category }}</span>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Goal sub-category</span>
            <span :class="kvValue">{{ goal.subCategory }}</span>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Measurement type</span>
            <span :class="kvValue">{{ measurementTypeLabel }}</span>
          </div>

          <div v-if="members.length" :class="kvRow">
            <span :class="cardLabel">Goal members</span>
            <div :class="[contribRow, css({ marginTop: '1' })]">
              <div v-for="m in members" :key="m.id" class="contrib-item" :class="contribItem">
                <span :class="contribAvatar">
                  <MpAvatar :id="`member-${m.id}`" :name="m.name" :src="m.photo" size="lg" variant-color="gray" />
                </span>
                <div class="coach-card" :class="coachCard">
                  <MpAvatar :id="`member-coach-${m.id}`" :name="m.name" :src="m.photo" size="md" variant-color="gray" />
                  <div :class="coachText">
                    <span :class="coachName">{{ m.name }}</span>
                    <span :class="coachMeta">{{ m.code }} | {{ m.title }} | {{ m.department }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Contributors</span>
            <div v-if="contributors.length" :class="[contribRow, css({ marginTop: '1' })]">
              <div v-for="c in contributors" :key="c.id" class="contrib-item" :class="contribItem">
                <span :class="contribAvatar">
                  <MpAvatar :id="`contributor-${c.id}`" :name="c.name" :src="c.photo" size="lg" variant-color="gray" />
                </span>
                <div class="coach-card" :class="coachCard">
                  <MpAvatar :id="`contrib-coach-${c.id}`" :name="c.name" :src="c.photo" size="md" variant-color="gray" />
                  <div :class="coachText">
                    <span :class="coachName">{{ c.name }}</span>
                    <span :class="coachMeta">{{ c.code }} | {{ c.title }} | {{ c.department }}</span>
                  </div>
                </div>
              </div>
            </div>
            <span v-else :class="emptyMuted">No contributors.</span>
          </div>
        </div>

        <!-- Card 2 — Alignment (parent goal), only when aligned -->
        <div v-if="parentGoal" :class="card">
          <div :class="cardHeadRow">
            <MpText :class="sectionH3">Alignment</MpText>
            <MpPopover is-close-on-select use-portal placement="bottom-end">
              <MpPopoverTrigger>
                <button type="button" :class="iconBtn" aria-label="Alignment actions"><MpIcon name="menu-kebab" size="sm" /></button>
              </MpPopoverTrigger>
              <MpPopoverContent :class="css({ minWidth: '160px' })">
                <MpPopoverList>
                  <MpPopoverListItem @click="router.push(goalHref(parentGoal.id))">View details</MpPopoverListItem>
                  <MpPopoverListItem @click="removeAlignment"><span :class="css({ color: 'text.danger' })">Remove alignment</span></MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </MpPopover>
          </div>

          <!-- Aligned to a specific key result of the parent goal -->
          <template v-if="parentKr">
            <div :class="kvRow">
              <span :class="cardLabel">Key result</span>
              <span :class="kvValue">{{ parentKr.title }}</span>
            </div>
            <div :class="kvRow">
              <span :class="cardLabel">Measurement type</span>
              <span :class="kvValue">{{ betterLabel(parentKr.kpiDirection) }}</span>
            </div>
            <div :class="kvRow">
              <span :class="cardLabel">Key result progress</span>
              <MpFlex align="center" gap="2" :class="css({ marginTop: '1' })">
                <MpText :class="progressValue">{{ krFmt(parentKr, parentKr.currentValue) }}</MpText>
                <span :class="pillClass(parentKr.status)">{{ krPct(parentKr) }}%</span>
              </MpFlex>
              <div :class="[progressTrack, css({ marginTop: '1', maxWidth: 'none' })]">
                <div :class="[progressFill, parentKr.status === 'orange' ? fillOrange : parentKr.status === 'gray' ? fillGray : fillGreen]" :style="{ width: `${krPct(parentKr)}%` }" />
              </div>
              <div :class="[rangeRow, css({ maxWidth: 'none' })]">
                <span :class="rangeMin">{{ krFmt(parentKr, parentKr.startValue) }}</span>
                <span :class="rangeMax">{{ krFmt(parentKr, parentKr.targetValue) }}</span>
              </div>
            </div>
            <div :class="alignDivider" />
          </template>

          <div :class="alignHeadGroup">
            <span :class="badgePill">{{ parentLevelLabel }}</span>

            <div :class="alignTitleRow">
              <div :class="alignTitleCol">
                <span :class="alignGoalName" @click="router.push(goalHref(parentGoal.id))">{{ parentGoal.title }}</span>
                <div :class="dateRow">
                  <MpIcon name="calendar" size="sm" />
                  <span>{{ parentDateRange }}</span>
                </div>
              </div>
              <div v-if="parentOwner" class="contrib-item" :class="contribItem">
                <span :class="contribAvatar">
                  <MpAvatar :id="`parent-owner-${parentOwner.id}`" :name="parentOwner.name" :src="parentOwner.photo" size="lg" variant-color="gray" />
                </span>
                <div class="coach-card" :class="coachCardEnd">
                  <MpAvatar :id="`parent-owner-coach-${parentOwner.id}`" :name="parentOwner.name" :src="parentOwner.photo" size="md" variant-color="gray" />
                  <div :class="coachText">
                    <span :class="coachName">{{ parentOwner.name }}</span>
                    <span :class="coachMeta">{{ parentOwner.code }} | {{ parentOwner.title }} | {{ parentOwner.department }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Measurement type</span>
            <span :class="kvValue">{{ betterLabel(parentGoal.direction) }}</span>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Goal category</span>
            <span :class="kvValue">{{ parentGoal.category }}</span>
          </div>

          <div :class="kvRow">
            <span :class="cardLabel">Goal sub-category</span>
            <span :class="kvValue">{{ parentGoal.subCategory }}</span>
          </div>

          <div v-if="parentGoal.unit && parentGoal.unit !== 'deadline'" :class="kvRow">
            <span :class="cardLabel">Goal progress</span>
            <MpFlex align="center" gap="2" :class="css({ marginTop: '1' })">
              <MpText :class="progressValue">{{ formatValue(parentGoal.unit, parentGoal.value) }}</MpText>
              <MpBadge for="tableStatus" :type="statusBadgeType(parentGoal.status)" size="sm">{{ parentGoal.pill ?? 0 }}%</MpBadge>
            </MpFlex>
            <div :class="[progressTrack, css({ marginTop: '1', maxWidth: 'none' })]">
              <div :class="[progressFill, parentGoal.status === 'green' ? fillGreen : parentGoal.status === 'orange' ? fillOrange : fillGray]" :style="{ width: `${Math.min(parentGoal.pill ?? 0, 100)}%` }" />
            </div>
            <div :class="[rangeRow, css({ maxWidth: 'none' })]">
              <span :class="rangeMin">{{ formatValue(parentGoal.unit, parentGoal.min ?? 0) }}</span>
              <span :class="rangeMax">{{ formatValue(parentGoal.unit, parentGoal.max) }}</span>
            </div>
          </div>
        </div>

        <!-- Goal last-updated — pinned to the bottom of the rail, opens the log -->
        <a :class="lastUpdatedLink" @click.prevent="isActivityLogOpen = true">Last updated by {{ owner?.name }}<template v-if="goal.updatedAt"> on {{ goal.updatedAt }}</template></a>
      </aside>
    </div>
  </div>

  <div v-else :class="css({ padding: '20', textAlign: 'center', color: 'text.secondary' })">
    Goal not found.
  </div>

  <!-- ═════ Update progress (shared drawer component) ═════ -->
  <UpdateProgressDrawer :is-open="isUpdateOpen" :goal="goal" @close="isUpdateOpen = false" />

  <!-- Activity log (history) drawer -->
  <GoalActivityLogDrawer :is-open="isActivityLogOpen" :goal="goal" @close="isActivityLogOpen = false" />

  <!-- Close goal confirmation (prod copy; non-destructive primary button) -->
  <ClientOnly>
    <MpModal :is-open="isCloseModalOpen" size="sm" @close="isCloseModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Close goal?
          <MpModalCloseButton @click="isCloseModalOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="valueText">Once a goal has closed, {{ goalToClose?.title }} can no longer submit progress or be edited.<template v-if="needsApproval(goalToClose?.ownerId)"> This close will be sent to the manager for approval before it takes effect.</template></MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isCloseModalOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmCloseGoal">Yes, close goal</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- ═════ Key result drawer (shared measurement form) ═════ -->
  <AddKeyResultDrawer v-model:is-open="isKrDrawerOpen" :editing="editingKr" @save="onKrSave" />

  <!-- Key result delete confirmation -->
  <ClientOnly>
    <MpModal :is-open="isKrDeleteOpen" @close="isKrDeleteOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Delete key result
          <MpModalCloseButton @click="isKrDeleteOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="valueText"><strong>{{ krToDelete?.title }}</strong> will be permanently deleted.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isKrDeleteOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDeleteKr">Delete</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Remove alignment confirmation -->
  <ClientOnly>
    <MpModal :is-open="isRemoveAlignOpen" @close="isRemoveAlignOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Remove alignment?
          <MpModalCloseButton @click="isRemoveAlignOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="valueText">This goal will be detached from <strong>{{ parentGoal?.title }}</strong>. Removing the alignment can affect progress roll-up.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isRemoveAlignOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmRemoveAlignment">Remove alignment</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>

  <!-- Edit goal (shared drawer) -->
  <AddGoalDrawer
    drawer-id="drawer-edit-goal-detail"
    v-model:is-open="isEditDrawerOpen"
    :owners="editingOwners"
    :already-used-weight="alreadyUsedWeightForEdit"
    :cycle-start-date="cycle?.startDate ?? ''"
    :cycle-id="cycle?.id"
    :cycle-end-date="cycle?.endDate ?? ''"
    :editing-draft="editingDraft"
    @save="saveEdit"
  />

  <!-- Delete goal confirmation (shared flow) -->
  <ClientOnly>
    <MpModal :is-open="isDeleteModalOpen" @close="isDeleteModalOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Delete goal?
          <MpModalCloseButton @click="isDeleteModalOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText :class="valueText">
            <strong>{{ goalToDelete?.title }}</strong> will be permanently deleted and cannot be recovered.<template v-if="needsApproval(goalToDelete?.ownerId)"> This delete will be sent to the manager for approval before it takes effect.</template>
          </MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isDeleteModalOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDeleteGoal">Delete</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule (not a
   Panda css() @layer utility) so it beats PxColumnSortMenu's unlayered scoped
   `visibility: hidden` on specificity — see goal-cycles/index.vue. */
.gd-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }

/* NOTE: the bordered-table outer border + last-row rule live in
   assets/css/main.css as GLOBAL rules (see the note there) — a scoped rule
   can't reliably reach MpTableContainer's root on SSR. */

/* Contributor hover coachmark — unlayered so it beats Panda's @layer utilities.
   Card is hidden until the avatar is hovered; the hovered item lifts above its
   overlapping neighbours. */
.contrib-item .coach-card {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.12s ease, transform 0.12s ease, visibility 0.12s;
}
.contrib-item:hover {
  z-index: 20;
}
.contrib-item:hover .coach-card {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
</style>
