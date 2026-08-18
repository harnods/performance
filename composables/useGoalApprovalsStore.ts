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
import { EMPLOYEE_MANAGER } from './useGoalsStore'
import { employeeById } from '~/utils/employees'
import { BULK_ASYNC_THRESHOLD, useGoalRequestBatchStore } from './useGoalRequestBatchStore'

export type SubmissionItemType = 'create' | 'edit' | 'delete'

// A published draft is submitted as an `edit` that just flips `isDraft`
// true → false (see useGoalDraftSubmitter — the draft row already exists,
// so a `create` would publish a second copy on approve). But the goal has
// never been live before, so from the reviewer's and the owner's own
// perspective this reads as a CREATION, not a modification — every "what
// kind of request is this" label below must treat it that way, not just
// the literal `type` field.
export function isCreateLikeItem(item: { type: string, before?: Record<string, unknown>, after?: Record<string, unknown> }): boolean {
  if (item.type === 'create') return true
  return item.type === 'edit' && item.before?.isDraft === true && item.after?.isDraft === false
}

// Human label for what a submission does — drives inbox copy + traceability.
function actionLabelFor(items: { type: string, before?: Record<string, unknown>, after?: Record<string, unknown> }[]): string {
  if (items.some(isCreateLikeItem)) return 'create goals'
  if (items.some(i => i.type === 'delete')) return 'delete a goal'
  const edits = items.filter(i => i.type === 'edit')
  if (edits.length && edits.every(i => !!i.after && !i.before?.isClosed && !!i.after.isClosed)) return 'close a goal'
  if (edits.length && edits.every((i) => {
    const b = i.before, a = i.after
    return !!b && !!a && (b.value !== a.value || b.pill !== a.pill)
  })) return 'update goal progress'
  return 'edit a goal'
}
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

// The ONE classification of "what kind of request is this", shared by the
// goal-cycle "Awaiting approval" tab (GoalApprovalQueue.vue) and the Goals
// dashboard's two approval cards (useGoalsDashboard.ts). Both surfaces read the
// same submissions, so they must bucket them identically — keep this the single
// source of truth rather than re-deriving the rule per component.
//
// Detection mirrors actionLabelFor above: any create item makes it a creation
// batch; a batch whose edits only move value/pill is a progress update;
// everything else (plain edits, closes, deletes) is a generic goal update.
export type SubmissionTypeLabel = 'Goal creation' | 'Goal progress update' | 'Goal update'

export function submissionTypeLabel(submission: Pick<Submission, 'items'>): SubmissionTypeLabel {
  if (submission.items.some(i => i.type === 'create')) return 'Goal creation'
  const edits = submission.items.filter(i => i.type === 'edit')
  if (edits.length && edits.every((i) => {
    const before = i.before, after = i.after
    return !!before && !!after && (before.value !== after.value || before.pill !== after.pill)
  })) return 'Goal progress update'
  return 'Goal update'
}

// A submission is still "awaiting approval" until it has been approved — a
// rejected batch stays visible so it can be reopened/resubmitted. Shared so the
// dashboard cards and the queue can never disagree about what is outstanding.
export function isAwaitingApproval(submission: Pick<Submission, 'status'>): boolean {
  return submission.status !== 'approved'
}

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
  // Set only when this submission was one of a group queued together by one
  // bulk "New goals" save (see useGoalRequestBatchStore) — lets approving it
  // check whether that group is large enough to create its goals as a
  // background job instead of synchronously.
  batchId?: string
}

const CYCLE_ID = 'seed-26-h1'

