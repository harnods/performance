// Shared "Submit for approval" flow for DRAFT goals. Mirrors useGoalCloser:
// the draft is queued as an edit that clears isDraft, because the approval
// queue already applies edits on approve (updateGoal with `after`).
//
// The goal stays in the goals table the whole time — it just swaps its Draft
// badge for "Awaiting approval" while the decision is pending. That's why this
// submits an `edit` on the existing goal rather than a `create`: the draft row
// already exists, so a `create` would publish a second copy on approve.
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

  function submitDraftForApproval(goal: Goal) {
    const { cycleId, ...rest } = goal
    createSubmission(
      [{
        type: 'edit',
        goalId: goal.id,
        ownerId: goal.ownerId,
        cycleId: goal.cycleId,
        before: goal,
        // What "approved" means for a draft: it stops being one.
        after: { ...rest, isDraft: false, isAwaitingApproval: false },
      }],
      goal.ownerId,
      goal.cycleId,
    )
    // Flip the row's own badge right away — the submission is pending, so the
    // goal is no longer an editable draft.
    updateGoal(goal.id, { isAwaitingApproval: true })
    logActivity(goal.id, { type: 'event', wording: 'submitted the goal for approval.' })
    toast.notify({
      id: 'goal-draft-submitted',
      position: 'top-center',
      variant: 'success',
      title: 'Goal sent for approval',
    })
  }

  return { submitDraftForApproval }
}
