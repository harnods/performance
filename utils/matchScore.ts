// ─────────────────────────────────────────────────────────────────────────────
// Talent-pool "Match score" — an Airene (AI) score of how well a talent fits
// the criteria a pool was created with (pages/talents/talent-directory/index.vue).
// Only the pool's own active criteria are scored (not all five domains always),
// per CRITERIA_DEFS in talentCriteria.ts — a pool filtered on just one
// attribute shows a one-row breakdown, matching that attribute's own value.
//
// Like the rest of the pool feature this is local arithmetic, not a model call.
// ─────────────────────────────────────────────────────────────────────────────
import type { TalentEmployee } from './talents'
import { talentAttributes, COMPETENCY_GROUPS, REVIEW_TYPES, ATTENDANCE_ISSUES, REVIEW_RESULTS, EDUCATION_RANK } from './talentAttributes'
import { CRITERIA_DEFS, activeCriteriaKeys, keyHasValue, toNum, type TalentCriteria, type CriteriaKey } from './talentCriteria'

export interface ScoreBreakdownItem { key: CriteriaKey, label: string, icon: string, value: number }
export interface MatchScoreResult { overall: number, breakdown: ScoreBreakdownItem[] }

// Competency groups are scored 0-5; express them as a percentage of the top band.
const COMPETENCY_CEILING = 5
// Years of service normalized against a 15-year ceiling — a long-tenured
// talent maxes out rather than climbing forever.
const YEARS_CEILING = 15

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function domainValue(key: CriteriaKey, t: TalentEmployee, c: TalentCriteria): number {
  const a = talentAttributes(t)
  switch (key) {
    case 'competency': {
      // Only the groups the pool actually bounded.
      const scored = COMPETENCY_GROUPS
        .filter(g => toNum(c.competency[g.key].from) !== null || toNum(c.competency[g.key].to) !== null)
        .map(g => (a.competency[g.key] / COMPETENCY_CEILING) * 100)
      return Math.round(average(scored))
    }
    case 'performance': {
      // Higher result = higher score, on the same descending scale the pool picks from.
      const scored = REVIEW_TYPES
        .filter(r => !!c.performance[r.key])
        .map((r) => {
          const rank = REVIEW_RESULTS.indexOf(a.reviews[r.key] as typeof REVIEW_RESULTS[number])
          return rank === -1 ? 0 : ((REVIEW_RESULTS.length - 1 - rank) / (REVIEW_RESULTS.length - 1)) * 100
        })
      return Math.round(average(scored))
    }
    case 'education':
      return Math.round((EDUCATION_RANK[a.education] / (Object.keys(EDUCATION_RANK).length - 1)) * 100)
    case 'attendance': {
      // Fewer recorded days = better. 10 days against one issue reads as a zero.
      const scored = ATTENDANCE_ISSUES
        .filter(i => c.attendance[i.key].enabled)
        .map(i => Math.max(0, 100 - a.attendanceDays[i.key] * 10))
      return Math.round(average(scored))
    }
    case 'years':
      return Math.min(100, Math.round((a.years / YEARS_CEILING) * 100))
  }
}

export function computeMatchScore(t: TalentEmployee, criteria: TalentCriteria): MatchScoreResult {
  const keys = activeCriteriaKeys(criteria)
  const defByKey = Object.fromEntries(CRITERIA_DEFS.map(d => [d.key, d]))
  const breakdown: ScoreBreakdownItem[] = keys
    .filter(key => keyHasValue(key, criteria))
    .map(key => ({
      key,
      label: defByKey[key].label,
      icon: defByKey[key].icon,
      value: domainValue(key, t, criteria),
    }))
  const overall = breakdown.length
    ? Math.round(breakdown.reduce((sum, b) => sum + b.value, 0) / breakdown.length)
    : 0
  // Never show 0% — an Airene match is always at least a sliver of a fit.
  return { overall: Math.max(1, overall), breakdown }
}
