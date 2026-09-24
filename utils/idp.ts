// ─────────────────────────────────────────────────────────────────────────────
// Individual development plan (IDP) — replicated from production
// (talenta-performance: src/views/talent-management/individual-development/*).
//
// A plan belongs to one employee, carries an objective and a focus (their
// current job position, or a future one they're growing toward), and is worked
// through as a list of action plans. A plan's progress is just how many of its
// action plans are completed.
// ─────────────────────────────────────────────────────────────────────────────
import { TALENTS, JOB_POSITIONS } from './talents'

export type ActionPlanStatus = 0 | 1 | 2

export interface ActionPlanStatusDef {
  id: ActionPlanStatus
  title: string
  icon: string
  /** MpBadge `for="tableStatus"` type — see docs/patterns/badges.md. */
  badge: 'announcement' | 'warning' | 'completed'
}

// Ordered To do → In progress → Completed, which is also the order the detail
// page's summary row reads in.
export const ACTION_PLAN_STATUSES: ActionPlanStatusDef[] = [
  { id: 0, title: 'To do', icon: 'task-todo', badge: 'announcement' },
  { id: 1, title: 'In progress', icon: 'task-on-progress', badge: 'warning' },
  { id: 2, title: 'Completed', icon: 'task-done', badge: 'completed' },
]
export const STATUS_BY_ID = Object.fromEntries(
  ACTION_PLAN_STATUSES.map(s => [s.id, s]),
) as Record<ActionPlanStatus, ActionPlanStatusDef>

export interface ActionPlanActivity {
  id: string
  /** Employee id of whoever did it. */
  userId: string
  content: string
  /** ISO timestamp. */
  at: string
}

/** What an action plan is optionally linked to — 'goal' isn't selectable yet. */
export type ActionPlanRelatedTo = 'competency' | 'goal' | null

export interface ActionPlan {
  id: string
  name: string
  category: string
  description: string
  /** ISO yyyy-mm-dd. */
  startDate: string
  /** ISO yyyy-mm-dd. */
  dueDate: string
  status: ActionPlanStatus
  /** Employee ids responsible for this action plan. Can be more than one. */
  assignees: string[]
  attachments: string[]
  activities: ActionPlanActivity[]
  /** Optional link to a competency (or, later, a goal) this action plan develops. */
  relatedTo: ActionPlanRelatedTo
  /** Set only when relatedTo === 'competency' — a name from ALL_COMPETENCIES. */
  relatedCompetency: string
}

/**
 * One action plan as the add/edit modal hands it back — no id until it's saved,
 * and no status/activity, which the store owns. Lives here rather than in the
 * modal because `<script setup>` can't export types.
 */
export interface ActionPlanDraft {
  id?: string
  name: string
  category: string
  description: string
  startDate: string
  dueDate: string
  assignees: string[]
  attachments: string[]
  relatedTo: ActionPlanRelatedTo
  relatedCompetency: string
}

/** 0 = current job position, 1 = a future one. */
export type IdpFocus = 0 | 1

export interface IdpPlan {
  id: string
  name: string
  objective: string
  employeeId: string
  focus: IdpFocus
  /** Only set when focus is 1 (future position). */
  futureJobPosition: string
  actionPlans: ActionPlan[]
  createdAt: string
}

// Free-text-with-suggestions vocabularies. Production loads these from an API
// and lets the user type anything, so treat them as hints, not a closed list.
export const IDP_OBJECTIVES = [
  'Improve leadership capability',
  'Strengthen technical expertise',
  'Prepare for a managerial role',
  'Broaden cross-functional exposure',
  'Close a competency gap',
  'Improve communication skills',
]

export const ACTION_PLAN_CATEGORIES = [
  'Training',
  'Coaching',
  'Mentoring',
  'On the job',
  'Certification',
  'Self learning',
  'Project assignment',
]

export const FOCUS_OPTIONS: { value: IdpFocus, label: string }[] = [
  { value: 0, label: 'Current job position' },
  { value: 1, label: 'Future job position' },
]

export { JOB_POSITIONS }

