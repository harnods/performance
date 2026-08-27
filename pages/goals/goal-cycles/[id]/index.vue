<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal cycle details / All goals
  Token mode: Pixel 2.4

  Reads every goal (all levels, all owners) from the goals mini-DB
  (useGoalsStore) — the one table on this scoped page that spans many
  different owners at once, so Owner is a normal per-row sticky-left column
  rather than the single rowspan header used on the scoped pages.
  "My goals" / "My direct reports" filter the same table down via
  goalsView, using the store's myGoals / myDirectReportsGoals.

  Selecting "Company goals" from the tab dropdown navigates to the sibling
  ./company-goals page (different table shape — see that file's header).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpAvatar,
  MpIcon,
  MpTooltip,
  MpSelect,
  MpInputGroup,
  MpInputLeftAddon,
  MpInput,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpCheckbox,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  MpTextlink,
  MpBadge,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalCloseButton,
  MpModalBody,
  MpModalFooter,
  MpButtonGroup,
  MpBanner,
  MpBannerIcon,
  MpBannerTitle,
  MpBannerDescription,
  toast,
  css,
} from '@mekari/pixel3'
import { computeRepeatPeriods } from '~/utils/goalSchedule'
import { EMPLOYEES } from '~/utils/employees'
import { MANUAL_CREATE_OWNER_LIMIT } from '~/composables/useBulkOwnerGate'

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Goal cycles', to: '/goals/goal-cycles' },
})

const route = useRoute()
const router = useRouter()

const { pendingItemsCount, submissions, createSubmission, approveSubmission, removeSubmission } = useGoalApprovalsStore(route.params.id as string)
const { currentUserId } = useCurrentUser()
const myPendingRequestsCount = computed(() => submissions.value.filter(s => s.ownerId === currentUserId.value && s.status === 'pending').length)

// ─── Bulk-approved goal creation (background) ────────────────────────────
// When a "New goals" Save queued approval for a big group (> BULK_ASYNC_
// THRESHOLD owners), approving each owner's submission kicks off their goal
// creation as a background job instead of committing synchronously (see
// useGoalApprovalsStore's approveSubmission / useGoalRequestBatchStore).
// This page is where the requestor's banner surfaces that while it's
// running — a still-creating owner's goals simply aren't in the table yet
// (see the empty-state block below), rather than appearing as placeholder
// rows mixed in with committed ones.
// Batch state lives in localStorage (client-only), so it must never differ
// between the server-rendered HTML and the client's first render pass — an
// isMounted gate keeps activeRequestBatch "empty" through hydration.
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const { activeBatchFor, createBatch, removeBatch } = useGoalRequestBatchStore()
const activeRequestBatch = computed(() => (isMounted.value ? activeBatchFor(route.params.id as string, currentUserId.value) : undefined))
function refreshPage() {
  location.reload()
}

// The Select and Actions columns only pin themselves (sticky + boundary
// shadow) once the table actually needs to scroll horizontally —
// otherwise they're just normal first/last columns.
const { wrapperRef, hasOverflow } = useTableHorizontalScroll()

// "New goals" entry point — pick one or more employees in the drawer, then
// continue to the bulk "New goals" page (./new) where every goal added
// applies to all of them.
const isSelectEmployeeOpen = ref(false)

function openSelectEmployee() {
  isSelectEmployeeOpen.value = true
}
const { importSuggestionOpen, pendingEmployeeIds, continueToNewGoals, goToImport } = useBulkOwnerGate(() => route.params.id as string)
function cancelBulkOwnerModal() {
  importSuggestionOpen.value = false
  isSelectEmployeeOpen.value = true
}

type Tab = 'all' | 'closed' | 'requests' | 'awaiting' | 'info'
// Deep-linkable via ?tab= so other surfaces can land on a specific tab.
// Unknown/absent values fall back to All goals; permission-gated tabs are still
// policed by the watcher below.
const TABS: Tab[] = ['all', 'closed', 'requests', 'awaiting', 'info']
const activeTab = ref<Tab>(
  TABS.includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'all',
)

// Switching "View as" persona can make the active tab invisible (e.g. an
// admin on "Awaiting approval" switches to a non-admin persona) — fall back
// to "All goals" rather than leaving stale, no-longer-permitted content on screen.
watch(currentUserId, () => {
  if (activeTab.value === 'awaiting' && !isSuperAdmin(currentUserId.value)) activeTab.value = 'all'
  if (activeTab.value === 'requests' && !hasManager(currentUserId.value)) activeTab.value = 'all'
})

// "All goals" tab dropdown — switches which scope of goals the table shows.
// Only "company" has a distinct Figma table design so far — it navigates to
// the sibling ./company-goals page. The rest just relabel this same table.
const goalsViewOptions = [
  { key: 'all', label: 'All goals' },
  { key: 'my', label: 'My goals' },
  { key: 'direct-reports', label: 'My direct reports' },
  { key: 'company', label: 'Company goals' },
  { key: 'organization', label: 'Organization goals' },
  { key: 'team', label: 'Team goals' },
  { key: 'individual', label: 'Individual goals' },
] as const
type GoalsViewKey = typeof goalsViewOptions[number]['key']
const goalsView = ref<GoalsViewKey>('all')
const goalsViewLabel = computed(() => goalsViewOptions.find(o => o.key === goalsView.value)?.label ?? 'All goals')
// "My goals" is always a single owner (the current user) — so no per-owner
// accordion, no owner-level pagination, and no All-filters (owner) drawer.
const singleOwnerView = computed(() => goalsView.value === 'my')

const scopedRoutes: Partial<Record<GoalsViewKey, string>> = {
  company: 'company-goals',
  organization: 'organization-goals',
  team: 'team-goals',
  individual: 'individual-goals',
}

function selectGoalsView(key: GoalsViewKey) {
  const slug = scopedRoutes[key]
  if (slug) {
    router.push({ path: `/goals/goal-cycles/${route.params.id}/${slug}`, query: route.query })
    return
  }
  goalsView.value = key
  activeTab.value = 'all'
}

// Column visibility — Goal owner is locked (always on, shown disabled in the
// popover for clarity); the rest are toggleable. "Goal ID" and "Aligned goals"
// toggle sub-parts of the Goal cell rather than being their own column.
const columnOptions = [
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub-category' },
  { key: 'goal', label: 'Goal name' },
  { key: 'goalId', label: 'Goal ID' },
  { key: 'alignedGoals', label: 'Aligned goals' },
  { key: 'goalType', label: 'Goal type' },
  { key: 'progress', label: 'Progress' },
  { key: 'status', label: 'Status' },
  { key: 'lastUpdated', label: 'Last updated' },
] as const
type ColumnKey = typeof columnOptions[number]['key']
const visibleColumns = reactive<Record<ColumnKey, boolean>>({
  category: true,
  subCategory: true,
  goal: true,
  goalId: true,
  alignedGoals: true,
  goalType: true,
  progress: true,
  status: true,
  lastUpdated: false, // hidden by default
})
// Goal name is the anchor column — always on, shown disabled (can't uncheck).
const toggleableColumns = computed(() => columnOptions.filter(c => c.key !== 'goal'))

// Pre-applied from ?status= so the Goals dashboard's summary cards can land here
// already filtered to the status that was clicked. Unknown values are ignored
// rather than silently filtering everything out.
const STATUS_FILTER_KEYS = ['ontrack', 'atrisk', 'notstarted']
const statusFilter = ref(
  STATUS_FILTER_KEYS.includes(route.query.status as string) ? (route.query.status as string) : '',
)
const search = ref('')

// "All filters" drawer — owner-attribute filters (branch/org/job position/level/
// employment status), draft-then-apply. Count shown on the button.
const allFiltersOpen = ref(false)
const appliedFilters = ref<Record<string, string[]>>({})
const appliedScopes = ref<string[]>([])
const activeFilterCount = computed(() => allFiltersCount(appliedFilters.value))
function onApplyAllFilters(p: { filters: Record<string, string[]>, scopes: string[] }) {
  // The drawer's own Status scope supersedes the standalone quick-filter —
  // reset it so the two never show conflicting/redundant state.
  statusFilter.value = ''
  appliedFilters.value = p.filters
  appliedScopes.value = p.scopes
}

// ─── Live data — read from the goals mini-DB (useGoalsStore). Unlike the
// scoped Company/Organization/Team/Individual pages, this table spans many
// different owners at once, so there's no single rowspan-able owner column
// — Category/Sub-category are shown per-row (no merge) and Owner is a
// normal sticky-left column instead of one giant rowspan header. ─────────
type GoalStatus = 'green' | 'orange' | 'gray'
const GOAL_TYPE_LABEL: Record<string, string> = {
  company: 'Company goal',
  organization: 'Organization goal',
  team: 'Team goal',
  individual: 'Individual goal',
}

const { goals, myGoals, myDirectReportsGoals, updateGoal, deleteGoal } = useGoalsStore(route.params.id as string)
const { cycles } = useGoalCyclesStore()
const cycle = computed(() => cycles.value.find(c => c.id === route.params.id))

// Someone whose committed goals already total 100% has no weight left to
// give a new one — keep them out of the "New goals" picker entirely rather
// than letting them through only to hit the "must equal 100%" block at Save.
// Only matters when this cycle actually enforces the weight rule.
const fullOwnerIds = computed(() => (cycle.value?.weightMandatory ? fullyWeightedOwnerIds(goals.value) : new Set<string>()))

