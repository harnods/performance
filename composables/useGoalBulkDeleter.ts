// Shared "Delete selected goals" confirmation flow for the bulk-select
// action bar — same confirm-modal + persisted-delete pattern as
// useGoalDeleter, just applied to every currently-selected id at once.

import { toast } from '@mekari/pixel3'

export function useGoalBulkDeleter() {
  const { deleteGoal } = useGoalsStore()

  const isBulkDeleteModalOpen = ref(false)

  function confirmBulkDelete(ids: string[]) {
    ids.forEach(id => deleteGoal(id))
    toast.notify({
      id: 'goals-bulk-deleted',
      position: 'top-center',
      variant: 'success',
      title: `${ids.length} goal${ids.length === 1 ? '' : 's'} deleted`,
    })
    isBulkDeleteModalOpen.value = false
  }

  return {
    isBulkDeleteModalOpen,
    confirmBulkDelete,
  }
}
