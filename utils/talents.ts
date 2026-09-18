// ─────────────────────────────────────────────────────────────────────────────
// Talent directory dataset.
//
// The logged-in user is a manager; this is the list of their reports. Built on
// top of the shared EMPLOYEES mock (same people / ids / photos) so the directory
// stays coherent with Home, the employee-directory modal, and everywhere else an
// employee appears. Here we enrich each person with the HR attributes the Talent
// directory table needs (branch, organization, job level/grade/class, employment
// type, join date, status).
// ─────────────────────────────────────────────────────────────────────────────
import { EMPLOYEES, type Employee } from './employees'

export type EmploymentType = 'Permanent' | 'Contract' | 'Probation' | 'Intern'
export type EmployeeStatus = 'active' | 'resigned'
export type EducationLevel = 'High School' | 'Diploma' | 'Bachelor' | 'Master' | 'Doctorate'

export interface TalentEmployee {
  id: string
  name: string
  code: string
  photo?: string
  branch: string
  organization: string
  jobPosition: string
  jobLevel: string
  jobGrade: string
  jobClass: string
  employmentType: EmploymentType
  joinDate: string // ISO yyyy-mm-dd
  status: EmployeeStatus
  // Pool-criteria attributes (docs/patterns/tabs.md — talent pool criteria drawer).
  competencyScore: number // 0-100
  performanceScore: number // 0-100
  attendance: number // 0-100, percentage
  educationLevel: EducationLevel
}

// Per-person HR attributes, keyed by the shared employee id. Kept coherent with
// each person's title/department in EMPLOYEES (jobPosition = title, organization
// = department) — only the extra directory fields are declared here.
type Extra = Omit<TalentEmployee, 'id' | 'name' | 'code' | 'photo' | 'jobPosition' | 'organization'>

