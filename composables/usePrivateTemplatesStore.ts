// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK — private (cycle-scoped) review templates. Hardcoded, not a live API.
//
// A review cycle keeps its own copy of the template it was created with
// (`private_templates`), one per review method. talenta-review reads/writes it
// from ModalViewEdit.vue via:
//   POST {endPoint}/private-templates/detail               { cycle_uuid, review_method }
//   POST {endPoint}/private-templates/edit-private-template { cycle_uuid, ...data, ...template }
// The response shape below is the one ModalViewEdit.vue reads (`contents.template`,
// `categories`, `ratings`, `legends`, `is_legend`, `is_rating`,
// `use_9box_auto_generate`, `is_custom_points_enabled`) — talenta-noncore-api
// was not available locally, so field names come from the FE consumer only.
//
// Story 7 (PRD "Custom Term for Final Score Category", PR-9665) additions, not in
// production yet: `template.legend_name` on the private template and
// `series_cycle_count` (how many cycles share this private_templates row — the
// PRD leaves the exact "N" mechanism to engineering).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import type { TemplateCategory, TemplateDetailTemplate, TemplateLegend, TemplateRating } from '~/utils/reviewTemplate'
import { LEGEND_NAME_DEFAULT } from '~/utils/reviewTemplate'

export interface PrivateTemplateDetail {
  template: TemplateDetailTemplate
  categories: TemplateCategory[]
  ratings: TemplateRating[]
  legends: TemplateLegend[]
  is_legend: 0 | 1
  is_rating: 0 | 1
  use_9box_auto_generate: boolean
  is_custom_points_enabled: boolean
  series_cycle_count: number
}

// Every review method of the demo cycle is seeded from this shared template.
const SOURCE_TEMPLATE_UUID = 'mock-tpl-perf-rating'
const PRIVATE_TEMPLATE_NAME = 'Talenta template - Probation Evaluation'
// Recurring series in the demo: this cycle plus 3 earlier ones (2 already completed).
const SERIES_CYCLE_COUNT = 4

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const store = ref<Record<string, PrivateTemplateDetail>>({})
const key = (cycleUuid: string, reviewMethod: string) => `${cycleUuid}|${reviewMethod}`

export function usePrivateTemplatesStore() {
  const { getTemplate } = useReviewTemplateStore()

  function seed(): PrivateTemplateDetail {
    const d = getTemplate(SOURCE_TEMPLATE_UUID)
    return {
      template: { ...d.template, name: PRIVATE_TEMPLATE_NAME, legend_name: d.template.legend_name || LEGEND_NAME_DEFAULT },
      categories: d.categories,
      ratings: d.ratings,
      legends: d.legends,
      is_legend: d.legends.length ? 1 : 0,
      is_rating: d.template.answer_type === 'rating' ? 1 : 0,
      use_9box_auto_generate: false,
      is_custom_points_enabled: d.template.is_custom_points_enabled,
      series_cycle_count: SERIES_CYCLE_COUNT,
    }
  }

  // MOCK of POST /private-templates/detail
  function getPrivateTemplate(cycleUuid: string, reviewMethod: string): PrivateTemplateDetail {
    const k = key(cycleUuid, reviewMethod)
    if (!store.value[k]) store.value[k] = seed()
    return clone(store.value[k])
  }

  // MOCK of POST /private-templates/edit-private-template — Story 7 extends it to persist legend_name.
  function editPrivateTemplate(cycleUuid: string, reviewMethod: string, data: PrivateTemplateDetail) {
    store.value[key(cycleUuid, reviewMethod)] = clone(data)
  }

  // Read-only snapshot for the cycle page's "Legend label" row (doesn't seed the store).
  function getLegendInfo(cycleUuid: string, reviewMethod: string) {
    const d = store.value[key(cycleUuid, reviewMethod)] ?? seed()
    return { legend_name: d.template.legend_name || LEGEND_NAME_DEFAULT, is_legend: d.is_legend, series_cycle_count: d.series_cycle_count }
  }

  // MOCK — Story 7 saves only the label (editPrivateTemplate extended with legend_name).
  // It applies to every cycle in the recurring series; the mock keeps one row per cycle.
  function updateLegendName(cycleUuid: string, reviewMethod: string, name: string) {
    const k = key(cycleUuid, reviewMethod)
    if (!store.value[k]) store.value[k] = seed()
    store.value[k].template.legend_name = name.trim()
  }

  return { getPrivateTemplate, editPrivateTemplate, getLegendInfo, updateLegendName }
}
