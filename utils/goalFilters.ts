// ─────────────────────────────────────────────────────────────────────────────
// "All filters" drawer helpers — owner-attribute filtering for goal tables.
//
// The All-filters drawer (PxAllFiltersDrawer) narrows goals by attributes of the
// goal's OWNER (goal owner / branch / organization / job position / job level /
// employment status), mirroring talenta-review's DrawerAllFilters scopes. Applied
// filters are keyed by scope → selected values; empty = no filter.
// ─────────────────────────────────────────────────────────────────────────────
import { TALENTS } from '~/utils/talents'
import { employeeById } from '~/utils/employees'

export function ownerMatchesAllFilters(ownerId: string, filters: Record<string, string[]>): boolean {
  const active = Object.entries(filters).filter(([, v]) => v && v.length)
  if (!active.length) return true
  const t = TALENTS.find(x => x.id === ownerId)
  const val = (key: string): string | undefined => {
    switch (key) {
      case 'goal_owner': return ownerId
      case 'branch': return t?.branch
      case 'organization': return t?.organization
      case 'job_position': return t?.jobPosition ?? employeeById(ownerId)?.title
      case 'job_level': return t?.jobLevel
      case 'employment_status': return t?.employmentType
      default: return undefined
    }
  }
  return active.every(([key, vals]) => { const v = val(key); return v != null && vals.includes(v) })
}

export function allFiltersCount(filters: Record<string, string[]>): number {
  return Object.values(filters).filter(v => v && v.length).length
}