// Each owner's committed (non-draft) goal-weight total — the source both
// the mismatch check and the header's visible percentage read from. Only
// owners with at least one committed goal get an entry: someone who hasn't
// committed anything yet reads as "not started", not "0% — wrong", so they're
// left out of the mismatch set below rather than flagged.
const ownerWeightTotals = computed(() => {
  const sums = new Map<string, number>()
  if (!cycle.value?.weightMandatory) return sums
  for (const g of goals.value) {
    if (g.isDraft) continue
    sums.set(g.ownerId, (sums.get(g.ownerId) ?? 0) + g.weight)
  }
  return sums
})
// Owners whose committed goal weights don't total exactly 100% — over OR
// under, an invalid state a weight-mandatory cycle should never reach —
// surfaced as a warning on the owner's accordion header. Gated on
// weightMandatory like fullOwnerIds.
const weightMismatchOwnerIds = computed(() =>
  new Set([...ownerWeightTotals.value].filter(([, w]) => w !== 100).map(([id]) => id)),
)

const { isEditDrawerOpen, editingDraft, editingOwners, alreadyUsedWeightForEdit, openEditGoal, saveEdit } = useGoalEditor()
function editRow(row: { id: string }) {
  const g = goals.value.find(x => x.id === row.id)
  if (g) openEditGoal(g)
}
const { isDeleteModalOpen, goalToDelete, askDeleteGoal, confirmDeleteGoal } = useGoalDeleter()
function deleteRow(row: { id: string }) {
  const g = goals.value.find(x => x.id === row.id)
  if (g) askDeleteGoal(g)
}
const { isCloseModalOpen, goalToClose, askCloseGoal, confirmCloseGoal } = useGoalCloser()
function closeRow(row: { id: string }) {
  const g = goals.value.find(x => x.id === row.id)
  if (g) askCloseGoal(g)
}
// A draft isn't live yet, so per-row "Submit for approval" no longer exists
// on the kebab — its only forward move is the owner-group "Publish N goals"
// textlink (in the accordion header), which submits every one of the owner's
// unsubmitted drafts in one go.
const { publishDrafts } = useGoalDraftSubmitter()
function ownerDraftGoals(ownerId: string) {
  return goals.value.filter(g => g.ownerId === ownerId && g.isDraft && !g.isAwaitingApproval)
}
function publishOwnerDrafts(ownerId: string) {
  publishDrafts(ownerDraftGoals(ownerId))
}

// Align goal — any non-company goal can align (company is top, so no align).
// The exact allowed parent level(s) per goal level + member gating live in
// GoalAlignDrawer (individual → team/org; team → org; org → org/company).
const alignModalOpen = ref(false)
const aligningGoal = ref<(typeof goals.value)[number] | null>(null)
function openAlign(row: { id: string }) {
  aligningGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (aligningGoal.value) alignModalOpen.value = true
}
function onAligned(parentId: string, krId?: string) {
  if (!aligningGoal.value) return
  updateGoal(aligningGoal.value.id, { alignedToId: parentId, alignedToKrId: krId })
  useGoalActivityStore().logActivity(aligningGoal.value.id, { type: "event", wording: "aligned this goal to a parent goal." })
  toast.notify({ id: 'goal-aligned', position: 'top-center', variant: 'success', title: 'Goal aligned' })
}

// Update progress — opens the shared drawer in place (no navigation to detail).
const isUpdateProgressOpen = ref(false)
const updatingGoal = ref<(typeof goals.value)[number] | null>(null)
function openUpdateProgress(row: { id: string }) {
  updatingGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (updatingGoal.value) isUpdateProgressOpen.value = true
}

// Activity log — opens the history drawer for a goal.
const isActivityLogOpen = ref(false)
const activityGoal = ref<(typeof goals.value)[number] | null>(null)
function openActivityLog(row: { id: string }) {
  activityGoal.value = goals.value.find(x => x.id === row.id) ?? null
  if (activityGoal.value) isActivityLogOpen.value = true
}

// `notstarted` exists so the Goals dashboard's "Not started" summary card can
// deep-link here with its own status pre-applied (?status=notstarted) — every
// card must land on a filter that actually exists.
const STATUS_FILTER_TO_GOAL_STATUS: Record<string, GoalStatus> = { ontrack: 'green', atrisk: 'orange', notstarted: 'gray' }

// Unfiltered count — drives the Closed tab's empty state (true "no closed
// goals in this cycle" vs. filters/search just narrowing the current tab
// down to zero, which the table shell handles on its own, same as All goals).
// restore as closedGoalsTotal directly when the scenario control below is removed.
const _productClosedGoalsTotal = computed(() => goals.value.filter(g => g.isClosed).length)
// Dev-preview only (see dev-scenario-control.md) — forces the Closed tab's
// empty state even when the cycle actually has closed goals, so the empty
// state can be previewed without deleting seed data. Default (off) shows the
// real closed goals.
const closedEmptyScenarioActive = ref(false)
const currentClosedScenario = computed(() => (closedEmptyScenarioActive.value ? 'empty' : 'default'))
function activateClosedEmptyScenario() { closedEmptyScenarioActive.value = true }
function deactivateClosedScenario() { closedEmptyScenarioActive.value = false }
const closedGoalsTotal = computed(() => (closedEmptyScenarioActive.value ? 0 : _productClosedGoalsTotal.value))

const sourceGoals = computed(() => {
  const base = goalsView.value === 'my'
    ? myGoals.value
    : goalsView.value === 'direct-reports' ? myDirectReportsGoals.value : goals.value
  // "Closed" tab narrows to closed goals only, on top of whatever scope the
  // (still-visible) All-goals dropdown last had selected.
  const scoped = activeTab.value === 'closed'
    ? (closedEmptyScenarioActive.value ? [] : base.filter(g => g.isClosed))
    : base
  return scoped.filter(g => (!statusFilter.value || g.status === STATUS_FILTER_TO_GOAL_STATUS[statusFilter.value]) && matchesSearch(g, search.value) && goalMatchesAllFilters(g, appliedFilters.value))
})

// ─── Column sort (sorts WITHIN each owner rowspan group; owner is the only
// merged column here, so a non-owner key reorders rows inside each owner
// block and owner reorders the blocks). sortKey '' = default owner-name order.
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
const columnSortTypes: Record<string, 'text' | 'number' | 'date'> = {
  owner: 'text', category: 'text', subCategory: 'text', goal: 'text', goalType: 'text', progress: 'number', status: 'text',
}
function goalSortValue(r: { owner: { name: string }, category: string, subCategory: string, title: string, goalType: string, pill?: number, status: GoalStatus }, key: string): string | number {
  switch (key) {
    case 'owner': return r.owner.name
    case 'category': return r.category
    case 'subCategory': return r.subCategory
    case 'goal': return r.title
    case 'goalType': return r.goalType
    case 'progress': return r.pill ?? -1
    case 'status': return statusLabel[r.status]
    default: return ''
  }
}

const rows = computed(() => {
  const base = sortByCategory(sourceGoals.value)
    .map(g => ({ ...g, owner: ownerOf(g.ownerId), goalType: GOAL_TYPE_LABEL[g.level], alignedGoals: alignedGoalsOf(g, goals.value) }))
    .sort((a, b) => a.owner.name.localeCompare(b.owner.name))
  return sortGoalRows(base, {
    sortKey: sortKey.value,
    sortDir: sortDir.value,
    sortType: (columnSortTypes[sortKey.value] as 'text' | 'number') ?? 'text',
    sortValue: r => goalSortValue(r, sortKey.value),
    groupLevels: ['owner'],
    ownerValue: r => r.owner.name,
  })
})

// "View aligned goals" inserts a real row per aligned goal right below its
// parent — Goal/Goal type/Progress/Status each get their own row, since
// those are per-goal values. An aligned child can belong to a different
// owner than its parent, so it always gets its own Owner cell rather than
// being folded into an ancestor's merged rowspan — see visibleRows below.
const expandedAligned = reactive<Record<string, boolean>>({})
function toggleAligned(id: string) {
  expandedAligned[id] = !expandedAligned[id]
}

