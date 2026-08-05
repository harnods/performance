// ─────────────────────────────────────────────────────────────────────────────
// Review-cycles mini-DB — single source of truth for the Review Cycles list and
// for cycles created via the "Create new cycle" flow (Performance / Competency /
// Evaluation). Same module-scope singleton + localStorage + SEED_VERSION pattern
// as useGoalCyclesStore.ts.
//
// A created cycle carries its full builder config in `config` so the create form
// is a real save (persisted), not a throwaway toast. The list-row fields
// (repeat / total / done …) are derived from that config on save.
// ─────────────────────────────────────────────────────────────────────────────

export type CyclePurpose = 'performance' | 'competency' | 'evaluation'

// ── One review-method config (Manager / 360 / Team / Self) ──────────────────────
export interface MethodConfig {
  is_active: boolean
  template_uuid: string
  // General
  include_goals: boolean
  goal_types: number[]
  goal_auto_score_enabled: boolean
  can_reviewer_edit_goal_auto_score: boolean
  goal_achievement_ratings: { rating: string, name: string, percentage_from: number, percentage_to: number }[]
  use_9box_auto_generate: boolean
  // Manager
  is_layering_review: boolean
  review_order: string
  // Attendance / Reprimand (Manager)
  is_attendance_advance_scoring: boolean
  attendance_advance_scoring: { value: string, name: string, percentage_range_from: number, percentage_range_to: number }[]
  is_include_reprimand_data: boolean
  is_reprimand_use_score: boolean
  reprimand_advance_scoring: { name: string, score: number, type_id: number[], rating_id: string }[]
  // Weight
  is_simple_sum: 'true' | 'false'
  weight_implementation: 'all-employees' | 'custom'
  weight_employment_type: 'by-job-level' | 'by-job-position'
  custom_weight_implementation: Record<string, unknown>[]
  review_weight: number | ''
  goal_weight: number | ''
  advance_score_weight: number | ''
  reprimand_data_weight: number | ''
  weight: number | ''
}

// ── The full builder payload persisted for a created cycle ──────────────────────
export interface ReviewCycleConfig {
  name: string
  slug: string
  cycle_purpose: CyclePurpose
  // Competency
  assessment_purpose: number
  key_position_id: string
  is_nine_box_convert_score: boolean
  competency_legends: { from: string, to: string, label: string, description?: string }[] | null
  // Duplicate-from
  is_import: number
  cycle_master_uuid: string
  components: { member: boolean, reviewer: boolean, reviewMethod: boolean }
  // Members
  cycle_members: string[]
  // Dates
  is_recursive: boolean
  period_uuid: string
  start_date: string
  end_date: string
  start_date_review: string
  deadline_date: string
  // Methods
  manager_review: MethodConfig
  threesixty_review: MethodConfig
  peer_to_peer: MethodConfig
  self_review: MethodConfig
  use_weight: boolean
  // Review-method flags
  auto_assign_reviewer: boolean
  is_manager_display_result: boolean
  is_display_threesixty: boolean
  is_display_team_review: boolean
  is_allow_reject_task: boolean
  enable_lock_review: boolean
  is_exclude_rating: boolean
  is_sequence: boolean
  is_no_need_self: boolean
  is_prefill: boolean
  prefill_source: string | null
  // Co-worker / goal-pick periods
  is_pick_coworker: boolean
  start_date_pick_coworker: string | null
  end_date_pick_coworker: string | null
  start_date_manage_pick_coworker: string | null
  end_date_manage_pick_coworker: string | null
  is_pick_goals: boolean
  start_date_employee_pick_goals: string | null
  end_date_employee_pick_goals: string | null
  start_date_superordinates_manage_goals: string | null
  end_date_superordinates_manage_goals: string | null
  // Publish + deduction
  publish_score_when: string
  deduction_score_system: Record<string, unknown> & { is_active: boolean }
}

export interface ReviewCycle {
  id: string
  name: string
  purpose: CyclePurpose
  repeat: string
  nextStart: string | null
  repeatCaption: string | null
  total: number
  done: number
  config?: ReviewCycleConfig
}

