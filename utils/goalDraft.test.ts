import { describe, expect, it } from 'vitest'
import { nextGoalCode } from './goalDraft'

// nextGoalCode() uses a module-scope counter, so calls are sequential and
// stateful across the whole module (one counter shared by every caller).
// This file gets a fresh module instance, so the sequence starts at 1001.
describe('nextGoalCode', () => {
  it('starts at "1001" and increments by one each call', () => {
    expect(nextGoalCode()).toBe('1001')
    expect(nextGoalCode()).toBe('1002')
    expect(nextGoalCode()).toBe('1003')
  })

  it('always returns a distinct, monotonically increasing string code', () => {
    const codes = Array.from({ length: 20 }, () => nextGoalCode())
    // all unique
    expect(new Set(codes).size).toBe(codes.length)
    // strictly increasing when parsed as numbers
    const nums = codes.map(Number)
    for (let i = 1; i < nums.length; i++) expect(nums[i]).toBe(nums[i - 1] + 1)
  })
})
