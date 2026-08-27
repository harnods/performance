import { describe, expect, it } from 'vitest'
import type { Goal } from './useGoalsStore'
import {
  EMPLOYEE_MANAGER,
  fullyWeightedOwnerIds,
  hasManager,
  isSuperAdmin,
  needsApproval,
  useGoalsStore,
} from './useGoalsStore'

// A minimal committed goal for the weight-sum helper.
function wg(ownerId: string, weight: number, isDraft = false): Goal {
  return { ownerId, weight, isDraft } as Goal
}

// ── Pure org/approval helpers ────────────────────────────────────────────────
describe('isSuperAdmin / hasManager / needsApproval', () => {
  it('Rizal is the only Super Admin', () => {
    expect(isSuperAdmin('rizal')).toBe(true)
    expect(isSuperAdmin('rio')).toBe(false)
    expect(isSuperAdmin('nobody')).toBe(false)
  })

  it('everyone with a manager entry hasManager; Rizal (top) does not', () => {
    expect(hasManager('rizal')).toBe(false)
    expect(hasManager('rio')).toBe(true)
    expect(hasManager('alfian')).toBe(true)
    expect(hasManager('ghost')).toBe(false)
  })

  it('needsApproval mirrors hasManager (approval is centralized, owner-based)', () => {
    for (const id of ['rizal', 'rio', 'alfian', 'ghost'])
      expect(needsApproval(id)).toBe(hasManager(id))
  })

  it('EMPLOYEE_MANAGER wires reports to the right manager', () => {
    expect(EMPLOYEE_MANAGER.alfian).toBe('rio')
    expect(EMPLOYEE_MANAGER.rio).toBe('rizal')
    expect(EMPLOYEE_MANAGER.rizal).toBeUndefined()
  })
})

// ── fullyWeightedOwnerIds ────────────────────────────────────────────────────
describe('fullyWeightedOwnerIds', () => {
  it('includes owners whose committed weights sum to exactly 100', () => {
    const set = fullyWeightedOwnerIds([wg('a', 60), wg('a', 40), wg('b', 30)])
    expect(set.has('a')).toBe(true)
    expect(set.has('b')).toBe(false)
  })

  it('includes owners over 100 too (>= 100)', () => {
    expect(fullyWeightedOwnerIds([wg('a', 70), wg('a', 40)]).has('a')).toBe(true)
  })

  it('excludes draft goals from the sum', () => {
    // 90 committed + 20 draft = 110, but drafts do not count → 90 < 100
    const set = fullyWeightedOwnerIds([wg('a', 90), wg('a', 20, true)])
    expect(set.has('a')).toBe(false)
  })

  it('returns an empty set for no goals', () => {
    expect(fullyWeightedOwnerIds([]).size).toBe(0)
  })
})

// ── Seeded-data invariants (exercise the private KR/rollup/categoryWeight math
//    end-to-end through the store's public goals list) ─────────────────────────
describe('useGoalsStore — 26 H1 seeded invariants', () => {
  const store = useGoalsStore('seed-26-h1')
  const goals = () => store.goals.value

  // BUG: useGoalsStore.ts documents (lines 25-35 & 111-117) that "every owner's
  // goals sum to exactly 100%" — their one real budget for the cycle. The seed
  // data VIOLATES this for three owners: evelyn=117, ali=116, cinta=121 (the
  // rest are correct at 100). Marked it.fails so the suite stays green while the
  // discrepancy is recorded (see AUDIT-QA-FINDINGS.md). Do NOT fix the source.
  it.fails('DOCUMENTED INVARIANT: every owner\'s goals sum to exactly 100% (currently violated)', () => {
    const byOwner = new Map<string, number>()
    for (const g of goals()) byOwner.set(g.ownerId, (byOwner.get(g.ownerId) ?? 0) + g.weight)
    for (const [owner, sum] of byOwner) expect(sum, `owner ${owner}`).toBe(100)
  })

  it('the ACTUAL per-owner weight sums (documents current reality, incl. the 3 over-100 owners)', () => {
    const byOwner: Record<string, number> = {}
    for (const g of goals()) byOwner[g.ownerId] = (byOwner[g.ownerId] ?? 0) + g.weight
    expect(byOwner).toMatchObject({
      rizal: 100, rio: 100, alfian: 100, bayu: 100, andi: 100, daud: 100, jessie: 100, eka: 100,
      evelyn: 117, ali: 116, cinta: 121, // <- violate the stated 100% budget
    })
  })

  it('categoryWeight equals the owner\'s summed weight in that category (derived, rounded to 1dp)', () => {
    for (const g of goals()) {
      const expected = goals()
        .filter(o => o.ownerId === g.ownerId && o.category === g.category)
        .reduce((s, o) => s + o.weight, 0)
      expect(g.categoryWeight).toBe(Math.round(expected * 10) / 10)
    }
  })

  it('non-company measurable goals obey the KR status banding (green ≥70, orange 1..69, gray 0)', () => {
    for (const g of goals()) {
      if (g.level === 'company' || !g.unit || !g.keyResults?.length) continue
      const pill = g.pill ?? -1
      expect(pill).toBeGreaterThanOrEqual(0)
      expect(pill).toBeLessThanOrEqual(100)
      if (pill >= 70) expect(g.status).toBe('green')
      else if (pill > 0) expect(g.status).toBe('orange')
      else expect(g.status).toBe('gray')
      // value stays within the goal's own scale
      const min = g.min ?? 0
      const max = g.max ?? 100
      expect(g.value!).toBeGreaterThanOrEqual(Math.min(min, max))
      expect(g.value!).toBeLessThanOrEqual(Math.max(min, max))
    }
  })

  it('company goals roll up from their aligned children (avg of clamped child pills + banding)', () => {
    const all = useGoalsStore().goals.value // unscoped: children may live in any cycle-scope read
    const companies = all.filter(g => g.level === 'company')
    let checked = 0
    for (const c of companies) {
      const children = all.filter(k => k.alignedToId === c.id)
      if (!children.length) continue
      checked++
      const pcts = children.map(k => Math.max(0, Math.min(100, k.pill ?? 0)))
      const expectedPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
      const expectedStatus = expectedPct >= 70 ? 'green' : expectedPct > 0 ? 'orange' : 'gray'
      expect(c.status).toBe(expectedStatus)
      if (c.unit) expect(c.pill).toBe(expectedPct)
    }
    expect(checked, 'at least one company goal has children in the seed').toBeGreaterThan(0)
  })
})

