// Locked progress (see utils/goalLock.ts): a goal whose parent is closed can no
// longer update its progress. Reads the whole goal store so a parent in another
// cycle still counts. `lockTip` is the shared tooltip copy.
import { isProgressLocked, PROGRESS_LOCKED_TOOLTIP } from '~/utils/goalLock'

export function useGoalProgressLock() {
  const { goals } = useGoalsStore()
  const lockedIds = computed(() => new Set(goals.value.filter(g => isProgressLocked(g, goals.value)).map(g => g.id)))
  function isLocked(id: string): boolean { return lockedIds.value.has(id) }
  return { isLocked, lockTip: PROGRESS_LOCKED_TOOLTIP }
}
