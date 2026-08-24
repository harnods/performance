// The one-goal-at-a-time drawer only makes sense for a single owner — past
// that, point them at the import flow instead. Checked right when "Select
// employees" is saved (not after landing on the New goals page), so the
// warning shows before the user commits to the manual flow at all.
export const MANUAL_CREATE_OWNER_LIMIT = 1

export function useBulkOwnerGate(cycleId: () => string) {
  const router = useRouter()
  const importSuggestionOpen = ref(false)
  // Kept so the drawer can be reopened pre-filled with the same selection —
  // manual creation is a hard block past the limit, not a nag, so the only
  // ways out of the modal are trimming the selection or importing instead.
  const pendingEmployeeIds = ref<string[]>([])

  function continueToNewGoals(employeeIds: string[]) {
    if (employeeIds.length > MANUAL_CREATE_OWNER_LIMIT) {
      pendingEmployeeIds.value = employeeIds
      importSuggestionOpen.value = true
      return
    }
    router.push({ path: `/goals/goal-cycles/${cycleId()}/new`, query: { employees: employeeIds.join(',') } })
  }

  function goToImport() {
    importSuggestionOpen.value = false
    router.push({ path: `/goals/goal-cycles/${cycleId()}/import`, query: { employees: pendingEmployeeIds.value.join(',') } })
  }

  return { importSuggestionOpen, pendingEmployeeIds, continueToNewGoals, goToImport }
}
