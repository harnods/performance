import { describe, expect, it } from 'vitest'
import type { Submission } from './useGoalApprovalsStore'
import { isAwaitingApproval, isCreateLikeItem, submissionTypeLabel } from './useGoalApprovalsStore'

// Minimal item/submission builders — only the fields the classifiers read.
function item(type: string, extra: Record<string, unknown> = {}) {
  return { id: `i-${Math.random()}`, type, ownerId: 'x', cycleId: 'c', ...extra } as any
}
function sub(items: any[], status: Submission['status'] = 'pending'): Submission {
  return { id: 's1', cycleId: 'c', ownerId: 'x', submittedAt: '2026-01-01T00:00:00Z', status, items } as Submission
}

describe('isCreateLikeItem', () => {
  it('is true for a literal create item', () => {
    expect(isCreateLikeItem({ type: 'create' })).toBe(true)
  })

  it('is true for a published-draft edit (isDraft true → false)', () => {
    expect(isCreateLikeItem({ type: 'edit', before: { isDraft: true }, after: { isDraft: false } })).toBe(true)
  })

  it('is false for a plain edit', () => {
    expect(isCreateLikeItem({ type: 'edit', before: { isDraft: false }, after: { isDraft: false } })).toBe(false)
    expect(isCreateLikeItem({ type: 'edit' })).toBe(false)
  })

  it('is false for a delete', () => {
    expect(isCreateLikeItem({ type: 'delete' })).toBe(false)
  })
})

describe('submissionTypeLabel', () => {
  it('classifies any batch containing a create item as "Goal creation"', () => {
    expect(submissionTypeLabel(sub([item('create'), item('edit', { before: {}, after: {} })])))
      .toBe('Goal creation')
  })

  it('classifies a batch whose edits ONLY move value as "Goal progress update"', () => {
    expect(submissionTypeLabel(sub([item('edit', { before: { value: 10, pill: 20 }, after: { value: 40, pill: 20 } })])))
      .toBe('Goal progress update')
  })

  it('classifies a batch whose edits ONLY move pill as "Goal progress update"', () => {
    expect(submissionTypeLabel(sub([item('edit', { before: { value: 10, pill: 20 }, after: { value: 10, pill: 55 } })])))
      .toBe('Goal progress update')
  })

  it('classifies a metadata-only edit (no value/pill change) as "Goal edit"', () => {
    expect(submissionTypeLabel(sub([item('edit', { before: { value: 10, pill: 20, subCategory: 'A' }, after: { value: 10, pill: 20, subCategory: 'B' } })])))
      .toBe('Goal edit')
  })

  it('a pure delete batch is a "Goal edit" (no edits, no creates)', () => {
    expect(submissionTypeLabel(sub([item('delete', { before: { value: 1 } })]))).toBe('Goal edit')
  })

  it('requires EVERY edit to be a progress move — a mixed batch is "Goal edit"', () => {
    expect(submissionTypeLabel(sub([
      item('edit', { before: { value: 10, pill: 20 }, after: { value: 40, pill: 20 } }), // progress
      item('edit', { before: { value: 5, pill: 5 }, after: { value: 5, pill: 5 } }), // no change
    ]))).toBe('Goal edit')
  })

  it('an edit missing before/after is not a progress update', () => {
    expect(submissionTypeLabel(sub([item('edit', { after: { value: 1, pill: 1 } })]))).toBe('Goal edit')
  })
})

describe('isAwaitingApproval', () => {
  it('is true while pending or rejected, false once approved', () => {
    expect(isAwaitingApproval({ status: 'pending' })).toBe(true)
    expect(isAwaitingApproval({ status: 'rejected' })).toBe(true)
    expect(isAwaitingApproval({ status: 'approved' })).toBe(false)
  })
})
