// Mock data for the Succession plan module — replicated from production
// (talenta-performance: src/views/talent-management/succession-pool). Shapes
// mirror the prod API: a pool has a key position + organization + successor
// talents each with a readiness (99 = Ready now, 1..5 = n year(s)); the
// Employee view is the same successors flattened one row per person.
import { EMPLOYEES, employeeById, employeeTenureYears, employeeEmploymentStatus, type Employee } from '~/utils/employees'

export interface ReadinessOption { value: string, label: string }
export const READINESS_OPTIONS: ReadinessOption[] = [
  { value: '99', label: 'Ready now' },
  { value: '1', label: '1 year' },
  { value: '2', label: '2 years' },
  { value: '3', label: '3 years' },
  { value: '4', label: '4 years' },
  { value: '5', label: '5 years' },
]
export function readinessLabel(v: string) { return READINESS_OPTIONS.find(o => o.value === v)?.label ?? '—' }

// Minimum service length a candidate must have to appear in the pool.
export const MIN_SERVICE_LENGTH_OPTIONS = [
  { value: '0', label: 'No minimum' },
  { value: '1', label: '1+ years' },
  { value: '2', label: '2+ years' },
  { value: '3', label: '3+ years' },
  { value: '4', label: '4+ years' },
  { value: '5', label: '5+ years' },
]
// Employment status filter (Talenta defaults + "any").
export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Any employment status' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'probation', label: 'Probation' },
]

export const ORGANIZATIONS = ['Accounting', 'Sales', 'Marketing', 'Kitchen', 'Front of House', 'Operations', 'HR', 'Management']

// Candidate employees for a succession pool, filtered by the Step 1 criteria:
// minimum service length (years) and employment status. Empty/"0"/"" = no
// constraint on that dimension. Returns the matching employee ids.
export function candidateIds(minServiceLength: string, employmentStatus: string): string[] {
  const min = Number(minServiceLength || '0')
  return EMPLOYEES
    .filter(e => employeeTenureYears(e.id) >= min
      && (!employmentStatus || employeeEmploymentStatus(e.id) === employmentStatus))
    .map(e => e.id)
}

// Key positions come from the employee DB — every distinct job position (title),
// mapped to the organization it sits in. (Prod: /succession-pools/key-position.)
// The competency assignment for a position (scope + covered values + groups +
// targets) is resolved from the REAL competency data in utils/competency.ts
// (POSITION_INFO / DEPARTMENT_GROUPS), not duplicated here.
export interface KeyPosition { value: string, job: string, organization: string }
function kpSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
const _titleToDept = new Map<string, string>()
for (const e of EMPLOYEES) { if (!_titleToDept.has(e.title)) _titleToDept.set(e.title, e.department) }
export const KEY_POSITIONS: KeyPosition[] = [..._titleToDept.entries()]
  .map(([job, organization]): KeyPosition => ({ value: kpSlug(job), job, organization }))
  .sort((a, b) => a.job.localeCompare(b.job))

export interface SuccessorTalent { employeeId: string, readiness: string }
export interface SuccessionPool {
  id: string
  keyPositionValue: string
  keyPosition: string
  organization: string
  isOldPool: boolean
  // The single scope value (job level / grade / class) this plan was created
  // for — chosen in create Step 2. Its competency targets are the standard.
  scopeValue: string
  successors: SuccessorTalent[]
}

// Seeded pools (Key Position view). Grounded in ~/utils/employees.
export const SUCCESSION_POOLS: SuccessionPool[] = [
  {
    id: 'sp-1', keyPositionValue: 'head-accounting', keyPosition: 'Head of Accounting', organization: 'Accounting', isOldPool: false, scopeValue: 'senior-manager',
    successors: [
      { employeeId: 'agung', readiness: '99' },
      { employeeId: 'christin', readiness: '1' },
      { employeeId: 'dian', readiness: '2' },
    ],
  },
  {
    id: 'sp-2', keyPositionValue: 'sales-director', keyPosition: 'Sales Director', organization: 'Sales', isOldPool: false, scopeValue: 'director',
    successors: [
      { employeeId: 'daud', readiness: '1' },
      { employeeId: 'ali', readiness: '99' },
    ],
  },
  {
    id: 'sp-3', keyPositionValue: 'head-chef', keyPosition: 'Head Chef', organization: 'Kitchen', isOldPool: true, scopeValue: 'manager',
    successors: [
      { employeeId: 'eka', readiness: '3' },
      { employeeId: 'fajar', readiness: '2' },
      { employeeId: 'galih', readiness: '4' },
      { employeeId: 'andi', readiness: '99' },
      { employeeId: 'cinta', readiness: '1' },
      { employeeId: 'bayu', readiness: '5' },
    ],
  },
]

export interface EmployeeRow {
  employee: Employee
  keyPosition: string
  organization: string
  readiness: string
  poolId: string
}
// Employee view — successors flattened, one row per person.
export function employeeRows(): EmployeeRow[] {
  const rows: EmployeeRow[] = []
  for (const pool of SUCCESSION_POOLS) {
    for (const s of pool.successors) {
      const emp = employeeById(s.employeeId)
      if (emp) rows.push({ employee: emp, keyPosition: pool.keyPosition, organization: pool.organization, readiness: s.readiness, poolId: pool.id })
    }
  }
  return rows
}

export function poolById(id: string): SuccessionPool | undefined { return SUCCESSION_POOLS.find(p => p.id === id) }

// Deterministic assessment date per (pool, employee) — stable and SSR-safe
// (derived from a hash, not the clock). Within ~18 months before 1 Jan 2026.
export function assessmentDate(poolId: string, employeeId: string): Date {
  const s = `${poolId}|${employeeId}|assessed`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const d = new Date(2026, 0, 1)
  d.setDate(d.getDate() - (h % 540))
  return d
}

// Candidate pool for the "Add talent" picker in the wizard (everyone not already chosen).
export function allTalents(): Employee[] { return EMPLOYEES }
