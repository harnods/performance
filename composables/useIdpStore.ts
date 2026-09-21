import {
  IDP_PLANS, type IdpPlan, type ActionPlan, type ActionPlanStatus, STATUS_BY_ID,
} from '~/utils/idp'

// Shared reactive "mini DB" for individual development plans — persisted to
// localStorage so a plan created in the form shows up in the index/detail and
// survives reload. Seeded from utils/idp IDP_PLANS. Bump SEED_VERSION when the
// plan shape changes in a way stale storage would contradict.
// Same shape as useSuccessionStore.
const STORAGE_KEY = 'talenta-idp-db'
const SEED_VERSION = 3

function seed(): IdpPlan[] {
  return IDP_PLANS.map(p => ({
    ...p,
    actionPlans: p.actionPlans.map(a => ({
      ...a,
      assignees: [...a.assignees],
      attachments: [...a.attachments],
      activities: a.activities.map(v => ({ ...v })),
    })),
  }))
}

const rawPlans = ref<IdpPlan[]>(seed())
let loaded = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, plans: rawPlans.value }))
}
function loadFromStorage() {
  if (loaded || !import.meta.client) return
  loaded = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.plans)) {
        rawPlans.value = parsed.plans
        return
      }
    }
    catch { /* re-seed on corrupt/outdated storage */ }
  }
  persist()
}

let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`

/** Draft shape the create/edit form hands back — ids and activities are ours. */
export interface IdpPlanDraft {
  name: string
  objective: string
  employeeId: string
  focus: IdpPlan['focus']
  futureJobPosition: string
  actionPlans: Omit<ActionPlan, 'id' | 'activities' | 'status'>[]
}

export function useIdpStore() {
  loadFromStorage()

  const plans = computed(() => rawPlans.value)
  const planById = (id: string) => rawPlans.value.find(p => p.id === id)

  function createPlan(draft: IdpPlanDraft, actorId: string): IdpPlan {
    const now = new Date().toISOString()
    const plan: IdpPlan = {
      id: nextId('idp'),
      name: draft.name.trim(),
      objective: draft.objective.trim(),
      employeeId: draft.employeeId,
      focus: draft.focus,
      futureJobPosition: draft.focus === 1 ? draft.futureJobPosition : '',
      createdAt: now,
      actionPlans: draft.actionPlans.map(a => ({
        ...a,
        id: nextId('ap'),
        status: 0 as ActionPlanStatus,
        assignees: [...a.assignees],
        attachments: [...a.attachments],
        activities: [{ id: nextId('act'), userId: actorId, content: 'created this action plan', at: now }],
      })),
    }
    rawPlans.value = [...rawPlans.value, plan]
    persist()
    return plan
  }

  // Editing a plan replaces its action plans wholesale, but an action plan the
  // user didn't touch keeps its id, status and activity trail — losing those on
  // every save would reset real progress. Matched by id; rows without one are new.
  function updatePlan(id: string, draft: IdpPlanDraft & { actionPlans: (IdpPlanDraft['actionPlans'][number] & { id?: string })[] }, actorId: string) {
    const idx = rawPlans.value.findIndex(p => p.id === id)
    if (idx === -1) return
    const existing = rawPlans.value[idx]
    const now = new Date().toISOString()
    const next: IdpPlan = {
      ...existing,
      name: draft.name.trim(),
      objective: draft.objective.trim(),
      employeeId: draft.employeeId,
      focus: draft.focus,
      futureJobPosition: draft.focus === 1 ? draft.futureJobPosition : '',
      actionPlans: draft.actionPlans.map((a) => {
        const prev = a.id ? existing.actionPlans.find(p => p.id === a.id) : undefined
        return {
          ...a,
          id: prev?.id ?? nextId('ap'),
          status: prev?.status ?? (0 as ActionPlanStatus),
          assignees: [...a.assignees],
          attachments: [...a.attachments],
          activities: prev?.activities ?? [{ id: nextId('act'), userId: actorId, content: 'created this action plan', at: now }],
        }
      }),
    }
    rawPlans.value = rawPlans.value.map((p, i) => (i === idx ? next : p))
    persist()
  }

  function deletePlan(id: string) {
    rawPlans.value = rawPlans.value.filter(p => p.id !== id)
    persist()
  }

  // ─── Action plans (the detail page's own CRUD) ─────────────────────────────
  function mutatePlan(planId: string, fn: (plan: IdpPlan) => IdpPlan) {
    const idx = rawPlans.value.findIndex(p => p.id === planId)
    if (idx === -1) return
    rawPlans.value = rawPlans.value.map((p, i) => (i === idx ? fn(p) : p))
    persist()
  }

  function addActionPlan(planId: string, draft: Omit<ActionPlan, 'id' | 'activities' | 'status'>, actorId: string) {
    const now = new Date().toISOString()
    mutatePlan(planId, p => ({
      ...p,
      actionPlans: [...p.actionPlans, {
        ...draft,
        id: nextId('ap'),
        status: 0,
        assignees: [...draft.assignees],
        attachments: [...draft.attachments],
        activities: [{ id: nextId('act'), userId: actorId, content: 'created this action plan', at: now }],
      }],
    }))
  }

  function updateActionPlan(planId: string, actionPlanId: string, draft: Omit<ActionPlan, 'id' | 'activities' | 'status'>) {
    mutatePlan(planId, p => ({
      ...p,
      actionPlans: p.actionPlans.map(a => (a.id === actionPlanId
        ? { ...a, ...draft, assignees: [...draft.assignees], attachments: [...draft.attachments] }
        : a)),
    }))
  }

  function deleteActionPlan(planId: string, actionPlanId: string) {
    mutatePlan(planId, p => ({ ...p, actionPlans: p.actionPlans.filter(a => a.id !== actionPlanId) }))
  }

  /** Status changes are logged, since the activity trail is what the view modal shows. */
  function setActionPlanStatus(planId: string, actionPlanId: string, status: ActionPlanStatus, actorId: string) {
    const now = new Date().toISOString()
    mutatePlan(planId, p => ({
      ...p,
      actionPlans: p.actionPlans.map(a => (a.id === actionPlanId
        ? {
            ...a,
            status,
            activities: [...a.activities, {
              id: nextId('act'),
              userId: actorId,
              content: `marked this as ${STATUS_BY_ID[status].title}`,
              at: now,
            }],
          }
        : a)),
    }))
  }

  return {
    plans,
    planById,
    createPlan,
    updatePlan,
    deletePlan,
    addActionPlan,
    updateActionPlan,
    deleteActionPlan,
    setActionPlanStatus,
  }
}
