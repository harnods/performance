import { employeeById } from '~/utils/employees'
import { CURRENT_USER_ID } from './useGoalsStore'

export type GoalCycleStatus = 'Current goal' | 'Inactive goals' | 'Past goal'
export type ProgressUpdateMethod = 'manual' | 'log-based'

export interface GoalCycle {
  id: string
  name: string
  period: string
  startDate: string // ISO yyyy-mm-dd — a goal's own period (see utils/goalSchedule) defaults to and is bounded by this
  endDate: string // ISO yyyy-mm-dd
  progressUpdateMethod: ProgressUpdateMethod
  weightMandatory: boolean
  status: GoalCycleStatus
  updatedAt?: string // ISO datetime — stamped on create/edit, shown on the Goal cycle info tab
  updatedBy?: string
}

const STORAGE_KEY = 'talenta-goal-cycles-db'

function seed(): GoalCycle[] {
  return [
    {
      id: 'seed-26-h1',
      name: '26 H1',
      period: 'H1 2026 (1 Jan - 30 Jun 2026)',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      progressUpdateMethod: 'manual',
      weightMandatory: true,
      status: 'Current goal',
      updatedAt: '2025-12-20T14:50:00',
      updatedBy: 'Rizal Candra',
    },
  ]
}

// Module-scope singleton — shared reactive "mini DB" for this demo prototype.
// Bump whenever seed()/GoalCycle's shape changes in a way stale localStorage
// would contradict (e.g. adding startDate/endDate) — same guard pattern as
// useGoalsStore's SEED_VERSION.
const SEED_VERSION = 3
const cycles = ref<GoalCycle[]>(seed())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, cycles: cycles.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.cycles)) {
        cycles.value = parsed.cycles
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

export function useGoalCyclesStore() {
  loadFromStorage()

  function addCycle(input: {
    name: string
    period: string
    startDate: string
    endDate: string
    progressUpdateMethod: ProgressUpdateMethod
    weightMandatory: boolean
  }): GoalCycle {
    const created: GoalCycle = {
      id: `cycle-${cycles.value.length}-${input.name}`,
      status: 'Inactive goals',
      ...input,
      updatedAt: new Date().toISOString(),
      updatedBy: employeeById(CURRENT_USER_ID)?.name,
    }
    cycles.value = [...cycles.value, created]
    persist()
    return created
  }

  function updateCycle(id: string, input: {
    name: string
    period: string
    startDate: string
    endDate: string
    progressUpdateMethod: ProgressUpdateMethod
    weightMandatory: boolean
  }) {
    cycles.value = cycles.value.map(c => (c.id === id
      ? { ...c, ...input, updatedAt: new Date().toISOString(), updatedBy: employeeById(CURRENT_USER_ID)?.name }
      : c))
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
