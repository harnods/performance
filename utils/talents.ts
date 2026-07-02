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
}

// Per-person HR attributes, keyed by the shared employee id. Kept coherent with
// each person's title/department in EMPLOYEES (jobPosition = title, organization
// = department) — only the extra directory fields are declared here.
type Extra = Omit<TalentEmployee, 'id' | 'name' | 'code' | 'photo' | 'jobPosition' | 'organization'>

const EXTRA: Record<string, Extra> = {
  rizal:    { branch: 'Jakarta HQ', jobLevel: 'C-Level',   jobGrade: 'G9', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2016-01-04', status: 'active' },
  evelyn:   { branch: 'Jakarta HQ', jobLevel: 'Head',      jobGrade: 'G7', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2017-03-13', status: 'active' },
  rio:      { branch: 'Jakarta HQ', jobLevel: 'Head',      jobGrade: 'G7', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2017-08-21', status: 'active' },
  bayu:     { branch: 'Jakarta HQ', jobLevel: 'Head',      jobGrade: 'G7', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2018-02-05', status: 'active' },
  ali:      { branch: 'Jakarta HQ', jobLevel: 'Director',  jobGrade: 'G8', jobClass: 'Class A', employmentType: 'Permanent', joinDate: '2017-11-06', status: 'active' },
  cinta:    { branch: 'Bandung',    jobLevel: 'Manager',   jobGrade: 'G6', jobClass: 'Class B', employmentType: 'Permanent', joinDate: '2019-05-20', status: 'active' },
  andi:     { branch: 'Bandung',    jobLevel: 'Manager',   jobGrade: 'G6', jobClass: 'Class B', employmentType: 'Permanent', joinDate: '2019-09-16', status: 'active' },
  indah:    { branch: 'Bandung',    jobLevel: 'Senior',    jobGrade: 'G5', jobClass: 'Class B', employmentType: 'Permanent', joinDate: '2020-07-01', status: 'active' },
  agung:    { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G4', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2020-10-12', status: 'active' },
  christin: { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G4', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2021-01-18', status: 'active' },
  linda:    { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2022-06-06', status: 'active' },
  alfian:   { branch: 'Jakarta HQ', jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2021-04-26', status: 'active' },
  daud:     { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Permanent', joinDate: '2021-08-09', status: 'active' },
  jessie:   { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G3', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2022-02-14', status: 'active' },
  eka:      { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G2', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2023-03-01', status: 'active' },
  fajar:    { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Probation', joinDate: '2024-11-04', status: 'active' },
  galih:    { branch: 'Bandung',    jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Contract',  joinDate: '2022-09-19', status: 'resigned' },
  joko:     { branch: 'Surabaya',   jobLevel: 'Staff',     jobGrade: 'G1', jobClass: 'Class C', employmentType: 'Intern',    joinDate: '2023-07-24', status: 'resigned' },
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
export const JOB_LEVELS = distinct(TALENTS.map(t => t.jobLevel))
export const JOB_GRADES = distinct(TALENTS.map(t => t.jobGrade))
export const JOB_CLASSES = distinct(TALENTS.map(t => t.jobClass))
export const EMPLOYMENT_TYPES = distinct(TALENTS.map(t => t.employmentType))

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
