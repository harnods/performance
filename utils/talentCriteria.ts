// ─────────────────────────────────────────────────────────────────────────────
// Talent-pool criteria — the shape edited in components/PxAddPoolDrawer.vue's
// "Build" step and applied by pages/talents/talent-directory/index.vue.
//
// Each of the five sections is its own accordion in the drawer, with its own
// shape rather than one generic min/max: competency compares per group with an
// operator, performance picks a result per review type, education and years are
// "at least" floors, and attendance caps the days recorded against an issue.
// ─────────────────────────────────────────────────────────────────────────────
import type { EducationLevel } from './talents'
import {
  talentAttributes, COMPETENCY_GROUPS, REVIEW_TYPES, ATTENDANCE_ISSUES, EDUCATION_RANK,
  type CompetencyGroupKey, type ReviewKey, type AttendanceIssueKey,
} from './talentAttributes'
import type { TalentEmployee } from './talents'

export type ComparisonOp = 'exactly' | 'atLeast' | 'atMost' | 'between'
export const COMPARISON_OPS: { value: ComparisonOp, label: string }[] = [
  { value: 'exactly', label: 'Is exactly' },
  { value: 'atLeast', label: 'Is at least' },
  { value: 'atMost', label: 'Is at most' },
  { value: 'between', label: 'Is between' },
]

/** One competency group's rule. `to` is only used by the `between` operator. */
export interface CompetencyRule { op: ComparisonOp, from: number | null, to: number | null }
/** One attendance issue: ticked on, with an optional cap in days. */
export interface AttendanceRule { enabled: boolean, maxDays: number | null }

export interface TalentCriteria {
  competency: Record<CompetencyGroupKey, CompetencyRule>
  /** '' = any result for that review type. */
  performance: Record<ReviewKey, string>
  /** '' = no floor. Ordinal: the talent's level must rank at or above this. */
  educationMin: EducationLevel | ''
  attendance: Record<AttendanceIssueKey, AttendanceRule>
  yearsMin: number | null
}

export function emptyCriteria(): TalentCriteria {
  return {
    competency: Object.fromEntries(
      COMPETENCY_GROUPS.map(g => [g.key, { op: 'exactly' as ComparisonOp, from: null, to: null }]),
    ) as Record<CompetencyGroupKey, CompetencyRule>,
    performance: Object.fromEntries(REVIEW_TYPES.map(r => [r.key, ''])) as Record<ReviewKey, string>,
    educationMin: '',
    attendance: Object.fromEntries(
      ATTENDANCE_ISSUES.map(a => [a.key, { enabled: false, maxDays: null }]),
    ) as Record<AttendanceIssueKey, AttendanceRule>,
    yearsMin: null,
  }
}

export function cloneCriteria(c: TalentCriteria): TalentCriteria {
  return {
    competency: Object.fromEntries(
      Object.entries(c.competency).map(([k, v]) => [k, { ...v }]),
    ) as Record<CompetencyGroupKey, CompetencyRule>,
    performance: { ...c.performance },
    educationMin: c.educationMin,
    attendance: Object.fromEntries(
      Object.entries(c.attendance).map(([k, v]) => [k, { ...v }]),
    ) as Record<AttendanceIssueKey, AttendanceRule>,
    yearsMin: c.yearsMin,
  }
}

export function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// ─── Criteria catalogue (the drawer's accordions + the match-score breakdown) ─
export type CriteriaKey = 'competency' | 'performance' | 'education' | 'attendance' | 'years'
export interface CriteriaDef { key: CriteriaKey, label: string, icon: string }