/** Completed action plans over total — the list page's progress column. */
export function planProgress(plan: IdpPlan): { done: number, total: number, percent: number } {
  const total = plan.actionPlans.length
  const done = plan.actionPlans.filter(a => a.status === 2).length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** How many action plans sit in each status — the detail page's summary row. */
export function statusTotals(plan: IdpPlan): Record<ActionPlanStatus, number> {
  return {
    0: plan.actionPlans.filter(a => a.status === 0).length,
    1: plan.actionPlans.filter(a => a.status === 1).length,
    2: plan.actionPlans.filter(a => a.status === 2).length,
  }
}

/** The focus line shown under a plan — "Current job position · Accountant". */
export function focusLabel(plan: IdpPlan): string {
  return FOCUS_OPTIONS.find(f => f.value === plan.focus)?.label ?? ''
}
export function focusPosition(plan: IdpPlan): string {
  if (plan.focus === 1) return plan.futureJobPosition
  return TALENTS.find(t => t.id === plan.employeeId)?.jobPosition ?? ''
}

// ─── Seed ────────────────────────────────────────────────────────────────────
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function activity(id: string, userId: string, content: string, at: string): ActionPlanActivity {
  return { id, userId, content, at }
}

export const IDP_PLANS: IdpPlan[] = [
  {
    id: 'idp-1',
    name: 'Leadership training',
    objective: 'Prepare for a managerial role',
    employeeId: 'agung',
    focus: 1,
    futureJobPosition: 'Head of Accounting',
    createdAt: '2026-02-10T09:00:00',
    actionPlans: [
      {
        id: 'ap-1',
        name: 'Complete leadership fundamentals course',
        category: 'Training',
        description: 'Attend the 3-day leadership fundamentals program run by Mekari University.',
        startDate: iso(2026, 3, 2),
        dueDate: iso(2026, 3, 31),
        status: 2,
        assignees: ['agung'],
        attachments: ['leadership-certificate.pdf'],
        activities: [
          activity('act-1', 'rio', 'created this action plan', '2026-02-10T09:12:00'),
          activity('act-2', 'agung', 'marked this as Completed', '2026-03-28T14:05:00'),
        ],
        relatedTo: 'competency',
        relatedCompetency: 'Leadership',
      },
      {
        id: 'ap-2',
        name: 'Shadow the Head of Accounting',
        category: 'On the job',
        description: 'Join weekly leadership syncs and month-end close reviews as an observer.',
        startDate: iso(2026, 4, 1),
        dueDate: iso(2026, 6, 30),
        status: 1,
        assignees: ['agung', 'rio'],
        attachments: [],
        activities: [activity('act-3', 'rio', 'created this action plan', '2026-02-10T09:15:00')],
        relatedTo: null,
        relatedCompetency: '',
      },
      {
        id: 'ap-3',
        name: 'Lead one month-end close',
        category: 'Project assignment',
        description: 'Own the close process end to end, with the current head reviewing.',
        startDate: iso(2026, 7, 1),
        dueDate: iso(2026, 7, 31),
        status: 0,
        assignees: ['agung'],
        attachments: [],
        activities: [activity('act-4', 'rio', 'created this action plan', '2026-02-10T09:18:00')],
        relatedTo: 'competency',
        relatedCompetency: 'Financial Reporting',
      },
    ],
  },
  {
    id: 'idp-2',
    name: 'Advanced negotiation',
    objective: 'Strengthen technical expertise',
    employeeId: 'ali',
    focus: 0,
    futureJobPosition: '',
    createdAt: '2026-01-22T10:30:00',
    actionPlans: [
      {
        id: 'ap-4',
        name: 'Consultative selling certification',
        category: 'Certification',
        description: 'Complete the consultative selling track and pass the assessment.',
        startDate: iso(2026, 2, 1),
        dueDate: iso(2026, 4, 30),
        status: 2,
        assignees: ['ali'],
        attachments: [],
        activities: [activity('act-5', 'ali', 'marked this as Completed', '2026-04-22T11:00:00')],
        relatedTo: 'competency',
        relatedCompetency: 'Negotiation',
      },
      {
        id: 'ap-5',
        name: 'Run 5 enterprise negotiations',
        category: 'On the job',
        description: 'Lead negotiation on five enterprise deals, debriefing each with the manager.',
        startDate: iso(2026, 5, 1),
        dueDate: iso(2026, 9, 30),
        status: 1,
        assignees: ['ali', 'rio'],
        attachments: [],
        activities: [activity('act-6', 'rio', 'created this action plan', '2026-01-22T10:35:00')],
        relatedTo: null,
        relatedCompetency: '',
      },
    ],
  },
  {
    id: 'idp-3',
    name: 'Kitchen management readiness',
    objective: 'Broaden cross-functional exposure',
    employeeId: 'indah',
    focus: 1,
    futureJobPosition: 'Head Chef',
    createdAt: '2026-03-05T08:00:00',
    actionPlans: [
      {
        id: 'ap-6',
        name: 'Food cost control workshop',
        category: 'Training',
        description: '',
        startDate: iso(2026, 4, 6),
        dueDate: iso(2026, 5, 8),
        status: 0,
        assignees: ['indah'],
        attachments: [],
        activities: [activity('act-7', 'rio', 'created this action plan', '2026-03-05T08:10:00')],
        relatedTo: null,
        relatedCompetency: '',
      },
    ],
  },
]
