// Converts between the Add/Edit Goal drawer's draft shape (DraftGoal —
// display labels, one shared definition regardless of owner count) and the
// real persisted Goal record (slugs/enums, one record per owner). Shared by
// the "New goals" create flow and every page's "Edit goal" flow so both
// sides of the round-trip use the exact same vocabulary.

import type { Employee } from './employees'
import type { DraftGoal } from './goalDraft'
import type { Goal, GoalCategory, GoalLevel, GoalUnit } from '~/composables/useGoalsStore'
import type { CurrencyCode } from './goalTaxonomy'

export const GOAL_TYPE_LABEL_TO_LEVEL: Record<string, GoalLevel> = {
  'Company goal': 'company',
  'Organization goal': 'organization',
  'Team goal': 'team',
  'Individual goal': 'individual',
}
export const LEVEL_TO_GOAL_TYPE_LABEL: Record<GoalLevel, string> = {
  company: 'Company goal',
  organization: 'Organization goal',
  team: 'Team goal',
  individual: 'Individual goal',
}
export const MEASUREMENT_UNIT_TO_GOAL_UNIT: Record<string, GoalUnit> = {
  percentage: 'percent',
  amount: 'currency',
  number: 'count',
  deadline: 'deadline',
}
export const GOAL_UNIT_TO_MEASUREMENT_UNIT: Record<GoalUnit, string> = {
  percent: 'percentage',
  currency: 'amount',
  count: 'number',
  deadline: 'deadline',
}

// One drafted goal definition becomes one real Goal per owner — "each
// selected owner will receive their own copy of this goal" — so this maps
// a single owner at a time; callers loop over their own owner list.
export function goalFromDraft(draft: DraftGoal, owner: Employee, isDraft: boolean): Omit<Goal, 'cycleId'> {
  const level = GOAL_TYPE_LABEL_TO_LEVEL[draft.goalType]
  const unit = MEASUREMENT_UNIT_TO_GOAL_UNIT[draft.measurementUnit]
  // Deadline goals have no baseline/target scale — achievement only exists
  // once a progress update lands relative to the deadline (see
  // utils/goalDeadline.ts), so there's nothing to compute yet at creation.
  const isDeadline = draft.measurementUnit === 'deadline'
  const min = isDeadline ? 0 : (draft.useBaseline ? draft.baselineValue : 0)
  const max = isDeadline ? 100 : draft.targetValue
  const value = isDeadline ? 0 : min
  const pill = !isDeadline && max > 0 ? Math.round((value / max) * 100) : 0
  return {
    id: `${draft.id}-${owner.id}`,
    level,
    ownerId: owner.id,
    department: owner.department,
    category: draft.category as GoalCategory,
    subCategory: draft.subCategory,
    code: draft.code,
    title: draft.name,
    weight: draft.weight,
    contributorIds: draft.contributorsByOwner[owner.id] ?? [],
    viewerIds: [...draft.viewerIds],
    status: 'gray',
    unit,
    currency: draft.measurementUnit === 'amount' ? draft.currency : undefined,
    value,
    pill,
    min,
    max,
    startDate: draft.startDate,
    endDate: draft.endDate,
    repeat: draft.repeat,
    deadlineDate: isDeadline ? draft.deadlineDate : undefined,
    deadlineRules: isDeadline ? draft.deadlineRules : undefined,
    isDraft,
    description: draft.description,
    useBaseline: draft.useBaseline,
    direction: draft.direction,
    keyResults: draft.keyResults.map(kr => ({ ...kr })),
    restrictedVisibility: draft.restrictedVisibility,
    alignedToId: draft.alignedToId,
    alignedToKrId: draft.alignedToKrId,
  }
}

// Inverse of goalFromDraft — pre-fills the Edit drawer from an already
// persisted Goal. Only meaningful for a single owner at a time (an
// existing Goal record already belongs to exactly one).
export function draftFromGoal(goal: Goal, owner: Employee): DraftGoal {
  const measurementUnit = (GOAL_UNIT_TO_MEASUREMENT_UNIT[goal.unit ?? 'percent'] ?? 'percentage') as DraftGoal['measurementUnit']
  return {
    id: goal.id,
    code: goal.code,
    category: goal.category,
    subCategory: goal.subCategory,
    name: goal.title,
    description: goal.description ?? '',
    goalType: LEVEL_TO_GOAL_TYPE_LABEL[goal.level],
    weight: goal.weight,
    repeat: goal.repeat ?? false,
    startDate: goal.startDate ?? '',
    endDate: goal.endDate ?? '',
    measurementUnit,
    currency: (goal.currency ?? 'IDR') as CurrencyCode,
    startValue: goal.min ?? 0,
    targetValue: goal.max ?? 0,
    useBaseline: goal.useBaseline ?? true,
    baselineValue: goal.min ?? 0,
    direction: goal.direction ?? 'higher',
    deadlineDate: goal.deadlineDate ?? '',
    deadlineRules: goal.deadlineRules ? goal.deadlineRules.map(r => ({ ...r })) : [],
    contributorsByOwner: { [owner.id]: [...(goal.contributorIds ?? [])] },
    viewerIds: [...(goal.viewerIds ?? [])],
    keyResults: goal.keyResults ? goal.keyResults.map(kr => ({ ...kr })) : [],
    restrictedVisibility: goal.restrictedVisibility ?? false,
    ownerIds: [owner.id],
    alignedToId: goal.alignedToId,
    alignedToKrId: goal.alignedToKrId,
    // Prod parity: once a goal has any achievement, its measurement unit &
    // direction are locked on edit (prod keys this off an API flag, not the
    // numeric value; our mock proxy is "achievement > 0").
    hasProgress: (goal.pill ?? 0) > 0,
  }
}
