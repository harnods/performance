import { seedAssignments, type CompetencyAssignment } from '~/utils/competencyAssignments'

// Reactive mini-DB for competency assignments — persisted to localStorage so a
// created/edited assignment shows up in the list & detail and survives reload.
// Seeded from utils/competencyAssignments (grounded in the shared competency data).
const STORAGE_KEY = 'talenta-competency-assignments-db'
const SEED_VERSION = 1

const rawAssignments = ref<CompetencyAssignment[]>(seedAssignments())
let loaded = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, assignments: rawAssignments.value }))
}
function loadFromStorage() {
  if (loaded || !import.meta.client) return
  loaded = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.assignments)) {
        rawAssignments.value = parsed.assignments
        return
      }
    }
    catch { /* re-seed on corrupt/outdated storage */ }
  }
  persist()
}

export function useCompetencyStore() {
  loadFromStorage()

  const assignments = rawAssignments
  function assignmentById(id: string): CompetencyAssignment | undefined { return rawAssignments.value.find(a => a.id === id) }

  function addAssignment(a: CompetencyAssignment): CompetencyAssignment {
    // Ensure a unique id if the derived one already exists.
    let id = a.id
    let n = 2
    while (rawAssignments.value.some(x => x.id === id)) id = `${a.id}-${n++}`
    const created = { ...a, id }
    rawAssignments.value = [...rawAssignments.value, created]
    persist()
    return created
  }
  function updateAssignment(id: string, patch: Partial<CompetencyAssignment>) {
    rawAssignments.value = rawAssignments.value.map(a => (a.id === id ? { ...a, ...patch } : a))
    persist()
  }
  function deleteAssignment(id: string) {
    rawAssignments.value = rawAssignments.value.filter(a => a.id !== id)
    persist()
  }
  function resetToSeed() { rawAssignments.value = seedAssignments(); persist() }

  return { assignments, assignmentById, addAssignment, updateAssignment, deleteAssignment, resetToSeed }
}
