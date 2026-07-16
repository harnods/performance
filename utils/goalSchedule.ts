// Computes the "repeat preview" for a goal's schedule: given the goal's own
// first period and the goal cycle's end date, cascades forward using the
// same period length (in whole calendar months when the input period is
// month-aligned, otherwise a fixed day-count) until the cycle ends. Purely
// informational — a repeating goal is still stored as a single Goal record;
// this list is only used to preview upcoming periods in the drawer.

export interface RepeatPeriod {
  startDate: string // ISO yyyy-mm-dd
  endDate: string // ISO yyyy-mm-dd
}

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function lastDayOfMonth(year: number, monthIndex0: number): Date {
  return new Date(year, monthIndex0 + 1, 0)
}

function isFirstOfMonth(d: Date): boolean {
  return d.getDate() === 1
}

function isLastOfMonth(d: Date): boolean {
  const next = new Date(d)
  next.setDate(next.getDate() + 1)
  return next.getMonth() !== d.getMonth()
}

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

// Defensive clamp for the Goal schedule's End date picker (the only editable
// schedule field — Start date is fixed to the cycle's own start date). The
// picker's own `disabled-date` prop only grays out invalid calendar cells,
// it doesn't stop a value arriving out of range some other way (typed
// input, a shortcut, a stale default). This re-clamps the actual value
// itself so a goal's period can never end outside the cycle's bounds:
// end can't be after the cycle end or before the current start date.
export function clampEndDate(date: Date, cycleStart: Date, cycleEnd: Date, currentStart: Date | null): Date {
  let d = date
  if (d > cycleEnd) d = cycleEnd
  if (d < cycleStart) d = cycleStart
  if (currentStart && d < currentStart) d = currentStart
  return d
}

export function computeRepeatPeriods(startISO: string, endISO: string, cycleEndISO: string, max = 12): RepeatPeriod[] {
  const start = toDate(startISO)
  const end = toDate(endISO)
  const cycleEnd = toDate(cycleEndISO)
  const periods: RepeatPeriod[] = [{ startDate: startISO, endDate: endISO }]
  if (end >= cycleEnd) return periods

  const wholeMonths = isFirstOfMonth(start) && isLastOfMonth(end) ? monthDiff(start, end) + 1 : null

  let curStart = addDays(end, 1)
  let guard = 0
  while (curStart <= cycleEnd && guard < max) {
    guard++
    let curEnd: Date
    if (wholeMonths) {
      curEnd = lastDayOfMonth(curStart.getFullYear(), curStart.getMonth() + wholeMonths - 1)
    }
    else {
      const lengthDays = Math.round((end.getTime() - start.getTime()) / 86400000)
      curEnd = addDays(curStart, lengthDays)
    }
    if (curEnd > cycleEnd) curEnd = cycleEnd
    periods.push({ startDate: toISO(curStart), endDate: toISO(curEnd) })
    if (curEnd >= cycleEnd) break
    curStart = addDays(curEnd, 1)
  }
  return periods
}
