import { SUCCESSION_POOLS, type SuccessionPool, type SuccessorTalent } from '~/utils/succession'
import { employeeById, type Employee } from '~/utils/employees'

// Shared reactive "mini DB" for succession pools — persisted to localStorage so
// a plan created in the wizard shows up in the index/detail and survives reload.
// Seeded from utils/succession SUCCESSION_POOLS. Bump SEED_VERSION when the pool
// shape changes in a way stale storage would contradict.
const STORAGE_KEY = 'talenta-succession-pools-db'
const SEED_VERSION = 1

function seed(): SuccessionPool[] {
  return SUCCESSION_POOLS.map(p => ({ ...p, successors: p.successors.map(s => ({ ...s })) }))
}

const rawPools = ref<SuccessionPool[]>(seed())
let loaded = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, pools: rawPools.value }))
}
function loadFromStorage() {
  if (loaded || !import.meta.client) return
  loaded = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.pools)) {
        rawPools.value = parsed.pools
        return
      }
    }
    catch { /* re-seed on corrupt/outdated storage */ }
  }
  persist()
}

// One flattened row per successor across all pools (Employee view).
export interface EmployeeRow {
  employee: Employee
  keyPosition: string
  organization: string
  readiness: string
  poolId: string
}

export function useSuccessionStore() {
  loadFromStorage()

  const pools = rawPools
  function poolById(id: string): SuccessionPool | undefined { return rawPools.value.find(p => p.id === id) }

  const employeeRows = computed<EmployeeRow[]>(() =>
    rawPools.value.flatMap(pool =>
      pool.successors.flatMap((s) => {
        const emp = employeeById(s.employeeId)
        return emp ? [{ employee: emp, keyPosition: pool.keyPosition, organization: pool.organization, readiness: s.readiness, poolId: pool.id }] : []
      }),
    ),
  )

  function addPool(input: {
    keyPositionValue: string
    keyPosition: string
    organization: string
    scopeValue: string
    assessmentType: 'talenta' | 'manual'
    successors: SuccessorTalent[]
  }): SuccessionPool {
    const pool: SuccessionPool = {
      id: `sp-new-${rawPools.value.length + 1}-${input.keyPositionValue}`,
      isOldPool: false,
      ...input,
      successors: input.successors.map(s => ({ ...s })),
    }
    rawPools.value = [...rawPools.value, pool]
    persist()
    return pool
  }

  function mutatePool(poolId: string, fn: (p: SuccessionPool) => SuccessionPool) {
    rawPools.value = rawPools.value.map(p => (p.id === poolId ? fn(p) : p))
    persist()
  }

  // Merge the selected id set into the pool, preserving existing readiness.
  function setSuccessors(poolId: string, ids: string[]) {
    mutatePool(poolId, (p) => {
      const existing = new Map(p.successors.map(s => [s.employeeId, s]))
      return { ...p, successors: ids.map(id => existing.get(id) ?? { employeeId: id, readiness: '' }) }
    })
  }
  function removeSuccessor(poolId: string, employeeId: string) {
    mutatePool(poolId, p => ({ ...p, successors: p.successors.filter(s => s.employeeId !== employeeId) }))
  }
  function updateReadiness(poolId: string, employeeId: string, readiness: string) {
    mutatePool(poolId, p => ({ ...p, successors: p.successors.map(s => (s.employeeId === employeeId ? { ...s, readiness } : s)) }))
  }

  function resetToSeed() { rawPools.value = seed(); persist() }

  return { pools, employeeRows, poolById, addPool, setSuccessors, removeSuccessor, updateReadiness, resetToSeed }
}
