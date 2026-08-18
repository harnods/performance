// ─────────────────────────────────────────────────────────────────────────────
// Goal request batch mini-DB — tracks bulk "New goals" saves that queued
// approval for a large group of owners (> BULK_ASYNC_THRESHOLD), purely so
// the requestor can be shown "your approved goals are being created" while
// each owner's goal-creation job is still resolving after approval.
//
// Submissions themselves stay one-per-owner (composables/useGoalApprovalsStore.ts,
// see its own header comment) — a batch here is just the thread tying a
// group of those submissions back to whoever requested them together in one
// Save, plus per-owner creation status once each submission is individually
// approved. Same module-scope singleton + localStorage pattern as
// useGoalsStore.ts / useInboxNotificationsStore.ts.
// ─────────────────────────────────────────────────────────────────────────────

// Past this many employees in one bulk "New goals" save, approving each
// owner's submission runs their goal creation as a background job instead of
// committing synchronously — mirrors BULK_OWNER_LIMIT's "past this many
// people the UX changes" shape (composables/useBulkOwnerGate.ts), but for
// approval-time creation rather than owner selection.
export const BULK_ASYNC_THRESHOLD = 10

export interface GoalRequestBatch {
  id: string
  cycleId: string
  requestedBy: string // Employee.id — whoever ran "New goals" and clicked Save
  ownerIds: string[]
  createdAt: string
  // Owners whose submission has been approved and whose goal-creation job is
  // currently running in the background.
  creatingOwnerIds: string[]
  // Owners whose goal-creation job has finished — their goals now exist.
  createdOwnerIds: string[]
}

const STORAGE_KEY = 'talenta-goal-request-batches'
const SEED_VERSION = 1
const batchesData = ref<GoalRequestBatch[]>([])
let loadedFromStorage = false
let seq = 0

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, batches: batchesData.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.batches)) {
        batchesData.value = parsed.batches
        return
      }
    }
    catch {
      // fall through to empty on corrupt storage
    }
  }
}

export function useGoalRequestBatchStore() {
  loadFromStorage()

  const batches = computed(() => batchesData.value)

  function createBatch(cycleId: string, requestedBy: string, ownerIds: string[]) {
    seq += 1
    const batch: GoalRequestBatch = {
      id: `goal-batch-${cycleId}-${Date.now()}-${seq}`,
      cycleId,
      requestedBy,
      ownerIds,
      createdAt: new Date().toISOString(),
      creatingOwnerIds: [],
      createdOwnerIds: [],
    }
    batchesData.value = [...batchesData.value, batch]
    persist()
    return batch
  }

  function markOwnerCreating(batchId: string, ownerId: string) {
    batchesData.value = batchesData.value.map(b => (b.id !== batchId
      ? b
      : { ...b, creatingOwnerIds: b.creatingOwnerIds.includes(ownerId) ? b.creatingOwnerIds : [...b.creatingOwnerIds, ownerId] }))
    persist()
  }

  function markOwnerCreated(batchId: string, ownerId: string) {
    batchesData.value = batchesData.value.map(b => (b.id !== batchId
      ? b
      : {
          ...b,
          creatingOwnerIds: b.creatingOwnerIds.filter(id => id !== ownerId),
          createdOwnerIds: b.createdOwnerIds.includes(ownerId) ? b.createdOwnerIds : [...b.createdOwnerIds, ownerId],
        }))
    persist()
  }

  // Used only by the dev "Scenario" control (goal-cycles/[id]/index.vue) to
  // cleanly undo a preview batch — real batches otherwise only ever grow.
  function removeBatch(batchId: string) {
    batchesData.value = batchesData.value.filter(b => b.id !== batchId)
    persist()
  }

  // The requestor's one active (still-creating) batch for a cycle — drives
  // the "your approved goals are being created" banner. Only true once at
  // least one owner's submission has actually been approved and kicked off
  // (creatingOwnerIds non-empty) — a batch sitting entirely in "awaiting
  // approval" shows nothing yet.
  function activeBatchFor(cycleId: string, requestedBy: string) {
    return batchesData.value.find(b => b.cycleId === cycleId && b.requestedBy === requestedBy && b.creatingOwnerIds.length > 0)
  }

  return { batches, createBatch, markOwnerCreating, markOwnerCreated, removeBatch, activeBatchFor }
}
