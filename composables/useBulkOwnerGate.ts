// The one-goal-at-a-time drawer only makes sense for a single owner — past
// that, point them at the import flow instead. Checked right when "Select
// employees" is saved (not after landing on the New goals page), so the
// warning shows before the user commits to the manual flow at all.
export const MANUAL_CREATE_OWNER_LIMIT = 1

export function useBulkOwnerGate(cycleId: () => string) {
  const router = useRouter()
  const importSuggestionOpen = ref(false)
  // The full attempted selection (past the limit) — carried through to the
  // Import flow on "Import goals" so nobody has to re-pick everyone they'd
  // already chosen there.
  const attemptedEmployeeIds = ref<string[]>([])
  // What SelectEmployeesDrawer reopens pre-filled with on the modal's
  // "Cancel" — capped at the limit, so whichever employee's pick pushed the
  // count over the top stays unselected in the drawer's left "Available"
  // column instead of coming back already checked into "Selected" (which
  // would let them immediately re-trigger the modal by adding yet another).
  const pendingEmployeeIds = computed(() => attemptedEmployeeIds.value.slice(0, MANUAL_CREATE_OWNER_LIMIT))

  function continueToNewGoals(employeeIds: string[]) {
    if (employeeIds.length > MANUAL_CREATE_OWNER_LIMIT) {
      attemptedEmployeeIds.value = employeeIds
      importSuggestionOpen.value = true
      return
    }
    router.push({ path: `/goals/goal-cycles/${cycleId()}/new`, query: { employees: employeeIds.join(',') } })
  }

  function goToImport() {
    importSuggestionOpen.value = false
    router.push({ path: `/goals/goal-cycles/${cycleId()}/import`, query: { employees: attemptedEmployeeIds.value.join(',') } })
  }

  return { importSuggestionOpen, pendingEmployeeIds, continueToNewGoals, goToImport }
}