// ─── Repeating goals ─────────────────────────────────────────────────────────
// A repeating goal is ONE record whose period cascades across the cycle (see
// utils/goalSchedule). The row shows the period running now; the earlier
// occurrences expand into real rows right below it — each one carries its own
// progress (a period that already finished isn't stuck showing the live
// goal's current number), same as "View aligned goals" inserts real rows
// rather than an in-cell list, because each occurrence needs its own values
// in the Progress/Status columns too.
const expandedRepeat = reactive<Record<string, boolean>>({})
function toggleRepeat(id: string) {
  expandedRepeat[id] = !expandedRepeat[id]
}
// "dd Mon yyyy", shown next to the goal code so a past occurrence reads as
// "AP-01 (01 Jan 2026 - 31 Jan 2026)" rather than needing its own date column.
function repeatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function repeatDateRange(p: { startDate?: string, endDate?: string }) {
  if (!p.startDate || !p.endDate) return ''
  return `${repeatDate(p.startDate)} - ${repeatDate(p.endDate)}`
}
// Occurrences that have already finished, newest-first (matches the table's
// own newest-first default order).
function previousRepeatPeriods(row: { repeat?: boolean, startDate?: string, endDate?: string }) {
  if (!row.repeat || !row.startDate || !row.endDate || !cycle.value?.endDate) return []
  const today = new Date()
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return computeRepeatPeriods(row.startDate, row.endDate, cycle.value.endDate)
    .filter(p => p.endDate < todayISO)
    .reverse()
}
// A finished occurrence has its own achievement — it isn't the live goal's
// current number, which reflects the period running NOW. There's no backing
// history in this mock (a Goal is one record, not one per period), so this
// derives a plausible-but-stable number per period: hashed off the goal id +
// period start so it never shifts on re-render, trending up in small steps
// toward the live value the closer a period is to the present.
function periodHash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}
function periodProgress(row: { id: string, min?: number, max?: number, pill?: number }, period: { startDate: string }, indexFromOldest: number, totalPeriods: number) {
  const min = row.min ?? 0
  const max = row.max ?? 100
  // Jitter of ±6 points, deterministic per period so it never shifts on re-render.
  const jitter = (periodHash(`${row.id}|${period.startDate}`) % 13) - 6
  let pct: number
  if (totalPeriods <= 2) {
    // Too few points for a ramp to read as one — a quarterly goal with only
    // 2 finished occurrences anchors explicitly instead: the oldest lands
    // off track, the most recent lands on track, so the pair actually
    // demonstrates that progress differs per period rather than landing two
    // near-identical numbers next to each other.
    const isNewest = indexFromOldest === totalPeriods - 1
    pct = Math.max(0, Math.min(100, (isNewest ? 90 : 62) + jitter))
  }
  else {
    // 3+ occurrences: a straight-line ramp from ~35% (oldest) up to the live
    // goal's own current % (most recent finished period) — earlier
    // occurrences read as less complete without a sharp jump on the last one.
    const livePct = row.pill ?? 0
    const rampFraction = indexFromOldest / (totalPeriods - 1)
    const ramp = 35 + (livePct - 35) * rampFraction
    pct = Math.max(0, Math.min(100, Math.round(ramp + jitter)))
  }
  const value = Math.round(min + ((max - min) * pct) / 100)
  // Never 'gray' ("Not started") — a past occurrence always HAS a recorded
  // value, it just performed well or poorly, unlike the live goal which can
  // genuinely be untouched.
  const status: 'green' | 'orange' = pct >= 80 ? 'green' : 'orange'
  return { value, pill: pct, status }
}

// Progressive pagination — same pattern as
// pages/reviews/review-cycles/[id]/index.vue's "Load more" bars, but the
// PAGE_SIZE unit is OWNERS, not raw goal rows — "Load more" reveals the next
// PAGE_SIZE employees' full goal lists, never a group cut off mid-owner.
const PAGE_SIZE = 10
const visibleOwnerCount = ref(PAGE_SIZE)
const loadingMore = ref(false)
// `rows` is already sorted by owner name, so distinct owner ids appear in
// the same stable order the table renders them in.
const distinctOwnerIds = computed(() => {
  const seen = new Set<string>()
  for (const row of rows.value) seen.add(row.ownerId)
  return [...seen]
})

// Arriving from "New goals" (see new.vue's persistAndLeave) with a
// ?newOwners hint — expand the visible page far enough that whichever
// owner(s) just got a goal saved are guaranteed to be on-screen, instead of
// silently sitting behind a "Load more" the user has no reason to click.
const newOwnerIds = computed(() => {
  const raw = route.query.newOwners
  const list = Array.isArray(raw) ? raw[0] : raw
  return (list ?? '').split(',').filter(Boolean)
})
watch(distinctOwnerIds, (ids) => {
  if (!newOwnerIds.value.length) return
  const lastIndex = Math.max(...newOwnerIds.value.map(id => ids.indexOf(id)))
  if (lastIndex >= 0) visibleOwnerCount.value = Math.max(visibleOwnerCount.value, lastIndex + 1)
  router.replace({ query: { ...route.query, newOwners: undefined } })
}, { immediate: true })

// ─── Accordion-per-owner (mirrors Organization goals grouping by department) ──
// Each goal owner is its own collapsible accordion table. Two levels of
// progressive pagination: PAGE_SIZE owners at a time (some tenants have ~1000
// employees), and PER_OWNER_PAGE goals at a time inside each owner.
type FlatRow = {
  kind: 'main' | 'aligned' | 'repeat' | 'aligned-trigger', id: string, ownerId: string, owner: ReturnType<typeof ownerOf>,
  category: string, subCategory: string, categoryWeight: number, code: string, title: string,
  weight: number, goalType: string, level?: string, alignedGoals: ReturnType<typeof alignedGoalsOf>,
  status: (typeof rows.value)[number]['status'], unit?: (typeof rows.value)[number]['unit'],
  value?: number, pill?: number, min?: number, max?: number, isDraft?: boolean, isAwaitingApproval?: boolean,
  repeat?: boolean, startDate?: string, endDate?: string,
  // Set on 'repeat' rows only — the main row id they're occurrences of, so
  // consecutive repeat rows for the SAME goal can merge their Category/
  // Sub-category/Goal type cells (they're all identical — same goal, just a
  // different finished period) the same way two 'main' rows sharing a
  // category merge theirs.
  parentGoalId?: string
}

// owner id → that owner's main goal rows (in the already-sorted `rows` order).
const ownerGoals = computed(() => {
  const m = new Map<string, typeof rows.value>()
  for (const r of rows.value) {
    const arr = m.get(r.ownerId)
    if (arr) arr.push(r)
    else m.set(r.ownerId, [r])
  }
  return m
})

// ─── Dev scenario control — Default vs Async ─────────────────────────────
// Lets you preview the requestor's banner + pending-row skeleton merge
// without manually running a real >10-owner batch through Select employees
// → New goals → Approve. Runs through the ACTUAL production code path
// (createSubmission + approveSubmission with a batch sized past
// BULK_ASYNC_THRESHOLD), so what you see is exactly what a real bulk
// approval looks like — this only fabricates the batch size and the one
// preview goal, not a separate fake rendering path.
//
// Targets an employee who owns NO goals in this cycle yet, not an existing
// owner — every seeded owner already sits at or over their 100% weight
// budget, so adding a goal to one of them would push them over. A new
// owner starts at 0%, so their one preview goal can carry a normal weight,
// and it also exercises the "owner with only pending goals still gets
// their own accordion group" case (see distinctOwnerIds/ownerGoals above).
const scenarioOwnerId = computed(() => EMPLOYEES.find(e => !distinctOwnerIds.value.includes(e.id))?.id)
// Rest of the batch (11 more) — same "owns no goal yet" pool as
// scenarioOwnerId, so the banner's employee count is backed by real people
// throughout, not placeholder ids that don't exist in EMPLOYEES.
const scenarioBatchOwnerIds = computed(() => (
  EMPLOYEES
    .filter(e => !distinctOwnerIds.value.includes(e.id) && e.id !== scenarioOwnerId.value)
    .slice(0, 11)
    .map(e => e.id)
))
// The preview goal is findable by its id prefix regardless of whether its
// background job is still running or already finished — the simulated
// delay is 3-5s, so by the time anyone actually looks the job may or may
// not have committed yet. "Async" means "the scenario is active and
// not yet reset," not literally "a job is in flight this instant" —
// otherwise clicking Default after the job settles would silently do
// nothing and leave the preview goal behind permanently.
const scenarioGoals = computed(() => goals.value.filter(g => g.id.startsWith('dev-scenario-goal-')))
const currentScenario = computed(() => (activeRequestBatch.value || scenarioGoals.value.length ? 'async' : 'default'))
// Preview goals per owner: the primary owner (scenarioOwnerId) gets 3, split
// non-uniformly like every other seeded "create" bundle in this file, so
// their accordion group shows a realistic multi-row spread rather than a
// single 100%-weight line. The other 11 batch owners get 1 each — enough to
// prove every owner in a real bulk batch gets its own creating→created row,
// without ballooning this dev-only tool into a second seed file.
function previewGoalDefs(isPrimary: boolean) {
  return isPrimary
    ? [
        { code: 'DEV-01', title: 'Scenario preview goal', weight: 50 },
        { code: 'DEV-02', title: 'Scenario preview goal (secondary)', weight: 30 },
        { code: 'DEV-03', title: 'Scenario preview goal (tertiary)', weight: 20 },
      ]
    : [{ code: 'DEV-01', title: 'Scenario preview goal', weight: 100 }]
}
function activateAsyncScenario() {
  if (currentScenario.value === 'async') return
  const cycleId = route.params.id as string
  const primaryOwnerId = scenarioOwnerId.value
  if (!primaryOwnerId) return
  const ownerIds = [primaryOwnerId, ...scenarioBatchOwnerIds.value]
  const batch = createBatch(cycleId, currentUserId.value, ownerIds)
  for (const ownerId of ownerIds) {
    const owner = ownerOf(ownerId)
    const sub = createSubmission(
      previewGoalDefs(ownerId === primaryOwnerId).map((g, i) => ({
        type: 'create' as const,
        ownerId,
        cycleId,
        after: {
          id: `dev-scenario-goal-${ownerId}-${Date.now()}-${i}`,
          level: 'individual',
          ownerId,
          department: owner.department,
          category: 'Financial',
          subCategory: 'Scenario Preview',
          code: g.code,
          title: g.title,
          weight: g.weight,
          contributorIds: [],
          viewerIds: [],
          status: 'gray',
          unit: 'percent',
          value: 0,
          pill: 0,
          min: 0,
          max: 100,
        },
      })),
      ownerId,
      cycleId,
      batch.id,
    )
    approveSubmission(sub.id)
  }
}
function deactivateScenario() {
  for (const goal of scenarioGoals.value) {
    const sub = submissions.value.find(s => s.items.some(i => i.after?.id === goal.id))
    if (sub) removeSubmission(sub.id)
    deleteGoal(goal.id)
  }
  const batch = activeRequestBatch.value
  if (batch) removeBatch(batch.id)
}
// Owner-level pagination: the first N owners (accordion groups). `draftCount`
// powers the "Publish N goals" bulk textlink next to the goal count — shown
// only for owners who still have unsubmitted drafts. `weightTotal` is only
// meaningful (and only read in the template) when `weightMismatch` is true.
const visibleOwners = computed(() =>
  distinctOwnerIds.value.slice(0, visibleOwnerCount.value).map((id) => {
    const g = ownerGoals.value.get(id) ?? []
    return {
      id,
      owner: ownerOf(id),
      total: g.length,
      draftCount: ownerDraftGoals(id).length,
      weightMismatch: weightMismatchOwnerIds.value.has(id),
      weightTotal: ownerWeightTotals.value.get(id) ?? 0,
    }
  }),
)

