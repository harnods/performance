# Archive cycle ("All goals from 2020-2025")

## What it is

A single synthetic goal cycle (`id: 'archive-legacy'`, `GoalCycle.isArchive: true` —
`composables/useGoalCyclesStore.ts:33,87`) that groups goals migrated from the old
Goals UI, which had no goal-cycle concept. It's a **frozen, computed container**, not
a normal configured cycle — there's nothing to schedule, no owners assigned into it,
and no way to add new goals to it. Every one of its goals is pre-seeded with
`weight: 0`, `carriedOver: true`, `keyResults: []` (`composables/useGoalsStore.ts`,
`ARCHIVE_CYCLE_ID`).

Check `cycle.isArchive` (or `cycle.id === 'archive-legacy'` if only the id is at hand)
— never a name/period string match.

## Golden rule — what's allowed on its goals vs. the cycle itself

| Action | Goals *inside* the archive cycle | The archive cycle *itself* |
|---|---|---|
| View / access | ✅ allowed | ✅ allowed |
| Update progress | ✅ allowed (unrestricted, same as any goal) | — |
| Edit the goal | ✅ allowed, same edit-lock rules as any goal | ❌ never editable |
| Delete | ✅ allowed | ❌ never deletable |
| Move to another cycle | ❌ no such feature exists yet; if built, must stay blocked for archive-cycle goals | n/a |
| Import goals / New goals | ❌ hidden — nothing can be added to a frozen container | n/a |
| "weight mandatory" validation | never enforced (`weightMandatory: false` on the seed) | n/a |

Per-goal actions (Edit/Delete/Update progress/Close/Align) are **already** gated only
by row state (`isDraft`/`isClosed`/etc.), never by cycle — so they fall out correctly
with no extra `isArchive` checks needed. The cycle-level "can't edit/delete the cycle"
rule already lived in `pages/goals/goal-cycles/index.vue` (the cycles list) before this
doc existed. What was missing, and is now fixed, is hiding the *creation* entry points
on the cycle's own detail pages.

## Hiding "Import goals" / "New goals" — every tab, both places they appear

Each of the 5 tabs under a cycle (`All goals` / `Company` / `Organization` / `Team` /
`Individual goals` — i.e. `[id]/index.vue`, `company-goals.vue`,
`organization-goals.vue`, `team-goals.vue`, `individual-goals.vue`) independently
teleports its own header actions **and** renders its own empty-state "New goals"
button — both need the same guard, in every file:

```vue
<!-- Page header actions — hidden on the archive cycle: it's a frozen,
     computed container for goals migrated from the old Goals UI, so
     nothing can be imported or newly created into it. -->
<Teleport v-if="!cycle?.isArchive" to="#page-header-actions" defer>
  <MpButton variant="secondary" @click="...">Import goals</MpButton>
  <MpButton variant="primary" @click="openSelectEmployee">New goals</MpButton>
</Teleport>
```

```vue
<!-- Empty state -->
<MpButton v-if="!cycle?.isArchive" variant="primary" left-icon="add" @click="openSelectEmployee">New goals</MpButton>
```

`[id]/index.vue`'s own empty state additionally guards on `!activeRequestBatch` already
— add `&& !cycle?.isArchive` alongside it, don't replace it.

## Dev scenario control FAB

The bottom-right dev-only "Scenario control" FAB (`[id]/index.vue` only — the other 4
tabs don't render it) previews a "New goals" bulk-approval flow, which doesn't apply to
a cycle nothing can be added to. Hide it the same way:

```vue
<div v-if="!cycle?.isArchive" :class="scenarioFab">...</div>
```

Reference: `pages/goals/goal-cycles/[id]/index.vue`, `company-goals.vue`,
`organization-goals.vue`, `team-goals.vue`, `individual-goals.vue`.
