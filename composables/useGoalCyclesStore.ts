import { employeeById } from '~/utils/employees'

export type GoalCycleStatus = 'Active' | 'Inactive'
export type ProgressUpdateMethod = 'manual' | 'log-based'

// Status is DERIVED from the period, never stored: the cycle whose period spans
// today is "Active"; past and future cycles are "Inactive".
export function goalCycleStatus(cycle: Pick<GoalCycle, 'startDate' | 'endDate'>): GoalCycleStatus {
  const today = new Date()
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const start = new Date(cycle.startDate).getTime()
  const end = new Date(cycle.endDate).getTime()
  return t >= start && t <= end ? 'Active' : 'Inactive'
}

export interface GoalCycle {
  id: string
  name: string
  period: string
  startDate: string // ISO yyyy-mm-dd — a goal's own period (see utils/goalSchedule) defaults to and is bounded by this
  endDate: string // ISO yyyy-mm-dd
  progressUpdateMethod: ProgressUpdateMethod
  weightMandatory: boolean
  status: GoalCycleStatus // derived from the period (see goalCycleStatus), never persisted
  updatedAt?: string // ISO datetime — stamped on create/edit, shown on the Goal cycle info tab
  updatedBy?: string
  // True only for cycles CREATED in the new Goals UI. Pre-seeded cycles are
  // treated as carried over from the old UI (flag absent) — those don't block
  // reverting to the old interface; a new-UI-created cycle does.
  createdInNewUi?: boolean
  // The synthetic cycle that groups goals migrated from the OLD Goals UI (which
  // had no goal-cycle concept). Read-only historical bucket.
  isArchive?: boolean
}

// What we actually store — status is computed on read, so it's never persisted.
type StoredGoalCycle = Omit<GoalCycle, 'status'>

const STORAGE_KEY = 'talenta-goal-cycles-db'

function seed(): StoredGoalCycle[] {
  return [
    {
      id: 'seed-26-h1',
      name: '26 H1',
      period: 'H1 2026 (1 Jan - 30 Jun 2026)',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      progressUpdateMethod: 'manual',
      weightMandatory: true,
      updatedAt: '2025-12-20T14:50:00',
      updatedBy: 'Rizal Candra',
    },
    {
      id: 'seed-26-h2',
      name: '26 H2',
      period: 'H2 2026 (1 Jul - 31 Dec 2026)',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      progressUpdateMethod: 'manual',
      weightMandatory: true,
      updatedAt: '2026-06-25T10:00:00',
      updatedBy: 'Rizal Candra',
    },
    {
      id: 'seed-27-h1',
      name: '27 H1',
      period: 'H1 2027 (1 Jan - 30 Jun 2027)',
      startDate: '2027-01-01',
      endDate: '2027-06-30',
      progressUpdateMethod: 'manual',
      weightMandatory: true,
      updatedAt: '2026-07-30T09:00:00',
      updatedBy: 'Rizal Candra',
    },
    {
      // Goals from the old UI (no cycle concept) grouped here on upgrade.
      id: 'archive-legacy',
      name: 'Other goals',
      period: 'Range (2020 - 2025)',
      startDate: '2020-01-01',
      endDate: '2025-12-31',
      progressUpdateMethod: 'manual',
      weightMandatory: false,
      updatedAt: '2025-12-31T17:00:00',
      updatedBy: 'System',
      isArchive: true,
    },
  ]
}

// Module-scope singleton — shared reactive "mini DB" for this demo prototype.
// Bump whenever seed()/GoalCycle's shape changes in a way stale localStorage
// would contradict (e.g. adding startDate/endDate) — same guard pattern as
// useGoalsStore's SEED_VERSION.
const SEED_VERSION = 6
const rawCycles = ref<StoredGoalCycle[]>(seed())
// Public list with status derived from each period. Sorted latest-period-first
// (by start date, descending) — a future cycle sits above the current one even
// though it's Inactive.
const cycles = computed<GoalCycle[]>(() =>
  [...rawCycles.value]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .map(c => ({ ...c, status: goalCycleStatus(c) })),
)
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, cycles: rawCycles.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.cycles)) {
        rawCycles.value = parsed.cycles
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
    const { currentUserId } = useCurrentUser()
    const stored: StoredGoalCycle = {
      id: `cycle-${rawCycles.value.length}-${input.name}`,
      ...input,
      updatedAt: new Date().toISOString(),
      updatedBy: employeeById(currentUserId.value)?.name,
      createdInNewUi: true,
    }
    rawCycles.value = [...rawCycles.value, stored]
    persist()
    return { ...stored, status: goalCycleStatus(stored) }
  }

  function updateCycle(id: string, input: {
    name: string
    period: string
    startDate: string
    endDate: string
    progressUpdateMethod: ProgressUpdateMethod
    weightMandatory: boolean
  }) {
    const { currentUserId } = useCurrentUser()
    rawCycles.value = rawCycles.value.map(c => (c.id === id
      ? { ...c, ...input, updatedAt: new Date().toISOString(), updatedBy: employeeById(currentUserId.value)?.name }
      : c))
    persist()
  }

  function deleteCycle(id: string) {
    rawCycles.value = rawCycles.value.filter(c => c.id !== id)
    persist()
  }

  function resetToSeed() {
    rawCycles.value = seed()
    persist()
  }

  return { cycles, addCycle, updateCycle, deleteCycle, resetToSeed }
}
