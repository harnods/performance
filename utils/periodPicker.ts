export type PeriodMode = 'year' | 'semester' | 'quarter' | 'month' | 'week' | 'custom'

export interface PeriodValue {
  mode: PeriodMode
  label: string
  startDate: string // ISO yyyy-mm-dd
  endDate: string // ISO yyyy-mm-dd
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

// Compact range — when start and end share a year, show the year only once at
// the end (e.g. "1 Jan - 30 Jun 2027"); otherwise show it on both.
export function formatRangeCompact(start: Date, end: Date): string {
  if (start.getFullYear() === end.getFullYear())
    return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} - ${formatDateShort(end)}`
  return `${formatDateShort(start)} - ${formatDateShort(end)}`
}

export function yearValue(year: number): PeriodValue {
  return {
    mode: 'year',
    label: String(year),
    startDate: toISO(new Date(year, 0, 1)),
    endDate: toISO(new Date(year, 11, 31)),
  }
}

export function semesterValue(year: number, half: 1 | 2): PeriodValue {
  const start = half === 1 ? new Date(year, 0, 1) : new Date(year, 6, 1)
  const end = half === 1 ? new Date(year, 5, 30) : new Date(year, 11, 31)
  return {
    mode: 'semester',
    label: `H${half} ${year} (${formatRangeCompact(start, end)})`,
    startDate: toISO(start),
    endDate: toISO(end),
  }
}

export function quarterValue(year: number, quarter: 1 | 2 | 3 | 4): PeriodValue {
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0)
  return {
    mode: 'quarter',
    label: `Q${quarter} ${year} (${formatRangeCompact(start, end)})`,
    startDate: toISO(start),
    endDate: toISO(end),
  }
}

export function monthValue(date: Date): PeriodValue {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    mode: 'month',
    label: `${MONTH_LONG[month]} ${year}`,
    startDate: toISO(start),
    endDate: toISO(end),
  }
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay() // 0 = Sun .. 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function weekValue(date: Date): PeriodValue {
  const monday = startOfWeekMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    mode: 'week',
    label: `${formatDateShort(monday)} - ${formatDateShort(sunday)}`,
    startDate: toISO(monday),
    endDate: toISO(sunday),
  }
}

export function customRangeValue(start: Date, end: Date): PeriodValue {
  return {
    mode: 'custom',
    label: formatRangeCompact(start, end),
    startDate: toISO(start),
    endDate: toISO(end),
  }
}

// Reconstruct a PeriodValue from a stored cycle's dates so the picker preselects
// the ORIGINAL preset (e.g. "H1 2026") on edit instead of falling back to a
// custom range. Goal cycles are half-years, so semester is detected first; any
// other shape falls back to a custom range.
export function reconstructPeriod(startDate: string, endDate: string): PeriodValue {
  const s = new Date(startDate)
  const e = new Date(endDate)
  const y = s.getFullYear()
  const isH1 = s.getMonth() === 0 && s.getDate() === 1 && e.getMonth() === 5 && e.getDate() === 30 && e.getFullYear() === y
  const isH2 = s.getMonth() === 6 && s.getDate() === 1 && e.getMonth() === 11 && e.getDate() === 31 && e.getFullYear() === y
  if (isH1) return semesterValue(y, 1)
  if (isH2) return semesterValue(y, 2)
  return customRangeValue(s, e)
}
