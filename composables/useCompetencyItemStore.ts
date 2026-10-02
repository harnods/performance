// ━━━ MOCK STORE — in-memory, NOT connected to any API ━━━━━━━━━━━━━━━━━━━━━━━━━
// Replaces talenta-review's Vuex `successionPlan/*` competency actions
// (getCompetencyList, getCompetencyDetail, createCompetency, editCompetency,
// deleteCompetency, verifyBulkDeleteCompetency, getDefaultRatings) for the
// competency item prototype. Module-scope so the index, modal and upload pages
// share one list. Resets on reload.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import {
  COMPETENCY_ITEMS_SEED, DEFAULT_RATING_SCALES, verifyBulkDelete,
  type CompetencyItemRecord, type RatingScale,
} from '~/utils/competencyItem'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

const items = ref<CompetencyItemRecord[]>(clone(COMPETENCY_ITEMS_SEED))

// Dev scenario (docs/patterns/dev-scenario-control.md): 'default' = real seed,
// 'empty' = no items yet. In-memory only.
export type CompetencyItemScenario = 'default' | 'empty'
const scenario = ref<CompetencyItemScenario>('default')

let seq = 0

export function useCompetencyItemStore() {
  // API default order: id DESC (newest first) — CompetencyRepository.
  const list = computed(() => (scenario.value === 'empty' ? [] : [...items.value].sort((a, b) => b.id - a.id)))
  const itemByUuid = (uuid: string) => items.value.find(i => i.uuid === uuid)
  const defaultRatings = (): RatingScale[] => DEFAULT_RATING_SCALES.map(r => ({ rating: r.rating, description: r.description }))
  // API 400 'Competency name already used.' (getCompetencyByNameAndCompany).
  const isNameTaken = (name: string, exceptUuid = '') =>
    items.value.some(i => i.uuid !== exceptUuid && i.name.trim().toLowerCase() === name.trim().toLowerCase())

  function createItem(form: { name: string, description: string, rating_scales: RatingScale[] }) {
    if (scenario.value === 'empty') { items.value = []; scenario.value = 'default' }
    seq += 1
    const item: CompetencyItemRecord = {
      id: Math.max(0, ...items.value.map(i => i.id)) + 1,
      uuid: `mock-ci-new-${seq}`,
      name: form.name.trim(),
      description: form.description.trim() || null,
      applied: 0,
      competency_management_groups: [],
      succession_pool_jobs: [],
      deletion: true,
      succession_pool_deletion: true,
      created_at: new Date().toISOString(),
      rating_scales: clone(form.rating_scales),
    }
    items.value = [item, ...items.value]
    return item
  }

  function editItem(uuid: string, form: { name: string, description: string, rating_scales: RatingScale[] }) {
    items.value = items.value.map(i => (i.uuid === uuid
      ? { ...i, name: form.name.trim(), description: form.description.trim() || null, rating_scales: clone(form.rating_scales) }
      : i))
  }

  function deleteItems(uuids: string[]) {
    items.value = items.value.filter(i => !uuids.includes(i.uuid))
  }

  function verifyDelete(uuids: string[]) {
    return verifyBulkDelete(items.value.filter(i => uuids.includes(i.uuid)))
  }

  function resetScenario() {
    scenario.value = 'default'
    items.value = clone(COMPETENCY_ITEMS_SEED)
  }

  return { list, itemByUuid, defaultRatings, isNameTaken, createItem, editItem, deleteItems, verifyDelete, scenario, resetScenario }
}
