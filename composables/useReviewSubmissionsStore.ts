// ─────────────────────────────────────────────────────────────────────────────
// Review submissions mini-DB — the single source of truth for every
// review-derived surface on the Dashboard (route review_overview): KPI strip,
// Cycle overview chart, Not submit reviews, Picked co-worker, Pending actions.
//
// Instead of hand-typed dashboard numbers, this generates one review-task
// record per (reviewee, method, reviewer) — mirroring how the production
// backend models review assignments — from the REAL org chart
// (utils/employees + EMPLOYEE_MANAGER) and REAL goal progress
// (useGoalsStore), so every count on the dashboard adds up and every
// employee's data is consistent with their goals.
//
//   • Reviewers per method (production parity):
//       self    → the employee themselves
//       manager → the employee's manager (EMPLOYEE_MANAGER)
//       team    → same-department colleagues (the "picked co-workers")
//       360     → manager + peers + a direct report
//   • Status by cycle age: past cycles (25 H1/H2) are fully submitted; 26 H1
//     is nearly done; 26 H2 (current) is mid-flight (mostly pending).
//   • Score (when submitted) is auto-derived from the reviewee's goal progress
//     in the matching goal cycle (26 H1 → seed-26-h1, 26 H2 → seed-26-h2),
//     mirroring prod's goal_auto_score; past cycles use a deterministic
//     historical score.
//
// Everything is deterministic (no randomness), so it's stable across reloads.
// ─────────────────────────────────────────────────────────────────────────────

import { EMPLOYEES, employeeById } from '~/utils/employees'
import { EMPLOYEE_MANAGER } from '~/composables/useGoalsStore'

export type ReviewMethodKey = 'manager' | '360' | 'team' | 'self'
export type ReviewTaskStatus = 'submitted' | 'draft' | 'not_started'

export interface ReviewTask {
  id: string
  cycle: string // '25-h1' | '25-h2' | '26-h1' | '26-h2'
  revieweeId: string
  reviewerId: string
  method: ReviewMethodKey
  status: ReviewTaskStatus
  score: number | null // 0–5, only when submitted
}

export interface ReviewCycleOption {
  value: string
  label: string
  goalCycle: string | null
  age: 'past' | 'recent' | 'current'
  period: string // time-frame label, e.g. "H2 2026"
  start: string // cycle period ISO dates
  end: string
  reviewStart: string // review window ISO dates
  reviewEnd: string
}

export const REVIEW_CYCLES: ReviewCycleOption[] = [
  { value: '25-h1', label: '25 H1', goalCycle: null, age: 'past', period: 'H1 2025', start: '2025-01-01', end: '2025-06-30', reviewStart: '2025-06-16', reviewEnd: '2025-06-30' },
  { value: '25-h2', label: '25 H2', goalCycle: null, age: 'past', period: 'H2 2025', start: '2025-07-01', end: '2025-12-31', reviewStart: '2025-12-16', reviewEnd: '2025-12-31' },
  { value: '26-h1', label: '26 H1', goalCycle: 'seed-26-h1', age: 'recent', period: 'H1 2026', start: '2026-01-01', end: '2026-06-30', reviewStart: '2026-06-16', reviewEnd: '2026-06-30' },
  { value: '26-h2', label: '26 H2', goalCycle: 'seed-26-h2', age: 'current', period: 'H2 2026', start: '2026-07-01', end: '2026-12-31', reviewStart: '2026-08-01', reviewEnd: '2026-08-15' },
]
export const REVIEW_METHODS: { value: ReviewMethodKey, label: string }[] = [
  { value: 'manager', label: 'Manager review' },
  { value: '360', label: '360 review' },
  { value: 'team', label: 'Team review' },
  { value: 'self', label: 'Self review' },
]

// Synthesised filter dimensions the mini-DB doesn't otherwise carry.
const BRANCHES = ['HQ Jakarta', 'Bandung', 'Surabaya']
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
export function branchOf(id: string): string { return BRANCHES[hashStr(id) % BRANCHES.length] }
export function jobLevelOf(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('ceo') || t.includes('head') || t.includes('director')) return 'Head'
  if (t.includes('manager')) return 'Manager'
  if (t.includes('specialist') || t.includes('admin') || t.includes('recruiter') || t.includes('accountant') || t.includes('chef') || t.includes('sous')) return 'Supervisor'
  return 'Staff'
}

