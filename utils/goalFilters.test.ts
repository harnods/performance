import { describe, expect, it } from 'vitest'
import { allFiltersCount, goalMatchesAllFilters } from './goalFilters'

// ali (Ali Imran): Sales Director, Sales dept; TALENTS: branch Jakarta HQ,
// jobLevel Director, employmentType Permanent, jobPosition = title "Sales Director",
// organization = department "Sales".
const goal = { ownerId: 'ali', category: 'Financial', status: 'green' }

describe('goalMatchesAllFilters', () => {
  it('matches everything when no filter is active', () => {
    expect(goalMatchesAllFilters(goal, {})).toBe(true)
    expect(goalMatchesAllFilters(goal, { branch: [], status: [] })).toBe(true)
  })

  it('matches on category', () => {
    expect(goalMatchesAllFilters(goal, { category: ['Financial'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { category: ['Customer'] })).toBe(false)
  })

  it('maps status slug to its human label before comparing', () => {
    expect(goalMatchesAllFilters(goal, { status: ['On track'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { status: ['Off track'] })).toBe(false)
    expect(goalMatchesAllFilters({ ...goal, status: 'orange' }, { status: ['Off track'] })).toBe(true)
    expect(goalMatchesAllFilters({ ...goal, status: 'gray' }, { status: ['Not started'] })).toBe(true)
  })

  it('matches on owner-derived scopes (branch / job level / employment status / organization)', () => {
    expect(goalMatchesAllFilters(goal, { branch: ['Jakarta HQ'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { branch: ['Bandung'] })).toBe(false)
    expect(goalMatchesAllFilters(goal, { job_level: ['Director'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { employment_status: ['Permanent'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { organization: ['Sales'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { job_position: ['Sales Director'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { goal_owner: ['ali'] })).toBe(true)
  })

  it('requires ALL active filters to pass (AND across scopes)', () => {
    expect(goalMatchesAllFilters(goal, { branch: ['Jakarta HQ'], category: ['Financial'] })).toBe(true)
    expect(goalMatchesAllFilters(goal, { branch: ['Jakarta HQ'], category: ['Customer'] })).toBe(false)
  })

  it('matches when the value is one of several selected within a scope (OR within a scope)', () => {
    expect(goalMatchesAllFilters(goal, { branch: ['Bandung', 'Jakarta HQ'] })).toBe(true)
  })

  it('fails a filter whose derived value is missing (unknown owner)', () => {
    expect(goalMatchesAllFilters({ ownerId: 'ghost', category: 'Financial' }, { branch: ['Jakarta HQ'] })).toBe(false)
  })

  it('handles a goal with no status against a status filter', () => {
    expect(goalMatchesAllFilters({ ownerId: 'ali', category: 'Financial' }, { status: ['On track'] })).toBe(false)
  })
})

describe('allFiltersCount', () => {
  it('counts only the scopes that have at least one selected value', () => {
    expect(allFiltersCount({})).toBe(0)
    expect(allFiltersCount({ branch: [], status: [] })).toBe(0)
    expect(allFiltersCount({ branch: ['Jakarta HQ'], status: [], category: ['Financial'] })).toBe(2)
  })
})
