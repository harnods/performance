// Shared "Edit goal" drawer flow — reused by every page that lists goals
// (All goals, Company/Organization/Team/Individual goals, and the New
// goals page's own already-saved rows) so the Edit action wired into each
// of those tables behaves identically everywhere.

import { toast } from '@mekari/pixel3'
import { employeeById } from '~/utils/employees'
import type { DraftGoal } from '~/utils/goalDraft'
import { draftFromGoal, goalFromDraft } from '~/utils/goalMapping'
import type { Goal } from './useGoalsStore'

export function useGoalEditor() {
  const { goals: allGoals, updateGoal } = useGoalsStore()
  const { createSubmission } = useGoalApprovalsStore()

  const isEditDrawerOpen = ref(false)
  const editingGoal = ref<Goal | null>(null)

  const editingDraft = computed<DraftGoal | null>(() => {
    if (!editingGoal.value) return null
    const owner = employeeById(editingGoal.value.ownerId)
    return owner ? draftFromGoal(editingGoal.value, owner) : null
  })
  const editingOwners = computed(() => {
    const owner = editingGoal.value ? employeeById(editingGoal.value.ownerId) : undefined
    return owner ? [owner] : []
  })

  // The weight budget the drawer should validate against is the owner's
  // existing total *excluding the goal being edited itself* — otherwise
  // editing a goal's weight would immediately look like it's colliding
  // with its own old value.
  const alreadyUsedWeightForEdit = computed(() => {
    if (!editingGoal.value) return 0
    return allGoals.value
      .filter(g => g.cycleId === editingGoal.value!.cycleId && g.ownerId === editingGoal.value!.ownerId && g.id !== editingGoal.value!.id)
      .reduce((sum, g) => sum + g.weight, 0)
  })

  function openEditGoal(goal: Goal) {
    editingGoal.value = goal
    isEditDrawerOpen.value = true
  }

  function saveEdit(draft: DraftGoal) {
    if (!editingGoal.value) return
    const owner = employeeById(editingGoal.value.ownerId)
    if (!owner) return
    const updated = goalFromDraft(draft, owner, editingGoal.value.isDraft ?? false)

    const { cycles } = useGoalCyclesStore()
    const cycle = cycles.value.find(c => c.id === editingGoal.value!.cycleId)
    if (cycle?.weightMandatory) {
      const combined = alreadyUsedWeightForEdit.value + updated.weight
      if (combined !== 100) {
        toast.notify({
          id: 'goal-edit-weight-error',
          position: 'top-center',
          variant: 'error',
          title: `${owner.name}'s total goal weight would be ${combined}% — it must equal exactly 100%.`,
        })
        return
      }
    }

    // A direct report's edit goes to the approval queue instead of taking
    // effect immediately — the live goal is untouched until a manager
    // approves it (composables/useGoalApprovalsStore.ts).
    if (needsApproval(editingGoal.value.ownerId)) {
      createSubmission(
        [{ type: 'edit', goalId: editingGoal.value.id, ownerId: owner.id, cycleId: editingGoal.value.cycleId, before: editingGoal.value, after: updated }],
        owner.id,
        editingGoal.value.cycleId,
      )
      isEditDrawerOpen.value = false
      toast.notify({
        id: 'goal-edit-submitted',
        position: 'top-center',
        variant: 'success',
        title: 'Edit submitted for approval',
      })
      return
    }
    updateGoal(editingGoal.value.id, updated)
    useGoalActivityStore().logActivity(editingGoal.value.id, { type: 'event', wording: 'edited the goal details.' })
    isEditDrawerOpen.value = false
    toast.notify({
      id: 'goal-updated',
      position: 'top-center',
      variant: 'success',
      title: 'Goal updated',
    })
  }

  return {
    isEditDrawerOpen,
    editingGoal,
    editingDraft,
    editingOwners,
    alreadyUsedWeightForEdit,
    openEditGoal,
    saveEdit,
  }
}
