// Past this many people the one-goal-at-a-time drawer is the wrong tool —
// point them at the import flow instead. Checked right when "Select
// employees" is saved (not after landing on the New goals page), so the
// warning shows before the user commits to the bulk flow at all.
export const BULK_OWNER_LIMIT = 25

export function useBulkOwnerGate(cycleId: () => string) {
  const router = useRouter()
  const importSuggestionOpen = ref(false)
  // Kept so the drawer can be reopened pre-filled with the same selection —
  // manual creation is a hard block past the limit, not a nag, so the only
  // ways out of the modal are trimming the selection or importing instead.
  const pendingEmployeeIds = ref<string[]>([])

  function continueToNewGoals(employeeIds: string[]) {
    if (employeeIds.length > BULK_OWNER_LIMIT) {
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
