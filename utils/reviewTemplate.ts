// ━━━ MOCK DATA — hardcoded, NOT connected to any API ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Review templates (Settings → Templates), migrated from talenta-review
// src/views/settings/template (commit 010875214aba).
//
// Shapes:
// - ReviewTemplateListItem: the fields talenta-review reads from
//   GET {newEndPoint}/review-templates (Go review service, not verified here).
// - TemplateDetail: talenta-noncore-api ReviewTemplateController@getTemplateDetail
//   (commit e5ed5a04d4a4) — initTemplate / initCategories / initRatings / initLegends.
// - Presets / cycles: the fields talenta-review reads from
//   {newEndPoint}/review-templates/presets and /review-templates/{uuid}/cycles.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AnswerType = 'free-text' | 'yes-no' | 'rating' | 'percent' | 'point' | 'custom'
export type CalculateType = 'weight' | 'non-weight'

export interface ReviewTemplateListItem {
  id: number
  uuid: string
  company_id: number
  name: string
  answer_type: AnswerType
  calculate_type: CalculateType
  total_cycle: number
  is_active: 0 | 1
  is_loading?: boolean
}

export interface TemplateRating { value: string | number, name: string, from?: string | number | null, to?: string | number | null }
export interface TemplateIndicator { id?: string | number, name: string, weight: string | number, answer_type: AnswerType | null, ratings?: TemplateRating[] }
export interface TemplateCategory {
  id?: string | number
  name: string
  weight: string | number
  required_comment: boolean
  description: string
  is_use_freetext_indicator?: number
  is_use_negative_indicator?: number
  indicators: TemplateIndicator[]
  is_error_weight?: boolean
}
export interface TemplateLegend { from: string | number, to: string | number | null, description: string, color: string }

export interface TemplateDetailTemplate {
  uuid: string
  name: string
  answer_type: AnswerType
  calculate_type: CalculateType
  required_summary: boolean
  is_indicator_rating: '0' | '1'
  is_allow_value: 0 | 1
  is_use_freetext_indicator: 0 | 1
  is_use_negative_indicator: boolean
  is_layered_scoring: boolean
  is_apply_score_for_goal_only: boolean
  is_required_comment_goal: boolean
  is_custom_points_enabled: boolean
  legend_name?: string
}

export interface TemplateDetail {
  template: TemplateDetailTemplate
  categories: TemplateCategory[]
  ratings: TemplateRating[]
  legends: TemplateLegend[]
}

export interface TemplatePreset { template_uuid: string, name: string, description: string, icon: string }
export interface TemplateCycle { id: number, name: string, start_date: string, end_date: string }

// talenta-review store/modules/settings.js `answerTypes` (Point is behind the
// PR-alto-point-template Unleash flag in production; shown here).
export const ANSWER_TYPES: { slug: AnswerType, name: string }[] = [
  { slug: 'free-text', name: 'Free text' },
  { slug: 'yes-no', name: 'Yes or no' },
  { slug: 'rating', name: 'Rating' },
  { slug: 'percent', name: 'Percentage' },
  { slug: 'point', name: 'Point' },
  { slug: 'custom', name: 'Custom' },
]
// getters['settings/getCustomTypes']: a custom indicator can't be Point/Custom.
export const CUSTOM_INDICATOR_TYPES = ANSWER_TYPES.filter(t => t.slug !== 'custom' && t.slug !== 'point')

// helpers/pages/settings.js answerTypeName
export function answerTypeName(answerType: string | null | undefined): string {
  const types: Record<string, string> = { 'rating': 'Rating', 'percent': 'Percentage', 'point': 'Point', 'free-text': 'Free text', 'yes-no': 'Yes/no' }
  return types[answerType ?? ''] || 'Custom'
}

// helpers/string.js pluralize(count, singular, plural, zero)
export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

