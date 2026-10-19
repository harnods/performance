// Goal reminders. Both run over the whole goal period and only repeat (no lead time).
// Configured on Settings › Reminders
// (Goal reminder section) and summarised on Goal cycle info. Copy follows the
// Mekari UX writing library: sentence case, no period on captions, "Save changes"
// for settings edits, "Repeat every 2 days" (never "day(s)").
export type GoalReminderKey = 'creation' | 'progress'

export interface GoalReminder {
  uuid: string
  is_active: boolean
  time_before_end: number | null // unused by goal reminders (kept for the shared reminder shape)
  repeat_reminder: number | null
  reminder_for: string[]
}

export interface GoalReminderTarget { value: string, label: string, description: string }

export interface GoalReminderMeta {
  key: GoalReminderKey
  // Settings row
  title: string
  description: string
  toggleId: string
  phaseLine: string // summary line: when it runs ("During the goal period")
  stopHint: string // drawer help text under "Repeat every"
  targets: GoalReminderTarget[]
  // Goal cycle info
  periodLabel: string
}

export const GOAL_REMINDERS: GoalReminderMeta[] = [
  {
    key: 'creation',
    title: 'Goal creation',
    description: 'Notify employees to create and save their goals',
    toggleId: 'goal-creation-toggle',
    phaseLine: 'During the goal period',
    stopHint: 'Reminder will stop when the goal period ends',
    periodLabel: 'Goal creation',
    targets: [
      { value: 'goal-owner', label: 'Employee', description: 'Employee who has no goals yet. Drafted goals and goals awaiting approval don’t count' },
      { value: 'superior', label: 'Superior', description: 'Manager / supervisor who can follow up on subordinate’s goals based on approval line field' },
    ],
  },
  {
    // Production row (slug / toggle id "update-goal-achievement" kept).
    key: 'progress',
    title: 'Update goal progress',
    description: 'Notify employee to update their goal progress',
    toggleId: 'update-goal-achievement-toggle',
    phaseLine: 'During the goal period',
    stopHint: 'Reminder will stop when the goal period ends',
    periodLabel: 'Update goal progress',
    targets: [
      { value: 'goal-owner', label: 'Goal owner', description: 'Employee who has ownership for the goal and able to update the progress' },
      { value: 'superior', label: 'Superior', description: 'Manager / supervisor who can monitor subordinate’s goal progress based on approval line field' },
    ],
  },
]

export function goalReminderMeta(key: GoalReminderKey): GoalReminderMeta {
  return GOAL_REMINDERS.find(m => m.key === key)!
}

// Settings summary, same as the review reminders: "everyday" / "every 2 day(s)".
export function goalReminderRepeatText(n: number | null): string {
  return n === 1 ? 'everyday' : `every ${n} day(s)`
}
// Goal cycle info caption: "Repeat every day" / "Repeat every 2 days".
export function goalReminderRepeatCaption(n: number | null): string {
  return n === 1 ? 'Repeat every day' : `Repeat every ${n} days`
}

// "Goal owner, superior" — first label capitalised, the rest lower-case.
export function goalReminderTargetText(key: GoalReminderKey, values: string[]): string {
  const meta = goalReminderMeta(key)
  return values
    .map(v => meta.targets.find(t => t.value === v)?.label ?? v)
    .map((label, i) => (i === 0 ? label : label.charAt(0).toLowerCase() + label.slice(1)))
    .join(', ')
}

export interface CycleReminderItem { key: GoalReminderKey, label: string, caption: string, off?: boolean }

// Reminders that run for a cycle: every goal reminder that is on in Settings (both cover the whole
// goal period of every cycle). None on → empty, the row reads "No reminders".
export function goalRemindersForCycle(reminders: Record<GoalReminderKey, GoalReminder>): CycleReminderItem[] {
  return GOAL_REMINDERS
    .filter(m => reminders[m.key].is_active)
    .map(m => ({ key: m.key, label: m.periodLabel, caption: goalReminderRepeatCaption(reminders[m.key].repeat_reminder) }))
}
