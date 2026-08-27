import { describe, expect, it } from 'vitest'
import {
  GOAL_TYPE_LABEL_TO_LEVEL,
  GOAL_UNIT_TO_MEASUREMENT_UNIT,
  LEVEL_TO_GOAL_TYPE_LABEL,
  MEASUREMENT_UNIT_TO_GOAL_UNIT,
  draftFromGoal,
  goalFromDraft,
} from './goalMapping'
import type { Employee } from './employees'
import type { DraftGoal } from './goalDraft'
import type { Goal } from '~/composables/useGoalsStore'

const owner: Employee = {
  id: 'ali',
  name: 'Ali Imran',
  code: 'CP030',
  title: 'Sales Director',
  department: 'Sales',
}

function baseDraft(overrides: Partial<DraftGoal> = {}): DraftGoal {
  return {
    id: 'draft-1',
    code: 'X-01',
    category: 'Financial',
    subCategory: 'Revenue',
    name: 'Grow revenue',
    description: 'desc',
    goalType: 'Team goal',
    weight: 20,
    repeat: false,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    measurementUnit: 'percentage',
    currency: 'IDR',
    startValue: 0,
    targetValue: 100,
    useBaseline: true,
    baselineValue: 0,
    direction: 'higher',
    deadlineDate: '',
    deadlineRules: [],
    contributorsByOwner: { ali: ['daud'], jessie: [] },
    viewerIds: ['rizal'],
    keyResults: [],
    restrictedVisibility: false,
    ownerCanUpdateProgressByOwner: { ali: false },
    ownerIds: ['ali', 'jessie'],
    ...overrides,
  }
}

describe('label maps are exact inverses', () => {
  it('goal-type ↔ level round-trips both ways', () => {
    for (const [label, level] of Object.entries(GOAL_TYPE_LABEL_TO_LEVEL))
      expect(LEVEL_TO_GOAL_TYPE_LABEL[level]).toBe(label)
    for (const [level, label] of Object.entries(LEVEL_TO_GOAL_TYPE_LABEL))
      expect(GOAL_TYPE_LABEL_TO_LEVEL[label]).toBe(level)
  })

  it('measurement-unit ↔ goal-unit round-trips both ways', () => {
    for (const [mu, gu] of Object.entries(MEASUREMENT_UNIT_TO_GOAL_UNIT))
      expect(GOAL_UNIT_TO_MEASUREMENT_UNIT[gu]).toBe(mu)
    for (const [gu, mu] of Object.entries(GOAL_UNIT_TO_MEASUREMENT_UNIT))
      expect(MEASUREMENT_UNIT_TO_GOAL_UNIT[mu]).toBe(gu)
  })
})

describe('goalFromDraft', () => {
  it('maps labels to slugs and composes a per-owner id', () => {
    const g = goalFromDraft(baseDraft(), owner, false)
    expect(g.id).toBe('draft-1-ali')
    expect(g.level).toBe('team')
    expect(g.unit).toBe('percent')
    expect(g.ownerId).toBe('ali')
    expect(g.department).toBe('Sales')
    expect(g.title).toBe('Grow revenue')
    expect(g.status).toBe('gray')
    expect(g.isDraft).toBe(false)
  })

  it('picks this owner\'s own contributors and ownerCanUpdateProgress', () => {
    const g = goalFromDraft(baseDraft(), owner, false)
    expect(g.contributorIds).toEqual(['daud'])
    expect(g.ownerCanUpdateProgress).toBe(false) // ali is set to false in the draft
  })

  it('defaults ownerCanUpdateProgress to true and contributors to [] for an owner not in the maps', () => {
    const other: Employee = { ...owner, id: 'jessie', name: 'Jessie Tan', code: 'CP038' }
    const g = goalFromDraft(baseDraft(), other, false)
    expect(g.contributorIds).toEqual([]) // jessie -> []
    expect(g.ownerCanUpdateProgress).toBe(true) // jessie absent from ownerCanUpdateProgressByOwner
  })

  it('computes min/max/value/pill from baseline+target for a measurable goal', () => {
    const g = goalFromDraft(baseDraft({ useBaseline: true, baselineValue: 10, targetValue: 200 }), owner, false)
    expect(g.min).toBe(10)
    expect(g.max).toBe(200)
    expect(g.value).toBe(10) // starts at baseline
    expect(g.pill).toBe(Math.round((10 / 200) * 100)) // 5
  })

  it('min is 0 when useBaseline is off', () => {
    const g = goalFromDraft(baseDraft({ useBaseline: false, baselineValue: 10, targetValue: 50 }), owner, false)
    expect(g.min).toBe(0)
    expect(g.value).toBe(0)
    expect(g.pill).toBe(0)
  })

  it('deadline goals carry no baseline scale and default 0..100', () => {
    const g = goalFromDraft(baseDraft({
      measurementUnit: 'deadline',
      deadlineDate: '2026-05-01',
      deadlineRules: [],
      useBaseline: true,
      baselineValue: 30,
      targetValue: 90,
    }), owner, false)
    expect(g.unit).toBe('deadline')
    expect(g.min).toBe(0)
    expect(g.max).toBe(100)
    expect(g.value).toBe(0)
    expect(g.pill).toBe(0)
    expect(g.deadlineDate).toBe('2026-05-01')
  })

  it('sets currency only for amount goals', () => {
    const amount = goalFromDraft(baseDraft({ measurementUnit: 'amount', currency: 'USD' }), owner, false)
    expect(amount.unit).toBe('currency')
    expect(amount.currency).toBe('USD')
    const pct = goalFromDraft(baseDraft({ measurementUnit: 'percentage' }), owner, false)
    expect(pct.currency).toBeUndefined()
  })
})

