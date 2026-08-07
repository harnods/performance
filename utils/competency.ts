// ─────────────────────────────────────────────────────────────────────────────
// Shared mock: competency assessments per job position.
// Single source of truth — reused wherever competency assessment results are
// shown. Keyed by job position title (matching `title` in utils/employees.ts).
//
// Each position has: a scope attribute (job level / grade / class), the specific
// scope values that actually have an assessment defined, and the competency
// groups + target scores (from its department). An employee's score per group is
// derived deterministically from their id, so it's stable and role-consistent.
// ─────────────────────────────────────────────────────────────────────────────

export type ScopeType = 'job-level' | 'grade' | 'class'

export const JOB_LEVEL_OPTIONS = [
  { value: 'associate', label: 'Associate' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'senior', label: 'Senior' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior-manager', label: 'Senior Manager' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
]
export const GRADE_OPTIONS = Array.from({ length: 6 }, (_, i) => ({ value: `grade-${i + 1}`, label: `Grade ${i + 1}` }))
export const CLASS_OPTIONS = ['A', 'B', 'C', 'D'].map(c => ({ value: `class-${c.toLowerCase()}`, label: `Class ${c}` }))

export function scopeOptions(scope: ScopeType) {
  return scope === 'job-level' ? JOB_LEVEL_OPTIONS : scope === 'grade' ? GRADE_OPTIONS : CLASS_OPTIONS
}

export interface PositionInfo {
  department: string
  scope: ScopeType
  values: string[] // scope values that have an assessment defined
}

// Job position → its department + scope attribute + assessed scope values.
export const POSITION_INFO: Record<string, PositionInfo> = {
  'Accountant': { department: 'Accounting', scope: 'grade', values: ['grade-3', 'grade-4'] },
  'Head of Accounting': { department: 'Accounting', scope: 'job-level', values: ['manager', 'senior-manager'] },
  'Finance Admin': { department: 'Accounting', scope: 'grade', values: ['grade-2', 'grade-3'] },
  'HR Admin': { department: 'HR', scope: 'grade', values: ['grade-3', 'grade-4'] },
  'Head of People': { department: 'HR', scope: 'job-level', values: ['manager', 'senior-manager', 'director'] },
  'Sales Director': { department: 'Sales', scope: 'job-level', values: ['director', 'vp'] },
  'Sales Representative': { department: 'Sales', scope: 'grade', values: ['grade-2', 'grade-3', 'grade-4'] },
  'Head Chef': { department: 'Kitchen', scope: 'job-level', values: ['manager', 'senior-manager'] },
  'Sous Chef': { department: 'Kitchen', scope: 'job-level', values: ['specialist', 'senior'] },
  'Head of Marketing': { department: 'Marketing', scope: 'job-level', values: ['manager', 'senior-manager'] },
  'Restaurant Manager': { department: 'Front of House', scope: 'job-level', values: ['manager'] },
  'Barista': { department: 'Front of House', scope: 'class', values: ['class-a', 'class-b'] },
  'Waitstaff': { department: 'Front of House', scope: 'class', values: ['class-b', 'class-c'] },
  'Cashier': { department: 'Front of House', scope: 'class', values: ['class-c', 'class-d'] },
  'CEO': { department: 'Management', scope: 'job-level', values: ['vp'] },
}

export interface GroupTarget { group: string, target: number }

// Competency groups + target scores per department.
export const DEPARTMENT_GROUPS: Record<string, GroupTarget[]> = {
  'Accounting': [
    { group: 'Financial Reporting', target: 4.0 },
    { group: 'Accuracy & Detail', target: 4.5 },
    { group: 'Compliance', target: 4.0 },
    { group: 'Analytical Thinking', target: 3.5 },
    { group: 'Communication', target: 3.0 },
  ],
  'HR': [
    { group: 'Recruitment', target: 3.5 },
    { group: 'Employee Relations', target: 4.0 },
    { group: 'HR Compliance', target: 4.0 },
    { group: 'Communication', target: 4.0 },
    { group: 'Leadership', target: 3.5 },
  ],
  'Sales': [
    { group: 'Sales Strategy', target: 4.0 },
    { group: 'Negotiation', target: 4.0 },
    { group: 'Customer Relationship', target: 4.5 },
    { group: 'Communication', target: 4.0 },
    { group: 'Leadership', target: 3.5 },
  ],
  'Kitchen': [
    { group: 'Culinary Skills', target: 4.5 },
    { group: 'Food Safety', target: 4.5 },
    { group: 'Kitchen Management', target: 4.0 },
    { group: 'Teamwork', target: 3.5 },
    { group: 'Leadership', target: 3.5 },
  ],
  'Marketing': [
    { group: 'Brand Strategy', target: 4.0 },
    { group: 'Digital Marketing', target: 4.0 },
    { group: 'Content & Communication', target: 4.0 },
    { group: 'Data Analytics', target: 3.5 },
    { group: 'Leadership', target: 3.5 },
  ],
  'Front of House': [
    { group: 'Customer Service', target: 4.5 },
    { group: 'Communication', target: 4.0 },
    { group: 'Product Knowledge', target: 3.5 },
    { group: 'Teamwork', target: 4.0 },
    { group: 'Attention to Detail', target: 3.5 },
  ],
  'Management': [
    { group: 'Vision & Strategy', target: 4.5 },
    { group: 'Leadership', target: 4.5 },
    { group: 'Decision Making', target: 4.5 },
    { group: 'Business Acumen', target: 4.0 },
    { group: 'Communication', target: 4.0 },
  ],
}

// Succession: only SOME employees are assessed for a future job, and only for a
// realistic next step (keyed by employee id, not title). Entry-level roles
// (waitstaff, barista, cashier) have no future-job assessment. Most employees
// have none — only identified successors do.
export const SUCCESSION_TARGETS: Record<string, string[]> = {
  agung: ['Head of Accounting'], // Accountant identified as successor to the head
  indah: ['Head Chef'], // Sous Chef → Head Chef (direct deputy)
  linda: ['Accountant'], // Finance Admin → Accountant (natural progression)
  christin: ['Head of Accounting'], // Accountant flagged as successor to the head
  daud: ['Sales Director'], // high-potential Sales Rep in the leadership pipeline
}

// Deterministic per (employee, position, group) score — stable across renders.
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function scoreFor(employeeId: string, title: string, group: string, target: number): number {
  const offset = ((hash(`${employeeId}|${title}|${group}`) % 7) - 4) * 0.5 // -2.0 … +1.0
  const raw = Math.max(1, Math.min(5, target + offset))
  return Math.round(raw * 2) / 2
}

// Competency targets for a position at a SPECIFIC scope value. A real
// competency assignment stores a matrix (group × scope value); targets climb
// with seniority. We synthesize that from the department base target: the
// highest scope value that has an assessment carries the full base target, and
// each step down the scope order reduces it by 0.5 (floored at 1). So picking a
// different scope value in Succession Step 2 yields a different target column.
export function targetsForScopeValue(title: string, scopeValue: string): GroupTarget[] {
  const info = POSITION_INFO[title]
  if (!info) return []
  const order = scopeOptions(info.scope).map(o => o.value)
  const rank = order.indexOf(scopeValue)
  if (rank < 0) return []
  const topCoveredRank = Math.max(...info.values.map(v => order.indexOf(v)))
  const steps = Math.max(0, topCoveredRank - rank)
  return (DEPARTMENT_GROUPS[info.department] ?? []).map((g) => {
    const raw = g.target - steps * 0.5
    return { group: g.group, target: Math.round(Math.max(1, Math.min(5, raw)) * 2) / 2 }
  })
}

export interface AssessmentRow { group: string, score: number, target: number }

// Competency result for an employee in a given job position.
export function getAssessmentResult(employeeId: string, title: string): AssessmentRow[] {
  const info = POSITION_INFO[title]
  if (!info) return []
  return (DEPARTMENT_GROUPS[info.department] ?? []).map(g => ({
    group: g.group,
    target: g.target,
    score: scoreFor(employeeId, title, g.group, g.target),
  }))
}
