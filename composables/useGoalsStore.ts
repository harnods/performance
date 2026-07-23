// ─────────────────────────────────────────────────────────────────────────────
// Goals mini-DB — persisted "mock data preseed" for the 26 H1 goal cycle
// (id 'seed-26-h1', matching useGoalCyclesStore). Single source of truth for
// every Goals view: Company / Organization / Team / Individual, plus the
// "My goals" / "My direct reports" personal filters.
//
// Business context: PT Central Perk Indonesia — a wholesale + retail coffee
// bean company that also runs its own coffee shop/cafe. Sourced verbatim
// from H1_2026_Goals_CentralPerk_v4.xlsx's "Goals" master list — every Goal
// ID, category, sub-category, title, target, and weight below is transcribed
// from that file, not invented.
//
// The source itself has no progress-tracking data (it's a goal-setting
// template, not a mid-cycle snapshot) — but H1 2026 (Jan–Jun) has already
// ended by the time this cycle is viewed, so every goal below carries
// invented (not source) end-of-cycle progress: status/unit/value/pill/min/
// max, generated deterministically from each goal's own Target text (parsed
// for its unit — currency/percent/count — and direction, ≥ vs ≤), weighted
// ~70% green (met or exceeded target) / ~30% orange (missed it). Bounded
// scales (ratings out of 5, scores out of 100, percentages) are capped at
// their natural ceiling so an achieved value never exceeds it. A handful of
// non-numeric targets ("Bi-weekly", "By June 30", "Completed") get a status
// only, no progress bar — same as any goal with no unit.
//
// Every one of the 11 named employees below owns ONE 100%-summing set of
// goals that mixes Company/Organization/Team/Individual tags together
// (Level and Category are two independent dimensions of a goal, not
// separate ownership hierarchies) — e.g. Ali Imran's 100% splits across 2
// Organization + 3 Team + 4 Individual goals in a single pot, not four
// separate 100% budgets. Alfian Ramadhan (Rio's only direct report) owns a
// Daud/Jessie-shaped team+individual set cascading from Rio's own HR goals,
// added later so Rio's "My direct reports" view isn't empty. The remaining
// employees in utils/employees.ts (Agung, Christin, Dewi, Fajar, Galih,
// Indah, Joko, Linda) own no goals at all under this model, though several
// appear as `contributorIds` on goals they help deliver.
//
// `alignedToId` is real source data (the "Aligned To" column — the exact
// parent goal this one cascades from) and is the ONLY thing
// utils/goalRows.ts's alignedGoalsOf uses to compute a goal's children: goal
// X's aligned goals are every goal whose alignedToId === X.id, a precise
// reverse lookup, not a guess. Only 47 of 88 goals have one (most goals
// don't have a recorded child) — cross-validated against the source's own
// "Cascade Tree" reference sheet. `viewerIds` (from "Goal Viewers" — who is
// *allowed* to align their own goal to this one, resolved from names, with
// group labels like "All dept heads" expanded to explicit ids) is broader
// than alignedToId and kept as reference data, but no longer drives the
// aligned-goals feature.
// ─────────────────────────────────────────────────────────────────────────────

import type { DeadlineRule } from '~/utils/goalDeadline'
import type { DraftKeyResult } from '~/utils/goalDraft'

export type GoalLevel = 'company' | 'organization' | 'team' | 'individual'
export type GoalCategory = 'Financial' | 'Customer' | 'Internal Process' | 'Learning & Growth'
export type GoalStatus = 'green' | 'orange' | 'gray'
export type GoalUnit = 'currency' | 'percent' | 'count' | 'deadline'

export interface Goal {
  id: string
  cycleId: string
  level: GoalLevel
  ownerId: string // Employee.id from ~/utils/employees
  department: string
  category: GoalCategory
  subCategory: string
  code: string
  title: string
  weight: number
  contributorIds: string[] // employees whose work impacts this goal's outcome (0-2)
  viewerIds: string[] // employees allowed to align their own goal to this one (reference data)
  alignedToId?: string // the parent Goal.id this goal cascades from, if any
  status: GoalStatus
  unit?: GoalUnit
  currency?: string // only meaningful when unit === 'currency'
  value?: number
  pill?: number
  min?: number
  max?: number
  startDate?: string // ISO yyyy-mm-dd — goals created via the "New goals" flow only
  endDate?: string // ISO yyyy-mm-dd
  repeat?: boolean
  deadlineDate?: string // ISO yyyy-mm-dd — only meaningful when unit === 'deadline'
  deadlineRules?: DeadlineRule[]
  isDraft?: boolean // saved via "Save as draft" on the "New goals" page rather than "Save"
  description?: string
  useBaseline?: boolean
  direction?: 'higher' | 'lower'
  keyResults?: DraftKeyResult[]
  restrictedVisibility?: boolean // organization-level goals only — true limits viewing to the goal owner + members
}

// A goal's own `weight` is authored — every owner's goals (across all
// levels mixed together) sum to exactly 100%, their one real budget for the
// cycle. A category's weight is NOT authored — it's never something a user
// types in; it's the sum of that owner's own goal weights that fall under
// this category, across every level, computed in useGoalsStore() below —
// matching the source spreadsheet's own "Category Weight" reference sheet
// (SUMIFS by owner+category ÷ owner's total weight).
export interface GoalWithCategoryWeight extends Goal {
  categoryWeight: number
}

