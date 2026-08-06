// Mock "activity log" (prod calls it the goal *history* / activity journey —
// GET /goals/progress-history/{uuid}). Prod records three entry kinds:
// goal-created, approval, and progress updates. We derive a deterministic,
// coherent timeline per goal from its own data (no persistence, no randomness)
// so the drawer always shows the same log for a given goal.
import type { Goal, GoalStatus } from './useGoalsStore'
import { employeeById } from '~/utils/employees'

export type GoalActivityType = 'created' | 'approval' | 'progress' | 'comment' | 'event'
export interface GoalActivityFile { name: string, sizeLabel: string }
export interface GoalActivityEntry {
  id: string
  type: GoalActivityType
  dateLabel: string          // "01 Feb 2026, 10:00" (non-table timestamp format)
  actorName: string
  ts?: number                // sort key for recorded (user-triggered) events
  isSelf?: boolean
  // progress
  wording?: string
  status?: GoalStatus
  effectiveLabel?: string
  files?: GoalActivityFile[]
  // approval
  approver?: string
  approvalStatus?: string
}
// What a caller passes to logActivity — actor + timestamp are filled in for it.
export interface LogActivityInput {
  type: GoalActivityType
  wording?: string
  status?: GoalStatus
  effectiveLabel?: string
  files?: GoalActivityFile[]
  actorName?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }
function label(d: Date) { return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}` }
function dayLabel(d: Date) { return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
// Stable hash of a string → small non-negative int.
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

const REVIEWERS = ['rizal', 'dewi', 'evelyn', 'bayu']

// Recorded, user-triggered events (progress updates, KR/goal edits, alignment),
// persisted per goal on top of the deterministic baseline. Newest first.
const ACTIVITY_KEY = 'talenta-goal-activity-db'
const recorded = ref<Record<string, GoalActivityEntry[]>>({})
let loaded = false
function loadRecorded() {
  if (loaded || !import.meta.client) return
  loaded = true
  try { const raw = localStorage.getItem(ACTIVITY_KEY); if (raw) recorded.value = JSON.parse(raw) } catch { /* ignore */ }
}
function persist() { if (import.meta.client) localStorage.setItem(ACTIVITY_KEY, JSON.stringify(recorded.value)) }

export function useGoalActivityStore() {
  loadRecorded()

  // Record a real action and (unless it's a comment) bump the goal's
  // "Last updated by … on …" stamp so the detail footer reflects it.
  function logActivity(goalId: string, input: LogActivityInput, opts?: { bumpUpdated?: boolean }) {
    loadRecorded()
    const { currentUserId } = useCurrentUser()
    const actorName = input.actorName ?? employeeById(currentUserId.value)?.name ?? 'Someone'
    const now = new Date()
    const entry: GoalActivityEntry = {
      id: `act-log-${goalId}-${now.getTime()}`,
      ts: now.getTime(),
      dateLabel: label(now),
      actorName,
      type: input.type,
      wording: input.wording,
      status: input.status,
      effectiveLabel: input.effectiveLabel,
      files: input.files,
    }
    recorded.value = { ...recorded.value, [goalId]: [entry, ...(recorded.value[goalId] ?? [])] }
    persist()
    if (input.type !== 'comment' && opts?.bumpUpdated !== false) {
      const { updateGoal } = useGoalsStore()
      updateGoal(goalId, { updatedAt: label(now), updatedBy: actorName })
    }
  }

  function activityFor(goal: Goal): GoalActivityEntry[] {
    const owner = employeeById(goal.ownerId)
    const ownerName = owner?.name ?? 'The owner'
    const h = hash(goal.id)

    // Comments on the goal are part of its activity — newest first, at the top
    // (a comment the user just posted is the most recent thing that happened).
    const { comments } = useGoalCommentsStore(goal.id)
    const commentEntries: GoalActivityEntry[] = [...comments.value].reverse().map(c => ({
      id: `act-${c.id}`,
      type: 'comment',
      dateLabel: c.createdLabel,
      actorName: employeeById(c.authorId)?.name ?? 'Someone',
      wording: c.body,
    }))

    // Base created date early in the cycle, plus a monthly cadence for updates.
    const created = new Date(2026, 0, 8 + (h % 6), 9, 15 + (h % 40))
    const entries: GoalActivityEntry[] = []

    // Progress updates — 1..3, ramping up to the goal's current achievement.
    const count = 1 + (h % 3)
    const targetPct = Math.max(0, Math.min(100, goal.pill ?? 0))
    for (let i = 0; i < count; i++) {
      const when = new Date(2026, 1 + i * 2, 3 + ((h >> i) % 20), 10, 5 + ((h >> i) % 50))
      const pct = Math.round((targetPct * (i + 1)) / count)
      const isLast = i === count - 1
      // The latest update reuses the goal's own "last updated" stamp when present.
      const dateLabel = isLast && goal.updatedAt ? goal.updatedAt : label(when)
      const actorName = isLast && goal.updatedBy ? goal.updatedBy : ownerName
      entries.push({
        id: `${goal.id}-p${i}`,
        type: 'progress',
        dateLabel,
        actorName,
        wording: goal.keyResults?.length
          ? `Updated the key results — goal achievement is now ${pct}%.`
          : `Updated the goal progress to ${pct}%.`,
        status: isLast ? goal.status : (pct >= 45 ? 'green' : 'orange'),
        effectiveLabel: dayLabel(when),
        files: isLast && (h % 2 === 0) ? [{ name: 'progress-evidence.pdf', sizeLabel: '248 KB' }] : undefined,
      })
    }
    // Newest progress first.
    entries.reverse()

    // Approval — only for goals owned by someone with a manager (mock: ~half),
    // sits between the progress updates and the created entry.
    if (h % 2 === 0) {
      const reviewer = employeeById(REVIEWERS[h % REVIEWERS.length])
      const when = new Date(2026, 0, 12 + (h % 6), 14, 0)
      entries.push({
        id: `${goal.id}-a0`,
        type: 'approval',
        dateLabel: label(when),
        actorName: reviewer?.name ?? 'Manager',
        approver: reviewer?.name ?? 'Manager',
        approvalStatus: 'Approved',
      })
    }

    // Goal created — always the oldest entry.
    entries.push({
      id: `${goal.id}-c0`,
      type: 'created',
      dateLabel: label(created),
      actorName: ownerName,
    })

    // Recorded (real) events first, then comments, then the deterministic
    // baseline (progress, approval, created).
    const recordedEntries = [...(recorded.value[goal.id] ?? [])].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    return [...recordedEntries, ...commentEntries, ...entries]
  }

  // Wipe all recorded events (used by the header's "Reset demo data").
  function clearRecorded() {
    recorded.value = {}
    if (import.meta.client) localStorage.removeItem(ACTIVITY_KEY)
  }

  return { activityFor, logActivity, clearRecorded }
}
