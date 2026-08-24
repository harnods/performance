// ─────────────────────────────────────────────────────────────────────────────
// "All filters" drawer helpers — narrows goal tables by the goal's own Category
// plus attributes of the goal's OWNER (goal owner / branch / organization /
// job position / job level / employment status), mirroring talenta-review's
// DrawerAllFilters scopes. Applied filters are keyed by scope → selected
// values; empty = no filter.
// ─────────────────────────────────────────────────────────────────────────────
import { TALENTS } from '~/utils/talents'
import { employeeById } from '~/utils/employees'

// Mirrors the statusLabel maps duplicated across each goals page's <script> —
// keep in sync if those ever change ('green' → On track, 'orange' → Off
// track, 'gray' → Not started).
const STATUS_LABEL: Record<string, string> = { green: 'On track', orange: 'Off track', gray: 'Not started' }

export function goalMatchesAllFilters(goal: { ownerId: string, category: string, status?: string }, filters: Record<string, string[]>): boolean {
  const active = Object.entries(filters).filter(([, v]) => v && v.length)
  if (!active.length) return true
  const t = TALENTS.find(x => x.id === goal.ownerId)
  const val = (key: string): string | undefined => {
    switch (key) {
      case 'status': return goal.status ? STATUS_LABEL[goal.status] : undefined
      case 'category': return goal.category
      case 'goal_owner': return goal.ownerId
      case 'branch': return t?.branch
      case 'organization': return t?.organization
      case 'job_position': return t?.jobPosition ?? employeeById(goal.ownerId)?.title
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