// Lightweight org chart for "My goals" / "My direct reports" — not modeled
// anywhere else in the app, kept local to this store since only the Goals
// module needs it. The department heads report to the CEO; everyone else
// reports to their department head.
export const EMPLOYEE_MANAGER: Record<string, string> = {
  evelyn: 'rizal', rio: 'rizal', ali: 'rizal', bayu: 'rizal', andi: 'rizal', cinta: 'rizal',
  dewi: 'rizal', // new hire, Head of Operations — owns no goals yet (see useGoalsStore's seed comment)
  agung: 'evelyn', christin: 'evelyn', linda: 'evelyn',
  alfian: 'rio',
  daud: 'ali', jessie: 'ali',
  indah: 'andi',
  eka: 'cinta', fajar: 'cinta', galih: 'cinta', joko: 'cinta',
}

// Rizal (CEO) is the only Super Admin in this demo — approval review is
// centralized to him regardless of who's acting as the "logged-in" persona
// (see useCurrentUser.ts), not distributed per-manager.
export function isSuperAdmin(userId: string): boolean {
  return userId === 'rizal'
}

// Everyone except the true top of the hierarchy (Rizal) has a manager —
// used both to gate the "My requests" tab and by needsApproval below.
export function hasManager(userId: string): boolean {
  return userId in EMPLOYEE_MANAGER
}

// Owners whose committed (non-draft) goals already sum to 100% or more in
// this scope — used to keep the "New goals" employee picker from offering
// someone who has no weight left to give a newly added goal, which would
// otherwise let them through the picker only to hit the "must equal exactly
// 100%" block later at Save. Drafts are excluded from the sum since they
// aren't committed yet and are exactly what "New goals" lets you keep adding to.
export function fullyWeightedOwnerIds(goals: Goal[]): Set<string> {
  const sums = new Map<string, number>()
  for (const g of goals) {
    if (g.isDraft) continue
    sums.set(g.ownerId, (sums.get(g.ownerId) ?? 0) + g.weight)
  }
  return new Set([...sums].filter(([, weight]) => weight >= 100).map(([id]) => id))
}

// Whether creating/editing/deleting this owner's goal must go through the
// approval queue (composables/useGoalApprovalsStore.ts) instead of taking
// effect immediately. Approval is centralized to the Super Admin, so this
// only depends on whether the OWNER has a manager at all — not on who's
// currently acting.
export function needsApproval(ownerId: string): boolean {
  return hasManager(ownerId)
}

const CYCLE_ID = 'seed-26-h1'

function g(partial: Omit<Goal, 'cycleId'>): Goal {
  return {
    cycleId: CYCLE_ID,
    ...partial,
  }
}