function peersOf(revieweeId: string): string[] {
  const me = employeeById(revieweeId)
  if (!me) return []
  return EMPLOYEES.filter(e => e.department === me.department && e.id !== revieweeId).map(e => e.id)
}
function reportsOf(revieweeId: string): string[] {
  return EMPLOYEES.filter(e => EMPLOYEE_MANAGER[e.id] === revieweeId).map(e => e.id)
}
function reviewersFor(revieweeId: string, method: ReviewMethodKey): string[] {
  const mgr = EMPLOYEE_MANAGER[revieweeId]
  const peers = peersOf(revieweeId)
  const reports = reportsOf(revieweeId)
  switch (method) {
    case 'self': return [revieweeId]
    case 'manager': return mgr ? [mgr] : []
    case 'team': return peers.slice(0, 2)
    case '360': return [...(mgr ? [mgr] : []), ...peers.slice(0, 2), ...reports.slice(0, 1)]
  }
}

function statusFor(cycle: ReviewCycleOption, key: string): ReviewTaskStatus {
  if (cycle.age === 'past') return 'submitted'
  const h = hashStr(`${cycle.value}:${key}`) % 100
  if (cycle.age === 'recent') return h < 85 ? 'submitted' : h < 93 ? 'draft' : 'not_started'
  // current — mid-flight, mostly pending
  return h < 25 ? 'submitted' : h < 55 ? 'draft' : 'not_started'
}

// Build the full task list once, auto-scoring from the provided goals snapshot.
let TASKS: ReviewTask[] | null = null
function buildTasks(goals: { cycleId: string, ownerId: string, pill?: number }[]): ReviewTask[] {
  function autoScore(cycle: ReviewCycleOption, revieweeId: string): number {
    if (cycle.goalCycle) {
      const gs = goals.filter(g => g.cycleId === cycle.goalCycle && g.ownerId === revieweeId && typeof g.pill === 'number')
      if (gs.length) {
        const avgPill = gs.reduce((s, g) => s + (g.pill ?? 0), 0) / gs.length
        return Math.round((Math.min(avgPill, 120) / 20) * 10) / 10 // pill% → 0–5 (cap 6)
      }
    }
    // Historical / fallback — deterministic 3.0–4.8 per employee+cycle.
    return Math.round((3 + (hashStr(`${cycle.value}:${revieweeId}`) % 19) / 10) * 10) / 10
  }

  const tasks: ReviewTask[] = []
  for (const cycle of REVIEW_CYCLES) {
    for (const reviewee of EMPLOYEES) {
      const score = autoScore(cycle, reviewee.id)
      for (const m of REVIEW_METHODS) {
        for (const reviewerId of reviewersFor(reviewee.id, m.value)) {
          const key = `${reviewee.id}:${m.value}:${reviewerId}`
          const status = statusFor(cycle, key)
          tasks.push({
            id: `${cycle.value}:${key}`,
            cycle: cycle.value,
            revieweeId: reviewee.id,
            reviewerId,
            method: m.value,
            status,
            score: status === 'submitted' ? score : null,
          })
        }
      }
    }
  }
  return tasks
}

export interface ReviewFilter { cycles?: string[], methods?: string[] }
function inScope(t: ReviewTask, f: ReviewFilter): boolean {
  if (f.cycles?.length && !f.cycles.includes(t.cycle)) return false
  if (f.methods?.length && !f.methods.includes(t.method)) return false
  return true
}

export interface DashRow {
  id: string
  name: string
  employeeId: string
  photo?: string
  count: number
  cycleName?: string
  org: string
  branch: string
  jobPosition: string
  jobLevel: string
  sentEmail?: boolean
  revieweeId?: string
  cycleValue?: string
}

export interface PendingActionRow {
  id: string
  uuid: string
  name: string
  timeFrame: string
  start: string
  end: string
  reviewStart: string
  reviewEnd: string
  isExtend: boolean
  extendDate: string
  started: boolean
  totalNotSubmitted: number
  showReviewList: boolean
  showGoalList: boolean
  showCoworkerList: boolean
}

