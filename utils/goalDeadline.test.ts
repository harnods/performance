import { describe, expect, it } from 'vitest'
import { computeDeadlineAchievement, validateDeadlineRules } from './goalDeadline'

function rule(id: string, daysExceed: number | '', percentage: number | '') {
  return { id, daysExceed, percentage }
}

describe('validateDeadlineRules', () => {
  it('accepts a well-formed graduated set', () => {
    const rules = [rule('a', 3, 80), rule('b', 7, 50), rule('c', 14, 20)]
    expect(validateDeadlineRules(rules)).toEqual([])
  })

  it('rejects a row missing either field', () => {
    const rules = [rule('a', 3, '')]
    const errors = validateDeadlineRules(rules)
    expect(errors).toHaveLength(1)
    expect(errors[0].index).toBe(0)
  })

  it('rejects days-exceeded that does not increase from the row above', () => {
    const rules = [rule('a', 5, 80), rule('b', 5, 50)]
    const errors = validateDeadlineRules(rules)
    expect(errors.some(e => e.index === 1 && /greater than/.test(e.message))).toBe(true)
  })

  it('rejects a percentage that does not decrease from the row above', () => {
    const rules = [rule('a', 3, 80), rule('b', 7, 80)]
    const errors = validateDeadlineRules(rules)
    expect(errors.some(e => e.index === 1)).toBe(true)
  })

  it('rejects duplicate days-exceeded values across non-adjacent rows', () => {
    const rules = [rule('a', 3, 90), rule('b', 7, 60), rule('c', 3, 30)]
    const errors = validateDeadlineRules(rules)
    expect(errors.some(e => e.index === 2 && /unique/.test(e.message))).toBe(true)
  })

  it('returns no errors for an empty rule set', () => {
    expect(validateDeadlineRules([])).toEqual([])
  })
})

describe('computeDeadlineAchievement', () => {
  it('is 100% when updated on the deadline', () => {
    expect(computeDeadlineAchievement('2026-03-31', '2026-03-31')).toBe(100)
  })

  it('is 100% when updated before the deadline', () => {
    expect(computeDeadlineAchievement('2026-03-31', '2026-03-15')).toBe(100)
  })

  it('is 0% when updated after the deadline with no rules set', () => {
    expect(computeDeadlineAchievement('2026-03-31', '2026-04-05')).toBe(0)
  })

  it('steps down through graduated rules as lateness grows', () => {
    const rules = [rule('a', 3, 80), rule('b', 7, 50), rule('c', 14, 20)]
    expect(computeDeadlineAchievement('2026-03-31', '2026-04-02', rules)).toBe(100) // 2 days late, below first threshold
    expect(computeDeadlineAchievement('2026-03-31', '2026-04-03', rules)).toBe(80) // exactly 3 days late
    expect(computeDeadlineAchievement('2026-03-31', '2026-04-06', rules)).toBe(80) // 6 days late, still under 7
    expect(computeDeadlineAchievement('2026-03-31', '2026-04-07', rules)).toBe(50) // exactly 7 days late
    expect(computeDeadlineAchievement('2026-03-31', '2026-04-20', rules)).toBe(20) // 20 days late, past every threshold
  })

  it('sorts out-of-order rules defensively before applying them', () => {
    const rules = [rule('b', 7, 50), rule('a', 3, 80)]
    expect(computeDeadlineAchievement('2026-03-31', '2026-04-05', rules)).toBe(80)
  })
})
