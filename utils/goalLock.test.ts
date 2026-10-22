import { describe, expect, it } from 'vitest'
import { alignedChildCount, isProgressLocked, lockingParentOf, openAlignedCount } from './goalLock'

const goals = [
  { id: 'p', isClosed: true },
  { id: 'open-parent' },
  { id: 'c1', alignedToId: 'p' },
  { id: 'c2', alignedToId: 'p', isClosed: true },
  { id: 'c3', alignedToId: 'open-parent' },
  { id: 'solo' },
]

describe('isProgressLocked', () => {
  it('locks an open child of a closed parent', () => {
    expect(isProgressLocked(goals[2], goals)).toBe(true)
    expect(lockingParentOf(goals[2], goals)?.id).toBe('p')
  })
  it('does not lock a child of an open parent, a goal with no parent, or an already-closed child', () => {
    expect(isProgressLocked(goals[4], goals)).toBe(false)
    expect(isProgressLocked(goals[5], goals)).toBe(false)
    expect(isProgressLocked(goals[3], goals)).toBe(false)
  })
  it('unlocks as soon as the alignment is removed', () => {
    expect(isProgressLocked({ ...goals[2], alignedToId: undefined }, goals)).toBe(false)
  })
})

describe('openAlignedCount', () => {
  it('counts only children that are still open', () => {
    expect(openAlignedCount({ id: 'p' }, goals)).toBe(1)
    expect(openAlignedCount({ id: 'open-parent' }, goals)).toBe(1)
    expect(openAlignedCount({ id: 'solo' }, goals)).toBe(0)
  })
})

describe('alignedChildCount', () => {
  it('counts every aligned child, open or closed', () => {
    expect(alignedChildCount({ id: 'p' }, goals)).toBe(2)
    expect(alignedChildCount({ id: 'solo' }, goals)).toBe(0)
  })
})