// Goal-level pagination inside each owner.
const PER_OWNER_PAGE = 10
const perOwnerVisible = reactive<Record<string, number>>({})
function goalsShown(id: string) { return perOwnerVisible[id] ?? PER_OWNER_PAGE }
function loadMoreGoals(id: string) { perOwnerVisible[id] = goalsShown(id) + PER_OWNER_PAGE }
function ownerHasMoreGoals(id: string, total: number) { return goalsShown(id) < total }

// Accordion expand state — only the first owner is expanded by default, the
// rest collapsed (mirrors Organization goals, where only the first group opens).
const expandedOwner = reactive<Record<string, boolean>>({})
function isOwnerOpen(id: string) { return expandedOwner[id] ?? (id === distinctOwnerIds.value[0]) }
function toggleOwner(id: string) { expandedOwner[id] = !isOwnerOpen(id) }

// One owner's rows for its currently-visible goal slice, with Category and
// Sub-category rowspan-merged WITHIN the owner (Owner is the accordion header,
// so there's no owner column). Aligned ("View aligned goals") rows expand
// inline and always break the merge.
function ownerRows(id: string) {
  const sliced = (ownerGoals.value.get(id) ?? []).slice(0, goalsShown(id))
  const flat: FlatRow[] = []
  for (const row of sliced) {
    flat.push({ kind: 'main', ...row })
    if (expandedRepeat[row.id]) {
      const periods = previousRepeatPeriods(row)
      const total = periods.length
      // periods is newest-first; index it from the OLDEST occurrence so the
      // ramp in periodProgress climbs toward the live value as periods get
      // more recent, then flip back to newest-first for display.
      periods.forEach((p, i) => {
        const indexFromOldest = total - 1 - i
        const prog = periodProgress(row, p, indexFromOldest, total)
        flat.push({
          kind: 'repeat', id: `${row.id}::repeat::${p.startDate}`, ownerId: row.ownerId, owner: row.owner,
          category: row.category, subCategory: row.subCategory, categoryWeight: 0, code: row.code, title: row.title,
          weight: row.weight, goalType: row.goalType, alignedGoals: [], status: prog.status,
          unit: row.unit, value: prog.value, pill: prog.pill, min: row.min, max: row.max,
          startDate: p.startDate, endDate: p.endDate, parentGoalId: row.id,
        })
      })
    }
    if (row.alignedGoals.length) {
      // The trigger only needs to become its own row when there ARE
      // past-occurrence rows above it to stay below — with nothing expanded
      // above it, it stays put as the main row's own last line (the common
      // case for every goal that only has aligned children, no repeat).
      if (expandedRepeat[row.id]) {
        flat.push({
          kind: 'aligned-trigger', id: `${row.id}::aligned-trigger`, ownerId: row.ownerId, owner: row.owner,
          category: row.category, subCategory: row.subCategory, categoryWeight: 0, code: '', title: '',
          weight: 0, goalType: '', alignedGoals: row.alignedGoals, status: 'gray', parentGoalId: row.id,
        })
      }
      if (expandedAligned[row.id]) {
        for (const ag of row.alignedGoals) {
          flat.push({
            kind: 'aligned', id: `${row.id}::${ag.id}`, ownerId: ag.ownerId, owner: ownerOf(ag.ownerId),
            category: ag.category, subCategory: ag.subCategory, categoryWeight: 0, code: ag.code, title: ag.title,
            weight: ag.weight, goalType: GOAL_TYPE_LABEL[ag.level], alignedGoals: [], status: ag.status,
            unit: ag.unit, value: ag.value, pill: ag.pill, min: ag.min, max: ag.max,
          })
        }
      }
    }
  }
  // A 'main' row's repeat children AND its "View aligned goals" trigger row
  // are all still part of that SAME goal's block — they belong in its
  // Category/Sub-category/Goal type cells rather than repeating identical
  // text, so a "unit" is 1 (the main row) + however many repeat/trigger rows
  // follow it. Only the actual expanded 'aligned' rows break continuity (own
  // cell, never merged — a genuinely different goal, possibly a different owner).
  function unitSize(startIdx: number): number {
    let n = 1
    let j = startIdx + 1
    while (j < flat.length && (flat[j].kind === 'repeat' || flat[j].kind === 'aligned-trigger') && flat[j].parentGoalId === flat[startIdx].id) { n++; j++ }
    return n
  }
  return flat.map((row, i) => {
    if (row.kind === 'aligned') return { ...row, showCategory: true, categoryRowspan: 1, showSubCategory: true, subCategoryRowspan: 1, showGoalType: true, goalTypeRowspan: 1 }
    if (row.kind === 'repeat' || row.kind === 'aligned-trigger') return { ...row, showCategory: false, categoryRowspan: 0, showSubCategory: false, subCategoryRowspan: 0, showGoalType: false, goalTypeRowspan: 0 }
    // row.kind === 'main'
    const prev = flat[i - 1]
    const newCategory = i === 0 || prev.kind !== 'main' || prev.category !== row.category
    const newSub = newCategory || prev.subCategory !== row.subCategory
    // Sibling 'main' rows sharing a category merge into one cell — but ONLY
    // when they're genuinely adjacent, nothing of their own in between. The
    // moment a row has repeat/trigger children (its own unitSize > 1), its
    // merge chain stops right there: reaching past its expanded content into
    // a FOLLOWING sibling would double-claim that sibling's Category cell —
    // the sibling's own `prev` is a repeat/trigger row (not 'main'), so it
    // independently starts its own fresh cell right after, regardless of
    // what an earlier row's rowspan claims. Two conflicting rowspans over the
    // same physical row silently breaks column alignment for the rest of the
    // table (the browser has no way to reconcile it) — this is exactly why
    // repeat rows must be excluded from the *sibling* merge, even though
    // they still each get folded into their OWN parent's cell via unitSize().
    function mergeSpan(matches: (r: FlatRow) => boolean): number {
      let span = 0
      let j = i
      while (j < flat.length && flat[j].kind === 'main' && matches(flat[j])) {
        const size = unitSize(j)
        span += size
        j += size
        if (size > 1) break
      }
      return span
    }
    let categoryWeight = row.categoryWeight
    if (newCategory) {
      categoryWeight = 0
      let j = i
      while (j < flat.length && flat[j].kind === 'main' && flat[j].category === row.category) {
        const size = unitSize(j)
        categoryWeight += flat[j].weight || 0
        j += size
        if (size > 1) break
      }
    }
    const categoryRowspan = newCategory ? mergeSpan(r => r.category === row.category) : 0
    const subCategoryRowspan = newSub ? mergeSpan(r => r.category === row.category && r.subCategory === row.subCategory) : 0
    return {
      ...row,
      showCategory: newCategory,
      categoryRowspan,
      categoryWeight,
      showSubCategory: newSub,
      subCategoryRowspan,
      // Goal type merges ONLY with this row's own repeat children (not with
      // sibling 'main' rows sharing a category — that was never a pattern
      // for this column, unlike Category/Sub-category above).
      showGoalType: true, goalTypeRowspan: unitSize(i),
    }
  })
}
const hasMore = computed(() => visibleOwnerCount.value < distinctOwnerIds.value.length)
function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  setTimeout(() => {
    visibleOwnerCount.value += PAGE_SIZE
    loadingMore.value = false
  }, 800)
}
watch(goalsView, () => {
  visibleOwnerCount.value = PAGE_SIZE
  for (const k of Object.keys(perOwnerVisible)) delete perOwnerVisible[k]
  for (const k of Object.keys(expandedOwner)) delete expandedOwner[k]
})

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

