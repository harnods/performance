import { describe, expect, it } from 'vitest'
import { detectPromptCriteria, parsePrompt } from './talentPrompt'

describe('detectPromptCriteria', () => {
  it('returns nothing for an empty or whitespace-only description', () => {
    expect(detectPromptCriteria('')).toEqual([])
    expect(detectPromptCriteria('   \n  ')).toEqual([])
  })

  it('detects the dimensions in the drawer placeholder example', () => {
    const detected = detectPromptCriteria(
      "High performing accountant staff with atleast 95% attendance and a bachelor's degree",
    )
    expect(detected).toContain('performance') // "performing"
    expect(detected).toContain('jobPosition') // "accountant" — a real job title
    expect(detected).toContain('attendance')
    expect(detected).toContain('education') // "bachelor"
    expect(detected).not.toContain('competency')
    expect(detected).not.toContain('location')
  })

  it('detects a dimension from real data values, not just the generic word', () => {
    expect(detectPromptCriteria('anyone based in Bandung')).toContain('location')
    expect(detectPromptCriteria('our best Barista')).toContain('jobPosition')
  })

  it('respects word boundaries so a keyword inside a longer word does not fire', () => {
    expect(detectPromptCriteria('a mastermind of growth')).not.toContain('education')
    expect(detectPromptCriteria('presenter skills')).not.toContain('attendance')
  })

  it('matches multi-word keywords as a phrase', () => {
    expect(detectPromptCriteria('at least 5 years of service')).toContain('years')
  })

  it('is case-insensitive', () => {
    expect(detectPromptCriteria('COMPETENCY score above 80')).toContain('competency')
  })

  it('reports each dimension once, in catalogue order', () => {
    const detected = detectPromptCriteria('competency and competencies and skills')
    expect(detected).toEqual(['competency'])
  })
})

describe('parsePrompt — value extraction (keyword whitelist, no AI)', () => {
  it('sets the education floor to the lowest level named', () => {
    expect(parsePrompt("a bachelor's degree").criteria.educationMin).toBe('Bachelor')
    expect(parsePrompt('master or doctorate').criteria.educationMin).toBe('Master')
  })

  it('understands Indonesian education shorthand', () => {
    expect(parsePrompt('minimal S1').criteria.educationMin).toBe('Bachelor')
    expect(parsePrompt('lulusan SMA').criteria.educationMin).toBe('High School')
  })

  it('treats "no absents" as Absent capped at zero days', () => {
    const a = parsePrompt('no absents').criteria.attendance
    expect(a.absent).toEqual({ enabled: true, maxDays: 0 })
    expect(a.lateClockIn.enabled).toBe(false)
  })

  it('caps the attendance issue the text names', () => {
    const a = parsePrompt('at most 2 days late clock in').criteria.attendance
    expect(a.lateClockIn.enabled).toBe(true)
    expect(a.lateClockIn.maxDays).toBe(2)
  })

  it('reads "at least" / "atleast" / "N+" into the years floor', () => {
    expect(parsePrompt('atleast 2 years of service').criteria.yearsMin).toBe(2)
    expect(parsePrompt('at least 3 years of service').criteria.yearsMin).toBe(3)
    expect(parsePrompt('5+ years of service').criteria.yearsMin).toBe(5)
  })

  it('turns a competency range into a between rule on every group', () => {
    const c = parsePrompt('competency score 3 to 4').criteria.competency
    expect(c.dna).toEqual({ op: 'between', from: 3, to: 4 })
    expect(c.soft).toEqual({ op: 'between', from: 3, to: 4 })
  })

  it('bounds the group the text names with that group\'s own number', () => {
    const c = parsePrompt('soft skills at least 4').criteria.competency
    expect(c.soft).toEqual({ op: 'atLeast', from: 4, to: null })
  })

  it('reads "under"/"below" as an at-most competency rule', () => {
    const c = parsePrompt('competency below 3').criteria.competency
    expect(c.dna.op).toBe('atMost')
    expect(c.dna.from).toBe(3)
  })

  it('assigns a named performance result to the review type it names', () => {
    const p = parsePrompt('manager review meets expectations').criteria.performance
    expect(p.manager).toBe('Meets expectations')
    expect(p.self).toBe('')
  })

  it('falls back to the manager review when no review type is named', () => {
    const p = parsePrompt('outstanding performance').criteria.performance
    expect(p.manager).toBe('Outstanding')
  })

  it('keeps each number with its own dimension', () => {
    const c = parsePrompt('atleast 95 days attendance and 2 years of service').criteria
    expect(c.yearsMin).toBe(2)
    expect(c.attendance.absent.maxDays).toBe(95)
  })

  it('picks the scope fields out of the text, longest job title first', () => {
    const r = parsePrompt('Head of Accounting in Bandung')
    expect(r.jobPosition).toBe('Head of Accounting')
    expect(r.branch).toBe('Bandung')
  })

  it('detects a dimension with no number, leaving its bounds open', () => {
    const r = parsePrompt('someone with strong competency')
    expect(r.detected).toContain('competency')
    expect(r.criteria.competency.dna.from).toBeNull()
  })

  it('returns fully empty criteria for an empty description', () => {
    const r = parsePrompt('')
    expect(r.detected).toEqual([])
    expect(r.criteria.educationMin).toBe('')
    expect(r.criteria.attendance.absent.enabled).toBe(false)
    expect(r.criteria.yearsMin).toBeNull()
    expect(r.jobPosition).toBe('')
  })
})