export const CRITERIA_DEFS: CriteriaDef[] = [
  { key: 'competency', label: 'Competency score', icon: 'competencies' },
  { key: 'performance', label: 'Performance result', icon: 'performance' },
  { key: 'education', label: 'Education level', icon: 'education' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar' },
  { key: 'years', label: 'Year of service', icon: 'time' },
]
export const CRITERIA_DEF_BY_KEY = Object.fromEntries(CRITERIA_DEFS.map(d => [d.key, d])) as Record<CriteriaKey, CriteriaDef>

function competencyBounded(r: CompetencyRule): boolean {
  return toNum(r.from) !== null || (r.op === 'between' && toNum(r.to) !== null)
}

export function keyHasValue(key: CriteriaKey, c: TalentCriteria): boolean {
  switch (key) {
    case 'competency': return COMPETENCY_GROUPS.some(g => competencyBounded(c.competency[g.key]))
    case 'performance': return REVIEW_TYPES.some(r => !!c.performance[r.key])
    case 'education': return !!c.educationMin
    case 'attendance': return ATTENDANCE_ISSUES.some(a => c.attendance[a.key].enabled)
    case 'years': return toNum(c.yearsMin) !== null
  }
}

export function hasAnyCriteria(c: TalentCriteria): boolean {
  return CRITERIA_DEFS.some(d => keyHasValue(d.key, c))
}

// Which of the pool's criteria are actually set — drives both the drawer's
// accordion list and which rows the match-score breakdown shows.
export function activeCriteriaKeys(c: TalentCriteria): CriteriaKey[] {
  return CRITERIA_DEFS.filter(d => keyHasValue(d.key, c)).map(d => d.key)
}

// ─── Matching ────────────────────────────────────────────────────────────────
function competencyMatches(rule: CompetencyRule, score: number): boolean {
  const from = toNum(rule.from)
  const to = toNum(rule.to)
  switch (rule.op) {
    case 'exactly': return from === null || score === from
    case 'atLeast': return from === null || score >= from
    case 'atMost': return from === null || score <= from
    case 'between':
      if (from !== null && score < from) return false
      if (to !== null && score > to) return false
      return true
  }
}

export function matchesCriteria(t: TalentEmployee, c: TalentCriteria): boolean {
  const a = talentAttributes(t)

  for (const g of COMPETENCY_GROUPS) {
    const rule = c.competency[g.key]
    if (competencyBounded(rule) && !competencyMatches(rule, a.competency[g.key])) return false
  }
  // A picked result must match that review type exactly.
  for (const r of REVIEW_TYPES) {
    const want = c.performance[r.key]
    if (want && a.reviews[r.key] !== want) return false
  }
  if (c.educationMin && EDUCATION_RANK[a.education] < EDUCATION_RANK[c.educationMin]) return false
  // A ticked attendance issue caps the days recorded against it.
  for (const issue of ATTENDANCE_ISSUES) {
    const rule = c.attendance[issue.key]
    const max = toNum(rule.maxDays)
    if (rule.enabled && max !== null && a.attendanceDays[issue.key] > max) return false
  }
  const yearsMin = toNum(c.yearsMin)
  if (yearsMin !== null && a.years < yearsMin) return false
  return true
}

// ─── Human-readable summary ──────────────────────────────────────────────────
// Renders a pool's scope + criteria as one comma-separated sentence for the
// "Showing …" bar above the table (docs/patterns/banner.md — summary strip).
// Reads back what was *selected*, not the prompt that was typed, so it stays
// true after the criteria are edited by hand.
function competencyText(label: string, r: CompetencyRule): string | null {
  const from = toNum(r.from)
  const to = toNum(r.to)
  if (r.op === 'between') {
    if (from !== null && to !== null) return `${label} ${from}–${to}`
    if (from !== null) return `${label} at least ${from}`
    if (to !== null) return `${label} at most ${to}`
    return null
  }
  if (from === null) return null
  const word = r.op === 'atLeast' ? 'at least ' : r.op === 'atMost' ? 'at most ' : ''
  return `${label} ${word}${from}`
}

export function summarizeCriteria(
  scope: { jobPosition?: string, branch?: string },
  c: TalentCriteria,
): string {
  const parts: (string | null)[] = [
    scope.jobPosition || null,
    scope.branch || null,
    ...COMPETENCY_GROUPS.map(g => competencyText(g.label, c.competency[g.key])),
    ...REVIEW_TYPES.map(r => (c.performance[r.key] ? `${r.label} ${c.performance[r.key]}` : null)),
    c.educationMin ? `At least ${c.educationMin}` : null,
    ...ATTENDANCE_ISSUES.map((a) => {
      const rule = c.attendance[a.key]
      if (!rule.enabled) return null
      const max = toNum(rule.maxDays)
      return max === null ? a.label : `${a.label} at most ${max} ${max === 1 ? 'day' : 'days'}`
    }),
    toNum(c.yearsMin) !== null ? `At least ${toNum(c.yearsMin)} years of service` : null,
  ]
  return parts.filter(Boolean).join(', ')
}
