import { describe, expect, it } from 'vitest'
import { clampEndDate, computeRepeatPeriods, toDate, toISO } from './goalSchedule'

describe('toDate / toISO', () => {
  it('round-trips an ISO date', () => {
    expect(toISO(toDate('2026-01-01'))).toBe('2026-01-01')
    expect(toISO(toDate('2026-02-28'))).toBe('2026-02-28')
  })
})

describe('clampEndDate — end date can never be after the cycle end or before the cycle start/current start', () => {
  const cycleStart = toDate('2026-01-01')
  const cycleEnd = toDate('2026-03-31')

  it('clamps an end date later than the cycle end down to the cycle end', () => {
    const result = clampEndDate(toDate('2026-06-30'), cycleStart, cycleEnd, null)
    expect(toISO(result)).toBe('2026-03-31')
  })

  it('clamps an end date earlier than the cycle start up to the cycle start', () => {
    const result = clampEndDate(toDate('2025-11-01'), cycleStart, cycleEnd, null)
    expect(toISO(result)).toBe('2026-01-01')
  })

  it('clamps an end date earlier than the current start date up to that start date', () => {
    const currentStart = toDate('2026-02-01')
    const result = clampEndDate(toDate('2026-01-10'), cycleStart, cycleEnd, currentStart)
    expect(toISO(result)).toBe('2026-02-01')
  })

  it('leaves an in-range end date untouched', () => {
    const result = clampEndDate(toDate('2026-02-28'), cycleStart, cycleEnd, toDate('2026-02-01'))
    expect(toISO(result)).toBe('2026-02-28')
  })
})

describe('computeRepeatPeriods', () => {
  it('cascades a whole-month period using real calendar months (user\'s worked example)', () => {
    const periods = computeRepeatPeriods('2026-01-01', '2026-01-31', '2026-03-31')
    expect(periods).toEqual([
      { startDate: '2026-01-01', endDate: '2026-01-31' },
      { startDate: '2026-02-01', endDate: '2026-02-28' },
      { startDate: '2026-03-01', endDate: '2026-03-31' },
    ])
  })

  it('clips the final period to the cycle end when a whole 2-month cadence would otherwise overshoot', () => {
    const periods = computeRepeatPeriods('2026-01-01', '2026-02-28', '2026-03-31')
    expect(periods).toEqual([
      { startDate: '2026-01-01', endDate: '2026-02-28' },
      { startDate: '2026-03-01', endDate: '2026-03-31' },
    ])
  })

  it('returns a single period when the input already spans the whole cycle', () => {
    const periods = computeRepeatPeriods('2026-01-01', '2026-03-31', '2026-03-31')
    expect(periods).toEqual([{ startDate: '2026-01-01', endDate: '2026-03-31' }])
  })

  it('falls back to a fixed day-length cadence for a non-month-aligned period', () => {
    const periods = computeRepeatPeriods('2026-01-01', '2026-01-15', '2026-02-14')
    expect(periods).toEqual([
      { startDate: '2026-01-01', endDate: '2026-01-15' },
      { startDate: '2026-01-16', endDate: '2026-01-30' },
      { startDate: '2026-01-31', endDate: '2026-02-14' },
    ])
  })

  it('terminates within the max guard for a degenerate 1-day cadence over a long cycle', () => {
    const periods = computeRepeatPeriods('2026-01-01', '2026-01-01', '2027-01-01', 12)
    expect(periods.length).toBeLessThanOrEqual(13)
  })
})
