import type { EducationLevel } from './talents'

export interface TalentCriteria {
  competencyMin: number | null
  competencyMax: number | null
  performanceMin: number | null
  performanceMax: number | null
  attendanceMin: number | null
  attendanceMax: number | null
  educationLevels: EducationLevel[]
  yearsMin: number | null
  yearsMax: number | null
}

export function emptyCriteria(): TalentCriteria {
  return {
    competencyMin: null, competencyMax: null,
    performanceMin: null, performanceMax: null,
    attendanceMin: null, attendanceMax: null,
    educationLevels: [],
    yearsMin: null, yearsMax: null,
  }
}

export function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export function hasAnyCriteria(c: TalentCriteria): boolean {
  return toNum(c.competencyMin) !== null || toNum(c.competencyMax) !== null
    || toNum(c.performanceMin) !== null || toNum(c.performanceMax) !== null
    || toNum(c.attendanceMin) !== null || toNum(c.attendanceMax) !== null
    || c.educationLevels.length > 0
    || toNum(c.yearsMin) !== null || toNum(c.yearsMax) !== null
}

// ─── Criteria catalogue (shared by PxAddPoolDrawer's popover and the match-
// score breakdown) ───────────────────────────────────────────────────────────
export type CriteriaKey = 'competency' | 'performance' | 'attendance' | 'education' | 'years'
export type RangeCriteriaKey = 'competency' | 'performance' | 'attendance' | 'years'
export interface CriteriaDef { key: CriteriaKey, label: string, icon: string, type: 'range' | 'checklist', unit?: string }

export const CRITERIA_DEFS: CriteriaDef[] = [
  { key: 'competency', label: 'Competency score', icon: 'competencies', type: 'range' },
  { key: 'performance', label: 'Performance score', icon: 'performance', type: 'range' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar', type: 'range', unit: '%' },
  { key: 'education', label: 'Education level', icon: 'education', type: 'checklist' },
  { key: 'years', label: 'Years of service', icon: 'time', type: 'range', unit: 'yrs' },
]
export const CRITERIA_DEF_BY_KEY = Object.fromEntries(CRITERIA_DEFS.map(d => [d.key, d])) as Record<CriteriaKey, CriteriaDef>
export const RANGE_FIELDS: Record<RangeCriteriaKey, { min: keyof TalentCriteria, max: keyof TalentCriteria }> = {
  competency: { min: 'competencyMin', max: 'competencyMax' },
  performance: { min: 'performanceMin', max: 'performanceMax' },
  attendance: { min: 'attendanceMin', max: 'attendanceMax' },
  years: { min: 'yearsMin', max: 'yearsMax' },
}

export function keyHasValue(key: CriteriaKey, c: TalentCriteria): boolean {
  if (key === 'education') return c.educationLevels.length > 0
  const { min, max } = RANGE_FIELDS[key]
  return toNum(c[min] as number | string | null) !== null || toNum(c[max] as number | string | null) !== null
}

// Which of the pool's criteria are actually set — this is what both the
// "add criteria" popover (already-added rows) and the match-score breakdown
// (which rows to show) key off of.
export function activeCriteriaKeys(c: TalentCriteria): CriteriaKey[] {
  return CRITERIA_DEFS.filter(d => keyHasValue(d.key, c)).map(d => d.key)
}

export function matchesCriteria(
  t: { competencyScore: number, performanceScore: number, attendance: number, educationLevel: EducationLevel, joinDate: string },
  c: TalentCriteria,
  yearsOfService: (joinDate: string) => number,
): boolean {
  const cMin = toNum(c.competencyMin); const cMax = toNum(c.competencyMax)
  if (cMin !== null && t.competencyScore < cMin) return false
  if (cMax !== null && t.competencyScore > cMax) return false
  const pMin = toNum(c.performanceMin); const pMax = toNum(c.performanceMax)
  if (pMin !== null && t.performanceScore < pMin) return false
  if (pMax !== null && t.performanceScore > pMax) return false
  const aMin = toNum(c.attendanceMin); const aMax = toNum(c.attendanceMax)
  if (aMin !== null && t.attendance < aMin) return false
  if (aMax !== null && t.attendance > aMax) return false
  if (c.educationLevels.length && !c.educationLevels.includes(t.educationLevel)) return false
  const yMin = toNum(c.yearsMin); const yMax = toNum(c.yearsMax)
  if (yMin !== null || yMax !== null) {
    const yos = yearsOfService(t.joinDate)
    if (yMin !== null && yos < yMin) return false
    if (yMax !== null && yos > yMax) return false
  }
  return true
}
