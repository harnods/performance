// Shared shape for a goal being drafted in the "New goals" flow — one row
// created once via the Add Goal drawer, saved as a separate record per owner.

import type { DeadlineRule } from './goalDeadline'
import type { CurrencyCode, MeasurementUnit } from './goalTaxonomy'

export interface DraftKeyResult {
  id: string
  title: string
  // Short measurement summary for list display (e.g. "0 → 100%", "By 30 Jun 2026").
  target: string
  // Rich fields (mirrors production ModalKeyResult / InputMeasurement).
  description?: string
  kpiDirection?: 'higher' | 'lower' // Increase (higher) / Decrease (lower) KPI
  measurementUnit?: MeasurementUnit // percentage | number | amount | deadline
  currency?: CurrencyCode // only when measurementUnit === 'amount'
  useBaseline?: boolean
  startValue?: number | '' // baseline
  targetValue?: number | ''
  deadlineDate?: string // ISO yyyy-mm-dd — only when measurementUnit === 'deadline'
  deadlineRules?: DeadlineRule[]
  progressMechanism?: 'manual' | 'log-based' // progress update method (matches goal cycle); only when kpiDirection === 'higher'
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
  startDate: string // ISO yyyy-mm-dd
  endDate: string // ISO yyyy-mm-dd
  measurementUnit: MeasurementUnit
  currency: CurrencyCode // only meaningful when measurementUnit === 'amount'
  startValue: number
  targetValue: number
  useBaseline: boolean
  baselineValue: number
  direction: 'higher' | 'lower'
  deadlineDate: string // ISO yyyy-mm-dd — only meaningful when measurementUnit === 'deadline'
  deadlineRules: DeadlineRule[]
  // ownerId -> ids of employees contributing to that owner's copy of this goal
  contributorsByOwner: Record<string, string[]>
  viewerIds: string[]
  keyResults: DraftKeyResult[]
  restrictedVisibility: boolean // organization goal type only
  // Which of the page's selected owners this drafted entry still applies to.
  // Starts as every owner selected for the page; editing one owner's row
  // detaches them into their own DraftGoal, shrinking this list on the
  // original. Removing the last owner drops the entry entirely.
  ownerIds: string[]
}

let seq = 0
export function nextGoalCode(): string {
  seq += 1
  return String(1000 + seq)
}
