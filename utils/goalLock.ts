// ─────────────────────────────────────────────────────────────────────────────
// Locked progress — when a goal is closed, the goals aligned to it (its direct
// children) can no longer update their progress. The lock is DERIVED from the
// parent's `isClosed`, never stored, so removing the alignment (or the parent
// closing/never closing) always yields the right state with nothing to undo.
// Direct children only (one level). Edit / Align stay allowed.
// ─────────────────────────────────────────────────────────────────────────────

interface LockGoal { id: string, alignedToId?: string, isClosed?: boolean }

// Shared tooltip for every disabled "Update progress" action and the
// index-row badge (UX writing review: no period).
export const PROGRESS_LOCKED_TOOLTIP = 'Progress locked because the parent goal is closed'
// A locked goal's key results can't be added, edited or deleted either (Goal Detail).
export const KEY_RESULTS_LOCKED_TOOLTIP = 'Key results locked because the parent goal is closed'
// A closed goal's own key results can't be added or edited either (Delete stays).
export const KEY_RESULTS_CLOSED_TOOLTIP = 'Key results locked because this goal is closed'

// The closed parent that locks this goal, if any. A goal that is itself closed
// is already read-only, so it is never "locked" on top of that.
export function lockingParentOf<T extends LockGoal>(goal: LockGoal, allGoals: T[]): T | undefined {
  if (goal.isClosed || !goal.alignedToId) return undefined
  return allGoals.find(g => g.id === goal.alignedToId && g.isClosed)
}

export function isProgressLocked(goal: LockGoal, allGoals: LockGoal[]): boolean {
  return !!lockingParentOf(goal, allGoals)
}

// Every goal aligned to `goal` (open or closed) — what deleting it would un-align.
export function alignedChildCount(goal: { id: string }, allGoals: LockGoal[]): number {
  return allGoals.filter(g => g.alignedToId === goal.id).length
}

// Aligned goals that closing `goal` would lock — children that are still open.
export function openAlignedCount(goal: { id: string }, allGoals: LockGoal[]): number {
  return allGoals.filter(g => g.alignedToId === goal.id && !g.isClosed).length
}