describe('draftFromGoal / round-trip fidelity', () => {
  it('inverts goalFromDraft for the core editable fields', () => {
    const draft = baseDraft({ ownerIds: ['ali'], contributorsByOwner: { ali: ['daud'] }, ownerCanUpdateProgressByOwner: { ali: true } })
    const goal = { ...goalFromDraft(draft, owner, false), cycleId: 'c1' } as Goal
    const back = draftFromGoal(goal, owner)
    expect(back.code).toBe(draft.code)
    expect(back.name).toBe(draft.name)
    expect(back.goalType).toBe(draft.goalType)
    expect(back.measurementUnit).toBe(draft.measurementUnit)
    expect(back.category).toBe(draft.category)
    expect(back.subCategory).toBe(draft.subCategory)
    expect(back.weight).toBe(draft.weight)
    expect(back.direction).toBe(draft.direction)
    expect(back.startDate).toBe(draft.startDate)
    expect(back.endDate).toBe(draft.endDate)
    expect(back.contributorsByOwner).toEqual({ ali: ['daud'] })
    expect(back.ownerIds).toEqual(['ali'])
  })

  it('sets hasProgress true only when achievement (pill) is > 0', () => {
    const withProgress = draftFromGoal({ pill: 42 } as Goal, owner)
    expect(withProgress.hasProgress).toBe(true)
    const noProgress = draftFromGoal({ pill: 0 } as Goal, owner)
    expect(noProgress.hasProgress).toBe(false)
    const absent = draftFromGoal({} as Goal, owner)
    expect(absent.hasProgress).toBe(false)
  })

  it('falls back to sane defaults for a bare goal', () => {
    const back = draftFromGoal({ id: 'g1', code: 'C', title: 'T', category: 'Financial', subCategory: 'S', level: 'individual', weight: 5 } as Goal, owner)
    expect(back.measurementUnit).toBe('percentage') // unit undefined -> percent -> percentage
    expect(back.currency).toBe('IDR')
    expect(back.direction).toBe('higher')
    expect(back.useBaseline).toBe(true)
    expect(back.repeat).toBe(false)
    expect(back.deadlineRules).toEqual([])
    expect(back.contributorsByOwner).toEqual({ ali: [] })
  })

  it('deep-copies arrays so mutating the draft never leaks back into the goal', () => {
    const goal = { id: 'g', code: 'c', title: 't', category: 'Financial', subCategory: 's', level: 'team', weight: 1, contributorIds: ['daud'], viewerIds: ['rizal'] } as Goal
    const back = draftFromGoal(goal, owner)
    back.viewerIds.push('someone')
    back.contributorsByOwner.ali.push('someone')
    expect(goal.viewerIds).toEqual(['rizal']) // unchanged
    expect(goal.contributorIds).toEqual(['daud']) // unchanged
  })
})
