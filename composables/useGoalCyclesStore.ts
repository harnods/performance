export type GoalCycleStatus = 'Current goal' | 'Inactive goals' | 'Past goal'
export type ProgressUpdateMethod = 'manual' | 'log-based'

export interface GoalCycle {
  id: string
  name: string
  period: string
  progressUpdateMethod: ProgressUpdateMethod
  weightMandatory: boolean
  status: GoalCycleStatus
}

const STORAGE_KEY = 'talenta-goal-cycles-db'

function seed(): GoalCycle[] {
  return [
    {
      id: 'seed-26-h1',
      name: '26 H1',
      period: 'H1 2026 (1 Jan - 30 Jun 2026)',
      progressUpdateMethod: 'manual',
      weightMandatory: true,
      status: 'Current goal',
    },
  ]
}

// Module-scope singleton — shared reactive "mini DB" for this demo prototype.
const cycles = ref<GoalCycle[]>(seed())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles.value))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      cycles.value = JSON.parse(raw)
      return
    }
    catch {
      // fall through to re-seed on corrupt storage
    }
  }
  persist()
}

export function useGoalCyclesStore() {
  loadFromStorage()

  function addCycle(input: {
    name: string
    period: string
    progressUpdateMethod: ProgressUpdateMethod
    weightMandatory: boolean
  }): GoalCycle {
    const created: GoalCycle = { id: `cycle-${cycles.value.length}-${input.name}`, status: 'Inactive goals', ...input }
    cycles.value = [...cycles.value, created]
    persist()
    return created
  }

  function updateCycle(id: string, input: {
    name: string
    period: string
    progressUpdateMethod: ProgressUpdateMethod
    weightMandatory: boolean
  }) {
    cycles.value = cycles.value.map(c => (c.id === id ? { ...c, ...input } : c))
    persist()
  }

  function deleteCycle(id: string) {
    cycles.value = cycles.value.filter(c => c.id !== id)
    persist()
  }

  function resetToSeed() {
    cycles.value = seed()
    persist()
  }

  return { cycles, addCycle, updateCycle, deleteCycle, resetToSeed }
}
