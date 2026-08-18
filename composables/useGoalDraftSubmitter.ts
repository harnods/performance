// Shared "Publish"/"Submit for approval" flow for DRAFT goals. Mirrors
// new.vue's own Save routing (persistAndLeave): an owner with no manager has
// nobody to approve them, so their drafts publish straight to active; every
// other owner's drafts queue for their manager's approval instead. Mirrors
// useGoalCloser: the draft is queued as an edit that clears isDraft, because
// the approval queue already applies edits on approve (updateGoal with
// `after`).
//
// A queued draft stays in the goals table the whole time — it just swaps its
// Draft badge for "Awaiting approval" while the decision is pending. That's
// why this submits an `edit` on the existing goal rather than a `create`: the
// draft row already exists, so a `create` would publish a second copy on
// approve.
//
// Approve/reject consensus is a backend concern — a batch created for several
// employees at once and a goal added to one employee later both submit the
// same way from here.

import { toast } from '@mekari/pixel3'
import type { Goal } from './useGoalsStore'

export function useGoalDraftSubmitter() {
  const { updateGoal } = useGoalsStore()
  const { logActivity } = useGoalActivityStore()
  const { createSubmission } = useGoalApprovalsStore()

  // Publishes one or more draft goals at once — used both for a single row
  // and for an owner's whole "Publish N goals" batch. Every goal is expected
  // to already be isDraft; goals are grouped by owner because the
  // needs-approval decision is per OWNER, not per goal.
  function publishDrafts(draftGoals: Goal[]) {
    if (draftGoals.length === 0) return
    const byOwner = new Map<string, Goal[]>()
    for (const goal of draftGoals) {
      const arr = byOwner.get(goal.ownerId)
      if (arr) arr.push(goal)
      else byOwner.set(goal.ownerId, [goal])
    }

    let anyQueued = false
    let anyDirect = false
    for (const [ownerId, ownerGoals] of byOwner) {
      if (needsApproval(ownerId)) {
        anyQueued = true
        createSubmission(
          ownerGoals.map((goal) => {
            const { cycleId, ...rest } = goal
            return {
              type: 'edit' as const,
              goalId: goal.id,
              ownerId: goal.ownerId,
              cycleId: goal.cycleId,
              before: goal,
              // What "approved" means for a draft: it stops being one.
              after: { ...rest, isDraft: false, isAwaitingApproval: false },
            }
          }),
          ownerId,
          ownerGoals[0].cycleId,
        )
        // Flip each row's own badge right away — the submission is pending,
        // so the goal is no longer an editable draft.
        for (const goal of ownerGoals) {
          updateGoal(goal.id, { isAwaitingApproval: true })
          logActivity(goal.id, { type: 'event', wording: 'submitted the goal for approval.' })
        }
      }
      else {
        anyDirect = true
        for (const goal of ownerGoals) {
          updateGoal(goal.id, { isDraft: false, isAwaitingApproval: false })
          logActivity(goal.id, { type: 'event', wording: 'published this goal.' })
        }
      }
    }

    const count = draftGoals.length
    const noun = count === 1 ? 'goal' : 'goals'
    const title = !anyQueued
      ? `${count} ${noun} published`
      : !anyDirect
          ? `${count} ${noun} sent for approval`
          : `${count} ${noun} published — some sent for approval`
    toast.notify({ id: 'goal-draft-published', position: 'top-center', variant: 'success', title })
  }

  function submitDraftForApproval(goal: Goal) {
    publishDrafts([goal])
  }

  return { submitDraftForApproval, publishDrafts }
}
