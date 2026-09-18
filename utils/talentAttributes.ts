// ─────────────────────────────────────────────────────────────────────────────
// The per-talent attributes the pool builder filters on (components/PxAddPoolDrawer.vue
// "Build" step). Everything here is read back out of `buildProfile` rather than
// re-derived, so a pool that says "8 DNA competencies is at least 4" selects the
// same people the talent profile page shows a 4 for. Deriving these twice is how
// the two screens quietly drift apart.
//
// `buildProfile` is pure and deterministic but does a lot of unrelated work
// (transfers, reprimands, learning), so results are memoized per employee.
// ─────────────────────────────────────────────────────────────────────────────
import { yearsOfService, type TalentEmployee, type EducationLevel, EDUCATION_LEVELS } from './talents'
import { buildProfile, ratingLabel } from './talent-profile'

export type CompetencyGroupKey = 'dna' | 'technical' | 'soft'
export type ReviewKey = 'self' | 'review360' | 'team' | 'manager'
export type AttendanceIssueKey = 'absent' | 'lateClockIn' | 'dayOff'

export const COMPETENCY_GROUPS: { key: CompetencyGroupKey, label: string }[] = [
  { key: 'dna', label: '8 DNA competencies' },
  { key: 'technical', label: 'Technical skills' },
  { key: 'soft', label: 'Soft skills' },
]

export const REVIEW_TYPES: { key: ReviewKey, label: string }[] = [
  { key: 'self', label: 'Self review' },
  { key: 'review360', label: '360 review' },
  { key: 'team', label: 'Team review' },
  { key: 'manager', label: 'Manager review' },
]

export const ATTENDANCE_ISSUES: { key: AttendanceIssueKey, label: string }[] = [
  { key: 'absent', label: 'Absent' },
  { key: 'lateClockIn', label: 'Late clock in' },
  { key: 'dayOff', label: 'Day off' },
]

// Review results, best first. The same scale `ratingLabel` produces, so a
// selected result can be compared against a talent's own label directly.
export const REVIEW_RESULTS = [
  'Outstanding',
  'Exceeds expectations',
  'Meets expectations',
  'Partially meets expectations',
  'Below expectations',
] as const

/** Education is ordinal — "at least Bachelor" also means Master and Doctorate. */
export const EDUCATION_RANK: Record<EducationLevel, number> = Object.fromEntries(
  EDUCATION_LEVELS.map((level, i) => [level, i]),
) as Record<EducationLevel, number>

export interface TalentAttributes {
  competency: Record<CompetencyGroupKey, number>
  reviews: Record<ReviewKey, string>
  /** Days recorded against each attendance issue over the review year. */
  attendanceDays: Record<AttendanceIssueKey, number>
  education: EducationLevel
  years: number
}

const GROUP_NAME: Record<CompetencyGroupKey, string> = {
  dna: '8 DNA competencies',
  technical: 'Technical skills',
  soft: 'Soft skills',
}

const cache = new Map<string, TalentAttributes>()

export function talentAttributes(t: TalentEmployee): TalentAttributes {
  const hit = cache.get(t.id)
  if (hit) return hit

  const profile = buildProfile(t)
  const latest = profile.competencyAssessments[0]
  const groupAverage = (key: CompetencyGroupKey) =>
    latest?.groups.find(g => g.name === GROUP_NAME[key])?.average ?? 0

  const lastPeriod = profile.performance.history[profile.performance.history.length - 1]

  // Attendance issue days: a talent's own attendance percentage decides the
  // budget of "bad" days, spread deterministically across the three issues so
  // the same person always shows the same counts.
  const missed = Math.max(0, Math.round((100 - t.attendance) * 0.6))
  const spread = (offset: number) => (missed === 0 ? 0 : (missed + offset) % (missed + 1))

  const attrs: TalentAttributes = {
    competency: {
      dna: groupAverage('dna'),
      technical: groupAverage('technical'),
      soft: groupAverage('soft'),
    },
    reviews: {
      self: lastPeriod ? ratingLabel(lastPeriod.self) : '',
      review360: lastPeriod ? ratingLabel(lastPeriod.review360) : '',
      team: lastPeriod ? ratingLabel(lastPeriod.team) : '',
      manager: lastPeriod ? ratingLabel(lastPeriod.manager) : '',
    },
    attendanceDays: {
      absent: spread(0),
      lateClockIn: spread(1),
      dayOff: spread(2),
    },
    education: t.educationLevel,
    years: yearsOfService(t.joinDate),
  }
  cache.set(t.id, attrs)
  return attrs
}
