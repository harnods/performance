import { describe, expect, it } from 'vitest'
import {
  customRangeValue,
  formatRangeCompact,
  monthValue,
  quarterValue,
  reconstructPeriod,
  semesterValue,
  toISO,
  weekValue,
  yearValue,
} from './periodPicker'

describe('toISO', () => {
  it('formats a Date as zero-padded yyyy-mm-dd (local components)', () => {
    expect(toISO(new Date(2026, 0, 1))).toBe('2026-01-01')
    expect(toISO(new Date(2026, 11, 31))).toBe('2026-12-31')
    expect(toISO(new Date(2026, 8, 5))).toBe('2026-09-05')
  })
})

describe('formatRangeCompact', () => {
  it('shows the year only once when start and end share a year', () => {
    expect(formatRangeCompact(new Date(2027, 0, 1), new Date(2027, 5, 30)))
      .toBe('1 Jan - 30 Jun 2027')
  })

  it('shows the year on both ends when they differ', () => {
    expect(formatRangeCompact(new Date(2026, 11, 15), new Date(2027, 0, 10)))
      .toBe('15 Dec 2026 - 10 Jan 2027')
  })
})

describe('yearValue', () => {
  it('spans the whole calendar year', () => {
    expect(yearValue(2026)).toEqual({
      mode: 'year',
      label: '2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    })
  })
})

describe('semesterValue', () => {
  it('H1 is Jan 1 – Jun 30', () => {
    expect(semesterValue(2026, 1)).toEqual({
      mode: 'semester',
      label: 'H1 2026 (1 Jan - 30 Jun 2026)',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
    })
  })

  it('H2 is Jul 1 – Dec 31', () => {
    expect(semesterValue(2026, 2)).toEqual({
      mode: 'semester',
      label: 'H2 2026 (1 Jul - 31 Dec 2026)',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
    })
  })
})

describe('quarterValue', () => {
  it('computes each quarter with the correct last-day-of-month end', () => {
    expect(quarterValue(2026, 1)).toMatchObject({ startDate: '2026-01-01', endDate: '2026-03-31' })
    expect(quarterValue(2026, 2)).toMatchObject({ startDate: '2026-04-01', endDate: '2026-06-30' })
    expect(quarterValue(2026, 3)).toMatchObject({ startDate: '2026-07-01', endDate: '2026-09-30' })
    expect(quarterValue(2026, 4)).toMatchObject({ startDate: '2026-10-01', endDate: '2026-12-31' })
  })

  it('labels the quarter', () => {
    expect(quarterValue(2026, 2).label).toBe('Q2 2026 (1 Apr - 30 Jun 2026)')
  })
})

describe('monthValue', () => {
  it('spans the whole month including a leap-February', () => {
    expect(monthValue(new Date(2024, 1, 15))).toEqual({
      mode: 'month',
      label: 'February 2024',
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    })
  })

  it('non-leap February ends on the 28th', () => {
    expect(monthValue(new Date(2026, 1, 10)).endDate).toBe('2026-02-28')
  })
})

describe('weekValue', () => {
  it('spans Monday–Sunday for a mid-week date', () => {
    // 2026-01-07 is a Wednesday → week is Mon 2026-01-05 .. Sun 2026-01-11
    const v = weekValue(new Date(2026, 0, 7))
    expect(v).toMatchObject({ mode: 'week', startDate: '2026-01-05', endDate: '2026-01-11' })
  })

  it('treats Sunday as the END of the current week, not the start', () => {
    // 2026-01-11 is a Sunday → still Mon 2026-01-05 .. Sun 2026-01-11
    const v = weekValue(new Date(2026, 0, 11))
    expect(v).toMatchObject({ startDate: '2026-01-05', endDate: '2026-01-11' })
  })

  it('Monday maps to itself as the week start', () => {
    const v = weekValue(new Date(2026, 0, 5))
    expect(v.startDate).toBe('2026-01-05')
  })
})

describe('customRangeValue', () => {
  it('wraps an arbitrary range with a compact label', () => {
    expect(customRangeValue(new Date(2026, 2, 3), new Date(2026, 4, 20))).toEqual({
      mode: 'custom',
      label: '3 Mar - 20 May 2026',
      startDate: '2026-03-03',
      endDate: '2026-05-20',
    })
  })
})

describe('reconstructPeriod', () => {
  it('recognises an H1 range as the semester preset', () => {
    expect(reconstructPeriod('2026-01-01', '2026-06-30')).toEqual(semesterValue(2026, 1))
  })

  it('recognises an H2 range as the semester preset', () => {
    expect(reconstructPeriod('2027-07-01', '2027-12-31')).toEqual(semesterValue(2027, 2))
  })

  it('falls back to a custom range for anything else (e.g. a quarter)', () => {
    const v = reconstructPeriod('2026-04-01', '2026-06-30')
    expect(v.mode).toBe('custom')
    expect(v).toMatchObject({ startDate: '2026-04-01', endDate: '2026-06-30' })
  })

  it('falls back to custom when the end year differs from the start year', () => {
    // Same month/day shape as H1 but spanning two years → not a semester.
    expect(reconstructPeriod('2026-01-01', '2027-06-30').mode).toBe('custom')
  })

  it('round-trips a semester preset through its own start/end dates', () => {
    const h1 = semesterValue(2026, 1)
    expect(reconstructPeriod(h1.startDate, h1.endDate)).toEqual(h1)
  })
})
