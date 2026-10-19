// Goal reminders. Both run over the whole goal period and only repeat (no lead time).
// Configured on Settings › Reminders
// (Goal reminder section) and summarised on Goal cycle info. Row names and order follow the
// PRD names (Create goal, then Update goal achievement); other copy follows the Mekari
// UX writing library: sentence case, no period on captions, "Save changes" for settings edits.
export type GoalReminderKey = 'creation' | 'progress'

export interface GoalReminder {
  uuid: string
  is_active: boolean
  time_before_end: number | null // unused by goal reminders (kept for the shared reminder shape)
  repeat_reminder: number | null
  reminder_for: string[]
  notify_via: string[] // 'email' | 'push'
}

export interface GoalReminderTarget { value: string, label: string, description: string }

export interface GoalReminderMeta {
  key: GoalReminderKey
  // Settings row
  title: string
  description: string
  toggleId: string
  stopHint: string // drawer help text under "Repeat every"
  targets: GoalReminderTarget[]
  // Goal cycle info
  periodLabel: string
}

export const GOAL_REMINDERS: GoalReminderMeta[] = [
  {
    key: 'creation',
    title: 'Create goal',
    description: 'Notify employees to create and save their goals',
    toggleId: 'goal-creation-toggle',
    stopHint: 'Reminder will stop when the goal cycle ends',
    periodLabel: 'Create goal',
    targets: [
      { value: 'goal-owner', label: 'Employee', description: 'Employee who has no goals yet. Drafted goals and goals awaiting approval don’t count' },
      { value: 'superior', label: 'Superior', description: 'Manager / supervisor who can follow up on subordinate’s goals based on approval line field' },
    ],
  },
  {
    // Production row (slug / toggle id "update-goal-achievement" kept).
    key: 'progress',
    title: 'Update goal achievement',
    description: 'Notify employee to update their goal progress',
    toggleId: 'update-goal-achievement-toggle',
    stopHint: 'Reminder will stop when the goal cycle ends',
    periodLabel: 'Update goal achievement',
    targets: [
      { value: 'goal-owner', label: 'Goal owner', description: 'Employee who has ownership for the goal and able to update the progress' },
      { value: 'superior', label: 'Superior', description: 'Manager / supervisor who can monitor subordinate’s goal progress based on approval line field' },
    ],
  },
]

export const NOTIFY_CHANNELS = [
  { value: 'email', label: 'Email notification', short: 'Email', icon: 'envelope' },
  { value: 'push', label: 'Mobile push notification', short: 'Push notification', icon: 'notification' },
]

// Settings summary: "Email, push notification".
export function goalReminderChannelText(values: string[]): string {
  return NOTIFY_CHANNELS.filter(c => values.includes(c.value))
    .map((c, i) => (i === 0 ? c.short : c.short.charAt(0).toLowerCase() + c.short.slice(1)))
    .join(', ')
}

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
