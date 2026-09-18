// ─────────────────────────────────────────────────────────────────────────────
// "Describe" mode of the talent-pool drawer (components/PxAddPoolDrawer.vue).
//
// NO AI / NO NETWORK. This is a plain local keyword whitelist matched with
// regexes — nothing is sent anywhere and no model is called, so a deployed
// build costs nothing per prompt. "Airene"/`airene-brand` is only the repo's
// AI-marker glyph (docs/patterns/icons.md); the matching itself is the table
// of keywords below and nothing more.
//
// The user writes what they're looking for in plain language; this module
// turns that text into (a) which criteria dimensions were mentioned — driving
// the grey→green badges — and (b) the concrete values to pre-fill the Build
// step's criteria rows with, so the two halves of the drawer stay in sync.
// ─────────────────────────────────────────────────────────────────────────────
import { BRANCHES, JOB_POSITIONS, EDUCATION_LEVELS, type EducationLevel } from './talents'
import { emptyCriteria, type TalentCriteria } from './talentCriteria'
import {
  COMPETENCY_GROUPS, REVIEW_TYPES, ATTENDANCE_ISSUES, REVIEW_RESULTS, EDUCATION_RANK,
  type CompetencyGroupKey,
} from './talentAttributes'

// Words that point at one competency group specifically, so "technical skills
// at least 4" bounds only that group instead of all three.
const GROUP_KEYWORDS: Record<CompetencyGroupKey, string[]> = {
  dna: ['dna', '8 dna competencies', 'dna competencies'],
  technical: ['technical skill', 'technical skills', 'technical', 'hard skill', 'hard skills'],
  soft: ['soft skill', 'soft skills', 'behavioural', 'behavioral'],
}

// Spelling variants that mean one of EDUCATION_LEVELS. Indonesian shorthand
// (S1/S2/S3, SMA, D3) is included because these descriptions get written in
// mixed ID/EN in practice. The education *dimension* keywords below are derived
// from this table, so a synonym can never tick a level without also lighting
// up the badge.
const EDUCATION_SYNONYMS: Record<EducationLevel, string[]> = {
  'High School': ['high school', 'highschool', 'sma', 'smk', 'secondary school'],
  Diploma: ['diploma', 'd3', 'd4', 'associate degree'],
  Bachelor: ['bachelor', "bachelor's", 'bachelors', 'undergraduate', 's1', 'sarjana'],
  Master: ['master', "master's", 'masters', 'postgraduate', 's2', 'magister'],
  Doctorate: ['doctorate', 'doctoral', 'phd', 'ph.d', 's3'],
}

export type PromptCriteriaKey
  = 'jobPosition' | 'location' | 'competency' | 'performance' | 'education' | 'attendance' | 'years'

export interface PromptCriteriaDef {
  key: PromptCriteriaKey
  label: string
  /** Lower-cased words/phrases that count as mentioning this dimension. */
  keywords: string[]
}

// Data-derived vocabularies: a description naming a real branch ("Bandung") or a
// real job title ("Head Chef") mentions that dimension just as much as the word
// "location" or "job position" does.
const dataWords = (values: string[]) => values.flatMap(v => [v.toLowerCase(), ...v.toLowerCase().split(/\s+/)])

