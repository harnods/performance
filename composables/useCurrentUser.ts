// Who's "logged in" for this demo — a runtime-switchable persona (not a
// build-time constant) so the header's "View as" dropdown can flip between
// a handful of representative org-chart positions. Same module-scope
// singleton + localStorage pattern as useGoalsStore.ts / useGoalCyclesStore.ts.

const STORAGE_KEY = 'talenta-current-user'
const DEFAULT_USER_ID = 'rio'

const currentUserId = ref<string>(DEFAULT_USER_ID)
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, currentUserId.value)
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) currentUserId.value = raw
  else persist()
}

// Fixed set of 3 representative org-chart positions for the header's "View
// as" switcher — not a full employee picker, per the actual request: one
// CEO/Super Admin, one manager (has direct reports), one individual
// contributor (has none).
export const VIEW_AS_PERSONAS = [
  { id: 'rizal', label: 'Rizal Candra', role: 'CEO · Super Admin' },
  { id: 'rio', label: 'Rio Priyono', role: 'Manager' },
  { id: 'daud', label: 'Daud Dimas Prasetyo', role: 'Employee' },
] as const

export function useCurrentUser() {
  loadFromStorage()

  function setCurrentUser(id: string) {
    currentUserId.value = id
    persist()
  }

  return { currentUserId, setCurrentUser }
}
