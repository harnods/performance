// ─────────────────────────────────────────────────────────────────────────────
// DEMO ONLY — mock IDPs created when the IDP import succeeds (prototype: the
// uploaded file is never read). One plan per employee that was picked on step 1,
// each with 2–3 action plans, varied so the list doesn't look copy-pasted.
// ─────────────────────────────────────────────────────────────────────────────
import type { IdpPlanDraft } from '~/composables/useIdpStore'
import { IDP_OBJECTIVES, ACTION_PLAN_CATEGORIES } from './idp'
import { TALENTS, JOB_POSITIONS } from './talents'

const PLAN_NAMES = [
  'Leadership development', 'Technical deep-dive', 'Client communication',
  'Career growth plan', 'Cross-functional exposure', 'Management readiness',
]
const ACTION_NAMES = [
  'Complete an online course', 'Shadow a senior colleague', 'Lead a small project',
  'Monthly coaching session', 'Present learnings to the team', 'Earn a certification',
]
const COMPETENCIES = ['Leadership', 'Financial Reporting', 'Negotiation']

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

export function buildImportedIdpDrafts(employeeIds: string[]): IdpPlanDraft[] {
  const today = new Date()
  return employeeIds.map((employeeId, i) => {
    const talent = TALENTS.find(t => t.id === employeeId)
    const focus = i % 3 === 2 ? 1 : 0
    const futurePool = JOB_POSITIONS.filter(p => p !== talent?.jobPosition)
    const steps = 2 + (i % 2)
    return {
      name: PLAN_NAMES[i % PLAN_NAMES.length]!,
      objective: IDP_OBJECTIVES[i % IDP_OBJECTIVES.length]!,
      employeeId,
      focus,
      futureJobPosition: focus === 1 ? (futurePool[i % futurePool.length] ?? '') : '',
      actionPlans: Array.from({ length: steps }, (_, s) => ({
        name: ACTION_NAMES[(i + s) % ACTION_NAMES.length]!,
        category: ACTION_PLAN_CATEGORIES[(i + s) % ACTION_PLAN_CATEGORIES.length]!,
        description: '',
        startDate: iso(addDays(today, 7 + s * 30)),
        dueDate: iso(addDays(today, 37 + s * 30)),
        assignees: [employeeId],
        attachments: [],
        relatedTo: s === 0 ? 'competency' as const : null,
        relatedCompetency: s === 0 ? COMPETENCIES[i % COMPETENCIES.length]! : '',
      })),
    }
  })
}
