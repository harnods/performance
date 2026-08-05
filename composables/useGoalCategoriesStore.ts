// ─────────────────────────────────────────────────────────────────────────────
// Goal categories mini-DB — persisted "mock data preseed" for the Goal
// categories settings page (replica of talenta-review's
// src/views/goals/categories/*). Seeded from utils/goalTaxonomy's
// GOAL_CATEGORIES so the categories here line up 1:1 with the categories the
// seeded goals (useGoalsStore) actually use — every category's "Linked goals"
// count is therefore real, derived by matching Goal.category to Category.name
// (see linkedGoalCount / linkedGoalsOf below), not invented.
//
// Categories are global (not scoped to a goal cycle). Persistence + reset
// follow the same SEED_VERSION guard pattern as useGoalCyclesStore /
// useGoalsStore.
// ─────────────────────────────────────────────────────────────────────────────

import { GOAL_CATEGORIES } from '~/utils/goalTaxonomy'
import { employeeById } from '~/utils/employees'

export type GoalCategoryStatus = 'active' | 'inactive'

export interface GoalCategorySubItem {
  id: string
  name: string
}

export interface GoalCategoryRecord {
  id: string
  name: string
  description: string
  subCategories: GoalCategorySubItem[]
  status: GoalCategoryStatus
  updatedAt?: string // ISO datetime — stamped on create/edit
  updatedBy?: string
}

// Short blurbs so the seeded rows read like real config, keyed by taxonomy value.
const CATEGORY_DESCRIPTION: Record<string, string> = {
  financial: 'Revenue, profitability, and cost-efficiency outcomes.',
  customer: 'Market position, satisfaction, and stakeholder outcomes.',
  'internal-process': 'Operational excellence and process improvement.',
  'learning-growth': 'People capability, culture, and development.',
}

function seed(): GoalCategoryRecord[] {
  return GOAL_CATEGORIES.map(c => ({
    id: c.value,
    name: c.label,
    description: CATEGORY_DESCRIPTION[c.value] ?? '',
    subCategories: c.subCategories.map((s, i) => ({ id: `${c.value}-sub-${i}`, name: s.label })),
    status: 'active' as GoalCategoryStatus,
    updatedAt: '2025-12-20T14:50:00',
    updatedBy: 'Rizal Candra',
  }))
}

// Module-scope singleton — shared reactive "mini DB" for this demo prototype.
const STORAGE_KEY = 'talenta-goal-categories-db'
const SEED_VERSION = 1
const categories = ref<GoalCategoryRecord[]>(seed())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, categories: categories.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.categories)) {
        categories.value = parsed.categories
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

let seq = 0
function nextId(): string {
  seq += 1
  return `cat-${Date.now()}-${seq}`
}

export interface GoalCategoryInput {
  name: string
  description: string
  subCategories: GoalCategorySubItem[]
}

export function useGoalCategoriesStore() {
  loadFromStorage()

  function addCategory(input: GoalCategoryInput): GoalCategoryRecord {
    const { currentUserId } = useCurrentUser()
    const created: GoalCategoryRecord = {
      id: nextId(),
      name: input.name,
      description: input.description,
      subCategories: input.subCategories.map(s => ({ id: s.id || `${nextId()}-s`, name: s.name })),
      status: 'active',
      updatedAt: new Date().toISOString(),
      updatedBy: employeeById(currentUserId.value)?.name,
    }
    categories.value = [...categories.value, created]
    persist()
    return created
  }

  function updateCategory(id: string, input: GoalCategoryInput) {
    const { currentUserId } = useCurrentUser()
    categories.value = categories.value.map(c => (c.id === id
      ? {
          ...c,
          name: input.name,
          description: input.description,
          subCategories: input.subCategories.map(s => ({ id: s.id || `${nextId()}-s`, name: s.name })),
          updatedAt: new Date().toISOString(),
          updatedBy: employeeById(currentUserId.value)?.name,
        }
      : c))
    persist()
  }

  function setStatus(id: string, status: GoalCategoryStatus) {
    const { currentUserId } = useCurrentUser()
    categories.value = categories.value.map(c => (c.id === id
      ? { ...c, status, updatedAt: new Date().toISOString(), updatedBy: employeeById(currentUserId.value)?.name }
      : c))
    persist()
  }

  function deleteCategory(id: string) {
    categories.value = categories.value.filter(c => c.id !== id)
    persist()
  }

  function resetToSeed() {
    categories.value = seed()
    persist()
  }

  function categoryById(id: string) {
    return categories.value.find(c => c.id === id)
  }

  // Linked goals are derived from the goals mini-DB — a category's linked
  // goals are every goal (across all cycles) whose `category` equals this
  // category's name. Sub-category usage is the same match on `subCategory`.
  const { goals } = useGoalsStore()

  function linkedGoalsOf(categoryName: string) {
    return goals.value.filter(g => g.category === categoryName)
  }
  function linkedGoalCount(categoryName: string): number {
    return linkedGoalsOf(categoryName).length
  }
  function subCategoryUsage(subName: string): number {
    return goals.value.filter(g => g.subCategory === subName).length
  }

  return {
    categories,
    addCategory,
    updateCategory,
    setStatus,
    deleteCategory,
    resetToSeed,
    categoryById,
    linkedGoalsOf,
    linkedGoalCount,
    subCategoryUsage,
  }
}
