// Shared "Delete selected goals" confirmation flow for the bulk-select
// action bar — same confirm-modal + persisted-delete pattern as
// useGoalDeleter, just applied to every currently-selected id at once.

import { toast } from '@mekari/pixel3'

export function useGoalBulkDeleter() {
  const { goals, deleteGoal } = useGoalsStore()
  const { createSubmission } = useGoalApprovalsStore()

  const isBulkDeleteModalOpen = ref(false)

  // A direct report's goals go to the approval queue (one delete
  // submission per owner) instead of being removed immediately; everyone
  // else's selected goals still delete right away, same as before.
  function confirmBulkDelete(ids: string[]) {
    const toDelete = ids.map(id => goals.value.find(g => g.id === id)).filter((g): g is NonNullable<typeof g> => !!g)
    const queued = toDelete.filter(g => needsApproval(g.ownerId))
    const direct = toDelete.filter(g => !needsApproval(g.ownerId))

    const queuedByOwner = new Map<string, typeof queued>()
    for (const g of queued) {
      const list = queuedByOwner.get(g.ownerId) ?? []
      list.push(g)
      queuedByOwner.set(g.ownerId, list)
    }
    for (const [ownerId, ownerGoals] of queuedByOwner) {
      createSubmission(
        ownerGoals.map(g => ({ type: 'delete' as const, goalId: g.id, ownerId: g.ownerId, cycleId: g.cycleId, before: g })),
        ownerId,
        ownerGoals[0].cycleId,
      )
    }

    direct.forEach(g => deleteGoal(g.id))

    if (direct.length) {
      toast.notify({
        id: 'goals-bulk-deleted',
        position: 'top-center',
        variant: 'success',
        title: `${direct.length} goal${direct.length === 1 ? '' : 's'} deleted`,
      })
    }
    if (queued.length) {
      toast.notify({
        id: 'goals-bulk-delete-submitted',
        position: 'top-center',
        variant: 'success',
        title: `${queued.length} delete request${queued.length === 1 ? '' : 's'} sent for approval`,
      })
    }
    isBulkDeleteModalOpen.value = false
  }

  return {
    isBulkDeleteModalOpen,
    confirmBulkDelete,
  }
}
