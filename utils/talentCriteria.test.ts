import { describe, expect, it } from 'vitest'
import { emptyCriteria, hasAnyCriteria, keyHasValue, matchesCriteria, summarizeCriteria } from './talentCriteria'
import { TALENTS } from './talents'
import { talentAttributes } from './talentAttributes'

describe('emptyCriteria', () => {
  it('starts with nothing set', () => {
    const c = emptyCriteria()
    expect(hasAnyCriteria(c)).toBe(false)
    expect(keyHasValue('competency', c)).toBe(false)
    expect(keyHasValue('attendance', c)).toBe(false)
  })

  it('does not share nested objects between instances', () => {
    const a = emptyCriteria()
    const b = emptyCriteria()
    a.competency.dna.from = 4
    a.attendance.absent.enabled = true
    expect(b.competency.dna.from).toBeNull()
    expect(b.attendance.absent.enabled).toBe(false)
  })
})

describe('keyHasValue', () => {
  it('counts a competency rule only once it is bounded', () => {
    const c = emptyCriteria()
    c.competency.dna.op = 'atLeast'
    expect(keyHasValue('competency', c)).toBe(false)
    c.competency.dna.from = 4
    expect(keyHasValue('competency', c)).toBe(true)
  })

  it('counts a ticked attendance issue even with no day cap', () => {
    const c = emptyCriteria()
    c.attendance.absent.enabled = true
    expect(keyHasValue('attendance', c)).toBe(true)
  })
})

describe('summarizeCriteria', () => {
  it('is empty when nothing is set', () => {
    expect(summarizeCriteria({}, emptyCriteria())).toBe('')
  })

  it('leads with the scope, then each set criterion', () => {
    const c = emptyCriteria()
    c.educationMin = 'Bachelor'
    c.yearsMin = 2
    c.attendance.absent = { enabled: true, maxDays: 0 }
    expect(summarizeCriteria({ jobPosition: 'Junior Sales Executive', branch: 'Jakarta HQ' }, c))
      .toBe('Junior Sales Executive, Jakarta HQ, At least Bachelor, Absent at most 0 days, At least 2 years of service')
  })

  it('spells out each competency operator', () => {
    const c = emptyCriteria()
    c.competency.dna = { op: 'atLeast', from: 4, to: null }
    expect(summarizeCriteria({}, c)).toBe('8 DNA competencies at least 4')
    c.competency.dna = { op: 'between', from: 3, to: 4.5 }
    expect(summarizeCriteria({}, c)).toBe('8 DNA competencies 3–4.5')
    c.competency.dna = { op: 'exactly', from: 4, to: null }
    expect(summarizeCriteria({}, c)).toBe('8 DNA competencies 4')
  })

  it('names the review type a picked result belongs to', () => {
    const c = emptyCriteria()
    c.performance.manager = 'Meets expectations'
    expect(summarizeCriteria({}, c)).toBe('Manager review Meets expectations')
  })

  it('singularizes a one-day attendance cap', () => {
    const c = emptyCriteria()
    c.attendance.lateClockIn = { enabled: true, maxDays: 1 }
    expect(summarizeCriteria({}, c)).toBe('Late clock in at most 1 day')
  })

  it('names a ticked issue with no cap, without a day count', () => {
    const c = emptyCriteria()
    c.attendance.dayOff = { enabled: true, maxDays: null }
    expect(summarizeCriteria({}, c)).toBe('Day off')
  })
})

describe('matchesCriteria', () => {
  const talent = TALENTS[0]
  const attrs = talentAttributes(talent)

  it('matches everyone when nothing is set', () => {
    expect(TALENTS.every(t => matchesCriteria(t, emptyCriteria()))).toBe(true)
  })

  it('applies an education floor ordinally', () => {
    const c = emptyCriteria()
    c.educationMin = 'High School'
    expect(matchesCriteria(talent, c)).toBe(true)
    c.educationMin = 'Doctorate'
    expect(matchesCriteria(talent, c)).toBe(attrs.education === 'Doctorate')
  })

  it('applies a years-of-service floor', () => {
    const c = emptyCriteria()
    c.yearsMin = 0
    expect(matchesCriteria(talent, c)).toBe(true)
    c.yearsMin = 99
    expect(matchesCriteria(talent, c)).toBe(false)
  })

  it('matches a performance result exactly, not "or better"', () => {
    const c = emptyCriteria()
    c.performance.manager = attrs.reviews.manager
    expect(matchesCriteria(talent, c)).toBe(true)
    c.performance.manager = 'Below expectations'
    expect(matchesCriteria(talent, c)).toBe(attrs.reviews.manager === 'Below expectations')
  })

  it('treats a ticked attendance issue as a day cap', () => {
    const c = emptyCriteria()
    c.attendance.absent = { enabled: true, maxDays: 99 }
    expect(matchesCriteria(talent, c)).toBe(true)
    c.attendance.absent = { enabled: true, maxDays: -1 }
    expect(matchesCriteria(talent, c)).toBe(false)
  })

  it('ignores a ticked attendance issue with no cap', () => {
    const c = emptyCriteria()
    c.attendance.absent = { enabled: true, maxDays: null }
    expect(matchesCriteria(talent, c)).toBe(true)
  })

  it('honours each competency operator', () => {
    const score = attrs.competency.dna
    const c = emptyCriteria()
    c.competency.dna = { op: 'exactly', from: score, to: null }
    expect(matchesCriteria(talent, c)).toBe(true)
    c.competency.dna = { op: 'atLeast', from: score + 1, to: null }
    expect(matchesCriteria(talent, c)).toBe(false)
    c.competency.dna = { op: 'atMost', from: score, to: null }
    expect(matchesCriteria(talent, c)).toBe(true)
    c.competency.dna = { op: 'between', from: score - 0.5, to: score + 0.5 }
    expect(matchesCriteria(talent, c)).toBe(true)
  })
})

// The whole Describe → Build → filter → summary chain, which is easy to break
// in one half and not notice in the other.
describe('prompt → criteria → matching → summary', () => {
  it('turns a written description into criteria that filter and read back', async () => {
    const { parsePrompt } = await import('./talentPrompt')
    const { criteria, jobPosition, branch } = parsePrompt(
      'accountant in Jakarta HQ with a bachelor degree, no absents and atleast 2 years of service',
    )

    expect(jobPosition).toBe('Accountant')
    expect(branch).toBe('Jakarta HQ')
    expect(criteria.educationMin).toBe('Bachelor')
    expect(criteria.attendance.absent).toEqual({ enabled: true, maxDays: 0 })
    expect(criteria.yearsMin).toBe(2)

    // Those criteria are the ones the drawer would save, so the same object has
    // to drive both the row filter and the "Showing …" strip.
    const scope = { jobPosition, branch }
    const matched = TALENTS.filter(t =>
      (!scope.jobPosition || t.jobPosition === scope.jobPosition)
      && (!scope.branch || t.branch === scope.branch)
      && matchesCriteria(t, criteria))
    expect(matched.every(t => t.jobPosition === 'Accountant')).toBe(true)
    expect(matched.every(t => talentAttributes(t).years >= 2)).toBe(true)

    expect(summarizeCriteria(scope, criteria))
      .toBe('Accountant, Jakarta HQ, At least Bachelor, Absent at most 0 days, At least 2 years of service')
  })
})