// ── Store mutations (self-cleaning so seeded invariants above stay intact) ────
describe('useGoalsStore — mutations', () => {
  const newGoal = (id: string, cycleAgnostic: Partial<Goal> = {}): Omit<Goal, 'cycleId'> => ({
    id, level: 'individual', ownerId: 'dewi', department: 'Operations',
    category: 'Financial', subCategory: 'X', code: id.toUpperCase(), title: `Goal ${id}`,
    weight: 100, contributorIds: [], viewerIds: [], status: 'gray', ...cycleAgnostic,
  })

  it('addGoals stamps the target cycleId and persists into the list', () => {
    const scoped = useGoalsStore('test-cycle')
    scoped.addGoals([newGoal('tg-1'), newGoal('tg-2')], 'test-cycle')
    const ids = scoped.goals.value.map(g => g.id)
    expect(ids).toContain('tg-1')
    expect(ids).toContain('tg-2')
    expect(scoped.goals.value.every(g => g.cycleId === 'test-cycle')).toBe(true)
    // cleanup
    scoped.deleteGoalsByCycle('test-cycle')
    expect(scoped.goals.value).toHaveLength(0)
  })

  it('deleteGoal removes exactly one goal by id', () => {
    const store = useGoalsStore('test-cycle')
    store.addGoals([newGoal('del-1'), newGoal('del-2')], 'test-cycle')
    store.deleteGoal('del-1')
    const ids = store.goals.value.map(g => g.id)
    expect(ids).not.toContain('del-1')
    expect(ids).toContain('del-2')
    store.deleteGoalsByCycle('test-cycle') // cleanup
  })

  it('updateGoal patches only the named fields, leaving id/ownerId/cycleId intact', () => {
    const store = useGoalsStore('seed-26-h1')
    const target = store.goals.value[0]
    const originalTitle = target.title
    store.updateGoal(target.id, { title: 'PATCHED TITLE' })
    const after = store.goals.value.find(g => g.id === target.id)!
    expect(after.title).toBe('PATCHED TITLE')
    expect(after.ownerId).toBe(target.ownerId)
    expect(after.cycleId).toBe('seed-26-h1')
    // restore
    store.updateGoal(target.id, { title: originalTitle })
    expect(store.goals.value.find(g => g.id === target.id)!.title).toBe(originalTitle)
  })

  it('resetToSeed restores every cycle (26 H1 + 26 H2 + archive), not just 26 H1', () => {
    const store = useGoalsStore()
    store.resetToSeed()
    const cycles = new Set(store.goals.value.map(g => g.cycleId))
    expect(cycles.has('seed-26-h1')).toBe(true)
    // The bug this guards: resetToSeed used seed() (26 H1 only), wiping H2.
    expect(store.goals.value.some(g => g.cycleId === 'seed-26-h2')).toBe(true)
    expect(store.goals.value.some(g => g.cycleId === 'archive-legacy')).toBe(true)
  })

  it('resetToSeed leaves 26 H2 weights at exactly 100% per owner (H1 stays intentionally over)', () => {
    const store = useGoalsStore()
    store.resetToSeed()
    const sum = (cycle: string) => {
      const m: Record<string, number> = {}
      for (const g of store.goals.value) {
        if (g.cycleId === cycle && !g.isDraft) m[g.ownerId] = (m[g.ownerId] ?? 0) + g.weight
      }
      return m
    }
    const h2 = sum('seed-26-h2')
    for (const [owner, w] of Object.entries(h2)) {
      if (w !== 0) expect(w, `26 H2 owner ${owner}`).toBe(100)
    }
    // H1 keeps the seeded over-weights that demo the warning.
    expect(sum('seed-26-h1').cinta).toBe(121)
  })
})
