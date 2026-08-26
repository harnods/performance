// ─────────────────────────────────────────────────────────────────────────────
// DEV SCENARIO STATE for the Goals dashboard — NOT a product feature.
//
// Mirrors the dev scenario control on pages/goals/goal-cycles/[id]/index.vue:
// a floating control that forces the page into a state that would otherwise
// need specific seed data to reproduce, so every layout variant can be shown in
// a demo without hand-editing localStorage.
//
// Module-scope refs (same singleton shape as the mini-DB stores) so the control
// and the dashboard share one state without prop drilling.
// ─────────────────────────────────────────────────────────────────────────────

import type { Submission } from './useGoalApprovalsStore'
import { EMPLOYEES } from '~/utils/employees'

export type DistributionScenario = 'default' | 'full' | 'half' | 'quarter'

// Percentages chosen to land in each band of the donut's colour rule
// (>=70 lime, >=40 amber, else red) — see docs/patterns/donut-chart.md.
export const DISTRIBUTION_PERCENT: Record<Exclude<DistributionScenario, 'default'>, number> = {
  full: 100,
  half: 40,
  quarter: 20,
}

// Defaults approximate the real seed: stale goals, goal-creation requests and
// goal edits exist, progress-update requests do not.
const needsUpdate = ref(true)
const distribution = ref<DistributionScenario>('default')
const goalCreation = ref(true)
const progressUpdate = ref(false)
const goalEdit = ref(true)

// Plausible goal titles so the per-goal approval cards ("Goal progress update",
// "Goal edit") have something real-looking in their Goal column — those rows are
// one per goal, so an untitled demo row would render a whole column of
// "Untitled goal".
const DEMO_GOAL_TITLES = [
  'Customer satisfaction rating (≥ 4.5 / 5)',
  'Monthly revenue target (IDR 850M)',
  'Order fulfilment accuracy (≥ 98%)',
  'Team onboarding completion (100%)',
  'Average response time (≤ 2 hours)',
  'Repeat customer rate (≥ 35%)',
]

// Demo submissions, used only when a card is toggled on but the current scope
// holds no real request of that type (the seed has no progress updates at all).
// Shaped like a real Submission so submissionTypeLabel() classifies them
// correctly and the table renders them like any other row.
function demoSubmissions(kind: 'create' | 'progress' | 'edit', cycleId: string, count: number): Submission[] {
  return EMPLOYEES.slice(0, count).map((employee, i) => {
    const submittedAt = new Date(Date.now() - i * 86_400_000).toISOString()
    const base = { id: `dev-scenario-item-${kind}-${employee.id}`, ownerId: employee.id, cycleId }
    const title = DEMO_GOAL_TITLES[i % DEMO_GOAL_TITLES.length]
    let items
    if (kind === 'create') {
      // A real create bundle is 10-13 goals authored in one sitting (see the
      // seed in useGoalApprovalsStore). One item would make the card's "Goals
      // requested" column read 1 for every demo row.
      const goalCount = 10 + (i % 4)
      items = Array.from({ length: goalCount }, (_, n) => ({
        ...base,
        id: `${base.id}-${n + 1}`,
        type: 'create' as const,
      }))
    }
    else if (kind === 'progress') {
      // An edit that moves value/pill is what makes it a progress update.
      items = [{
        ...base,
        type: 'edit' as const,
        before: { title, value: 10, pill: 10 } as never,
        after: { title, value: 60, pill: 60 } as never,
      }]
    }
    else {
      // An edit that leaves value/pill alone falls through to "Goal edit".
      items = [{
        ...base,
        type: 'edit' as const,
        before: { title, subCategory: 'Service Level', value: 40, pill: 40 } as never,
        after: { title, subCategory: 'Guest Experience', value: 40, pill: 40 } as never,
      }]
    }
    return {
      id: `dev-scenario-sub-${kind}-${employee.id}`,
      cycleId,
      ownerId: employee.id,
      submittedAt,
      status: 'pending',
      items,
    } as Submission
  })
}

// A row the scenario invented has no review page to open.
export function isDemoSubmission(submission: Pick<Submission, 'id'>): boolean {
  return submission.id.startsWith('dev-scenario-sub-')
}

export function useGoalsDashboardScenario() {
  function reset() {
    needsUpdate.value = true
    distribution.value = 'default'
    goalCreation.value = true
    progressUpdate.value = false
    goalEdit.value = true
  }

  return {
    needsUpdate,
    distribution,
    goalCreation,
    progressUpdate,
    goalEdit,
    reset,
    demoSubmissions,
  }
}