// Clicking a goal name (or Actions → View details) opens its detail page.
// Aligned child rows carry a composite `parent::child` id — the real goal id
// is the child half. A repeat row carries `goalId::repeat::startDate` — it's
// a past period of the SAME goal, so the real id is the first half.
// cycleName rides along for the detail breadcrumb.
function goToGoal(row: { kind: string, id: string }) {
  const id = row.kind === 'aligned' ? row.id.split('::')[1] : row.kind === 'repeat' ? row.id.split('::')[0] : row.id
  router.push({ path: `/goals/goal-cycles/${route.params.id}/goals/${id}`, query: { cycleName: cycle.value?.name } })
}
const goalNameLink = css({ display: 'inline', color: 'text.link', cursor: 'pointer', textAlign: 'left', minWidth: '0', whiteSpace: 'normal', overflowWrap: 'break-word', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
// Publish-drafts textlink in the accordion header — a <span> with @click.stop,
// not MpTextlink, because the header itself is a <button> (see
// organization-goals.vue's collapseAllBtn for the same nested-interactive
// constraint — a real link/button can't nest inside another button).
const publishDraftsLink = css({ display: 'inline-flex', color: 'text.link', cursor: 'pointer', fontSize: '12px', lineHeight: '16px', textDecoration: 'none', _hover: { textDecoration: 'underline' } })
// The owner's actual total weight next to the warning triangle — a bare
// tooltip+icon only tells you *that* something's wrong, not whether this
// owner is over or under 100%, so the number itself has to be on-screen.
const weightMismatchText = css({ fontSize: '12px', fontWeight: '600', lineHeight: '16px', color: 'var(--mp-icon-warning, #BC560D)', fontVariantNumeric: 'tabular-nums' })
function weightMismatchLabel(total: number) {
  return `Goal weight totals ${total}%, not 100%. This cycle requires each employee's weights to total 100% — change goal weights via Import goals.`
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const tabBar = css({ display: 'flex', gap: '5', width: '100%' })
const tabItemBase = {
  display: 'inline-flex', alignItems: 'center', gap: '2',
  paddingBlock: '3', paddingInline: '1',
  fontSize: '14px', lineHeight: '20px', fontWeight: '400',
  color: 'text.secondary', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent',
  marginBottom: '-1px', transition: 'color 0.12s ease, border-color 0.12s ease',
} as const
const tabItem = css({ ...tabItemBase, _hover: { color: 'text.default' } })
const tabItemActive = css({ ...tabItemBase, color: 'text.link', fontWeight: '600', borderBottomColor: 'border.brand' })

const statusFieldClass = css({ width: '160px', cursor: 'pointer', '& select': { pointerEvents: 'none' } })

// Rowspan-merged columns (Category/Sub-category) need a right border on every
// column so the grid stays readable — a merged cell leaves no natural row
// divider to lean on. Applied to all columns except the last (Actions), whose
// outer edge stays borderless — one border per boundary, no doubling.
const colDivider = css({ borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const tableOuterBorder = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
// Dev scenario control FAB — fixed bottom-right, 24px margin, above everything.
const scenarioFab = css({ position: 'fixed', right: '24px', bottom: '24px', zIndex: '100' })
const scenarioFabButton = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '48px', height: '48px', borderRadius: 'full',
  background: 'background.inverse',
  border: 'none', cursor: 'pointer', boxShadow: 'lg',
  _hover: { opacity: '0.9' },
  _focusVisible: { boxShadow: '0 0 0 3px var(--mp-colors-border-brand)' },
})
// MpIcon reads color from its own `color` prop, not a CSS class or an
// inherited parent `color` — pass color="icon.inverse" directly on it.
// Accordion group per goal owner (mirrors Organization goals).
const accordionGroup = css({ borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.bold', borderRadius: '6px', overflow: 'hidden' })
const accordionHeader = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2', minHeight: '44px', paddingInline: '3', paddingBlock: '2', background: 'gray.50', cursor: 'pointer', border: 'none', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default', width: '100%', textAlign: 'left' })
const accordionLeft = css({ display: 'flex', alignItems: 'center', gap: '2', minWidth: '0' })
const loadMoreBar = css({ display: 'flex', alignItems: 'center', gap: '1', paddingX: '4', paddingY: '3', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'border.default' })
// Sticky first/last column (Select / Actions). `is-fixed` alone only
// tags the cell (data-table-cell-fixed) — the actual position:sticky/z-index/
// background need setting explicitly, otherwise the column doesn't visually
// separate from scrolling siblings until motion happens to reveal it. The
// boundary itself is a plain 1px border like every other column divider —
// on a wide screen the table isn't actually scrolled, so it shouldn't look
// any heavier than colDivider just because the column happens to be sticky.
const fixedLeftCol = css({ position: 'sticky', left: '0', zIndex: '1', boxShadow: 'inset -1px 0px var(--mp-colors-border-default)', paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })
const fixedRightCol = css({ position: 'sticky', right: '0', zIndex: '1', boxShadow: 'inset 1px 0px var(--mp-colors-border-default)' })
const fixedBodyBg = css({ background: 'white' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

// Fixed table layout so every column keeps a stable width regardless of which
// optional columns are toggled on/off via Column settings. Goal is
// intentionally the one column with no fixed width — it absorbs all
// remaining space, pushing the 52px action column flush against the right
// edge instead of it stretching along with everything else.
const fixedTable = css({ tableLayout: 'fixed', width: '100%', minWidth: '1448px' })
const colOwner = css({ width: '184px' })
const colCategory = css({ width: '160px' })
const colSubCategory = css({ width: '184px' })
const colGoalType = css({ width: '160px' })
const colProgress = css({ width: '224px' })
const colStatus = css({ width: '136px' })
const colLastUpdated = css({ width: '200px' })
// Action column is a hard 52px: 36px icon button + 8px padding each side.
const actionHead = css({ width: '52px', paddingLeft: '2', paddingRight: '2', paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap', verticalAlign: 'top' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', paddingLeft: '2', paddingRight: '2', width: '52px', whiteSpace: 'nowrap', verticalAlign: 'top' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })

// Header label + column-sort menu inline (mirrors goal-cycles/index.vue's thInner).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const ownerCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'top' })

// Flex children default to min-width:auto, so long unbroken text refuses to
// shrink below its own intrinsic width and bleeds out of the cell —
// min-width:0 lets the flex box shrink, break-word lets long text wrap.
// Applied to every cell's content wrapper, not just Goal.
const cellContent = css({ minWidth: '0', width: '100%', whiteSpace: 'normal', overflowWrap: 'break-word' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const alignedLink = css({
  display: 'inline-flex', alignItems: 'center', gap: '1', marginTop: '1',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer',
  color: 'text.default', fontSize: '14px', lineHeight: '20px',
})
// A real inserted row for one aligned child goal (or a repeating goal's past
// occurrence) — no background tint (stays white), just a blue left border on
// the Goal cell to mark it as a child row. Same treatment for both: they're
// both "extra rows expanded from the one above them."
const alignedGoalCell = css({ borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: 'border.brand' })
// Indent = the "View aligned goals" / repeat-caret icon (size sm = 1.25rem) +
// its gap (spacing.1 = 0.25rem) — lines the child row's code/title/weight up
// with that button's text, not its icon. Shared by both child-row kinds.
const alignedGoalIndent = css({ paddingLeft: '1.5rem' })
// The repeat caret sits inline with the goal name itself (not a separate
// "View previous goals" line below) — same reset-button treatment as
// alignedLink, just icon-only and no marginTop since it's on the name's line.
const repeatCaretBtn = css({
  display: 'inline-flex', alignItems: 'center', flexShrink: '0',
  background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', color: 'text.secondary',
})

const progressCellWidth = css({ width: '100%' })
const progressTrack = css({ width: '100%', height: '6px', borderRadius: 'full', background: 'gray.50', overflow: 'hidden' })
const progressFill = css({ height: '100%', borderRadius: 'full' })
const fillGreen = css({ background: 'teal.400' })
const fillOrange = css({ background: 'rose.400' })
// Not started (but has progress) — dark gray, mirroring prod's progressColor
// ('gray' → gray.400). Distinct from the light gray.50 track.
const fillGray = css({ background: 'gray.400' })

const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1', paddingBlock: '0.5', fontSize: '10px', lineHeight: '12px', fontWeight: '600' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })
const pillRose = css({ ...pillBase, background: 'red.50', color: 'red.700' })
const pillGray = css({ ...pillBase, background: 'gray.100', color: 'gray.600' })
// Achievement badge colour follows status — never green on an off-track row.
function pillClass(s: GoalStatus) { return s === 'orange' ? pillRose : s === 'gray' ? pillGray : pillGreen }

const statusPillBase = { display: 'inline-flex', alignItems: 'center', borderRadius: 'full', paddingInline: '1.5', fontSize: '14px', lineHeight: '20px' } as const
const statusPillGreen = css({ ...statusPillBase, background: 'green.50', color: 'green.700' })
const statusPillOrange = css({ ...statusPillBase, background: 'orange.50', color: 'orange.700' })
const statusPillGray = css({ ...statusPillBase, background: 'background.neutral.subtle', color: 'text.default' })
// "Not started" — matches the Goals dashboard's summary card wording
// (components/GoalsDashSummaryCards.vue) for the same gray status.
const statusLabel: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not started' }

const awaitingBadge = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '20px', height: '20px', paddingInline: '1.5', borderRadius: 'full',
  background: 'orange.400', color: 'white', fontSize: '14px', lineHeight: '20px',
})

// Empty state — a brand-new goal cycle has no goals at all yet, so replace
// the filter bar + table entirely (same pattern as
// pages/reviews/review-cycles/[id]/index.vue's "No review timeframe yet").
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
</script>

<template>
  <!-- Page header actions — hidden on the archive cycle: it's a frozen,
       computed container for goals migrated from the old Goals UI, so
       nothing can be imported or newly created into it. -->
  <Teleport v-if="!cycle?.isArchive" to="#page-header-actions" defer>
    <MpButton variant="secondary" @click="router.push({ path: `/goals/goal-cycles/${route.params.id}/import` })">Import goals</MpButton>
    <MpButton variant="primary" @click="openSelectEmployee">New goals</MpButton>
  </Teleport>

  <!-- Dev scenario control — floating, bottom-right of the page (not a real
       product control). Single axis of state, so a flat MpPopoverList (see
       dev-scenario-control.md) — its content depends on which tab is active,
       since the two tabs preview unrelated things:
         All goals  → Default vs Async — previews the bulk-approved-goal-
           creation banner + pending-row skeleton merge without running a
           real >10-owner batch through Select employees → New goals →
           Approve.
         Closed     → Default vs Empty — forces the Closed tab's empty state
           for preview even when the cycle already has closed goals.
       Hidden on the archive cycle for the same reason as the header actions
       above — neither scenario applies to that frozen, migrated bucket. -->
  <div v-if="!cycle?.isArchive && (activeTab === 'all' || activeTab === 'closed')" :class="scenarioFab">
    <MpPopover is-close-on-select use-portal placement="top-end">
      <MpPopoverTrigger>
        <button type="button" :class="scenarioFabButton" aria-label="Scenario control">
          <MpIcon name="sliders" size="sm" color="icon.inverse" />
        </button>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <MpPopoverList v-if="activeTab === 'all'">
          <MpPopoverListItem :is-active="currentScenario === 'default'" @click="deactivateScenario">Default</MpPopoverListItem>
          <MpPopoverListItem :is-active="currentScenario === 'async'" @click="activateAsyncScenario">Async (goals being submitted)</MpPopoverListItem>
        </MpPopoverList>
        <MpPopoverList v-else>
          <MpPopoverListItem :is-active="currentClosedScenario === 'default'" @click="deactivateClosedScenario">Default</MpPopoverListItem>
          <MpPopoverListItem :is-active="currentClosedScenario === 'empty'" @click="activateClosedEmptyScenario">Empty</MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
  </div>

  <!-- Tabs -->
  <Teleport to="#page-tabs" defer>
    <div :class="tabBar">
      <!-- On the All-goals tab the label is a dropdown (switch scope). From any
           OTHER tab it's a plain button that just returns to All goals — a
           second click (now on the tab) opens the scope dropdown. -->
      <MpPopover v-if="activeTab === 'all'" is-close-on-select use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <button type="button" :class="tabItemActive">
            {{ goalsViewLabel }}
            <MpIcon name="caret-down" size="sm" />
          </button>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem
              v-for="opt in goalsViewOptions"
              :key="opt.key"
              :is-active="opt.key === goalsView"
              @click="selectGoalsView(opt.key)"
            >
              {{ opt.label }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
      <button v-else type="button" :class="tabItem" @click="activeTab = 'all'">
        {{ goalsViewLabel }}
        <MpIcon name="caret-down" size="sm" />
      </button>
      <button type="button" :class="activeTab === 'closed' ? tabItemActive : tabItem" @click="activeTab = 'closed'">
        Closed
      </button>
      <button v-if="hasManager(currentUserId)" type="button" :class="activeTab === 'requests' ? tabItemActive : tabItem" @click="activeTab = 'requests'">
        My requests
        <span v-if="myPendingRequestsCount > 0" :class="awaitingBadge">{{ myPendingRequestsCount }}</span>
      </button>
      <button v-if="isSuperAdmin(currentUserId)" type="button" :class="activeTab === 'awaiting' ? tabItemActive : tabItem" @click="activeTab = 'awaiting'">
        Awaiting approval
        <span v-if="pendingItemsCount > 0" :class="awaitingBadge">{{ pendingItemsCount }}</span>
      </button>
      <button type="button" :class="activeTab === 'info' ? tabItemActive : tabItem" @click="activeTab = 'info'">
        Goal cycle info
      </button>
    </div>
  </Teleport>

  <MpFlex v-if="activeTab !== 'info'" direction="column" gap="6">
    <GoalMyRequestsList v-if="activeTab === 'requests'" :cycle-id="route.params.id as string" />
    <GoalApprovalQueue v-else-if="activeTab === 'awaiting'" :cycle-id="route.params.id as string" />
    <template v-else>
    <!-- Bulk-approved goal creation banner — only for the requestor of a
         still-creating batch (see activeRequestBatch above). Sits above
         BOTH the empty state and the table branch below (not nested inside
         either), so it still shows on a cycle whose only goals so far are
         the ones this very batch is creating. No close button — this is
         reporting real in-progress state, not a dismissible notice, and it
         already goes away on its own once every owner in the batch resolves. -->
    <MpBanner v-if="activeRequestBatch" variant="info">
      <MpBannerIcon name="info" />
      <MpBannerTitle>Your approved goals are being created</MpBannerTitle>
      <MpBannerDescription>
        Goals for {{ activeRequestBatch.ownerIds.length }} employees are being set up. This may take a few minutes.
        <MpTextlink as="button" @click="refreshPage">Refresh page</MpTextlink>
      </MpBannerDescription>
    </MpBanner>

    <!-- Empty state: no goals to show yet. On "All goals" — a brand-new
         cycle, or a batch's goals are still being created in the background
         (the banner above already explains that; the table itself has
         nothing of its own to show while creation is in flight, so it stays
         hidden rather than mixing placeholder rows in with committed ones).
         On "Closed" — the cycle simply has no closed goals yet; no "New
         goals" CTA here since closing happens from a goal row, not this tab. -->
    <MpFlex v-if="activeTab === 'closed' ? closedGoalsTotal === 0 : (goals.length === 0 || activeRequestBatch)" direction="column" align="center" justify="center" gap="4" :class="emptyStateWrap">
      <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
      <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
        <MpText :class="emptyTitle">{{ activeTab === 'closed' ? 'No closed goals yet' : 'No goals in this cycle yet' }}</MpText>
        <MpText size="label" :class="captionText">{{ activeTab === 'closed' ? 'Goals you close in this cycle will appear here.' : 'Goals you add to this cycle will appear here.' }}</MpText>
      </MpFlex>
      <MpButton v-if="activeTab !== 'closed' && !activeRequestBatch && !cycle?.isArchive" variant="secondary" @click="openSelectEmployee">New goals</MpButton>
    </MpFlex>

    <template v-else>
    <!-- Filter bar — always visible; the bulk-action summary replaces the
         table's own header row instead (see MpTableHead below), not this bar. -->
    <MpFlex align="center" justify="space-between" gap="4" wrap="wrap">
      <MpFlex align="center" gap="4" wrap="wrap">
        <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
          <MpPopoverTrigger>
            <MpFlex :class="statusFieldClass">
              <MpSelect v-model="statusFilter" placeholder="Status" is-clearable tabindex="-1" aria-hidden="true">
                <option value="ontrack">On track</option>
                <option value="atrisk">Off track</option>
                <option value="notstarted">{{ statusLabel.gray }}</option>
              </MpSelect>
            </MpFlex>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <MpPopoverList>
              <MpPopoverListItem :is-active="statusFilter === 'ontrack'" @click="statusFilter = 'ontrack'">On track</MpPopoverListItem>
              <MpPopoverListItem :is-active="statusFilter === 'atrisk'" @click="statusFilter = 'atrisk'">Off track</MpPopoverListItem>
              <MpPopoverListItem :is-active="statusFilter === 'notstarted'" @click="statusFilter = 'notstarted'">{{ statusLabel.gray }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
        <MpButton v-if="!singleOwnerView" variant="secondary" @click="allFiltersOpen = true">All filters<template v-if="activeFilterCount"> ({{ activeFilterCount }})</template></MpButton>
      </MpFlex>

      <MpFlex align="center" gap="2">
        <MpPopover use-portal placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="column-settings" aria-label="Column settings" title="Column settings" />
          </MpPopoverTrigger>
          <MpPopoverContent :class="css({ minWidth: '200px' })">
            <MpFlex direction="column" gap="2" :class="css({ padding: '2' })">
              <MpCheckbox id="col-goal" is-checked is-disabled>Goal name</MpCheckbox>
              <MpCheckbox v-for="col in toggleableColumns" :key="col.key" :id="`col-${col.key}`" v-model:is-checked="visibleColumns[col.key]">{{ col.label }}</MpCheckbox>
            </MpFlex>
          </MpPopoverContent>
        </MpPopover>
        <MpTooltip label="Export" placement="bottom" use-portal><MpButton variant="ghost" left-icon="upload" aria-label="Export" /></MpTooltip>
        <MpFlex :class="css({ width: '200px' })">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" />
            </MpInputLeftAddon>
            <MpInput v-model="search" placeholder="Search..." />
          </MpInputGroup>
        </MpFlex>
      </MpFlex>
    </MpFlex>

    <!-- One accordion table per goal owner (owner is the group header, so there
         is no owner column inside). Owner-level and per-owner goal pagination.
         An owner whose goals are still being created in the background (see
         activeRequestBatch above) simply has none of that batch's goals in
         this list yet — the banner explains why, rather than a placeholder
         row mixed in with committed ones.

         ClientOnly, not just isMounted, because this isn't only about pending
         rows — ALL of this table's data (useGoalsStore's `goals`) is seeded
         on the server but only loads its real persisted state client-side
         (every localStorage-backed store here guards loadFromStorage() with
         `if (import.meta.client)`). So SSR always renders a goal's Category/
         Sub-category rowspan against the bare seed, and hydration then wants
         a different rowspan the instant a real record — pending or not —
         exists in localStorage that the seed didn't have. Vue logs that as a
         hydration mismatch but does not repair the stale `rowspan` attribute,
         corrupting column alignment for every row after it (see table.md).
         Skipping SSR for this table entirely removes the mismatch instead of
         chasing each new case that triggers it. -->
    <ClientOnly>
    <div :class="tableOuterBorder">
    <div v-for="grp in visibleOwners" :key="grp.id">
      <button v-if="!singleOwnerView" type="button" :class="accordionHeader" @click="toggleOwner(grp.id)">
        <span :class="accordionLeft">
          <MpIcon :name="isOwnerOpen(grp.id) ? 'caret-down' : 'caret-right'" size="sm" />
          <PxAvatar :name="grp.owner.name" :src="grp.owner.photo" size="lg" variant-color="gray" :class="css({ flexShrink: '0' })" />
          <MpFlex direction="column" gap="0" align="start" :class="css({ minWidth: '0' })">
            <MpText size="label" weight="semiBold" :class="valueText">{{ grp.owner.name }}</MpText>
            <MpText size="label-small" :class="captionText">{{ grp.owner.id }} · {{ grp.owner.title }} · {{ grp.owner.department }}</MpText>
          </MpFlex>
        </span>
        <MpFlex align="center" gap="2" :class="css({ flexShrink: '0' })">
          <!-- Filled Pixel warning-triangle in the warning-orange token. Colour is set
               on the wrapping span (the glyph uses currentColor) because MpIcon's own
               color prop / :class don't reach it and icon.warning isn't emitted in this
               app's Panda build; var() keeps it token-driven with a hex fallback. The
               actual weight percentage sits right next to it — a tooltip alone only
               tells you *something's* wrong, not whether this owner is over or under
               100%. NOTE: the span must be MpTooltip's ONLY slot child — a comment
               node here becomes the trigger and nothing shows. -->
          <MpTooltip
            v-if="grp.weightMismatch"
            :label="weightMismatchLabel(grp.weightTotal)"
            use-portal
            placement="top"
          >
            <span :class="css({ display: 'inline-flex', alignItems: 'center', gap: '1', color: 'var(--mp-icon-warning, #BC560D)', cursor: 'help', '& svg': { color: 'var(--mp-icon-warning, #BC560D)' } })" :aria-label="`Goal weight is ${grp.weightTotal}%, not 100%`">
              <MpIcon name="warning-triangle" variant="fill" size="sm" />
              <span :class="weightMismatchText">{{ grp.weightTotal }}%</span>
            </span>
          </MpTooltip>
          <span v-if="grp.draftCount > 0" :class="publishDraftsLink" @click.stop="publishOwnerDrafts(grp.id)">
            Publish {{ grp.draftCount }} {{ grp.draftCount === 1 ? 'goal' : 'goals' }}
          </span>
          <MpText v-else size="label-small" :class="captionText">{{ grp.total }} {{ grp.total === 1 ? 'goal' : 'goals' }}</MpText>
        </MpFlex>
      </button>

      <template v-if="singleOwnerView || isOwnerOpen(grp.id)">
      <MpTableContainer>
        <MpTable :is-hoverable="false" :class="fixedTable">
        <colgroup>
          <col v-if="visibleColumns.category" :class="colCategory">
          <col v-if="visibleColumns.subCategory" :class="colSubCategory">
          <col v-if="visibleColumns.goal">
          <col v-if="visibleColumns.goalType" :class="colGoalType">
          <col v-if="visibleColumns.progress" :class="colProgress">
          <col v-if="visibleColumns.status" :class="colStatus">
          <col v-if="visibleColumns.lastUpdated" :class="colLastUpdated">
          <col :class="actionHead">
        </colgroup>
        <MpTableHead>
          <MpTableRow>
            <MpTableCell v-if="visibleColumns.category" as="th" class="sort-th" :class="[colDivider, colCategory]"><span :class="thInner"><span>Category</span><MpTooltip label="Category weight is the sum of its goals' weights — the category's share of the owner's 100% weight budget." use-portal placement="top"><MpIcon name="info" size="sm" :class="css({ color: 'icon.secondary', cursor: 'help' })" /></MpTooltip><PxColumnSortMenu col-key="category" :sort-type="columnSortTypes.category" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.subCategory" as="th" class="sort-th" :class="[colDivider, colSubCategory]"><span :class="thInner"><span>Sub-category</span><PxColumnSortMenu col-key="subCategory" :sort-type="columnSortTypes.subCategory" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.goal" as="th" class="sort-th" :class="colDivider"><span :class="thInner"><span>Goal</span><PxColumnSortMenu col-key="goal" :sort-type="columnSortTypes.goal" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.goalType" as="th" class="sort-th" :class="[colDivider, colGoalType]"><span :class="thInner"><span>Goal type</span><PxColumnSortMenu col-key="goalType" :sort-type="columnSortTypes.goalType" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.progress" as="th" class="sort-th" :class="[colDivider, colProgress]"><span :class="thInner"><span>Progress</span><PxColumnSortMenu col-key="progress" :sort-type="columnSortTypes.progress" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.status" as="th" class="sort-th" :class="[colDivider, colStatus]"><span :class="thInner"><span>Status</span><PxColumnSortMenu col-key="status" :sort-type="columnSortTypes.status" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span></MpTableCell>
            <MpTableCell v-if="visibleColumns.lastUpdated" as="th" :class="[colDivider, colLastUpdated]"><span :class="thInner"><span>Last updated</span></span></MpTableCell>
            <MpTableCell as="th" :class="actionHead" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="row in ownerRows(grp.id)" :key="row.id">
            <!-- Category: rowspan-merged across this owner's consecutive
                 same-category goals (weight shown = the category's total). -->
            <MpTableCell v-if="visibleColumns.category && row.showCategory" as="td" :rowspan="row.categoryRowspan" :class="[tightCell, colDivider, colCategory]">
              <MpFlex direction="column" gap="0" :class="cellContent">
                <MpText size="label" :class="[valueText, cellContent]">{{ row.category }}</MpText>
                <MpText v-if="row.kind === 'main'" size="label-small" :class="captionText">Weight: {{ row.categoryWeight }}%</MpText>
              </MpFlex>
            </MpTableCell>

            <!-- Sub-category: rowspan-merged within the same owner+category. -->
            <MpTableCell v-if="visibleColumns.subCategory && row.showSubCategory" as="td" :rowspan="row.subCategoryRowspan" :class="[tightCell, colDivider, colSubCategory]">
              <MpText size="label" :class="[valueText, cellContent]">{{ row.subCategory }}</MpText>
            </MpTableCell>

            <!-- Goal -->
            <MpTableCell v-if="visibleColumns.goal" as="td" :class="[tightCell, colDivider, (row.kind === 'aligned' || row.kind === 'repeat') && alignedGoalCell]">
              <!-- Main row: the usual 3-line stack (code, name, weight) — the
                   repeat caret (when there is one) sits on the name line only. -->
              <MpFlex v-if="row.kind === 'main'" direction="column" gap="0.5" :class="cellContent">
                <span v-if="visibleColumns.goalId" :class="goalCode">{{ row.code }}</span>
                <MpFlex align="center" gap="2">
                  <!-- Repeating goal: the caret sits right on the goal name — expanding
                       inserts real rows for each finished occurrence below it (own
                       Progress/Status per row), same as "View aligned goals" does. -->
                  <button
                    v-if="previousRepeatPeriods(row).length"
                    type="button"
                    :class="repeatCaretBtn"
                    :aria-label="expandedRepeat[row.id] ? 'Hide previous goals' : `View previous goals (${previousRepeatPeriods(row).length})`"
                    @click="toggleRepeat(row.id)"
                  >
                    <MpIcon :name="expandedRepeat[row.id] ? 'caret-down' : 'caret-right'" size="sm" />
                  </button>
                  <span :class="goalNameLink" @click="goToGoal(row)">{{ row.title }}</span>
                  <MpBadge v-if="row.isAwaitingApproval" for="tableStatus" type="warning" size="sm">Awaiting approval</MpBadge>
                  <MpBadge v-else-if="row.isDraft" for="tableStatus" type="announcement" size="sm">Draft</MpBadge>
                  <MpBadge v-if="row.isClosed" for="tableStatus" type="announcement">Closed</MpBadge>
                  <!-- Carried-over badge hidden for now (flag retained in the store):
                  <MpBadge v-if="row.carriedOver" for="tableStatus" type="announcement" size="sm">Carried over</MpBadge> -->
                </MpFlex>
                <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                <!-- Stays right here, as the main row's own last line, UNLESS
                     past-occurrence rows are expanded below it — then it moves
                     to its own row (below) so it doesn't end up sitting above
                     content that gets inserted between it and the main row. -->
                <button v-if="visibleColumns.alignedGoals && row.alignedGoals.length && !expandedRepeat[row.id]" type="button" :class="alignedLink" @click="toggleAligned(row.id)">
                  <MpIcon :name="expandedAligned[row.id] ? 'caret-down' : 'caret-right'" size="sm" />
                  View aligned goals ({{ row.alignedGoals.length }})
                </button>
              </MpFlex>
              <!-- "View aligned goals" trigger, moved to its own row only when
                   past-occurrence rows pushed it out of the main row above (see
                   the button there) — same trigger, just relocated. -->
              <button v-else-if="row.kind === 'aligned-trigger'" type="button" :class="alignedLink" @click="toggleAligned(row.parentGoalId!)">
                <MpIcon :name="expandedAligned[row.parentGoalId!] ? 'caret-down' : 'caret-right'" size="sm" />
                View aligned goals ({{ row.alignedGoals.length }})
              </button>
              <!-- Aligned child / past occurrence: 3-line stack (code, name,
                   weight) — a past occurrence has nothing else to show, an
                   aligned child additionally carries its owner line below. -->
              <MpFlex v-else direction="column" gap="0.5" :class="[cellContent, alignedGoalIndent]">
                <span v-if="visibleColumns.goalId" :class="goalCode">
                  {{ row.code }}<template v-if="row.kind === 'repeat'"> ({{ repeatDateRange(row) }})</template>
                </span>
                <span :class="goalNameLink" @click="goToGoal(row)">{{ row.title }}</span>
                <MpText size="label-small" :class="captionText">Weight: {{ row.weight }}%</MpText>
                <MpText v-if="row.kind === 'aligned'" size="label-small" :class="[captionText, css({ marginTop: '1' })]">
                  Goal owner: {{ row.owner.name }} - {{ row.owner.id }} | {{ row.owner.title }} | {{ row.owner.department }}
                </MpText>
              </MpFlex>
            </MpTableCell>

            <!-- Goal type — merged across a repeat block (same goal, same type every occurrence). -->
            <MpTableCell v-if="visibleColumns.goalType && row.showGoalType" as="td" :rowspan="row.goalTypeRowspan" :class="[tightCell, colDivider, colGoalType]">
              <MpText size="label" :class="[valueText, cellContent]">{{ row.goalType }}</MpText>
            </MpTableCell>

            <!-- Progress -->
            <MpTableCell v-if="visibleColumns.progress" as="td" :class="[tightCell, colDivider, colProgress]">
              <MpFlex v-if="row.unit" direction="column" gap="1" :class="progressCellWidth">
                <MpFlex align="center" gap="1">
                  <MpText size="label" :class="valueText">
                    {{ row.unit === 'currency' ? `Rp${formatNumber(row.value ?? 0)}` : `${row.value}${row.unit === 'percent' ? '%' : ''}` }}
                  </MpText>
                  <span :class="pillClass(row.status)">{{ row.pill }}%</span>
                </MpFlex>
                <div :class="progressTrack">
                  <div :class="[progressFill, row.status === 'green' ? fillGreen : row.status === 'orange' ? fillOrange : fillGray]" :style="{ width: `${row.pill}%` }" />
                </div>
                <MpFlex justify="space-between">
                  <span :class="css({ fontSize: '10px', lineHeight: '12px', color: 'text.secondary' })">
                    {{ row.unit === 'currency' ? `Rp${formatNumber(row.min ?? 0)}` : `${row.min}${row.unit === 'percent' ? '%' : ''}` }}
                  </span>
                  <span :class="css({ fontSize: '10px', lineHeight: '12px', color: 'text.default' })">
                    {{ row.unit === 'currency' ? `Rp${formatNumber(row.max ?? 0)}` : `${row.max}${row.unit === 'percent' ? '%' : ''}` }}
                  </span>
                </MpFlex>
              </MpFlex>
              <span v-else :class="captionText">—</span>
            </MpTableCell>

            <!-- Status -->
            <MpTableCell v-if="visibleColumns.status" as="td" :class="[tightCell, colDivider, colStatus]">
              <span v-if="row.kind !== 'aligned-trigger'" :class="row.status === 'green' ? statusPillGreen : row.status === 'orange' ? statusPillOrange : statusPillGray">{{ statusLabel[row.status] }}</span>
              <span v-else :class="captionText">—</span>
            </MpTableCell>

            <MpTableCell v-if="visibleColumns.lastUpdated" as="td" :class="[tightCell, colDivider, colLastUpdated]">
              <template v-if="row.updatedAt">
                <MpText size="label" :class="[valueText, cellContent]">{{ row.updatedAt }}</MpText>
                <MpText size="label-small" :class="css({ color: 'text.secondary' })">by {{ row.updatedBy || row.owner.name }}</MpText>
              </template>
              <span v-else :class="css({ color: 'text.secondary' })">—</span>
            </MpTableCell>

            <!-- Actions — none for the "View aligned goals" trigger row, it's a
                 section header, not a goal. -->
            <MpTableCell as="td" :class="actionCell">
              <MpPopover v-if="row.kind !== 'aligned-trigger'" is-close-on-select use-portal placement="bottom-end">
                <MpPopoverTrigger>
                  <MpButton variant="ghost" left-icon="menu-kebab" aria-label="Row actions" />
                </MpPopoverTrigger>
                <MpPopoverContent :class="css({ minWidth: '160px' })">
                  <MpPopoverList>
                    <!-- A repeat row is a synthetic snapshot of a past period, not its own
                         goal record — every other action resolves by id against the real
                         store and would silently no-op, so only offer the one action that
                         actually does something: opening the (live) goal it belongs to. -->
                    <template v-if="row.kind === 'repeat'">
                      <MpPopoverListItem @click="goToGoal(row)">View details</MpPopoverListItem>
                    </template>
                    <!-- A draft isn't live yet, so progress/align/close make no sense on it —
                         and its forward move (going up for approval) is now the owner-group
                         "Publish N goals" textlink, not a per-row action. -->
                    <template v-else-if="row.isDraft">
                      <MpPopoverListItem @click="goToGoal(row)">View details</MpPopoverListItem>
                      <MpPopoverListItem @click="openActivityLog(row)">Activity log</MpPopoverListItem>
                      <MpPopoverListItem v-if="!row.isAwaitingApproval" @click="editRow(row)">Edit</MpPopoverListItem>
                      <MpPopoverListItem @click="deleteRow(row)">
                        <span :class="css({ color: 'text.danger' })">Delete</span>
                      </MpPopoverListItem>
                    </template>
                    <template v-else>
                      <MpPopoverListItem @click="goToGoal(row)">View details</MpPopoverListItem>
                      <MpPopoverListItem v-if="!row.isClosed" @click="openUpdateProgress(row)">Update goal progress</MpPopoverListItem>
                      <MpPopoverListItem v-if="!row.isClosed && row.kind === 'main' && row.level !== 'company'" @click="openAlign(row)">Align goal</MpPopoverListItem>
                      <MpPopoverListItem @click="openActivityLog(row)">Activity log</MpPopoverListItem>
                      <MpPopoverListItem v-if="!row.isClosed" @click="editRow(row)">Edit</MpPopoverListItem>
                      <MpPopoverListItem v-if="!row.isClosed" @click="closeRow(row)">Close goal</MpPopoverListItem>
                      <MpPopoverListItem @click="deleteRow(row)">
                        <span :class="css({ color: 'text.danger' })">Delete</span>
                      </MpPopoverListItem>
                    </template>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </MpTableCell>
          </MpTableRow>

        </MpTableBody>
      </MpTable>
      </MpTableContainer>

      <!-- Per-owner: load more goals (10 at a time) -->
      <MpFlex v-if="ownerHasMoreGoals(grp.id, grp.total)" :class="loadMoreBar">
        <MpText size="label" :class="captionText">Showing {{ Math.min(goalsShown(grp.id), grp.total) }} of {{ grp.total }} goals.</MpText>
        <MpTextlink size="label" @click="loadMoreGoals(grp.id)">Load {{ Math.min(PER_OWNER_PAGE, grp.total - goalsShown(grp.id)) }} more goals.</MpTextlink>
      </MpFlex>
      </template>
    </div>

    <!-- Owner-level: load more employees (10 at a time) — inside the shared border -->
    <MpFlex v-if="!singleOwnerView" align="center" gap="1" :class="loadMoreBar">
      <MpText size="label" :class="captionText">Showing {{ visibleOwners.length }} of {{ distinctOwnerIds.length }} employees.</MpText>
      <MpTextlink v-if="hasMore && !loadingMore" size="label" @click="loadMore">
        Load {{ Math.min(PAGE_SIZE, distinctOwnerIds.length - visibleOwnerCount) }} more employees.
      </MpTextlink>
    </MpFlex>
    </div>
    </ClientOnly>
    </template>
    </template>
  </MpFlex>

  <!-- Goal cycle info -->
  <GoalCycleInfoPanel v-else />

  <!-- Select employee(s) for the new goal(s) -->
  <SelectEmployeesDrawer
    v-model:is-open="isSelectEmployeeOpen"
    :exclude-ids="[...fullOwnerIds]"
    :initial-selected="pendingEmployeeIds"
    :max-selectable="MANUAL_CREATE_OWNER_LIMIT"
    exclude-note="Employees whose goals already total 100% aren't shown here. Add more goals for them from their existing goal list instead."
    @continue="continueToNewGoals"
  />
  <TooManyEmployeesModal
    :is-open="importSuggestionOpen"
    @cancel="cancelBulkOwnerModal"
    @import="goToImport"
  />

  <!-- Edit an existing goal -->
  <AddGoalDrawer
    drawer-id="drawer-add-goal-edit"
    v-model:is-open="isEditDrawerOpen"
    :owners="editingOwners"
    :already-used-weight="alreadyUsedWeightForEdit"
    :cycle-start-date="cycle?.startDate ?? ''"
    :cycle-id="cycle?.id"
    :cycle-end-date="cycle?.endDate ?? ''"
    :editing-draft="editingDraft"
    @save="saveEdit"
  />

  <!-- Align an individual goal to a higher-level parent goal (member-only) -->
  <GoalAlignDrawer
    :is-open="alignModalOpen"
    :goal="aligningGoal"
    :candidates="goals"
    @close="alignModalOpen = false"
    @aligned="onAligned"
  />

  <!-- Update goal progress (shared drawer, opened from the row action) -->
  <UpdateProgressDrawer
    :is-open="isUpdateProgressOpen"
    :goal="updatingGoal"
    @close="isUpdateProgressOpen = false"
  />

  <!-- Goal activity log (history) -->
  <GoalActivityLogDrawer :is-open="isActivityLogOpen" :goal="activityGoal" @close="isActivityLogOpen = false" />

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
          <MpText size="label" :class="css({ color: 'text.default' })">Once a goal has closed, {{ goalToClose?.title }} can no longer submit progress or be edited.<template v-if="needsApproval(goalToClose?.ownerId)"> This close will be sent to the manager for approval before it takes effect.</template></MpText>
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

  <!-- Delete confirmation -->
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

  <PxAllFiltersDrawer :is-open="allFiltersOpen" :applied-filters="appliedFilters" :applied-scopes="appliedScopes" @close="allFiltersOpen = false" @apply="onApplyAllFilters" />
</template>

<style scoped>
/* Reveal the column-sort icon on header hover. UNLAYERED scoped rule (not a
   Panda css() @layer utility) so it beats PxColumnSortMenu's unlayered scoped
   `visibility: hidden` on specificity. */
.sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>
