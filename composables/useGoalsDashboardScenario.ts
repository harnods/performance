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

// Defaults approximate the real seed: stale goals and goal-creation requests
// exist, progress-update requests do not.
const needsUpdate = ref(true)
const distribution = ref<DistributionScenario>('default')
const goalCreation = ref(true)
const progressUpdate = ref(false)

// Demo submissions, used only when a card is toggled on but the current scope
// holds no real request of that type (the seed has no progress updates at all).
// Shaped like a real Submission so submissionTypeLabel() classifies them
// correctly and the table renders them like any other row.
function demoSubmissions(kind: 'create' | 'progress', cycleId: string, count: number): Submission[] {
  return EMPLOYEES.slice(0, count).map((employee, i) => {
    const submittedAt = new Date(Date.now() - i * 86_400_000).toISOString()
    const base = { id: `dev-scenario-item-${kind}-${employee.id}`, ownerId: employee.id, cycleId }
    return {
      id: `dev-scenario-sub-${kind}-${employee.id}`,
      cycleId,
      ownerId: employee.id,
      submittedAt,
      status: 'pending',
      items: kind === 'create'
        ? [{ ...base, type: 'create' as const }]
        // An edit that moves value/pill is what makes it a progress update.
        : [{
            ...base,
            type: 'edit' as const,
            before: { value: 10, pill: 10 } as never,
            after: { value: 60, pill: 60 } as never,
          }],
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
  }

  return {
    needsUpdate,
    distribution,
    goalCreation,
    progressUpdate,
    reset,
    demoSubmissions,
  }
}
