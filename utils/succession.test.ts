import { describe, expect, it } from 'vitest'
import {
  KEY_POSITIONS, SUCCESSION_POOLS, READINESS_OPTIONS, EMPLOYMENT_STATUS_OPTIONS, MIN_SERVICE_LENGTH_OPTIONS,
  readinessLabel, employeeRows, candidateIds, poolById, assessmentDate,
} from './succession'
import { EMPLOYEES, employeeById, employeeTenureYears, employeeEmploymentStatus } from './employees'
import { POSITION_INFO, scopeOptions } from './competency'

describe('KEY_POSITIONS', () => {
  it('is one entry per distinct employee title, sorted by job', () => {
    const distinctTitles = new Set(EMPLOYEES.map(e => e.title))
    expect(KEY_POSITIONS).toHaveLength(distinctTitles.size)
    const jobs = KEY_POSITIONS.map(k => k.job)
    expect(jobs).toEqual([...jobs].sort((a, b) => a.localeCompare(b)))
    for (const k of KEY_POSITIONS) expect(k.value).toMatch(/^[a-z0-9-]+$/)
  })
})

describe('readinessLabel', () => {
  it('maps known values and falls back to a dash', () => {
    expect(readinessLabel('99')).toBe('Ready now')
    expect(readinessLabel('1')).toBe('1 year')
    expect(readinessLabel('nope')).toBe('—')
  })
})

describe('candidateIds', () => {
  it('no criteria returns every employee', () => {
    expect(candidateIds('0', '')).toHaveLength(EMPLOYEES.length)
    expect(candidateIds('', '')).toHaveLength(EMPLOYEES.length)
  })

  it('minimum service length filters by tenure', () => {
    const ids = candidateIds('5', '')
    for (const id of ids) expect(employeeTenureYears(id)).toBeGreaterThanOrEqual(5)
    // everyone below 5 is excluded
    const excluded = EMPLOYEES.filter(e => employeeTenureYears(e.id) < 5)
    for (const e of excluded) expect(ids).not.toContain(e.id)
  })

  it('employment status filters exactly', () => {
    const ids = candidateIds('0', 'permanent')
    for (const id of ids) expect(employeeEmploymentStatus(id)).toBe('permanent')
  })

  it('combines both criteria', () => {
    const ids = candidateIds('2', 'contract')
    for (const id of ids) {
      expect(employeeTenureYears(id)).toBeGreaterThanOrEqual(2)
      expect(employeeEmploymentStatus(id)).toBe('contract')
    }
  })
})

describe('poolById', () => {
  it('resolves seeded pools and undefined otherwise', () => {
    expect(poolById('sp-1')?.keyPosition).toBe('Head of Accounting')
    expect(poolById('missing')).toBeUndefined()
  })
})

describe('assessmentDate', () => {
  it('is deterministic and within ~18 months before 2026-01-01', () => {
    const a = assessmentDate('sp-1', 'agung')
    const b = assessmentDate('sp-1', 'agung')
    expect(a.getTime()).toBe(b.getTime())
    const max = new Date(2026, 0, 1).getTime()
    const min = new Date(2024, 6, 1).getTime()
    expect(a.getTime()).toBeLessThanOrEqual(max)
    expect(a.getTime()).toBeGreaterThanOrEqual(min)
  })
})

describe('SUCCESSION_POOLS coherence (demo DB must make sense)', () => {
  it('pools reference real employees and a valid assessment type', () => {
    for (const p of SUCCESSION_POOLS) {
      expect(['talenta', 'manual']).toContain(p.assessmentType)
      expect(p.scopeValue).toBeTruthy()
      for (const s of p.successors) {
        expect(employeeById(s.employeeId), `${p.id} → ${s.employeeId}`).toBeDefined()
        expect(readinessLabel(s.readiness)).not.toBe('—') // valid readiness
      }
    }
  })

  it('each pool key position has a competency assignment, and its scopeValue is covered', () => {
    for (const p of SUCCESSION_POOLS) {
      const info = POSITION_INFO[p.keyPosition]
      expect(info, `${p.keyPosition} in POSITION_INFO`).toBeDefined()
      const covered = new Set(scopeOptions(info!.scope).filter(o => info!.values.includes(o.value)).map(o => o.value))
      expect(covered.has(p.scopeValue), `${p.id} scopeValue ${p.scopeValue} covered`).toBe(true)
    }
  })
})

describe('employeeRows', () => {
  it('flattens to one row per successor across pools', () => {
    const total = SUCCESSION_POOLS.reduce((n, p) => n + p.successors.length, 0)
    expect(employeeRows()).toHaveLength(total)
  })
})

describe('option lists', () => {
  it('expose stable value/label shapes', () => {
    for (const list of [READINESS_OPTIONS, EMPLOYMENT_STATUS_OPTIONS, MIN_SERVICE_LENGTH_OPTIONS]) {
      for (const o of list) {
        expect(o).toHaveProperty('value')
        expect(o).toHaveProperty('label')
      }
    }
  })
})
