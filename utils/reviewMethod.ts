// ─────────────────────────────────────────────────────────────────────────────
// Shared shapes + seeds for the review-method config edited inside CycleMethodDrawer
// and held per-method by CycleGeneralForm. Mirrors production GeneralForm's
// per-method scoring object (template, goals, attendance, reprimand, weight) plus
// the shared per-method flags (layering/prefill, co-worker & goal-pick periods,
// display toggles).
// ─────────────────────────────────────────────────────────────────────────────

export type MethodKey = 'manager_review' | 'threesixty_review' | 'peer_to_peer' | 'self_review'

export interface TemplateOption { value: string, label: string, description: string, type: 'rating' | 'percentage' | 'point' | 'text' }

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  { value: 'perf-rating', label: 'Performance rating template', description: 'Question type: rating', type: 'rating' },
  { value: 'perf-percentage', label: 'Performance percentage template', description: 'Question type: percentage', type: 'percentage' },
  { value: 'perf-point', label: 'Point-based template', description: 'Question type: point', type: 'point' },
  { value: 'leadership-rating', label: 'Leadership review', description: 'Question type: rating', type: 'rating' },
  { value: 'qualitative', label: 'Qualitative feedback', description: 'Question type: open-ended', type: 'text' },
]

export const SCORING_TEMPLATE_TYPES = ['rating', 'percentage', 'point']

export function templateType(uuid: string): TemplateOption['type'] | '' {
  return TEMPLATE_OPTIONS.find(t => t.value === uuid)?.type ?? ''
}

// Rating scale used for the rating-based aspect tables (goal achievement,
// attendance performance, reprimand). Descending bands, highest first.
export const RATING_SCALE = [
  { value: 'A', name: 'Exceeds expectation' },
  { value: 'B', name: 'Meets expectation' },
  { value: 'C', name: 'Below expectation' },
]

export const REPRIMAND_TYPES = [
  { id: 1, type_name: 'Verbal warning' },
  { id: 2, type_name: 'First written warning (SP1)' },
  { id: 3, type_name: 'Second written warning (SP2)' },
  { id: 4, type_name: 'Final written warning (SP3)' },
]

export const GOAL_TYPE_OPTIONS = [
  { type: 1, name: 'Company' },
  { type: 2, name: 'Team' },
  { type: 3, name: 'Individual' },
]

export const LAYER_REVIEW_ORDER_OPTIONS = [
  { value: 'approval-line', label: 'By approval line' },
  { value: 'manager', label: 'By manager' },
  { value: 'job-position', label: 'By job position' },
]

export const PREFILL_SOURCE_OPTIONS = [
  { value: 'self-review', label: 'Employee self-review' },
  { value: 'previous-manager', label: 'Previous manager (Sequential)' },
]

export interface RatingBand { rating: string, name: string, percentage_from: number, percentage_to: number }
export interface AttBand { value: string, name: string, percentage_range_from: number, percentage_range_to: number }
export interface ReprimandScoreRow { name: string, score: number, type_id: number[], rating_id: string }
export interface CustomWeightRow { id: string, name: string, review: number | '', goal: number | '', attendance: number | '', reprimand: number | '' }

// Rating→achievement% seed: 3 ascending bands (0-60, 61-85, >85).
export function seedGoalAchievement(): RatingBand[] {
  const bands = [[0, 60], [61, 85], [86, 100]]
  return RATING_SCALE.slice().reverse().map((r, i) => ({ rating: r.value, name: r.name, percentage_from: bands[i][0], percentage_to: bands[i][1] }))
}
export function seedAttendanceTable(): AttBand[] {
  const bands = [[0, 60], [61, 85], [86, 100]]
  return RATING_SCALE.slice().reverse().map((r, i) => ({ value: r.value, name: r.name, percentage_range_from: bands[i][0], percentage_range_to: bands[i][1] }))
}
export function seedReprimandTable(isRating: boolean): ReprimandScoreRow[] {
  if (isRating) return RATING_SCALE.map((r, i) => ({ name: r.name, score: 0, type_id: [], rating_id: `${r.value}-${i}` }))
  return [{ name: '', score: 0, type_id: [], rating_id: 'r0' }]
}

export interface MethodForm {
  template_uuid: string
  // Goals
  include_goals: boolean
  goal_types: number[]
  goal_auto_score_enabled: boolean
  can_reviewer_edit_goal_auto_score: boolean
  goal_achievement_ratings: RatingBand[]
  use_9box_auto_generate: boolean
  is_pick_goals: boolean
  pick_goals_period: Date[]
  manage_goals_period: Date[]
  // Manager — general
  auto_assign_reviewer: boolean
  is_manager_display_result: boolean
  is_layering_review: boolean
  review_order: string
  is_prefill: boolean
  prefill_source: string | null
  // Self
  is_exclude_rating: boolean
  is_display_self: boolean
  is_no_need_self: 'true' | 'false'
  // Team
  is_display_team: boolean
  // 360
  is_display_threesixty: boolean
  is_pick_coworker: boolean
  pick_coworker_period: Date[]
  manage_coworker_period: Date[]
  is_allow_reject: boolean
  // Attendance
  is_attendance_advance_scoring: boolean
  attendance_advance_scoring: AttBand[]
  // Reprimand
  is_include_reprimand_data: boolean
  is_reprimand_use_score: boolean
  reprimand_advance_scoring: ReprimandScoreRow[]
  // Weight
  is_simple_sum: 'true' | 'false'
  weight_implementation: 'all-employees' | 'custom'
  weight_employment_type: 'by-job-level' | 'by-job-position'
  custom_weight_implementation: CustomWeightRow[]
  review_weight: number | ''
  goal_weight: number | ''
  advance_score_weight: number | ''
  reprimand_data_weight: number | ''
  weight: number | ''
}

export function makeMethodForm(): MethodForm {
  return {
    template_uuid: '',
    include_goals: false,
    goal_types: [1],
    goal_auto_score_enabled: false,
    can_reviewer_edit_goal_auto_score: false,
    goal_achievement_ratings: seedGoalAchievement(),
    use_9box_auto_generate: false,
    is_pick_goals: false,
    pick_goals_period: [],
    manage_goals_period: [],
    auto_assign_reviewer: false,
    is_manager_display_result: false,
    is_layering_review: false,
    review_order: '',
    is_prefill: false,
    prefill_source: null,
    is_exclude_rating: false,
    is_display_self: false,
    is_no_need_self: 'false',
    is_display_team: false,
    is_display_threesixty: false,
    is_pick_coworker: false,
    pick_coworker_period: [],
    manage_coworker_period: [],
    is_allow_reject: false,
    is_attendance_advance_scoring: false,
    attendance_advance_scoring: seedAttendanceTable(),
    is_include_reprimand_data: false,
    is_reprimand_use_score: false,
    reprimand_advance_scoring: [],
    is_simple_sum: 'false',
    weight_implementation: 'all-employees',
    weight_employment_type: 'by-job-level',
    custom_weight_implementation: [],
    review_weight: '',
    goal_weight: '',
    advance_score_weight: '',
    reprimand_data_weight: '',
    weight: '',
  }
}
