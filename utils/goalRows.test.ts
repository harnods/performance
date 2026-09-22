import { describe, expect, it } from 'vitest'
import {
  alignedGoalsOf,
  countWhile,
  expandAlignedRows,
  matchesSearch,
  ownerOf,
  sortByCategory,
  sortGoalRows,
  withRowSpans,
} from './goalRows'

// ── matchesSearch ────────────────────────────────────────────────────────────
describe('matchesSearch', () => {
  const goal = { code: 'RC-01', title: 'Total revenue', ownerId: 'ali' } // ali = Ali Imran

  it('matches empty/whitespace query (no filter)', () => {
    expect(matchesSearch(goal, '')).toBe(true)
    expect(matchesSearch(goal, '   ')).toBe(true)
  })

  it('matches on code, title, and owner name — case-insensitive substring', () => {
    expect(matchesSearch(goal, 'rc-01')).toBe(true)
    expect(matchesSearch(goal, 'REVENUE')).toBe(true)
    expect(matchesSearch(goal, 'imran')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchesSearch(goal, 'zzz')).toBe(false)
  })
})

// ── sortByCategory ───────────────────────────────────────────────────────────
describe('sortByCategory', () => {
  it('orders by owner, then canonical category order, then sub-category', () => {
    const rows = [
      { ownerId: 'b', category: 'Customer', subCategory: 'Z' },
      { ownerId: 'a', category: 'Learning & Growth', subCategory: 'B' },
      { ownerId: 'a', category: 'Financial', subCategory: 'B' },
      { ownerId: 'a', category: 'Financial', subCategory: 'A' },
    ]
    expect(sortByCategory(rows).map(r => `${r.ownerId}/${r.category}/${r.subCategory}`)).toEqual([
      'a/Financial/A',
      'a/Financial/B',
      'a/Learning & Growth/B',
      'b/Customer/Z',
    ])
  })

  it('ignores owner grouping when groupByOwner is false', () => {
    const rows = [
      { ownerId: 'b', category: 'Financial', subCategory: 'A' },
      { ownerId: 'a', category: 'Customer', subCategory: 'A' },
    ]
    // Financial (index 0) sorts before Customer (index 1) regardless of owner
    expect(sortByCategory(rows, { groupByOwner: false }).map(r => r.category))
      .toEqual(['Financial', 'Customer'])
  })
})

// ── sortGoalRows ─────────────────────────────────────────────────────────────
describe('sortGoalRows', () => {
  const rows = [
    { ownerId: 'a', category: 'Financial', subCategory: 'A', code: 'A-2', pill: 30 },
    { ownerId: 'a', category: 'Financial', subCategory: 'A', code: 'A-1', pill: 90 },
    { ownerId: 'a', category: 'Customer', subCategory: 'B', code: 'B-1', pill: 10 },
  ]

  it('returns the array unchanged for an empty sortKey', () => {
    expect(sortGoalRows(rows, { sortKey: '', sortDir: 'asc', sortValue: () => 0 })).toBe(rows)
  })

  it('sorts a non-group column only WITHIN the innermost group, keeping groups contiguous', () => {
    const out = sortGoalRows(rows, {
      sortKey: 'progress',
      sortDir: 'desc',
      sortType: 'number',
      sortValue: r => r.pill,
      groupLevels: ['category', 'subCategory'],
    })
    // Financial group stays before Customer (canonical), and inside Financial
    // the two rows reorder by pill desc (90 before 30).
    expect(out.map(r => r.code)).toEqual(['A-1', 'A-2', 'B-1'])
  })

  it('re-orders the grouping level itself when the sortKey IS a group level', () => {
    const out = sortGoalRows(rows, {
      sortKey: 'subCategory',
      sortDir: 'desc',
      sortValue: r => r.subCategory,
      groupLevels: ['subCategory'],
    })
    // subCategory desc → 'B' group before 'A' group
    expect(out.map(r => r.subCategory)).toEqual(['B', 'A', 'A'])
  })

  it('is stable — equal keys keep canonical order', () => {
    const eq = sortGoalRows(rows, {
      sortKey: 'progress',
      sortDir: 'asc',
      sortType: 'number',
      sortValue: () => 5, // all equal
      groupLevels: ['category', 'subCategory'],
    })
    expect(eq.map(r => r.code)).toEqual(['A-2', 'A-1', 'B-1'])
  })
})

// ── withRowSpans / countWhile ────────────────────────────────────────────────
describe('countWhile', () => {
  it('counts the leading run satisfying the predicate from startIdx', () => {
    const arr = [2, 2, 2, 5, 2]
    expect(countWhile(arr, 0, x => x === 2)).toBe(3)
    expect(countWhile(arr, 3, x => x === 2)).toBe(0)
    expect(countWhile(arr, 4, x => x === 2)).toBe(1)
  })
})