// LegendListForm defaultColorPicker (production swatches).
export const LEGEND_COLOR_PRESET = [
  '#3B82F6', '#14B8A6', '#8B5CF6', '#F59E0B', '#EF4444', '#71717A', '#84CC16', '#EC4899',
  '#60A5FA', '#2DD4BF', '#A78BFA', '#FBBF24', '#F87171', '#A1A1AA', '#A3E635', '#F472B6',
]
export const DEFAULT_LEGEND_COLOR = '#14B8A6'
export const NAME_MAX = 60
export const LEGEND_NAME_MAX = 60
// Letters (any script), marks, numbers, spaces and - ( ) & /. Everything else, emoji included, is blocked.
export const LEGEND_NAME_PATTERN = /^[\p{L}\p{M}\p{N} \-()&/]+$/u
export const LEGEND_NAME_DEFAULT = 'Legends'

// ─── Seed list ──────────────────────────────────────────────────────────────────
// company_id 0 = Talenta default template (Default badge, view only, always active).
export const TEMPLATES_SEED: ReviewTemplateListItem[] = [
  { id: 1, uuid: 'mock-tpl-default-performance', company_id: 0, name: 'Default performance review', answer_type: 'rating', calculate_type: 'non-weight', total_cycle: 12, is_active: 1 },
  { id: 2, uuid: 'mock-tpl-default-probation', company_id: 0, name: 'Default probation review', answer_type: 'yes-no', calculate_type: 'non-weight', total_cycle: 3, is_active: 1 },
  { id: 3, uuid: 'mock-tpl-perf-rating', company_id: 1201, name: 'Performance rating template', answer_type: 'rating', calculate_type: 'weight', total_cycle: 4, is_active: 1 },
  { id: 4, uuid: 'mock-tpl-perf-percentage', company_id: 1201, name: 'Performance percentage template', answer_type: 'percent', calculate_type: 'weight', total_cycle: 2, is_active: 1 },
  { id: 5, uuid: 'mock-tpl-point-based', company_id: 1201, name: 'Point-based template', answer_type: 'point', calculate_type: 'non-weight', total_cycle: 1, is_active: 1 },
  { id: 6, uuid: 'mock-tpl-self-assessment', company_id: 1201, name: 'Self assessment', answer_type: 'free-text', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  { id: 7, uuid: 'mock-tpl-probation-checkin', company_id: 1201, name: 'Probation check-in', answer_type: 'yes-no', calculate_type: 'non-weight', total_cycle: 0, is_active: 0 },
  { id: 8, uuid: 'mock-tpl-mid-year', company_id: 1201, name: 'Mid-year review', answer_type: 'custom', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  { id: 9, uuid: 'mock-tpl-sales-goals', company_id: 1201, name: 'Sales scorecard (goals only)', answer_type: 'rating', calculate_type: 'non-weight', total_cycle: 3, is_active: 1 },
  { id: 10, uuid: 'mock-tpl-layered', company_id: 1201, name: 'Engineering competency – layered scoring', answer_type: 'rating', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  { id: 11, uuid: 'mock-tpl-long-name', company_id: 1201, name: 'Annual leadership & people-management review for line leads', answer_type: 'rating', calculate_type: 'weight', total_cycle: 0, is_active: 0 },
  { id: 12, uuid: 'mock-tpl-copy-rating', company_id: 1201, name: 'Copy Performance rating template', answer_type: 'rating', calculate_type: 'weight', total_cycle: 0, is_active: 0 },
  { id: 13, uuid: 'mock-tpl-360-peer', company_id: 1201, name: '360 peer feedback', answer_type: 'custom', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  { id: 14, uuid: 'mock-tpl-okr-checkin', company_id: 1201, name: 'Quarterly OKR check-in', answer_type: 'percent', calculate_type: 'non-weight', total_cycle: 6, is_active: 1 },
]

// ─── Detail building blocks ─────────────────────────────────────────────────────
const RATING_5: TemplateRating[] = [
  { value: '1', name: 'Far below expectations', from: 0, to: 0 },
  { value: '2', name: 'Below expectations', from: 0, to: 0 },
  { value: '3', name: 'Meets expectations', from: 0, to: 0 },
  { value: '4', name: 'Exceeds expectations', from: 0, to: 0 },
  { value: '5', name: 'Far exceeds expectations', from: 0, to: 0 },
]
const RATING_LAYERED: TemplateRating[] = [
  { value: '1', name: 'Novice', from: 0, to: 20 },
  { value: '2', name: 'Advanced beginner', from: 20.01, to: 40 },
  { value: '3', name: 'Competent', from: 40.01, to: 60 },
  { value: '4', name: 'Proficient', from: 60.01, to: 80 },
  { value: '5', name: 'Expert', from: 80.01, to: 100 },
]
const POINTS: TemplateRating[] = [
  { value: '10', name: 'Outstanding — consistently beyond the target', from: 0, to: 0 },
  { value: '7', name: 'Good — meets the target', from: 0, to: 0 },
  { value: '4', name: 'Fair — partly meets the target', from: 0, to: 0 },
  { value: '1', name: 'Poor — well below the target', from: 0, to: 0 },
]
const LEGENDS: Record<'rating' | 'percent' | 'point' | 'layered', TemplateLegend[]> = {
  rating: [
    { from: 1, to: 2.5, description: 'Needs improvement', color: '#EF4444' },
    { from: 2.51, to: 3.5, description: 'Meets expectations', color: '#F59E0B' },
    { from: 3.51, to: 5, description: 'Exceeds expectations', color: '#14B8A6' },
  ],
  percent: [
    { from: 0, to: 59.99, description: 'Below target', color: '#EF4444' },
    { from: 60, to: 84.99, description: 'On target', color: '#F59E0B' },
    { from: 85, to: 100, description: 'Above target', color: '#14B8A6' },
  ],
  point: [
    { from: 0, to: 4, description: 'Below standard', color: '#EF4444' },
    { from: 4.01, to: 7, description: 'Standard', color: '#3B82F6' },
    { from: 7.01, to: 10, description: 'Above standard', color: '#14B8A6' },
  ],
  layered: [
    { from: 0, to: 60, description: 'Developing', color: '#F59E0B' },
    { from: 60.01, to: 100, description: 'Role model', color: '#8B5CF6' },
  ],
}

// initCategories: an indicator without its own ratings gets one placeholder row,
// and a null indicator answer_type comes back as 'percent'.
const EMPTY_INDICATOR_RATINGS = (): TemplateRating[] => [{ value: '0', name: '', from: '0', to: '0' }]
function ind(name: string, weight = 0, answer_type: AnswerType = 'percent', ratings?: TemplateRating[]): TemplateIndicator {
  return { name, weight, answer_type, ratings: ratings ?? EMPTY_INDICATOR_RATINGS() }
}
function cat(name: string, description: string, indicators: TemplateIndicator[], weight = 0, required_comment = false): TemplateCategory {
  return { name, weight, required_comment, description, is_use_freetext_indicator: 0, is_use_negative_indicator: 0, indicators }
}

const CORE_CATEGORIES = (weighted: boolean): TemplateCategory[] => [
  cat('Job knowledge', 'Understanding of the tools, processes and domain the role needs.', [
    ind('Applies technical knowledge to deliver work with minimal supervision', weighted ? 60 : 0),
    ind('Keeps skills current and shares knowledge with the team', weighted ? 40 : 0),
  ], weighted ? 40 : 0, true),
  cat('Communication and interpersonal skills', '', [
    ind('Shows strong communication and interpersonal skills in teams', weighted ? 50 : 0),
    ind('Gives and receives feedback constructively', weighted ? 50 : 0),
  ], weighted ? 30 : 0),
  cat('Ownership', 'Takes responsibility for outcomes, not just tasks.', [
    ind('Follows through on commitments and flags risks early', weighted ? 100 : 0),
  ], weighted ? 30 : 0),
]

function detailTemplate(t: ReviewTemplateListItem, over: Partial<TemplateDetailTemplate> = {}): TemplateDetailTemplate {
  return {
    uuid: t.uuid,
    name: t.name,
    answer_type: t.answer_type,
    calculate_type: t.calculate_type,
    required_summary: true,
    is_indicator_rating: '0',
    is_allow_value: 0,
    is_use_freetext_indicator: 0,
    is_use_negative_indicator: false,
    is_layered_scoring: false,
    is_apply_score_for_goal_only: false,
    is_required_comment_goal: false,
    is_custom_points_enabled: false,
    ...over,
  }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

export function buildSeedDetail(t: ReviewTemplateListItem): TemplateDetail {
  const weighted = t.calculate_type === 'weight'
  switch (t.uuid) {
    case 'mock-tpl-sales-goals':
      return {
        template: detailTemplate(t, { is_apply_score_for_goal_only: true, is_required_comment_goal: true }),
        categories: [cat('Default', '', [ind('Default', 0)])],
        ratings: clone(RATING_5),
        legends: clone(LEGENDS.rating),
      }
    case 'mock-tpl-layered':
      return {
        template: detailTemplate(t, { is_layered_scoring: true }),
        categories: CORE_CATEGORIES(false),
        ratings: clone(RATING_LAYERED),
        legends: clone(LEGENDS.layered),
      }
    case 'mock-tpl-mid-year':
    case 'mock-tpl-360-peer':
      return {
        template: detailTemplate(t),
        categories: [
          cat('Results', 'What the employee delivered this period.', [
            ind('Overall quality of delivered work', 0, 'rating'),
            ind('Share of committed goals achieved', 0, 'percent'),
          ]),
          cat('Behaviour', '', [
            ind('Collaborates well across teams', 0, 'yes-no'),
            ind('What should this person keep doing?', 0, 'free-text'),
          ], 0, true),
        ],
        ratings: clone(RATING_5),
        legends: [],
      }
    case 'mock-tpl-point-based':
      return {
        template: detailTemplate(t, { is_use_freetext_indicator: 1 }),
        categories: [
          ...CORE_CATEGORIES(false).slice(0, 2),
          { ...cat('Additional notes', '', [ind('Anything else the reviewer wants to add', 0, 'free-text')]), is_use_freetext_indicator: 1 },
        ],
        ratings: clone(POINTS),
        legends: clone(LEGENDS.point),
      }
    case 'mock-tpl-okr-checkin':
      return {
        template: detailTemplate(t, { is_allow_value: 1, is_use_negative_indicator: true }),
        categories: [cat('Objectives', 'Progress on the quarter’s key results.', [ind('Key result 1 progress'), ind('Key result 2 progress'), ind('Key result 3 progress')])],
        ratings: [],
        legends: [
          { from: 0, to: 69.99, description: 'Off track', color: '#EF4444' },
          { from: 70, to: 100, description: 'On track', color: '#14B8A6' },
          { from: 100.01, to: null, description: 'Stretch achieved', color: '#8B5CF6' },
        ],
      }
    default:
      break
  }

  if (t.answer_type === 'rating') {
    return { template: detailTemplate(t), categories: CORE_CATEGORIES(weighted), ratings: clone(RATING_5), legends: clone(LEGENDS.rating) }
  }
  if (t.answer_type === 'percent') {
    return { template: detailTemplate(t), categories: CORE_CATEGORIES(weighted), ratings: [], legends: clone(LEGENDS.percent) }
  }
  if (t.answer_type === 'point') {
    return { template: detailTemplate(t), categories: CORE_CATEGORIES(false), ratings: clone(POINTS), legends: clone(LEGENDS.point) }
  }
  return { template: detailTemplate(t, { required_summary: t.answer_type === 'free-text' }), categories: CORE_CATEGORIES(false), ratings: [], legends: [] }
}

// ─── Template library (presets) ─────────────────────────────────────────────────
// Production renders `${templatePresetImgsPath}${preset.icon}` images; the image
// files aren't in this repo, so `icon` is a Pixel icon name here.
export const PRESETS: TemplatePreset[] = [
  { template_uuid: 'mock-preset-okr', name: 'OKR review', description: 'Score each key result by how much of it was achieved.', icon: 'goal' },
  { template_uuid: 'mock-preset-competency', name: 'Competency review', description: 'Rate core competencies against a 5-point scale.', icon: 'competencies' },
  { template_uuid: 'mock-preset-360', name: '360 feedback', description: 'Mix ratings and open questions for peers and managers.', icon: 'people' },
  { template_uuid: 'mock-preset-probation', name: 'Probation review', description: 'Simple yes or no checks before confirming an employee.', icon: 'employee' },
  { template_uuid: 'mock-preset-self', name: 'Self review', description: 'Open questions the employee answers about their own period.', icon: 'profile' },
  { template_uuid: 'mock-preset-kpi-point', name: 'KPI points', description: 'Award points per KPI and convert the total to a legend.', icon: 'increase-kpi' },
]

const PRESET_SOURCES: Record<string, ReviewTemplateListItem> = {
  'mock-preset-okr': { id: 0, uuid: 'mock-preset-okr', company_id: 0, name: 'OKR review', answer_type: 'percent', calculate_type: 'weight', total_cycle: 0, is_active: 1 },
  'mock-preset-competency': { id: 0, uuid: 'mock-preset-competency', company_id: 0, name: 'Competency review', answer_type: 'rating', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  'mock-preset-360': { id: 0, uuid: 'mock-preset-360', company_id: 0, name: '360 feedback', answer_type: 'custom', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  'mock-preset-probation': { id: 0, uuid: 'mock-preset-probation', company_id: 0, name: 'Probation review', answer_type: 'yes-no', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  'mock-preset-self': { id: 0, uuid: 'mock-preset-self', company_id: 0, name: 'Self review', answer_type: 'free-text', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
  'mock-preset-kpi-point': { id: 0, uuid: 'mock-preset-kpi-point', company_id: 0, name: 'KPI points', answer_type: 'point', calculate_type: 'non-weight', total_cycle: 0, is_active: 1 },
}

export function buildPresetDetail(uuid: string): TemplateDetail | undefined {
  const src = PRESET_SOURCES[uuid]
  if (!src) return undefined
  if (uuid === 'mock-preset-360') {
    const d = buildSeedDetail({ ...src, uuid: 'mock-tpl-360-peer' })
    return { ...d, template: { ...d.template, uuid, name: src.name } }
  }
  return buildSeedDetail(src)
}

// ─── Usage cycle list ───────────────────────────────────────────────────────────
const CYCLE_NAMES = ['Annual review', 'Mid-year review', 'Quarterly review', 'Probation review', 'Project retro review', 'Leadership review']
export function buildSeedCycles(t: ReviewTemplateListItem): TemplateCycle[] {
  return Array.from({ length: t.total_cycle }, (_, i) => {
    const year = 2026 - Math.floor(i / 2)
    const firstHalf = i % 2 === 1
    return {
      id: t.id * 100 + i,
      name: `${CYCLE_NAMES[(t.id + i) % CYCLE_NAMES.length]} ${year}${firstHalf ? ' H1' : ''}`,
      start_date: firstHalf ? `${year}-01-01` : `${year}-07-01`,
      end_date: firstHalf ? `${year}-06-30` : `${year}-12-31`,
    }
  })
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}
// helpers/date.js formatDateRange
export function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} - ${formatDate(end)}`
}

// helpers/number.js formatInputScore: digits + one dot, max 2 decimals.
export function formatInputScore(raw: string | number | null | undefined): string {
  const s = String(raw ?? '').replace(/[^0-9.]/g, '')
  const [int, ...rest] = s.split('.')
  if (!rest.length) return int
  return `${int}.${rest.join('').slice(0, 2)}`
}

// helpers/number.js formatDecimalMax: drop trailing zeros.
export function formatDecimalMax(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : String(Math.round(n * 100) / 100)
}
