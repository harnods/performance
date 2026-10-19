import type { GoalReminder, GoalReminderKey } from '~/utils/goalReminders'

// Mock-only store for the goal reminders (Settings › Reminders → Goal
// reminder section). Shared so Goal cycle info can show which reminders run for a
// cycle. Persisted to localStorage like the other prototype stores.
const STORAGE_KEY = 'talenta-goal-reminders-db'
const SEED_VERSION = 4

function seed(): Record<GoalReminderKey, GoalReminder> {
  return {
    creation: { uuid: 'uuid-7', is_active: true, time_before_end: null, repeat_reminder: 2, reminder_for: ['goal-owner', 'superior'] },
    progress: { uuid: 'uuid-6', is_active: true, time_before_end: null, repeat_reminder: 2, reminder_for: ['goal-owner', 'superior'] },
  }
}

const goalReminders = ref<Record<GoalReminderKey, GoalReminder>>(seed())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, reminders: goalReminders.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (parsed?.version === SEED_VERSION && parsed.reminders?.creation) {
      goalReminders.value = parsed.reminders
      return
    }
  }
  catch {
    // fall through to re-seed on corrupt or outdated storage
  }
  persist()
}

export function useGoalRemindersStore() {
  loadFromStorage()

  function saveGoalReminder(key: GoalReminderKey, value: GoalReminder) {
    goalReminders.value = { ...goalReminders.value, [key]: { ...value, reminder_for: [...value.reminder_for] } }
    persist()
  }

  return { goalReminders, saveGoalReminder }
}
