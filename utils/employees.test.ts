import { describe, expect, it } from 'vitest'
import { EMPLOYEES, employeeById, employeeTenureYears, employeeEmploymentStatus } from './employees'

describe('EMPLOYEES data', () => {
  it('has unique ids and required fields', () => {
    const ids = EMPLOYEES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of EMPLOYEES) {
      expect(e.name).toBeTruthy()
      expect(e.code).toBeTruthy()
      expect(e.title).toBeTruthy()
      expect(e.department).toBeTruthy()
    }
  })
})

describe('employeeById', () => {
  it('resolves a known id and returns undefined otherwise', () => {
    expect(employeeById('agung')?.name).toBe('Agung Setiawarman')
    expect(employeeById('nobody')).toBeUndefined()
  })
})

describe('derived HR attributes', () => {
  it('tenure is a stable integer in 0..7', () => {
    for (const e of EMPLOYEES) {
      const y = employeeTenureYears(e.id)
      expect(Number.isInteger(y)).toBe(true)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(7)
      expect(employeeTenureYears(e.id)).toBe(y) // deterministic
    }
  })

  it('employment status is a stable valid enum', () => {
    const valid = new Set(['permanent', 'contract', 'probation'])
    for (const e of EMPLOYEES) {
      const s = employeeEmploymentStatus(e.id)
      expect(valid.has(s)).toBe(true)
      expect(employeeEmploymentStatus(e.id)).toBe(s) // deterministic
    }
  })
})
