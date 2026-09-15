// ─────────────────────────────────────────────────────────────────────────────
// Talent-pool "Match score" — an Airene (AI) score of how well a talent fits
// the criteria a pool was created with (pages/talents/talent-directory/index.vue).
// Only the pool's own active criteria are scored (not all five domains always),
// per CRITERIA_DEFS in talentCriteria.ts — a pool filtered on just one
// attribute shows a one-row breakdown, matching that attribute's own value.
// ─────────────────────────────────────────────────────────────────────────────
import { yearsOfService, type TalentEmployee, type EducationLevel } from './talents'
import { CRITERIA_DEFS, activeCriteriaKeys, type TalentCriteria, type CriteriaKey } from './talentCriteria'

export interface ScoreBreakdownItem { key: CriteriaKey, label: string, icon: string, value: number }
export interface MatchScoreResult { overall: number, breakdown: ScoreBreakdownItem[] }

// Ordinal strength, 0-100 — higher formal education reads as a stronger match.
const EDUCATION_RANK: Record<EducationLevel, number> = {
  'High School': 40,
  Diploma: 55,
  Bachelor: 70,
  Master: 85,
  Doctorate: 100,
}

// Years of service normalized against a 15-year ceiling — a long-tenured
// talent maxes out rather than climbing forever.
const YEARS_CEILING = 15

function domainValue(key: CriteriaKey, t: TalentEmployee): number {
  switch (key) {
    case 'competency': return t.competencyScore
    case 'performance': return t.performanceScore
    case 'attendance': return t.attendance
    case 'education': return EDUCATION_RANK[t.educationLevel]
    case 'years': return Math.min(100, Math.round((yearsOfService(t.joinDate) / YEARS_CEILING) * 100))
  }
}

export function computeMatchScore(t: TalentEmployee, criteria: TalentCriteria): MatchScoreResult {
  const keys = activeCriteriaKeys(criteria)
  const defByKey = Object.fromEntries(CRITERIA_DEFS.map(d => [d.key, d]))
  const breakdown: ScoreBreakdownItem[] = keys.map(key => ({
    key,
    label: defByKey[key].label,
    icon: defByKey[key].icon,
    value: domainValue(key, t),
  }))
  const overall = breakdown.length
    ? Math.round(breakdown.reduce((sum, b) => sum + b.value, 0) / breakdown.length)
    : 0
  // Never show 0% — an Airene match is always at least a sliver of a fit.
  return { overall: Math.max(1, overall), breakdown }
}