function seed(): Goal[] {
  return [
  g({
    id: 'rc-01', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Financial', subCategory: 'Revenue Growth',
    code: 'RC-01', title: 'Total company revenue H1 2026 (IDR 9.2B)',
   weight: 15, contributorIds: ['ali', 'bayu'], viewerIds: ['ali', 'bayu', 'cinta'], status: 'green', unit: 'currency', value: 8798000000, pill: 96, min: 0, max: 9200000000,
  }),
  g({
    id: 'rc-02', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Financial', subCategory: 'Profitability',
    code: 'RC-02', title: 'Company EBITDA margin (≥ 18%)',
   weight: 10, contributorIds: ['evelyn'], viewerIds: ['evelyn'], status: 'green', unit: 'percent', value: 18.1, pill: 101, min: 0, max: 18,
  }),
  g({
    id: 'rc-03', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Customer', subCategory: 'Satisfaction',
    code: 'RC-03', title: 'Company NPS score — all channels (≥ 72)',
   weight: 10, contributorIds: ['cinta', 'andi'], viewerIds: ['cinta', 'andi', 'bayu'], status: 'orange', unit: 'count', value: 60, pill: 83, min: 0, max: 72,
  }),
  g({
    id: 'rc-04', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Internal Process', subCategory: 'Strategy Execution',
    code: 'RC-04', title: 'H1 OKR completion rate (≥ 90%)',
   weight: 15, contributorIds: [], viewerIds: ['evelyn', 'rio', 'ali', 'bayu', 'andi', 'cinta'], status: 'orange', unit: 'percent', value: 60.6, pill: 67, min: 0, max: 90,
  }),
  g({
    id: 'rc-05', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Learning & Growth', subCategory: 'Culture & Engagement',
    code: 'RC-05', title: 'Employee engagement score (≥ 75 / 100)',
   weight: 10, contributorIds: ['rio'], viewerIds: ['rio'], status: 'green', unit: 'count', value: 72, pill: 96, min: 0, max: 75,
  }),
  g({
    id: 'rc-06', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Financial', subCategory: 'New Business',
    code: 'RC-06', title: 'New business channel revenue (IDR 500M)',
   weight: 10, contributorIds: ['ali'], viewerIds: [], status: 'green', unit: 'currency', value: 538000000, pill: 108, min: 0, max: 500000000,
  }),
  g({
    id: 'rc-07', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Customer', subCategory: 'Stakeholder',
    code: 'RC-07', title: 'New strategic wholesale partnerships (+5 partnerships)',
   weight: 10, contributorIds: ['ali'], viewerIds: [], status: 'green', unit: 'count', value: 5, pill: 100, min: 0, max: 5,
  }),
  g({
    id: 'rc-08', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Internal Process', subCategory: 'Leadership',
    code: 'RC-08', title: 'Cross-dept executive alignment meetings (Bi-weekly)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'rc-09', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Learning & Growth', subCategory: 'Strategic Planning',
    code: 'RC-09', title: 'H2 2026 strategic plan completion (By June 30)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'eb-01', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Financial', subCategory: 'Reporting',
    code: 'EB-01', title: 'Budget variance — all departments (≤ 5%)',
    alignedToId: 'rc-02',
    weight: 15, contributorIds: ['agung', 'linda'], viewerIds: ['agung'], status: 'green', unit: 'percent', value: 4.5, pill: 90, min: 0, max: 5,
  }),
  g({
    id: 'eb-02', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Financial', subCategory: 'Reporting',
    code: 'EB-02', title: 'Cash flow forecast accuracy (≥ 99%)',
    alignedToId: 'rc-02',
    weight: 13, contributorIds: ['agung'], viewerIds: ['rizal'], status: 'orange', unit: 'percent', value: 64.5, pill: 65, min: 0, max: 99,
  }),
  g({
    id: 'eb-03', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Customer', subCategory: 'Internal Stakeholder',
    code: 'EB-03', title: 'External audit readiness (100%)',
   weight: 10, contributorIds: ['agung'], viewerIds: ['rizal'], status: 'orange', unit: 'percent', value: 83.8, pill: 84, min: 0, max: 100,
  }),
  g({
    id: 'eb-04', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Internal Process', subCategory: 'Finance Operations',
    code: 'EB-04', title: 'Monthly financial report on-time (100%)',
   weight: 15, contributorIds: ['christin', 'agung'], viewerIds: ['rio', 'ali', 'bayu', 'andi', 'cinta'], status: 'green', unit: 'percent', value: 98.9, pill: 99, min: 0, max: 100,
  }),
  g({
    id: 'eb-05', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Internal Process', subCategory: 'Payroll',
    code: 'EB-05', title: 'Payroll disbursement accuracy (100%)',
   weight: 15, contributorIds: ['linda'], viewerIds: ['rio'], status: 'orange', unit: 'percent', value: 74.1, pill: 74, min: 0, max: 100,
  }),
  g({
    id: 'eb-06', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Financial', subCategory: 'Cost Savings',
    code: 'EB-06', title: 'Cost savings identified & actioned (IDR 150M)',
   weight: 12, contributorIds: ['agung'], viewerIds: [], status: 'green', unit: 'currency', value: 146000000, pill: 97, min: 0, max: 150000000,
  }),
  g({
    id: 'eb-07', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Customer', subCategory: 'Stakeholder',
    code: 'EB-07', title: 'Finance report stakeholder satisfaction (≥ 4.2 / 5)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 3.4, pill: 81, min: 0, max: 4.2,
  }),
  g({
    id: 'eb-08', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Learning & Growth', subCategory: 'Professional Dev',
    code: 'EB-08', title: 'CPA / accounting certification update (Completed)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'orange',
  }),
  g({
    id: 'eb-09', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Learning & Growth', subCategory: 'Systems',
    code: 'EB-09', title: 'Finance system advanced training (100%)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 79.5, pill: 80, min: 0, max: 100,
  }),
  g({
    id: 'rp-01', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Customer', subCategory: 'Employee Experience',
    code: 'RP-01', title: 'Employee satisfaction score (≥ 4.2 / 5)',
    alignedToId: 'rc-05',
    weight: 15, contributorIds: ['alfian'], viewerIds: ['rizal', 'evelyn', 'ali', 'bayu', 'andi', 'cinta', 'daud', 'jessie', 'eka'], status: 'orange', unit: 'count', value: 3.2, pill: 76, min: 0, max: 4.2,
  }),
  g({
    id: 'rp-02', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Internal Process', subCategory: 'Talent Acquisition',
    code: 'RP-02', title: 'Time to hire — all roles avg (≤ 30 days)',
   weight: 15, contributorIds: ['alfian'], viewerIds: ['evelyn', 'ali', 'bayu', 'andi', 'cinta'], status: 'green', unit: 'count', value: 29, pill: 97, min: 0, max: 30,
  }),
  g({
    id: 'rp-03', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Internal Process', subCategory: 'Talent Acquisition',
    code: 'RP-03', title: 'Offer acceptance rate (≥ 80%)',
   weight: 15, contributorIds: ['alfian'], viewerIds: ['evelyn', 'ali', 'bayu', 'andi', 'cinta'], status: 'green', unit: 'percent', value: 93.2, pill: 116, min: 0, max: 80,
  }),
  g({
    id: 'rp-04', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Learning & Growth', subCategory: 'L&D Programs',
    code: 'RP-04', title: 'Company-wide training completion rate (≥ 90%)',
    alignedToId: 'rc-05',
    weight: 13, contributorIds: ['alfian'], viewerIds: ['ali', 'bayu', 'andi', 'cinta', 'daud', 'jessie', 'eka'], status: 'green', unit: 'percent', value: 100, pill: 111, min: 0, max: 90,
  }),
  g({
    id: 'rp-05', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Learning & Growth', subCategory: 'Performance',
    code: 'RP-05', title: 'Performance review cycle completion rate (100%)',
   weight: 12, contributorIds: ['alfian'], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'rp-06', level: 'individual', ownerId: 'rio', department: 'HR',
    category: 'Financial', subCategory: 'Recruitment Cost',
    code: 'RP-06', title: 'Average cost per hire (≤ IDR 5M)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 4000000, pill: 80, min: 0, max: 5000000,
  }),
  g({
    id: 'rp-07', level: 'individual', ownerId: 'rio', department: 'HR',
    category: 'Financial', subCategory: 'Budget',
    code: 'RP-07', title: 'HR training budget utilization (90–100%)',
   weight: 10, contributorIds: ['alfian'], viewerIds: [], status: 'green', unit: 'percent', value: 97.5, pill: 98, min: 0, max: 100,
  }),
  g({
    id: 'rp-08', level: 'individual', ownerId: 'rio', department: 'HR',
    category: 'Customer', subCategory: 'HR Service',
    code: 'RP-08', title: 'HR ticket resolution time (≤ 2 biz days)',
   weight: 10, contributorIds: ['alfian'], viewerIds: [], status: 'green', unit: 'count', value: 1.8, pill: 90, min: 0, max: 2,
  }),
  // Alfian is Rio's only direct report (EMPLOYEE_MANAGER) and an HR Admin,
  // not a department head — same "individual contributor" shape as
  // Daud/Jessie under Ali: team + individual goals cascading from Rio's own
  // organization-level HR goals above, no organization-level goals of his own.
  g({
    id: 'af-01', level: 'team', ownerId: 'alfian', department: 'HR',
    category: 'Customer', subCategory: 'Employee Experience',
    code: 'AF-01', title: 'Employee onboarding satisfaction (≥ 4.3 / 5)',
    alignedToId: 'rp-01',
   weight: 20, contributorIds: [], viewerIds: ['rio'], status: 'green', unit: 'count', value: 4.5, pill: 105, min: 0, max: 4.3,
  }),
  g({
    id: 'af-02', level: 'team', ownerId: 'alfian', department: 'HR',
    category: 'Internal Process', subCategory: 'Talent Acquisition',
    code: 'AF-02', title: 'Candidate screening turnaround (≤ 3 days)',
    alignedToId: 'rp-02',
   weight: 20, contributorIds: [], viewerIds: ['rio'], status: 'green', unit: 'count', value: 2.6, pill: 87, min: 0, max: 3,
  }),
  g({
    id: 'af-03', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Financial', subCategory: 'Recruitment Cost',
    code: 'AF-03', title: 'Recruitment admin cost savings (IDR 15M)',
   weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 16200000, pill: 108, min: 0, max: 15000000,
  }),
  g({
    id: 'af-04', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Customer', subCategory: 'HR Support',
    code: 'AF-04', title: 'Employee HR query resolution time (≤ 1 biz day)',
    alignedToId: 'rp-08',
   weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 0.9, pill: 90, min: 0, max: 1,
  }),
  g({
    id: 'af-05', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Internal Process', subCategory: 'Documentation',
    code: 'AF-05', title: 'HR policy documentation update (100%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'af-06', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Learning & Growth', subCategory: 'Systems',
    code: 'AF-06', title: 'HRIS system proficiency certification (Completed)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'af-07', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Learning & Growth', subCategory: 'Compliance',
    code: 'AF-07', title: 'Labor law compliance training (100%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 82, pill: 82, min: 0, max: 100,
  }),
  g({
    id: 'ai-01', level: 'organization', ownerId: 'ali', department: 'Sales',
    category: 'Financial', subCategory: 'Revenue',
    code: 'AI-01', title: 'Total sales team revenue H1 2026 (IDR 6.3B)',
    alignedToId: 'rc-01',
    weight: 20, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'green', unit: 'currency', value: 6568000000, pill: 104, min: 0, max: 6300000000,
  }),
  g({
    id: 'ai-02', level: 'organization', ownerId: 'ali', department: 'Sales',
    category: 'Customer', subCategory: 'Retention',
    code: 'AI-02', title: 'Client retention rate (≥ 88%)',
   weight: 15, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'green', unit: 'percent', value: 89.5, pill: 102, min: 0, max: 88,
  }),
  g({
    id: 'ai-03', level: 'team', ownerId: 'ali', department: 'Sales',
    category: 'Financial', subCategory: 'Pipeline',
    code: 'AI-03', title: 'Wholesale sales pipeline value (IDR 1.5B)',
    alignedToId: 'rc-01',
    weight: 10, contributorIds: ['daud'], viewerIds: ['daud'], status: 'orange', unit: 'currency', value: 1237000000, pill: 82, min: 0, max: 1500000000,
  }),
  g({
    id: 'ai-04', level: 'team', ownerId: 'ali', department: 'Sales',
    category: 'Customer', subCategory: 'Enterprise',
    code: 'AI-04', title: 'New enterprise client acquisition (+5 clients)',
   weight: 10, contributorIds: ['daud', 'jessie'], viewerIds: ['jessie'], status: 'green', unit: 'count', value: 5, pill: 100, min: 0, max: 5,
  }),
  g({
    id: 'ai-05', level: 'team', ownerId: 'ali', department: 'Sales',
    category: 'Internal Process', subCategory: 'CRM',
    code: 'AI-05', title: 'Team CRM adoption rate (100%)',
   weight: 10, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'orange', unit: 'percent', value: 69.4, pill: 69, min: 0, max: 100,
  }),
  g({
    id: 'ai-06', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Financial', subCategory: 'Productivity',
    code: 'AI-06', title: 'Revenue per sales representative (IDR 2.1B)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 2514000000, pill: 120, min: 0, max: 2100000000,
  }),
  g({
    id: 'ai-07', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Internal Process', subCategory: 'Forecast',
    code: 'AI-07', title: 'Sales forecast accuracy (≥ 85%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 92.6, pill: 109, min: 0, max: 85,
  }),
  g({
    id: 'ai-08', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Team Dev',
    code: 'AI-08', title: 'Sales team training completion (100%)',
    alignedToId: 'rp-04',
    weight: 8, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'ai-09', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Process',
    code: 'AI-09', title: 'Sales playbook update & rollout (Completed H1)',
   weight: 7, contributorIds: [], viewerIds: [], status: 'orange',
  }),
  g({
    id: 'bf-01', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Financial', subCategory: 'Marketing ROI',
    code: 'BF-01', title: 'Campaign return on investment (≥ 3× spend)',
    alignedToId: 'rc-01',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 2.9, pill: 97, min: 0, max: 3,
  }),
  g({
    id: 'bf-02', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Financial', subCategory: 'Efficiency',
    code: 'BF-02', title: 'Cost per customer acquisition (≤ IDR 45K)',
   weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 37000, pill: 82, min: 0, max: 45000,
  }),
  g({
    id: 'bf-03', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Customer', subCategory: 'Brand Awareness',
    code: 'BF-03', title: 'Social media followers growth (+15%)',
    alignedToId: 'rc-03',
    weight: 12, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 17.8, pill: 119, min: 0, max: 15,
  }),
  g({
    id: 'bf-04', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Customer', subCategory: 'Brand Awareness',
    code: 'BF-04', title: 'Brand mention positive sentiment (≥ 75%)',
    alignedToId: 'rc-03',
    weight: 11, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 55.1, pill: 73, min: 0, max: 75,
  }),
  g({
    id: 'bf-05', level: 'team', ownerId: 'bayu', department: 'Marketing',
    category: 'Customer', subCategory: 'Engagement',
    code: 'BF-05', title: 'Campaign engagement rate (≥ 5%)',
   weight: 12, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 5.2, pill: 104, min: 0, max: 5,
  }),
  g({
    id: 'bf-06', level: 'team', ownerId: 'bayu', department: 'Marketing',
    category: 'Internal Process', subCategory: 'Campaign Delivery',
    code: 'BF-06', title: 'On-time campaign launch rate (100%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 77.4, pill: 77, min: 0, max: 100,
  }),
  g({
    id: 'bf-07', level: 'individual', ownerId: 'bayu', department: 'Marketing',
    category: 'Internal Process', subCategory: 'Content',
    code: 'BF-07', title: 'Monthly content output (≥ 60 pieces)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 61, pill: 102, min: 0, max: 60,
  }),
  g({
    id: 'bf-08', level: 'individual', ownerId: 'bayu', department: 'Marketing',
    category: 'Learning & Growth', subCategory: 'Digital Capability',
    code: 'BF-08', title: 'Digital marketing certification (Completed)',
    alignedToId: 'rp-04',
    weight: 8, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'bf-09', level: 'individual', ownerId: 'bayu', department: 'Marketing',
    category: 'Learning & Growth', subCategory: 'Research',
    code: 'BF-09', title: 'Market research report delivery (1 per quarter)',
   weight: 7, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 1.1, pill: 110, min: 0, max: 1,
  }),
  g({
    id: 'ap-01', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Financial', subCategory: 'Food Cost',
    code: 'AP-01', title: 'Department food cost ratio (≤ 30%)',
    alignedToId: 'rc-02',
    weight: 13, contributorIds: ['indah'], viewerIds: ['indah'], status: 'orange', unit: 'percent', value: 35.1, pill: 117, min: 0, max: 30,
  }),
  g({
    id: 'ap-02', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Customer', subCategory: 'Food Quality',
    code: 'AP-02', title: 'Customer food satisfaction rating (≥ 4.5 / 5)',
    alignedToId: 'rc-03',
    weight: 15, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 5, pill: 111, min: 0, max: 4.5,
  }),
  g({
    id: 'ap-03', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Customer', subCategory: 'Menu',
    code: 'AP-03', title: 'Menu satisfaction survey score (≥ 80%)',
    alignedToId: 'rc-03',
    weight: 15, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 77.8, pill: 97, min: 0, max: 80,
  }),
  g({
    id: 'ap-04', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Internal Process', subCategory: 'Food Safety',
    code: 'AP-04', title: 'HACCP audit pass rate (100%)',
   weight: 12, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 97.7, pill: 98, min: 0, max: 100,
  }),
  g({
    id: 'ap-05', level: 'team', ownerId: 'andi', department: 'Kitchen',
    category: 'Financial', subCategory: 'Waste',
    code: 'AP-05', title: 'Food waste reduction vs H2 2025 (-10%)',
    alignedToId: 'ap-01',
    weight: 12, contributorIds: ['indah'], viewerIds: ['indah'], status: 'green', unit: 'percent', value: 9.5, pill: 95, min: 0, max: 10,
  }),
  g({
    id: 'ap-06', level: 'team', ownerId: 'andi', department: 'Kitchen',
    category: 'Internal Process', subCategory: 'Kitchen Efficiency',
    code: 'AP-06', title: 'Average dish preparation time (≤ 8 min)',
   weight: 12, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 6.1, pill: 76, min: 0, max: 8,
  }),
  g({
    id: 'ap-07', level: 'individual', ownerId: 'andi', department: 'Kitchen',
    category: 'Internal Process', subCategory: 'Menu Innovation',
    code: 'AP-07', title: 'New menu items introduced per quarter (≥ 2 items)',
   weight: 11, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 2.4, pill: 120, min: 0, max: 2,
  }),
  g({
    id: 'ap-08', level: 'individual', ownerId: 'andi', department: 'Kitchen',
    category: 'Learning & Growth', subCategory: 'Team Dev',
    code: 'AP-08', title: 'Kitchen team training completion (100%)',
    alignedToId: 'rp-04',
    weight: 5, contributorIds: ['indah'], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'ap-09', level: 'individual', ownerId: 'andi', department: 'Kitchen',
    category: 'Learning & Growth', subCategory: 'Cross-Train',
    code: 'AP-09', title: 'Cross-station training coverage (≥ 75%)',
   weight: 5, contributorIds: ['indah'], viewerIds: [], status: 'orange', unit: 'percent', value: 49, pill: 65, min: 0, max: 75,
  }),
  g({
    id: 'ca-01', level: 'organization', ownerId: 'cinta', department: 'Front of House',
    category: 'Customer', subCategory: 'Guest Experience',
    code: 'CA-01', title: 'Customer satisfaction score (CSAT) (≥ 4.7 / 5)',
    alignedToId: 'rc-03',
    weight: 18, contributorIds: ['eka', 'fajar'], viewerIds: ['eka'], status: 'orange', unit: 'count', value: 3.9, pill: 83, min: 0, max: 4.7,
  }),
  g({
    id: 'ca-02', level: 'organization', ownerId: 'cinta', department: 'Front of House',
    category: 'Customer', subCategory: 'Complaints',
    code: 'CA-02', title: 'Complaint resolution time (≤ 2 hours)',
    alignedToId: 'rc-03',
    weight: 17, contributorIds: ['fajar'], viewerIds: [], status: 'green', unit: 'count', value: 1.6, pill: 80, min: 0, max: 2,
  }),
  g({
    id: 'ca-03', level: 'organization', ownerId: 'cinta', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Service Standards',
    code: 'CA-03', title: 'FOH SOP compliance score (≥ 96%)',
   weight: 15, contributorIds: ['eka', 'fajar'], viewerIds: ['eka'], status: 'green', unit: 'percent', value: 93.9, pill: 98, min: 0, max: 96,
  }),
  g({
    id: 'ca-04', level: 'team', ownerId: 'cinta', department: 'Front of House',
    category: 'Financial', subCategory: 'Revenue',
    code: 'CA-04', title: 'F&B revenue achievement vs target (≥ 95%)',
    alignedToId: 'rc-01',
    weight: 13, contributorIds: ['eka', 'joko'], viewerIds: ['eka'], status: 'green', unit: 'percent', value: 100, pill: 105, min: 0, max: 95,
  }),
  g({
    id: 'ca-05', level: 'team', ownerId: 'cinta', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Scheduling',
    code: 'CA-05', title: 'Staff schedule coverage rate (100%)',
   weight: 15, contributorIds: ['galih', 'fajar'], viewerIds: [], status: 'orange', unit: 'percent', value: 88.6, pill: 89, min: 0, max: 100,
  }),
  g({
    id: 'ca-06', level: 'individual', ownerId: 'cinta', department: 'Front of House',
    category: 'Financial', subCategory: 'Efficiency',
    code: 'CA-06', title: 'Table turnover improvement vs H2 2025 (+10%)',
    alignedToId: 'ca-04',
    weight: 12, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 10.8, pill: 108, min: 0, max: 10,
  }),
  g({
    id: 'ca-07', level: 'individual', ownerId: 'cinta', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Team Dev',
    code: 'CA-07', title: 'FOH team training completion (100%)',
    alignedToId: 'rp-04',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'ca-08', level: 'individual', ownerId: 'cinta', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Coaching',
    code: 'CA-08', title: 'Monthly 1-on-1 coaching sessions per staff (≥ 1 / month)',
    alignedToId: 'rp-05',
    weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 0.7, pill: 70, min: 0, max: 1,
  }),
  g({
    id: 'dd-01', level: 'team', ownerId: 'daud', department: 'Sales',
    category: 'Financial', subCategory: 'Personal Sales',
    code: 'DD-01', title: 'Personal sales revenue H1 2026 (IDR 1.8B)',
    alignedToId: 'ai-01',
    weight: 20, contributorIds: [], viewerIds: ['ali'], status: 'green', unit: 'currency', value: 1984000000, pill: 110, min: 0, max: 1800000000,
  }),
  g({
    id: 'dd-02', level: 'team', ownerId: 'daud', department: 'Sales',
    category: 'Customer', subCategory: 'Satisfaction',
    code: 'DD-02', title: 'Assigned client satisfaction score (≥ 4.2 / 5)',
    alignedToId: 'ai-02',
    weight: 15, contributorIds: [], viewerIds: ['ali'], status: 'green', unit: 'count', value: 4.8, pill: 114, min: 0, max: 4.2,
  }),
  g({
    id: 'dd-03', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Financial', subCategory: 'New Business',
    code: 'DD-03', title: 'Revenue from new accounts (IDR 400M)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 458000000, pill: 114, min: 0, max: 400000000,
  }),
  g({
    id: 'dd-04', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Financial', subCategory: 'Upsell',
    code: 'DD-04', title: 'Upsell achievement — existing clients (IDR 200M)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 190000000, pill: 95, min: 0, max: 200000000,
  }),
  g({
    id: 'dd-05', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Customer', subCategory: 'Responsiveness',
    code: 'DD-05', title: 'Client complaint resolution time (≤ 24 hours)',
    alignedToId: 'ai-02',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 18, pill: 75, min: 0, max: 24,
  }),
  g({
    id: 'dd-06', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Internal Process', subCategory: 'Productivity',
    code: 'DD-06', title: 'Client visits / calls per month (≥ 80 / month)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 71, pill: 89, min: 0, max: 80,
  }),
  g({
    id: 'dd-07', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Internal Process', subCategory: 'Proposals',
    code: 'DD-07', title: 'Proposal submission turnaround (≤ 2 days)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 2.3, pill: 115, min: 0, max: 2,
  }),
  g({
    id: 'dd-08', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Product',
    code: 'DD-08', title: 'Product & pricing training completion (100%)',
    alignedToId: 'ai-08',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'dd-09', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Skills',
    code: 'DD-09', title: 'Negotiation skills workshop (≥ 1 session)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 0.7, pill: 70, min: 0, max: 1,
  }),
  g({
    id: 'jt-01', level: 'team', ownerId: 'jessie', department: 'Sales',
    category: 'Financial', subCategory: 'Personal Sales',
    code: 'JT-01', title: 'Personal sales revenue H1 2026 (IDR 1.7B)',
    alignedToId: 'ai-01',
    weight: 20, contributorIds: [], viewerIds: ['ali'], status: 'green', unit: 'currency', value: 1644000000, pill: 97, min: 0, max: 1700000000,
  }),
  g({
    id: 'jt-02', level: 'team', ownerId: 'jessie', department: 'Sales',
    category: 'Customer', subCategory: 'Satisfaction',
    code: 'JT-02', title: 'Assigned client satisfaction score (≥ 4.3 / 5)',
    alignedToId: 'ai-02',
    weight: 15, contributorIds: [], viewerIds: ['ali'], status: 'orange', unit: 'count', value: 3.7, pill: 86, min: 0, max: 4.3,
  }),
  g({
    id: 'jt-03', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Financial', subCategory: 'Retail Focus',
    code: 'JT-03', title: 'New retail account revenue (IDR 500M)',
    alignedToId: 'ai-01',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 534000000, pill: 107, min: 0, max: 500000000,
  }),
  g({
    id: 'jt-04', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Financial', subCategory: 'Upsell',
    code: 'JT-04', title: 'Upsell & cross-sell revenue (IDR 150M)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 152000000, pill: 101, min: 0, max: 150000000,
  }),
  g({
    id: 'jt-05', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Customer', subCategory: 'Acquisition',
    code: 'JT-05', title: 'New retail accounts opened (+80 accounts)',
    alignedToId: 'ai-04',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 61, pill: 76, min: 0, max: 80,
  }),
  g({
    id: 'jt-06', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Internal Process', subCategory: 'Productivity',
    code: 'JT-06', title: 'Retail visit / call per month (≥ 90 / month)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 98, pill: 109, min: 0, max: 90,
  }),
  g({
    id: 'jt-07', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Internal Process', subCategory: 'CRM',
    code: 'JT-07', title: 'CRM data update compliance (≥ 98%)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 69, pill: 70, min: 0, max: 98,
  }),
  g({
    id: 'jt-08', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Retail',
    code: 'JT-08', title: 'Retail sales technique training (100%)',
    alignedToId: 'ai-08',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'jt-09', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Product',
    code: 'JT-09', title: 'New product knowledge assessment (≥ 85 / 100)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 90, pill: 106, min: 0, max: 85,
  }),
  g({
    id: 'es-01', level: 'team', ownerId: 'eka', department: 'Front of House',
    category: 'Customer', subCategory: 'Guest Experience',
    code: 'ES-01', title: 'Personal customer satisfaction rating (≥ 4.7 / 5)',
    alignedToId: 'ca-01',
    weight: 20, contributorIds: [], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 4.6, pill: 98, min: 0, max: 4.7,
  }),
  g({
    id: 'es-02', level: 'team', ownerId: 'eka', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Standards',
    code: 'ES-02', title: 'SOP compliance rate (≥ 98%)',
    alignedToId: 'ca-03',
    weight: 15, contributorIds: [], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 100, pill: 102, min: 0, max: 98,
  }),
  g({
    id: 'es-03', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Financial', subCategory: 'Upsell',
    code: 'ES-03', title: 'Personal upsell revenue contribution (IDR 25M)',
    alignedToId: 'ca-04',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 25000000, pill: 100, min: 0, max: 25000000,
  }),
  g({
    id: 'es-04', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Financial', subCategory: 'Avg Check',
    code: 'ES-04', title: 'Average check contribution growth (+5% vs H2)',
    alignedToId: 'ca-04',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 4.8, pill: 96, min: 0, max: 5,
  }),
  g({
    id: 'es-05', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Customer', subCategory: 'Recognition',
    code: 'ES-05', title: 'Positive customer mentions per month (≥ 15 / month)',
    alignedToId: 'ca-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 15, pill: 100, min: 0, max: 15,
  }),
  g({
    id: 'es-06', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Customer', subCategory: 'Accuracy',
    code: 'ES-06', title: 'Drink preparation accuracy rate (≥ 99%)',
    alignedToId: 'ca-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 87.3, pill: 88, min: 0, max: 99,
  }),
  g({
    id: 'es-07', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Speed',
    code: 'ES-07', title: 'Drink preparation time (≤ 2.5 min)',
    alignedToId: 'ca-03',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 2, pill: 80, min: 0, max: 2.5,
  }),
  g({
    id: 'es-08', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Certification',
    code: 'ES-08', title: 'Barista certification — Level 2 (Completed)',
    alignedToId: 'rp-04',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'es-09', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Menu Mastery',
    code: 'ES-09', title: 'New menu mastery assessment (100%)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 98.3, pill: 98, min: 0, max: 100,
  }),
  ]
}

