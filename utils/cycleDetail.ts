// ─────────────────────────────────────────────────────────────────────────────
// Derives coherent, deterministic detail data (period/timeframe rows + members)
// for a Performance/Competency review cycle, so the master detail page and the
// per-instance member list stay consistent. Company context: a retail + wholesale
// coffee-beans business (café floor + wholesale sales/ops/accounting).
//
// A cycle's list row already carries `total` (number of period instances) and
// `done` (number already published) — we expand those into concrete periods with
// realistic coffee-business dates and review progress.
// ─────────────────────────────────────────────────────────────────────────────
import { EMPLOYEES } from './employees'
import type { Employee } from './employees'

export type PeriodStatus = 'completed' | 'in-progress' | 'upcoming'

export interface CyclePeriod {
  id: string
  label: string
  start: string
  end: string
  reviewStart: string
  reviewEnd: string
  totalMember: number
  submitted: number
  status: PeriodStatus
  published: boolean
  extended: boolean
  aiSummarized: boolean
}

export interface CycleLike {
  name: string
  purpose: string
  total: number
  done: number
  repeat: string
  config?: { cycle_members?: string[] } | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmt(y: number, m: number, d: number) { return `${d} ${MONTHS[m]} ${y}` }

// Stable pseudo-hash so the same cycle always yields the same numbers.
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

// Roster for a cycle: real subset of the coffee-business staff. Uses the created
// cycle's actual members when present, otherwise a deterministic subset.
export function membersFor(cycle: CycleLike): Employee[] {
  const ids = cycle.config?.cycle_members
  if (ids && ids.length) return ids.map(id => EMPLOYEES.find(e => e.id === id)).filter(Boolean) as Employee[]
  const n = 6 + (hash(cycle.name) % 12) // 6..17
  return EMPLOYEES.slice(0, Math.min(n, EMPLOYEES.length))
}

// Quarter/half/year granularity inferred from the repeat cadence.
function granularityMonths(repeat: string): number {
  const r = repeat.toLowerCase()
  if (r.includes('quarter')) return 3
  if (r.includes('year')) return 12
  if (r.includes('month')) return 1
  return 6
}

export function periodsFor(cycle: CycleLike): CyclePeriod[] {
  const count = Math.max(1, cycle.total || 1)
  const publishedCount = Math.min(cycle.done || 0, count)
  const step = granularityMonths(cycle.repeat)
  const members = membersFor(cycle)
  const memberTotal = members.length
  const h = hash(cycle.name)

  // Anchor so the last published period sits in the recent past and any
  // in-progress period straddles "now" (~mid 2026).
  const baseYear = 2026
  const baseMonth = 0 // start from Jan 2026 and walk forward

  const periods: CyclePeriod[] = []
  for (let i = 0; i < count; i++) {
    const startMonthAbs = baseMonth + i * step
    const y = baseYear + Math.floor(startMonthAbs / 12)
    const m = startMonthAbs % 12
    const endMonthAbs = startMonthAbs + step - 1
    const ey = baseYear + Math.floor(endMonthAbs / 12)
    const em = endMonthAbs % 12
    const lastDay = new Date(ey, em + 1, 0).getDate()

    const label = step === 3 ? `Q${Math.floor(m / 3) + 1} ${y}` : step === 12 ? `FY ${y}` : step === 6 ? `${m < 6 ? 'H1' : 'H2'} ${y}` : `${MONTHS[m]} ${y}`

    let status: PeriodStatus
    let published: boolean
    let submitted: number
    if (i < publishedCount) { status = 'completed'; published = true; submitted = memberTotal }
    else if (i === publishedCount && publishedCount < count) { status = 'in-progress'; published = false; submitted = Math.round(memberTotal * (0.4 + (h % 30) / 100)) }
    else { status = 'upcoming'; published = false; submitted = 0 }

    periods.push({
      id: `p${i}`,
      label,
      start: fmt(y, m, 1),
      end: fmt(ey, em, lastDay),
      reviewStart: fmt(ey, em, Math.max(1, lastDay - 6)),
      reviewEnd: fmt(ey, em, lastDay),
      totalMember: memberTotal,
      submitted: Math.min(submitted, memberTotal),
      status,
      published,
      extended: i === publishedCount && (h % 5 === 0),
      aiSummarized: cycle.purpose === 'performance' && status === 'completed',
    })
  }
  return periods
}
