// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for turning the flat Goal[] mini-DB (useGoalsStore) into the
// rowspan-grouped shape every Goals table expects: consecutive rows sharing
// a Category (or Sub-category) collapse into one merged cell with
// `rowspan`, exactly like the hand-authored mock data before it.
// ─────────────────────────────────────────────────────────────────────────────
import { EMPLOYEES } from './employees'
import type { GoalCategory } from '~/composables/useGoalsStore'

const CATEGORY_ORDER: GoalCategory[] = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth']

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
// this rowspan group — it's the average of their own `weight`, not a stored
// field. For a single-owner group that average is just that one goal's (or
// those goals') own weight; for a merged multi-owner group (company goals,
// or team goals with groupByOwner:false) it's the average across everyone
// merged into that cell, not their sum.
export function withRowSpans<T extends { category: string, subCategory: string, ownerId?: string, weight: number }>(
  rows: T[],
  { groupByOwner = true }: { groupByOwner?: boolean } = {},
): (T & RowSpanFields)[] {
  const sameOwner = (a: T, b: T) => !groupByOwner || (a.ownerId ?? '') === (b.ownerId ?? '')
  return rows.map((row, i) => {
    const showCategory = i === 0 || !sameOwner(rows[i - 1], row) || rows[i - 1].category !== row.category
    const showSubCategory = showCategory || rows[i - 1].subCategory !== row.subCategory
    const categoryRowspan = showCategory ? countWhile(rows, i, r => sameOwner(r, row) && r.category === row.category) : 0
    const categoryWeight = showCategory ? averageWeightWhile(rows, i, r => sameOwner(r, row) && r.category === row.category) : 0
    const subCategoryRowspan = showSubCategory ? countWhile(rows, i, r => sameOwner(r, row) && r.category === row.category && r.subCategory === row.subCategory) : 0
    return { ...row, showCategory, categoryRowspan, categoryWeight, showSubCategory, subCategoryRowspan }
  })
}

function countWhile<T>(rows: T[], startIdx: number, pred: (r: T) => boolean): number {
  let count = 0
  for (let i = startIdx; i < rows.length && pred(rows[i]); i++) count++
  return count
}

function averageWeightWhile<T extends { weight: number }>(rows: T[], startIdx: number, pred: (r: T) => boolean): number {
  let sum = 0
  let count = 0
  for (let i = startIdx; i < rows.length && pred(rows[i]); i++) {
    sum += rows[i].weight
    count++
  }
  // Rounded to 1 decimal — an unrounded average (e.g. 36.666666666666664)
  // would otherwise print every repeating digit straight into the UI.
  return count > 0 ? Math.round((sum / count) * 10) / 10 : 0
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
