// Shared "Close goal" flow — single + bulk. Mirrors delete/edit: a direct
// report's close goes to the approval queue (as a progress/definition edit that
// sets isClosed), everyone else closes immediately. Prod parity: no progress
// threshold, confirm before closing.

import { toast } from '@mekari/pixel3'
import type { Goal } from './useGoalsStore'
import { openAlignedCount } from '~/utils/goalLock'

export function useGoalCloser() {
  const { updateGoal, goals: allGoals } = useGoalsStore()
  const { logActivity } = useGoalActivityStore()
  const { createSubmission } = useGoalApprovalsStore()

  const isCloseModalOpen = ref(false)
  const goalToClose = ref<Goal | null>(null)
  // Open aligned goals that closing this goal would lock — drives the modal's
  // aligned-goals copy variant.
  const closeAlignedCount = computed(() => goalToClose.value ? openAlignedCount(goalToClose.value, allGoals.value) : 0)

  function applyClose(g: Goal) {
    updateGoal(g.id, { isClosed: true })
    logActivity(g.id, { type: 'event', wording: 'closed the goal.' })
  }
  // A close needing approval is submitted as an edit that flips isClosed — the
  // approval queue already applies edits on approve (updateGoal with `after`).
  function submitClose(g: Goal) {
    const { cycleId, ...rest } = g
    createSubmission(
      [{ type: 'edit', goalId: g.id, ownerId: g.ownerId, cycleId: g.cycleId, before: g, after: { ...rest, isClosed: true } }],
      g.ownerId,
      g.cycleId,
    )
  }

  // ─── Single ───────────────────────────────────────────────────────────────
  function askCloseGoal(goal: Goal) {
    goalToClose.value = goal
    isCloseModalOpen.value = true
  }
  // The modal holds a snapshot — re-read the store so a stale/duplicate confirm can't close (and log) twice.
  const isAlreadyClosed = (g: Goal) => !!allGoals.value.find(x => x.id === g.id)?.isClosed
  function confirmCloseGoal() {
    const g = goalToClose.value
    if (!g) return
    if (isAlreadyClosed(g)) {
      isCloseModalOpen.value = false
      goalToClose.value = null
      return
    }
    if (needsApproval(g.ownerId)) {
      submitClose(g)
      toast.notify({ id: 'goal-close-submitted', position: 'top-center', variant: 'success', title: 'Close request sent for approval' })
    } else {
      applyClose(g)
      toast.notify({ id: 'goal-closed', position: 'top-center', variant: 'success', title: 'Goal successfully closed' })
    }
    isCloseModalOpen.value = false
    goalToClose.value = null
  }

  // ─── Bulk ───────────────────────────────────────────────────────────────
  const isBulkCloseModalOpen = ref(false)
  const goalsToClose = ref<Goal[]>([])
  // How many of the selected goals have open aligned goals.
  const bulkAlignedParentCount = computed(() => goalsToClose.value.filter(g => openAlignedCount(g, allGoals.value) > 0).length)
  function askBulkClose(goals: Goal[]) {
    goalsToClose.value = goals
    if (goals.length) isBulkCloseModalOpen.value = true
  }
  function confirmBulkClose() {
    const list = goalsToClose.value.filter(g => !isAlreadyClosed(g))
    if (!list.length) {
      isBulkCloseModalOpen.value = false
      goalsToClose.value = []
      return
    }
    const needApproval = list.filter(g => needsApproval(g.ownerId))
    const immediate = list.filter(g => !needsApproval(g.ownerId))
    immediate.forEach(applyClose)
    // One approval submission per owner (batch their goals together).
    const byOwner = new Map<string, Goal[]>()
    for (const g of needApproval) byOwner.set(g.ownerId, [...(byOwner.get(g.ownerId) ?? []), g])
    for (const [ownerId, gs] of byOwner) {
      createSubmission(
        gs.map((g) => { const { cycleId, ...rest } = g; return { type: 'edit' as const, goalId: g.id, ownerId, cycleId: g.cycleId, before: g, after: { ...rest, isClosed: true } } }),
        ownerId,
        gs[0].cycleId,
      )
    }
    const parts: string[] = []
    if (immediate.length) parts.push(`${immediate.length} closed`)
    if (needApproval.length) parts.push(`${needApproval.length} sent for approval`)
    toast.notify({ id: 'goals-bulk-closed', position: 'top-center', variant: 'success', title: parts.join(' · ') || 'Goals closed' })
    isBulkCloseModalOpen.value = false
    goalsToClose.value = []
  }

  return {
    isCloseModalOpen, goalToClose, askCloseGoal, confirmCloseGoal, closeAlignedCount,
    isBulkCloseModalOpen, goalsToClose, askBulkClose, confirmBulkClose, bulkAlignedParentCount,
  }
}