export const PROMPT_CRITERIA: PromptCriteriaDef[] = [
  {
    key: 'jobPosition',
    label: 'Job position',
    keywords: ['job position', 'position', 'role', 'job title', 'title', 'staff', ...dataWords(JOB_POSITIONS)],
  },
  {
    key: 'location',
    label: 'Location',
    keywords: ['location', 'branch', 'office', 'city', 'based in', 'located', ...dataWords(BRANCHES)],
  },
  {
    key: 'competency',
    label: 'Competency score',
    keywords: ['competency', 'competencies', 'competent', 'skill', 'skills', 'skilled', 'capability'],
  },
  {
    key: 'performance',
    label: 'Performance result',
    keywords: ['performance', 'performing', 'performer', 'high performer', 'top performer', 'rating', 'kpi', 'meets expectations', 'exceeds expectations'],
  },
  {
    key: 'education',
    label: 'Education level',
    keywords: ['education', 'degree', 'graduate', 'lulusan', ...Object.values(EDUCATION_SYNONYMS).flat()],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    // The issue labels are keywords too, so "late clock in" reaches the section
    // without the word "attendance" being present.
    keywords: [
      'attendance', 'attend', 'absence', 'absent', 'absents', 'presence', 'present rate',
      ...ATTENDANCE_ISSUES.map(i => i.label.toLowerCase()),
    ],
  },
  {
    key: 'years',
    label: 'Years of service',
    keywords: ['years of service', 'year of service', 'tenure', 'tenured', 'experience', 'seniority', 'senior', 'years', 'yrs'],
  },
]

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Word-boundary match so "master" doesn't fire on "mastermind" and "senior"
// doesn't fire inside another word. Multi-word keywords match as a phrase.
function mentions(text: string, keyword: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escape(keyword)}([^a-z0-9]|$)`, 'i').test(text)
}

/** Which criteria dimensions the description mentions — drives the badge states. */
export function detectPromptCriteria(description: string): PromptCriteriaKey[] {
  const text = description.toLowerCase()
  if (!text.trim()) return []
  return PROMPT_CRITERIA.filter(d => d.keywords.some(k => mentions(text, k))).map(d => d.key)
}

// ─── Value extraction ────────────────────────────────────────────────────────
// Everything below turns the same whitelist into concrete criteria values, so
// typing "a bachelor's degree" ticks Bachelor in the Build step rather than
// just lighting up the badge.

function educationLevelsIn(text: string): EducationLevel[] {
  return EDUCATION_LEVELS.filter(level =>
    EDUCATION_SYNONYMS[level].some(word => mentions(text, word)),
  )
}

interface Bound { min: number | null, max: number | null }
const NO_BOUND: Bound = { min: null, max: null }

// How far from a keyword a number can sit and still belong to it.
const WINDOW = 45

/** Where the first of these keywords occurs, or null. */
function keywordSpan(text: string, keywords: string[]): { start: number, end: number } | null {
  let best: { start: number, end: number } | null = null
  for (const k of keywords) {
    const m = new RegExp(`(^|[^a-z0-9])${escape(k)}([^a-z0-9]|$)`, 'i').exec(text)
    if (!m) continue
    const start = m.index + m[1].length
    if (!best || start < best.start) best = { start, end: start + k.length }
  }
  return best
}

/**
 * The numeric bound belonging to a keyword.
 *
 * Numbers are assigned to the *nearest* keyword, which is what keeps
 * "atleast 95% attendance and 2 years of service" from giving Years of service
 * the 95: both numbers sit inside Years' window, but 2 is adjacent to it.
 */
function rangeFor(text: string, keywords: string[], unit?: RegExp): Bound {
  const span = keywordSpan(text, keywords)
  if (!span) return NO_BOUND

  const candidates = [...text.matchAll(/\d+/g)]
    .map(m => ({ value: Number(m[0]), at: m.index!, end: m.index! + m[0].length }))
    .filter(n => n.end > span.start - WINDOW && n.at < span.end + WINDOW)
  if (!candidates.length) return NO_BOUND

  const distance = (n: { at: number, end: number }) =>
    n.end <= span.start ? span.start - n.end : n.at >= span.end ? n.at - span.end : 0
  // A unit right after the number ("2 years", "95 days") is a stronger signal
  // than raw proximity — in "95 days attendance and 2 years of service" the
  // years figure is nearer the word "attendance", but "days" gives it away.
  const carriesUnit = (n: { end: number }) => !!unit && unit.test(text.slice(n.end, n.end + 10))
  const united = candidates.filter(carriesUnit)
  const pool = united.length ? united : candidates
  const nearest = pool.reduce((a, b) => (distance(b) < distance(a) ? b : a))

  // "80-100", "80 to 100", "between 80 and 100" — only when the nearest number
  // is one end of it, so an unrelated trailing number can't pair up with it.
  const range = /(\d+)\s*(?:%|percent)?\s*(?:-|–|—|to|and)\s*(\d+)/gi
  for (const m of text.matchAll(range)) {
    const from = m.index!
    const to = from + m[0].length
    const isBetween = /between/i.test(text.slice(Math.max(0, from - 10), from))
    if (nearest.at >= from && nearest.end <= to && (isBetween || !/\band\b/i.test(m[0]))) {
      return { min: Number(m[1]), max: Number(m[2]) }
    }
  }

  // Which way the bound points is decided by the words right before the number.
  const lead = text.slice(Math.max(0, nearest.at - 18), nearest.at)
  const trail = text.slice(nearest.end, nearest.end + 2)
  if (/(?:at\s*most|maximum(?:\s*of)?|max(?:\.|imum)?|less than|under|below|<=?|fewer than)\s*$/i.test(lead)) {
    return { min: null, max: nearest.value }
  }
  // "at least 2", "minimum 80", "above 90", ">= 95", "5+" — and a bare number
  // next to the keyword ("95% attendance") reads as a floor too.
  if (/\s*\+/.test(trail) || /(?:at\s*least|atleast|minimum(?:\s*of)?|min(?:\.|imum)?|more than|over|above|>=?|greater than)\s*$/i.test(lead)) {
    return { min: nearest.value, max: null }
  }
  return { min: nearest.value, max: null }
}

// Phrases that carry a value without a number in them.
const PERFECT_ATTENDANCE = ['no absents', 'no absent', 'no absence', 'no absences', 'zero absence', 'zero absences', 'perfect attendance', 'never absent', 'full attendance']

function firstDataMatch(text: string, values: string[]): string {
  // Longest first so "Head of Accounting" wins over "Head Chef"'s "head".
  return [...values].sort((a, b) => b.length - a.length).find(v => mentions(text, v)) ?? ''
}

export interface PromptParseResult {
  /** Dimensions mentioned — the badge states. */
  detected: PromptCriteriaKey[]
  /** Values to pre-fill the Build step's criteria rows with. */
  criteria: TalentCriteria
  /** Scope fields the text names outright, e.g. "Junior Sales Executive in Jakarta". */
  jobPosition: string
  branch: string
}

/**
 * Parse a description into badge states + concrete criteria values.
 * Pure string matching against the whitelist above — no AI, no network.
 */
export function parsePrompt(description: string): PromptParseResult {
  const text = description.toLowerCase()
  const criteria = emptyCriteria()
  const empty: PromptParseResult = { detected: [], criteria, jobPosition: '', branch: '' }
  if (!text.trim()) return empty

  const detected = detectPromptCriteria(description)
  const def = (key: PromptCriteriaKey) => PROMPT_CRITERIA.find(d => d.key === key)!.keywords

  // Competency: a single stated number applies to every group the text doesn't
  // name individually — "competency of at least 4" means all three.
  if (detected.includes('competency')) {
    const { min, max } = rangeFor(text, def('competency'))
    for (const group of COMPETENCY_GROUPS) {
      const own = rangeFor(text, GROUP_KEYWORDS[group.key])
      const bound = own.min !== null || own.max !== null ? own : { min, max }
      const rule = criteria.competency[group.key]
      if (bound.min !== null && bound.max !== null) {
        rule.op = 'between'
        rule.from = bound.min
        rule.to = bound.max
      }
      else if (bound.max !== null) {
        rule.op = 'atMost'
        rule.from = bound.max
      }
      else if (bound.min !== null) {
        rule.op = 'atLeast'
        rule.from = bound.min
      }
    }
  }
  // Performance: a named result applies to whichever review types are named,
  // or to the manager review when the text just says the result.
  if (detected.includes('performance')) {
    const result = REVIEW_RESULTS.find(r => mentions(text, r.toLowerCase()))
      ?? (mentions(text, 'meets expectation') ? 'Meets expectations' : '')
    if (result) {
      const named = REVIEW_TYPES.filter(r => mentions(text, r.label.toLowerCase()))
      const targets = named.length ? named : [REVIEW_TYPES.find(r => r.key === 'manager')!]
      for (const r of targets) criteria.performance[r.key] = result
    }
  }
  // Attendance: "no absents" ticks Absent capped at 0 days; a stated day count
  // caps whichever issues the text names.
  if (detected.includes('attendance')) {
    const perfect = PERFECT_ATTENDANCE.some(p => text.includes(p))
    const stated = rangeFor(text, def('attendance'), /^\s*days?\b/i)
    for (const issue of ATTENDANCE_ISSUES) {
      const named = mentions(text, issue.label.toLowerCase())
      if (issue.key === 'absent' && perfect) {
        criteria.attendance.absent = { enabled: true, maxDays: 0 }
      }
      else if (named) {
        criteria.attendance[issue.key] = { enabled: true, maxDays: stated.max ?? stated.min }
      }
    }
    // The dimension was mentioned but no issue was — tick Absent so the section
    // isn't added empty.
    if (!ATTENDANCE_ISSUES.some(i => criteria.attendance[i.key].enabled)) {
      criteria.attendance.absent = { enabled: true, maxDays: stated.max ?? stated.min }
    }
  }
  if (detected.includes('years')) {
    criteria.yearsMin = rangeFor(text, def('years'), /^\s*(?:years?|yrs?)\b/i).min
  }
  // Education is a floor — the lowest level named is the bar to clear.
  if (detected.includes('education')) {
    const levels = educationLevelsIn(text)
    criteria.educationMin = levels.length
      ? levels.reduce((lowest, l) => (EDUCATION_RANK[l] < EDUCATION_RANK[lowest] ? l : lowest))
      : ''
  }

  return {
    detected,
    criteria,
    jobPosition: firstDataMatch(text, JOB_POSITIONS),
    branch: firstDataMatch(text, BRANCHES),
  }
}
