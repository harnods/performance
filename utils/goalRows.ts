// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for turning the flat Goal[] mini-DB (useGoalsStore) into the
// rowspan-grouped shape every Goals table expects: consecutive rows sharing
// a Category (or Sub-category) collapse into one merged cell with
// `rowspan`, exactly like the hand-authored mock data before it.
// ─────────────────────────────────────────────────────────────────────────────
import { EMPLOYEES } from './employees'
import type { GoalCategory, GoalLevel, GoalStatus, GoalUnit } from '~/composables/useGoalsStore'

const CATEGORY_ORDER: GoalCategory[] = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth']

// The Search box on every Goals table matches a goal's own code, title, or
// owner name — case-insensitive substring, same as any basic table search.
export function matchesSearch(goal: { code: string, title: string, ownerId: string }, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const ownerName = ownerOf(goal.ownerId).name
  return goal.code.toLowerCase().includes(q) || goal.title.toLowerCase().includes(q) || ownerName.toLowerCase().includes(q)
}

// ownerId sorts first (by default) so category/sub-category rowspans (below)
// only merge rows belonging to the same owner. Without this, a multi-owner
// row set (e.g. a team with 2+ members, each with their own independent
// weight budget) could sort two *different* people's same-category goals
// next to each other and withRowSpans would visually merge them into one
// cell that's wrong for both of them.
//
// Company goals are the one exception: several department heads jointly
// share the company's single weight budget, so the same category *should*
// merge across owners there — pass `{ groupByOwner: false }` for that case.
export function sortByCategory<T extends { category: string, subCategory: string, ownerId?: string }>(
  rows: T[],
  { groupByOwner = true }: { groupByOwner?: boolean } = {},
): T[] {
  return [...rows].sort((a, b) => {
    if (groupByOwner) {
      const owner = (a.ownerId ?? '').localeCompare(b.ownerId ?? '')
      if (owner !== 0) return owner
    }
    const ca = CATEGORY_ORDER.indexOf(a.category as GoalCategory)
    const cb = CATEGORY_ORDER.indexOf(b.category as GoalCategory)
    if (ca !== cb) return ca - cb
    return a.subCategory.localeCompare(b.subCategory)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Column-sort while PRESERVING the rowspan/accordion grouping. A Goals table
// merges cells by category → sub-category (optionally nested under owner), and
// withRowSpans only merges *consecutive* rows sharing those keys, so any
// re-order fed into it must keep same-group rows contiguous.
//
// `groupLevels` lists the merge/grouping columns outer→inner (e.g.
// ['owner','category','subCategory']). Every grouping level stays in its
// canonical order EXCEPT the one being sorted — so the runs withRowSpans merges
// over always remain contiguous. A sortKey that is NOT a grouping level
// (Goal / Progress / Status, or Owner on a table that doesn't group by owner)
// becomes the final tiebreaker, reordering only rows *inside* the innermost
// group. sortKey '' returns the array unchanged (caller passes canonical order,
// i.e. sortByCategory's output), so default behaviour is identical to before.
// Relies on Array.sort being stable so equal-key rows keep their canonical order.
export function sortGoalRows<T extends { category: string, subCategory: string, ownerId?: string }>(
  rows: T[],
  opts: {
    sortKey: string
    sortDir: 'asc' | 'desc'
    sortType?: 'text' | 'number'
    sortValue: (row: T) => string | number
    groupLevels?: Array<'owner' | 'category' | 'subCategory'>
    ownerValue?: (row: T) => string
  },
): T[] {
  const { sortKey, sortDir, sortType = 'text', sortValue } = opts
  if (!sortKey) return rows
  const groupLevels = opts.groupLevels ?? []
  const ownerValue = opts.ownerValue ?? ((r: T) => r.ownerId ?? '')
  const dir = sortDir === 'desc' ? -1 : 1
  const cmp = (a: string | number, b: string | number, type: 'text' | 'number') =>
    type === 'number'
      ? Number(a) - Number(b)
      : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  const canonical = (level: 'owner' | 'category' | 'subCategory', r: T): string | number =>
    level === 'category'
      ? CATEGORY_ORDER.indexOf(r.category as GoalCategory)
      : level === 'subCategory' ? r.subCategory : ownerValue(r)
  const targetIsGroup = (groupLevels as string[]).includes(sortKey)
  return [...rows].sort((a, b) => {
    for (const level of groupLevels) {
      if (level === sortKey) {
        const r = cmp(sortValue(a), sortValue(b), sortType) * dir
        if (r) return r
      }
      else {
        const va = canonical(level, a)
        const vb = canonical(level, b)
        const r = typeof va === 'number' ? va - (vb as number) : cmp(va, vb, 'text')
        if (r) return r
      }
    }
    if (!targetIsGroup) {
      const r = cmp(sortValue(a), sortValue(b), sortType) * dir
      if (r) return r
    }
    return 0
  })
}

export interface RowSpanFields {
  showCategory: boolean
  categoryRowspan: number
  categoryWeight: number
  showSubCategory: boolean
  subCategoryRowspan: number
}

// Rows must already be sorted with the same `groupByOwner` value (via
// sortByCategory) so same-category/sub-category rows are contiguous — the
// first row of a run gets the rowspan, the rest are marked hidden for that
// column. When groupByOwner is true (default), the ownerId check matters
// even after sorting by owner: one owner's *last* category can equal the
// next owner's *first* category at the boundary between them, and without
// this check that pair would wrongly look like one contiguous run.
//
// categoryWeight is computed from whichever rows actually get merged into
// this rowspan group — it's the SUM of their own `weight`, not a stored
// field. A category's weight is its share of the owner's 100% budget, so
// all of an owner's categories must sum back to 100% — e.g. Company's
// Financial category (5 goals at 10/5/5/5/5%) is 30%, not their 6% average.
export function withRowSpans<T extends { category: string, subCategory: string, ownerId?: string, weight: number }>(
  rows: T[],
  { groupByOwner = true }: { groupByOwner?: boolean } = {},
): (T & RowSpanFields)[] {
  const sameOwner = (a: T, b: T) => !groupByOwner || (a.ownerId ?? '') === (b.ownerId ?? '')
  return rows.map((row, i) => {
    const showCategory = i === 0 || !sameOwner(rows[i - 1], row) || rows[i - 1].category !== row.category
    const showSubCategory = showCategory || rows[i - 1].subCategory !== row.subCategory
    const categoryRowspan = showCategory ? countWhile(rows, i, r => sameOwner(r, row) && r.category === row.category) : 0
    const categoryWeight = showCategory ? sumWeightWhile(rows, i, r => sameOwner(r, row) && r.category === row.category) : 0
    const subCategoryRowspan = showSubCategory ? countWhile(rows, i, r => sameOwner(r, row) && r.category === row.category && r.subCategory === row.subCategory) : 0
    return { ...row, showCategory, categoryRowspan, categoryWeight, showSubCategory, subCategoryRowspan }
  })
}

export function countWhile<T>(rows: T[], startIdx: number, pred: (r: T) => boolean): number {
  let count = 0
  for (let i = startIdx; i < rows.length && pred(rows[i]); i++) count++
  return count
}

function sumWeightWhile<T extends { weight: number }>(rows: T[], startIdx: number, pred: (r: T) => boolean): number {
  let sum = 0
  for (let i = startIdx; i < rows.length && pred(rows[i]); i++) sum += rows[i].weight
  // Rounded to 1 decimal as a safety net against float drift (e.g. 0.1 + 0.2) —
  // every real weight in the seed data is already a whole percentage.
  return Math.round(sum * 10) / 10
}

export interface GoalOwner {
  name: string
  id: string
  title: string
  department: string
  photo?: string
}

export function ownerOf(ownerId: string): GoalOwner {
  const e = EMPLOYEES.find(e => e.id === ownerId)
  if (!e) throw new Error(`useGoalsStore: unknown employee id "${ownerId}"`)
  return { name: e.name, id: e.code, title: e.title, department: e.department, photo: e.photo }
}

export interface AlignedGoal {
  id: string
  code: string
  title: string
  weight: number
  level: GoalLevel
  ownerId: string
  category: string
  subCategory: string
  status: GoalStatus
  unit?: GoalUnit
  value?: number
  pill?: number
  min?: number
  max?: number
}

// "Aligned goals" are the exact children of this goal — every goal whose
// `alignedToId` points back at it. This is real source data (the "Aligned
// To" column, cross-validated against the source's own "Cascade Tree"
// reference sheet), a precise reverse lookup rather than a guess. Most
// goals have no children (only 47 of 88 goals in the source have a parent
// link at all).
export function alignedGoalsOf<T extends {
  level: GoalLevel
  category: string
  subCategory: string
  id: string
  code: string
  title: string
  weight: number
  ownerId: string
  alignedToId?: string
  status: GoalStatus
  unit?: GoalUnit
  value?: number
  pill?: number
  min?: number
  max?: number
}>(
  goal: T,
  allGoals: T[],
): AlignedGoal[] {
  return allGoals
    .filter(g => g.alignedToId === goal.id)
    .map(g => ({
      id: g.id, code: g.code, title: g.title, weight: g.weight, level: g.level, ownerId: g.ownerId,
      category: g.category, subCategory: g.subCategory,
      status: g.status, unit: g.unit, value: g.value, pill: g.pill, min: g.min, max: g.max,
    }))
}

export interface DisplayGoalRow {
  kind: 'main' | 'aligned'
  id: string
  showCategory: boolean
  categoryRowspan: number
  category: string
  categoryWeight: number
  showSubCategory: boolean
  subCategoryRowspan: number
  subCategory: string
  code: string
  title: string
  weight: number
  alignedGoals: AlignedGoal[]
  owner: GoalOwner
  status: GoalStatus
  unit?: GoalUnit
  value?: number
  pill?: number
  min?: number
  max?: number
}

// Flattens rowspan-grouped goal rows into real display rows: every expanded
// row's aligned goals become their own rows right below it (not stacked
// inside one cell), so Goal/Goal type/Progress/Status each get their own
// row height — exactly like a real child row would. Category/Sub-category
// keep merging across the inserted rows too, so their rowspan is extended
// here to cover however many child rows fall within each run.
// categoryWeight is untouched — it's still only the sum of the REAL goals'
// own weight, never the aligned children's, since those belong to a
// different level's 100% budget entirely.
export function expandAlignedRows<T extends RowSpanFields & { id: string, category: string, subCategory: string, code: string, title: string, weight: number, alignedGoals: AlignedGoal[], owner: GoalOwner, status: GoalStatus, unit?: GoalUnit, value?: number, pill?: number, min?: number, max?: number }>(
  rows: T[],
  expanded: Record<string, boolean>,
): DisplayGoalRow[] {
  const out: DisplayGoalRow[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    let extraCategory = 0
    if (row.showCategory) {
      for (let j = i; j < i + row.categoryRowspan; j++) {
        if (expanded[rows[j].id]) extraCategory += rows[j].alignedGoals.length
      }
    }
    let extraSubCategory = 0
    if (row.showSubCategory) {
      for (let j = i; j < i + row.subCategoryRowspan; j++) {
        if (expanded[rows[j].id]) extraSubCategory += rows[j].alignedGoals.length
      }
    }
    out.push({
      kind: 'main',
      id: row.id,
      showCategory: row.showCategory,
      categoryRowspan: row.categoryRowspan + extraCategory,
      category: row.category,
      categoryWeight: row.categoryWeight,
      showSubCategory: row.showSubCategory,
      subCategoryRowspan: row.subCategoryRowspan + extraSubCategory,
      subCategory: row.subCategory,
      code: row.code,
      title: row.title,
      weight: row.weight,
      alignedGoals: row.alignedGoals,
      owner: row.owner,
      status: row.status,
      unit: row.unit,
      value: row.value,
      pill: row.pill,
      min: row.min,
      max: row.max,
    })
    if (expanded[row.id]) {
      for (const child of row.alignedGoals) {
        out.push({
          kind: 'aligned',
          id: `${row.id}::${child.id}`,
          showCategory: false,
          categoryRowspan: 0,
          category: child.category,
          categoryWeight: 0,
          showSubCategory: false,
          subCategoryRowspan: 0,
          subCategory: child.subCategory,
          code: child.code,
          title: child.title,
          weight: child.weight,
          alignedGoals: [],
          owner: ownerOf(child.ownerId),
          status: child.status,
          unit: child.unit,
          value: child.value,
          pill: child.pill,
          min: child.min,
          max: child.max,
        })
      }
    }
  }
  return out
}
