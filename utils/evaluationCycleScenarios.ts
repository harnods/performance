// Per-cycle scenario config for the evaluation cycles in the mini-DB seed.
// Shared by the cycle detail page and the Edit cycle page, so both read the same
// employment status for a cycle.
// Each evaluation cycle pins one employment status + review-period shape + dataset.
export interface CycleScenario {
  employmentStatus: string
  reviewPeriodValue: string
  reviewPeriodSubs: string[]
  datasetKey: string
}
export const MULTI_SUBS = ['Review every 2 months', 'Review window 3 days']
export const SINGLE_SUBS = ['Review start 7 days before end date']
// Today = 15 Jun 2026. Each cycle demonstrates a distinct, date-consistent state:
// a review can only be Completed/Expired once its window has passed, In progress while
// its window is open, and Not started/Upcoming while its window is still in the future.
export const CYCLE_SCENARIOS: Record<string, CycleScenario> = {
  // Probation · multiple period · IN PROGRESS (early windows done, final still upcoming)
  'Probation Evaluation – Batch Jan 2026': {
    employmentStatus: 'Probation', reviewPeriodValue: 'Multiple review period', reviewPeriodSubs: MULTI_SUBS, datasetKey: 'probation-jan',
  },
  // Probation · multiple period · COMPLETED (all windows in the past, all submitted)
  'Probation Evaluation – Batch Sep 2025': {
    employmentStatus: 'Probation', reviewPeriodValue: 'Multiple review period', reviewPeriodSubs: MULTI_SUBS, datasetKey: 'probation-sep',
  },
  // Contract · single period · COMPLETED (window 5–10 Jun has closed: submitted or expired)
  'Contract Evaluation – Batch Mar 2026': {
    employmentStatus: 'Contract', reviewPeriodValue: 'Single review period', reviewPeriodSubs: SINGLE_SUBS, datasetKey: 'contract-mar',
  },
  // Contract · single period · UPCOMING (window 25–30 Sep is in the future → nothing started)
  'Contract Evaluation – Batch Jun 2026': {
    employmentStatus: 'Contract', reviewPeriodValue: 'Single review period', reviewPeriodSubs: SINGLE_SUBS, datasetKey: 'contract-jun',
  },
  // Part-timer · single period · EMPTY (no employees with this status yet → no timeframe)
  'Part-timer Evaluation – Batch Jun 2026': {
    employmentStatus: 'Part-timer', reviewPeriodValue: 'Single review period', reviewPeriodSubs: SINGLE_SUBS, datasetKey: 'none',
  },
  // Probation · multiple period · IN PROGRESS, 13 separate review timeframes (one per
  // monthly cohort) — demonstrates the "In progress" accordion's timeframe-group
  // pagination (TIMEFRAME_GROUP_PAGE_SIZE = 10) actually kicking in.
  'Probation Evaluation – Batch Apr 2026': {
    employmentStatus: 'Probation', reviewPeriodValue: 'Multiple review period', reviewPeriodSubs: MULTI_SUBS, datasetKey: 'probation-apr',
  },
}
