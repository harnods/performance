// ─────────────────────────────────────────────────────────────────────────────
// Goals dashboard — every derived figure the Goals tab of pages/dashboard.vue
// renders (summary cards, needs-update list, distribution donuts, approval
// queues), computed from the real mini-DB stores rather than mock constants.
//
// The scope is a SET of cycle ids, never a single one, because the dashboard
// runs in two modes (see pages/dashboard.vue):
//   - New Goals UI  → the user picks one goal cycle       → scope = [that cycle]
//   - Old Goals UI  → the user picks a date range instead → scope = every cycle
//                     overlapping that range, with the cycle NAME never surfaced
// Everything below is written against the set so both modes share one code path.
// ─────────────────────────────────────────────────────────────────────────────

import type { Goal, GoalLevel, GoalStatus } from './useGoalsStore'
import type { Submission } from './useGoalApprovalsStore'
import { isAwaitingApproval, submissionTypeLabel } from './useGoalApprovalsStore'
import { EMPLOYEES } from '~/utils/employees'

// A goal counts as "needs update" once its last progress update is this old.
export const STALE_AFTER_DAYS = 30

export const GOAL_LEVEL_LABELS: { level: GoalLevel, label: string }[] = [
  { level: 'company', label: 'Company' },
  { level: 'organization', label: 'Organization' },
  { level: 'team', label: 'Teams' },
  { level: 'individual', label: 'Individual' },
]

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Goal.updatedAt is a PREFORMATTED display string ("15 Mar 2026, 15:00"), not an
// ISO date — see useGoalsStore. Parsing it back is the only way to age a goal.
export function parseUpdatedAt(value?: string): Date | null {
  if (!value) return null
  const m = /^(\d{1,2}) (\w{3}) (\d{4})/.exec(value)
  if (!m) return null
  const month = MONTH_SHORT.indexOf(m[2])
  if (month < 0) return null
  return new Date(Number(m[3]), month, Number(m[1]))
}

