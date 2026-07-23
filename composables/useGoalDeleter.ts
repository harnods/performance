// Shared "Delete goal" confirmation flow — reused by every page that lists
// goals, mirroring the same confirm-modal pattern already used for
// deleting a whole goal cycle (pages/goals/goal-cycles/index.vue).

import { toast } from '@mekari/pixel3'
import type { Goal } from './useGoalsStore'

export function useGoalDeleter() {
  const { deleteGoal } = useGoalsStore()
  const { createSubmission } = useGoalApprovalsStore()

  const isDeleteModalOpen = ref(false)
  const goalToDelete = ref<Goal | null>(null)

  function askDeleteGoal(goal: Goal) {
    goalToDelete.value = goal
    isDeleteModalOpen.value = true
  }

  function confirmDeleteGoal() {
    if (!goalToDelete.value) return
    // A direct report's delete request goes to the approval queue instead
    // of removing the goal immediately — it stays live until a manager
    // approves the deletion (composables/useGoalApprovalsStore.ts).
    if (needsApproval(goalToDelete.value.ownerId)) {
      createSubmission(
        [{ type: 'delete', goalId: goalToDelete.value.id, ownerId: goalToDelete.value.ownerId, cycleId: goalToDelete.value.cycleId, before: goalToDelete.value }],
        goalToDelete.value.ownerId,
        goalToDelete.value.cycleId,
      )
      toast.notify({
        id: 'goal-delete-submitted',
        position: 'top-center',
        variant: 'success',
        title: 'Delete request sent for approval',
      })
      isDeleteModalOpen.value = false
      goalToDelete.value = null
      return
    }
    deleteGoal(goalToDelete.value.id)
    toast.notify({
      id: 'goal-deleted',
      position: 'top-center',
      variant: 'success',
      title: 'Goal deleted',
    })
    isDeleteModalOpen.value = false
    goalToDelete.value = null
  }

  return {
    isDeleteModalOpen,
    goalToDelete,
    askDeleteGoal,
    confirmDeleteGoal,
  }
}
