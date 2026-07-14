// ─────────────────────────────────────────────────────────────────────────────
// Goals mini-DB — persisted "mock data preseed" for the 26 H1 goal cycle
// (id 'seed-26-h1', matching useGoalCyclesStore). Single source of truth for
// every Goals view: Company / Organization / Team / Individual, plus the
// "My goals" / "My direct reports" personal filters.
//
// Business context: PT Central Perk Indonesia — a wholesale + retail coffee
// bean company that also runs its own coffee shop/cafe. Sourced verbatim
// from H1_2026_Goals_CentralPerk.xlsx (Company / Department / Team /
// Individual sheets) — every Goal ID, category, sub-category, title, target,
// and weight below is transcribed from that file, not invented. The source
// has no progress-tracking data (it's a goal-setting template, not a
// mid-cycle snapshot), so every goal starts status:'gray' ("Not started")
// with no unit/value/min/max — fabricating progress numbers the source
// doesn't provide would be exactly the kind of "ngasal" data this rebuild
// was meant to fix.
//
// Every owner is a real row from utils/employees.ts. 8 of the 18 employees
// (Alfian, Christin, Fajar, Galih, Indah, Joko, Linda, and Agung) have no
// individual-level goals — the source spreadsheet only defines individual
// goals for 10 people (department heads, the CEO, and a few named ICs).
// Agung, Fajar, and Indah still appear as Team-level owners (team leads),
// just not at the Individual level.
// ─────────────────────────────────────────────────────────────────────────────

export type GoalLevel = 'company' | 'organization' | 'team' | 'individual'
export type GoalCategory = 'Financial' | 'Customer' | 'Internal Process' | 'Learning & Growth'
export type GoalStatus = 'green' | 'orange' | 'gray'
export type GoalUnit = 'currency' | 'percent' | 'count'

export interface Goal {
  id: string
  cycleId: string
  level: GoalLevel
  ownerId: string // Employee.id from ~/utils/employees
  department: string
  team?: string
  category: GoalCategory
  subCategory: string
  code: string
  title: string
  weight: number
  hasAligned: boolean
  status: GoalStatus
  unit?: GoalUnit
  value?: number
  pill?: number
  min?: number
  max?: number
}

// A goal's own `weight` is authored (every owner's weights sum to 100%
// within a level — company / organization / team / individual are separate
// 100% budgets, since one person can hold goals at more than one level at
// once, e.g. Agung owns 100% of his own Team-level goals as Finance &
// Compliance Team lead, entirely separate from anyone's Individual-level
// budget). A category's weight is NOT authored — it's never something a
// user types in; it's the sum of that owner's own goal weights that fall
// under this category, computed in useGoalsStore() below.
export interface GoalWithCategoryWeight extends Goal {
  categoryWeight: number
}

// Lightweight org chart for "My goals" / "My direct reports" — not modeled
// anywhere else in the app, kept local to this store since only the Goals
// module needs it. The department heads report to the CEO; everyone else
// reports to their department head.
export const EMPLOYEE_MANAGER: Record<string, string> = {
  evelyn: 'rizal', rio: 'rizal', ali: 'rizal', bayu: 'rizal', andi: 'rizal', cinta: 'rizal',
  agung: 'evelyn', christin: 'evelyn', linda: 'evelyn',
  alfian: 'rio',
  daud: 'ali', jessie: 'ali',
  indah: 'andi',
  eka: 'cinta', fajar: 'cinta', galih: 'cinta', joko: 'cinta',
}

// The demo "logged-in" user — CEO, so "My direct reports" is the 6
// department heads (Evelyn, Rio, Ali, Bayu, Andi, Cinta).
export const CURRENT_USER_ID = 'rizal'

const CYCLE_ID = 'seed-26-h1'

function g(partial: Omit<Goal, 'cycleId'>): Goal {
  return {
    cycleId: CYCLE_ID,
    ...partial,
  }
}

