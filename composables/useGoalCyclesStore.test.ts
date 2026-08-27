import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { goalCycleStatus, useGoalCyclesStore } from './useGoalCyclesStore'

// goalCycleStatus() reads "today" from new Date(), so every test that depends
// on it fixes the system clock. NOTE: exact start/end-day equality is
// timezone-sensitive (the ISO dates are parsed as UTC midnight while "today"
// is local midnight), so these tests only assert dates that sit at least a
// full day inside / outside the range — see AUDIT-QA-FINDINGS.md.
describe('goalCycleStatus', () => {
  afterEach(() => vi.useRealTimers())

  const cycle = { startDate: '2026-01-01', endDate: '2026-06-30' }

  it('Active for a date well inside the period', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0)) // 15 Mar 2026
    expect(goalCycleStatus(cycle)).toBe('Active')
  })

  it('Inactive for a date before the period starts', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 11, 15, 12, 0, 0)) // 15 Dec 2025
    expect(goalCycleStatus(cycle)).toBe('Inactive')
  })

  it('Inactive for a date after the period ends', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 1, 12, 0, 0)) // 1 Sep 2026
    expect(goalCycleStatus(cycle)).toBe('Inactive')
  })
})

describe('useGoalCyclesStore', () => {
  let store: ReturnType<typeof useGoalCyclesStore>

  beforeEach(() => {
    store = useGoalCyclesStore()
    store.resetToSeed() // module singleton — restore the 4 seed cycles
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0)) // inside the 26 H1 cycle
  })
  afterEach(() => vi.useRealTimers())

  it('lists seed cycles sorted latest-period-first (by start date desc)', () => {
    expect(store.cycles.value.map(c => c.id)).toEqual([
      'seed-27-h1', 'seed-26-h2', 'seed-26-h1', 'archive-legacy',
    ])
  })

  it('derives status on read — the current cycle is Active, others Inactive', () => {
    const byId = Object.fromEntries(store.cycles.value.map(c => [c.id, c.status]))
    expect(byId['seed-26-h1']).toBe('Active') // spans 15 Mar 2026
    expect(byId['seed-26-h2']).toBe('Inactive')
    expect(byId['seed-27-h1']).toBe('Inactive')
    expect(byId['archive-legacy']).toBe('Inactive')
  })

  describe('addCycle', () => {
    it('generates an id from the current length + name, stamps createdInNewUi + author, and derives status', () => {
      const created = store.addCycle({
        name: 'My Cycle',
        period: 'H1 2026',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        progressUpdateMethod: 'manual',
        weightMandatory: true,
      })
      expect(created.id).toBe('cycle-4-My Cycle') // seed length was 4
      expect(created.createdInNewUi).toBe(true)
      expect(created.updatedBy).toBe('Rizal Candra') // from useCurrentUser stub (rizal)
      expect(created.status).toBe('Active') // clock is inside the period
      expect(() => new Date(created.updatedAt!).toISOString()).not.toThrow()
    })

    it('persists into the list (round-trip) at the correct sort position', () => {
      const before = store.cycles.value.length
      store.addCycle({
        name: 'Future', period: 'H1 2028',
        startDate: '2028-01-01', endDate: '2028-06-30',
        progressUpdateMethod: 'manual', weightMandatory: false,
      })
      expect(store.cycles.value.length).toBe(before + 1)
      // 2028 start sorts to the very top (latest first)
      expect(store.cycles.value[0].name).toBe('Future')
    })
  })

  describe('updateCycle', () => {
    it('updates the named fields in place and restamps the author/time', () => {
      store.updateCycle('seed-26-h1', {
        name: '26 H1 (renamed)',
        period: 'H1 2026 revised',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        progressUpdateMethod: 'log-based',
        weightMandatory: false,
      })
      const c = store.cycles.value.find(c => c.id === 'seed-26-h1')!
      expect(c.name).toBe('26 H1 (renamed)')
      expect(c.progressUpdateMethod).toBe('log-based')
      expect(c.weightMandatory).toBe(false)
      expect(c.updatedBy).toBe('Rizal Candra')
    })

    it('leaves other cycles untouched', () => {
      store.updateCycle('seed-26-h1', {
        name: 'x', period: 'x', startDate: '2026-01-01', endDate: '2026-06-30',
        progressUpdateMethod: 'manual', weightMandatory: true,
      })
      expect(store.cycles.value.find(c => c.id === 'seed-26-h2')!.name).toBe('26 H2')
    })
  })

  describe('deleteCycle', () => {
    it('removes the target cycle only', () => {
      store.deleteCycle('archive-legacy')
      const ids = store.cycles.value.map(c => c.id)
      expect(ids).not.toContain('archive-legacy')
      expect(ids).toHaveLength(3)
    })
  })
})