// Module-scope singleton — shared reactive "mini DB" for this demo prototype.
const STORAGE_KEY = 'talenta-goals-db'
// Bump this whenever seed() changes in a way stale localStorage would
// contradict (e.g. reweighting company goals) — otherwise a browser that
// already persisted the old seed keeps showing it forever, since
// loadFromStorage() below always prefers localStorage over a fresh seed().
const SEED_VERSION = 7
const goals = ref<Goal[]>(seed())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, goals: goals.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.goals)) {
        goals.value = parsed.goals
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

// Only the '26 H1' cycle (id CYCLE_ID) ships with the 88 pre-seeded goals —
// every other goal cycle a user creates starts with none at all. `cycleId`
// scopes every read below (including categoryWeight, which must never mix
// one owner's weights across two different cycles) to just that cycle;
// omit it only for actions that operate across all cycles at once (e.g. the
// goal-cycles list page's delete-cycle flow).
export function useGoalsStore(cycleId?: string) {
  loadFromStorage()

  function resetToSeed() {
    goals.value = seed()
    persist()
  }

  function deleteGoalsByCycle(targetCycleId: string) {
    goals.value = goals.value.filter(g => g.cycleId !== targetCycleId)
    persist()
  }

  function deleteGoal(id: string) {
    goals.value = goals.value.filter(g => g.id !== id)
    persist()
  }

  // Used by the "New goals" flow — each drafted goal becomes one real Goal
  // per selected owner, starting unstarted (status:'gray', no unit/value)
  // since it's newly created, not a historical snapshot.
  function addGoals(newGoals: Omit<Goal, 'cycleId'>[], targetCycleId: string) {
    goals.value = [...goals.value, ...newGoals.map(g => ({ ...g, cycleId: targetCycleId }))]
    persist()
  }

  // Used by the Edit goal flow — replaces an existing goal's editable
  // fields in place, keeping its id/ownerId/cycleId (and anything else the
  // patch doesn't mention, e.g. alignedToId) untouched.
  function updateGoal(id: string, patch: Partial<Goal>) {
    goals.value = goals.value.map(g => (g.id === id ? { ...g, ...patch } : g))
    persist()
  }

  const cycleGoals = computed(() => cycleId ? goals.value.filter(g => g.cycleId === cycleId) : goals.value)

  // Category weight is derived, not authored — see GoalWithCategoryWeight
  // above. It's the SUM of the matching goals' own weight, scoped to this
  // owner across ALL levels within THIS cycle (every employee has exactly
  // one 100% budget per cycle, not a separate one per level, and it must
  // never mix weights across two different cycles either), matching the
  // source's own Category Weight reference sheet exactly.
  const goalsWithCategoryWeight = computed<GoalWithCategoryWeight[]>(() => cycleGoals.value.map((goal) => {
    const matching = cycleGoals.value.filter(g => g.category === goal.category && g.ownerId === goal.ownerId)
    return {
      ...goal,
      // Rounded to 1 decimal as a safety net against float drift — every
      // real weight in the seed data is already a whole percentage.
      categoryWeight: Math.round(matching.reduce((sum, g) => sum + g.weight, 0) * 10) / 10,
    }
  }))

  const companyGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'company'))
  const organizationGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'organization'))
  const teamGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'team'))
  const individualGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'individual'))

  // "My goals" / "My direct reports" show ALL of that person's own goals
  // regardless of level tag — under this model there's only one 100%
  // budget per employee (mixing Company/Organization/Team/Individual
  // together), so scoping to individual-level only would show a partial,
  // misleadingly-small slice of what someone actually owns.
  const { currentUserId } = useCurrentUser()
  const myGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.ownerId === currentUserId.value))
  const myDirectReportsGoals = computed(() => goalsWithCategoryWeight.value.filter(
    g => EMPLOYEE_MANAGER[g.ownerId] === currentUserId.value,
  ))

  return {
    goals: goalsWithCategoryWeight,
    resetToSeed,
    deleteGoalsByCycle,
    deleteGoal,
    addGoals,
    updateGoal,
    companyGoals,
    organizationGoals,
    teamGoals,
    individualGoals,
    myGoals,
    myDirectReportsGoals,
  }
}
