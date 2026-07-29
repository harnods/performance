// ─────────────────────────────────────────────────────────────────────────────
// Shared reviewer data layer — used by the review-cycle detail page, the
// timeframe-details page, and the ReviewerModals component so reviewer rosters,
// weights and counts are identical everywhere (and persisted, not dummy).
//
// Reviewers are generated per member, deterministically from their id, so each
// employee gets a different-but-stable mix. Custom weights + roster overrides
// come from useReviewerWeightsStore and are merged on top.
// ─────────────────────────────────────────────────────────────────────────────
import { EMPLOYEES } from '~/utils/employees'

export interface ReviewerRow { name: string, code: string, sub: string, photo?: string, weight: number }
export interface ResolvedReviewer extends ReviewerRow { locked: boolean }
export interface ResolvedGroup { name: string, weight: number, useCustom: boolean, reviewers: ResolvedReviewer[] }
export type ReviewMember = { name: string, id: string, jobTitle?: string, jobPosition?: string, organization?: string }

export function memberSub(m: ReviewMember | null) {
  return m ? [m.id, m.jobTitle ?? m.jobPosition, m.organization].filter(Boolean).join(' · ') : ''
}
// Equal distribution, whole numbers; the last reviewer absorbs the remainder.
export function splitWeights(n: number) {
  if (n <= 0) return [] as number[]
  const base = Math.floor(100 / n)
  const w = Array(n).fill(base)
  w[n - 1] = 100 - base * (n - 1)
  return w
}

const MANAGER_POOL = ['rio', 'rizal', 'evelyn', 'ali', 'bayu', 'dewi', 'andi', 'cinta', 'indah']
function hashId(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function makeRng(seed: number) {
  let s = (seed || 1) >>> 0
  return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296 }
}
function pickN(pool: string[], n: number, rand: () => number) {
  const arr = [...pool]; const out: string[] = []
  n = Math.min(n, arr.length)
  for (let i = 0; i < n; i++) out.push(arr.splice(Math.floor(rand() * arr.length), 1)[0])
  return out
}
function rowFromEmployeeId(id: string, weight: number): ReviewerRow {
  const e = EMPLOYEES.find(x => x.id === id)
  return { name: e?.name ?? id, code: e?.code ?? '', sub: e ? [e.code, e.title, e.department].filter(Boolean).join(' · ') : '', photo: e?.photo, weight }
}
function rowFromCode(code: string): ReviewerRow {
  const e = EMPLOYEES.find(x => x.code === code)
  return { name: e?.name ?? code, code, sub: e ? [e.code, e.title, e.department].filter(Boolean).join(' · ') : '', photo: e?.photo, weight: 0 }
}

// Generation cache — deterministic per (member id + methods signature).
const _genCache = new Map<string, { name: string, weight: number, reviewers: ReviewerRow[] }[]>()

export interface UseReviewersOptions {
  methods: string[]
  methodWeights: Record<string, number>
  cycleKey: () => string
}

export function useReviewers(opts: UseReviewersOptions) {
  const { configFor, saveConfigs } = useReviewerWeightsStore()
  const methodsSig = opts.methods.join('|')

  function generate(member: ReviewMember) {
    const key = `${methodsSig}::${member?.id ?? member?.name ?? ''}`
    const cached = _genCache.get(key)
    if (cached) return cached
    const rand = makeRng(hashId(String(member?.id ?? member?.name ?? '')))
    const allIds = EMPLOYEES.map(e => e.id).filter(id => id !== member.id)
    const groups = opts.methods.map((method) => {
      if (method === 'Self review') {
        return { name: method, weight: opts.methodWeights[method] ?? 0, reviewers: [{ name: member.name, code: member.id, sub: memberSub(member), weight: 100 }] }
      }
      let pool: string[]; let count: number
      if (method === 'Manager review') { pool = MANAGER_POOL.filter(id => id !== member.id); count = 1 + Math.floor(rand() * 2) }
      else if (method === '360-degree review') { pool = allIds; count = 2 + Math.floor(rand() * 7) }
      else if (method === 'Team review') { pool = allIds; count = 2 + Math.floor(rand() * 3) }
      else { pool = allIds; count = 1 + Math.floor(rand() * 3) }
      const ids = pickN(pool, count, rand)
      const w = splitWeights(ids.length)
      return { name: method, weight: opts.methodWeights[method] ?? 0, reviewers: ids.map((id, i) => rowFromEmployeeId(id, w[i])) }
    })
    _genCache.set(key, groups)
    return groups
  }

  function memberKey(member: ReviewMember) {
    return `${opts.cycleKey()}::${member.id}`
  }

  // Generated roster + saved config (roster override + custom weights) applied.
  function resolvedGroupsFor(member: ReviewMember): ResolvedGroup[] {
    const key = memberKey(member)
    return generate(member).map((g) => {
      const cfg = configFor(key, g.name)
      const useCustom = !!cfg?.useCustom
      const base = (g.name !== 'Self review' && cfg?.roster)
        ? cfg.roster.map(code => rowFromCode(code))
        : g.reviewers.map(r => ({ ...r }))
      const eq = splitWeights(base.length)
      return {
        name: g.name,
        weight: g.weight,
        useCustom,
        reviewers: base.map((r, idx) => ({ ...r, weight: useCustom ? (cfg!.weights[r.code] ?? eq[idx]) : eq[idx], locked: useCustom && idx === 0 })),
      }
    })
  }

  function groupFor(member: ReviewMember, method: string): ResolvedGroup | undefined {
    return resolvedGroupsFor(member).find(g => g.name === method)
  }
  // Reviewer count — for a single method when given, else across all methods.
  function reviewerCountFor(member: ReviewMember, method?: string) {
    const groups = resolvedGroupsFor(member)
    return method
      ? (groups.find(g => g.name === method)?.reviewers.length ?? 0)
      : groups.reduce((n, g) => n + g.reviewers.length, 0)
  }

  return { resolvedGroupsFor, groupFor, reviewerCountFor, memberKey, configFor, saveConfigs }
}
