// Deadline measurement type: a goal achieves 100% if updated on or before its
// deadline date, 0% otherwise — unless graduated "deadline rules" are set,
// which step the achievement down the later an update lands (e.g. "more than
// 3 days late -> 80%", "more than 7 days late -> 50%").

import { toDate } from './goalSchedule'

export interface DeadlineRule {
  id: string
  daysExceed: number | ''
  percentage: number | ''
}

export const MAX_DEADLINE_RULES = 10

export interface DeadlineRuleError {
  index: number
  message: string
}

// Rules must be entered in graduated order: each row's days-exceeded must be
// strictly greater than, and its achievement % strictly lower than, the row
// before it — matching a step function that only ever drops as lateness
// grows. Also rejects duplicate days/percentages and missing fields.
export function validateDeadlineRules(rules: DeadlineRule[]): DeadlineRuleError[] {
  const errors: DeadlineRuleError[] = []
  const seenDays = new Set<number>()
  const seenPercentages = new Set<number>()

  rules.forEach((rule, index) => {
    if (rule.daysExceed === '' || rule.percentage === '') {
      errors.push({ index, message: 'Days exceeded and achievement % are required.' })
      return
    }
    const days = Number(rule.daysExceed)
    const pct = Number(rule.percentage)

    if (seenDays.has(days)) errors.push({ index, message: 'Days exceeded must be unique across rules.' })
    if (seenPercentages.has(pct)) errors.push({ index, message: 'Achievement % must be unique across rules.' })
    seenDays.add(days)
    seenPercentages.add(pct)

    const prev = rules[index - 1]
    if (prev && prev.daysExceed !== '' && days <= Number(prev.daysExceed))
      errors.push({ index, message: 'Days exceeded must be greater than the rule above it.' })
    if (prev && prev.percentage !== '' && pct >= Number(prev.percentage))
      errors.push({ index, message: 'Achievement % must be lower than the rule above it.' })
  })

  return errors
}

// Pure achievement calculator for when a goal's progress gets updated
// (feeds the future progress-update flow — not consumed by the Add Goal
// drawer itself, which only captures the deadline + its rules).
export function computeDeadlineAchievement(deadlineISO: string, updateISO: string, rules: DeadlineRule[] = []): number {
  const deadline = toDate(deadlineISO)
  const update = toDate(updateISO)
  if (update <= deadline) return 100

  const validRules = rules
    .filter((r): r is DeadlineRule & { daysExceed: number, percentage: number } => r.daysExceed !== '' && r.percentage !== '')
    .map(r => ({ daysExceed: Number(r.daysExceed), percentage: Number(r.percentage) }))
    .sort((a, b) => a.daysExceed - b.daysExceed)

  if (!validRules.length) return 0

  const daysLate = Math.round((update.getTime() - deadline.getTime()) / 86400000)
  let achievement = 100
  for (const rule of validRules) {
    if (daysLate >= rule.daysExceed) achievement = rule.percentage
  }
  return achievement
}
