// ─────────────────────────────────────────────────────────────────────────────
// Deduction score system config (production parity: DrawerDeduction +
// DeductionItem + DeductionScoreForm + DeductionTimeOff + SelectTimeOffPolicy).
// Deducts points from the final review score based on Attendance / Reprimand /
// Time-off data. Edited in CycleDeductionDrawer, persisted with the cycle.
// ─────────────────────────────────────────────────────────────────────────────

export type DeductionFormula = 'amount-per-period' | 'percentage'
export type DeductionAssigned = 'job-level' | 'job-position' | 'all-employee'

export interface ScoreRow { value: number | '' | string, deduct_score: number | '' }
export interface TimeOffBlock { policy_id: string, policy_code: string, policy_name: string, conditions: ScoreRow[] }
export interface EmploymentTag { label: string, value: string }

export interface DeductionConfig {
  deduction_formula: DeductionFormula
  employment_type: DeductionAssigned
  employees_tag_value: EmploymentTag[]
  is_absent: boolean, absent: ScoreRow[]
  is_no_clock_in: boolean, no_clock_in: ScoreRow[]
  is_no_clock_out: boolean, no_clock_out: ScoreRow[]
  is_late_clock_in: boolean, late_clock_in: ScoreRow[]
  is_early_clock_out: boolean, early_clock_out: ScoreRow[]
  is_reprimand: boolean, reprimand: ScoreRow[]
  is_timeoff: boolean, timeoff: TimeOffBlock[]
}

export const ATTENDANCE_GROUPS = [
  { key: 'absent', title: 'Absent', type: 'absent' },
  { key: 'no_clock_in', title: 'No clock in', type: 'no-clock-in' },
  { key: 'no_clock_out', title: 'No clock out', type: 'no-clock-out' },
  { key: 'late_clock_in', title: 'Late clock in', type: 'late-clock-in' },
  { key: 'early_clock_out', title: 'Early clock out', type: 'early-clock-out' },
] as const

export const DEDUCTION_FORMULA_OPTIONS = [
  { value: 'amount-per-period', label: 'By amount per period' },
  { value: 'percentage', label: 'By percentage' },
]
export const DEDUCTION_ASSIGNED_OPTIONS = [
  { value: 'job-level', label: 'By job level' },
  { value: 'job-position', label: 'By job position' },
  { value: 'all-employee', label: 'All employees' },
]

export const JOB_LEVELS = [
  { label: 'Staff', value: 'staff' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Manager', value: 'manager' },
  { label: 'Head / Director', value: 'director' },
]
export const JOB_POSITIONS = [
  { label: 'Accountant', value: 'accountant' },
  { label: 'Sales Representative', value: 'sales-rep' },
  { label: 'HR Admin', value: 'hr-admin' },
  { label: 'Marketing Specialist', value: 'mkt-specialist' },
  { label: 'Waitstaff', value: 'waitstaff' },
]

// Time-off policies (production: paginated /time-off/policies).
export const TIMEOFF_POLICIES = [
  { id: 'annual', policy_code: 'AL', policy_name: 'Annual leave' },
  { id: 'sick', policy_code: 'SL', policy_name: 'Sick leave' },
  { id: 'unpaid', policy_code: 'UL', policy_name: 'Unpaid leave' },
  { id: 'maternity', policy_code: 'ML', policy_name: 'Maternity leave' },
  { id: 'special', policy_code: 'SP', policy_name: 'Special leave' },
]

// Reprimand types reused from the review-method util.
export { REPRIMAND_TYPES } from './reviewMethod'

export function makeScoreRow(): ScoreRow { return { value: '', deduct_score: '' } }
export function makeTimeOffBlock(): TimeOffBlock { return { policy_id: '', policy_code: '', policy_name: '', conditions: [makeScoreRow()] } }

export function makeDeductionConfig(): DeductionConfig {
  return {
    deduction_formula: 'amount-per-period',
    employment_type: 'job-level',
    employees_tag_value: [],
    is_absent: false, absent: [],
    is_no_clock_in: false, no_clock_in: [],
    is_no_clock_out: false, no_clock_out: [],
    is_late_clock_in: false, late_clock_in: [],
    is_early_clock_out: false, early_clock_out: [],
    is_reprimand: false, reprimand: [],
    is_timeoff: false, timeoff: [],
  }
}
