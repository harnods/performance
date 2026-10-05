// ━━━ MOCK DATA — hardcoded, NOT connected to any API ━━━━━━━━━━━━━━━━━━━━━━━━━
// Static stand-in for the competency item endpoints used by talenta-review
// src/views/talent-management/competencies/setup/competency-item/ (FE commit
// 010875214aba). Shapes VERIFIED against talenta-noncore-api @ cde912f:
//   routes/custom-routes/kpi.route.php (prefix `competencies`, `rating-scales`)
//   Http/Controllers/V1/Kpi/CompetencyController.php
//   Services/Kpi/CompetencyService.php
//   Models/V1/Kpi/Competencies/CompetencyRepository.php
//   Http/Controllers/V1/Kpi/ResponseController.php (envelope)
//
// Envelope: success → { message: 'success', status, data, meta }
//           error   → { message: 'error', status, errors: <string> }
//
//   GET  /competencies?search&sort_field_data&limit&page
//        → data: CompetencyItem[] (default order: id DESC = newest first),
//          meta: PaginationMeta (Laravel paginator minus `data`)
//   GET  /competencies/:uuid          → data: CompetencyItemDetail
//   POST /competencies · PUT /competencies/:uuid
//        → data: the item + rating_scales; 400 'Competency name already used.'
//          (FE then toasts its fallback 'Failed to post competency item')
//   POST /competencies/available-delete-item { uuids } → data: VerifyBulkDelete
//   POST /competencies/delete { uuids } → message 'success'
//          (422 if applied in a group or succession pool)
//   GET  /rating-scales               → data: DefaultRatingScale[] (company's,
//          else the system defaults seeded with company_id 0)
//
// applied = count(distinct competency GROUP names). Succession plans are NOT
// counted; they only populate succession_pool_jobs and block deletion.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** `rating` is a varchar column in the API ("1".."5"). */
export interface RatingScale { rating: string; description: string }
export interface DefaultRatingScale extends RatingScale { id: number; uuid: string }

/** One row of GET /competencies. */
export interface CompetencyItem {
  id: number
  uuid: string
  name: string
  description: string | null
  /** Distinct competency group names using it (NOT succession plans). FE renders `applied || '-'`. */
  applied: number
  /** Group names using it, shown in "Unable to delete". */
  competency_management_groups: string[]
  /** Job names of succession pools using it, shown in "Unable to delete". */
  succession_pool_jobs: string[]
  /** IDP names (plans) with an action plan linked to it. Filled client-side from the IDP store. */
  idp_plans?: string[]
  /** applied === 0 */
  deletion: boolean
  /** succession_pool_jobs is empty */
  succession_pool_deletion: boolean
  created_at: string
}

/** GET /competencies/:uuid (description is '' when null: html_entity_decode). */
export interface CompetencyItemDetail { name: string; description: string; rating_scales: RatingScale[] }

/** Mock-store record: the list row plus its rating scales (the detail endpoint). */
export interface CompetencyItemRecord extends CompetencyItem { rating_scales: RatingScale[] }

