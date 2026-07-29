// ─────────────────────────────────────────────────────────────────────────────
// Reviewer-weight mini-DB — persists each member's per-method weight config
// (whether custom weight is on, and the custom weight for each reviewer) to
// localStorage, so Set reviewer weight is a real save, not a throwaway.
//
// Keyed by `${cycleKey}::${memberId}` → { [methodName]: { useCustom, weights } }
// where `weights` maps a reviewer's code → its weight %. When a method's
// useCustom is false the reviewers use an equal distribution (nothing stored
// for it needs to be trusted); the config is only meaningful when useCustom.
// ─────────────────────────────────────────────────────────────────────────────

export interface MethodWeightConfig {
  useCustom: boolean
  weights: Record<string, number>
  // Optional roster override (reviewer codes) set via "Manage reviewer" — when
  // present it replaces the generated reviewer list for that method.
  roster?: string[]
}
// memberKey → methodName → config
type ReviewerWeightsDb = Record<string, Record<string, MethodWeightConfig>>

const STORAGE_KEY = 'talenta-reviewer-weights-db'
const SEED_VERSION = 1

// Module-scope singleton, same pattern as the other stores.
const data = ref<ReviewerWeightsDb>({})

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: data.value }))
}
function loadFromStorage() {
  if (!import.meta.client) return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version === SEED_VERSION && parsed.data) data.value = parsed.data
  }
  catch { /* ignore corrupt cache */ }
}

let loaded = false

export function useReviewerWeightsStore() {
  if (!loaded && import.meta.client) { loadFromStorage(); loaded = true }

  function configFor(memberKey: string, method: string): MethodWeightConfig | undefined {
    return data.value[memberKey]?.[method]
  }
  // Persist the full per-method config set for one member (replaces prior).
  function saveConfigs(memberKey: string, configs: Record<string, MethodWeightConfig>) {
    data.value = { ...data.value, [memberKey]: configs }
    persist()
  }
  function resetToSeed() {
    data.value = {}
    persist()
  }

  return { configFor, saveConfigs, resetToSeed }
}
