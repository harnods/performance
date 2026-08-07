import { describe, expect, it } from 'vitest'
import {
  POSITION_INFO, DEPARTMENT_GROUPS, JOB_LEVEL_OPTIONS, GRADE_OPTIONS, CLASS_OPTIONS,
  scopeOptions, targetsForScopeValue, getAssessmentResult,
} from './competency'

const isHalfStep = (n: number) => Number.isInteger(n * 2)

describe('scopeOptions', () => {
  it('returns the option set for each scope type', () => {
    expect(scopeOptions('job-level')).toEqual(JOB_LEVEL_OPTIONS)
    expect(scopeOptions('grade')).toEqual(GRADE_OPTIONS)
    expect(scopeOptions('class')).toEqual(CLASS_OPTIONS)
  })
})

describe('POSITION_INFO integrity', () => {
  it('every position has a known department and valid covered scope values', () => {
    for (const [title, info] of Object.entries(POSITION_INFO)) {
      expect(DEPARTMENT_GROUPS[info.department], `${title} → department`).toBeDefined()
      expect(info.values.length, `${title} has ≥1 covered value`).toBeGreaterThan(0)
      const valid = new Set(scopeOptions(info.scope).map(o => o.value))
      for (const v of info.values) expect(valid.has(v), `${title} value ${v}`).toBe(true)
    }
  })
})

describe('targetsForScopeValue', () => {
  const title = 'Head of Accounting' // Accounting, job-level, covered manager + senior-manager
  const base = DEPARTMENT_GROUPS.Accounting

  it('the top covered scope value carries the full department base targets', () => {
    const top = targetsForScopeValue(title, 'senior-manager')
    expect(top).toHaveLength(base.length)
    top.forEach((g, i) => {
      expect(g.group).toBe(base[i].group)
      expect(g.target).toBe(base[i].target)
    })
  })

  it('a lower scope value reduces each target by 0.5 per step, floored at 1', () => {
    const top = targetsForScopeValue(title, 'senior-manager')
    const lower = targetsForScopeValue(title, 'manager') // one step below
    lower.forEach((g, i) => {
      expect(g.target).toBe(Math.max(1, top[i].target - 0.5))
      expect(g.target).toBeLessThanOrEqual(top[i].target)
    })
  })

  it('always returns targets within [1,5] on a half-step grid', () => {
    for (const [t, info] of Object.entries(POSITION_INFO)) {
      for (const v of info.values) {
        for (const g of targetsForScopeValue(t, v)) {
          expect(g.target).toBeGreaterThanOrEqual(1)
          expect(g.target).toBeLessThanOrEqual(5)
          expect(isHalfStep(g.target)).toBe(true)
        }
      }
    }
  })

  it('returns [] for an unknown position or an unknown scope value', () => {
    expect(targetsForScopeValue('No Such Role', 'manager')).toEqual([])
    expect(targetsForScopeValue(title, 'not-a-level')).toEqual([])
  })
})

describe('getAssessmentResult', () => {
  it('returns a stable, in-range row per department group', () => {
    const a = getAssessmentResult('agung', 'Head of Accounting')
    const b = getAssessmentResult('agung', 'Head of Accounting')
    expect(a).toEqual(b) // deterministic
    expect(a).toHaveLength(DEPARTMENT_GROUPS.Accounting.length)
    a.forEach((row, i) => {
      expect(row.target).toBe(DEPARTMENT_GROUPS.Accounting[i].target)
      expect(row.score).toBeGreaterThanOrEqual(1)
      expect(row.score).toBeLessThanOrEqual(5)
      expect(isHalfStep(row.score)).toBe(true)
    })
  })

  it('returns [] for a position with no assignment', () => {
    expect(getAssessmentResult('agung', 'No Such Role')).toEqual([])
  })
})