export interface PaginationMeta {
  current_page: number
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

interface VerifyItem { id: number; uuid: string; name: string; competency_management_groups: string[]; succession_pools: string[]; idps: string[] }
export interface VerifyBulkDelete {
  eligible: VerifyItem[]
  not_eligible: VerifyItem[]
  has_group: boolean
  has_succession: boolean
  has_idp: boolean
}

// GET /rating-scales — system defaults (database/seeds/CompetencyManagementDefaultRatingScalesSeeder.php).
export const DEFAULT_RATING_SCALES: DefaultRatingScale[] = [
  { id: 1, uuid: 'mock-drs-1', rating: '1', description: 'Novice' },
  { id: 2, uuid: 'mock-drs-2', rating: '2', description: 'Basic' },
  { id: 3, uuid: 'mock-drs-3', rating: '3', description: 'Intermediate' },
  { id: 4, uuid: 'mock-drs-4', rating: '4', description: 'Advanced' },
  { id: 5, uuid: 'mock-drs-5', rating: '5', description: 'Proficient' },
]

const ratings = (overrides: Partial<Record<string, string>> = {}): RatingScale[] =>
  DEFAULT_RATING_SCALES.map(r => ({ rating: r.rating, description: overrides[r.rating] ?? r.description }))

// [name, description, groups, succession jobs]
type Seed = [string, string | null, string[], string[]]
const SEED: Seed[] = [
  ['Accuracy & Detail', 'Catching errors and keeping work precise under volume', ['Accounting'], []],
  ['Analytical Thinking', 'Breaking down problems and drawing sound conclusions from data', ['Accounting'], ['Head of Accounting']],
  ['Attention to Detail', 'Getting the small things right consistently', ['Front of House'], []],
  ['Brand Strategy', 'Shaping how the brand is positioned and perceived', ['Marketing'], []],
  ['Business Acumen', 'Understanding how decisions affect the business as a whole', ['Management'], []],
  ['Communication', 'Sharing information clearly, verbally and in writing', ['Accounting', 'HR', 'Management'], ['Head of Accounting', 'Restaurant Manager']],
  ['Compliance', 'Following regulatory and internal policy requirements', ['Accounting'], []],
  ['Conflict Resolution', 'Resolving disagreements calmly and fairly', [], []],
  ['Content & Communication', 'Creating clear, on-brand messaging for an audience', ['Marketing'], []],
  ['Creativity', null, [], []],
  ['Culinary Skills', 'Technique and craft in food preparation', ['Kitchen'], ['Head Chef']],
  ['Customer Relationship', 'Building and sustaining long-term client trust', ['Sales'], []],
  ['Customer Service', 'Delivering a helpful, positive experience to customers', ['Front of House'], []],
  ['Data Analytics', 'Turning marketing data into actionable insight', ['Marketing'], []],
  ['Decision Making', 'Making sound calls under uncertainty or time pressure', ['Management'], []],
  ['Digital Marketing', 'Planning and running campaigns across digital channels', ['Marketing'], []],
  ['Employee Relations', 'Handling workplace issues fairly and maintaining trust', ['HR'], []],
  ['Financial Reporting', 'Preparing and presenting accurate financial statements', ['Accounting'], ['Head of Accounting']],
  ['Food Safety', 'Following hygiene and safety standards in the kitchen', ['Kitchen'], []],
  ['HR Compliance', 'Applying labor law and HR policy correctly', ['HR'], []],
  ['Kitchen Management', 'Running kitchen operations efficiently under pressure', ['Kitchen'], ['Head Chef']],
  ['Leadership', 'Guiding, motivating, and developing a team toward shared goals', ['Management'], ['Restaurant Manager', 'Head Chef', 'Head of Accounting']],
  ['Negotiation', 'Reaching agreements that work for both sides', ['Sales'], []],
  ['Product Knowledge', 'Understanding the menu or offering well enough to advise customers', ['Front of House'], []],
  ['Public Speaking', null, [], []],
  ['Recruitment', 'Sourcing, assessing, and hiring the right candidates', ['HR'], []],
  ['Sales Strategy', 'Planning how to win and grow accounts', ['Sales'], []],
  ['Teamwork', 'Working effectively and reliably with others', ['Kitchen'], []],
  ['Time Management', 'Prioritising work and meeting deadlines without last-minute rushes', [], []],
  ['Vision & Strategy', 'Setting direction and long-term priorities for the business', ['Management'], []],
  // Edge case: max-length (60) name + a long, unbroken description to test wrapping.
  ['Cross-functional Stakeholder Management in Multi-site Outlets', 'Coordinating priorities across kitchen, front of house, finance and HR when several outlets share the same people, budget and supplier contracts — including escalating conflicts early, keeping everyone informed of trade-offs, and documenting decisions so the next shift or outlet manager can pick them up without re-asking.', [], []],
]

// Seed order = creation order (id 1 is oldest); the list shows id DESC.
export const COMPETENCY_ITEMS_SEED: CompetencyItemRecord[] = SEED.map(([name, description, groups, jobs], i) => {
  const groupNames = [...new Set(groups.map(g => `${g} competency group`))]
  return {
    id: i + 1,
    uuid: `mock-ci-${String(i + 1).padStart(3, '0')}`,
    name,
    description,
    applied: groupNames.length,
    competency_management_groups: groupNames,
    succession_pool_jobs: jobs,
    deletion: groupNames.length === 0,
    succession_pool_deletion: jobs.length === 0,
    created_at: new Date(Date.UTC(2025, 0, 6 + i * 3, 3)).toISOString(),
    rating_scales: i % 4 === 0 ? ratings({ 3: `Applies ${name.toLowerCase()} consistently without reminders.` }) : ratings(),
  }
})

// POST /competencies/available-delete-item (CompetencyService::availableDeleteItem):
// an item used in any group OR succession pool is not eligible.
export function verifyBulkDelete(items: CompetencyItemRecord[]): VerifyBulkDelete {
  const toVerify = (i: CompetencyItemRecord): VerifyItem => ({
    id: i.id, uuid: i.uuid, name: i.name,
    competency_management_groups: i.competency_management_groups,
    succession_pools: i.succession_pool_jobs,
    idps: i.idp_plans ?? [],
  })
  const blocked = items.filter(i => i.competency_management_groups.length || i.idp_plans?.length)
  return {
    eligible: items.filter(i => !blocked.includes(i)).map(toVerify),
    not_eligible: blocked.map(toVerify),
    has_group: blocked.some(i => i.competency_management_groups.length > 0),
    has_succession: false, // succession plans no longer block deletion
    has_idp: blocked.some(i => (i.idp_plans?.length ?? 0) > 0),
  }
}
