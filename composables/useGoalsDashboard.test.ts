import { describe, expect, it } from 'vitest'
import type { Submission } from './useGoalApprovalsStore'
import { approvalEmployeeRows, approvalGoalRows, parseUpdatedAt, relativeAge } from './useGoalsDashboard'

// ── parseUpdatedAt ───────────────────────────────────────────────────────────
describe('parseUpdatedAt', () => {
  it('parses the preformatted "15 Mar 2026, 15:00" display string', () => {
    const d = parseUpdatedAt('15 Mar 2026, 15:00')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // March
    expect(d.getDate()).toBe(15)
  })

  it('parses a single-digit day', () => {
    const d = parseUpdatedAt('5 Jan 2026')!
    expect([d.getMonth(), d.getDate()]).toEqual([0, 5])
  })

  it('returns null for undefined / unparseable / unknown month', () => {
    expect(parseUpdatedAt(undefined)).toBeNull()
    expect(parseUpdatedAt('not a date')).toBeNull()
    expect(parseUpdatedAt('15 Xyz 2026')).toBeNull()
  })
})

// ── relativeAge ──────────────────────────────────────────────────────────────
describe('relativeAge — boundary bands', () => {
  const base = new Date(2026, 5, 1) // reference "from"
  const ago = (days: number) => relativeAge(base, new Date(base.getTime() + days * 86_400_000))

  it('today for same day or a future date', () => {
    expect(ago(0)).toBe('today')
    expect(ago(-3)).toBe('today')
  })
  it('yesterday at exactly 1 day', () => {
    expect(ago(1)).toBe('yesterday')
  })
  it('N days ago for 2..6 days', () => {
    expect(ago(2)).toBe('2 days ago')
    expect(ago(6)).toBe('6 days ago')
  })
  it('weeks band 7..29 days, singular/plural', () => {
    expect(ago(7)).toBe('1 week ago')
    expect(ago(13)).toBe('1 week ago')
    expect(ago(14)).toBe('2 weeks ago')
    expect(ago(29)).toBe('4 weeks ago')
  })
  it('months band 30..364 days, singular/plural', () => {
    expect(ago(30)).toBe('1 month ago')
    expect(ago(59)).toBe('1 month ago')
    expect(ago(60)).toBe('2 months ago')
    expect(ago(364)).toBe('12 months ago')
  })
  it('years band ≥365 days, singular/plural', () => {
    expect(ago(365)).toBe('1 year ago')
    expect(ago(730)).toBe('2 years ago')
  })
})

// ── approvalEmployeeRows ─────────────────────────────────────────────────────
function subm(id: string, ownerId: string, submittedAt: string, itemCount: number): Submission {
  return {
    id, cycleId: 'c', ownerId, submittedAt, status: 'pending',
    items: Array.from({ length: itemCount }, (_, i) => ({ id: `${id}-i${i}`, type: 'create', ownerId, cycleId: 'c' })),
  } as Submission
}

describe('approvalEmployeeRows', () => {
  it('produces one row per owner, summing goalCount across that owner\'s batches', () => {
    const rows = approvalEmployeeRows([
      subm('s1', 'dewi', '2026-06-02T09:00:00Z', 10),
      subm('s2', 'dewi', '2026-06-05T09:00:00Z', 3),
      subm('s3', 'ali', '2026-06-03T09:00:00Z', 5),
    ])
    expect(rows).toHaveLength(2)
    const dewi = rows.find(r => r.ownerId === 'dewi')!
    expect(dewi.goalCount).toBe(13)
    expect(dewi.submissionIds.sort()).toEqual(['s1', 's2'])
    // row date is the NEWEST of the owner's batches
    expect(dewi.submittedAt).toBe('2026-06-05T09:00:00Z')
    expect(dewi.id).toBe('dewi')
  })

  it('sorts rows newest-first by submittedAt', () => {
    const rows = approvalEmployeeRows([
      subm('s1', 'dewi', '2026-06-05T09:00:00Z', 1),
      subm('s3', 'ali', '2026-06-03T09:00:00Z', 1),
      subm('s4', 'bayu', '2026-06-09T09:00:00Z', 1),
    ])
    expect(rows.map(r => r.ownerId)).toEqual(['bayu', 'dewi', 'ali'])
  })

  it('returns [] for no submissions', () => {
    expect(approvalEmployeeRows([])).toEqual([])
  })
})

// ── approvalGoalRows ─────────────────────────────────────────────────────────
describe('approvalGoalRows', () => {
  it('produces one row per item, keyed by item id, with a single submission id', () => {
    const s = {
      id: 's1', cycleId: 'c', ownerId: 'evelyn', submittedAt: '2026-06-03T00:00:00Z', status: 'pending',
      items: [
        { id: 'it1', type: 'edit', ownerId: 'evelyn', cycleId: 'c', after: { title: 'After title' } },
        { id: 'it2', type: 'delete', ownerId: 'evelyn', cycleId: 'c', before: { title: 'Before title' } },
        { id: 'it3', type: 'edit', ownerId: 'evelyn', cycleId: 'c' },
      ],
    } as unknown as Submission
    const rows = approvalGoalRows([s])
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ id: 'it1', submissionIds: ['s1'], title: 'After title', submittedAt: '2026-06-03T00:00:00Z' })
    // delete item names itself off `before`
    expect(rows[1].title).toBe('Before title')
    // no title anywhere → fallback
    expect(rows[2].title).toBe('Untitled goal')
  })

  it('uses the item ownerId, falling back to the submission owner', () => {
    const s = {
      id: 's1', cycleId: 'c', ownerId: 'sub-owner', submittedAt: '2026-06-03T00:00:00Z', status: 'pending',
      items: [{ id: 'it1', type: 'edit', cycleId: 'c', after: { title: 'T' } }],
    } as unknown as Submission
    expect(approvalGoalRows([s])[0].ownerId).toBe('sub-owner')
  })
})
