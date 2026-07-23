// Goal approval mini-DB — mirrors useGoalsStore.ts's own module-scope
// singleton + localStorage pattern. A Submission is one "batch" a direct
// report has sent up for review (every goal in a single "New goals"
// session, or one edit/delete request) — the manager approves or rejects
// the WHOLE batch at once, never goal-by-goal: a create-bundle's weights
// only add up to 100% together, so approving some goals and rejecting
// others would leave a broken partial total. A rejection sends the entire
// batch back with one reason; the owner corrects whichever goals need it
// and resubmits the whole thing for another look.

import type { Goal } from './useGoalsStore'

export type SubmissionItemType = 'create' | 'edit' | 'delete'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface SubmissionItem {
  id: string
  type: SubmissionItemType
  goalId?: string // set for edit/delete; unset for create until approved
  ownerId: string
  cycleId: string
  before?: Goal // snapshot of prior state — edit/delete only
  after?: Omit<Goal, 'cycleId'> // proposed state — create/edit only (unset for delete)
}

export interface Submission {
  id: string
  cycleId: string
  ownerId: string // the direct report this batch was submitted on behalf of
  submittedAt: string // ISO datetime
  status: SubmissionStatus
  rejectReason?: string
  wasEdited?: boolean // true once corrected & resubmitted after a rejection
  items: SubmissionItem[]
}

const CYCLE_ID = 'seed-26-h1'

function seed(): Submission[] {
  return [
    // Ali (Sales Director) proposing 3 brand-new individual goals in one
    // bundle — a brand-new hire with no existing goals yet, so this batch
    // sums to exactly 100% by itself, matching the real "New goals" page's
    // own rule (Save is blocked until the total hits 100%; there's no such
    // thing as submitting a partial one). Weights only make sense as one
    // coherent 100% set, so the whole batch is approved or rejected as a
    // single unit, never goal-by-goal.
    {
      id: 'sub-dewi-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'dewi',
      submittedAt: '2026-06-02T09:15:00.000Z',
      status: 'pending',
      items: [
        {
          id: 'sub-dewi-create-1-item-1',
          type: 'create',
          ownerId: 'dewi',
          cycleId: CYCLE_ID,
          after: {
            id: 'dk-01-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations',
            category: 'Financial', subCategory: 'Cost Efficiency',
            code: 'DK-01', title: 'Operational cost reduction (≥ 8%)',
            weight: 35, contributorIds: [], viewerIds: [], status: 'gray',
            unit: 'percent', value: 0, pill: 0, min: 0, max: 8,
          },
        },
        {
          id: 'sub-dewi-create-1-item-2',
          type: 'create',
          ownerId: 'dewi',
          cycleId: CYCLE_ID,
          after: {
            id: 'dk-02-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations',
            category: 'Internal Process', subCategory: 'Standardization',
            code: 'DK-02', title: 'Cross-department SOP rollout (100%)',
            weight: 35, contributorIds: [], viewerIds: [], status: 'gray',
            unit: 'percent', value: 0, pill: 0, min: 0, max: 100,
          },
        },
        {
          id: 'sub-dewi-create-1-item-3',
          type: 'create',
          ownerId: 'dewi',
          cycleId: CYCLE_ID,
          after: {
            id: 'dk-03-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations',
            category: 'Customer', subCategory: 'Service Level',
            code: 'DK-03', title: 'Inter-department SLA compliance (≥ 95%)',
            weight: 30, contributorIds: [], viewerIds: [], status: 'gray',
            unit: 'percent', value: 0, pill: 0, min: 0, max: 95,
          },
        },
      ],
    },
    // Evelyn (Head of Accounting) requesting a sub-category correction on
    // an existing goal.
    {
      id: 'sub-evelyn-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'evelyn',
      submittedAt: '2026-06-03T11:40:00.000Z',
      status: 'pending',
      items: [
        {
          id: 'sub-evelyn-edit-1-item-1',
          type: 'edit',
          goalId: 'eb-03',
          ownerId: 'evelyn',
          cycleId: CYCLE_ID,
          before: {
            id: 'eb-03', cycleId: CYCLE_ID, level: 'organization', ownerId: 'evelyn', department: 'Accounting',
            category: 'Customer', subCategory: 'Internal Stakeholder',
            code: 'EB-03', title: 'External audit readiness (100%)',
            weight: 10, contributorIds: ['agung'], viewerIds: ['rizal'], status: 'orange',
            unit: 'percent', value: 83.8, pill: 84, min: 0, max: 100,
          },
          after: {
            id: 'eb-03', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
            category: 'Customer', subCategory: 'External Audit',
            code: 'EB-03', title: 'External audit readiness (100%)',
            weight: 10, contributorIds: ['agung'], viewerIds: ['rizal'], status: 'orange',
            unit: 'percent', value: 83.8, pill: 84, min: 0, max: 100,
          },
        },
      ],
    },
    // Cinta (Restaurant Manager) requesting to remove a goal she feels is
    // now redundant.
    {
      id: 'sub-cinta-delete-1',
      cycleId: CYCLE_ID,
      ownerId: 'cinta',
      submittedAt: '2026-06-04T14:05:00.000Z',
      status: 'pending',
      items: [
        {
          id: 'sub-cinta-delete-1-item-1',
          type: 'delete',
          goalId: 'ca-08',
          ownerId: 'cinta',
          cycleId: CYCLE_ID,
          before: {
            id: 'ca-08', cycleId: CYCLE_ID, level: 'individual', ownerId: 'cinta', department: 'Front of House',
            category: 'Learning & Growth', subCategory: 'Coaching',
            code: 'CA-08', title: 'Monthly 1-on-1 coaching sessions per staff (≥ 1 / month)',
            alignedToId: 'rp-05',
            weight: 5, contributorIds: [], viewerIds: [], status: 'orange',
            unit: 'count', value: 0.7, pill: 70, min: 0, max: 1,
          },
        },
      ],
    },
  ]
}