// Every "create" bundle below has a DIFFERENT goal count (10–13) and a
// descending, non-uniform weight distribution — never a flat split — same
// "front-loaded" shape real weight-planning tends to produce (Financial
// carries the most, Learning & Growth the least), while still summing to
// exactly 100% per bundle. No two bundles use the same count+weight shape.
function seed(): Submission[] {
  return [
    // Dewi (Head of Operations) proposing 10 brand-new goals in one bundle —
    // a brand-new hire with no existing goals yet, so this batch sums to
    // exactly 100% by itself, matching the real "New goals" page's own rule
    // (Save is blocked until the total hits 100%; there's no such thing as
    // submitting a partial one). Weights only make sense as one coherent
    // 100% set, so the whole batch is approved or rejected as a single unit,
    // never goal-by-goal. Spans all 4 categories, multiple sub-categories
    // within Financial and Customer, multiple goals per sub-category, and
    // mixes goal type (organization/team/individual) and measurement unit
    // (percent/currency/count/none) so the review table exercises every
    // column's variety at once.
    {
      id: 'sub-dewi-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'dewi',
      submittedAt: '2026-06-02T09:15:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-dewi-create-1-item-1', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-01-dewi', level: 'organization', ownerId: 'dewi', department: 'Operations', category: 'Financial', subCategory: 'Cost Efficiency', code: 'DK-01', title: 'Operational cost reduction (≥ 8%)', weight: 15, contributorIds: ['agung'], viewerIds: ['agung', 'evelyn', 'rizal'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 8 } },
        { id: 'sub-dewi-create-1-item-2', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-02-dewi', level: 'team', ownerId: 'dewi', department: 'Operations', category: 'Financial', subCategory: 'Cost Efficiency', code: 'DK-02', title: 'Facility overhead cost reduction (≥ 5%)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 5 } },
        { id: 'sub-dewi-create-1-item-3', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-03-dewi', level: 'team', ownerId: 'dewi', department: 'Operations', category: 'Financial', subCategory: 'Revenue Contribution', code: 'DK-03', title: 'New revenue stream contribution (IDR 300M)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 300000000 } },
        { id: 'sub-dewi-create-1-item-4', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-04-dewi', level: 'organization', ownerId: 'dewi', department: 'Operations', category: 'Customer', subCategory: 'Service Level', code: 'DK-04', title: 'Inter-department SLA compliance (≥ 95%)', weight: 10, contributorIds: ['rio'], viewerIds: ['rio', 'rizal'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 95 } },
        { id: 'sub-dewi-create-1-item-5', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-05-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations', category: 'Customer', subCategory: 'Service Level', code: 'DK-05', title: 'Cross-team escalation resolution time (≤ 2 days)', weight: 10, contributorIds: ['alfian'], viewerIds: ['alfian'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-dewi-create-1-item-6', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-06-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations', category: 'Customer', subCategory: 'Guest Experience', code: 'DK-06', title: 'Operations-related guest complaint rate (≤ 3%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 3, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-dewi-create-1-item-7', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-07-dewi', level: 'team', ownerId: 'dewi', department: 'Operations', category: 'Internal Process', subCategory: 'Standardization', code: 'DK-07', title: 'Cross-department SOP rollout (100%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-dewi-create-1-item-8', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-08-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations', category: 'Internal Process', subCategory: 'Standardization', code: 'DK-08', title: 'Vendor onboarding process time (≤ 5 days)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 5 } },
        { id: 'sub-dewi-create-1-item-9', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-09-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations', category: 'Learning & Growth', subCategory: 'Capability Building', code: 'DK-09', title: 'Operations leadership certification (Completed)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-04-30' } },
        { id: 'sub-dewi-create-1-item-10', type: 'create', ownerId: 'dewi', cycleId: CYCLE_ID, after: { id: 'dk-10-dewi', level: 'individual', ownerId: 'dewi', department: 'Operations', category: 'Learning & Growth', subCategory: 'Capability Building', code: 'DK-10', title: 'Cross-functional training sessions led (≥ 4)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4 } },
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
            weight: 10, contributorIds: ['agung'], viewerIds: ['agung', 'rizal'], status: 'orange',
            unit: 'percent', value: 83.8, pill: 84, min: 0, max: 100,
          },
          after: {
            id: 'eb-03', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
            category: 'Customer', subCategory: 'External Audit',
            code: 'EB-03', title: 'External audit readiness (100%)',
            weight: 10, contributorIds: ['agung'], viewerIds: ['agung', 'rizal'], status: 'orange',
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
            repeat: true, startDate: '2026-01-01', endDate: '2026-01-31',
          },
        },
      ],
    },
    // Alfian (HR Admin, reports to Rio — not Rizal) requesting a sub-category
    // correction on an existing individual goal — same kind of edit as
    // Evelyn's above. Every other seeded submission here is owned by someone
    // who reports straight to Rizal, so this is the one case that actually
    // exercises manager-level review (Rio) rather than the Super Admin path.
    // `before` is an exact snapshot of goal 'af-07' as seeded in
    // useGoalsStore.ts, so the diff shown on the review page (Goal
    // sub-category: Compliance → Regulatory Training) reflects a real goal,
    // not invented data. Only fields the review page actually diffs
    // (buildGroups in [submissionId].vue) are changed — progress/value/pill
    // aren't part of that diff, so they're left untouched here.
    {
      id: 'sub-alfian-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'alfian',
      submittedAt: '2026-06-05T10:20:00.000Z',
      status: 'pending',
      items: [
        {
          id: 'sub-alfian-edit-1-item-1',
          type: 'edit',
          goalId: 'af-07',
          ownerId: 'alfian',
          cycleId: CYCLE_ID,
          before: {
            id: 'af-07', cycleId: CYCLE_ID, level: 'individual', ownerId: 'alfian', department: 'HR',
            category: 'Learning & Growth', subCategory: 'Compliance',
            code: 'AF-07', title: 'Labor law compliance training (100%)',
            weight: 10, contributorIds: [], viewerIds: [], status: 'orange',
            unit: 'percent', value: 82, pill: 82, min: 0, max: 100,
          },
          after: {
            id: 'af-07', level: 'individual', ownerId: 'alfian', department: 'HR',
            category: 'Learning & Growth', subCategory: 'Regulatory Training',
            code: 'AF-07', title: 'Labor law compliance training (100%)',
            weight: 10, contributorIds: [], viewerIds: [], status: 'orange',
            unit: 'percent', value: 82, pill: 82, min: 0, max: 100,
          },
        },
      ],
    },

    // ─── Volume seed — 20 more requestors so the Inbox list has real scroll
    // depth to test against, spread across every department head's team.
    // Split two ways, each "accurate and connected" per the same rule as
    // Alfian's submission above:
    //  1) Sub-category corrections/deletions on REAL existing goals for the
    //     7 employees who already own goals in useGoalsStore.ts (ali, andi,
    //     bayu, daud, eka, jessie, rio) — `before` is an exact snapshot of
    //     that goal.
    //  2) Fresh "create" bundles (10–13 goals each, descending non-uniform
    //     weights summing to 100%, same rule as Dewi's own bundle above) for
    //     the 13 employees who own no goals yet — 7 already in
    //     utils/employees.ts, plus 6 new hires added there for this seed
    //     (dian, reza, wisnu, putri, santi, yoga).

    // Ali (Sales Director) — sub-category correction on his real goal ai-07.
    {
      id: 'sub-ali-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'ali',
      submittedAt: '2026-05-20T09:10:00.000Z',
      status: 'pending',
      items: [{
        id: 'sub-ali-edit-1-item-1', type: 'edit', goalId: 'ai-07', ownerId: 'ali', cycleId: CYCLE_ID,
        before: {
          id: 'ai-07', cycleId: CYCLE_ID, level: 'individual', ownerId: 'ali', department: 'Sales',
          category: 'Internal Process', subCategory: 'Forecast',
          code: 'AI-07', title: 'Sales forecast accuracy (≥ 85%)',
          weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 92.6, pill: 109, min: 0, max: 85,
        },
        after: {
          id: 'ai-07', level: 'individual', ownerId: 'ali', department: 'Sales',
          category: 'Internal Process', subCategory: 'Sales Forecasting Methodology',
          code: 'AI-07', title: 'Sales forecast accuracy (≥ 85%)',
          weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 92.6, pill: 109, min: 0, max: 85,
        },
      }],
    },
    // Andi (Head Chef) — sub-category correction on his real goal ap-09.
    {
      id: 'sub-andi-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'andi',
      submittedAt: '2026-05-21T09:10:00.000Z',
      status: 'pending',
      items: [{
        id: 'sub-andi-edit-1-item-1', type: 'edit', goalId: 'ap-09', ownerId: 'andi', cycleId: CYCLE_ID,
        before: {
          id: 'ap-09', cycleId: CYCLE_ID, level: 'individual', ownerId: 'andi', department: 'Kitchen',
          category: 'Learning & Growth', subCategory: 'Cross-Train',
          code: 'AP-09', title: 'Cross-station training coverage (≥ 75%)',
          weight: 5, contributorIds: ['indah'], viewerIds: ['indah'], status: 'orange', unit: 'percent', value: 49, pill: 65, min: 0, max: 75,
        },
        after: {
          id: 'ap-09', level: 'individual', ownerId: 'andi', department: 'Kitchen',
          category: 'Learning & Growth', subCategory: 'Cross-Training Program',
          code: 'AP-09', title: 'Cross-station training coverage (≥ 75%)',
          weight: 5, contributorIds: ['indah'], viewerIds: ['indah'], status: 'orange', unit: 'percent', value: 49, pill: 65, min: 0, max: 75,
        },
      }],
    },
    // Bayu (Head of Marketing) — requesting to remove a goal he feels is redundant.
    {
      id: 'sub-bayu-delete-1',
      cycleId: CYCLE_ID,
      ownerId: 'bayu',
      submittedAt: '2026-05-22T09:10:00.000Z',
      status: 'pending',
      items: [{
        id: 'sub-bayu-delete-1-item-1', type: 'delete', goalId: 'bf-09', ownerId: 'bayu', cycleId: CYCLE_ID,
        before: {
          id: 'bf-09', cycleId: CYCLE_ID, level: 'individual', ownerId: 'bayu', department: 'Marketing',
          category: 'Learning & Growth', subCategory: 'Research',
          code: 'BF-09', title: 'Market research report delivery (1 per quarter)',
          weight: 7, contributorIds: ['yoga'], viewerIds: ['yoga'], status: 'green', unit: 'count', value: 1.1, pill: 110, min: 0, max: 1,
          repeat: true, startDate: '2026-01-01', endDate: '2026-03-31',
        },
      }],
    },
    // Daud (Sales Representative) — sub-category correction on his real goal dd-09.
    {
      id: 'sub-daud-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'daud',
      submittedAt: '2026-05-23T09:10:00.000Z',
      status: 'pending',
      items: [{
        id: 'sub-daud-edit-1-item-1', type: 'edit', goalId: 'dd-09', ownerId: 'daud', cycleId: CYCLE_ID,
        before: {
          id: 'dd-09', cycleId: CYCLE_ID, level: 'individual', ownerId: 'daud', department: 'Sales',
          category: 'Learning & Growth', subCategory: 'Skills',
          code: 'DD-09', title: 'Negotiation skills workshop (≥ 1 session)',
          weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 0.7, pill: 70, min: 0, max: 1,
        },
        after: {
          id: 'dd-09', level: 'individual', ownerId: 'daud', department: 'Sales',
          category: 'Learning & Growth', subCategory: 'Sales Skills Development',
          code: 'DD-09', title: 'Negotiation skills workshop (≥ 1 session)',
          weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 0.7, pill: 70, min: 0, max: 1,
        },
      }],
    },
    // Eka (Barista) — sub-category correction on her real goal es-01.
    {
      id: 'sub-eka-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'eka',
      submittedAt: '2026-05-24T09:10:00.000Z',
      status: 'pending',
      items: [{
        id: 'sub-eka-edit-1-item-1', type: 'edit', goalId: 'es-01', ownerId: 'eka', cycleId: CYCLE_ID,
        before: {
          id: 'es-01', cycleId: CYCLE_ID, level: 'team', ownerId: 'eka', department: 'Front of House',
          category: 'Customer', subCategory: 'Guest Experience',
          code: 'ES-01', title: 'Personal customer satisfaction rating (≥ 4.7 / 5)',
          alignedToId: 'ca-01',
          weight: 20, contributorIds: [], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 4.6, pill: 98, min: 0, max: 4.7,
        },
        after: {
          id: 'es-01', level: 'team', ownerId: 'eka', department: 'Front of House',
          category: 'Customer', subCategory: 'Guest Satisfaction Tracking',
          code: 'ES-01', title: 'Personal customer satisfaction rating (≥ 4.7 / 5)',
          alignedToId: 'ca-01',
          weight: 20, contributorIds: [], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 4.6, pill: 98, min: 0, max: 4.7,
        },
      }],
    },
    // Jessie (Sales Representative) — sub-category correction on her real goal jt-08.
    {
      id: 'sub-jessie-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'jessie',
      submittedAt: '2026-05-25T09:10:00.000Z',
      status: 'pending',
      items: [{
        id: 'sub-jessie-edit-1-item-1', type: 'edit', goalId: 'jt-08', ownerId: 'jessie', cycleId: CYCLE_ID,
        before: {
          id: 'jt-08', cycleId: CYCLE_ID, level: 'individual', ownerId: 'jessie', department: 'Sales',
          category: 'Learning & Growth', subCategory: 'Retail',
          code: 'JT-08', title: 'Retail sales technique training (100%)',
          alignedToId: 'ai-08',
          weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
        },
        after: {
          id: 'jt-08', level: 'individual', ownerId: 'jessie', department: 'Sales',
          category: 'Learning & Growth', subCategory: 'Retail Sales Techniques',
          code: 'JT-08', title: 'Retail sales technique training (100%)',
          alignedToId: 'ai-08',
          weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
        },
      }],
    },
    // Rio (Head of People) — sub-category correction on his real goal rp-06.
    // Reports straight to Rizal, so — unlike Alfian's submission — this one
    // is only reviewable via the Super Admin path, not by Rio himself.
    {
      id: 'sub-rio-edit-1',
      cycleId: CYCLE_ID,
      ownerId: 'rio',
      submittedAt: '2026-05-26T09:10:00.000Z',
      status: 'pending',
      items: [{
        id: 'sub-rio-edit-1-item-1', type: 'edit', goalId: 'rp-06', ownerId: 'rio', cycleId: CYCLE_ID,
        before: {
          id: 'rp-06', cycleId: CYCLE_ID, level: 'individual', ownerId: 'rio', department: 'HR',
          category: 'Financial', subCategory: 'Recruitment Cost',
          code: 'RP-06', title: 'Average cost per hire (≤ IDR 5M)',
          weight: 10, contributorIds: ['santi'], viewerIds: ['santi', 'evelyn'], status: 'green', unit: 'currency', value: 4000000, pill: 80, min: 0, max: 5000000,
        },
        after: {
          id: 'rp-06', level: 'individual', ownerId: 'rio', department: 'HR',
          category: 'Financial', subCategory: 'Hiring Cost Efficiency',
          code: 'RP-06', title: 'Average cost per hire (≤ IDR 5M)',
          weight: 10, contributorIds: ['santi'], viewerIds: ['santi', 'evelyn'], status: 'green', unit: 'currency', value: 4000000, pill: 80, min: 0, max: 5000000,
        },
      }],
    },

    // Agung (Accountant) — first-time goal proposal, 11 goals.
    {
      id: 'sub-agung-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'agung',
      submittedAt: '2026-05-27T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-agung-create-1-item-1', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-01', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Financial', subCategory: 'Reconciliation', code: 'AS-01', title: 'Monthly account reconciliation accuracy (≥ 98%)', weight: 14, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 98, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-agung-create-1-item-2', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-02', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Financial', subCategory: 'Reconciliation', code: 'AS-02', title: 'Reconciliation turnaround time (≤ 3 days)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 3 } },
        { id: 'sub-agung-create-1-item-3', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-03', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Financial', subCategory: 'Cost Control', code: 'AS-03', title: 'Departmental expense variance (≤ 4%)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 4 } },
        { id: 'sub-agung-create-1-item-4', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-04', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Customer', subCategory: 'Internal Stakeholder', code: 'AS-04', title: 'Stakeholder satisfaction with finance reports (≥ 4.2 / 5)', weight: 10, contributorIds: [], viewerIds: ['rizal', 'rio'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.2 } },
        { id: 'sub-agung-create-1-item-5', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-05', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Customer', subCategory: 'Internal Stakeholder', code: 'AS-05', title: 'Ad-hoc finance query response time (≤ 1 day)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-agung-create-1-item-6', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-06', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Customer', subCategory: 'Employee Support', code: 'AS-06', title: 'Expense reimbursement accuracy (≥ 99%)', weight: 9, contributorIds: ['christin'], viewerIds: ['christin'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 99 } },
        { id: 'sub-agung-create-1-item-7', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-07', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Internal Process', subCategory: 'Reporting', code: 'AS-07', title: 'Expense report processing time (≤ 2 days)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-agung-create-1-item-8', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-08', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Internal Process', subCategory: 'Reporting', code: 'AS-08', title: 'Monthly closing checklist completion (100%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-agung-create-1-item-9', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-11', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Internal Process', subCategory: 'Reporting', code: 'AS-11', title: 'Audit trail documentation completeness (≥ 97%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 97 } },
        { id: 'sub-agung-create-1-item-10', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-09', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Professional Dev', code: 'AS-09', title: 'Accounting software certification (Completed)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-03-31' } },
        { id: 'sub-agung-create-1-item-11', type: 'create', ownerId: 'agung', cycleId: CYCLE_ID, after: { id: 'as-10', level: 'individual', ownerId: 'agung', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Professional Dev', code: 'AS-10', title: 'Tax regulation update training (≥ 2 sessions)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
      ],
    },
    // Christin (Accountant) — first-time goal proposal, 10 goals.
    {
      id: 'sub-christin-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'christin',
      submittedAt: '2026-05-28T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-christin-create-1-item-1', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-01', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Financial', subCategory: 'Cost Control', code: 'CPS-01', title: 'Departmental expense variance (≤ 4%)', weight: 16, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 4 } },
        { id: 'sub-christin-create-1-item-2', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-02', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Financial', subCategory: 'Cost Control', code: 'CPS-02', title: 'Vendor invoice discrepancy rate (≤ 2%)', weight: 13, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-christin-create-1-item-3', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-03', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Financial', subCategory: 'Budget', code: 'CPS-03', title: 'Budget forecast accuracy (≥ 95%)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 95 } },
        { id: 'sub-christin-create-1-item-4', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-04', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Customer', subCategory: 'Employee Support', code: 'CPS-04', title: 'Expense reimbursement turnaround (≤ 3 days)', weight: 10, contributorIds: ['agung'], viewerIds: ['agung'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 3 } },
        { id: 'sub-christin-create-1-item-5', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-05', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Customer', subCategory: 'Employee Support', code: 'CPS-05', title: 'Payroll query resolution time (≤ 1 day)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-christin-create-1-item-6', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-06', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Customer', subCategory: 'Internal Stakeholder', code: 'CPS-06', title: 'Finance helpdesk satisfaction (≥ 4.3 / 5)', weight: 9, contributorIds: [], viewerIds: ['linda', 'dian'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.3 } },
        { id: 'sub-christin-create-1-item-7', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-07', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Internal Process', subCategory: 'Compliance', code: 'CPS-07', title: 'Tax filing on-time rate (100%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-christin-create-1-item-8', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-08', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Internal Process', subCategory: 'Compliance', code: 'CPS-08', title: 'Audit documentation completeness (≥ 98%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 98 } },
        { id: 'sub-christin-create-1-item-9', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-09', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Professional Dev', code: 'CPS-09', title: 'Brevet tax certification (Completed)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-05-31' } },
        { id: 'sub-christin-create-1-item-10', type: 'create', ownerId: 'christin', cycleId: CYCLE_ID, after: { id: 'cps-10', level: 'individual', ownerId: 'christin', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Professional Dev', code: 'CPS-10', title: 'Excel advanced training (≥ 1 session)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
      ],
    },
    // Linda (Finance Admin) — first-time goal proposal, 12 goals.
    {
      id: 'sub-linda-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'linda',
      submittedAt: '2026-05-29T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-linda-create-1-item-1', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-01', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Financial', subCategory: 'Payroll', code: 'LH-01', title: 'Payroll disbursement accuracy (100%)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-linda-create-1-item-2', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-02', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Financial', subCategory: 'Payroll', code: 'LH-02', title: 'Payroll processing turnaround (≤ 2 days)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-linda-create-1-item-3', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-03', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Financial', subCategory: 'Budget', code: 'LH-03', title: 'Petty cash reconciliation accuracy (100%)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-linda-create-1-item-4', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-04', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Customer', subCategory: 'Employee Support', code: 'LH-04', title: 'Expense reimbursement turnaround (≤ 3 days)', weight: 9, contributorIds: ['dian'], viewerIds: ['dian'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 3 } },
        { id: 'sub-linda-create-1-item-5', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-05', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Customer', subCategory: 'Employee Support', code: 'LH-05', title: 'Payroll query resolution time (≤ 1 biz day)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-linda-create-1-item-6', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-06', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Customer', subCategory: 'Internal Stakeholder', code: 'LH-06', title: 'Finance admin satisfaction score (≥ 4.2 / 5)', weight: 8, contributorIds: [], viewerIds: ['christin', 'agung'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.2 } },
        { id: 'sub-linda-create-1-item-7', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-07', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Internal Process', subCategory: 'Payroll Support', code: 'LH-07', title: 'Payroll data entry accuracy (≥ 99%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 99 } },
        { id: 'sub-linda-create-1-item-8', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-08', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Internal Process', subCategory: 'Payroll Support', code: 'LH-08', title: 'Timesheet processing on-time rate (100%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-linda-create-1-item-9', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-11', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Internal Process', subCategory: 'Payroll Support', code: 'LH-11', title: 'Statutory deduction accuracy (100%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-linda-create-1-item-10', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-09', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Systems', code: 'LH-09', title: 'Payroll system proficiency certification (Completed)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-02-28' } },
        { id: 'sub-linda-create-1-item-11', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-10', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Systems', code: 'LH-10', title: 'New HRIS module training (≥ 1 session)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-linda-create-1-item-12', type: 'create', ownerId: 'linda', cycleId: CYCLE_ID, after: { id: 'lh-12', level: 'individual', ownerId: 'linda', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Systems', code: 'LH-12', title: 'Excel formula proficiency assessment (Completed)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray' } },
      ],
    },
    // Dian (Payroll Specialist, new hire under Evelyn) — first-time goal proposal, 10 goals.
    {
      id: 'sub-dian-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'dian',
      submittedAt: '2026-05-30T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-dian-create-1-item-1', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-01', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Financial', subCategory: 'Payroll', code: 'DA-01', title: 'Payroll processing accuracy (100%)', weight: 14, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-dian-create-1-item-2', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-02', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Financial', subCategory: 'Payroll', code: 'DA-02', title: 'Payroll disbursement turnaround (≤ 2 days)', weight: 13, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-dian-create-1-item-3', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-03', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Financial', subCategory: 'Cost Control', code: 'DA-03', title: 'Payroll error cost avoidance (IDR 20M)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 20000000 } },
        { id: 'sub-dian-create-1-item-4', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-04', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Customer', subCategory: 'Employee Support', code: 'DA-04', title: 'Payroll query resolution time (≤ 1 biz day)', weight: 10, contributorIds: ['linda'], viewerIds: ['linda'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-dian-create-1-item-5', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-05', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Customer', subCategory: 'Employee Support', code: 'DA-05', title: 'Employee benefits enrollment support (≥ 4.3 / 5)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.3 } },
        { id: 'sub-dian-create-1-item-6', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-06', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Customer', subCategory: 'Internal Stakeholder', code: 'DA-06', title: 'Cross-department payroll coordination rating (≥ 4 / 5)', weight: 9, contributorIds: [], viewerIds: ['rio', 'alfian'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4 } },
        { id: 'sub-dian-create-1-item-7', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-07', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Internal Process', subCategory: 'Payroll', code: 'DA-07', title: 'Payroll compliance audit pass rate (100%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-dian-create-1-item-8', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-08', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Internal Process', subCategory: 'Payroll', code: 'DA-08', title: 'Statutory reporting on-time rate (100%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-dian-create-1-item-9', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-09', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Systems', code: 'DA-09', title: 'Payroll system certification (Completed)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-03-15' } },
        { id: 'sub-dian-create-1-item-10', type: 'create', ownerId: 'dian', cycleId: CYCLE_ID, after: { id: 'da-10', level: 'individual', ownerId: 'dian', department: 'Accounting', category: 'Learning & Growth', subCategory: 'Systems', code: 'DA-10', title: 'Tax regulation update training (≥ 2 sessions)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
      ],
    },
    // Fajar (Waitstaff) — first-time goal proposal, 11 goals.
    {
      id: 'sub-fajar-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'fajar',
      submittedAt: '2026-05-31T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-fajar-create-1-item-1', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-01', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Financial', subCategory: 'Upselling', code: 'FN-01', title: 'Average upsell per table (≥ 1 item)', weight: 13, contributorIds: ['galih'], viewerIds: ['galih'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-fajar-create-1-item-2', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-02', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Financial', subCategory: 'Upselling', code: 'FN-02', title: 'Beverage upsell revenue (IDR 5M)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 5000000 } },
        { id: 'sub-fajar-create-1-item-3', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-03', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Financial', subCategory: 'Efficiency', code: 'FN-03', title: 'Table turnover time (≤ 45 min)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 45 } },
        { id: 'sub-fajar-create-1-item-4', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-04', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'FN-04', title: 'Guest service rating (≥ 4.5 / 5)', weight: 10, contributorIds: [], viewerIds: ['cinta'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.5 } },
        { id: 'sub-fajar-create-1-item-5', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-05', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'FN-05', title: 'Repeat guest recognition rate (≥ 80%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 80 } },
        { id: 'sub-fajar-create-1-item-6', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-11', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'FN-11', title: 'Guest allergy handling accuracy (100%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-fajar-create-1-item-7', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-06', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Customer', subCategory: 'Complaints', code: 'FN-06', title: 'Guest complaint resolution time (≤ 1 hour)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-fajar-create-1-item-8', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-07', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Internal Process', subCategory: 'Service Standards', code: 'FN-07', title: 'Order accuracy rate (≥ 97%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 97 } },
        { id: 'sub-fajar-create-1-item-9', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-08', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Internal Process', subCategory: 'Service Standards', code: 'FN-08', title: 'Table setup SOP compliance (100%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-fajar-create-1-item-10', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-09', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Team Dev', code: 'FN-09', title: 'Menu knowledge certification (Completed)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-02-15' } },
        { id: 'sub-fajar-create-1-item-11', type: 'create', ownerId: 'fajar', cycleId: CYCLE_ID, after: { id: 'fn-10', level: 'individual', ownerId: 'fajar', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Team Dev', code: 'FN-10', title: 'New staff mentoring sessions (≥ 2)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
      ],
    },
    // Galih (Waitstaff) — first-time goal proposal, 10 goals.
    {
      id: 'sub-galih-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'galih',
      submittedAt: '2026-06-01T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-galih-create-1-item-1', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-01', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Financial', subCategory: 'Efficiency', code: 'GP-01', title: 'Table turnover improvement (≥ 10%)', weight: 15, contributorIds: ['fajar'], viewerIds: ['fajar'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 10 } },
        { id: 'sub-galih-create-1-item-2', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-02', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Financial', subCategory: 'Efficiency', code: 'GP-02', title: 'Order processing time (≤ 5 min)', weight: 13, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 5 } },
        { id: 'sub-galih-create-1-item-3', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-03', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Financial', subCategory: 'Upselling', code: 'GP-03', title: 'Dessert upsell rate (≥ 15%)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 15 } },
        { id: 'sub-galih-create-1-item-4', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-04', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'GP-04', title: 'Table service satisfaction score (≥ 4.4 / 5)', weight: 10, contributorIds: [], viewerIds: ['cinta'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.4 } },
        { id: 'sub-galih-create-1-item-5', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-05', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'GP-05', title: 'Guest wait time (≤ 5 min)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 5 } },
        { id: 'sub-galih-create-1-item-6', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-06', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Customer', subCategory: 'Complaints', code: 'GP-06', title: 'Complaint escalation rate (≤ 5%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 5, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-galih-create-1-item-7', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-07', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Internal Process', subCategory: 'Efficiency', code: 'GP-07', title: 'Order accuracy rate (≥ 97%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 97 } },
        { id: 'sub-galih-create-1-item-8', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-08', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Internal Process', subCategory: 'Efficiency', code: 'GP-08', title: 'Shift handover compliance (100%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-galih-create-1-item-9', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-09', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Team Dev', code: 'GP-09', title: 'POS system certification (Completed)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-01-31' } },
        { id: 'sub-galih-create-1-item-10', type: 'create', ownerId: 'galih', cycleId: CYCLE_ID, after: { id: 'gp-10', level: 'individual', ownerId: 'galih', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Team Dev', code: 'GP-10', title: 'Wine service training (≥ 1 session)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
      ],
    },
    // Putri (Waitstaff, new hire under Cinta) — first-time goal proposal, 13 goals.
    {
      id: 'sub-putri-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'putri',
      submittedAt: '2026-06-02T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-putri-create-1-item-1', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-01', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Financial', subCategory: 'Upselling', code: 'PW-01', title: 'Average upsell per table (≥ 1 item)', weight: 11, contributorIds: ['joko'], viewerIds: ['joko'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-putri-create-1-item-2', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-02', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Financial', subCategory: 'Upselling', code: 'PW-02', title: 'Appetizer upsell rate (≥ 12%)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 12 } },
        { id: 'sub-putri-create-1-item-3', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-03', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Financial', subCategory: 'Efficiency', code: 'PW-03', title: 'Table turnover time (≤ 45 min)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 45 } },
        { id: 'sub-putri-create-1-item-4', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-04', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'PW-04', title: 'Guest satisfaction score (≥ 4.5 / 5)', weight: 9, contributorIds: [], viewerIds: ['cinta', 'eka'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.5 } },
        { id: 'sub-putri-create-1-item-5', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-05', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'PW-05', title: 'Order delivery time (≤ 12 min)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 12 } },
        { id: 'sub-putri-create-1-item-6', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-11', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Customer', subCategory: 'Service Quality', code: 'PW-11', title: 'Special request fulfillment rate (≥ 95%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 95 } },
        { id: 'sub-putri-create-1-item-7', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-06', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Customer', subCategory: 'Complaints', code: 'PW-06', title: 'Complaint resolution time (≤ 1 hour)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-putri-create-1-item-8', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-07', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Internal Process', subCategory: 'Speed', code: 'PW-07', title: 'Order accuracy rate (≥ 97%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 97 } },
        { id: 'sub-putri-create-1-item-9', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-08', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Internal Process', subCategory: 'Speed', code: 'PW-08', title: 'Table reset time (≤ 5 min)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 5 } },
        { id: 'sub-putri-create-1-item-10', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-12', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Internal Process', subCategory: 'Speed', code: 'PW-12', title: 'Table clearing time (≤ 3 min)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 3 } },
        { id: 'sub-putri-create-1-item-11', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-09', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Team Dev', code: 'PW-09', title: 'Menu knowledge certification (Completed)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-02-28' } },
        { id: 'sub-putri-create-1-item-12', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-10', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Team Dev', code: 'PW-10', title: 'New staff onboarding buddy sessions (≥ 2)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-putri-create-1-item-13', type: 'create', ownerId: 'putri', cycleId: CYCLE_ID, after: { id: 'pw-13', level: 'individual', ownerId: 'putri', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Team Dev', code: 'PW-13', title: 'Allergy & dietary training (Completed)', weight: 4, contributorIds: [], viewerIds: [], status: 'gray' } },
      ],
    },
    // Indah (Sous Chef) — first-time goal proposal, 10 goals.
    {
      id: 'sub-indah-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'indah',
      submittedAt: '2026-06-03T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-indah-create-1-item-1', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-01', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Financial', subCategory: 'Food Cost', code: 'IP-01', title: 'Kitchen ingredient cost ratio (≤ 32%)', weight: 16, contributorIds: ['wisnu'], viewerIds: ['wisnu'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 32 } },
        { id: 'sub-indah-create-1-item-2', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-02', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Financial', subCategory: 'Food Cost', code: 'IP-02', title: 'Portion control cost savings (IDR 15M)', weight: 14, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 15000000 } },
        { id: 'sub-indah-create-1-item-3', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-03', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Financial', subCategory: 'Waste', code: 'IP-03', title: 'Food waste reduction (≥ 8%)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 8 } },
        { id: 'sub-indah-create-1-item-4', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-04', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Customer', subCategory: 'Food Quality', code: 'IP-04', title: 'Dish plating consistency score (≥ 95%)', weight: 10, contributorIds: [], viewerIds: ['andi'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 95 } },
        { id: 'sub-indah-create-1-item-5', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-05', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Customer', subCategory: 'Food Quality', code: 'IP-05', title: 'Customer food satisfaction rating (≥ 4.5 / 5)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.5 } },
        { id: 'sub-indah-create-1-item-6', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-06', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Customer', subCategory: 'Menu', code: 'IP-06', title: 'New menu item feedback score (≥ 4 / 5)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4 } },
        { id: 'sub-indah-create-1-item-7', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-07', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Internal Process', subCategory: 'Kitchen Prep', code: 'IP-07', title: 'Prep list completion before service (100%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-indah-create-1-item-8', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-08', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Internal Process', subCategory: 'Kitchen Prep', code: 'IP-08', title: 'Average dish preparation time (≤ 8 min)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 8 } },
        { id: 'sub-indah-create-1-item-9', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-09', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Learning & Growth', subCategory: 'Mentorship', code: 'IP-09', title: 'Junior cook mentoring sessions (≥ 4 / month)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4 } },
        { id: 'sub-indah-create-1-item-10', type: 'create', ownerId: 'indah', cycleId: CYCLE_ID, after: { id: 'ip-10', level: 'individual', ownerId: 'indah', department: 'Kitchen', category: 'Learning & Growth', subCategory: 'Mentorship', code: 'IP-10', title: 'Food safety certification renewal (Completed)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-04-30' } },
      ],
    },
    // Wisnu (Line Cook, new hire under Andi) — first-time goal proposal, 11 goals.
    {
      id: 'sub-wisnu-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'wisnu',
      submittedAt: '2026-06-04T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-wisnu-create-1-item-1', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-01', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Financial', subCategory: 'Waste', code: 'WA-01', title: 'Ingredient waste reduction (≥ 8%)', weight: 14, contributorIds: ['indah'], viewerIds: ['indah'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 8 } },
        { id: 'sub-wisnu-create-1-item-2', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-02', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Financial', subCategory: 'Waste', code: 'WA-02', title: 'Portion control accuracy (≥ 95%)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 95 } },
        { id: 'sub-wisnu-create-1-item-3', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-03', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Financial', subCategory: 'Food Cost', code: 'WA-03', title: 'Station food cost ratio (≤ 30%)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 30 } },
        { id: 'sub-wisnu-create-1-item-4', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-04', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Customer', subCategory: 'Food Prep', code: 'WA-04', title: 'Dish plating consistency score (≥ 95%)', weight: 10, contributorIds: [], viewerIds: ['andi'], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 95 } },
        { id: 'sub-wisnu-create-1-item-5', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-05', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Customer', subCategory: 'Food Prep', code: 'WA-05', title: 'Order accuracy from kitchen (≥ 97%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 97 } },
        { id: 'sub-wisnu-create-1-item-6', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-11', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Customer', subCategory: 'Food Prep', code: 'WA-11', title: 'Ingredient inventory accuracy (≥ 97%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 97 } },
        { id: 'sub-wisnu-create-1-item-7', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-06', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Customer', subCategory: 'Menu', code: 'WA-06', title: 'New menu item execution rating (≥ 4 / 5)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4 } },
        { id: 'sub-wisnu-create-1-item-8', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-07', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Internal Process', subCategory: 'Food Prep', code: 'WA-07', title: 'Prep list completion before service (100%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-wisnu-create-1-item-9', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-08', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Internal Process', subCategory: 'Food Prep', code: 'WA-08', title: 'Station cleanliness audit score (≥ 95%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 95 } },
        { id: 'sub-wisnu-create-1-item-10', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-09', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Learning & Growth', subCategory: 'Cross-Train', code: 'WA-09', title: 'Cross-station training coverage (≥ 75%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 75 } },
        { id: 'sub-wisnu-create-1-item-11', type: 'create', ownerId: 'wisnu', cycleId: CYCLE_ID, after: { id: 'wa-10', level: 'individual', ownerId: 'wisnu', department: 'Kitchen', category: 'Learning & Growth', subCategory: 'Cross-Train', code: 'WA-10', title: 'Food safety certification (Completed)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-03-31' } },
      ],
    },
    // Joko (Cashier) — first-time goal proposal, 10 goals.
    {
      id: 'sub-joko-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'joko',
      submittedAt: '2026-06-06T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-joko-create-1-item-1', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-01', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Financial', subCategory: 'Cash Handling', code: 'JK-01', title: 'Cash drawer reconciliation accuracy (100%)', weight: 14, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-joko-create-1-item-2', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-02', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Financial', subCategory: 'Cash Handling', code: 'JK-02', title: 'Cash shortage incidents (≤ 1 per month)', weight: 13, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-joko-create-1-item-3', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-03', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Financial', subCategory: 'Efficiency', code: 'JK-03', title: 'Upsell at checkout revenue (IDR 3M)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 3000000 } },
        { id: 'sub-joko-create-1-item-4', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-04', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Customer', subCategory: 'Checkout Speed', code: 'JK-04', title: 'Average checkout time (≤ 90 sec)', weight: 10, contributorIds: ['putri'], viewerIds: ['putri'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 90 } },
        { id: 'sub-joko-create-1-item-5', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-05', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Customer', subCategory: 'Checkout Speed', code: 'JK-05', title: 'Queue wait time (≤ 3 min)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 3 } },
        { id: 'sub-joko-create-1-item-6', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-06', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Customer', subCategory: 'Service', code: 'JK-06', title: 'Guest checkout satisfaction (≥ 4.4 / 5)', weight: 9, contributorIds: [], viewerIds: ['cinta'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.4 } },
        { id: 'sub-joko-create-1-item-7', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-07', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Internal Process', subCategory: 'Efficiency', code: 'JK-07', title: 'POS transaction error rate (≤ 1%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 1 } },
        { id: 'sub-joko-create-1-item-8', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-08', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Internal Process', subCategory: 'Efficiency', code: 'JK-08', title: 'End-of-shift closing accuracy (100%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-joko-create-1-item-9', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-09', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Systems', code: 'JK-09', title: 'POS system certification (Completed)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-02-15' } },
        { id: 'sub-joko-create-1-item-10', type: 'create', ownerId: 'joko', cycleId: CYCLE_ID, after: { id: 'jk-10', level: 'individual', ownerId: 'joko', department: 'Front of House', category: 'Learning & Growth', subCategory: 'Systems', code: 'JK-10', title: 'New payment method training (≥ 1 session)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
      ],
    },
    // Reza (Sales Representative, new hire under Ali) — first-time goal proposal, 12 goals.
    {
      id: 'sub-reza-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'reza',
      submittedAt: '2026-06-07T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-reza-create-1-item-1', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-01', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Financial', subCategory: 'Personal Sales', code: 'RM-01', title: 'Personal sales revenue H1 2026 (IDR 1.2B)', weight: 13, contributorIds: [], viewerIds: ['ali'], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 1200000000 } },
        { id: 'sub-reza-create-1-item-2', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-02', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Financial', subCategory: 'Personal Sales', code: 'RM-02', title: 'New account revenue (IDR 300M)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 300000000 } },
        { id: 'sub-reza-create-1-item-3', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-03', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Financial', subCategory: 'Upsell', code: 'RM-03', title: 'Upsell & cross-sell revenue (IDR 100M)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 100000000 } },
        { id: 'sub-reza-create-1-item-4', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-04', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Customer', subCategory: 'Acquisition', code: 'RM-04', title: 'New client acquisition (≥ 15 clients)', weight: 10, contributorIds: ['daud'], viewerIds: ['daud'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 15 } },
        { id: 'sub-reza-create-1-item-5', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-05', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Customer', subCategory: 'Acquisition', code: 'RM-05', title: 'Lead conversion rate (≥ 25%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 25 } },
        { id: 'sub-reza-create-1-item-6', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-06', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Customer', subCategory: 'Satisfaction', code: 'RM-06', title: 'Assigned client satisfaction score (≥ 4.3 / 5)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.3 } },
        { id: 'sub-reza-create-1-item-7', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-11', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Customer', subCategory: 'Satisfaction', code: 'RM-11', title: 'Client renewal rate (≥ 85%)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 85 } },
        { id: 'sub-reza-create-1-item-8', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-07', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Internal Process', subCategory: 'Productivity', code: 'RM-07', title: 'Client visits per month (≥ 70)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 70 } },
        { id: 'sub-reza-create-1-item-9', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-08', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Internal Process', subCategory: 'Productivity', code: 'RM-08', title: 'CRM data update compliance (≥ 98%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 98, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-reza-create-1-item-10', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-12', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Internal Process', subCategory: 'Productivity', code: 'RM-12', title: 'Proposal turnaround time (≤ 3 days)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 3 } },
        { id: 'sub-reza-create-1-item-11', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-09', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Learning & Growth', subCategory: 'Product', code: 'RM-09', title: 'Product & pricing training completion (100%)', weight: 5, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-reza-create-1-item-12', type: 'create', ownerId: 'reza', cycleId: CYCLE_ID, after: { id: 'rm-10', level: 'individual', ownerId: 'reza', department: 'Sales', category: 'Learning & Growth', subCategory: 'Product', code: 'RM-10', title: 'Negotiation skills workshop (≥ 1 session)', weight: 4, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
      ],
    },
    // Santi (Recruiter, new hire under Rio) — first-time goal proposal, 10 goals.
    {
      id: 'sub-santi-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'santi',
      submittedAt: '2026-06-08T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-santi-create-1-item-1', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-01', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Financial', subCategory: 'Recruitment Cost', code: 'SM-01', title: 'Cost per hire (≤ IDR 4.5M)', weight: 15, contributorIds: [], viewerIds: ['rio'], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 4500000 } },
        { id: 'sub-santi-create-1-item-2', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-02', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Financial', subCategory: 'Recruitment Cost', code: 'SM-02', title: 'Recruitment ad spend efficiency (≤ IDR 500K per hire)', weight: 13, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 500000 } },
        { id: 'sub-santi-create-1-item-3', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-03', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Financial', subCategory: 'Budget', code: 'SM-03', title: 'Recruitment budget utilization (90–100%)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-santi-create-1-item-4', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-04', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Customer', subCategory: 'Candidate Experience', code: 'SM-04', title: 'Candidate satisfaction score (≥ 4.3 / 5)', weight: 10, contributorIds: ['alfian'], viewerIds: ['alfian'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.3 } },
        { id: 'sub-santi-create-1-item-5', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-05', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Customer', subCategory: 'Candidate Experience', code: 'SM-05', title: 'Interview scheduling turnaround (≤ 2 days)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-santi-create-1-item-6', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-06', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Customer', subCategory: 'Hiring Manager', code: 'SM-06', title: 'Hiring manager satisfaction (≥ 4.2 / 5)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 4.2 } },
        { id: 'sub-santi-create-1-item-7', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-07', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Internal Process', subCategory: 'Talent Acquisition', code: 'SM-07', title: 'Candidate pipeline volume (≥ 40 / month)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 40, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-santi-create-1-item-8', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-08', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Internal Process', subCategory: 'Talent Acquisition', code: 'SM-08', title: 'Time to hire (≤ 30 days)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 30 } },
        { id: 'sub-santi-create-1-item-9', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-09', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Learning & Growth', subCategory: 'Recruiting Skills', code: 'SM-09', title: 'Behavioral interview certification (Completed)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-03-31' } },
        { id: 'sub-santi-create-1-item-10', type: 'create', ownerId: 'santi', cycleId: CYCLE_ID, after: { id: 'sm-10', level: 'individual', ownerId: 'santi', department: 'HR', category: 'Learning & Growth', subCategory: 'Recruiting Skills', code: 'SM-10', title: 'Sourcing tools training (≥ 1 session)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
      ],
    },
    // Yoga (Marketing Specialist, new hire under Bayu) — first-time goal proposal, 11 goals.
    {
      id: 'sub-yoga-create-1',
      cycleId: CYCLE_ID,
      ownerId: 'yoga',
      submittedAt: '2026-06-09T09:00:00.000Z',
      status: 'pending',
      items: [
        { id: 'sub-yoga-create-1-item-1', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-01', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Financial', subCategory: 'Marketing ROI', code: 'YP-01', title: 'Campaign return on investment (≥ 2.5x spend)', weight: 14, contributorIds: [], viewerIds: ['bayu'], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2.5 } },
        { id: 'sub-yoga-create-1-item-2', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-02', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Financial', subCategory: 'Marketing ROI', code: 'YP-02', title: 'Cost per lead (≤ IDR 150K)', weight: 12, contributorIds: [], viewerIds: [], status: 'gray', unit: 'currency', value: 0, pill: 0, min: 0, max: 150000 } },
        { id: 'sub-yoga-create-1-item-3', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-03', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Financial', subCategory: 'Efficiency', code: 'YP-03', title: 'Ad spend budget adherence (90–100%)', weight: 11, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-yoga-create-1-item-4', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-04', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Customer', subCategory: 'Brand Awareness', code: 'YP-04', title: 'Social media engagement rate (≥ 4%)', weight: 10, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 4 } },
        { id: 'sub-yoga-create-1-item-5', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-05', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Customer', subCategory: 'Brand Awareness', code: 'YP-05', title: 'Follower growth rate (≥ 10%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 10 } },
        { id: 'sub-yoga-create-1-item-6', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-06', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Customer', subCategory: 'Engagement', code: 'YP-06', title: 'Campaign click-through rate (≥ 3%)', weight: 9, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 3 } },
        { id: 'sub-yoga-create-1-item-7', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-07', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Internal Process', subCategory: 'Content', code: 'YP-07', title: 'Monthly content pieces published (≥ 20)', weight: 8, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 20, repeat: true, startDate: '2026-01-01', endDate: '2026-01-31' } },
        { id: 'sub-yoga-create-1-item-8', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-08', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Internal Process', subCategory: 'Content', code: 'YP-08', title: 'On-time campaign launch rate (100%)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'percent', value: 0, pill: 0, min: 0, max: 100 } },
        { id: 'sub-yoga-create-1-item-9', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-11', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Internal Process', subCategory: 'Content', code: 'YP-11', title: 'Content approval turnaround (≤ 2 days)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 2 } },
        { id: 'sub-yoga-create-1-item-10', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-09', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Learning & Growth', subCategory: 'Digital Capability', code: 'YP-09', title: 'Digital marketing certification (Completed)', weight: 7, contributorIds: [], viewerIds: [], status: 'gray', unit: 'deadline', value: 0, pill: 0, min: 0, max: 100, deadlineDate: '2026-04-15' } },
        { id: 'sub-yoga-create-1-item-11', type: 'create', ownerId: 'yoga', cycleId: CYCLE_ID, after: { id: 'yp-10', level: 'individual', ownerId: 'yoga', department: 'Marketing', category: 'Learning & Growth', subCategory: 'Digital Capability', code: 'YP-10', title: 'Analytics tool training (≥ 1 session)', weight: 6, contributorIds: [], viewerIds: [], status: 'gray', unit: 'count', value: 0, pill: 0, min: 0, max: 1 } },
      ],
    },
  ]
}

const STORAGE_KEY = 'talenta-goal-approvals-db'
const SEED_VERSION = 10
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

  // Used only by the dev "Scenario" control (goal-cycles/[id]/index.vue) to
  // cleanly undo a preview submission — real submissions otherwise only
  // ever grow (rejected ones stay visible for resubmission, not deleted).
  function removeSubmission(submissionId: string) {
    submissionsData.value = submissionsData.value.filter(s => s.id !== submissionId)
    persist()
  }

  // Used by the gated create/edit/delete call sites — queues one batch of
  // proposed changes instead of touching useGoalsStore directly.
  function createSubmission(items: Omit<SubmissionItem, 'id'>[], ownerId: string, targetCycleId: string, batchId?: string) {
    const submissionId = `sub-${ownerId}-${Date.now()}-${seq++}`
    const submission: Submission = {
      id: submissionId,
      cycleId: targetCycleId,
      ownerId,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      ...(batchId ? { batchId } : {}),
      items: items.map((item, i) => ({ ...item, id: `${submissionId}-item-${i}` })),
    }
    submissionsData.value = [...submissionsData.value, submission]
    persist()
    // Notify the approver (manager) so the request is traceable in their inbox.
    const approverId = EMPLOYEE_MANAGER[ownerId]
    if (approverId) {
      const ownerName = employeeById(ownerId)?.name ?? 'A team member'
      const label = actionLabelFor(submission.items as unknown as { type: string, before?: Record<string, unknown>, after?: Record<string, unknown> }[])
      useInboxNotificationsStore().addNotification({
        recipientId: approverId,
        group: 'Today',
        title: 'Goal approval requested',
        timeLabel: 'Just now',
        summary: `${ownerName} requested to ${label}. Review and approve or request changes.`,
        senderName: ownerName,
        senderTimestamp: 'Just now',
        body: `${ownerName} submitted a request to ${label} for the current goal cycle. Review the details, then approve or request changes.`,
        details: [
          { label: 'Request type', value: label.charAt(0).toUpperCase() + label.slice(1) },
          { label: 'Submitted by', value: ownerName },
          { label: 'Goals in request', value: `${submission.items.length}` },
        ],
        actions: [{ label: 'Review request', variant: 'primary', to: `/goals/goal-cycles/${targetCycleId}/awaiting-approval/${submissionId}` }],
      })
    }
    return submission
  }

  // Commits every item in a submission into the real goals store in one go —
  // shared by both the synchronous and background-job approval paths below.
  function commitSubmissionGoals(submission: Submission) {
    const { addGoals, updateGoal, deleteGoal } = useGoalsStore()
    for (const item of submission.items) {
      if (item.type === 'create' && item.after) addGoals([item.after], item.cycleId)
      else if (item.type === 'edit' && item.goalId && item.after) updateGoal(item.goalId, item.after)
      else if (item.type === 'delete' && item.goalId) deleteGoal(item.goalId)
    }
  }

  // The "Approve" decision. Usually commits the batch into the real goals
  // store right away, then marks the whole submission approved. But when
  // this submission was queued as part of a large bulk "New goals" save
  // (batchId set, and that batch has more than BULK_ASYNC_THRESHOLD owners),
  // the decision is still recorded immediately — the approver isn't blocked
  // — while the actual goal records are written by a simulated background
  // job, same "fire the job, don't wait for it" shape as a real per-owner
  // queue job would use server-side. Each owner's job is independent: one
  // owner's approval never waits on another's.
  function approveSubmission(submissionId: string) {
    const submission = submissionById(submissionId)
    if (!submission) return

    submissionsData.value = submissionsData.value.map(s => (s.id !== submissionId ? s : { ...s, status: 'approved' as const }))
    persist()

    const batchStore = useGoalRequestBatchStore()
    const batch = submission.batchId ? batchStore.batches.value.find(b => b.id === submission.batchId) : undefined
    if (batch && batch.ownerIds.length > BULK_ASYNC_THRESHOLD) {
      batchStore.markOwnerCreating(batch.id, submission.ownerId)
      // At least 3s per owner so the "being created" state reads as a real
      // background job on screen, not a flicker.
      const simulatedLatency = 3000 + Math.random() * 2000
      setTimeout(() => {
        commitSubmissionGoals(submission)
        batchStore.markOwnerCreated(batch.id, submission.ownerId)
        notifyOwner(submission, 'approved')
      }, simulatedLatency)
      return
    }

    commitSubmissionGoals(submission)
    notifyOwner(submission, 'approved')
  }

  // The "Not approve" decision — nothing is committed; the whole batch
  // stays put with one reason for the owner to act on.
  function rejectSubmission(submissionId: string, reason: string) {
    const submission = submissionById(submissionId)
    submissionsData.value = submissionsData.value.map(s => (s.id !== submissionId ? s : { ...s, status: 'rejected' as const, rejectReason: reason }))
    persist()
    // A rejected draft goes back to being an editable draft — otherwise it
    // would sit on "Awaiting approval" forever with no way to act on it.
    const { updateGoal } = useGoalsStore()
    for (const item of submission?.items ?? []) {
      if (item.goalId && item.before?.isDraft) updateGoal(item.goalId, { isAwaitingApproval: false })
    }
    if (submission) notifyOwner(submission, 'rejected', reason)
  }

  // Close the loop back to the owner's inbox on a decision.
  function notifyOwner(submission: Submission, outcome: 'approved' | 'rejected', reason?: string) {
    const approverName = employeeById(EMPLOYEE_MANAGER[submission.ownerId] ?? '')?.name ?? 'Your manager'
    const label = actionLabelFor(submission.items as unknown as { type: string, before?: Record<string, unknown>, after?: Record<string, unknown> }[])
    useInboxNotificationsStore().addNotification({
      recipientId: submission.ownerId,
      group: 'Today',
      title: outcome === 'approved' ? 'Request approved' : 'Changes requested',
      timeLabel: 'Just now',
      summary: outcome === 'approved'
        ? `${approverName} approved your request to ${label}. The change is now live.`
        : `${approverName} requested changes to your request to ${label}.`,
      senderName: approverName,
      senderTimestamp: 'Just now',
      body: outcome === 'approved'
        ? `${approverName} approved your request to ${label} for the current goal cycle. The change has been applied.`
        : `${approverName} did not approve your request to ${label} for the current goal cycle. Reason: ${reason ?? '—'}. Please revise and resubmit.`,
      details: [
        { label: 'Decision', value: outcome === 'approved' ? 'Approved' : 'Changes requested' },
        { label: 'Reviewed by', value: approverName },
        ...(outcome === 'rejected' && reason ? [{ label: 'Reason', value: reason }] : []),
      ],
      actions: [{ label: outcome === 'approved' ? 'View goal' : 'Update goals', variant: 'primary', to: `/goals/goal-cycles/${submission.cycleId}` }],
    })
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
    removeSubmission,
  }
}