// "2 months ago" — the caption under each Last updated date.
export function relativeAge(from: Date, now: Date): string {
  const days = Math.floor((now.getTime() - from.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  const years = Math.floor(days / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

export interface SummaryBucket {
  status: GoalStatus
  count: number
  // % change against the equivalent figure for the preceding cycle(s). null when
  // there is no earlier cycle to compare against (don't render a fake 0%).
  deltaPct: number | null
  employeePct: number
  employeeTotal: number
  breakdown: { label: string, value: number }[]
}

export interface NeedsUpdateRow {
  id: string
  title: string
  ownerId: string
  updatedAt: Date
  age: string
}

// Bucketing is NOT redefined here — the dashboard's three approval cards and the
// goal-cycle "Awaiting approval" tab must show the same rows, so both call
// submissionTypeLabel() from useGoalApprovalsStore. All three of its categories
// now have a card, so nothing classifies into a bucket the dashboard drops.

// One row of an approval card. The three cards list at two different
// granularities, so both shapes normalise to this before reaching the table:
//
//  - "Goal creation" is per EMPLOYEE. A create bundle's weights only add up to
//    100% together, so it is only ever decided as one unit — never goal by goal
//    (see useGoalApprovalsStore's header).
//  - "Goal progress update" and "Goal edit" are per GOAL. A manager triaging
//    those is deciding about goals, not people, and one employee can have
//    several in flight; a row per employee would hide all but the first.
//
// `title` is what distinguishes them: set on a goal row, absent on an employee
// row, and the table shows its Goal column exactly when `unit === 'goal'`.
export interface ApprovalRow {
  id: string // row key AND selection key
  // Every submission the row stands for — 1+. Approving the row approves all of
  // them, so callers must de-duplicate across rows before committing.
  submissionIds: string[]
  ownerId: string
  submittedAt: string
  title?: string
  // How many goals the row covers, summed across its submissions. Only
  // meaningful on an employee row — on a goal row it would always read 1, so
  // the column is rendered for unit="employee" only.
  goalCount?: number
}

// One row per EMPLOYEE, not per submission. Somebody who sent up two separate
// create batches is ONE row carrying both, with their goal counts summed — the
// card answers "who is waiting on me", so the same name appearing twice reads
// as a duplicate rather than as two batches.
export function approvalEmployeeRows(submissions: Submission[]): ApprovalRow[] {
  const byOwner = new Map<string, Submission[]>()
  for (const s of submissions) {
    const group = byOwner.get(s.ownerId)
    if (group) group.push(s)
    else byOwner.set(s.ownerId, [s])
  }

  return [...byOwner.values()]
    .map((group) => {
      // The row's date is the most recent of its batches, so newest-first below
      // still means "asked most recently".
      const newest = group.reduce((a, b) => (a.submittedAt >= b.submittedAt ? a : b))
      return {
        id: group[0].ownerId,
        submissionIds: group.map(s => s.id),
        ownerId: group[0].ownerId,
        submittedAt: newest.submittedAt,
        goalCount: group.reduce((total, s) => total + s.items.length, 0),
      }
    })
    // Grouping loses the caller's ordering, so re-establish newest-first
    // (docs/patterns/table.md's default order rule).
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

// A submission item carries the goal as `after` (proposed) and/or `before`
// (current). Either one names the goal; a delete request only has `before`.
export function approvalGoalRows(submissions: Submission[]): ApprovalRow[] {
  return submissions.flatMap(submission =>
    submission.items.map(item => ({
      id: item.id,
      submissionIds: [submission.id],
      ownerId: item.ownerId ?? submission.ownerId,
      submittedAt: submission.submittedAt,
      title: item.after?.title ?? item.before?.title ?? 'Untitled goal',
    })),
  )
}

export function useGoalsDashboard(scopeCycleIds: Ref<string[]>, now: Ref<Date>) {
  const { goals } = useGoalsStore()
  const { cycles } = useGoalCyclesStore()
  const { submissions } = useGoalApprovalsStore()

  // Drafts are proposals, not commitments — they carry no progress and would
  // inflate "Not started" with goals nobody has agreed to yet.
  const isLive = (g: Goal) => !g.isDraft

  const scopedGoals = computed(() =>
    goals.value.filter(g => scopeCycleIds.value.includes(g.cycleId) && isLive(g)),
  )

  // "vs. last cycle" needs a baseline. Take the cycles immediately preceding the
  // scope (same count), which works identically whether the scope came from a
  // cycle picker or a date range.
  const previousCycleIds = computed(() => {
    const byStart = [...cycles.value].sort((a, b) => a.startDate.localeCompare(b.startDate))
    const firstScoped = byStart.findIndex(c => scopeCycleIds.value.includes(c.id))
    if (firstScoped <= 0) return []
    const take = Math.max(1, scopeCycleIds.value.length)
    return byStart.slice(Math.max(0, firstScoped - take), firstScoped).map(c => c.id)
  })

  const previousGoals = computed(() =>
    goals.value.filter(g => previousCycleIds.value.includes(g.cycleId) && isLive(g)),
  )

  function bucketFor(status: GoalStatus): SummaryBucket {
    const inBucket = scopedGoals.value.filter(g => g.status === status)
    const wasInBucket = previousGoals.value.filter(g => g.status === status)
    const owners = new Set(inBucket.map(g => g.ownerId))
    const employeeTotal = EMPLOYEES.length

    return {
      status,
      count: inBucket.length,
      deltaPct: wasInBucket.length
        ? Math.round(((inBucket.length - wasInBucket.length) / wasInBucket.length) * 100)
        : null,
      employeePct: employeeTotal ? Math.round((owners.size / employeeTotal) * 100) : 0,
      employeeTotal,
      breakdown: GOAL_LEVEL_LABELS.map(({ level, label }) => ({
        label,
        value: inBucket.filter(g => g.level === level).length,
      })),
    }
  }

  const onTrack = computed(() => bucketFor('green'))
  const offTrack = computed(() => bucketFor('orange'))
  const notStarted = computed(() => bucketFor('gray'))

  // Needs update — live, still-open goals whose last progress update has gone
  // stale. Most stale first: this is a triage worklist, so the row most overdue
  // for attention leads (see docs/patterns/stat-card.md for why this table opts
  // out of the usual newest-first default).
  const needsUpdate = computed<NeedsUpdateRow[]>(() =>
    scopedGoals.value
      .filter(g => !g.isClosed)
      .map((g) => {
        const updatedAt = parseUpdatedAt(g.updatedAt)
        return updatedAt ? { id: g.id, title: g.title, ownerId: g.ownerId, updatedAt, age: relativeAge(updatedAt, now.value) } : null
      })
      .filter((r): r is NeedsUpdateRow => !!r)
      .filter(r => (now.value.getTime() - r.updatedAt.getTime()) / 86_400_000 >= STALE_AFTER_DAYS)
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()),
  )

  // ─── Distribution donuts ────────────────────────────────────────────────────
  // Assigned employees = active employees with at least one goal in scope.
  // Both arcs are clickable/hoverable, so each side needs its own real count —
  // never derive the grey arc's count from the rounded percentage.
  const assignedEmployees = computed(() => {
    const withGoals = new Set(scopedGoals.value.map(g => g.ownerId))
    return EMPLOYEES.filter(e => withGoals.has(e.id))
  })
  const unassignedEmployees = computed(() => {
    const withGoals = new Set(scopedGoals.value.map(g => g.ownerId))
    return EMPLOYEES.filter(e => !withGoals.has(e.id))
  })
  const assignedEmployeePct = computed(() =>
    EMPLOYEES.length ? Math.round((assignedEmployees.value.length / EMPLOYEES.length) * 100) : 0,
  )

  // Goals aligned = goals cascading from a parent objective or key result.
  const alignedGoalCount = computed(() => scopedGoals.value.filter(g => !!g.alignedToId).length)
  const notAlignedGoalCount = computed(() => scopedGoals.value.length - alignedGoalCount.value)
  const alignedGoalPct = computed(() => {
    const total = scopedGoals.value.length
    if (!total) return 0
    return Math.round((alignedGoalCount.value / total) * 100)
  })

  // ─── Awaiting approval ──────────────────────────────────────────────────────
  const pendingSubmissions = computed(() =>
    submissions.value
      .filter(s => scopeCycleIds.value.includes(s.cycleId) && isAwaitingApproval(s))
      .slice()
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
  )
  const creationSubmissions = computed(() => pendingSubmissions.value.filter(s => submissionTypeLabel(s) === 'Goal creation'))
  const progressSubmissions = computed(() => pendingSubmissions.value.filter(s => submissionTypeLabel(s) === 'Goal progress update'))
  const editSubmissions = computed(() => pendingSubmissions.value.filter(s => submissionTypeLabel(s) === 'Goal edit'))

  return {
    scopedGoals,
    onTrack,
    offTrack,
    notStarted,
    needsUpdate,
    assignedEmployees,
    unassignedEmployees,
    assignedEmployeePct,
    alignedGoalCount,
    notAlignedGoalCount,
    alignedGoalPct,
    creationSubmissions,
    progressSubmissions,
    editSubmissions,
  }
}
