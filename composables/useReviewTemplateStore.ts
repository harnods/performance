// ━━━ MOCK STORE — in-memory, NOT connected to any API ━━━━━━━━━━━━━━━━━━━━━━━━━
// Replaces talenta-review's Vuex `settings/*` template actions (getTemplates,
// getTemplate, createUpdateTemplate, updateStatusTemplate, deleteTemplate,
// getPresets) and the raw axios call for /review-templates/{uuid}/cycles.
// Module-scope so the list page and the builder modal share one list. Resets on
// reload.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import {
  TEMPLATES_SEED, PRESETS, buildSeedDetail, buildPresetDetail, buildSeedCycles,
  type ReviewTemplateListItem, type TemplateDetail, type TemplateCategory, type TemplateLegend,
  type TemplateRating, type AnswerType, type CalculateType,
} from '~/utils/reviewTemplate'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

const COMPANY_ID = 1201
// ReviewTemplateController::$default_colors — used when a legend has no colour.
const DEFAULT_COLORS = ['#ff6c00', '#ffcb00', '#4ea400', '#00caca', '#0035ca', '#8500ca', '#ca0040']

const templates = ref<ReviewTemplateListItem[]>(clone(TEMPLATES_SEED))
const details = ref<Record<string, TemplateDetail>>(Object.fromEntries(TEMPLATES_SEED.map(t => [t.uuid, buildSeedDetail(t)])))
// shouldShowPresetTemplateFeedback: last preset-based template was created ≥ 3 months ago.
const lastPresetCreatedAt = ref(new Date('2026-06-01T09:00:00'))

// MOCK of per-company settings: custom legend labels the user has saved, and the one new templates start with.
const savedLegendNames = ref<string[]>([])
const nextLegendName = ref('')

let seq = 0

export interface TemplatePayload {
  name: string
  required_summary: boolean
  categories: TemplateCategory[]
  answer_type: AnswerType
  calculate_type: CalculateType
  input_type: 'new' | 'edit' | 'duplicate'
  uuid?: string
  is_rating: number
  is_legend: number
  is_indicator_rating: number
  is_custom_points_enabled: boolean
  legends: TemplateLegend[] | ''
  ratings: TemplateRating[]
  is_allow_value: number
  is_use_freetext_indicator: boolean
  is_use_negative_indicator: boolean
  is_apply_score_for_goal_only: boolean
  is_required_comment_goal: boolean
  is_layered_scoring: boolean
  is_using_preset: boolean
  preset_name: string
  legend_name: string
}

export interface TemplateApiError { message: string, errors?: Record<string, string[]> }

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0)
}

// Mirrors addTemplate → getTemplateDetail: what the API would hand back when
// the template is opened again.
function payloadToDetail(uuid: string, p: TemplatePayload): TemplateDetail {
  const freetextIdx = p.is_use_freetext_indicator ? p.categories.length - 1 : -1
  const perIndicatorRatings = Boolean(p.is_indicator_rating || p.is_custom_points_enabled)
  return {
    template: {
      uuid,
      name: p.name.trim(),
      answer_type: p.answer_type,
      calculate_type: p.calculate_type,
      required_summary: p.required_summary,
      is_indicator_rating: p.is_indicator_rating ? '1' : '0',
      is_allow_value: p.is_allow_value ? 1 : 0,
      is_use_freetext_indicator: p.is_use_freetext_indicator ? 1 : 0,
      is_use_negative_indicator: p.is_use_negative_indicator,
      is_layered_scoring: p.is_layered_scoring,
      is_apply_score_for_goal_only: p.is_apply_score_for_goal_only,
      is_required_comment_goal: p.is_required_comment_goal,
      is_custom_points_enabled: p.is_custom_points_enabled,
      legend_name: p.legend_name || '',
    },
    categories: p.categories.map((c, ci) => {
      const isFreetext = ci === freetextIdx
      const weighted = p.calculate_type === 'weight' && !isFreetext
      return {
        name: c.name,
        weight: weighted ? Number(c.weight || 0) : 0,
        required_comment: isFreetext ? false : Boolean(c.required_comment),
        description: c.description ?? '',
        is_use_freetext_indicator: isFreetext ? 1 : 0,
        is_use_negative_indicator: 0,
        indicators: (c.indicators ?? []).map(i => ({
          name: i.name,
          weight: weighted ? Number(i.weight || 0) : 0,
          answer_type: (p.answer_type === 'custom' ? i.answer_type : null) || 'percent',
          ratings: perIndicatorRatings && !isFreetext && i.ratings?.length
            ? i.ratings.map(r => ({ value: String(r.value), name: r.name, from: p.is_layered_scoring ? r.from ?? 0 : 0, to: p.is_layered_scoring ? r.to ?? 0 : 0 }))
            : [{ value: '0', name: '', from: '0', to: '0' }],
        })),
      }
    }),
    ratings: p.is_rating
      ? p.ratings.map(r => ({ value: String(r.value), name: r.name, from: p.is_layered_scoring ? r.from ?? 0 : 0, to: p.is_layered_scoring ? r.to ?? 0 : 0 }))
      : [],
    legends: p.is_legend && p.legends
      ? p.legends.map((l, i) => ({ from: Number(l.from), to: l.to === null || l.to === '' ? null : Number(l.to), description: l.description, color: l.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }))
      : [],
  }
}