export function useReviewSubmissionsStore() {
  const { goals } = useGoalsStore()
  if (!TASKS) TASKS = buildTasks(goals.value)
  const tasks = TASKS

  function scoped(f: ReviewFilter) { return tasks.filter(t => inScope(t, f)) }

  function stats(f: ReviewFilter) {
    const list = scoped(f)
    const total = list.length
    const submitted = list.filter(t => t.status === 'submitted').length
    const reviewers = new Set(list.map(t => t.reviewerId)).size
    return {
      totalReviewers: reviewers,
      totalTasks: total,
      completedPct: total ? Math.round((submitted / total) * 100) : 0,
      notSubmitPct: total ? Math.round(((total - submitted) / total) * 100) : 0,
    }
  }

  // Cycle overview: one bar per organization (reviewee's department).
  function chartByOrg(f: ReviewFilter) {
    const list = scoped(f)
    const orgs = [...new Set(EMPLOYEES.map(e => e.department))]
    return orgs.map((org) => {
      const deptTasks = list.filter(t => employeeById(t.revieweeId)?.department === org)
      const submit = deptTasks.filter(t => t.status === 'submitted').length
      const reviewers = new Set(deptTasks.map(t => t.reviewerId)).size
      return { org, reviewers, submit, notSubmit: deptTasks.length - submit }
    }).filter(r => r.reviewers > 0)
  }

  function toRow(empId: string, count: number, cycleName?: string): DashRow {
    const e = employeeById(empId)!
    return {
      id: empId, name: e.name, employeeId: e.code, photo: e.photo, count, cycleName,
      org: e.department, branch: branchOf(empId), jobPosition: e.title, jobLevel: jobLevelOf(e.title),
    }
  }

  // Not submit reviews: reviewers who still have pending (draft/not_started)
  // tasks — count = how many pending review tasks they owe.
  function notSubmitList(f: ReviewFilter): DashRow[] {
    const pending = scoped(f).filter(t => t.status !== 'submitted')
    const byReviewer = new Map<string, number>()
    for (const t of pending) byReviewer.set(t.reviewerId, (byReviewer.get(t.reviewerId) ?? 0) + 1)
    return [...byReviewer.entries()]
      .map(([id, count]) => toRow(id, count))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // Picked co-worker: ONE row per (reviewee, cycle) — production parity (each
  // row carries its own cycle_id/cycle_name). total_picked = distinct team
  // reviewers that reviewee picked in THAT cycle. So filtering two cycles shows
  // an employee once per cycle they picked co-workers in.
  function pickedList(f: ReviewFilter): DashRow[] {
    const teamTasks = scoped({ cycles: f.cycles, methods: ['team'] }).filter(t => !f.methods?.length || f.methods.includes('team'))
    const byKey = new Map<string, { revieweeId: string, cycle: string, pickers: Set<string> }>()
    for (const t of teamTasks) {
      const key = `${t.revieweeId}::${t.cycle}`
      const entry = byKey.get(key) ?? { revieweeId: t.revieweeId, cycle: t.cycle, pickers: new Set<string>() }
      entry.pickers.add(t.reviewerId)
      byKey.set(key, entry)
    }
    return [...byKey.values()]
      .filter(v => v.pickers.size > 0)
      .map((v) => {
        const base = toRow(v.revieweeId, v.pickers.size, REVIEW_CYCLES.find(c => c.value === v.cycle)?.label)
        return { ...base, id: `${v.revieweeId}::${v.cycle}`, revieweeId: v.revieweeId, cycleValue: v.cycle }
      })
      .sort((a, b) => a.name.localeCompare(b.name) || (a.cycleName ?? '').localeCompare(b.cycleName ?? ''))
  }

  // The team reviewers a reviewee has already picked (to preselect in the
  // Pick co-worker drawer).
  function teamReviewersOf(revieweeId: string, f: ReviewFilter): string[] {
    return [...new Set(scoped({ cycles: f.cycles, methods: ['team'] }).filter(t => t.revieweeId === revieweeId).map(t => t.reviewerId))]
  }

  // Pending actions for one reviewer, grouped cycle → method (for the modal).
  function pendingByReviewer(reviewerId: string, f: ReviewFilter) {
    const mine = scoped(f).filter(t => t.reviewerId === reviewerId && t.status !== 'submitted')
    const byCycle = new Map<string, Map<ReviewMethodKey, { draft: number, notStarted: number }>>()
    for (const t of mine) {
      if (!byCycle.has(t.cycle)) byCycle.set(t.cycle, new Map())
      const methods = byCycle.get(t.cycle)!
      const cur = methods.get(t.method) ?? { draft: 0, notStarted: 0 }
      if (t.status === 'draft') cur.draft++
      else cur.notStarted++
      methods.set(t.method, cur)
    }
    return [...byCycle.entries()].map(([cycle, methods]) => ({
      cycleName: REVIEW_CYCLES.find(c => c.value === cycle)?.label ?? cycle,
      methods: [...methods.entries()].map(([method, c]) => ({
        method: REVIEW_METHODS.find(m => m.value === method)?.label ?? method,
        draft: c.draft,
        notStarted: c.notStarted,
      })),
    }))
  }

  // Pending actions list — one row per review cycle the given reviewer is
  // involved in. Active = cycles with pending (not-submitted) tasks that aren't
  // closed; History = closed/past cycles.
  function pendingActionTasks(reviewerId: string, tab: 'active' | 'history'): PendingActionRow[] {
    const mine = tasks.filter(t => t.reviewerId === reviewerId)
    const rows: PendingActionRow[] = []
    for (const c of REVIEW_CYCLES) {
      const ct = mine.filter(t => t.cycle === c.value)
      if (!ct.length) continue
      const pending = ct.filter(t => t.status !== 'submitted').length
      const started = ct.some(t => t.status === 'draft')
      const isClosed = c.age === 'past' || pending === 0
      if (tab === 'active' && isClosed) continue
      if (tab === 'history' && !isClosed) continue
      rows.push({
        id: c.value,
        uuid: c.value,
        name: `${c.label} Performance Review`,
        timeFrame: c.period,
        start: c.start,
        end: c.end,
        reviewStart: c.reviewStart,
        reviewEnd: c.reviewEnd,
        isExtend: c.value === '26-h1',
        extendDate: '2026-07-15',
        started,
        totalNotSubmitted: pending,
        showReviewList: true,
        showGoalList: true,
        showCoworkerList: ct.some(t => t.method === 'team'),
      })
    }
    return rows
  }

  // ─── View task: the members the current reviewer must review in a cycle ─────
  function reviewMembers(reviewerId: string, cycle: string) {
    return tasks
      .filter(t => t.reviewerId === reviewerId && t.cycle === cycle)
      .map(t => ({ id: `${t.revieweeId}--${t.method}`, revieweeId: t.revieweeId, method: t.method, status: t.status }))
  }
  function reviewMemberCounts(reviewerId: string, cycle: string) {
    const m = tasks.filter(t => t.reviewerId === reviewerId && t.cycle === cycle)
    return {
      submitted: m.filter(t => t.status === 'submitted').length,
      draft: m.filter(t => t.status === 'draft').length,
      notStarted: m.filter(t => t.status === 'not_started').length,
    }
  }
  function reviewMember(reviewerId: string, cycle: string, memberId: string) {
    return reviewMembers(reviewerId, cycle).find(r => r.id === memberId) ?? null
  }
  // Save-as-draft / Submit from the scoring form — mutates the seed in place so
  // the list + dashboard reflect it on the next read (after navigation back).
  function setReviewStatus(reviewerId: string, cycle: string, memberId: string, status: ReviewTaskStatus, score?: number) {
    const [revieweeId, method] = memberId.split('--')
    const t = tasks.find(x => x.reviewerId === reviewerId && x.cycle === cycle && x.revieweeId === revieweeId && x.method === method)
    if (t) {
      t.status = status
      if (status === 'submitted') t.score = score ?? t.score ?? 0
    }
  }

  return {
    stats,
    chartByOrg,
    notSubmitList,
    pickedList,
    teamReviewersOf,
    pendingByReviewer,
    pendingActionTasks,
    reviewMembers,
    reviewMemberCounts,
    reviewMember,
    setReviewStatus,
  }
}