const EXTRA: Record<string, Extra> = {
  rizal:    { branch: 'Jakarta HQ', jobLevel: 'C-Level',   jobGrade: 'G9', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2016-01-04', status: 'active',   competencyScore: 95, performanceScore: 96, attendance: 99, educationLevel: 'Doctorate' },
  evelyn:   { branch: 'Jakarta HQ', jobLevel: 'Head',      jobGrade: 'G7', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2017-03-13', status: 'active',   competencyScore: 91, performanceScore: 93, attendance: 98, educationLevel: 'Master' },
  rio:      { branch: 'Jakarta HQ', jobLevel: 'Head',      jobGrade: 'G7', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2017-08-21', status: 'active',   competencyScore: 89, performanceScore: 91, attendance: 97, educationLevel: 'Master' },
  bayu:     { branch: 'Jakarta HQ', jobLevel: 'Head',      jobGrade: 'G7', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2018-02-05', status: 'active',   competencyScore: 88, performanceScore: 90, attendance: 96, educationLevel: 'Bachelor' },
  ali:      { branch: 'Jakarta HQ', jobLevel: 'Director',  jobGrade: 'G8', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2017-11-06', status: 'active',   competencyScore: 92, performanceScore: 94, attendance: 98, educationLevel: 'Master' },
  cinta:    { branch: 'Bandung',    jobLevel: 'Manager',   jobGrade: 'G6', jobClass: 'Class B', employmentType: 'Permanent', joinDate: '2019-05-20', status: 'active',   competencyScore: 85, performanceScore: 87, attendance: 96, educationLevel: 'Bachelor' },
  andi:     { branch: 'Bandung',    jobLevel: 'Manager',   jobGrade: 'G6', jobClass: 'Class B', employmentType: 'Permanent', joinDate: '2019-09-16', status: 'active',   competencyScore: 83, performanceScore: 85, attendance: 95, educationLevel: 'Bachelor' },
  indah:    { branch: 'Bandung',    jobLevel: 'Senior',    jobGrade: 'G5', jobClass: 'Class B', employmentType: 'Permanent', joinDate: '2020-07-01', status: 'active',   competencyScore: 80, performanceScore: 82, attendance: 94, educationLevel: 'Bachelor' },
  agung:    { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G4', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2020-10-12', status: 'active',   competencyScore: 76, performanceScore: 79, attendance: 93, educationLevel: 'Bachelor' },
  christin: { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G4', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2021-01-18', status: 'active',   competencyScore: 75, performanceScore: 78, attendance: 92, educationLevel: 'Bachelor' },
  linda:    { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2022-06-06', status: 'active',   competencyScore: 70, performanceScore: 73, attendance: 90, educationLevel: 'Diploma' },
  alfian:   { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2021-04-26', status: 'active',   competencyScore: 72, performanceScore: 74, attendance: 91, educationLevel: 'Bachelor' },
  daud:     { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2021-08-09', status: 'active',   competencyScore: 71, performanceScore: 75, attendance: 92, educationLevel: 'Bachelor' },
  jessie:   { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2022-02-14', status: 'active',   competencyScore: 69, performanceScore: 72, attendance: 89, educationLevel: 'Diploma' },
  eka:      { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G2', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2023-03-01', status: 'active',   competencyScore: 66, performanceScore: 70, attendance: 88, educationLevel: 'Diploma' },
  fajar:    { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Probation', joinDate: '2024-11-04', status: 'active',   competencyScore: 62, performanceScore: 66, attendance: 90, educationLevel: 'High School' },
  galih:    { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2022-09-19', status: 'resigned', competencyScore: 60, performanceScore: 63, attendance: 82, educationLevel: 'High School' },
  joko:     { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Intern',    joinDate: '2023-07-24', status: 'resigned', competencyScore: 58, performanceScore: 61, attendance: 80, educationLevel: 'Diploma' },
  dewi:     { branch: 'Jakarta HQ', jobLevel: 'Head',      jobGrade: 'G7', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2018-06-11', status: 'active',   competencyScore: 90, performanceScore: 92, attendance: 97, educationLevel: 'Master' },
  dian:     { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G4', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2021-02-15', status: 'active',   competencyScore: 74, performanceScore: 77, attendance: 93, educationLevel: 'Bachelor' },
  reza:     { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2022-03-28', status: 'active',   competencyScore: 73, performanceScore: 76, attendance: 91, educationLevel: 'Bachelor' },
  santi:    { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2022-05-09', status: 'active',   competencyScore: 71, performanceScore: 74, attendance: 92, educationLevel: 'Bachelor' },
  yoga:     { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2022-08-22', status: 'active',   competencyScore: 70, performanceScore: 73, attendance: 90, educationLevel: 'Diploma' },
  wisnu:    { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G2', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2023-04-17', status: 'active',   competencyScore: 65, performanceScore: 69, attendance: 89, educationLevel: 'Diploma' },
  putri:    { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2023-10-02', status: 'active',   competencyScore: 63, performanceScore: 67, attendance: 87, educationLevel: 'High School' },
  zainal:   { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2023-08-14', status: 'active',   competencyScore: 61, performanceScore: 65, attendance: 86, educationLevel: 'High School' },
}

export const TALENTS: TalentEmployee[] = EMPLOYEES.map((e: Employee) => {
  const x = EXTRA[e.id]
  return {
    id: e.id,
    name: e.name,
    code: e.code,
    photo: e.photo,
    jobPosition: e.title,
    organization: e.department,
    ...x,
  }
})

// Distinct option lists derived from the data — keeps filters in sync with reality.
const distinct = (vals: string[]) => Array.from(new Set(vals)).sort()
export const BRANCHES = distinct(TALENTS.map(t => t.branch))
export const ORGANIZATIONS = distinct(TALENTS.map(t => t.organization))
export const JOB_POSITIONS = distinct(TALENTS.map(t => t.jobPosition))
export const JOB_LEVELS = distinct(TALENTS.map(t => t.jobLevel))
export const JOB_GRADES = distinct(TALENTS.map(t => t.jobGrade))
export const JOB_CLASSES = distinct(TALENTS.map(t => t.jobClass))
export const EMPLOYMENT_TYPES = distinct(TALENTS.map(t => t.employmentType))
export const EDUCATION_LEVELS: EducationLevel[] = ['High School', 'Diploma', 'Bachelor', 'Master', 'Doctorate']

// Aging string ("5y 6m") from join date to `now`. Whole months, floored.
export function aging(joinDate: string, now = new Date()): string {
  const start = new Date(joinDate)
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) months = 0
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}m`
  if (m === 0) return `${y}y`
  return `${y}y ${m}m`
}

// "12 Jun 2019" style, locale-stable.
export function formatJoinDate(joinDate: string): string {
  return new Date(joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Whole years of service from join date to `now`. Floored.
export function yearsOfService(joinDate: string, now = new Date()): number {
  const start = new Date(joinDate)
  let years = now.getFullYear() - start.getFullYear()
  const beforeAnniversary = now.getMonth() < start.getMonth()
    || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())
  if (beforeAnniversary) years -= 1
  return Math.max(0, years)
}
