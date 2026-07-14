// Shared shape for a goal being drafted in the "New goals" flow — one row
// created once via the Add Goal drawer, saved as a separate record per owner.

import type { MeasurementUnit } from './goalTaxonomy'

export interface DraftKeyResult {
  id: string
  title: string
  target: string
}

export interface DraftGoal {
  id: string
  code: string
  category: string
  subCategory: string
  name: string
  description: string
  goalType: string
  weight: number
  repeat: boolean
  repeatEvery: string
  measurementUnit: MeasurementUnit
  startValue: number
  targetValue: number
  useBaseline: boolean
  baselineValue: number
  direction: 'higher' | 'lower'
  // ownerId -> ids of employees contributing to that owner's copy of this goal
  contributorsByOwner: Record<string, string[]>
  viewerIds: string[]
  keyResults: DraftKeyResult[]
}

let seq = 0
export function nextGoalCode(): string {
  seq += 1
  return String(1000 + seq)
}
