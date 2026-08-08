// ─────────────────────────────────────────────────────────────────────────────
// Competency assignment scenarios — the "mini DB" seed for the Competencies
// module. Grounded in the SHARED competency data (utils/competency.ts) so the
// targets here match exactly what Succession Step 2 resolves for the same
// position + scope value. One assignment per real job position (scoped by its
// job level / grade / class), plus a couple of unscoped "baseline" scenarios.
// ─────────────────────────────────────────────────────────────────────────────
import { POSITION_INFO, DEPARTMENT_GROUPS, targetsForScopeValue, type ScopeType } from '~/utils/competency'

export type AssignScope = ScopeType | null // null = unscoped ("All employees")
export interface AssignmentGroup {
  group: string
  ratings: Record<string, number | 'na'> // keyed by scope value ('all' when unscoped)
}
export interface CompetencyAssignment {
  id: string
  name: string
  positions: string[] // real job titles (utils/employees)
  scope: AssignScope
  values: string[] // scope value keys = matrix columns ('all' when unscoped)
  groups: AssignmentGroup[]
  updatedAt: string // ISO — deterministic seed stamp
}

const SCOPE_NAME: Record<ScopeType, string> = { 'job-level': 'Job level', grade: 'Grade', class: 'Class' }
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }

// Ratings for an unscoped baseline: the department's base target under one
// synthetic "all" column.
function unscoped(department: string): AssignmentGroup[] {
  return (DEPARTMENT_GROUPS[department] ?? []).map(g => ({ group: g.group, ratings: { all: g.target } }))
}

export function seedAssignments(): CompetencyAssignment[] {
  const out: CompetencyAssignment[] = []
  let i = 0
  // One scoped assignment per real job position — matrix targets pulled from the
  // shared resolver, so they equal Succession's targets value-for-value.
  for (const [title, info] of Object.entries(POSITION_INFO)) {
    const groups = (DEPARTMENT_GROUPS[info.department] ?? []).map((g) => {
      const ratings: Record<string, number | 'na'> = {}
      for (const v of info.values) {
        const t = targetsForScopeValue(title, v).find(x => x.group === g.group)
        ratings[v] = t ? t.target : 'na'
      }
      return { group: g.group, ratings }
    })
    out.push({
      id: slug(`${title}-${info.scope}`),
      name: `${title} — ${SCOPE_NAME[info.scope]}`,
      positions: [title],
      scope: info.scope,
      values: [...info.values],
      groups,
      updatedAt: `2026-0${(i % 9) + 1}-15T09:00:00`,
      // eslint-disable-next-line
    })
    i++
  }
  // Unscoped legacy baselines (multi-position, "All employees").
  out.push({ id: 'foh-service-baseline', name: 'Front of House service baseline', positions: ['Barista', 'Waitstaff', 'Cashier'], scope: null, values: ['all'], groups: unscoped('Front of House'), updatedAt: '2026-01-10T09:00:00' })
  out.push({ id: 'accounting-baseline', name: 'Accounting competency baseline', positions: ['Accountant', 'Finance Admin', 'Payroll Specialist'], scope: null, values: ['all'], groups: unscoped('Accounting'), updatedAt: '2026-01-12T09:00:00' })
  return out
}