const STORAGE_KEY = 'talenta-review-cycles-db'
const SEED_VERSION = 1

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function seed(): ReviewCycle[] {
  const rows: Omit<ReviewCycle, 'id'>[] = [
    { name: 'Mid Year Performance Review 2024', purpose: 'performance', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 1 },
    { name: 'Annual Performance Review 2024', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jul 2025', repeatCaption: null, total: 3, done: 3 },
    { name: 'Core Competency Assessment Q3', purpose: 'competency', repeat: 'Repeats quarterly', nextStart: 'Oct 2024', repeatCaption: null, total: 5, done: 1 },
    { name: 'Probation Evaluation - July 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 3, done: 1 },
    { name: 'Leadership Competency Review', purpose: 'competency', repeat: 'Repeats yearly', nextStart: 'Jan 2025', repeatCaption: null, total: 4, done: 2 },
    { name: 'Sales Performance Review Q2', purpose: 'performance', repeat: 'Repeats quarterly', nextStart: 'Oct 2024', repeatCaption: null, total: 8, done: 8 },
    { name: 'Manager Evaluation 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 1 },
    { name: 'New Joiner Probation Evaluation', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 3, done: 2 },
    { name: 'Technical Competency Mapping', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
    { name: 'End-of-Year Performance Review', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Dec 2025', repeatCaption: null, total: 4, done: 3 },
    { name: 'Engineering Competency Review H1', purpose: 'competency', repeat: 'Repeats yearly', nextStart: 'Jan 2025', repeatCaption: null, total: 3, done: 3 },
    { name: 'Product Team Performance Q1', purpose: 'performance', repeat: 'Repeats quarterly', nextStart: 'Apr 2025', repeatCaption: null, total: 6, done: 2 },
    { name: 'Internship Evaluation - Batch 3', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 3 },
    { name: 'Finance Competency Assessment', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
    { name: 'Customer Success Performance H2', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jan 2025', repeatCaption: null, total: 2, done: 1 },
    { name: 'Operations Evaluation Q3', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 1 },
    { name: 'HR Business Partner Review', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jul 2025', repeatCaption: null, total: 3, done: 3 },
    { name: 'Data Team Competency Check', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
    { name: 'Annual Manager Evaluation 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 3, done: 1 },
    { name: 'Sales Competency Review Q4', purpose: 'competency', repeat: 'Repeats quarterly', nextStart: 'Jan 2025', repeatCaption: null, total: 4, done: 0 },
    { name: 'Design Team Performance Review', purpose: 'performance', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 1 },
    { name: 'Probation Evaluation - August 2024', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 3, done: 1 },
    { name: 'Leadership Performance Assessment', purpose: 'performance', repeat: 'Repeats yearly', nextStart: 'Jul 2025', repeatCaption: null, total: 4, done: 2 },
    { name: 'Cross-functional Competency Audit', purpose: 'competency', repeat: 'Does not repeat', nextStart: null, repeatCaption: null, total: 1, done: 0 },
    { name: 'Probation Evaluation – Batch Jan 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 4, done: 2 },
    { name: 'Probation Evaluation – Batch Sep 2025', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 1, done: 1 },
    { name: 'Contract Evaluation – Batch Mar 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 1, done: 1 },
    { name: 'Contract Evaluation – Batch Jun 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: 'Sep 2026', repeatCaption: 'Based on contract duration', total: 1, done: 0 },
    { name: 'Part-timer Evaluation – Batch Jun 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on contract duration', total: 0, done: 0 },
    { name: 'Probation Evaluation – Batch Apr 2026', purpose: 'evaluation', repeat: 'Repeats automatically', nextStart: null, repeatCaption: 'Based on probation duration', total: 13, done: 0 },
  ]
  return rows.map((r, i) => ({ id: `seed-${i}-${slugify(r.name)}`, ...r }))
}

// Module-scope singleton — shared reactive mini-DB for this demo prototype.
const cycles = ref<ReviewCycle[]>(seed())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, cycles: cycles.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.cycles)) {
        cycles.value = parsed.cycles
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

export function useReviewCyclesStore() {
  loadFromStorage()

  // Persist a cycle built by the create flow. Derives the list-row fields from
  // the config (repeat from is_recursive, total from member count).
  function addCycle(config: ReviewCycleConfig): ReviewCycle {
    const created: ReviewCycle = {
      id: `cycle-${cycles.value.length}-${slugify(config.name)}`,
      name: config.name,
      purpose: config.cycle_purpose,
      repeat: config.is_recursive ? 'Repeats automatically' : 'Does not repeat',
      nextStart: null,
      repeatCaption: null,
      total: config.cycle_members.length,
      done: 0,
      config,
    }
    cycles.value = [...cycles.value, created]
    persist()
    return created
  }

  function deleteCycle(id: string) {
    cycles.value = cycles.value.filter(c => c.id !== id)
    persist()
  }

  function renameCycle(id: string, name: string) {
    cycles.value = cycles.value.map(c => (c.id === id
      ? { ...c, name, config: c.config ? { ...c.config, name } : c.config }
      : c))
    persist()
  }

  function getById(id: string): ReviewCycle | undefined {
    return cycles.value.find(c => c.id === id)
  }

  function resetToSeed() {
    cycles.value = seed()
    persist()
  }

  return { cycles, addCycle, deleteCycle, renameCycle, getById, resetToSeed }
}