const STORAGE_KEY = 'talenta-goal-approvals-db'
const SEED_VERSION = 3
const submissionsData = ref<Submission[]>(seed())
let loadedFromStorage = false
let seq = 0

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, submissions: submissionsData.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.submissions)) {
        submissionsData.value = parsed.submissions
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

export function useGoalApprovalsStore(cycleId?: string) {
  loadFromStorage()

  const submissions = computed(() => cycleId ? submissionsData.value.filter(s => s.cycleId === cycleId) : submissionsData.value)

  // Drives the tab badge — count of whole submissions still needing a
  // decision (not a per-goal count, since the decision is per-submission).
  const pendingItemsCount = computed(() => submissions.value.filter(s => s.status === 'pending').length)

  function submissionById(submissionId: string) {
    return submissionsData.value.find(s => s.id === submissionId)
  }

  // Used by the gated create/edit/delete call sites — queues one batch of
  // proposed changes instead of touching useGoalsStore directly.
  function createSubmission(items: Omit<SubmissionItem, 'id'>[], ownerId: string, targetCycleId: string) {
    const submissionId = `sub-${ownerId}-${Date.now()}-${seq++}`
    const submission: Submission = {
      id: submissionId,
      cycleId: targetCycleId,
      ownerId,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      items: items.map((item, i) => ({ ...item, id: `${submissionId}-item-${i}` })),
    }
    submissionsData.value = [...submissionsData.value, submission]
    persist()
    return submission
  }

  // The "Approve" decision — commits every item in the batch into the
  // real goals store in one go, then marks the whole submission approved.
  function approveSubmission(submissionId: string) {
    const submission = submissionById(submissionId)
    if (!submission) return
    const { addGoals, updateGoal, deleteGoal } = useGoalsStore()
    for (const item of submission.items) {
      if (item.type === 'create' && item.after) addGoals([item.after], item.cycleId)
      else if (item.type === 'edit' && item.goalId && item.after) updateGoal(item.goalId, item.after)
      else if (item.type === 'delete' && item.goalId) deleteGoal(item.goalId)
    }
    submissionsData.value = submissionsData.value.map(s => (s.id !== submissionId ? s : { ...s, status: 'approved' as const }))
    persist()
  }

  // The "Not approve" decision — nothing is committed; the whole batch
  // stays put with one reason for the owner to act on.
  function rejectSubmission(submissionId: string, reason: string) {
    submissionsData.value = submissionsData.value.map(s => (s.id !== submissionId ? s : { ...s, status: 'rejected' as const, rejectReason: reason }))
    persist()
  }

  // Lets a single goal inside the batch be corrected (via AddGoalDrawer) —
  // available both before a decision and after a rejection, so the owner
  // can fix just the goals that need it without re-drafting the whole batch.
  function updateItem(submissionId: string, itemId: string, updatedAfter: Omit<Goal, 'cycleId'>) {
    submissionsData.value = submissionsData.value.map(s => (s.id !== submissionId ? s : {
      ...s,
      items: s.items.map(i => (i.id !== itemId ? i : { ...i, after: updatedAfter })),
    }))
    persist()
  }

  // Puts a rejected batch back in the pending queue after it's been
  // corrected, flagged so the manager can see it's been edited since they
  // last reviewed it. The reject reason is kept (not cleared) so that
  // history stays visible even once it's pending again.
  function resubmitSubmission(submissionId: string) {
    submissionsData.value = submissionsData.value.map(s => (s.id !== submissionId ? s : { ...s, status: 'pending' as const, wasEdited: true }))
    persist()
  }

  return {
    submissions,
    pendingItemsCount,
    submissionById,
    createSubmission,
    approveSubmission,
    rejectSubmission,
    updateItem,
    resubmitSubmission,
  }
}