describe('withRowSpans', () => {
  it('merges consecutive same-owner/category/sub-category runs and sums weight', () => {
    const rows = [
      { ownerId: 'a', category: 'Financial', subCategory: 'X', weight: 10 },
      { ownerId: 'a', category: 'Financial', subCategory: 'X', weight: 5 },
      { ownerId: 'a', category: 'Financial', subCategory: 'Y', weight: 5 },
      { ownerId: 'a', category: 'Customer', subCategory: 'Z', weight: 20 },
    ]
    const out = withRowSpans(rows)
    // Row 0: head of Financial (3 rows) and of sub X (2 rows)
    expect(out[0]).toMatchObject({ showCategory: true, categoryRowspan: 3, categoryWeight: 20, showSubCategory: true, subCategoryRowspan: 2 })
    // Row 1: hidden under both
    expect(out[1]).toMatchObject({ showCategory: false, categoryRowspan: 0, showSubCategory: false, subCategoryRowspan: 0 })
    // Row 2: still Financial (hidden) but new sub Y (shown, span 1)
    expect(out[2]).toMatchObject({ showCategory: false, showSubCategory: true, subCategoryRowspan: 1 })
    // Row 3: new category
    expect(out[3]).toMatchObject({ showCategory: true, categoryRowspan: 1, categoryWeight: 20 })
  })

  it('does NOT merge the same category across an owner boundary (groupByOwner default)', () => {
    const rows = [
      { ownerId: 'a', category: 'Financial', subCategory: 'X', weight: 10 },
      { ownerId: 'b', category: 'Financial', subCategory: 'X', weight: 30 },
    ]
    const out = withRowSpans(rows)
    expect(out[0].categoryRowspan).toBe(1)
    expect(out[1].showCategory).toBe(true) // new owner starts a fresh run
    expect(out[1].categoryRowspan).toBe(1)
  })

  it('merges across owners when groupByOwner is false', () => {
    const rows = [
      { ownerId: 'a', category: 'Financial', subCategory: 'X', weight: 10 },
      { ownerId: 'b', category: 'Financial', subCategory: 'X', weight: 30 },
    ]
    const out = withRowSpans(rows, { groupByOwner: false })
    expect(out[0].categoryRowspan).toBe(2)
    expect(out[0].categoryWeight).toBe(40)
    expect(out[1].showCategory).toBe(false)
  })
})

// ── ownerOf ──────────────────────────────────────────────────────────────────
describe('ownerOf', () => {
  it('resolves a known employee to a display owner (id = employee CODE)', () => {
    const o = ownerOf('ali')
    expect(o).toMatchObject({ name: 'Ali Imran', id: 'CP030', title: 'Sales Director', department: 'Sales' })
  })

  it('throws for an unknown employee id', () => {
    expect(() => ownerOf('nobody')).toThrow(/unknown employee id/)
  })
})

// ── alignedGoalsOf ───────────────────────────────────────────────────────────
describe('alignedGoalsOf', () => {
  const g = (id: string, alignedToId?: string) => ({
    id, alignedToId, code: id.toUpperCase(), title: `Goal ${id}`, weight: 5,
    level: 'team' as const, ownerId: 'ali', category: 'Financial', subCategory: 'X',
    status: 'green' as const,
  })

  it('returns only the direct children (reverse alignedToId lookup)', () => {
    const parent = g('p')
    const all = [parent, g('c1', 'p'), g('c2', 'p'), g('x', 'other'), g('nolink')]
    const children = alignedGoalsOf(parent, all)
    expect(children.map(c => c.id).sort()).toEqual(['c1', 'c2'])
  })

  it('returns empty when nothing aligns to the goal', () => {
    const parent = g('p')
    expect(alignedGoalsOf(parent, [parent, g('a'), g('b')])).toEqual([])
  })
})

// ── expandAlignedRows ────────────────────────────────────────────────────────
describe('expandAlignedRows', () => {
  const alignedChild = {
    id: 'child1', code: 'C1', title: 'Child 1', weight: 3, level: 'individual' as const,
    ownerId: 'daud', category: 'Financial', subCategory: 'X', status: 'orange' as const,
  }
  const baseRow = {
    id: 'main1', category: 'Financial', subCategory: 'X', code: 'M1', title: 'Main 1', weight: 10,
    owner: ownerOf('ali'), status: 'green' as const,
    showCategory: true, categoryRowspan: 1, categoryWeight: 10, showSubCategory: true, subCategoryRowspan: 1,
    alignedGoals: [alignedChild],
  }

  it('emits only the main row when not expanded', () => {
    const out = expandAlignedRows([baseRow], {})
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('main')
    expect(out[0].categoryRowspan).toBe(1)
  })

  it('inserts a child row and extends the rowspans to cover it when expanded', () => {
    const out = expandAlignedRows([baseRow], { main1: true })
    expect(out.map(r => r.kind)).toEqual(['main', 'aligned'])
    // rowspan extended by the one child
    expect(out[0].categoryRowspan).toBe(2)
    expect(out[0].subCategoryRowspan).toBe(2)
    // child row carries a composite id and resolves its own owner
    expect(out[1].id).toBe('main1::child1')
    expect(out[1].owner.name).toBe('Daud Dimas Prasetyo')
    expect(out[1].categoryRowspan).toBe(0)
    expect(out[1].showCategory).toBe(false)
  })
})