export function useReviewTemplateStore() {
  // Newest first (docs/patterns/table.md — default row order).
  const list = computed(() => [...templates.value].sort((a, b) => b.id - a.id))
  const templateByUuid = (uuid: string) => templates.value.find(t => t.uuid === uuid)

  // MOCK of GET /review-templates/detail/{uuid}
  function getTemplate(uuid: string): TemplateDetail {
    const detail = details.value[uuid] ?? buildPresetDetail(uuid)
    if (!detail) throw { message: 'Template not found' } satisfies TemplateApiError
    return clone(detail)
  }

  // MOCK of POST /review-templates (input_type new | edit | duplicate)
  function createUpdateTemplate(payload: TemplatePayload): { show_template_preset_feedback: boolean } {
    const name = payload.name.trim()
    const exceptUuid = payload.input_type === 'edit' ? payload.uuid : ''
    // CreateOrUpdateTemplateRequest `unique_name:review_templates,{company}` —
    // the validator's message text isn't in the repo; Laravel's default used.
    const taken = templates.value.some(t => t.uuid !== exceptUuid && t.company_id === COMPANY_ID && t.name.trim().toLowerCase() === name.toLowerCase())
    if (taken) throw { message: 'The name has already been taken.', errors: { name: ['The name has already been taken.'] } } satisfies TemplateApiError

    if (payload.input_type === 'edit' && payload.uuid) {
      const uuid = payload.uuid
      templates.value = templates.value.map(t => (t.uuid === uuid ? { ...t, name, answer_type: payload.answer_type, calculate_type: payload.calculate_type } : t))
      details.value = { ...details.value, [uuid]: payloadToDetail(uuid, payload) }
      return { show_template_preset_feedback: false }
    }

    seq += 1
    const id = Math.max(0, ...templates.value.map(t => t.id)) + 1
    const uuid = `mock-tpl-new-${seq}`
    templates.value = [...templates.value, {
      id, uuid, company_id: COMPANY_ID, name,
      answer_type: payload.answer_type, calculate_type: payload.calculate_type,
      total_cycle: 0, is_active: 1,
    }]
    details.value = { ...details.value, [uuid]: payloadToDetail(uuid, payload) }

    let show = false
    if (payload.is_using_preset) {
      show = monthsBetween(lastPresetCreatedAt.value, new Date()) >= 3
      lastPresetCreatedAt.value = new Date()
    }
    return { show_template_preset_feedback: show }
  }

  // MOCK of PUT /review-templates/update-status/{uuid}
  function updateStatusTemplate(uuid: string, val: boolean) {
    templates.value = templates.value.map(t => (t.uuid === uuid ? { ...t, is_active: val ? 1 : 0 } : t))
  }

  // MOCK of DELETE /review-templates/{uuid}
  function deleteTemplate(uuid: string) {
    templates.value = templates.value.filter(t => t.uuid !== uuid)
    const next = { ...details.value }
    delete next[uuid]
    details.value = next
  }

  // MOCK of GET {newEndPoint}/review-templates/presets
  const presets = computed(() => PRESETS)

  // MOCK of GET {newEndPoint}/review-templates/{uuid}/cycles?page&limit_per_page
  function getTemplateCycles(uuid: string, page: number, limit: number) {
    const t = templateByUuid(uuid)
    const all = t ? buildSeedCycles(t) : []
    return { data: all.slice((page - 1) * limit, page * limit), last_page: Math.max(1, Math.ceil(all.length / limit)) }
  }

  // "Use this name as default for new templates": new templates start with this name.
  function saveLegendName(name: string, asDefault: boolean) {
    const n = name.trim()
    if (!n) return
    if (n.toLowerCase() !== 'legends' && !savedLegendNames.value.some(x => x.toLowerCase() === n.toLowerCase())) savedLegendNames.value = [...savedLegendNames.value, n]
    if (asDefault) nextLegendName.value = n
  }
  function removeLegendName(name: string) {
    savedLegendNames.value = savedLegendNames.value.filter(x => x !== name)
    if (nextLegendName.value === name) nextLegendName.value = ''
  }

  function reset() {
    templates.value = clone(TEMPLATES_SEED)
    details.value = Object.fromEntries(TEMPLATES_SEED.map(t => [t.uuid, buildSeedDetail(t)]))
  }

  return { list, templateByUuid, getTemplate, createUpdateTemplate, updateStatusTemplate, deleteTemplate, presets, getTemplateCycles, savedLegendNames, nextLegendName, saveLegendName, removeLegendName, reset }
}