function seed(): Goal[] {
  return [
    // ─── Company goals — PT Central Perk Indonesia, H1 2026. No per-goal
    // owner in the source; the CEO is the accountable party for company strategy. ──
    g({
      id: 'c-f01', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'Revenue Growth',
      code: 'C-F01', title: 'Total company revenue H1 2026 (IDR 9.2B)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-f02', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'Revenue Growth',
      code: 'C-F02', title: 'Coffee shop (F&B) channel revenue (IDR 2.9B)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-f03', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'Revenue Growth',
      code: 'C-F03', title: 'Retail coffee product channel revenue (IDR 3.5B)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-f04', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'Revenue Growth',
      code: 'C-F04', title: 'Wholesale channel revenue (IDR 2.8B)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-f05', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'Profitability',
      code: 'C-F05', title: 'Gross profit margin (≥ 45%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-c01', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Customer', subCategory: 'Customer Satisfaction',
      code: 'C-C01', title: 'Net Promoter Score (NPS) — all channels (≥ 72)',
      weight: 8, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-c02', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Customer', subCategory: 'Customer Satisfaction',
      code: 'C-C02', title: 'Customer satisfaction score (CSAT) (≥ 4.5 / 5)',
      weight: 7, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-c03', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Customer', subCategory: 'Customer Retention',
      code: 'C-C03', title: 'Repeat customer rate (≥ 58%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-c04', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Customer', subCategory: 'Customer Acquisition',
      code: 'C-C04', title: 'New B2B wholesale clients acquired (+12 clients)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-i01', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Internal Process', subCategory: 'Operational Efficiency',
      code: 'C-I01', title: 'Order fulfillment accuracy (≥ 98.5%)',
      weight: 7, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-i02', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Internal Process', subCategory: 'Operational Efficiency',
      code: 'C-I02', title: 'Average customer service time (FOH) (≤ 4 min)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-i03', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Internal Process', subCategory: 'Quality Control',
      code: 'C-I03', title: 'Product quality audit score (≥ 90 / 100)',
      weight: 7, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-i04', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Internal Process', subCategory: 'Supply Chain',
      code: 'C-I04', title: 'Supplier on-time delivery rate (≥ 95%)',
      weight: 6, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-l01', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Learning & Growth', subCategory: 'Employee Development',
      code: 'C-L01', title: 'Company-wide training completion rate (≥ 90%)',
      weight: 7, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-l02', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Learning & Growth', subCategory: 'Culture & Engagement',
      code: 'C-L02', title: 'Employee engagement score (≥ 75 / 100)',
      weight: 7, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'c-l03', level: 'company', ownerId: 'rizal', department: 'Management',
      category: 'Learning & Growth', subCategory: 'Digital Transformation',
      code: 'C-L03', title: 'Core system (POS + HRIS) adoption rate (100%)',
      weight: 6, hasAligned: true, status: 'gray',
    }),

    // ─── Organization goals — one department, one accountable Head. ──────────
    g({
      id: 'd-ac-f01', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Financial', subCategory: 'Reporting Accuracy',
      code: 'D-AC-F01', title: 'Monthly financial report on-time delivery (100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-f02', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Financial', subCategory: 'Reporting Accuracy',
      code: 'D-AC-F02', title: 'Financial report data accuracy rate (≥ 99.5%)',
      weight: 8, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-f03', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Financial', subCategory: 'Cost Management',
      code: 'D-AC-F03', title: 'Budget variance across departments (≤ 5%)',
      weight: 7, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-f04', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Financial', subCategory: 'Cost Management',
      code: 'D-AC-F04', title: 'Cost savings identified & actioned (IDR 150M)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-c01', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Customer', subCategory: 'Internal Stakeholder',
      code: 'D-AC-C01', title: 'Finance report satisfaction score (internal) (≥ 4.2 / 5)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-c02', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Customer', subCategory: 'Internal Stakeholder',
      code: 'D-AC-C02', title: 'Audit readiness score (100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-i01', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Internal Process', subCategory: 'Finance Operations',
      code: 'D-AC-I01', title: 'Invoice processing turnaround time (≤ 2 business days)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-i02', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Internal Process', subCategory: 'Finance Operations',
      code: 'D-AC-I02', title: 'Payroll disbursement accuracy (100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-i03', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Internal Process', subCategory: 'Compliance',
      code: 'D-AC-I03', title: 'Tax filing on-time compliance (100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-l01', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Learning & Growth', subCategory: 'Professional Development',
      code: 'D-AC-L01', title: 'Accounting certification renewal (team) (100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-ac-l02', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
      category: 'Learning & Growth', subCategory: 'Digital Upskill',
      code: 'D-AC-L02', title: 'Finance system proficiency assessment (≥ 85 / 100)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-f01', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Financial', subCategory: 'Recruitment Cost',
      code: 'D-HR-F01', title: 'Average cost per hire (≤ IDR 5M)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-f02', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Financial', subCategory: 'Budget',
      code: 'D-HR-F02', title: 'Training budget utilization rate (90–100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-c01', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Customer', subCategory: 'Employee Satisfaction',
      code: 'D-HR-C01', title: 'Employee satisfaction score (≥ 4.0 / 5)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-c02', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Customer', subCategory: 'HR Service',
      code: 'D-HR-C02', title: 'HR ticket resolution time (≤ 2 business days)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-i01', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Internal Process', subCategory: 'Recruitment',
      code: 'D-HR-I01', title: 'Time to hire (avg, all roles) (≤ 30 days)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-i02', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Internal Process', subCategory: 'Recruitment',
      code: 'D-HR-I02', title: 'Offer acceptance rate (≥ 80%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-i03', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Internal Process', subCategory: 'HR Ops',
      code: 'D-HR-I03', title: 'Attendance data accuracy (≥ 99%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-l01', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Learning & Growth', subCategory: 'L&D Programs',
      code: 'D-HR-L01', title: 'Company-wide training program completion (≥ 90%)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-hr-l02', level: 'organization', ownerId: 'rio', department: 'HR',
      category: 'Learning & Growth', subCategory: 'Onboarding',
      code: 'D-HR-L02', title: 'New hire onboarding satisfaction score (≥ 4.0 / 5)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-f01', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Financial', subCategory: 'Revenue',
      code: 'D-SL-F01', title: 'Total sales revenue H1 2026 (IDR 6.3B)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-f02', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Financial', subCategory: 'Revenue',
      code: 'D-SL-F02', title: 'Retail channel sales target (IDR 3.5B)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-f03', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Financial', subCategory: 'Revenue',
      code: 'D-SL-F03', title: 'Wholesale channel sales target (IDR 2.8B)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-f04', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Financial', subCategory: 'Sales Cost',
      code: 'D-SL-F04', title: 'Discount rate — all channels (≤ 8%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-c01', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Customer', subCategory: 'Acquisition',
      code: 'D-SL-C01', title: 'New B2B wholesale clients signed (+12 clients)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-c02', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Customer', subCategory: 'Acquisition',
      code: 'D-SL-C02', title: 'New retail accounts (+200 accounts)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-c03', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Customer', subCategory: 'Retention',
      code: 'D-SL-C03', title: 'Client retention rate (≥ 88%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-i01', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Internal Process', subCategory: 'Sales Efficiency',
      code: 'D-SL-I01', title: 'Lead-to-close conversion rate (≥ 35%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-i02', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Internal Process', subCategory: 'Sales Efficiency',
      code: 'D-SL-I02', title: 'Quotation response time (≤ 24 hours)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-sl-l01', level: 'organization', ownerId: 'ali', department: 'Sales',
      category: 'Learning & Growth', subCategory: 'Product Knowledge',
      code: 'D-SL-L01', title: 'Sales team training completion (100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-f01', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Financial', subCategory: 'Food Cost',
      code: 'D-KT-F01', title: 'Food cost ratio (≤ 30%)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-f02', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Financial', subCategory: 'Food Cost',
      code: 'D-KT-F02', title: 'Food waste reduction vs H2 2025 (-10%)',
      weight: 13, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-c01', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Customer', subCategory: 'Food Quality',
      code: 'D-KT-C01', title: 'Customer food satisfaction rating (≥ 4.5 / 5)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-c02', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Customer', subCategory: 'Food Quality',
      code: 'D-KT-C02', title: 'Food-related complaint rate (≤ 1%)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-i01', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Internal Process', subCategory: 'Kitchen Ops',
      code: 'D-KT-I01', title: 'Average dish preparation time (≤ 8 min)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-i02', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Internal Process', subCategory: 'Kitchen Ops',
      code: 'D-KT-I02', title: 'Kitchen SOP compliance rate (≥ 95%)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-i03', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Internal Process', subCategory: 'Food Safety',
      code: 'D-KT-I03', title: 'HACCP compliance rate (100%)',
      weight: 11, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-l01', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Learning & Growth', subCategory: 'Staff Skills',
      code: 'D-KT-L01', title: 'Culinary training completion (100%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-kt-l02', level: 'organization', ownerId: 'andi', department: 'Kitchen',
      category: 'Learning & Growth', subCategory: 'Staff Skills',
      code: 'D-KT-L02', title: 'Cross-training station coverage (≥ 80%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-f01', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Financial', subCategory: 'Marketing ROI',
      code: 'D-MK-F01', title: 'Marketing cost as % of revenue (≤ 8%)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-f02', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Financial', subCategory: 'Marketing ROI',
      code: 'D-MK-F02', title: 'Campaign return on investment (≥ 3× spend)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-c01', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Customer', subCategory: 'Brand Awareness',
      code: 'D-MK-C01', title: 'Social media followers growth (+15%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-c02', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Customer', subCategory: 'Brand Awareness',
      code: 'D-MK-C02', title: 'Brand mention positive sentiment (≥ 75%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-c03', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Customer', subCategory: 'Engagement',
      code: 'D-MK-C03', title: 'Promotional campaign conversion rate (≥ 12%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-c04', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Customer', subCategory: 'Engagement',
      code: 'D-MK-C04', title: 'Email newsletter open rate (≥ 28%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-i01', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Internal Process', subCategory: 'Campaign Delivery',
      code: 'D-MK-I01', title: 'Campaign on-time launch rate (100%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-i02', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Internal Process', subCategory: 'Content',
      code: 'D-MK-I02', title: 'Monthly content output target (≥ 60 pieces)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-l01', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Learning & Growth', subCategory: 'Digital Capability',
      code: 'D-MK-L01', title: 'Digital marketing certification (100% of team)',
      weight: 8, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-mk-l02', level: 'organization', ownerId: 'bayu', department: 'Marketing',
      category: 'Learning & Growth', subCategory: 'Research',
      code: 'D-MK-L02', title: 'Market & competitor research report (1 per quarter)',
      weight: 7, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-f01', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Financial', subCategory: 'Revenue Support',
      code: 'D-FH-F01', title: 'F&B upsell revenue contribution (IDR 150M)',
      weight: 13, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-f02', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Financial', subCategory: 'Revenue Support',
      code: 'D-FH-F02', title: 'Average transaction value (IDR 85K)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-c01', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Customer', subCategory: 'Guest Experience',
      code: 'D-FH-C01', title: 'Customer satisfaction score (CSAT) (≥ 4.6 / 5)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-c02', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Customer', subCategory: 'Guest Experience',
      code: 'D-FH-C02', title: 'NPS from dine-in channel (≥ 68)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-c03', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Customer', subCategory: 'Guest Experience',
      code: 'D-FH-C03', title: 'Wait time compliance rate (≤ 4 min / ≥ 95%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-i01', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Internal Process', subCategory: 'Service Standards',
      code: 'D-FH-I01', title: 'SOP adherence rate (≥ 95%)',
      weight: 13, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-i02', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Internal Process', subCategory: 'Efficiency',
      code: 'D-FH-I02', title: 'Table turnover improvement vs H2 2025 (+10%)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-l01', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Learning & Growth', subCategory: 'Service Excellence',
      code: 'D-FH-L01', title: 'Customer service training completion (100%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 'd-fh-l02', level: 'organization', ownerId: 'cinta', department: 'Front of House',
      category: 'Learning & Growth', subCategory: 'Product Knowledge',
      code: 'D-FH-L02', title: 'Barista skill assessment score (≥ 80 / 100)',
      weight: 5, hasAligned: true, status: 'gray',
    }),

    // ─── Team goals — one team, one accountable Team Lead. ────────────────────
    g({
      id: 't-sr-f01', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Financial', subCategory: 'Channel Revenue',
      code: 'T-SR-F01', title: 'Retail sales revenue H1 2026 (IDR 3.5B)',
      weight: 20, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-f02', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Financial', subCategory: 'Channel Revenue',
      code: 'T-SR-F02', title: 'Average order value — retail (IDR 250K)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-f03', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Financial', subCategory: 'Growth',
      code: 'T-SR-F03', title: 'Retail channel growth vs H2 2025 (+18%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-c01', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Customer', subCategory: 'Retail Client',
      code: 'T-SR-C01', title: 'Retail client satisfaction score (≥ 4.2 / 5)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-c02', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Customer', subCategory: 'Acquisition',
      code: 'T-SR-C02', title: 'New retail accounts opened (+200 accounts)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-i01', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Internal Process', subCategory: 'Process',
      code: 'T-SR-I01', title: 'Order processing turnaround (≤ 24 hours)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-i02', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Internal Process', subCategory: 'CRM',
      code: 'T-SR-I02', title: 'CRM data update compliance (≥ 95%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-l01', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Learning & Growth', subCategory: 'Retail Knowledge',
      code: 'T-SR-L01', title: 'Retail product knowledge training (100%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sr-l02', level: 'team', ownerId: 'jessie', department: 'Sales', team: 'Sales Retail Team',
      category: 'Learning & Growth', subCategory: 'Market Intel',
      code: 'T-SR-L02', title: 'Competitor analysis report (1 per quarter)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-f01', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Financial', subCategory: 'Channel Revenue',
      code: 'T-SW-F01', title: 'Wholesale revenue H1 2026 (IDR 2.8B)',
      weight: 20, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-f02', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Financial', subCategory: 'New Business',
      code: 'T-SW-F02', title: 'New B2B contract value (IDR 800M)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-f03', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Financial', subCategory: 'Renewals',
      code: 'T-SW-F03', title: 'Wholesale contract renewal value (IDR 2.0B)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-c01', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Customer', subCategory: 'B2B Satisfaction',
      code: 'T-SW-C01', title: 'B2B client NPS (≥ 65)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-c02', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Customer', subCategory: 'Key Accounts',
      code: 'T-SW-C02', title: 'Key account retention rate (≥ 90%)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-i01', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Internal Process', subCategory: 'Proposal',
      code: 'T-SW-I01', title: 'Proposal turnaround time (≤ 3 business days)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-i02', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Internal Process', subCategory: 'Contracts',
      code: 'T-SW-I02', title: 'Contract renewal close rate (≥ 85%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-l01', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Learning & Growth', subCategory: 'B2B Skills',
      code: 'T-SW-L01', title: 'B2B negotiation training completion (100%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-sw-l02', level: 'team', ownerId: 'daud', department: 'Sales', team: 'Sales Wholesale Team',
      category: 'Learning & Growth', subCategory: 'Market',
      code: 'T-SW-L02', title: 'Market expansion analysis (1 per quarter)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-f01', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Financial', subCategory: 'Food Cost',
      code: 'T-KP-F01', title: 'Food cost vs budget variance (≤ 2%)',
      weight: 13, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-f02', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Financial', subCategory: 'Waste',
      code: 'T-KP-F02', title: 'Daily ingredient waste rate (≤ 5%)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-c01', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Customer', subCategory: 'Quality',
      code: 'T-KP-C01', title: 'Internal kitchen quality score (≥ 92 / 100)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-c02', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Customer', subCategory: 'Safety',
      code: 'T-KP-C02', title: 'Zero food safety incident (0 incidents)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-i01', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Internal Process', subCategory: 'Prep Efficiency',
      code: 'T-KP-I01', title: 'Prep completion on-time rate (≥ 95%)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-i02', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Internal Process', subCategory: 'SOP',
      code: 'T-KP-I02', title: 'Kitchen SOP compliance (≥ 98%)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-i03', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Internal Process', subCategory: 'Mise en Place',
      code: 'T-KP-I03', title: 'Mise en place daily completion (100%)',
      weight: 11, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-l01', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Learning & Growth', subCategory: 'Culinary Skills',
      code: 'T-KP-L01', title: 'Culinary technique training (100%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-kp-l02', level: 'team', ownerId: 'indah', department: 'Kitchen', team: 'Kitchen Production Team',
      category: 'Learning & Growth', subCategory: 'Standardization',
      code: 'T-KP-L02', title: 'Recipe card standardization (100% of menu)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-f01', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Financial', subCategory: 'Revenue',
      code: 'T-FS-F01', title: 'FOH upsell target (IDR 120M)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-f02', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Financial', subCategory: 'Cost Control',
      code: 'T-FS-F02', title: 'Void & discount rate (≤ 2%)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-c01', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Customer', subCategory: 'Guest Service',
      code: 'T-FS-C01', title: 'Customer satisfaction score (CSAT) (≥ 4.6 / 5)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-c02', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Customer', subCategory: 'Guest Service',
      code: 'T-FS-C02', title: 'Service complaint rate (≤ 0.5%)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-c03', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Customer', subCategory: 'Speed',
      code: 'T-FS-C03', title: 'Average wait time (≤ 4 min)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-i01', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Internal Process', subCategory: 'Standards',
      code: 'T-FS-I01', title: 'Service SOP adherence rate (≥ 97%)',
      weight: 13, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-i02', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Internal Process', subCategory: 'Table Ops',
      code: 'T-FS-I02', title: 'Table setup completion time (≤ 3 min)',
      weight: 12, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-l01', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Learning & Growth', subCategory: 'Training',
      code: 'T-FS-L01', title: 'Service excellence training completion (100%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fs-l02', level: 'team', ownerId: 'fajar', department: 'Front of House', team: 'FOH Service Team',
      category: 'Learning & Growth', subCategory: 'Product',
      code: 'T-FS-L02', title: 'Menu knowledge test score (≥ 85 / 100)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-f01', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Financial', subCategory: 'Accuracy',
      code: 'T-FC-F01', title: 'Financial reconciliation accuracy (≥ 99.5%)',
      weight: 20, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-f02', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Financial', subCategory: 'Compliance',
      code: 'T-FC-F02', title: 'Tax filing & regulatory compliance (100%)',
      weight: 20, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-c01', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Customer', subCategory: 'Internal Service',
      code: 'T-FC-C01', title: 'Finance report request fulfillment time (≤ 2 business days)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-c02', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Customer', subCategory: 'Internal Service',
      code: 'T-FC-C02', title: 'Internal stakeholder satisfaction (≥ 4.0 / 5)',
      weight: 10, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-i01', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Internal Process', subCategory: 'Month-End Close',
      code: 'T-FC-I01', title: 'Month-end close completion (≤ 5 business days)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-i02', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Internal Process', subCategory: 'Documentation',
      code: 'T-FC-I02', title: 'Finance document completeness (100%)',
      weight: 15, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-l01', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Learning & Growth', subCategory: 'Regulations',
      code: 'T-FC-L01', title: 'Finance & tax regulation update training (2 sessions / half)',
      weight: 5, hasAligned: true, status: 'gray',
    }),
    g({
      id: 't-fc-l02', level: 'team', ownerId: 'agung', department: 'Accounting', team: 'Finance & Compliance Team',
      category: 'Learning & Growth', subCategory: 'Systems',
      code: 'T-FC-L02', title: 'Finance system proficiency (≥ 90%)',
      weight: 5, hasAligned: true, status: 'gray',
    }),

    // ─── Individual goals — 10 named employees from the source; the other 8
    // in the roster have no individual-level goals defined for this cycle. ─────
    g({
      id: 'i-rc-f01', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'Business Performance',
      code: 'I-RC-F01', title: 'Company revenue achievement vs target (≥ 95%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-f02', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'Profitability',
      code: 'I-RC-F02', title: 'Company EBITDA margin (≥ 18%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-f03', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Financial', subCategory: 'New Business',
      code: 'I-RC-F03', title: 'New business channel revenue (IDR 500M)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-c01', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Customer', subCategory: 'Stakeholder Relations',
      code: 'I-RC-C01', title: 'New strategic wholesale partnerships (+5 partnerships)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-c02', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Customer', subCategory: 'Brand',
      code: 'I-RC-C02', title: 'Company reputation & brand index (≥ 80 / 100)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-i01', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Internal Process', subCategory: 'Strategy Execution',
      code: 'I-RC-I01', title: 'H1 OKR completion rate (≥ 90%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-i02', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Internal Process', subCategory: 'Leadership',
      code: 'I-RC-I02', title: 'Cross-department alignment (exec meetings) (Bi-weekly / 100%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-l01', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Learning & Growth', subCategory: 'Leadership',
      code: 'I-RC-L01', title: 'Executive leadership program attendance (2 programs)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rc-l02', level: 'individual', ownerId: 'rizal', department: 'Management',
      category: 'Learning & Growth', subCategory: 'Strategic Planning',
      code: 'I-RC-L02', title: 'H2 2026 strategic plan completion (Completed by June)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-f01', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Financial', subCategory: 'Reporting',
      code: 'I-EB-F01', title: 'Budget variance — all departments (≤ 5%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-f02', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Financial', subCategory: 'Reporting',
      code: 'I-EB-F02', title: 'Cash flow forecast accuracy (≥ 99%)',
      weight: 13, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-f03', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Financial', subCategory: 'Cost Savings',
      code: 'I-EB-F03', title: 'Cost savings identified & actioned (IDR 150M)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-c01', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Customer', subCategory: 'Stakeholder',
      code: 'I-EB-C01', title: 'Finance report stakeholder satisfaction (≥ 4.2 / 5)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-c02', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Customer', subCategory: 'Audit',
      code: 'I-EB-C02', title: 'External audit readiness (100%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-i01', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Internal Process', subCategory: 'Finance Ops',
      code: 'I-EB-I01', title: 'Monthly report submission on-time (100%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-i02', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Internal Process', subCategory: 'Payroll',
      code: 'I-EB-I02', title: 'Payroll disbursement accuracy (100%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-l01', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Learning & Growth', subCategory: 'Professional Dev',
      code: 'I-EB-L01', title: 'CPA / accounting certification update (Completed)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-eb-l02', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
      category: 'Learning & Growth', subCategory: 'Systems',
      code: 'I-EB-L02', title: 'Finance system advanced training (100%)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-f01', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Financial', subCategory: 'Recruitment Cost',
      code: 'I-RP-F01', title: 'Average cost per hire (≤ IDR 5M)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-f02', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Financial', subCategory: 'Budget',
      code: 'I-RP-F02', title: 'HR training budget utilization (90–100%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-c01', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Customer', subCategory: 'Employee Experience',
      code: 'I-RP-C01', title: 'Employee satisfaction score (≥ 4.2 / 5)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-c02', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Customer', subCategory: 'HR Service',
      code: 'I-RP-C02', title: 'HR ticket resolution time (≤ 2 business days)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-i01', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Internal Process', subCategory: 'Talent Acquisition',
      code: 'I-RP-I01', title: 'Time to hire (all roles avg) (≤ 30 days)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-i02', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Internal Process', subCategory: 'Talent Acquisition',
      code: 'I-RP-I02', title: 'Offer acceptance rate (≥ 80%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-l01', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Learning & Growth', subCategory: 'L&D',
      code: 'I-RP-L01', title: 'Company-wide training completion (≥ 90%)',
      weight: 13, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-rp-l02', level: 'individual', ownerId: 'rio', department: 'HR',
      category: 'Learning & Growth', subCategory: 'Performance',
      code: 'I-RP-L02', title: 'Performance review cycle completion rate (100%)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-f01', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Financial', subCategory: 'Revenue',
      code: 'I-AI-F01', title: 'Total team sales revenue H1 2026 (IDR 6.3B)',
      weight: 20, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-f02', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Financial', subCategory: 'Pipeline',
      code: 'I-AI-F02', title: 'Wholesale pipeline value (IDR 1.5B)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-f03', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Financial', subCategory: 'Productivity',
      code: 'I-AI-F03', title: 'Revenue per sales representative (IDR 2.1B)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-c01', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Customer', subCategory: 'Retention',
      code: 'I-AI-C01', title: 'Client retention rate (≥ 88%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-c02', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Customer', subCategory: 'Enterprise',
      code: 'I-AI-C02', title: 'New enterprise client acquisition (+5 clients)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-i01', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Internal Process', subCategory: 'CRM',
      code: 'I-AI-I01', title: 'Team CRM adoption rate (100%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-i02', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Internal Process', subCategory: 'Forecast',
      code: 'I-AI-I02', title: 'Sales forecast accuracy (≥ 85%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-l01', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Learning & Growth', subCategory: 'Team Dev',
      code: 'I-AI-L01', title: 'Sales team training completion (100%)',
      weight: 8, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ai-l02', level: 'individual', ownerId: 'ali', department: 'Sales',
      category: 'Learning & Growth', subCategory: 'Process',
      code: 'I-AI-L02', title: 'Sales playbook update & rollout (Completed H1)',
      weight: 7, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-f01', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Financial', subCategory: 'Marketing ROI',
      code: 'I-BF-F01', title: 'Campaign return on investment (≥ 3× spend)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-f02', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Financial', subCategory: 'Efficiency',
      code: 'I-BF-F02', title: 'Cost per customer acquisition (≤ IDR 45K)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-c01', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Customer', subCategory: 'Brand',
      code: 'I-BF-C01', title: 'Social media followers growth (+15%)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-c02', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Customer', subCategory: 'Engagement',
      code: 'I-BF-C02', title: 'Campaign engagement rate (≥ 5%)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-c03', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Customer', subCategory: 'Brand',
      code: 'I-BF-C03', title: 'Brand sentiment score (≥ 75% positive)',
      weight: 11, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-i01', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Internal Process', subCategory: 'Delivery',
      code: 'I-BF-I01', title: 'On-time campaign launch rate (100%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-i02', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Internal Process', subCategory: 'Content',
      code: 'I-BF-I02', title: 'Monthly content output (≥ 60 pieces)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-l01', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Learning & Growth', subCategory: 'Digital',
      code: 'I-BF-L01', title: 'Digital marketing certification completion (Completed)',
      weight: 8, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-bf-l02', level: 'individual', ownerId: 'bayu', department: 'Marketing',
      category: 'Learning & Growth', subCategory: 'Research',
      code: 'I-BF-L02', title: 'Market research report delivery (1 per quarter)',
      weight: 7, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-f01', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Financial', subCategory: 'Food Cost',
      code: 'I-AP-F01', title: 'Department food cost ratio (≤ 30%)',
      weight: 13, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-f02', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Financial', subCategory: 'Waste',
      code: 'I-AP-F02', title: 'Food waste reduction vs H2 2025 (-10%)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-c01', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Customer', subCategory: 'Quality',
      code: 'I-AP-C01', title: 'Customer food satisfaction rating (≥ 4.5 / 5)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-c02', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Customer', subCategory: 'Menu',
      code: 'I-AP-C02', title: 'Menu satisfaction survey score (≥ 80%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-i01', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Internal Process', subCategory: 'Safety',
      code: 'I-AP-I01', title: 'HACCP audit pass rate (100%)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-i02', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Internal Process', subCategory: 'Efficiency',
      code: 'I-AP-I02', title: 'Average dish prep time (≤ 8 min)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-i03', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Internal Process', subCategory: 'Innovation',
      code: 'I-AP-I03', title: 'New menu items introduced per quarter (≥ 2 items)',
      weight: 11, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-l01', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Learning & Growth', subCategory: 'Team Dev',
      code: 'I-AP-L01', title: 'Kitchen team training completion (100%)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ap-l02', level: 'individual', ownerId: 'andi', department: 'Kitchen',
      category: 'Learning & Growth', subCategory: 'Cross-Train',
      code: 'I-AP-L02', title: 'Cross-station training coverage (≥ 75%)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-f01', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Financial', subCategory: 'Revenue',
      code: 'I-CA-F01', title: 'F&B revenue achievement vs target (≥ 95%)',
      weight: 13, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-f02', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Financial', subCategory: 'Efficiency',
      code: 'I-CA-F02', title: 'Table turnover improvement (+10%)',
      weight: 12, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-c01', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Customer', subCategory: 'Guest Experience',
      code: 'I-CA-C01', title: 'Customer satisfaction score (CSAT) (≥ 4.7 / 5)',
      weight: 18, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-c02', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Customer', subCategory: 'Complaints',
      code: 'I-CA-C02', title: 'Complaint resolution time (≤ 2 hours)',
      weight: 17, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-i01', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Internal Process', subCategory: 'Operations',
      code: 'I-CA-I01', title: 'FOH SOP compliance score (≥ 96%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-i02', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Internal Process', subCategory: 'Scheduling',
      code: 'I-CA-I02', title: 'Staff schedule coverage rate (100%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-l01', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Learning & Growth', subCategory: 'Team Dev',
      code: 'I-CA-L01', title: 'FOH team training completion (100%)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-ca-l02', level: 'individual', ownerId: 'cinta', department: 'Front of House',
      category: 'Learning & Growth', subCategory: 'Coaching',
      code: 'I-CA-L02', title: 'Monthly 1-on-1 coaching per staff (≥ 1 session)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-f01', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Financial', subCategory: 'Personal Sales',
      code: 'I-DD-F01', title: 'Personal sales revenue H1 2026 (IDR 1.8B)',
      weight: 20, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-f02', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Financial', subCategory: 'New Business',
      code: 'I-DD-F02', title: 'Revenue from new accounts (IDR 400M)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-f03', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Financial', subCategory: 'Upsell',
      code: 'I-DD-F03', title: 'Upsell achievement — existing clients (IDR 200M)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-c01', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Customer', subCategory: 'Satisfaction',
      code: 'I-DD-C01', title: 'Assigned client satisfaction score (≥ 4.2 / 5)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-c02', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Customer', subCategory: 'Responsiveness',
      code: 'I-DD-C02', title: 'Client complaint resolution time (≤ 24 hours)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-i01', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Internal Process', subCategory: 'Productivity',
      code: 'I-DD-I01', title: 'Client visits / calls per month (≥ 80 / month)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-i02', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Internal Process', subCategory: 'Proposals',
      code: 'I-DD-I02', title: 'Proposal submission turnaround (≤ 2 days post-meeting)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-l01', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Learning & Growth', subCategory: 'Product',
      code: 'I-DD-L01', title: 'Product & pricing training completion (100%)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-dd-l02', level: 'individual', ownerId: 'daud', department: 'Sales',
      category: 'Learning & Growth', subCategory: 'Skills',
      code: 'I-DD-L02', title: 'Negotiation skills workshop (≥ 1 session)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-f01', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Financial', subCategory: 'Personal Sales',
      code: 'I-JT-F01', title: 'Personal sales revenue H1 2026 (IDR 1.7B)',
      weight: 20, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-f02', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Financial', subCategory: 'Retail Focus',
      code: 'I-JT-F02', title: 'New retail account revenue (IDR 500M)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-f03', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Financial', subCategory: 'Upsell',
      code: 'I-JT-F03', title: 'Upsell & cross-sell revenue (IDR 150M)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-c01', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Customer', subCategory: 'Satisfaction',
      code: 'I-JT-C01', title: 'Assigned client satisfaction score (≥ 4.3 / 5)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-c02', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Customer', subCategory: 'Acquisition',
      code: 'I-JT-C02', title: 'New retail accounts opened (+80 accounts)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-i01', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Internal Process', subCategory: 'Productivity',
      code: 'I-JT-I01', title: 'Retail visit / call per month (≥ 90 / month)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-i02', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Internal Process', subCategory: 'CRM',
      code: 'I-JT-I02', title: 'CRM data update compliance (≥ 98%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-l01', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Learning & Growth', subCategory: 'Retail',
      code: 'I-JT-L01', title: 'Retail sales technique training (100%)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-jt-l02', level: 'individual', ownerId: 'jessie', department: 'Sales',
      category: 'Learning & Growth', subCategory: 'Product',
      code: 'I-JT-L02', title: 'New product knowledge assessment (≥ 85 / 100)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-f01', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Financial', subCategory: 'Upsell',
      code: 'I-ES-F01', title: 'Personal upsell revenue contribution (IDR 25M)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-f02', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Financial', subCategory: 'Avg Check',
      code: 'I-ES-F02', title: 'Average check contribution growth (+5% vs H2 2025)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-c01', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Customer', subCategory: 'Experience',
      code: 'I-ES-C01', title: 'Personal customer satisfaction rating (≥ 4.7 / 5)',
      weight: 20, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-c02', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Customer', subCategory: 'Recognition',
      code: 'I-ES-C02', title: 'Positive customer mentions per month (≥ 15 / month)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-c03', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Customer', subCategory: 'Accuracy',
      code: 'I-ES-C03', title: 'Drink preparation accuracy rate (≥ 99%)',
      weight: 10, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-i01', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Internal Process', subCategory: 'Speed',
      code: 'I-ES-I01', title: 'Drink preparation time (≤ 2.5 min)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-i02', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Internal Process', subCategory: 'Standards',
      code: 'I-ES-I02', title: 'SOP compliance rate (≥ 98%)',
      weight: 15, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-l01', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Learning & Growth', subCategory: 'Certification',
      code: 'I-ES-L01', title: 'Barista certification — Level 2 (Completed)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
    g({
      id: 'i-es-l02', level: 'individual', ownerId: 'eka', department: 'Front of House',
      category: 'Learning & Growth', subCategory: 'Menu',
      code: 'I-ES-L02', title: 'New menu mastery assessment (100%)',
      weight: 5, hasAligned: false, status: 'gray',
    }),
  ]
}

// Module-scope singleton — shared reactive "mini DB" for this demo prototype.
const STORAGE_KEY = 'talenta-goals-db'
// Bump this whenever seed() changes in a way stale localStorage would
// contradict (e.g. reweighting company goals) — otherwise a browser that
// already persisted the old seed keeps showing it forever, since
// loadFromStorage() below always prefers localStorage over a fresh seed().
const SEED_VERSION = 3
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

export function useGoalsStore() {
  loadFromStorage()

  function resetToSeed() {
    goals.value = seed()
    persist()
  }

  function deleteGoalsByCycle(cycleId: string) {
    goals.value = goals.value.filter(g => g.cycleId !== cycleId)
    persist()
  }

  // Category weight is derived, not authored — see GoalWithCategoryWeight
  // above. It's the average of the matching goals' own weight, scoped to
  // this owner within this level (a person's company/organization/team/
  // individual goals are each their own separate budget, so the average is
  // taken over ownerId + level + category, not just category).
  const goalsWithCategoryWeight = computed<GoalWithCategoryWeight[]>(() => goals.value.map((goal) => {
    const matching = goals.value.filter(g => g.level === goal.level && g.category === goal.category && g.ownerId === goal.ownerId)
    return {
      ...goal,
      // Rounded to 1 decimal — an unrounded average (e.g. 36.666666666666664)
      // would otherwise print every repeating digit straight into the UI.
      categoryWeight: matching.length > 0 ? Math.round((matching.reduce((sum, g) => sum + g.weight, 0) / matching.length) * 10) / 10 : 0,
    }
  }))

  const companyGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'company'))
  const organizationGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'organization'))
  const teamGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'team'))
  const individualGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'individual'))

  // "My goals" / "My direct reports" are scoped to individual-level goals
  // only — a person's own 100% commitment for the cycle. A leader who also
  // owns a company/organization/team goal still has that goal correctly
  // attributed to them on the respective Goals page; it must NOT also be
  // folded into "My goals", or the total stops meaning anything (separate
  // 100% budgets summed together produce a number with no real meaning).
  const myGoals = computed(() => individualGoals.value.filter(g => g.ownerId === CURRENT_USER_ID))
  const myDirectReportsGoals = computed(() => individualGoals.value.filter(
    g => EMPLOYEE_MANAGER[g.ownerId] === CURRENT_USER_ID,
  ))

  return {
    goals: goalsWithCategoryWeight,
    resetToSeed,
    deleteGoalsByCycle,
    companyGoals,
    organizationGoals,
    teamGoals,
    individualGoals,
    myGoals,
    myDirectReportsGoals,
  }
}
